-- ==============================================================================
-- BEMS FARMS ORDER-TO-DELIVERY WORKFLOW MIGRATION
-- Supports the 70-section Order-to-Delivery technical specification.
-- ==============================================================================

-- 1. Inventory Transactions Table (Mandatory audit log for all stock movements)
CREATE TABLE IF NOT EXISTS inventory_transactions (
    id SERIAL PRIMARY KEY,
    order_id TEXT,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL,
    previous_quantity INTEGER NOT NULL,
    new_quantity INTEGER NOT NULL,
    pos_terminal TEXT,
    pos_operator_id INTEGER,
    transaction_type VARCHAR(50) NOT NULL, -- 'pos_packaging_stockout', 'return_to_stock', 'disposal', 'manual_adjustment', 'purchase_restock'
    source_reference TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inv_tx_order_id ON inventory_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_inv_tx_product_id ON inventory_transactions(product_id);
CREATE INDEX IF NOT EXISTS idx_inv_tx_created_at ON inventory_transactions(created_at);

-- 2. Order Item Scans Table (Tracks each individual barcode scan at POS)
CREATE TABLE IF NOT EXISTS order_item_scans (
    id SERIAL PRIMARY KEY,
    order_id TEXT NOT NULL,
    order_item_id INTEGER,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    scanned_barcode TEXT NOT NULL,
    scanned_quantity INTEGER NOT NULL DEFAULT 1,
    operator_id INTEGER,
    terminal_id TEXT,
    scanned_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_item_scans_order_id ON order_item_scans(order_id);

-- 3. Extend orders table with workflow tracking columns
DO $$
BEGIN
    -- Packing tracking
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='packed_at') THEN
        ALTER TABLE orders ADD COLUMN packed_at TIMESTAMPTZ;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='packed_by') THEN
        ALTER TABLE orders ADD COLUMN packed_by INTEGER;
    END IF;

    -- Invoice printing tracking
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='invoice_number') THEN
        ALTER TABLE orders ADD COLUMN invoice_number TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='invoice_printed_by') THEN
        ALTER TABLE orders ADD COLUMN invoice_printed_by INTEGER;
    END IF;

    -- Driver assignment tracking
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='assignment_method') THEN
        ALTER TABLE orders ADD COLUMN assignment_method VARCHAR(20) DEFAULT 'auto'; -- 'auto' or 'manual'
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='driver_assigned_at') THEN
        ALTER TABLE orders ADD COLUMN driver_assigned_at TIMESTAMPTZ;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='driver_accepted_at') THEN
        ALTER TABLE orders ADD COLUMN driver_accepted_at TIMESTAMPTZ;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='driver_response') THEN
        ALTER TABLE orders ADD COLUMN driver_response VARCHAR(30);
    END IF;

    -- Delivery dual-confirmation tracking
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='driver_arrived_at') THEN
        ALTER TABLE orders ADD COLUMN driver_arrived_at TIMESTAMPTZ;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='customer_confirmed') THEN
        ALTER TABLE orders ADD COLUMN customer_confirmed BOOLEAN DEFAULT FALSE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='customer_confirmed_at') THEN
        ALTER TABLE orders ADD COLUMN customer_confirmed_at TIMESTAMPTZ;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='driver_confirmed') THEN
        ALTER TABLE orders ADD COLUMN driver_confirmed BOOLEAN DEFAULT FALSE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='driver_confirmed_at') THEN
        ALTER TABLE orders ADD COLUMN driver_confirmed_at TIMESTAMPTZ;
    END IF;

    -- Administrative override for delivery
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='delivery_override_by') THEN
        ALTER TABLE orders ADD COLUMN delivery_override_by INTEGER;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='delivery_override_reason') THEN
        ALTER TABLE orders ADD COLUMN delivery_override_reason TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='delivery_override_at') THEN
        ALTER TABLE orders ADD COLUMN delivery_override_at TIMESTAMPTZ;
    END IF;
END $$;

-- 4. Extend order_items table with scanned_quantity tracking
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='order_items' AND column_name='scanned_quantity') THEN
        ALTER TABLE order_items ADD COLUMN scanned_quantity INTEGER NOT NULL DEFAULT 0;
    END IF;
END $$;

-- 5. Extend return_items table with disposition tracking
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='return_items' AND column_name='disposition') THEN
        ALTER TABLE return_items ADD COLUMN disposition VARCHAR(30) DEFAULT 'pending'; -- 'pending', 'return_to_stock', 'dispose'
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='return_items' AND column_name='disposed_by') THEN
        ALTER TABLE return_items ADD COLUMN disposed_by INTEGER;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='return_items' AND column_name='disposed_at') THEN
        ALTER TABLE return_items ADD COLUMN disposed_at TIMESTAMPTZ;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='return_items' AND column_name='disposition_notes') THEN
        ALTER TABLE return_items ADD COLUMN disposition_notes TEXT;
    END IF;
END $$;

-- 6. Unified Order Audit Logs Table (Captures actor + action + entity + timestamp + previous state + new state + metadata)
CREATE TABLE IF NOT EXISTS order_audit_logs (
    id SERIAL PRIMARY KEY,
    order_id TEXT NOT NULL,
    actor_id INTEGER,
    actor_name TEXT,
    actor_role VARCHAR(50),
    action VARCHAR(100) NOT NULL,
    previous_state VARCHAR(50),
    new_state VARCHAR(50),
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_audit_logs_order_id ON order_audit_logs(order_id);
CREATE INDEX IF NOT EXISTS idx_order_audit_logs_created_at ON order_audit_logs(created_at);
