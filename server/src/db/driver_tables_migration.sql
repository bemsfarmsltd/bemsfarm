-- Database migration for Driver App tables
-- Idempotent schema migration

-- 1. Ensure driver_auth table exists
CREATE TABLE IF NOT EXISTS public.driver_auth (
    id BIGSERIAL PRIMARY KEY,
    driver_id BIGINT NOT NULL UNIQUE REFERENCES public.drivers(id) ON DELETE CASCADE,
    password_hash TEXT NOT NULL,
    last_login TIMESTAMP WITHOUT TIME ZONE,
    failed_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP WITHOUT TIME ZONE,
    reset_token TEXT,
    reset_token_expires TIMESTAMP WITHOUT TIME ZONE,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- 2. Ensure driver_availability table exists
CREATE TABLE IF NOT EXISTS public.driver_availability (
    id BIGSERIAL PRIMARY KEY,
    driver_id BIGINT NOT NULL UNIQUE REFERENCES public.drivers(id) ON DELETE CASCADE,
    is_available BOOLEAN DEFAULT FALSE,
    is_on_delivery BOOLEAN DEFAULT FALSE,
    last_toggled_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- 3. Ensure driver_locations table exists
CREATE TABLE IF NOT EXISTS public.driver_locations (
    id BIGSERIAL PRIMARY KEY,
    driver_id BIGINT NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
    latitude NUMERIC(10,7) NOT NULL,
    longitude NUMERIC(10,7) NOT NULL,
    heading NUMERIC(5,2),
    speed NUMERIC(6,2),
    accuracy NUMERIC(6,2),
    recorded_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_driver_locations_driver_time ON public.driver_locations(driver_id, recorded_at DESC);

-- 4. Ensure driver_commissions table exists
CREATE TABLE IF NOT EXISTS public.driver_commissions (
    id BIGSERIAL PRIMARY KEY,
    driver_id BIGINT NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
    week_start DATE,
    week_end DATE,
    trips INTEGER DEFAULT 0,
    commission_per_delivery NUMERIC(10,2) DEFAULT 0 NOT NULL,
    total_earned NUMERIC(12,2) DEFAULT 0,
    total_paid NUMERIC(12,2) DEFAULT 0,
    unpaid_balance NUMERIC(12,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    period_from DATE,
    period_to DATE,
    deliveries INTEGER DEFAULT 0,
    base_amount NUMERIC(12,2) DEFAULT 0,
    bonus NUMERIC(12,2) DEFAULT 0,
    deductions NUMERIC(12,2) DEFAULT 0,
    net_payout NUMERIC(12,2) DEFAULT 0,
    paid_at TIMESTAMP WITHOUT TIME ZONE,
    payment_ref VARCHAR(100),
    created_by INTEGER
);

-- 5. Ensure driver_payouts table exists for withdrawal requests
CREATE TABLE IF NOT EXISTS public.driver_payouts (
    id BIGSERIAL PRIMARY KEY,
    driver_id BIGINT NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
    payout_ref VARCHAR(50) UNIQUE NOT NULL,
    amount NUMERIC(12,2) NOT NULL,
    bank_name VARCHAR(100),
    account_number VARCHAR(30),
    account_name VARCHAR(100),
    status VARCHAR(30) DEFAULT 'pending', -- pending, approved, paid, rejected
    requested_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITHOUT TIME ZONE,
    processed_by INTEGER,
    rejection_reason TEXT,
    notes TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_driver_payouts_driver_id ON public.driver_payouts(driver_id);

-- 6. Ensure columns on deliveries table for proof of delivery and delivery details
ALTER TABLE public.deliveries ADD COLUMN IF NOT EXISTS proof_photo TEXT;
ALTER TABLE public.deliveries ADD COLUMN IF NOT EXISTS proof_photos JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.deliveries ADD COLUMN IF NOT EXISTS item_proofs JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.deliveries ADD COLUMN IF NOT EXISTS proof_note TEXT;
ALTER TABLE public.deliveries ADD COLUMN IF NOT EXISTS failure_reason TEXT;
ALTER TABLE public.deliveries ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMP WITHOUT TIME ZONE;
ALTER TABLE public.deliveries ADD COLUMN IF NOT EXISTS arrived_at TIMESTAMP WITHOUT TIME ZONE;

-- 7. Ensure columns on drivers table
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS is_available BOOLEAN DEFAULT TRUE;
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS bank_name VARCHAR(100);
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS account_number VARCHAR(30);
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS account_name VARCHAR(100);

-- 8. Ensure delivery_assignments table exists for dispatch mapping and timeout tracking
CREATE TABLE IF NOT EXISTS public.delivery_assignments (
    id BIGSERIAL PRIMARY KEY,
    delivery_id BIGINT NOT NULL REFERENCES public.deliveries(id) ON DELETE CASCADE,
    driver_id BIGINT NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
    assignment_type VARCHAR(30) DEFAULT 'auto',
    driver_response VARCHAR(30) DEFAULT 'pending',
    rejection_reason TEXT,
    response_at TIMESTAMP WITHOUT TIME ZONE,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_delivery_assignments_lookup ON public.delivery_assignments(delivery_id, driver_id, driver_response, created_at);

