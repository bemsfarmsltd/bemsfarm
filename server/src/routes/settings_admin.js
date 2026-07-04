// server/src/routes/settings_admin.js
// Mounted at /api/admin/settings in index.js
//
// Covers all 9 settings pages in the admin frontend:
//   General, Notifications, Payment, Coupons, POS, Tax, Currencies,
//   Invoices, Manager (user management)
//
// Uses a key-value `settings` table for config, plus the existing
// `payment_gateways` and `currencies` tables.
// ───────────────────────────────────────────────────────────────────────────
//
// SQL MIGRATION — run once in Supabase:
//
// CREATE TABLE IF NOT EXISTS settings (
//   id         SERIAL PRIMARY KEY,
//   key        VARCHAR(100) UNIQUE NOT NULL,
//   value      TEXT,
//   group_name VARCHAR(50) DEFAULT 'general',
//   updated_by INTEGER,
//   updated_at TIMESTAMP DEFAULT NOW()
// );
// INSERT INTO settings (key, value, group_name) VALUES
//   ('store_name',          'Bems Farms',              'general'),
//   ('store_email',         'info@bemsfarms.com',       'general'),
//   ('store_phone',         '',                        'general'),
//   ('store_address',       '',                        'general'),
//   ('store_currency',      'NGN',                     'general'),
//   ('store_timezone',      'Africa/Lagos',             'general'),
//   ('store_logo_url',      '',                        'general'),
//   ('tax_enabled',         'false',                   'tax'),
//   ('tax_rate',            '7.5',                     'tax'),
//   ('tax_label',           'VAT',                     'tax'),
//   ('tax_inclusive',       'false',                   'tax'),
//   ('invoice_prefix',      'INV',                     'invoices'),
//   ('invoice_next_number', '1000',                    'invoices'),
//   ('invoice_footer',      'Thank you for your business!', 'invoices'),
//   ('pos_receipt_header',  'Bems Farms',              'pos'),
//   ('pos_receipt_footer',  'Thank you!',              'pos'),
//   ('pos_print_receipt',   'true',                    'pos'),
//   ('notif_email_enabled', 'true',                    'notifications'),
//   ('notif_sms_enabled',   'false',                   'notifications'),
//   ('notif_order_email',   'true',                    'notifications'),
//   ('notif_low_stock',     'true',                    'notifications')
// ON CONFLICT (key) DO NOTHING;
//
// -- ALTER payment_gateways (add missing columns if needed)
// ALTER TABLE payment_gateways
//   ADD COLUMN IF NOT EXISTS name         VARCHAR(100),
//   ADD COLUMN IF NOT EXISTS slug         VARCHAR(50) UNIQUE,
//   ADD COLUMN IF NOT EXISTS public_key   TEXT,
//   ADD COLUMN IF NOT EXISTS secret_key   TEXT,
//   ADD COLUMN IF NOT EXISTS webhook_url  TEXT,
//   ADD COLUMN IF NOT EXISTS is_live      BOOLEAN DEFAULT false,
//   ADD COLUMN IF NOT EXISTS is_enabled   BOOLEAN DEFAULT false,
//   ADD COLUMN IF NOT EXISTS created_at   TIMESTAMP DEFAULT NOW(),
//   ADD COLUMN IF NOT EXISTS updated_at   TIMESTAMP DEFAULT NOW();
//
// ───────────────────────────────────────────────────────────────────────────

const express = require("express");
const router  = express.Router();
const pool    = require("../db/pool");
const { protect, requireRole } = require("../middleware/authMiddleware");

router.use(protect);

// ─── Helpers ────────────────────────────────────────────────────────────────

async function getGroup(group) {
  const result = await pool.query(
    "SELECT key, value FROM settings WHERE group_name=$1",
    [group]
  );
  const obj = {};
  result.rows.forEach((r) => { obj[r.key] = r.value; });
  return obj;
}

async function saveGroup(group, body, updatedBy) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const [key, value] of Object.entries(body)) {
      await client.query(
        `INSERT INTO settings (key, value, group_name, updated_by, updated_at)
         VALUES ($1,$2,$3,$4,NOW())
         ON CONFLICT (key) DO UPDATE SET value=$2, updated_by=$4, updated_at=NOW()`,
        [key, String(value ?? ""), group, updatedBy]
      );
    }
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

// ════════════════════════════════════════════════════════════════════════════
// GENERAL SETTINGS
// GET  /api/admin/settings/general
// POST /api/admin/settings/general
// ════════════════════════════════════════════════════════════════════════════
router.get("/general", async (req, res) => {
  try {
    res.json({ settings: await getGroup("general") });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/general", requireRole("superadmin", "manager"), async (req, res) => {
  try {
    await saveGroup("general", req.body, req.user.id);
    res.json({ settings: await getGroup("general") });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// NOTIFICATION SETTINGS
// ════════════════════════════════════════════════════════════════════════════
router.get("/notifications", async (req, res) => {
  try {
    res.json({ settings: await getGroup("notifications") });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/notifications", requireRole("superadmin", "manager"), async (req, res) => {
  try {
    await saveGroup("notifications", req.body, req.user.id);
    res.json({ settings: await getGroup("notifications") });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// PAYMENT SETTINGS  (uses `payment_gateways` table)
// GET  /api/admin/settings/payment
// POST /api/admin/settings/payment/:gateway
// ════════════════════════════════════════════════════════════════════════════
router.get("/payment", async (req, res) => {
  try {
    const gateways = await pool.query(
      "SELECT id, name, slug, is_live, is_enabled, webhook_url, updated_at FROM payment_gateways ORDER BY id"
    );
    // Strip secret keys from GET response — never expose to frontend
    res.json({ gateways: gateways.rows });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/payment/:slug", requireRole("superadmin"), async (req, res) => {
  try {
    const { slug } = req.params;
    const { public_key, secret_key, webhook_url, is_live, is_enabled, name } = req.body;

    const result = await pool.query(
      `INSERT INTO payment_gateways (slug, name, public_key, secret_key, webhook_url, is_live, is_enabled, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,NOW(),NOW())
       ON CONFLICT (slug) DO UPDATE SET
         name        = COALESCE($2, payment_gateways.name),
         public_key  = COALESCE($3, payment_gateways.public_key),
         secret_key  = COALESCE($4, payment_gateways.secret_key),
         webhook_url = COALESCE($5, payment_gateways.webhook_url),
         is_live     = COALESCE($6, payment_gateways.is_live),
         is_enabled  = COALESCE($7, payment_gateways.is_enabled),
         updated_at  = NOW()
       RETURNING id, name, slug, is_live, is_enabled, webhook_url, updated_at`,
      [slug, name || slug, public_key || null, secret_key || null, webhook_url || null,
       is_live ?? false, is_enabled ?? false]
    );
    res.json({ gateway: result.rows[0] });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// COUPON SETTINGS  →  redirects to coupons module
// Frontend hits /settings/coupons which shows coupon management.
// This just mirrors the list from /api/admin/coupons.
// ════════════════════════════════════════════════════════════════════════════
router.get("/coupons", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM coupons ORDER BY created_at DESC LIMIT 100`
    );
    res.json({ coupons: result.rows });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// TAX SETTINGS
// ════════════════════════════════════════════════════════════════════════════
router.get("/tax", async (req, res) => {
  try {
    res.json({ settings: await getGroup("tax") });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/tax", requireRole("superadmin", "manager"), async (req, res) => {
  try {
    await saveGroup("tax", req.body, req.user.id);
    res.json({ settings: await getGroup("tax") });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// CURRENCY SETTINGS  (uses `currencies` table)
// ════════════════════════════════════════════════════════════════════════════
router.get("/currencies", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM currencies ORDER BY code"
    );
    res.json({ currencies: result.rows });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/currencies", requireRole("superadmin"), async (req, res) => {
  try {
    const { code, name, symbol, exchange_rate, is_default, is_enabled } = req.body;
    if (!code || !name) return res.status(400).json({ message: "code and name required" });

    const result = await pool.query(
      `INSERT INTO currencies (code, name, symbol, exchange_rate, is_default, is_enabled, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,NOW(),NOW())
       ON CONFLICT (code) DO UPDATE SET
         name          = $2,
         symbol        = COALESCE($3, currencies.symbol),
         exchange_rate = COALESCE($4, currencies.exchange_rate),
         is_default    = COALESCE($5, currencies.is_default),
         is_enabled    = COALESCE($6, currencies.is_enabled),
         updated_at    = NOW()
       RETURNING *`,
      [code.toUpperCase(), name, symbol || null, exchange_rate || 1,
       is_default ?? false, is_enabled ?? true]
    );
    res.json({ currency: result.rows[0] });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// POS SETTINGS
// ════════════════════════════════════════════════════════════════════════════
router.get("/pos", async (req, res) => {
  try {
    res.json({ settings: await getGroup("pos") });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/pos", requireRole("superadmin", "manager"), async (req, res) => {
  try {
    await saveGroup("pos", req.body, req.user.id);
    res.json({ settings: await getGroup("pos") });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// INVOICE SETTINGS
// ════════════════════════════════════════════════════════════════════════════
router.get("/invoices", async (req, res) => {
  try {
    res.json({ settings: await getGroup("invoices") });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/invoices", requireRole("superadmin", "manager"), async (req, res) => {
  try {
    await saveGroup("invoices", req.body, req.user.id);
    res.json({ settings: await getGroup("invoices") });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// MANAGER SETTINGS  — admin user management
// GET  /api/admin/settings/manager        → list all admin users
// POST /api/admin/settings/manager        → create admin user
// PATCH /api/admin/settings/manager/:id   → update role / status
// DELETE /api/admin/settings/manager/:id  → deactivate
// ════════════════════════════════════════════════════════════════════════════
router.get("/manager", requireRole("superadmin", "manager"), async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const adminRoles = ["superadmin", "manager", "admin", "cashier", "storekeeper", "delivery_manager"];
    const result = await pool.query(
      `SELECT id, name, email, role, status, avatar_url, store_id, last_login, created_at
       FROM users
       WHERE role = ANY($1)
       ORDER BY role, name
       LIMIT $2 OFFSET $3`,
      [adminRoles, parseInt(limit), offset]
    );
    const count = await pool.query(
      "SELECT COUNT(*) FROM users WHERE role = ANY($1)", [adminRoles]
    );

    res.json({
      users:  result.rows,
      total:  parseInt(count.rows[0].count),
      page:   parseInt(page),
      pages:  Math.ceil(parseInt(count.rows[0].count) / parseInt(limit)),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/manager", requireRole("superadmin"), async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const bcrypt = require("bcryptjs");
    const { name, email, password, role, store_id } = req.body;

    if (!name || !email || !password || !role)
      return res.status(400).json({ message: "name, email, password, role required" });

    const validRoles = ["manager","admin","cashier","storekeeper","delivery_manager"];
    if (!validRoles.includes(role))
      return res.status(400).json({ message: `Invalid role. Allowed: ${validRoles.join(", ")}` });

    const exists = await client.query(
      "SELECT id FROM users WHERE LOWER(email)=LOWER($1)", [email]
    );
    if (exists.rows.length) return res.status(400).json({ message: "Email already in use" });

    const hash = await bcrypt.hash(password, 12);
    const result = await client.query(
      `INSERT INTO users (name, email, password, role, store_id, status, created_at)
       VALUES ($1,$2,$3,$4,$5,'active',NOW())
       RETURNING id, name, email, role, status, store_id, created_at`,
      [name.trim(), email.toLowerCase().trim(), hash, role, store_id || null]
    );

    await client.query("COMMIT");
    res.status(201).json({ user: result.rows[0] });
  } catch (err) {
    await client.query("ROLLBACK");
    res.status(500).json({ message: err.message });
  } finally {
    client.release();
  }
});

router.patch("/manager/:id", requireRole("superadmin"), async (req, res) => {
  try {
    const allowed = ["role", "status", "store_id", "name"];
    const sets = []; const params = [];

    for (const field of allowed) {
      if (req.body[field] !== undefined) {
        params.push(req.body[field]);
        sets.push(`${field}=$${params.length}`);
      }
    }
    if (!sets.length) return res.status(400).json({ message: "No fields to update" });

    params.push(req.params.id);
    const result = await pool.query(
      `UPDATE users SET ${sets.join(", ")}, updated_at=NOW()
       WHERE id=$${params.length}
       RETURNING id, name, email, role, status, store_id`,
      params
    );
    if (!result.rows.length) return res.status(404).json({ message: "User not found" });
    res.json({ user: result.rows[0] });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete("/manager/:id", requireRole("superadmin"), async (req, res) => {
  try {
    if (parseInt(req.params.id) === req.user.id)
      return res.status(400).json({ message: "Cannot deactivate yourself" });

    const result = await pool.query(
      "UPDATE users SET status='inactive', updated_at=NOW() WHERE id=$1 RETURNING id, name",
      [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ message: "User not found" });
    res.json({ message: `User "${result.rows[0].name}" deactivated` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// ALL SETTINGS  (bulk GET for initial page load)
// GET /api/admin/settings
// ════════════════════════════════════════════════════════════════════════════
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT key, value, group_name FROM settings ORDER BY group_name, key"
    );
    const grouped = {};
    result.rows.forEach((r) => {
      if (!grouped[r.group_name]) grouped[r.group_name] = {};
      grouped[r.group_name][r.key] = r.value;
    });
    res.json({ settings: grouped });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
