-- Migration: Single Source of Truth Synchronization Triggers for Orders and Deliveries
-- Date: 2026-09-24

-- 1. Ensure constraint on deliveries supports all lifecycle statuses
ALTER TABLE deliveries DROP CONSTRAINT IF EXISTS deliveries_status_check;
ALTER TABLE deliveries ADD CONSTRAINT deliveries_status_check 
  CHECK (status = ANY (ARRAY['assigned', 'accepted', 'awaiting_pickup', 'picked_up', 'en_route', 'arrived', 'delivery_attempted', 'delivered', 'cancelled']));

-- 2. In-row alignment for orders table (BEFORE UPDATE)
-- Keeps orders.status and orders.tracking_status strictly aligned whenever one is updated
CREATE OR REPLACE FUNCTION align_order_status_columns()
RETURNS TRIGGER AS $$
BEGIN
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
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_align_order_status_columns ON orders;
CREATE TRIGGER trg_align_order_status_columns
  BEFORE UPDATE OF status, tracking_status
  ON orders
  FOR EACH ROW
  EXECUTE FUNCTION align_order_status_columns();

-- 3. Cross-table synchronization: deliveries -> orders (AFTER INSERT OR UPDATE)
CREATE OR REPLACE FUNCTION sync_deliveries_to_orders()
RETURNS TRIGGER AS $$
DECLARE
  target_order_status VARCHAR;
  target_tracking_status VARCHAR;
BEGIN
  IF pg_trigger_depth() > 2 THEN
    RETURN NEW;
  END IF;

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
      driver_id = COALESCE(NEW.driver_id, orders.driver_id),
      driver_picked_up = CASE WHEN NEW.status IN ('picked_up', 'en_route', 'arrived', 'delivered') THEN true ELSE orders.driver_picked_up END,
      picked_up_at = CASE WHEN NEW.status IN ('picked_up', 'en_route', 'arrived', 'delivered') THEN COALESCE(NEW.picked_up_at, orders.picked_up_at, NOW()) ELSE orders.picked_up_at END,
      delivered_at = CASE WHEN NEW.status = 'delivered' THEN COALESCE(NEW.delivered_at, orders.delivered_at, NOW()) ELSE orders.delivered_at END,
      updated_at = NOW()
    WHERE id = NEW.order_id
      AND (status IS DISTINCT FROM target_order_status 
           OR tracking_status IS DISTINCT FROM target_tracking_status
           OR (NEW.driver_id IS NOT NULL AND driver_id IS DISTINCT FROM NEW.driver_id));
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_deliveries_to_orders ON deliveries;
CREATE TRIGGER trg_sync_deliveries_to_orders
  AFTER INSERT OR UPDATE OF status, driver_id, delivered_at, picked_up_at
  ON deliveries
  FOR EACH ROW
  EXECUTE FUNCTION sync_deliveries_to_orders();

-- 4. Cross-table synchronization: orders -> deliveries (AFTER UPDATE)
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
