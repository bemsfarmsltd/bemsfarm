// server/src/routes/chef_bems_admin.js
// Mounted at /api/admin/chef-bems in index.js

const express = require("express");
const router  = express.Router();
const pool    = require("../db/pool");
const { protect, requireRole } = require("../middleware/authMiddleware");

router.use(protect);
const AI_ROLES = requireRole("superadmin","manager","kitchen_staff");

// ─── CONVERSATIONS ────────────────────────────────────────────────────────────
router.get("/conversations", AI_ROLES, async (req, res) => {
  try {
    const { search = "", status, page = 1, limit = 20 } = req.query;
    const params = []; const where = [];
    if (search) { params.push(`%${search}%`); where.push(`(customer_name ILIKE $${params.length} OR user_message ILIKE $${params.length} OR session_id ILIKE $${params.length})`); }
    if (status) { params.push(status); where.push(`status = $${params.length}`); }
    const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const offset = (parseInt(page)-1)*parseInt(limit);
    const [rows, cnt] = await Promise.all([
      pool.query(`SELECT * FROM ai_conversations ${clause} ORDER BY created_at DESC LIMIT $${params.length+1} OFFSET $${params.length+2}`, [...params, parseInt(limit), offset]),
      pool.query(`SELECT COUNT(*) FROM ai_conversations ${clause}`, params),
    ]);
    res.json({ conversations: rows.rows, total: parseInt(cnt.rows[0].count), page: parseInt(page), pages: Math.ceil(parseInt(cnt.rows[0].count)/parseInt(limit)) });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.patch("/conversations/:id/status", requireRole("superadmin","manager"), async (req, res) => {
  try {
    const { status } = req.body;
    const valid = ["pending","resolved","escalated"];
    if (!valid.includes(status)) return res.status(400).json({ message: "Invalid status" });
    const result = await pool.query("UPDATE ai_conversations SET status=$1 WHERE id=$2 RETURNING *", [status, req.params.id]);
    if (!result.rows.length) return res.status(404).json({ message: "Not found" });
    res.json({ conversation: result.rows[0] });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.delete("/conversations/:id", requireRole("superadmin"), async (req, res) => {
  try {
    await pool.query("DELETE FROM ai_conversations WHERE id=$1", [req.params.id]);
    res.json({ message: "Conversation deleted" });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ─── DIETARY RULES ────────────────────────────────────────────────────────────
const ENSURE_DIET = `CREATE TABLE IF NOT EXISTS admin_dietary_rules (
  id SERIAL PRIMARY KEY, condition VARCHAR(255) UNIQUE NOT NULL, rule_text TEXT NOT NULL,
  tags VARCHAR(255), priority INTEGER DEFAULT 0, created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW()
)`;

router.get("/dietary-rules", AI_ROLES, async (req, res) => {
  try {
    await pool.query(ENSURE_DIET);
    const { search = "", page = 1, limit = 50 } = req.query;
    const params = []; const where = [];
    if (search) { params.push(`%${search}%`); where.push(`(condition ILIKE $${params.length} OR rule_text ILIKE $${params.length} OR tags ILIKE $${params.length})`); }
    const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const offset = (parseInt(page)-1)*parseInt(limit);
    const [rows, cnt] = await Promise.all([
      pool.query(`SELECT * FROM admin_dietary_rules ${clause} ORDER BY created_at DESC LIMIT $${params.length+1} OFFSET $${params.length+2}`, [...params, parseInt(limit), offset]),
      pool.query(`SELECT COUNT(*) FROM admin_dietary_rules ${clause}`, params),
    ]);
    res.json({ rules: rows.rows, total: parseInt(cnt.rows[0].count) });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post("/dietary-rules", requireRole("superadmin","manager"), async (req, res) => {
  try {
    await pool.query(ENSURE_DIET);
    const { condition, rule_text, tags, priority } = req.body;
    if (!condition?.trim()) return res.status(400).json({ message: "Condition is required" });
    if (!rule_text?.trim()) return res.status(400).json({ message: "Rule text is required" });
    const existing = await pool.query("SELECT id FROM admin_dietary_rules WHERE LOWER(condition)=LOWER($1)", [condition.trim()]);
    if (existing.rows.length) return res.status(409).json({ message: "A rule for this condition already exists" });
    const result = await pool.query(
      "INSERT INTO admin_dietary_rules (condition, rule_text, tags, priority) VALUES ($1,$2,$3,$4) RETURNING *",
      [condition.trim(), rule_text.trim(), tags||null, priority||0]
    );
    res.status(201).json({ rule: result.rows[0] });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put("/dietary-rules/:id", requireRole("superadmin","manager"), async (req, res) => {
  try {
    await pool.query(ENSURE_DIET);
    const { condition, rule_text, tags, priority } = req.body;
    if (!condition?.trim()) return res.status(400).json({ message: "Condition is required" });
    const result = await pool.query(
      "UPDATE admin_dietary_rules SET condition=$1, rule_text=$2, tags=$3, priority=$4, updated_at=NOW() WHERE id=$5 RETURNING *",
      [condition.trim(), rule_text?.trim()||"", tags||null, priority||0, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ message: "Rule not found" });
    res.json({ rule: result.rows[0] });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.delete("/dietary-rules/:id", requireRole("superadmin"), async (req, res) => {
  try {
    await pool.query(ENSURE_DIET);
    const result = await pool.query("DELETE FROM admin_dietary_rules WHERE id=$1 RETURNING id", [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ message: "Rule not found" });
    res.json({ message: "Dietary rule deleted" });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ─── MEAL ASSOCIATIONS ────────────────────────────────────────────────────────
router.get("/meal-associations", AI_ROLES, async (req, res) => {
  try {
    const { search = "", page = 1, limit = 50 } = req.query;
    const params = []; const where = [];
    if (search) { params.push(`%${search}%`); where.push(`(product_name ILIKE $${params.length} OR associated_product_name ILIKE $${params.length} OR association_type ILIKE $${params.length})`); }
    const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const offset = (parseInt(page)-1)*parseInt(limit);
    const [rows, cnt] = await Promise.all([
      pool.query(`SELECT * FROM product_associations ${clause} ORDER BY created_at DESC LIMIT $${params.length+1} OFFSET $${params.length+2}`, [...params, parseInt(limit), offset]),
      pool.query(`SELECT COUNT(*) FROM product_associations ${clause}`, params),
    ]);
    res.json({ associations: rows.rows, total: parseInt(cnt.rows[0].count) });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post("/meal-associations", requireRole("superadmin","manager","kitchen_staff"), async (req, res) => {
  try {
    const { product_name, associated_product_name, association_type, strength, notes } = req.body;
    if (!product_name?.trim()) return res.status(400).json({ message: "Product name is required" });
    if (!associated_product_name?.trim()) return res.status(400).json({ message: "Associated product name is required" });
    const result = await pool.query(
      "INSERT INTO product_associations (product_name, associated_product_name, association_type, strength, notes) VALUES ($1,$2,$3,$4,$5) RETURNING *",
      [product_name.trim(), associated_product_name.trim(), association_type||"pairs_well_with", parseFloat(strength)||1.0, notes?.trim()||null]
    );
    res.status(201).json({ association: result.rows[0] });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put("/meal-associations/:id", requireRole("superadmin","manager","kitchen_staff"), async (req, res) => {
  try {
    const { product_name, associated_product_name, association_type, strength, notes } = req.body;
    const result = await pool.query(
      "UPDATE product_associations SET product_name=$1, associated_product_name=$2, association_type=$3, strength=$4, notes=$5, updated_at=NOW() WHERE id=$6 RETURNING *",
      [product_name?.trim(), associated_product_name?.trim(), association_type||"pairs_well_with", parseFloat(strength)||1.0, notes?.trim()||null, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ message: "Not found" });
    res.json({ association: result.rows[0] });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.delete("/meal-associations/:id", requireRole("superadmin","manager"), async (req, res) => {
  try {
    await pool.query("DELETE FROM product_associations WHERE id=$1", [req.params.id]);
    res.json({ message: "Association deleted" });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ─── SUBSTITUTIONS ────────────────────────────────────────────────────────────
const ENSURE_SUBS = `CREATE TABLE IF NOT EXISTS admin_substitutions (
  id SERIAL PRIMARY KEY, original_item VARCHAR(255) NOT NULL, substitute_item VARCHAR(255) NOT NULL,
  reason TEXT, dietary_tags TEXT, confidence DECIMAL(3,2) DEFAULT 0.80,
  is_active BOOLEAN DEFAULT TRUE, created_by INTEGER, created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW()
)`;

router.get("/substitutions", AI_ROLES, async (req, res) => {
  try {
    await pool.query(ENSURE_SUBS);
    const { search = "", page = 1, limit = 50 } = req.query;
    const params = []; const where = [];
    if (search) { params.push(`%${search}%`); where.push(`(original_item ILIKE $${params.length} OR substitute_item ILIKE $${params.length} OR dietary_tags ILIKE $${params.length})`); }
    const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const offset = (parseInt(page)-1)*parseInt(limit);
    const [rows, cnt] = await Promise.all([
      pool.query(`SELECT * FROM admin_substitutions ${clause} ORDER BY created_at DESC LIMIT $${params.length+1} OFFSET $${params.length+2}`, [...params, parseInt(limit), offset]),
      pool.query(`SELECT COUNT(*) FROM admin_substitutions ${clause}`, params),
    ]);
    res.json({ substitutions: rows.rows, total: parseInt(cnt.rows[0].count) });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post("/substitutions", requireRole("superadmin","manager","kitchen_staff"), async (req, res) => {
  try {
    await pool.query(ENSURE_SUBS);
    const { original_item, substitute_item, reason, dietary_tags, confidence } = req.body;
    if (!original_item?.trim()) return res.status(400).json({ message: "Original item is required" });
    if (!substitute_item?.trim()) return res.status(400).json({ message: "Substitute item is required" });
    const dup = await pool.query("SELECT id FROM admin_substitutions WHERE LOWER(original_item)=LOWER($1) AND LOWER(substitute_item)=LOWER($2)", [original_item.trim(), substitute_item.trim()]);
    if (dup.rows.length) return res.status(409).json({ message: "This substitution already exists" });
    const result = await pool.query(
      "INSERT INTO admin_substitutions (original_item, substitute_item, reason, dietary_tags, confidence, created_by) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *",
      [original_item.trim(), substitute_item.trim(), reason?.trim()||null, dietary_tags?.trim()||null, parseFloat(confidence||0.80), req.user.id]
    );
    res.status(201).json({ substitution: result.rows[0] });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put("/substitutions/:id", requireRole("superadmin","manager","kitchen_staff"), async (req, res) => {
  try {
    const { original_item, substitute_item, reason, dietary_tags, confidence, is_active } = req.body;
    const result = await pool.query(
      "UPDATE admin_substitutions SET original_item=$1, substitute_item=$2, reason=$3, dietary_tags=$4, confidence=$5, is_active=$6, updated_at=NOW() WHERE id=$7 RETURNING *",
      [original_item?.trim(), substitute_item?.trim(), reason?.trim()||null, dietary_tags?.trim()||null, parseFloat(confidence||0.80), is_active!==false, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ message: "Not found" });
    res.json({ substitution: result.rows[0] });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.delete("/substitutions/:id", requireRole("superadmin","manager"), async (req, res) => {
  try {
    await pool.query("DELETE FROM admin_substitutions WHERE id=$1", [req.params.id]);
    res.json({ message: "Substitution deleted" });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ─── RECOMMENDATIONS ─────────────────────────────────────────────────────────
const ENSURE_RECS = `CREATE TABLE IF NOT EXISTS admin_recommendations (
  id SERIAL PRIMARY KEY, title VARCHAR(255) NOT NULL, trigger_condition TEXT NOT NULL,
  recommended_items TEXT NOT NULL, context_tags TEXT, priority INTEGER DEFAULT 5,
  is_active BOOLEAN DEFAULT TRUE, created_by INTEGER, created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW()
)`;

router.get("/recommendations", AI_ROLES, async (req, res) => {
  try {
    await pool.query(ENSURE_RECS);
    const { search = "", page = 1, limit = 50 } = req.query;
    const params = []; const where = [];
    if (search) { params.push(`%${search}%`); where.push(`(title ILIKE $${params.length} OR trigger_condition ILIKE $${params.length} OR recommended_items ILIKE $${params.length})`); }
    const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const offset = (parseInt(page)-1)*parseInt(limit);
    const [rows, cnt] = await Promise.all([
      pool.query(`SELECT * FROM admin_recommendations ${clause} ORDER BY priority ASC, created_at DESC LIMIT $${params.length+1} OFFSET $${params.length+2}`, [...params, parseInt(limit), offset]),
      pool.query(`SELECT COUNT(*) FROM admin_recommendations ${clause}`, params),
    ]);
    res.json({ recommendations: rows.rows, total: parseInt(cnt.rows[0].count) });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post("/recommendations", requireRole("superadmin","manager"), async (req, res) => {
  try {
    await pool.query(ENSURE_RECS);
    const { title, trigger_condition, recommended_items, context_tags, priority } = req.body;
    if (!title?.trim()) return res.status(400).json({ message: "Title is required" });
    if (!trigger_condition?.trim()) return res.status(400).json({ message: "Trigger condition is required" });
    if (!recommended_items?.trim()) return res.status(400).json({ message: "Recommended items are required" });
    const result = await pool.query(
      "INSERT INTO admin_recommendations (title, trigger_condition, recommended_items, context_tags, priority, created_by) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *",
      [title.trim(), trigger_condition.trim(), recommended_items.trim(), context_tags?.trim()||null, parseInt(priority||5), req.user.id]
    );
    res.status(201).json({ recommendation: result.rows[0] });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put("/recommendations/:id", requireRole("superadmin","manager"), async (req, res) => {
  try {
    const { title, trigger_condition, recommended_items, context_tags, priority, is_active } = req.body;
    const result = await pool.query(
      "UPDATE admin_recommendations SET title=$1, trigger_condition=$2, recommended_items=$3, context_tags=$4, priority=$5, is_active=$6, updated_at=NOW() WHERE id=$7 RETURNING *",
      [title?.trim(), trigger_condition?.trim(), recommended_items?.trim(), context_tags?.trim()||null, parseInt(priority||5), is_active!==false, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ message: "Not found" });
    res.json({ recommendation: result.rows[0] });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.delete("/recommendations/:id", requireRole("superadmin"), async (req, res) => {
  try {
    await pool.query("DELETE FROM admin_recommendations WHERE id=$1", [req.params.id]);
    res.json({ message: "Recommendation deleted" });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
