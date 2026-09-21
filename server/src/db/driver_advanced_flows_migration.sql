-- Database migration for Driver Advanced Mobile Flows
-- Idempotent schema migration for Push Tokens, Notifications, Incidents, Emergencies & Performance

-- 1. Driver Device Tokens table (for FCM / Expo Push Notifications)
CREATE TABLE IF NOT EXISTS public.driver_device_tokens (
    id BIGSERIAL PRIMARY KEY,
    driver_id BIGINT NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
    token TEXT NOT NULL,
    platform VARCHAR(50) DEFAULT 'expo', -- expo, fcm, apns, android, ios
    device_info JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    CONSTRAINT uq_driver_device_token UNIQUE (driver_id, token)
);
CREATE INDEX IF NOT EXISTS idx_driver_device_tokens_driver_id ON public.driver_device_tokens(driver_id);

-- 2. Driver In-App Notifications table
CREATE TABLE IF NOT EXISTS public.driver_notifications (
    id BIGSERIAL PRIMARY KEY,
    driver_id BIGINT NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'system', -- dispatch, payout, broadcast, emergency, system, reminder
    data JSONB DEFAULT '{}'::jsonb,
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP WITHOUT TIME ZONE,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_driver_notifications_driver_read ON public.driver_notifications(driver_id, is_read);

-- 3. Driver Incidents & Mid-Trip Problem Reporting
CREATE TABLE IF NOT EXISTS public.driver_incidents (
    id BIGSERIAL PRIMARY KEY,
    incident_ref VARCHAR(50) UNIQUE NOT NULL,
    driver_id BIGINT NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
    order_id VARCHAR(100),
    delivery_id BIGINT REFERENCES public.deliveries(id) ON DELETE SET NULL,
    issue_type VARCHAR(100) NOT NULL, -- customer_unreachable, wrong_address, damaged_goods, vehicle_breakdown, payment_issue, other
    description TEXT NOT NULL,
    photo_urls JSONB DEFAULT '[]'::jsonb,
    latitude NUMERIC(10,7),
    longitude NUMERIC(10,7),
    status VARCHAR(50) DEFAULT 'open', -- open, in_review, resolved, dismissed
    resolution_notes TEXT,
    resolved_at TIMESTAMP WITHOUT TIME ZONE,
    resolved_by INTEGER,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_driver_incidents_driver ON public.driver_incidents(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_incidents_order ON public.driver_incidents(order_id);

-- 4. Driver Emergency SOS & Panic Alerts
CREATE TABLE IF NOT EXISTS public.driver_emergencies (
    id BIGSERIAL PRIMARY KEY,
    emergency_ref VARCHAR(50) UNIQUE NOT NULL,
    driver_id BIGINT NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
    latitude NUMERIC(10,7) NOT NULL,
    longitude NUMERIC(10,7) NOT NULL,
    address TEXT,
    battery_level INTEGER,
    emergency_type VARCHAR(100) DEFAULT 'sos_panic', -- sos_panic, vehicle_accident, security_threat, medical
    status VARCHAR(50) DEFAULT 'active', -- active, acknowledged, resolved, cancelled_false_alarm
    notes TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITHOUT TIME ZONE,
    resolved_by INTEGER
);
CREATE INDEX IF NOT EXISTS idx_driver_emergencies_status ON public.driver_emergencies(status);

-- 5. Additional Columns on deliveries table for Accept / Decline & Proof Uploads
ALTER TABLE public.deliveries ADD COLUMN IF NOT EXISTS decline_reason TEXT;
ALTER TABLE public.deliveries ADD COLUMN IF NOT EXISTS declined_at TIMESTAMP WITHOUT TIME ZONE;
ALTER TABLE public.deliveries ADD COLUMN IF NOT EXISTS declined_by JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.deliveries ADD COLUMN IF NOT EXISTS customer_rating NUMERIC(3,2);
ALTER TABLE public.deliveries ADD COLUMN IF NOT EXISTS customer_review TEXT;
ALTER TABLE public.deliveries ADD COLUMN IF NOT EXISTS distance_km NUMERIC(6,2) DEFAULT 0;

-- 6. Additional Columns on drivers table for Performance & Tokens
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS rating NUMERIC(3,2) DEFAULT 5.00;
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS total_ratings_count INTEGER DEFAULT 0;
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS acceptance_rate NUMERIC(5,2) DEFAULT 100.00;
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS on_time_rate NUMERIC(5,2) DEFAULT 100.00;
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS total_km_driven NUMERIC(10,2) DEFAULT 0;
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS fcm_token TEXT;
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS device_platform VARCHAR(50);
