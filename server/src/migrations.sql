-- ============================================================
-- BEMS FARMS — TARGETED MIGRATION (v3)
-- Based on actual Supabase table snapshot — 2026-07-01
--
-- Safe to run multiple times (IF NOT EXISTS everywhere).
-- Paste entire file into Supabase SQL Editor → Run.
-- ============================================================


-- ══════════════════════════════════════════════════════════════
-- 0. ALTER EXISTING TABLES — add only the columns that are missing
-- ══════════════════════════════════════════════════════════════

-- users
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS status     VARCHAR(20) DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS store_id   INTEGER,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS google_id  TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- orders
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS customer_id     INTEGER,
  ADD COLUMN IF NOT EXISTS customer_name   VARCHAR(255),
  ADD COLUMN IF NOT EXISTS customer_phone  VARCHAR(20),
  ADD COLUMN IF NOT EXISTS driver_id       INTEGER,
  ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS delivery_fee    DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS delivery_city   VARCHAR(100),
  ADD COLUMN IF NOT EXISTS notes           TEXT,
  ADD COLUMN IF NOT EXISTS updated_at      TIMESTAMP DEFAULT NOW();

-- order_items
ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS product_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS unit         VARCHAR(50);

-- products
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS sku                VARCHAR(100),
  ADD COLUMN IF NOT EXISTS unit_price         DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS cost_price         DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS margin_pct         DECIMAL(5,2),
  ADD COLUMN IF NOT EXISTS tax_rate           DECIMAL(5,2)  DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stock_quantity     INTEGER        DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reorder_level      INTEGER        DEFAULT 10,
  ADD COLUMN IF NOT EXISTS available_for_sale BOOLEAN       DEFAULT true,
  ADD COLUMN IF NOT EXISTS status             VARCHAR(20)   DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS warehouse_id       INTEGER,
  ADD COLUMN IF NOT EXISTS barcode            VARCHAR(100),
  ADD COLUMN IF NOT EXISTS weight             DECIMAL(8,3),
  ADD COLUMN IF NOT EXISTS weight_unit        VARCHAR(10)   DEFAULT 'kg',
  ADD COLUMN IF NOT EXISTS image_url          TEXT,
  ADD COLUMN IF NOT EXISTS updated_at         TIMESTAMP     DEFAULT NOW();

-- bank_accounts — missing: is_primary, notes, updated_at
ALTER TABLE bank_accounts
  ADD COLUMN IF NOT EXISTS is_primary  BOOLEAN   DEFAULT false,
  ADD COLUMN IF NOT EXISTS notes       TEXT,
  ADD COLUMN IF NOT EXISTS updated_at  TIMESTAMP DEFAULT NOW();

-- income — table uses source_type; add source + missing columns
ALTER TABLE income
  ADD COLUMN IF NOT EXISTS source    VARCHAR(100),
  ADD COLUMN IF NOT EXISTS category  VARCHAR(100),
  ADD COLUMN IF NOT EXISTS currency  VARCHAR(10) DEFAULT 'NGN';
-- Backfill source from source_type for existing rows
UPDATE income SET source = source_type WHERE source IS NULL AND source_type IS NOT NULL;

-- expenses — missing: supplier_name, currency, due_date, paid_by, updated_at
ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS supplier_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS currency      VARCHAR(10) DEFAULT 'NGN',
  ADD COLUMN IF NOT EXISTS due_date      DATE,
  ADD COLUMN IF NOT EXISTS paid_by       INTEGER,
  ADD COLUMN IF NOT EXISTS updated_at    TIMESTAMP DEFAULT NOW();

-- money_transfers — add any columns the routes expect that may be missing
ALTER TABLE money_transfers
  ADD COLUMN IF NOT EXISTS reference       VARCHAR(50),
  ADD COLUMN IF NOT EXISTS from_account_id INTEGER,
  ADD COLUMN IF NOT EXISTS to_account_id   INTEGER,
  ADD COLUMN IF NOT EXISTS fee             DECIMAL(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS description     TEXT,
  ADD COLUMN IF NOT EXISTS status          VARCHAR(20)   DEFAULT 'completed',
  ADD COLUMN IF NOT EXISTS date            DATE DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS created_by      INTEGER,
  ADD COLUMN IF NOT EXISTS created_at      TIMESTAMP DEFAULT NOW();

-- driver_commissions — add missing columns
ALTER TABLE driver_commissions
  ADD COLUMN IF NOT EXISTS period_from DATE,
  ADD COLUMN IF NOT EXISTS period_to   DATE,
  ADD COLUMN IF NOT EXISTS deliveries  INTEGER        DEFAULT 0,
  ADD COLUMN IF NOT EXISTS base_amount DECIMAL(12,2)  DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bonus       DECIMAL(12,2)  DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deductions  DECIMAL(12,2)  DEFAULT 0,
  ADD COLUMN IF NOT EXISTS net_payout  DECIMAL(12,2)  DEFAULT 0,
  ADD COLUMN IF NOT EXISTS status      VARCHAR(20)    DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS paid_at     TIMESTAMP,
  ADD COLUMN IF NOT EXISTS payment_ref VARCHAR(100),
  ADD COLUMN IF NOT EXISTS created_by  INTEGER,
  ADD COLUMN IF NOT EXISTS created_at  TIMESTAMP DEFAULT NOW();

-- drivers — missing: license_number, notes, updated_at
ALTER TABLE drivers
  ADD COLUMN IF NOT EXISTS license_number VARCHAR(50),
  ADD COLUMN IF NOT EXISTS notes          TEXT,
  ADD COLUMN IF NOT EXISTS updated_at     TIMESTAMP DEFAULT NOW();

-- deliveries — add any missing columns
ALTER TABLE deliveries
  ADD COLUMN IF NOT EXISTS delivery_ref    VARCHAR(50),
  ADD COLUMN IF NOT EXISTS order_id        VARCHAR(30),
  ADD COLUMN IF NOT EXISTS driver_id       INTEGER,
  ADD COLUMN IF NOT EXISTS zone_id         INTEGER,
  ADD COLUMN IF NOT EXISTS status          VARCHAR(30) DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS delivery_address TEXT,
  ADD COLUMN IF NOT EXISTS attempts        INTEGER     DEFAULT 0,
  ADD COLUMN IF NOT EXISTS eta_minutes     INTEGER,
  ADD COLUMN IF NOT EXISTS assigned_at     TIMESTAMP,
  ADD COLUMN IF NOT EXISTS dispatched_at   TIMESTAMP,
  ADD COLUMN IF NOT EXISTS delivered_at    TIMESTAMP,
  ADD COLUMN IF NOT EXISTS created_at      TIMESTAMP DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at      TIMESTAMP DEFAULT NOW();

-- delivery_assignments — add missing columns
ALTER TABLE delivery_assignments
  ADD COLUMN IF NOT EXISTS delivery_id     INTEGER,
  ADD COLUMN IF NOT EXISTS driver_id       INTEGER,
  ADD COLUMN IF NOT EXISTS assignment_type VARCHAR(20) DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS assigned_by     INTEGER,
  ADD COLUMN IF NOT EXISTS override_note   TEXT,
  ADD COLUMN IF NOT EXISTS driver_response VARCHAR(20),
  ADD COLUMN IF NOT EXISTS created_at      TIMESTAMP DEFAULT NOW();

-- batch_management — missing: manufactured_date, supplier_id, notes, created_at
ALTER TABLE batch_management
  ADD COLUMN IF NOT EXISTS manufactured_date DATE,
  ADD COLUMN IF NOT EXISTS supplier_id       INTEGER,
  ADD COLUMN IF NOT EXISTS notes             TEXT,
  ADD COLUMN IF NOT EXISTS created_at        TIMESTAMP DEFAULT NOW();

-- lost_items — add missing columns
ALTER TABLE lost_items
  ADD COLUMN IF NOT EXISTS reason          VARCHAR(100),
  ADD COLUMN IF NOT EXISTS estimated_value DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS notes           TEXT,
  ADD COLUMN IF NOT EXISTS reported_by     INTEGER,
  ADD COLUMN IF NOT EXISTS approved_by     INTEGER,
  ADD COLUMN IF NOT EXISTS status          VARCHAR(20) DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS created_at      TIMESTAMP DEFAULT NOW();

-- staff — add missing columns
ALTER TABLE staff
  ADD COLUMN IF NOT EXISTS user_id           INTEGER,
  ADD COLUMN IF NOT EXISTS employee_code     VARCHAR(20),
  ADD COLUMN IF NOT EXISTS department        VARCHAR(100),
  ADD COLUMN IF NOT EXISTS role              VARCHAR(100),
  ADD COLUMN IF NOT EXISTS shift             VARCHAR(20) DEFAULT 'morning',
  ADD COLUMN IF NOT EXISTS basic_salary      DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS hire_date         DATE,
  ADD COLUMN IF NOT EXISTS bank_name         VARCHAR(100),
  ADD COLUMN IF NOT EXISTS account_number    VARCHAR(30),
  ADD COLUMN IF NOT EXISTS account_name      VARCHAR(255),
  ADD COLUMN IF NOT EXISTS emergency_contact VARCHAR(100),
  ADD COLUMN IF NOT EXISTS emergency_phone   VARCHAR(20),
  ADD COLUMN IF NOT EXISTS address           TEXT,
  ADD COLUMN IF NOT EXISTS notes             TEXT,
  ADD COLUMN IF NOT EXISTS status            VARCHAR(20) DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS created_at        TIMESTAMP DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at        TIMESTAMP DEFAULT NOW();

-- staff_attendance — add missing columns
ALTER TABLE staff_attendance
  ADD COLUMN IF NOT EXISTS staff_id   INTEGER,
  ADD COLUMN IF NOT EXISTS date       DATE,
  ADD COLUMN IF NOT EXISTS clock_in   TIMESTAMP,
  ADD COLUMN IF NOT EXISTS clock_out  TIMESTAMP,
  ADD COLUMN IF NOT EXISTS status     VARCHAR(20) DEFAULT 'present',
  ADD COLUMN IF NOT EXISTS notes      TEXT,
  ADD COLUMN IF NOT EXISTS created_by INTEGER,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();

-- staff_holidays — add missing columns
ALTER TABLE staff_holidays
  ADD COLUMN IF NOT EXISTS staff_id    INTEGER,
  ADD COLUMN IF NOT EXISTS type        VARCHAR(30) DEFAULT 'annual',
  ADD COLUMN IF NOT EXISTS start_date  DATE,
  ADD COLUMN IF NOT EXISTS end_date    DATE,
  ADD COLUMN IF NOT EXISTS days        INTEGER,
  ADD COLUMN IF NOT EXISTS reason      TEXT,
  ADD COLUMN IF NOT EXISTS status      VARCHAR(20) DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS approved_by INTEGER,
  ADD COLUMN IF NOT EXISTS notes       TEXT,
  ADD COLUMN IF NOT EXISTS created_at  TIMESTAMP DEFAULT NOW();

-- customers — add missing columns
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS loyalty_points  INTEGER       DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_orders    INTEGER       DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_spend     DECIMAL(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS notes           TEXT,
  ADD COLUMN IF NOT EXISTS updated_at      TIMESTAMP DEFAULT NOW();


-- ══════════════════════════════════════════════════════════════
-- 1. WAREHOUSES  (does NOT exist in Supabase)
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS warehouses (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(255) NOT NULL,
  code       VARCHAR(20),
  location   TEXT,
  manager    VARCHAR(255),
  capacity   INTEGER,
  status     VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP   DEFAULT NOW(),
  updated_at TIMESTAMP   DEFAULT NOW()
);
-- Guard: table may already exist with fewer columns
ALTER TABLE warehouses
  ADD COLUMN IF NOT EXISTS code       VARCHAR(20),
  ADD COLUMN IF NOT EXISTS location   TEXT,
  ADD COLUMN IF NOT EXISTS manager    VARCHAR(255),
  ADD COLUMN IF NOT EXISTS capacity   INTEGER,
  ADD COLUMN IF NOT EXISTS status     VARCHAR(20) DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP   DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP   DEFAULT NOW();

INSERT INTO warehouses (name, code, location, status)
  SELECT 'Main Store','MAIN','14 Farm Road, Epe, Lagos','active'
  WHERE NOT EXISTS (SELECT 1 FROM warehouses WHERE code='MAIN');

INSERT INTO warehouses (name, code, location, status)
  SELECT 'Cold Store','COLD','14 Farm Road, Epe, Lagos','active'
  WHERE NOT EXISTS (SELECT 1 FROM warehouses WHERE code='COLD');


-- ══════════════════════════════════════════════════════════════
-- 2. STOCK MOVEMENTS  (does NOT exist in Supabase)
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS stock_movements (
  id           SERIAL PRIMARY KEY,
  product_id   INTEGER,
  warehouse_id INTEGER,
  type         VARCHAR(30) NOT NULL,
  quantity     INTEGER NOT NULL,
  before_qty   INTEGER,
  after_qty    INTEGER,
  reference    VARCHAR(100),
  reason       VARCHAR(255),
  notes        TEXT,
  unit_cost    DECIMAL(10,2),
  created_by   INTEGER,
  created_at   TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_created ON stock_movements(created_at DESC);


-- ══════════════════════════════════════════════════════════════
-- 3. TRANSACTIONS  (does NOT exist in Supabase)
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS transactions (
  id              SERIAL PRIMARY KEY,
  reference       VARCHAR(50) UNIQUE,
  type            VARCHAR(20) NOT NULL,
  source_type     VARCHAR(30),
  source_id       INTEGER,
  bank_account_id INTEGER,
  amount          DECIMAL(12,2) NOT NULL,
  balance_after   DECIMAL(12,2),
  description     TEXT,
  payment_method  VARCHAR(50),
  date            DATE NOT NULL DEFAULT CURRENT_DATE,
  status          VARCHAR(20) DEFAULT 'completed',
  created_by      INTEGER,
  created_at      TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_transactions_date    ON transactions(date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_account ON transactions(bank_account_id);


-- ══════════════════════════════════════════════════════════════
-- 4. SUPPLIERS  (does NOT exist in Supabase)
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS suppliers (
  id              SERIAL PRIMARY KEY,
  supplier_code   VARCHAR(20) UNIQUE,
  name            VARCHAR(255) NOT NULL,
  contact_person  VARCHAR(255),
  phone           VARCHAR(20),
  email           VARCHAR(255),
  address         TEXT,
  category        VARCHAR(100)  DEFAULT 'produce',
  payment_terms   INTEGER       DEFAULT 30,
  bank_name       VARCHAR(100),
  account_number  VARCHAR(30),
  account_name    VARCHAR(255),
  tax_id          VARCHAR(50),
  balance         DECIMAL(12,2) DEFAULT 0,
  total_purchases DECIMAL(12,2) DEFAULT 0,
  total_paid      DECIMAL(12,2) DEFAULT 0,
  notes           TEXT,
  status          VARCHAR(20)   DEFAULT 'active',
  created_at      TIMESTAMP     DEFAULT NOW(),
  updated_at      TIMESTAMP     DEFAULT NOW()
);


-- ══════════════════════════════════════════════════════════════
-- 5. SUPPLIER PAYMENTS  (does NOT exist in Supabase)
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS supplier_payments (
  id                SERIAL PRIMARY KEY,
  reference         VARCHAR(50) UNIQUE,
  supplier_id       INTEGER,
  purchase_order_id INTEGER,
  amount            DECIMAL(12,2) NOT NULL,
  payment_method    VARCHAR(50),
  bank_account_id   INTEGER,
  payment_date      DATE NOT NULL DEFAULT CURRENT_DATE,
  notes             TEXT,
  created_by        INTEGER,
  created_at        TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_supplier_payments_supplier ON supplier_payments(supplier_id);


-- ══════════════════════════════════════════════════════════════
-- 6. PURCHASE ORDERS  (does NOT exist in Supabase)
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS purchase_orders (
  id               SERIAL PRIMARY KEY,
  reference        VARCHAR(50) UNIQUE,
  supplier_id      INTEGER,
  status           VARCHAR(30)   DEFAULT 'draft',
  subtotal         DECIMAL(12,2) DEFAULT 0,
  tax_amount       DECIMAL(12,2) DEFAULT 0,
  discount         DECIMAL(12,2) DEFAULT 0,
  total            DECIMAL(12,2) NOT NULL,
  paid_amount      DECIMAL(12,2) DEFAULT 0,
  payment_status   VARCHAR(20)   DEFAULT 'unpaid',
  expected_date    DATE,
  received_date    DATE,
  delivery_address TEXT,
  notes            TEXT,
  created_by       INTEGER,
  approved_by      INTEGER,
  created_at       TIMESTAMP DEFAULT NOW(),
  updated_at       TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_po_supplier ON purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_po_status   ON purchase_orders(status);

CREATE TABLE IF NOT EXISTS purchase_order_items (
  id                SERIAL PRIMARY KEY,
  purchase_order_id INTEGER,
  product_id        INTEGER,
  product_name      VARCHAR(255),
  quantity_ordered  INTEGER NOT NULL,
  quantity_received INTEGER       DEFAULT 0,
  unit_cost         DECIMAL(10,2) NOT NULL,
  subtotal          DECIMAL(12,2),
  notes             TEXT
);

CREATE TABLE IF NOT EXISTS purchase_returns (
  id                SERIAL PRIMARY KEY,
  reference         VARCHAR(50) UNIQUE,
  purchase_order_id INTEGER,
  supplier_id       INTEGER,
  reason            TEXT,
  total_value       DECIMAL(12,2) DEFAULT 0,
  status            VARCHAR(20)   DEFAULT 'pending',
  created_by        INTEGER,
  approved_by       INTEGER,
  created_at        TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS purchase_return_items (
  id                 SERIAL PRIMARY KEY,
  purchase_return_id INTEGER,
  product_id         INTEGER,
  product_name       VARCHAR(255),
  quantity           INTEGER NOT NULL,
  unit_cost          DECIMAL(10,2),
  subtotal           DECIMAL(12,2)
);


-- ══════════════════════════════════════════════════════════════
-- 7. STAFF ROLES  (does NOT exist in Supabase)
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS staff_roles (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  permissions JSONB       DEFAULT '[]',
  is_system   BOOLEAN     DEFAULT false,
  created_at  TIMESTAMP   DEFAULT NOW(),
  updated_at  TIMESTAMP   DEFAULT NOW()
);
INSERT INTO staff_roles (name, description, is_system, permissions) VALUES
  ('superadmin',       'Full system access',          true, '["*"]'),
  ('manager',          'Store manager',                true, '["orders","products","customers","inventory","staff","reports","accounts"]'),
  ('cashier',          'POS cashier',                  true, '["pos","orders.view","customers.view"]'),
  ('storekeeper',      'Inventory keeper',             true, '["inventory","products.view","suppliers.view"]'),
  ('delivery_manager', 'Delivery operations manager',  true, '["deliveries","orders.view","drivers"]')
ON CONFLICT (name) DO NOTHING;


-- ══════════════════════════════════════════════════════════════
-- 8. STAFF PAYROLL  (does NOT exist; `payroll` exists but is different)
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS staff_payroll (
  id           SERIAL PRIMARY KEY,
  staff_id     INTEGER NOT NULL,
  month        INTEGER NOT NULL,
  year         INTEGER NOT NULL,
  basic_salary DECIMAL(12,2),
  bonuses      DECIMAL(12,2) DEFAULT 0,
  deductions   DECIMAL(12,2) DEFAULT 0,
  tax          DECIMAL(12,2) DEFAULT 0,
  net_pay      DECIMAL(12,2),
  days_worked  INTEGER       DEFAULT 0,
  days_absent  INTEGER       DEFAULT 0,
  status       VARCHAR(20)   DEFAULT 'draft',
  payment_date DATE,
  payment_ref  VARCHAR(100),
  created_by   INTEGER,
  created_at   TIMESTAMP DEFAULT NOW(),
  UNIQUE (staff_id, month, year)
);


-- ══════════════════════════════════════════════════════════════
-- 9. STAFF SCHEDULE  (does NOT exist; `staff_schedules` is different)
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS staff_schedule (
  id          SERIAL PRIMARY KEY,
  staff_id    INTEGER NOT NULL,
  date        DATE NOT NULL,
  shift_start TIME,
  shift_end   TIME,
  shift_type  VARCHAR(20) DEFAULT 'morning',
  notes       TEXT,
  created_by  INTEGER,
  created_at  TIMESTAMP DEFAULT NOW(),
  UNIQUE (staff_id, date)
);


-- ══════════════════════════════════════════════════════════════
-- 10. ZONE DRIVERS  (does NOT exist in Supabase)
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS zone_drivers (
  zone_id   INTEGER NOT NULL,
  driver_id INTEGER NOT NULL,
  PRIMARY KEY (zone_id, driver_id)
);


-- ══════════════════════════════════════════════════════════════
-- 11. DRIVER FEEDBACK  (does NOT exist in Supabase)
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS driver_feedback (
  id          SERIAL PRIMARY KEY,
  driver_id   INTEGER,
  delivery_id INTEGER,
  rating      INTEGER CHECK (rating BETWEEN 1 AND 5),
  comment     TEXT,
  created_at  TIMESTAMP DEFAULT NOW()
);


-- ══════════════════════════════════════════════════════════════
-- 12. AI CONTEXT & MEMORY  (none of these exist in Supabase)
--     NOTE: ai_conversations is n8n-owned — admin table renamed
--           to admin_ai_conversations to avoid conflict.
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS ai_user_context (
  id                 SERIAL PRIMARY KEY,
  user_id            INTEGER UNIQUE,
  full_name          VARCHAR(255),
  email              VARCHAR(255),
  phone              VARCHAR(20),
  role               VARCHAR(30),
  registered_at      TIMESTAMP,
  last_login         TIMESTAMP,
  last_activity      TIMESTAMP   DEFAULT NOW(),
  preferred_language VARCHAR(10) DEFAULT 'en',
  preferred_currency VARCHAR(10) DEFAULT 'NGN',
  preferred_theme    VARCHAR(10) DEFAULT 'light',
  timezone           VARCHAR(50) DEFAULT 'Africa/Lagos',
  context_version    INTEGER     DEFAULT 1,
  raw_context        JSONB       DEFAULT '{}',
  updated_at         TIMESTAMP   DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_onboarding_data (
  id                  SERIAL PRIMARY KEY,
  user_id             INTEGER UNIQUE,
  business_name       VARCHAR(255),
  business_type       VARCHAR(100),
  industry            VARCHAR(100),
  business_size       VARCHAR(50),
  store_name          VARCHAR(255),
  country             VARCHAR(100) DEFAULT 'Nigeria',
  state               VARCHAR(100),
  city                VARCHAR(100),
  goals               JSONB        DEFAULT '[]',
  completed_steps     JSONB        DEFAULT '[]',
  onboarding_complete BOOLEAN      DEFAULT false,
  created_at          TIMESTAMP    DEFAULT NOW(),
  updated_at          TIMESTAMP    DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_user_activity (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER,
  type        VARCHAR(60) NOT NULL,
  entity_type VARCHAR(50),
  entity_id   VARCHAR(60),
  metadata    JSONB       DEFAULT '{}',
  ip_address  VARCHAR(45),
  created_at  TIMESTAMP   DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ai_activity_user ON ai_user_activity(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_activity_type ON ai_user_activity(type, created_at DESC);

CREATE TABLE IF NOT EXISTS admin_ai_conversations (
  id              SERIAL PRIMARY KEY,
  user_id         INTEGER,
  session_id      VARCHAR(100),
  bot_type        VARCHAR(30) DEFAULT 'general',
  title           VARCHAR(255),
  summary         TEXT,
  topics          JSONB    DEFAULT '[]',
  message_count   INTEGER  DEFAULT 0,
  last_message_at TIMESTAMP,
  archived        BOOLEAN  DEFAULT false,
  created_at      TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_admin_ai_conv_user ON admin_ai_conversations(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS ai_conversation_messages (
  id              SERIAL PRIMARY KEY,
  conversation_id INTEGER,
  role            VARCHAR(10) NOT NULL,
  content         TEXT NOT NULL,
  source          VARCHAR(30),
  created_at      TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ai_messages_conv ON ai_conversation_messages(conversation_id, created_at);


-- ══════════════════════════════════════════════════════════════
-- 13. ALTER stores (exists — add columns used by stores_admin.js)
-- ══════════════════════════════════════════════════════════════

ALTER TABLE stores
  ADD COLUMN IF NOT EXISTS city          VARCHAR(100),
  ADD COLUMN IF NOT EXISTS state         VARCHAR(100),
  ADD COLUMN IF NOT EXISTS country       VARCHAR(100) DEFAULT 'Nigeria',
  ADD COLUMN IF NOT EXISTS phone         VARCHAR(20),
  ADD COLUMN IF NOT EXISTS email         VARCHAR(255),
  ADD COLUMN IF NOT EXISTS manager_id    INTEGER,
  ADD COLUMN IF NOT EXISTS opening_hours TEXT,
  ADD COLUMN IF NOT EXISTS notes         TEXT,
  ADD COLUMN IF NOT EXISTS status        VARCHAR(20) DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS created_at    TIMESTAMP   DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at    TIMESTAMP   DEFAULT NOW();

-- customer_carts — add columns used by cart.js
ALTER TABLE customer_carts
  ADD COLUMN IF NOT EXISTS session_id  VARCHAR(100),
  ADD COLUMN IF NOT EXISTS source      VARCHAR(30)   DEFAULT 'web',
  ADD COLUMN IF NOT EXISTS total       DECIMAL(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS item_count  INTEGER       DEFAULT 0,
  ADD COLUMN IF NOT EXISTS status      VARCHAR(20)   DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS created_at  TIMESTAMP     DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at  TIMESTAMP     DEFAULT NOW();

-- customer_cart_items — add columns used by cart.js
ALTER TABLE customer_cart_items
  ADD COLUMN IF NOT EXISTS product_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS unit_price   DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS subtotal     DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS notes        TEXT,
  ADD COLUMN IF NOT EXISTS source       VARCHAR(30)  DEFAULT 'web',
  ADD COLUMN IF NOT EXISTS created_at   TIMESTAMP    DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at   TIMESTAMP    DEFAULT NOW();


-- ══════════════════════════════════════════════════════════════
-- 14. SEED: promote yourself to superadmin
-- Replace the email, uncomment, then run.
-- ══════════════════════════════════════════════════════════════

-- UPDATE users SET role = 'superadmin', status = 'active'
-- WHERE email = 'your@email.com';


-- ══════════════════════════════════════════════════════════════
-- 14. SETTINGS  (key-value store for admin configuration)
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS settings (
  id         SERIAL PRIMARY KEY,
  key        VARCHAR(100) UNIQUE NOT NULL,
  value      TEXT,
  group_name VARCHAR(50) DEFAULT 'general',
  updated_by INTEGER,
  updated_at TIMESTAMP DEFAULT NOW()
);
INSERT INTO settings (key, value, group_name) VALUES
  ('store_name',          'Bems Farms',                   'general'),
  ('store_email',         'info@bemsfarms.com',            'general'),
  ('store_phone',         '',                             'general'),
  ('store_address',       '',                             'general'),
  ('store_currency',      'NGN',                          'general'),
  ('store_timezone',      'Africa/Lagos',                  'general'),
  ('store_logo_url',      '',                             'general'),
  ('tax_enabled',         'false',                        'tax'),
  ('tax_rate',            '7.5',                          'tax'),
  ('tax_label',           'VAT',                          'tax'),
  ('tax_inclusive',       'false',                        'tax'),
  ('invoice_prefix',      'INV',                          'invoices'),
  ('invoice_next_number', '1000',                         'invoices'),
  ('invoice_footer',      'Thank you for your business!', 'invoices'),
  ('pos_receipt_header',  'Bems Farms',                   'pos'),
  ('pos_receipt_footer',  'Thank you!',                   'pos'),
  ('pos_print_receipt',   'true',                         'pos'),
  ('notif_email_enabled', 'true',                         'notifications'),
  ('notif_sms_enabled',   'false',                        'notifications'),
  ('notif_order_email',   'true',                         'notifications'),
  ('notif_low_stock',     'true',                         'notifications')
ON CONFLICT (key) DO NOTHING;


-- ══════════════════════════════════════════════════════════════
-- 15. COUPONS  (add missing columns — tables already exist)
-- ══════════════════════════════════════════════════════════════

ALTER TABLE coupons
  ADD COLUMN IF NOT EXISTS code            VARCHAR(50),
  ADD COLUMN IF NOT EXISTS description     TEXT,
  ADD COLUMN IF NOT EXISTS type            VARCHAR(20) DEFAULT 'percentage',
  ADD COLUMN IF NOT EXISTS value           DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS min_order       DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_discount    DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS usage_limit     INTEGER,
  ADD COLUMN IF NOT EXISTS used_count      INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS per_user_limit  INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS applicable_to   VARCHAR(30) DEFAULT 'all',
  ADD COLUMN IF NOT EXISTS start_date      DATE,
  ADD COLUMN IF NOT EXISTS end_date        DATE,
  ADD COLUMN IF NOT EXISTS is_active       BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS created_by      INTEGER,
  ADD COLUMN IF NOT EXISTS created_at      TIMESTAMP DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at      TIMESTAMP DEFAULT NOW();

ALTER TABLE coupon_usages
  ADD COLUMN IF NOT EXISTS coupon_id       INTEGER,
  ADD COLUMN IF NOT EXISTS customer_id     INTEGER,
  ADD COLUMN IF NOT EXISTS order_id        VARCHAR(30),
  ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS used_at         TIMESTAMP DEFAULT NOW();


-- ══════════════════════════════════════════════════════════════
-- 16. POS SESSIONS  (add missing columns)
-- ══════════════════════════════════════════════════════════════

ALTER TABLE pos_sessions
  ADD COLUMN IF NOT EXISTS cashier_id     INTEGER,
  ADD COLUMN IF NOT EXISTS store_id       INTEGER,
  ADD COLUMN IF NOT EXISTS terminal_id    VARCHAR(50),
  ADD COLUMN IF NOT EXISTS status         VARCHAR(20) DEFAULT 'open',
  ADD COLUMN IF NOT EXISTS opening_cash   DECIMAL(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS closing_cash   DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS expected_cash  DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS cash_variance  DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS total_sales    DECIMAL(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_orders   INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cash_sales     DECIMAL(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS card_sales     DECIMAL(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS transfer_sales DECIMAL(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS notes          TEXT,
  ADD COLUMN IF NOT EXISTS opened_at      TIMESTAMP DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS closed_at      TIMESTAMP,
  ADD COLUMN IF NOT EXISTS created_at     TIMESTAMP DEFAULT NOW();

ALTER TABLE pos_held_orders
  ADD COLUMN IF NOT EXISTS cashier_id  INTEGER,
  ADD COLUMN IF NOT EXISTS session_id  INTEGER,
  ADD COLUMN IF NOT EXISTS label       VARCHAR(100),
  ADD COLUMN IF NOT EXISTS items       JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS status      VARCHAR(20) DEFAULT 'held',
  ADD COLUMN IF NOT EXISTS created_at  TIMESTAMP DEFAULT NOW();

-- orders: add pos_session_id for linking
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS pos_session_id INTEGER,
  ADD COLUMN IF NOT EXISTS source         VARCHAR(30) DEFAULT 'online',
  ADD COLUMN IF NOT EXISTS subtotal       DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS tax_amount     DECIMAL(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50),
  ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS created_by     INTEGER;

-- payment_gateways: add missing columns
ALTER TABLE payment_gateways
  ADD COLUMN IF NOT EXISTS name        VARCHAR(100),
  ADD COLUMN IF NOT EXISTS slug        VARCHAR(50),
  ADD COLUMN IF NOT EXISTS public_key  TEXT,
  ADD COLUMN IF NOT EXISTS secret_key  TEXT,
  ADD COLUMN IF NOT EXISTS webhook_url TEXT,
  ADD COLUMN IF NOT EXISTS is_live     BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_enabled  BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS created_at  TIMESTAMP DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at  TIMESTAMP DEFAULT NOW();

DO $$ BEGIN
  ALTER TABLE payment_gateways ADD CONSTRAINT payment_gateways_slug_key UNIQUE (slug);
EXCEPTION WHEN duplicate_table OR duplicate_object THEN NULL;
END $$;

-- currencies: add missing columns
ALTER TABLE currencies
  ADD COLUMN IF NOT EXISTS code          VARCHAR(10),
  ADD COLUMN IF NOT EXISTS name          VARCHAR(100),
  ADD COLUMN IF NOT EXISTS symbol        VARCHAR(10),
  ADD COLUMN IF NOT EXISTS exchange_rate DECIMAL(12,6) DEFAULT 1,
  ADD COLUMN IF NOT EXISTS is_default    BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_enabled    BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS created_at    TIMESTAMP DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at    TIMESTAMP DEFAULT NOW();

INSERT INTO currencies (code, name, symbol, exchange_rate, is_default, is_enabled)
  SELECT 'NGN','Nigerian Naira','₦',1,true,true
  WHERE NOT EXISTS (SELECT 1 FROM currencies WHERE code='NGN');

-- ── 18. CATEGORIES & ORDERS REFRACTOR ─────────────────────────
ALTER TABLE categories ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'Web App';

UPDATE orders SET source = 'Web App' WHERE source = 'online' OR source IS NULL;
UPDATE orders SET source = 'Physical Store (POS)' WHERE source = 'pos';

DELETE FROM products WHERE name IN (
  'Ofada Rice', 'Palm Oil', 'Black-eyed Beans', 'Garri (Ijebu)', 
  'Fresh Tomatoes', 'Ugu Leaves', 'Groundnut Oil', 'Dried Crayfish', 
  'White Yam', 'Fresh Pepper (Tatashe)'
);

-- ══════════════════════════════════════════════════════════════
-- 17. VERIFY
-- ══════════════════════════════════════════════════════════════

-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public' ORDER BY table_name;

-- Fix customer_carts constraints: Drop not null on customer_id, point FK to users table instead of customers
ALTER TABLE customer_carts DROP CONSTRAINT IF EXISTS customer_carts_customer_id_fkey;
ALTER TABLE customer_carts ALTER COLUMN customer_id DROP NOT NULL;
ALTER TABLE customer_carts ADD CONSTRAINT customer_carts_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE CASCADE;
