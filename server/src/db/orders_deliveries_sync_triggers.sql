-- Migration: Comprehensive Single Source of Truth Synchronization (SSOT)
-- Date: 2026-09-24

-- 1. Ensure constraint on deliveries supports all lifecycle statuses
ALTER TABLE deliveries DROP CONSTRAINT IF EXISTS deliveries_status_check;
ALTER TABLE deliveries ADD CONSTRAINT deliveries_status_check 
  CHECK (status = ANY (ARRAY['assigned', 'accepted', 'awaiting_pickup', 'picked_up', 'en_route', 'arrived', 'delivery_attempted', 'delivered', 'cancelled']));

-- 2. Consolidate driver availability columns directly onto drivers
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS is_on_delivery BOOLEAN DEFAULT FALSE;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS last_toggled_at TIMESTAMP DEFAULT NOW();

-- 3. Consolidate delivery columns directly onto orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_ref VARCHAR;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_status VARCHAR DEFAULT 'assigned';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS proof_photo TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS proof_photos JSONB DEFAULT '[]'::jsonb;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS proof_note TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS item_proofs JSONB DEFAULT '[]'::jsonb;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS failure_reason TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS eta_minutes INTEGER DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS attempts INTEGER DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS max_attempts INTEGER DEFAULT 2;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS distance_km NUMERIC DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS driver_commission_amount NUMERIC;

-- 4. In-row customer & status alignment on orders (BEFORE INSERT OR UPDATE)
CREATE OR REPLACE FUNCTION align_order_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- A. Synchronize customer_id, customer_name, customer_phone with users table
  IF NEW.user_id IS NOT NULL THEN
    IF NEW.customer_id IS NULL THEN
      NEW.customer_id := NEW.user_id;
    END IF;
    IF NEW.customer_name IS NULL OR NEW.customer_phone IS NULL THEN
      SELECT name, phone INTO NEW.customer_name, NEW.customer_phone
      FROM users WHERE id = NEW.user_id;
    END IF;
  ELSIF NEW.customer_id IS NOT NULL AND NEW.user_id IS NULL THEN
    NEW.user_id := NEW.customer_id;
  END IF;

  -- Ensure delivery_ref is set
  IF NEW.delivery_ref IS NULL AND NEW.id IS NOT NULL THEN
    NEW.delivery_ref := 'DEL-' || NEW.id;
  END IF;

  -- B. Keep orders.status and orders.tracking_status strictly aligned
  IF (TG_OP = 'UPDATE') THEN
    IF (NEW.status IS DISTINCT FROM OLD.status) AND (NEW.tracking_status IS NOT DISTINCT FROM OLD.tracking_status) THEN
      CASE NEW.status
        WHEN 'pending' THEN NEW.tracking_status := 'order_placed';
        WHEN 'confirmed' THEN NEW.tracking_status := 'confirmed';
        WHEN 'packaging' THEN NEW.tracking_status := 'packaging';
        WHEN 'processing' THEN NEW.tracking_status := 'processing';
        WHEN 'packed' THEN NEW.tracking_status := 'packed_ready';
        WHEN 'packed_ready' THEN NEW.tracking_status := 'packed_ready';
        WHEN 'awaiting_driver_confirmation' THEN NEW.tracking_status := 'awaiting_driver_confirmation';
        WHEN 'driver_assigned' THEN NEW.tracking_status := 'driver_assigned';
        WHEN 'picked_up' THEN NEW.tracking_status := 'picked_up';
        WHEN 'shipped' THEN NEW.tracking_status := 'out_for_delivery';
        WHEN 'delivered' THEN NEW.tracking_status := 'delivered';
        WHEN 'cancelled' THEN NEW.tracking_status := 'cancelled';
        ELSE NULL;
      END CASE;
    ELSIF (NEW.tracking_status IS DISTINCT FROM OLD.tracking_status) AND (NEW.status IS NOT DISTINCT FROM OLD.status) THEN
      CASE NEW.tracking_status
        WHEN 'driver_arrived' THEN NEW.status := 'shipped';
        WHEN 'out_for_delivery' THEN NEW.status := 'shipped';
        WHEN 'picked_up' THEN NEW.status := 'picked_up';
        WHEN 'driver_assigned' THEN NEW.status := 'driver_assigned';
        WHEN 'awaiting_driver_confirmation' THEN NEW.status := 'awaiting_driver_confirmation';
        WHEN 'delivered' THEN NEW.status := 'delivered';
        WHEN 'cancelled' THEN NEW.status := 'cancelled';
        ELSE NULL;
      END CASE;
    END IF;
  ELSE
    -- On INSERT, default tracking_status if not explicitly provided
    IF NEW.tracking_status IS NULL THEN
      NEW.tracking_status := COALESCE(NEW.status, 'order_placed');
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_align_order_fields ON orders;
CREATE TRIGGER trg_align_order_fields
  BEFORE INSERT OR UPDATE OF status, tracking_status, user_id, customer_id
  ON orders
  FOR EACH ROW
  EXECUTE FUNCTION align_order_fields();

-- 5. Auto-create delivery row on orders insert (AFTER INSERT)
CREATE OR REPLACE FUNCTION auto_create_delivery_for_order()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM deliveries WHERE order_id = NEW.id) THEN
    INSERT INTO deliveries (
      delivery_ref,
      order_id,
      driver_id,
      status,
      delivery_address,
      eta_minutes,
      created_at,
      updated_at
    )
    VALUES (
      COALESCE(NEW.delivery_ref, 'DEL-' || NEW.id),
      NEW.id,
      NEW.driver_id,
      COALESCE(NEW.delivery_status, 'assigned'),
      COALESCE(NEW.address, 'Customer Delivery Address'),
      COALESCE(NEW.eta_minutes, 0),
      NOW(),
      NOW()
    )
    ON CONFLICT (delivery_ref) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_auto_create_delivery_for_order ON orders;
CREATE TRIGGER trg_auto_create_delivery_for_order
  AFTER INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_delivery_for_order();

-- 6. Cross-table synchronization: deliveries -> orders & driver availability (AFTER INSERT OR UPDATE)
CREATE OR REPLACE FUNCTION sync_deliveries_to_orders_and_drivers()
RETURNS TRIGGER AS $$
DECLARE
  target_order_status VARCHAR;
  target_tracking_status VARCHAR;
  affected_driver_id BIGINT;
  has_active_deliveries BOOLEAN;
BEGIN
  IF pg_trigger_depth() > 2 THEN
    RETURN NEW;
  END IF;

  -- A. Determine mapped order statuses based on delivery status
  CASE NEW.status
    WHEN 'assigned' THEN
      target_order_status := 'awaiting_driver_confirmation';
      target_tracking_status := 'awaiting_driver_confirmation';
    WHEN 'accepted' THEN
      target_order_status := 'driver_assigned';
      target_tracking_status := 'driver_assigned';
    WHEN 'awaiting_pickup' THEN
      target_order_status := 'driver_assigned';
      target_tracking_status := 'driver_assigned';
    WHEN 'picked_up' THEN
      target_order_status := 'picked_up';
      target_tracking_status := 'picked_up';
    WHEN 'en_route' THEN
      target_order_status := 'shipped';
      target_tracking_status := 'out_for_delivery';
    WHEN 'arrived' THEN
      target_order_status := 'shipped';
      target_tracking_status := 'driver_arrived';
    WHEN 'delivered' THEN
      target_order_status := 'delivered';
      target_tracking_status := 'delivered';
    WHEN 'delivery_attempted' THEN
      target_order_status := 'delivery_attempted';
      target_tracking_status := 'failed_attempt';
    WHEN 'cancelled' THEN
      target_order_status := 'cancelled';
      target_tracking_status := 'cancelled';
    ELSE
      target_order_status := NULL;
      target_tracking_status := NULL;
  END CASE;

  IF target_order_status IS NOT NULL THEN
    UPDATE orders
    SET 
      status = target_order_status,
      tracking_status = target_tracking_status,
      delivery_status = NEW.status,
      driver_id = COALESCE(NEW.driver_id, orders.driver_id),
      driver_picked_up = CASE WHEN NEW.status IN ('picked_up', 'en_route', 'arrived', 'delivered') THEN true ELSE orders.driver_picked_up END,
      picked_up_at = CASE WHEN NEW.status IN ('picked_up', 'en_route', 'arrived', 'delivered') THEN COALESCE(NEW.picked_up_at, orders.picked_up_at, NOW()) ELSE orders.picked_up_at END,
      delivered_at = CASE WHEN NEW.status = 'delivered' THEN COALESCE(NEW.delivered_at, orders.delivered_at, NOW()) ELSE orders.delivered_at END,
      proof_photo = COALESCE(NEW.proof_photo, orders.proof_photo),
      proof_note = COALESCE(NEW.proof_note, orders.proof_note),
      updated_at = NOW()
    WHERE id = NEW.order_id
      AND (status IS DISTINCT FROM target_order_status 
           OR tracking_status IS DISTINCT FROM target_tracking_status
           OR delivery_status IS DISTINCT FROM NEW.status
           OR (NEW.driver_id IS NOT NULL AND driver_id IS DISTINCT FROM NEW.driver_id));
  END IF;

  -- B. Keep driver availability & status strictly synchronized with actual delivery state
  affected_driver_id := COALESCE(NEW.driver_id, (CASE WHEN TG_OP = 'UPDATE' THEN OLD.driver_id ELSE NULL END));
  
  IF affected_driver_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM deliveries
      WHERE driver_id = affected_driver_id
        AND status IN ('picked_up', 'en_route', 'arrived')
    ) INTO has_active_deliveries;

    IF has_active_deliveries THEN
      UPDATE driver_availability
      SET is_on_delivery = true, last_toggled_at = NOW()
      WHERE driver_id = affected_driver_id AND is_on_delivery IS DISTINCT FROM true;

      UPDATE drivers
      SET is_on_delivery = true, status = 'on_delivery', updated_at = NOW()
      WHERE id = affected_driver_id AND (status NOT IN ('on_delivery', 'suspended') OR is_on_delivery IS DISTINCT FROM true);
    ELSE
      UPDATE driver_availability
      SET is_on_delivery = false, last_toggled_at = NOW()
      WHERE driver_id = affected_driver_id AND is_on_delivery IS DISTINCT FROM false;

      UPDATE drivers
      SET is_on_delivery = false, status = 'active', updated_at = NOW()
      WHERE id = affected_driver_id AND (status = 'on_delivery' OR is_on_delivery IS DISTINCT FROM false);
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_deliveries_to_orders ON deliveries;
DROP TRIGGER IF EXISTS trg_sync_deliveries_to_orders_and_drivers ON deliveries;
CREATE TRIGGER trg_sync_deliveries_to_orders_and_drivers
  AFTER INSERT OR UPDATE OF status, driver_id, delivered_at, picked_up_at
  ON deliveries
  FOR EACH ROW
  EXECUTE FUNCTION sync_deliveries_to_orders_and_drivers();

-- 7. Cross-table synchronization: orders -> deliveries (AFTER UPDATE)
CREATE OR REPLACE FUNCTION propagate_order_status_to_deliveries()
RETURNS TRIGGER AS $$
BEGIN
  IF pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;

  IF NEW.status = 'cancelled' AND (OLD.status IS NULL OR OLD.status != 'cancelled') THEN
    UPDATE deliveries
    SET status = 'cancelled', updated_at = NOW()
    WHERE order_id = NEW.id AND status NOT IN ('delivered', 'cancelled');
  ELSIF NEW.status = 'delivered' AND (OLD.status IS NULL OR OLD.status != 'delivered') THEN
    UPDATE deliveries
    SET status = 'delivered', delivered_at = COALESCE(delivered_at, NOW()), updated_at = NOW()
    WHERE order_id = NEW.id AND status != 'delivered';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_propagate_order_status_to_deliveries ON orders;
CREATE TRIGGER trg_propagate_order_status_to_deliveries
  AFTER UPDATE OF status
  ON orders
  FOR EACH ROW
  EXECUTE FUNCTION propagate_order_status_to_deliveries();

-- 8. Products stock parity trigger (BEFORE INSERT OR UPDATE ON products)
CREATE OR REPLACE FUNCTION align_product_stock_columns()
RETURNS TRIGGER AS $$
BEGIN
  IF (NEW.stock IS DISTINCT FROM OLD.stock) AND (NEW.stock_quantity IS NOT DISTINCT FROM OLD.stock_quantity) THEN
    NEW.stock_quantity := NEW.stock;
  ELSIF (NEW.stock_quantity IS DISTINCT FROM OLD.stock_quantity) AND (NEW.stock IS NOT DISTINCT FROM OLD.stock) THEN
    NEW.stock := NEW.stock_quantity;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_align_product_stock_columns ON products;
CREATE TRIGGER trg_align_product_stock_columns
  BEFORE INSERT OR UPDATE OF stock, stock_quantity
  ON products
  FOR EACH ROW
  EXECUTE FUNCTION align_product_stock_columns();
