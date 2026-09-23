-- ── Driver Goods Pickup & Handover Confirmation Migration ────────────────────
-- Ensures drivers confirm physical pickup of goods before order moves to in_transit

ALTER TABLE public.deliveries ADD COLUMN IF NOT EXISTS picked_up_at TIMESTAMP WITHOUT TIME ZONE;
ALTER TABLE public.deliveries ADD COLUMN IF NOT EXISTS goods_confirmed_by_driver BOOLEAN DEFAULT false;
ALTER TABLE public.deliveries ADD COLUMN IF NOT EXISTS picked_up_by INT REFERENCES drivers(id);

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS driver_picked_up BOOLEAN DEFAULT false;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS picked_up_at TIMESTAMP WITHOUT TIME ZONE;

-- Create index for quick lookup
CREATE INDEX IF NOT EXISTS idx_deliveries_goods_confirmed ON public.deliveries(goods_confirmed_by_driver);
CREATE INDEX IF NOT EXISTS idx_orders_driver_picked_up ON public.orders(driver_picked_up);
