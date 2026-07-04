// server/src/routes/coupons_admin.js
// Mounted at /api/admin/coupons in index.js
//
// Manages discount coupons and tracks usage.
// Uses existing tables: coupons, coupon_usages
// ───────────────────────────────────────────────────────────────────────────
//
// SQL MIGRATION — run in Supabase if these columns are missing:
//
// ALTER TABLE coupons
//   ADD COLUMN IF NOT EXISTS code          VARCHAR(50) UNIQUE,
//   ADD COLUMN IF NOT EXISTS type          VARCHAR(20) DEFAULT 'percentage',
//   ADD COLUMN IF NOT EXISTS value         DECIMAL(10,2) DEFAULT 0,
//   ADD COLUMN IF NOT EXISTS min_order     DECIMAL(10,2) DEFAULT 0,
//   ADD COLUMN IF NOT EXISTS max_discount  DECIMAL(10,2),
//   ADD COLUMN IF NOT EXISTS usage_limit   INTEGER,
//   ADD COLUMN IF NOT EXISTS used_count    INTEGER DEFAULT 0,
//   ADD COLUMN IF NOT EXISTS per_user_limit INTEGER DEFAULT 1,
//   ADD COLUMN IF NOT EXISTS applicable_to VARCHAR(30) DEFAULT 'all',
//   ADD COLUMN IF NOT EXISTS start_date    DATE,
//   ADD COLUMN IF NOT EXISTS end_date      DATE,
//   ADD COLUMN IF NOT EXISTS is_active     BOOLEAN DEFAULT true,
//   ADD COLUMN IF NOT EXISTS created_by    INTEGER,
//   ADD COLUMN IF NOT EXISTS created_at    TIMESTAMP DEFAULT NOW(),
//   ADD COLUMN IF NOT EXISTS updated_at    TIMESTAMP DEFAULT NOW();
//
// ALTER TABLE coupon_usages
//   ADD COLUMN IF NOT EXISTS coupon_id     INTEGER,
//   ADD COLUMN IF NOT EXISTS customer_id   INTEGER,
//   ADD COLUMN IF NOT EXISTS order_id      VARCHAR(30),
//   ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10,2),
//   ADD COLUMN IF NOT EXISTS used_at       TIMESTAMP DEFAULT NOW();
//
// ───────────────────────────────────────────────────────────────────────────

const express = require("express");
const router  = express.Router();
const pool    = require("../db/pool");
const { protect, requireRole } = require("../middleware/authMiddleware");

router.use(protect);
router.use(requireRole("superadmin", "manager", "admin"));

// ════════════════════════════════════════════════════════════════════════════
// LIST COUPONS  ──  GET /api/admin/coupons
// ════════════════════════════════════════════════════════════════════════════
router.get("/", async (req, res) => {
  try {
    const { status = "", search = "", page = 1, limit = 30 } = req.query;
    const params = [];
    const where  = [];

    if (search) {
      params.push(`%${search}%`);
      where.push(`(c.code ILIKE $${params.length} OR c.description ILIKE $${params.length})`);
    }

    if (status === "active") {
      where.push("c.is_active=true AND (c.end_date IS NULL OR c.end_date >= CURRENT_DATE)");
    } else if (status === "expired") {
      where.push("(c.is_active=false OR c.end_date < CURRENT_DATE)");
    } else if (status === "exhausted") {
      where.push("c.usage_limit IS NOT NULL AND c.used_count >= c.usage_limit");
    }

    const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const offset = (parseInt(page) - 1) * parseInt(limit);
    params.push(parseInt(limit)); const limitIdx  = params.length;
    params.push(offset);          const offsetIdx = params.length;

    const [rows, count] = await Promise.all([
      pool.query(
        `SELECT c.*,
                u.name AS created_by_name
         FROM coupons c
         LEFT JOIN users u ON u.id = c.created_by
         ${clause}
         ORDER BY c.created_at DESC
         LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
        params
      ),
      pool.query(`SELECT COUNT(*) FROM coupons c ${clause}`, params.slice(0, -2)),
    ]);

    res.json({
      coupons: rows.rows,
      total:   parseInt(count.rows[0].count),
      page:    parseInt(page),
      pages:   Math.ceil(parseInt(count.rows[0].count) / parseInt(limit)),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// GET SINGLE COUPON  ──  GET /api/admin/coupons/:id
// ════════════════════════════════════════════════════════════════════════════
router.get("/:id", async (req, res) => {
  try {
    const [coupon, usages] = await Promise.all([
      pool.query("SELECT * FROM coupons WHERE id=$1", [req.params.id]),
      pool.query(
        `SELECT cu.*, c.name AS customer_name
         FROM coupon_usages cu
         LEFT JOIN customers c ON c.id = cu.customer_id
         WHERE cu.coupon_id=$1
         ORDER BY cu.used_at DESC LIMIT 50`,
        [req.params.id]
      ),
    ]);
    if (!coupon.rows.length) return res.status(404).json({ message: "Coupon not found" });

    res.json({ coupon: coupon.rows[0], usages: usages.rows });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// CREATE COUPON  ──  POST /api/admin/coupons
// ════════════════════════════════════════════════════════════════════════════
router.post("/", async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const {
      code, description, type = "percentage", value,
      min_order = 0, max_discount, usage_limit, per_user_limit = 1,
      applicable_to = "all", start_date, end_date, is_active = true,
    } = req.body;

    if (!code?.trim()) return res.status(400).json({ message: "Coupon code is required" });
    if (!value || parseFloat(value) <= 0) return res.status(400).json({ message: "Discount value must be > 0" });
    if (!["percentage", "fixed"].includes(type)) return res.status(400).json({ message: "type must be percentage or fixed" });
    if (type === "percentage" && parseFloat(value) > 100) return res.status(400).json({ message: "Percentage cannot exceed 100" });

    const duplicate = await client.query("SELECT id FROM coupons WHERE UPPER(code)=UPPER($1)", [code.trim()]);
    if (duplicate.rows.length) return res.status(400).json({ message: "Coupon code already exists" });

    const result = await client.query(
      `INSERT INTO coupons
         (code, description, type, value, min_order, max_discount, usage_limit,
          per_user_limit, applicable_to, start_date, end_date, is_active,
          used_count, created_by, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,0,$13,NOW(),NOW())
       RETURNING *`,
      [
        code.trim().toUpperCase(), description || null, type, parseFloat(value),
        parseFloat(min_order), max_discount ? parseFloat(max_discount) : null,
        usage_limit ? parseInt(usage_limit) : null, parseInt(per_user_limit),
        applicable_to, start_date || null, end_date || null, is_active,
        req.user.id,
      ]
    );

    await client.query("COMMIT");
    res.status(201).json({ coupon: result.rows[0] });
  } catch (err) {
    await client.query("ROLLBACK");
    res.status(500).json({ message: err.message });
  } finally {
    client.release();
  }
});

// ════════════════════════════════════════════════════════════════════════════
// UPDATE COUPON  ──  PATCH /api/admin/coupons/:id
// ════════════════════════════════════════════════════════════════════════════
router.patch("/:id", async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const coupon = await client.query("SELECT id FROM coupons WHERE id=$1", [req.params.id]);
    if (!coupon.rows.length) return res.status(404).json({ message: "Coupon not found" });

    const allowed = ["description","type","value","min_order","max_discount",
                     "usage_limit","per_user_limit","applicable_to","start_date","end_date","is_active"];
    const sets = []; const params = [];

    for (const field of allowed) {
      if (req.body[field] !== undefined) {
        params.push(req.body[field]);
        sets.push(`${field}=$${params.length}`);
      }
    }
    if (!sets.length) return res.status(400).json({ message: "No fields to update" });

    params.push(req.params.id);
    const result = await client.query(
      `UPDATE coupons SET ${sets.join(", ")}, updated_at=NOW()
       WHERE id=$${params.length} RETURNING *`,
      params
    );

    await client.query("COMMIT");
    res.json({ coupon: result.rows[0] });
  } catch (err) {
    await client.query("ROLLBACK");
    res.status(500).json({ message: err.message });
  } finally {
    client.release();
  }
});

// ════════════════════════════════════════════════════════════════════════════
// TOGGLE ACTIVE  ──  PATCH /api/admin/coupons/:id/toggle
// ════════════════════════════════════════════════════════════════════════════
router.patch("/:id/toggle", async (req, res) => {
  try {
    const result = await pool.query(
      "UPDATE coupons SET is_active=NOT is_active, updated_at=NOW() WHERE id=$1 RETURNING id, code, is_active",
      [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ message: "Coupon not found" });
    const { code, is_active } = result.rows[0];
    res.json({ message: `Coupon ${code} ${is_active ? "activated" : "deactivated"}`, coupon: result.rows[0] });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// DELETE COUPON  ──  DELETE /api/admin/coupons/:id
// Only allowed if coupon has never been used.
// ════════════════════════════════════════════════════════════════════════════
router.delete("/:id", requireRole("superadmin"), async (req, res) => {
  try {
    const coupon = await pool.query("SELECT code, used_count FROM coupons WHERE id=$1", [req.params.id]);
    if (!coupon.rows.length) return res.status(404).json({ message: "Coupon not found" });
    if (parseInt(coupon.rows[0].used_count) > 0)
      return res.status(400).json({ message: "Cannot delete a coupon that has been used. Deactivate it instead." });

    await pool.query("DELETE FROM coupons WHERE id=$1", [req.params.id]);
    res.json({ message: `Coupon "${coupon.rows[0].code}" deleted` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// VALIDATE COUPON  ──  POST /api/admin/coupons/validate
// Used by POS / order creation to verify a coupon code.
// Public-ish: doesn't require admin role (called from customer-facing).
// ════════════════════════════════════════════════════════════════════════════
router.post("/validate", async (req, res) => {
  try {
    const { code, order_total = 0, customer_id } = req.body;
    if (!code) return res.status(400).json({ message: "code required" });

    const result = await pool.query(
      "SELECT * FROM coupons WHERE UPPER(code)=UPPER($1)", [code.trim()]
    );
    if (!result.rows.length) return res.json({ valid: false, message: "Coupon not found" });

    const c = result.rows[0];
    const now = new Date();

    if (!c.is_active) return res.json({ valid: false, message: "Coupon is not active" });
    if (c.start_date && new Date(c.start_date) > now) return res.json({ valid: false, message: "Coupon not yet valid" });
    if (c.end_date   && new Date(c.end_date)   < now) return res.json({ valid: false, message: "Coupon has expired" });
    if (c.usage_limit && c.used_count >= c.usage_limit) return res.json({ valid: false, message: "Coupon usage limit reached" });
    if (parseFloat(order_total) < parseFloat(c.min_order || 0))
      return res.json({ valid: false, message: `Minimum order amount is ₦${c.min_order}` });

    // Check per-user usage
    if (customer_id && c.per_user_limit) {
      const userUsage = await pool.query(
        "SELECT COUNT(*) FROM coupon_usages WHERE coupon_id=$1 AND customer_id=$2",
        [c.id, customer_id]
      );
      if (parseInt(userUsage.rows[0].count) >= c.per_user_limit)
        return res.json({ valid: false, message: "You have already used this coupon" });
    }

    // Calculate discount amount
    let discount = 0;
    if (c.type === "percentage") {
      discount = (parseFloat(order_total) * parseFloat(c.value)) / 100;
      if (c.max_discount) discount = Math.min(discount, parseFloat(c.max_discount));
    } else {
      discount = Math.min(parseFloat(c.value), parseFloat(order_total));
    }

    res.json({
      valid:    true,
      coupon:   { id: c.id, code: c.code, type: c.type, value: c.value },
      discount: Math.round(discount * 100) / 100,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// USAGE HISTORY  ──  GET /api/admin/coupons/usage
// ════════════════════════════════════════════════════════════════════════════
router.get("/usage/all", async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const [rows, count] = await Promise.all([
      pool.query(
        `SELECT cu.*, c.code AS coupon_code, c.type AS coupon_type,
                cs.name AS customer_name
         FROM coupon_usages cu
         JOIN coupons c ON c.id = cu.coupon_id
         LEFT JOIN customers cs ON cs.id = cu.customer_id
         ORDER BY cu.used_at DESC
         LIMIT $1 OFFSET $2`,
        [parseInt(limit), offset]
      ),
      pool.query("SELECT COUNT(*) FROM coupon_usages"),
    ]);

    res.json({
      usages: rows.rows,
      total:  parseInt(count.rows[0].count),
      page:   parseInt(page),
      pages:  Math.ceil(parseInt(count.rows[0].count) / parseInt(limit)),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
