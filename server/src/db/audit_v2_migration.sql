-- ============================================================
-- God Eye Audit Log v2 — Schema Expansion
-- Run via: node server/src/db/migrate_audit_v2.js
-- Idempotent — safe to run multiple times.
-- ============================================================

-- Base table creation if not exists
CREATE TABLE IF NOT EXISTS system_audit_events (
  id BIGSERIAL PRIMARY KEY,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  source TEXT NOT NULL,
  action TEXT NOT NULL,
  actor_id INTEGER,
  actor_name TEXT,
  actor_role TEXT,
  request_id TEXT,
  resource TEXT,
  category TEXT NOT NULL DEFAULT 'system',
  severity TEXT NOT NULL DEFAULT 'info',
  entity_type TEXT,
  entity_id TEXT,
  outcome TEXT NOT NULL,
  old_value JSONB,
  new_value JSONB,
  ip_address TEXT,
  user_agent TEXT,
  session_id TEXT,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  external_id TEXT UNIQUE
);

-- Expand system_audit_events with God Eye columns (in case table was previously created with fewer columns)
ALTER TABLE system_audit_events
  ADD COLUMN IF NOT EXISTS category    TEXT NOT NULL DEFAULT 'system',
  ADD COLUMN IF NOT EXISTS severity    TEXT NOT NULL DEFAULT 'info',
  ADD COLUMN IF NOT EXISTS entity_type TEXT,
  ADD COLUMN IF NOT EXISTS entity_id   TEXT,
  ADD COLUMN IF NOT EXISTS old_value   JSONB,
  ADD COLUMN IF NOT EXISTS new_value   JSONB,
  ADD COLUMN IF NOT EXISTS ip_address  TEXT,
  ADD COLUMN IF NOT EXISTS user_agent  TEXT,
  ADD COLUMN IF NOT EXISTS session_id  TEXT,
  ADD COLUMN IF NOT EXISTS actor_name  TEXT;

-- Indexes for God Eye filter performance
CREATE INDEX IF NOT EXISTS audit_category    ON system_audit_events(category, occurred_at DESC);
CREATE INDEX IF NOT EXISTS audit_severity    ON system_audit_events(severity, occurred_at DESC);
CREATE INDEX IF NOT EXISTS audit_entity      ON system_audit_events(entity_type, entity_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS audit_ip          ON system_audit_events(ip_address, occurred_at DESC);
CREATE INDEX IF NOT EXISTS audit_action_text ON system_audit_events USING gin(to_tsvector('english', action || ' ' || COALESCE(resource,'') || ' ' || COALESCE(actor_name,'')));

-- Update the capture_business_change function to include category and severity
CREATE OR REPLACE FUNCTION capture_business_change() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  before_row jsonb; after_row jsonb; keys_changed jsonb;
  before_safe jsonb; after_safe jsonb;
  severity_val text; entity_id_val text;
BEGIN
  IF TG_OP = 'TRUNCATE' THEN
    INSERT INTO system_audit_events(source,action,resource,outcome,category,severity,details)
      VALUES('database','truncate',TG_TABLE_NAME,'committed','admin','critical',
        jsonb_build_object('database_role',session_user));
    RETURN NULL;
  END IF;

  before_row := CASE WHEN TG_OP = 'INSERT' THEN '{}'::jsonb ELSE to_jsonb(OLD) END;
  after_row  := CASE WHEN TG_OP = 'DELETE' THEN '{}'::jsonb ELSE to_jsonb(NEW) END;

  SELECT COALESCE(jsonb_agg(k), '[]'::jsonb) INTO keys_changed
    FROM (SELECT jsonb_object_keys(before_row || after_row) AS k) x
    WHERE before_row->k IS DISTINCT FROM after_row->k;

  IF keys_changed = '[]'::jsonb THEN RETURN NULL; END IF;

  -- Severity by operation
  severity_val := CASE
    WHEN TG_OP = 'DELETE' THEN 'critical'
    WHEN TG_OP = 'INSERT' THEN 'info'
    ELSE 'warning'
  END;

  -- Safe before/after snapshot (no PII)
  SELECT COALESCE(jsonb_object_agg(key,value), '{}'::jsonb) INTO before_safe FROM jsonb_each(before_row)
    WHERE key = ANY(ARRAY['status','role','stock','stock_quantity','price','unit_price','cost_price',
      'quantity','total','subtotal','amount','balance','available_for_sale','is_active','is_paid',
      'payment_status','delivery_status','order_status','type','category_id','product_id']);
  SELECT COALESCE(jsonb_object_agg(key,value), '{}'::jsonb) INTO after_safe FROM jsonb_each(after_row)
    WHERE key = ANY(ARRAY['status','role','stock','stock_quantity','price','unit_price','cost_price',
      'quantity','total','subtotal','amount','balance','available_for_sale','is_active','is_paid',
      'payment_status','delivery_status','order_status','type','category_id','product_id']);

  entity_id_val := COALESCE(after_row->>'id', before_row->>'id', 'unknown');

  INSERT INTO system_audit_events(
    source, action, actor_id, actor_name, request_id, resource,
    outcome, category, severity, entity_type, entity_id,
    old_value, new_value, details
  ) VALUES(
    'database',
    lower(TG_OP),
    NULLIF(current_setting('app.actor_id',true),'')::integer,
    NULLIF(current_setting('app.actor_name',true),''),
    NULLIF(current_setting('app.request_id',true),''),
    TG_TABLE_NAME || '/' || entity_id_val,
    'committed',
    'admin',
    severity_val,
    TG_TABLE_NAME,
    entity_id_val,
    CASE WHEN jsonb_typeof(before_safe) = 'object' AND before_safe <> '{}'::jsonb THEN before_safe ELSE NULL END,
    CASE WHEN jsonb_typeof(after_safe)  = 'object' AND after_safe  <> '{}'::jsonb THEN after_safe  ELSE NULL END,
    jsonb_build_object(
      'changed_fields', keys_changed,
      'database_role',  session_user,
      'transaction_id', txid_current()
    )
  );
  RETURN NULL;
END;
$$;

-- Re-apply triggers to all business tables (idempotent)
DO $$ DECLARE t record; BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname='public'
    AND tablename NOT IN ('system_audit_events','ai_user_activity','product_demand_telemetry') LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS business_audit_truncate ON public.%I', t.tablename);
    EXECUTE format('CREATE TRIGGER business_audit_truncate AFTER TRUNCATE ON public.%I FOR EACH STATEMENT EXECUTE FUNCTION capture_business_change()',t.tablename);
    EXECUTE format('DROP TRIGGER IF EXISTS business_audit_change ON public.%I', t.tablename);
    EXECUTE format('CREATE TRIGGER business_audit_change AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION capture_business_change()',t.tablename);
  END LOOP;
END $$;
