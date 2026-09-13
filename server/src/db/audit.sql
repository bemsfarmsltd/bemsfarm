-- Apply with scripts/migrate-crm-audit.js. Existing history is not reconstructed.
CREATE TABLE IF NOT EXISTS system_audit_events (
  id BIGSERIAL PRIMARY KEY,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  source TEXT NOT NULL,
  action TEXT NOT NULL,
  actor_id INTEGER,
  actor_role TEXT,
  request_id TEXT,
  resource TEXT,
  outcome TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  external_id TEXT UNIQUE
);
CREATE INDEX IF NOT EXISTS system_audit_time ON system_audit_events(occurred_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS system_audit_actor ON system_audit_events(actor_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS system_audit_source ON system_audit_events(source, occurred_at DESC);
CREATE OR REPLACE FUNCTION reject_audit_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Audit events are append-only'; END;
$$;
DROP TRIGGER IF EXISTS audit_no_mutation ON system_audit_events;
CREATE TRIGGER audit_no_mutation BEFORE UPDATE OR DELETE OR TRUNCATE ON system_audit_events
FOR EACH STATEMENT EXECUTE FUNCTION reject_audit_mutation();

-- Store changed column names, with before/after values ONLY for non-personal
-- operational fields. Never store credentials, messages, addresses or profiles.
CREATE OR REPLACE FUNCTION capture_business_change() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE before_row jsonb; after_row jsonb; keys_changed jsonb; before_safe jsonb; after_safe jsonb;
BEGIN
  IF TG_OP = 'TRUNCATE' THEN
    INSERT INTO system_audit_events(source,action,resource,outcome,details)
      VALUES('database','truncate',TG_TABLE_NAME,'committed',jsonb_build_object('database_role',session_user));
    RETURN NULL;
  END IF;
  before_row := CASE WHEN TG_OP = 'INSERT' THEN '{}'::jsonb ELSE to_jsonb(OLD) END;
  after_row := CASE WHEN TG_OP = 'DELETE' THEN '{}'::jsonb ELSE to_jsonb(NEW) END;
  SELECT COALESCE(jsonb_agg(k), '[]'::jsonb) INTO keys_changed
    FROM (SELECT jsonb_object_keys(before_row || after_row) AS k) x
    WHERE before_row->k IS DISTINCT FROM after_row->k;
  IF keys_changed = '[]'::jsonb THEN RETURN NULL; END IF;
  SELECT COALESCE(jsonb_object_agg(key,value), '{}'::jsonb) INTO before_safe FROM jsonb_each(before_row)
    WHERE key = ANY(ARRAY['status','role','stock','stock_quantity','price','unit_price','cost_price','quantity','total','subtotal','amount','balance','available_for_sale']);
  SELECT COALESCE(jsonb_object_agg(key,value), '{}'::jsonb) INTO after_safe FROM jsonb_each(after_row)
    WHERE key = ANY(ARRAY['status','role','stock','stock_quantity','price','unit_price','cost_price','quantity','total','subtotal','amount','balance','available_for_sale']);
  INSERT INTO system_audit_events(source, action, actor_id, request_id, resource, outcome, details)
  VALUES('database', lower(TG_OP), NULLIF(current_setting('app.actor_id',true),'')::integer,
    NULLIF(current_setting('app.request_id',true),''), TG_TABLE_NAME || '/' || COALESCE(after_row->>'id',before_row->>'id','unknown'), 'committed',
    jsonb_build_object('changed_fields',keys_changed,'before',before_safe,'after',after_safe,'database_role',session_user,'transaction_id',txid_current()));
  RETURN NULL;
END;
$$;
-- Re-running the migration covers newly added business tables too. Telemetry
-- and audit tables are excluded to avoid recursion and disproportionate volume.
DO $$ DECLARE t record; BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname='public'
    AND tablename NOT IN ('system_audit_events','ai_user_activity','product_demand_telemetry') LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS business_audit_truncate ON public.%I', t.tablename);
    EXECUTE format('CREATE TRIGGER business_audit_truncate AFTER TRUNCATE ON public.%I FOR EACH STATEMENT EXECUTE FUNCTION capture_business_change()',t.tablename);
    EXECUTE format('DROP TRIGGER IF EXISTS business_audit_change ON public.%I', t.tablename);
    EXECUTE format('CREATE TRIGGER business_audit_change AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION capture_business_change()',t.tablename);
  END LOOP;
END $$;
