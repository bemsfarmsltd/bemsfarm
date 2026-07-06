-- ============================================================
-- BemsFarms Database Schema
-- Run this on Render after creating your PostgreSQL database
--
-- Option A: Paste into the PSQL terminal on Render dashboard
-- Option B: psql "YOUR_RENDER_EXTERNAL_URL" -f schema.sql
-- ============================================================


-- ── USERS ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id                    SERIAL PRIMARY KEY,
  name                  VARCHAR(255) NOT NULL,
  email                 VARCHAR(255) UNIQUE NOT NULL,
  password              VARCHAR(255),
  role                  VARCHAR(20) DEFAULT 'user',
  phone                 VARCHAR(20),
  email_verified        BOOLEAN DEFAULT false,
  verification_token    VARCHAR(100),
  reset_token           VARCHAR(100),
  reset_expires         TIMESTAMP,
  failed_login_attempts INT DEFAULT 0,
  locked_until          TIMESTAMP,
  refresh_token         TEXT,
  last_login            TIMESTAMP,
  created_at            TIMESTAMP DEFAULT NOW()
);


-- ── CATEGORIES ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS categories (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(255) NOT NULL,
  description TEXT
);


-- ── PRODUCTS ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
  id                  SERIAL PRIMARY KEY,
  name                VARCHAR(255) NOT NULL,
  price               DECIMAL(10, 2) NOT NULL,
  unit                VARCHAR(100),
  description         TEXT,
  is_featured         BOOLEAN DEFAULT false,
  image_url           TEXT,
  category_id         INT REFERENCES categories(id) ON DELETE SET NULL,
  stock               INT DEFAULT 100,
  low_stock_threshold INT DEFAULT 10,
  created_at          TIMESTAMP DEFAULT NOW()
);


-- ── ORDERS ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id              VARCHAR(30) PRIMARY KEY,
  user_id         INT REFERENCES users(id) ON DELETE SET NULL,
  total           DECIMAL(10, 2) NOT NULL,
  status          VARCHAR(50) DEFAULT 'pending',
  payment_method  VARCHAR(50),
  payment_ref     VARCHAR(100),
  address         TEXT,
  tracking_status VARCHAR(50) DEFAULT 'order_placed',
  tracking_notes  TEXT,
  cancel_reason   TEXT,
  cancelled_at    TIMESTAMP,
  created_at      TIMESTAMP DEFAULT NOW()
);


-- ── ORDER ITEMS ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS order_items (
  id          SERIAL PRIMARY KEY,
  order_id    VARCHAR(30) REFERENCES orders(id) ON DELETE CASCADE,
  product_id  INT REFERENCES products(id) ON DELETE SET NULL,
  quantity    INT NOT NULL,
  price       DECIMAL(10, 2) NOT NULL
);


-- ── EMAIL SUBSCRIPTIONS ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS email_subscriptions (
  id            SERIAL PRIMARY KEY,
  email         VARCHAR(255) UNIQUE NOT NULL,
  subscribed_at TIMESTAMP DEFAULT NOW(),
  discount_code VARCHAR(20) DEFAULT 'BEMS10',
  is_active     BOOLEAN DEFAULT true
);


-- ── RETURNS ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS returns (
  id          SERIAL PRIMARY KEY,
  order_id    VARCHAR(30),
  user_id     INT REFERENCES users(id) ON DELETE SET NULL,
  product_id  INT REFERENCES products(id) ON DELETE SET NULL,
  quantity    INT DEFAULT 1,
  reason      VARCHAR(50),
  description TEXT,
  status      VARCHAR(30) DEFAULT 'submitted',
  created_at  TIMESTAMP DEFAULT NOW()
);


-- ── SEED: CATEGORIES ─────────────────────────────────────────
-- Run this to pre-fill categories so products page works immediately
INSERT INTO categories (name) VALUES
  ('Grains & Cereals'),
  ('Vegetables'),
  ('Cooking Oils'),
  ('Legumes'),
  ('Tubers & Roots'),
  ('Spices & Seasonings'),
  ('Leafy Greens'),
  ('Fruits')
ON CONFLICT DO NOTHING;




-- ── MAKE YOURSELF ADMIN ───────────────────────────────────────
-- After you register on the live site, run this to give yourself admin access.
-- Replace the email with your actual email address.
--
-- UPDATE users SET role = 'admin' WHERE email = 'your@email.com';


-- ── VERIFY EVERYTHING WORKED ─────────────────────────────────
-- Run these SELECT statements to confirm tables and data exist:
--
-- SELECT * FROM categories;
-- SELECT * FROM products;
-- SELECT COUNT(*) FROM users;