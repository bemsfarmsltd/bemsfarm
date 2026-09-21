// server/src/routes/chef_bems_admin.js
// Mounted at /api/admin/chef-bems in index.js

const express = require("express");
const router  = express.Router();
const pool    = require("../db/pool");
const { protect, requireRole } = require("../middleware/authMiddleware");
const { clampLimit } = require("../utils/pagination");

router.use(protect);
const AI_ROLES = requireRole("superadmin", "admin", "manager", "kitchen_staff");
const AI_MANAGE_ROLES = requireRole("superadmin", "admin", "manager");

let chefTablesReady = false;
async function ensureChefTables() {
  if (chefTablesReady) return;
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS admin_ai_conversations (
        id              SERIAL PRIMARY KEY,
        user_id         INT REFERENCES users(id) ON DELETE CASCADE,
        session_id      VARCHAR(100),
        bot_type        VARCHAR(30) DEFAULT 'general',
        title           VARCHAR(255),
        summary         TEXT,
        topics          JSONB    DEFAULT '[]',
        message_count   INT      DEFAULT 0,
        last_message_at TIMESTAMP,
        archived        BOOLEAN  DEFAULT false,
        created_at      TIMESTAMP DEFAULT NOW()
      );

      ALTER TABLE admin_ai_conversations ADD COLUMN IF NOT EXISTS ip_address VARCHAR(60);
      ALTER TABLE admin_ai_conversations ADD COLUMN IF NOT EXISTS guest_identifier VARCHAR(150);

      CREATE TABLE IF NOT EXISTS ai_conversation_messages (
        id              SERIAL PRIMARY KEY,
        conversation_id INT REFERENCES admin_ai_conversations(id) ON DELETE CASCADE,
        role            VARCHAR(10) NOT NULL,
        content         TEXT NOT NULL,
        source          VARCHAR(30),
        created_at      TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS ai_audit_logs (
        id              BIGSERIAL PRIMARY KEY,
        user_id         INT REFERENCES users(id) ON DELETE SET NULL,
        user_name       VARCHAR(255) DEFAULT 'Anonymous Guest',
        user_email      VARCHAR(255),
        user_role       VARCHAR(50)  DEFAULT 'guest',
        ip_address      VARCHAR(60),
        user_agent      TEXT,
        bot_type        VARCHAR(50)  DEFAULT 'chef',
        session_id      VARCHAR(120),
        prompt          TEXT,
        response        TEXT,
        tokens_used     INT          DEFAULT 0,
        source          VARCHAR(50)  DEFAULT 'gemini',
        status          VARCHAR(30)  DEFAULT 'success',
        error_message   TEXT,
        created_at      TIMESTAMPTZ  DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS admin_dietary_rules (
        id          SERIAL PRIMARY KEY,
        condition   VARCHAR(100) NOT NULL UNIQUE,
        rule_text   TEXT NOT NULL,
        tags        VARCHAR(255),
        priority    INT DEFAULT 5,
        is_active   BOOLEAN DEFAULT true,
        created_at  TIMESTAMP DEFAULT NOW(),
        updated_at  TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS admin_meal_associations (
        id            SERIAL PRIMARY KEY,
        primary_item  VARCHAR(100) NOT NULL,
        paired_item   VARCHAR(100) NOT NULL,
        affinity      VARCHAR(50) DEFAULT 'complementary',
        notes         TEXT,
        created_at    TIMESTAMP DEFAULT NOW()
      );
    `);
    chefTablesReady = true;
  } catch (err) {
    console.warn('[chef_bems_admin] ensureChefTables warning:', err.message);
  }
}

// ─── HELPER: AI Date Range & Timeframe Parser ──────────────────────────────
function parseAiDateFilter(query = {}) {
  const range = (query.range || 'all').toLowerCase();
  const customFrom = query.from;
  const customTo = query.to;

  if (range === 'custom' && customFrom && customTo) {
    const fromStr = `${customFrom} 00:00:00`;
    const toStr = `${customTo} 23:59:59`;
    return {
      range: 'custom',
      label: `${customFrom} → ${customTo}`,
      filterClause: `created_at >= '${fromStr}'::timestamp AND created_at <= '${toStr}'::timestamp`,
      logClause: `l.created_at >= '${fromStr}'::timestamp AND l.created_at <= '${toStr}'::timestamp`,
      convosClause: `(ac.last_message_at >= '${fromStr}'::timestamp OR (ac.last_message_at IS NULL AND ac.created_at >= '${fromStr}'::timestamp)) AND ac.created_at <= '${toStr}'::timestamp`,
      from: customFrom,
      to: customTo,
    };
  }

  if (range === 'today') {
    return {
      range: 'today',
      label: 'Today',
      filterClause: `DATE(created_at) = CURRENT_DATE`,
      logClause: `DATE(l.created_at) = CURRENT_DATE`,
      convosClause: `DATE(COALESCE(ac.last_message_at, ac.created_at)) = CURRENT_DATE`,
    };
  }

  if (range === '7d') {
    return {
      range: '7d',
      label: 'Last 7 Days',
      filterClause: `created_at >= NOW() - INTERVAL '7 days'`,
      logClause: `l.created_at >= NOW() - INTERVAL '7 days'`,
      convosClause: `COALESCE(ac.last_message_at, ac.created_at) >= NOW() - INTERVAL '7 days'`,
    };
  }

  if (range === '12d') {
    return {
      range: '12d',
      label: 'Last 12 Days',
      filterClause: `created_at >= NOW() - INTERVAL '12 days'`,
      logClause: `l.created_at >= NOW() - INTERVAL '12 days'`,
      convosClause: `COALESCE(ac.last_message_at, ac.created_at) >= NOW() - INTERVAL '12 days'`,
    };
  }

  if (range === '1m' || range === '30d' || range === 'month') {
    return {
      range: '1m',
      label: 'Last 1 Month',
      filterClause: `created_at >= NOW() - INTERVAL '30 days'`,
      logClause: `l.created_at >= NOW() - INTERVAL '30 days'`,
      convosClause: `COALESCE(ac.last_message_at, ac.created_at) >= NOW() - INTERVAL '30 days'`,
    };
  }

  if (range === '1y' || range === '365d' || range === 'year') {
    return {
      range: '1y',
      label: 'Last 1 Year',
      filterClause: `created_at >= NOW() - INTERVAL '1 year'`,
      logClause: `l.created_at >= NOW() - INTERVAL '1 year'`,
      convosClause: `COALESCE(ac.last_message_at, ac.created_at) >= NOW() - INTERVAL '1 year'`,
    };
  }

  return {
    range: 'all',
    label: 'All Time',
    filterClause: null,
    logClause: null,
    convosClause: null,
  };
}

// ─── CONVERSATIONS ────────────────────────────────────────────────────────────
router.get("/conversations", AI_ROLES, async (req, res, next) => {
  try {
    await ensureChefTables();
    const { search = "", status, page = 1, limit: limitRaw = 20 } = req.query;
    const dateFilter = parseAiDateFilter(req.query);
    const limit = clampLimit(limitRaw, 20);
    const params = []; const where = [];
    if (search) {
      params.push(`%${search}%`);
      where.push(`(ac.session_id ILIKE $${params.length} OR ac.title ILIKE $${params.length} OR u.name ILIKE $${params.length})`);
    }
    where.push("ac.bot_type = 'chef'");
    if (status === "completed") where.push("ac.archived = true");
    if (status === "active") where.push("ac.archived = false");
    if (status === "escalated" || status === "abandoned") where.push("false");
    if (dateFilter.convosClause) where.push(dateFilter.convosClause);

    const clause = `WHERE ${where.join(" AND ")}`;
    const offset = (parseInt(page)-1)*parseInt(limit);
    const [rows, cnt] = await Promise.all([
      pool.query(
        `SELECT ac.*, ac.user_id AS customer_id,
                COALESCE(u.name, 'Customer #' || ac.user_id, 'Anonymous Guest') AS customer_name,
                COALESCE(u.phone, '—') AS customer_phone,
                u.email AS customer_email,
                CASE WHEN ac.archived THEN 'completed' ELSE 'active' END AS status,
                COALESCE(
                  JSON_AGG(JSON_BUILD_OBJECT(
                    'id', m.id, 'role', m.role, 'content', m.content,
                    'source', m.source, 'created_at', m.created_at
                  ) ORDER BY m.created_at) FILTER (WHERE m.id IS NOT NULL),
                  '[]'::json
                ) AS messages
         FROM admin_ai_conversations ac
         LEFT JOIN users u ON u.id = ac.user_id
         LEFT JOIN ai_conversation_messages m ON m.conversation_id = ac.id
         ${clause}
         GROUP BY ac.id, u.name, u.phone, u.email
         ORDER BY ac.last_message_at DESC NULLS LAST, ac.created_at DESC
         LIMIT $${params.length+1} OFFSET $${params.length+2}`,
        [...params, parseInt(limit), offset]
      ).catch(() => ({ rows: [] })),
      pool.query(`SELECT COUNT(*) FROM admin_ai_conversations ac LEFT JOIN users u ON u.id = ac.user_id ${clause}`, params).catch(() => ({ rows: [{ count: '0' }] })),
    ]);
    const total = parseInt(cnt.rows[0]?.count || 0);
    res.json({
      conversations: rows.rows || [],
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)) || 1,
      range: dateFilter.range,
      rangeLabel: dateFilter.label,
    });
  } catch (err) {
    console.error("GET /admin/chef-bems/conversations error:", err.message);
    res.json({ conversations: [], total: 0, page: 1, pages: 1 });
  }
});

// ─── AI AUDIT & TOKEN USAGE LOGS ──────────────────────────────────────────
router.get("/audit-logs", AI_ROLES, async (req, res, next) => {
  try {
    await ensureChefTables();
    const { search = "", role = "all", status = "all", bot_type = "all", page = 1, limit: limitRaw = 30 } = req.query;
    const dateFilter = parseAiDateFilter(req.query);
    const limit = clampLimit(limitRaw, 30);
    const params = [];
    const where = [];

    if (search) {
      params.push(`%${search}%`);
      where.push(`(l.prompt ILIKE $${params.length} OR l.response ILIKE $${params.length} OR l.ip_address ILIKE $${params.length} OR l.user_name ILIKE $${params.length} OR l.user_email ILIKE $${params.length})`);
    }

    if (role && role !== "all") {
      params.push(role);
      where.push(`l.user_role = $${params.length}`);
    }

    if (status && status !== "all") {
      params.push(status);
      where.push(`l.status = $${params.length}`);
    }

    if (bot_type && bot_type !== "all") {
      params.push(bot_type);
      where.push(`l.bot_type = $${params.length}`);
    }

    if (dateFilter.logClause) {
      where.push(dateFilter.logClause);
    }

    const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const statsWhere = dateFilter.filterClause ? `WHERE ${dateFilter.filterClause}` : "";

    const [rows, cnt, stats] = await Promise.all([
      pool.query(
        `SELECT l.*, u.phone AS user_phone
         FROM ai_audit_logs l
         LEFT JOIN users u ON u.id = l.user_id
         ${clause}
         ORDER BY l.created_at DESC
         LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, parseInt(limit), offset]
      ).catch(() => ({ rows: [] })),
      pool.query(`SELECT COUNT(*) FROM ai_audit_logs l ${clause}`, params).catch(() => ({ rows: [{ count: '0' }] })),
      pool.query(`
        SELECT 
          COUNT(*) AS requests_period,
          COALESCE(SUM(tokens_used), 0) AS tokens_period,
          COUNT(DISTINCT ip_address) AS unique_ips_period,
          COUNT(*) FILTER (WHERE user_role = 'guest') AS guest_requests_period,
          COUNT(*) FILTER (WHERE user_role != 'guest') AS registered_requests_period,
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours') AS requests_24h,
          COALESCE(SUM(tokens_used) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours'), 0) AS tokens_24h,
          COUNT(DISTINCT ip_address) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours') AS unique_ips_24h,
          COUNT(*) FILTER (WHERE user_role = 'guest' AND created_at >= NOW() - INTERVAL '24 hours') AS guest_requests_24h,
          COUNT(*) FILTER (WHERE user_role != 'guest' AND created_at >= NOW() - INTERVAL '24 hours') AS registered_requests_24h
        FROM ai_audit_logs
        ${statsWhere}
      `).catch(() => ({ rows: [{
        requests_period: 0,
        tokens_period: 0,
        unique_ips_period: 0,
        guest_requests_period: 0,
        registered_requests_period: 0,
        requests_24h: 0,
        tokens_24h: 0,
        unique_ips_24h: 0,
        guest_requests_24h: 0,
        registered_requests_24h: 0,
      }] })),
    ]);

    const total = parseInt(cnt.rows[0]?.count || 0);
    const rawStats = stats.rows[0] || {};

    res.json({
      logs: rows.rows || [],
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)) || 1,
      range: dateFilter.range,
      rangeLabel: dateFilter.label,
      stats: {
        requests_period: Number(rawStats.requests_period || 0),
        tokens_period: Number(rawStats.tokens_period || 0),
        unique_ips_period: Number(rawStats.unique_ips_period || 0),
        guest_requests_period: Number(rawStats.guest_requests_period || 0),
        registered_requests_period: Number(rawStats.registered_requests_period || 0),
        requests_24h: Number(rawStats.requests_24h || 0),
        tokens_24h: Number(rawStats.tokens_24h || 0),
        unique_ips_24h: Number(rawStats.unique_ips_24h || 0),
        guest_requests_24h: Number(rawStats.guest_requests_24h || 0),
        registered_requests_24h: Number(rawStats.registered_requests_24h || 0),
      },
    });
  } catch (err) {
    console.error("GET /admin/chef-bems/audit-logs error:", err.message);
    res.json({
      logs: [],
      total: 0,
      page: 1,
      pages: 1,
      range: 'all',
      rangeLabel: 'All Time',
      stats: {
        requests_period: 0,
        tokens_period: 0,
        unique_ips_period: 0,
        guest_requests_period: 0,
        registered_requests_period: 0,
        requests_24h: 0,
        tokens_24h: 0,
        unique_ips_24h: 0,
        guest_requests_24h: 0,
        registered_requests_24h: 0,
      },
    });
  }
});

router.patch("/conversations/:id/status", AI_MANAGE_ROLES, async (req, res, next) => {
  try {
    const { status } = req.body;
    const valid = ["active","completed"];
    if (!valid.includes(status)) return res.status(400).json({ message: `status must be one of: ${valid.join(", ")}` });
    const result = await pool.query("UPDATE admin_ai_conversations SET archived=$1 WHERE id=$2 AND bot_type='chef' RETURNING *", [status === "completed", req.params.id]);
    if (!result.rows.length) return res.status(404).json({ message: "Not found" });
    res.json({ conversation: result.rows[0] });
  } catch (err) { next(err); }
});

router.delete("/conversations/:id", AI_MANAGE_ROLES, async (req, res, next) => {
  try {
    await pool.query("DELETE FROM admin_ai_conversations WHERE id=$1 AND bot_type='chef'", [req.params.id]);
    res.json({ message: "Conversation deleted" });
  } catch (err) { next(err); }
});

// ─── DIETARY RULES ────────────────────────────────────────────────────────────
// admin_dietary_rules is created once in migrations.sql (#28), not per-request.

router.get("/dietary-rules", AI_ROLES, async (req, res, next) => {
  try {
    const { search = "", page = 1, limit: limitRaw = 50 } = req.query;
    const limit = clampLimit(limitRaw, 50);
    const params = []; const where = [];
    if (search) { params.push(`%${search}%`); where.push(`(condition ILIKE $${params.length} OR rule_text ILIKE $${params.length} OR tags ILIKE $${params.length})`); }
    const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const offset = (parseInt(page)-1)*parseInt(limit);
    const [rows, cnt] = await Promise.all([
      pool.query(`SELECT * FROM admin_dietary_rules ${clause} ORDER BY created_at DESC LIMIT $${params.length+1} OFFSET $${params.length+2}`, [...params, parseInt(limit), offset]),
      pool.query(`SELECT COUNT(*) FROM admin_dietary_rules ${clause}`, params),
    ]);
    res.json({ rules: rows.rows, total: parseInt(cnt.rows[0].count) });
  } catch (err) { next(err); }
});

router.post("/dietary-rules", requireRole("superadmin", "admin", "manager"), async (req, res, next) => {
  try {
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
  } catch (err) { next(err); }
});

router.put("/dietary-rules/:id", requireRole("superadmin", "admin", "manager"), async (req, res, next) => {
  try {
    const { condition, rule_text, tags, priority } = req.body;
    if (!condition?.trim()) return res.status(400).json({ message: "Condition is required" });
    const result = await pool.query(
      "UPDATE admin_dietary_rules SET condition=$1, rule_text=$2, tags=$3, priority=$4, updated_at=NOW() WHERE id=$5 RETURNING *",
      [condition.trim(), rule_text?.trim()||"", tags||null, priority||0, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ message: "Rule not found" });
    res.json({ rule: result.rows[0] });
  } catch (err) { next(err); }
});

router.delete("/dietary-rules/:id", requireRole("superadmin", "admin", "manager"), async (req, res, next) => {
  try {
    const result = await pool.query("DELETE FROM admin_dietary_rules WHERE id=$1 RETURNING id", [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ message: "Rule not found" });
    res.json({ message: "Dietary rule deleted" });
  } catch (err) { next(err); }
});

// ─── MEAL ASSOCIATIONS ────────────────────────────────────────────────────────
// product_associations' real columns are product_a/product_b/association_strength
// (an integer 1-5 co-occurrence score) — the product_name/associated_product_name/
// strength/notes columns this route used to assume don't exist, so every
// create/edit here previously failed with a raw "column does not exist" 500.
router.get("/meal-associations", AI_ROLES, async (req, res, next) => {
  try {
    const { search = "", page = 1, limit: limitRaw = 50 } = req.query;
    const limit = clampLimit(limitRaw, 50);
    const params = []; const where = [];
    if (search) { params.push(`%${search}%`); where.push(`(product_a ILIKE $${params.length} OR product_b ILIKE $${params.length} OR association_type ILIKE $${params.length})`); }
    const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const offset = (parseInt(page)-1)*parseInt(limit);
    const [rows, cnt] = await Promise.all([
      pool.query(`SELECT * FROM product_associations ${clause} ORDER BY created_at DESC LIMIT $${params.length+1} OFFSET $${params.length+2}`, [...params, parseInt(limit), offset]),
      pool.query(`SELECT COUNT(*) FROM product_associations ${clause}`, params),
    ]);
    res.json({ associations: rows.rows, total: parseInt(cnt.rows[0].count) });
  } catch (err) { next(err); }
});

router.post("/meal-associations", requireRole("superadmin", "admin", "manager", "kitchen_staff"), async (req, res, next) => {
  try {
    const { product_a, product_b, association_type, association_strength } = req.body;
    if (!product_a?.trim()) return res.status(400).json({ message: "First product is required" });
    if (!product_b?.trim()) return res.status(400).json({ message: "Second product is required" });
    const result = await pool.query(
      "INSERT INTO product_associations (product_a, product_b, association_type, association_strength) VALUES ($1,$2,$3,$4) RETURNING *",
      [product_a.trim(), product_b.trim(), association_type||"pairs_well_with", parseInt(association_strength)||1]
    );
    res.status(201).json({ association: result.rows[0] });
  } catch (err) { next(err); }
});

router.put("/meal-associations/:id", requireRole("superadmin", "admin", "manager", "kitchen_staff"), async (req, res, next) => {
  try {
    const { product_a, product_b, association_type, association_strength } = req.body;
    const result = await pool.query(
      "UPDATE product_associations SET product_a=$1, product_b=$2, association_type=$3, association_strength=$4 WHERE id=$5 RETURNING *",
      [product_a?.trim(), product_b?.trim(), association_type||"pairs_well_with", parseInt(association_strength)||1, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ message: "Not found" });
    res.json({ association: result.rows[0] });
  } catch (err) { next(err); }
});

router.delete("/meal-associations/:id", requireRole("superadmin", "admin", "manager"), async (req, res, next) => {
  try {
    await pool.query("DELETE FROM product_associations WHERE id=$1", [req.params.id]);
    res.json({ message: "Association deleted" });
  } catch (err) { next(err); }
});

// ─── SUBSTITUTIONS ────────────────────────────────────────────────────────────
// admin_substitutions is created once in migrations.sql (#28), not per-request.

router.get("/substitutions", AI_ROLES, async (req, res, next) => {
  try {
    const { search = "", page = 1, limit: limitRaw = 50 } = req.query;
    const limit = clampLimit(limitRaw, 50);
    const params = []; const where = [];
    if (search) { params.push(`%${search}%`); where.push(`(original_item ILIKE $${params.length} OR substitute_item ILIKE $${params.length} OR dietary_tags ILIKE $${params.length})`); }
    const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const offset = (parseInt(page)-1)*parseInt(limit);
    const [rows, cnt] = await Promise.all([
      pool.query(`SELECT * FROM admin_substitutions ${clause} ORDER BY created_at DESC LIMIT $${params.length+1} OFFSET $${params.length+2}`, [...params, parseInt(limit), offset]),
      pool.query(`SELECT COUNT(*) FROM admin_substitutions ${clause}`, params),
    ]);
    res.json({ substitutions: rows.rows, total: parseInt(cnt.rows[0].count) });
  } catch (err) { next(err); }
});

router.post("/substitutions", requireRole("superadmin", "admin", "manager", "kitchen_staff"), async (req, res, next) => {
  try {
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
  } catch (err) { next(err); }
});

router.put("/substitutions/:id", requireRole("superadmin", "admin", "manager", "kitchen_staff"), async (req, res, next) => {
  try {
    const { original_item, substitute_item, reason, dietary_tags, confidence, is_active } = req.body;
    const result = await pool.query(
      "UPDATE admin_substitutions SET original_item=$1, substitute_item=$2, reason=$3, dietary_tags=$4, confidence=$5, is_active=$6, updated_at=NOW() WHERE id=$7 RETURNING *",
      [original_item?.trim(), substitute_item?.trim(), reason?.trim()||null, dietary_tags?.trim()||null, parseFloat(confidence||0.80), is_active!==false, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ message: "Not found" });
    res.json({ substitution: result.rows[0] });
  } catch (err) { next(err); }
});

router.delete("/substitutions/:id", requireRole("superadmin", "admin", "manager"), async (req, res, next) => {
  try {
    await pool.query("DELETE FROM admin_substitutions WHERE id=$1", [req.params.id]);
    res.json({ message: "Substitution deleted" });
  } catch (err) { next(err); }
});

// ─── RECOMMENDATIONS ─────────────────────────────────────────────────────────
// admin_recommendations is created once in migrations.sql (#28), not per-request.

router.get("/recommendations", AI_ROLES, async (req, res, next) => {
  try {
    const { search = "", page = 1, limit: limitRaw = 50 } = req.query;
    const limit = clampLimit(limitRaw, 50);
    const params = []; const where = [];
    if (search) { params.push(`%${search}%`); where.push(`(title ILIKE $${params.length} OR trigger_condition ILIKE $${params.length} OR recommended_items ILIKE $${params.length})`); }
    const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const offset = (parseInt(page)-1)*parseInt(limit);
    const [rows, cnt] = await Promise.all([
      pool.query(`SELECT * FROM admin_recommendations ${clause} ORDER BY priority ASC, created_at DESC LIMIT $${params.length+1} OFFSET $${params.length+2}`, [...params, parseInt(limit), offset]),
      pool.query(`SELECT COUNT(*) FROM admin_recommendations ${clause}`, params),
    ]);
    res.json({ recommendations: rows.rows, total: parseInt(cnt.rows[0].count) });
  } catch (err) { next(err); }
});

router.post("/recommendations", requireRole("superadmin", "admin", "manager"), async (req, res, next) => {
  try {
    const { title, trigger_condition, recommended_items, context_tags, priority } = req.body;
    if (!title?.trim()) return res.status(400).json({ message: "Title is required" });
    if (!trigger_condition?.trim()) return res.status(400).json({ message: "Trigger condition is required" });
    if (!recommended_items?.trim()) return res.status(400).json({ message: "Recommended items are required" });
    const result = await pool.query(
      "INSERT INTO admin_recommendations (title, trigger_condition, recommended_items, context_tags, priority, created_by) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *",
      [title.trim(), trigger_condition.trim(), recommended_items.trim(), context_tags?.trim()||null, parseInt(priority||5), req.user.id]
    );
    res.status(201).json({ recommendation: result.rows[0] });
  } catch (err) { next(err); }
});

router.put("/recommendations/:id", requireRole("superadmin", "admin", "manager"), async (req, res, next) => {
  try {
    const { title, trigger_condition, recommended_items, context_tags, priority, is_active } = req.body;
    const result = await pool.query(
      "UPDATE admin_recommendations SET title=$1, trigger_condition=$2, recommended_items=$3, context_tags=$4, priority=$5, is_active=$6, updated_at=NOW() WHERE id=$7 RETURNING *",
      [title?.trim(), trigger_condition?.trim(), recommended_items?.trim(), context_tags?.trim()||null, parseInt(priority||5), is_active!==false, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ message: "Not found" });
    res.json({ recommendation: result.rows[0] });
  } catch (err) { next(err); }
});

router.delete("/recommendations/:id", requireRole("superadmin", "admin", "manager"), async (req, res, next) => {
  try {
    const result = await pool.query("DELETE FROM admin_recommendations WHERE id=$1 RETURNING id", [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ message: "Recommendation not found" });
    res.json({ message: "Recommendation deleted" });
  } catch (err) { next(err); }
});

// ─── MEALS & RECIPES CRUD ──────────────────────────────────────────────────
router.get("/meals", AI_ROLES, async (req, res, next) => {
  try {
    const { search = "", category = "", page = 1, limit: limitRaw = 50 } = req.query;
    const limit = clampLimit(limitRaw, 50);
    const params = [];
    const where = [];

    if (search) {
      params.push(`%${search}%`);
      where.push(`(m.meal_name ILIKE $${params.length} OR m.description ILIKE $${params.length} OR m.regional_context ILIKE $${params.length})`);
    }
    if (category) {
      params.push(category);
      where.push(`m.meal_category = $${params.length}`);
    }

    const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const [rows, cnt] = await Promise.all([
      pool.query(`
        SELECT m.*,
               COALESCE(
                 JSON_AGG(JSON_BUILD_OBJECT(
                   'id', mi.id,
                   'ingredient_name', mi.ingredient_name,
                   'requirement_type', mi.requirement_type,
                   'qty_per_person', mi.qty_per_person,
                   'recipe_unit', mi.recipe_unit,
                   'role_in_meal', mi.role_in_meal,
                   'importance_score', mi.importance_score
                 ) ORDER BY mi.importance_score DESC) FILTER (WHERE mi.id IS NOT NULL),
                 '[]'::JSON
               ) AS ingredients
        FROM meals m
        LEFT JOIN meal_ingredients mi ON mi.meal_id = m.meal_id
        ${clause}
        GROUP BY m.meal_id
        ORDER BY m.meal_name ASC
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}
      `, [...params, parseInt(limit), offset]),
      pool.query(`SELECT COUNT(*) FROM meals m ${clause}`, params),
    ]);

    res.json({ meals: rows.rows, total: parseInt(cnt.rows[0].count) });
  } catch (err) { next(err); }
});

router.get("/meals/:id", AI_ROLES, async (req, res, next) => {
  try {
    const mealRes = await pool.query("SELECT * FROM meals WHERE meal_id = $1", [req.params.id]);
    if (!mealRes.rows.length) return res.status(404).json({ message: "Meal not found" });

    const ingRes = await pool.query("SELECT * FROM meal_ingredients WHERE meal_id = $1 ORDER BY importance_score DESC", [req.params.id]);
    res.json({ meal: mealRes.rows[0], ingredients: ingRes.rows });
  } catch (err) { next(err); }
});

router.post("/meals", requireRole("superadmin", "manager", "kitchen_staff"), async (req, res, next) => {
  try {
    const {
      meal_name,
      meal_category = "Soups & Stews",
      cuisine_origin = "Nigerian",
      regional_context = "National",
      description = "",
      default_serving_size = 4,
      complexity = "Medium",
      supports_budget_mode = true,
      best_for = "",
      meal_time = "Lunch & Dinner",
      ingredients = []
    } = req.body;

    if (!meal_name?.trim()) return res.status(400).json({ message: "Meal name is required" });

    const meal_id = `meal-${meal_name.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-")}-${Date.now().toString().slice(-4)}`;

    const result = await pool.query(`
      INSERT INTO meals (
        meal_id, meal_name, meal_category, cuisine_origin, regional_context,
        description, default_serving_size, complexity, supports_budget_mode, best_for, meal_time
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `, [
      meal_id, meal_name.trim(), meal_category, cuisine_origin, regional_context,
      description.trim(), parseInt(default_serving_size) || 4, complexity,
      supports_budget_mode !== false, best_for.trim(), meal_time
    ]);

    if (Array.isArray(ingredients) && ingredients.length > 0) {
      for (const ing of ingredients) {
        if (ing.ingredient_name?.trim()) {
          await pool.query(`
            INSERT INTO meal_ingredients (
              meal_id, meal_name, ingredient_name, requirement_type,
              qty_per_person, recipe_unit, role_in_meal, importance_score
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          `, [
            meal_id,
            meal_name.trim(),
            ing.ingredient_name.trim(),
            ing.requirement_type || "Essential",
            parseFloat(ing.qty_per_person) || 1,
            ing.recipe_unit || "unit",
            ing.role_in_meal || "Ingredient",
            parseInt(ing.importance_score) || 5
          ]);
        }
      }
    }

    res.status(201).json({ meal: result.rows[0], message: "Meal and ingredients created successfully" });
  } catch (err) { next(err); }
});

router.put("/meals/:id", requireRole("superadmin", "manager", "kitchen_staff"), async (req, res, next) => {
  try {
    const {
      meal_name,
      meal_category,
      cuisine_origin,
      regional_context,
      description,
      default_serving_size,
      complexity,
      supports_budget_mode,
      best_for,
      meal_time,
      ingredients
    } = req.body;

    const result = await pool.query(`
      UPDATE meals SET
        meal_name = COALESCE($1, meal_name),
        meal_category = COALESCE($2, meal_category),
        cuisine_origin = COALESCE($3, cuisine_origin),
        regional_context = COALESCE($4, regional_context),
        description = COALESCE($5, description),
        default_serving_size = COALESCE($6, default_serving_size),
        complexity = COALESCE($7, complexity),
        supports_budget_mode = COALESCE($8, supports_budget_mode),
        best_for = COALESCE($9, best_for),
        meal_time = COALESCE($10, meal_time)
      WHERE meal_id = $11
      RETURNING *
    `, [
      meal_name?.trim(), meal_category, cuisine_origin, regional_context,
      description?.trim(), default_serving_size ? parseInt(default_serving_size) : null,
      complexity, supports_budget_mode, best_for?.trim(), meal_time,
      req.params.id
    ]);

    if (!result.rows.length) return res.status(404).json({ message: "Meal not found" });

    if (Array.isArray(ingredients)) {
      await pool.query("DELETE FROM meal_ingredients WHERE meal_id = $1", [req.params.id]);
      for (const ing of ingredients) {
        if (ing.ingredient_name?.trim()) {
          await pool.query(`
            INSERT INTO meal_ingredients (
              meal_id, meal_name, ingredient_name, requirement_type,
              qty_per_person, recipe_unit, role_in_meal, importance_score
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          `, [
            req.params.id,
            result.rows[0].meal_name,
            ing.ingredient_name.trim(),
            ing.requirement_type || "Essential",
            parseFloat(ing.qty_per_person) || 1,
            ing.recipe_unit || "unit",
            ing.role_in_meal || "Ingredient",
            parseInt(ing.importance_score) || 5
          ]);
        }
      }
    }

    res.json({ meal: result.rows[0], message: "Meal updated successfully" });
  } catch (err) { next(err); }
});

router.delete("/meals/:id", requireRole("superadmin", "manager"), async (req, res, next) => {
  try {
    await pool.query("DELETE FROM meal_ingredients WHERE meal_id = $1", [req.params.id]);
    const result = await pool.query("DELETE FROM meals WHERE meal_id = $1 RETURNING meal_id", [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ message: "Meal not found" });
    res.json({ message: "Meal deleted successfully" });
  } catch (err) { next(err); }
});

// ─── ALLERGY RULES CRUD ───────────────────────────────────────────────────
router.get("/allergy-rules", AI_ROLES, async (req, res, next) => {
  try {
    const { search = "", page = 1, limit: limitRaw = 50 } = req.query;
    const limit = clampLimit(limitRaw, 50);
    const params = [];
    const where = [];

    if (search) {
      params.push(`%${search}%`);
      where.push(`(allergy_name ILIKE $${params.length} OR excluded_item ILIKE $${params.length} OR substitution_guidance ILIKE $${params.length})`);
    }

    const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const [rows, cnt] = await Promise.all([
      pool.query(`SELECT * FROM allergy_rules ${clause} ORDER BY allergy_name ASC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`, [...params, parseInt(limit), offset]),
      pool.query(`SELECT COUNT(*) FROM allergy_rules ${clause}`, params),
    ]);

    res.json({ rules: rows.rows, total: parseInt(cnt.rows[0].count) });
  } catch (err) { next(err); }
});

router.post("/allergy-rules", requireRole("superadmin", "admin", "manager", "kitchen_staff"), async (req, res, next) => {
  try {
    const { allergy_name, excluded_item, action_type = "Hard Filter", substitution_guidance = "", safety_note = "" } = req.body;
    if (!allergy_name?.trim()) return res.status(400).json({ message: "Allergy name is required" });
    if (!excluded_item?.trim()) return res.status(400).json({ message: "Excluded item is required" });

    const allergy_id = `all-${allergy_name.toLowerCase().replace(/[^a-z0-9]/g, "-")}-${Date.now().toString().slice(-4)}`;

    const result = await pool.query(`
      INSERT INTO allergy_rules (allergy_id, allergy_name, excluded_item, action_type, substitution_guidance, safety_note)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [allergy_id, allergy_name.trim(), excluded_item.trim(), action_type, substitution_guidance.trim(), safety_note.trim()]);

    res.status(201).json({ rule: result.rows[0] });
  } catch (err) { next(err); }
});

router.put("/allergy-rules/:id", requireRole("superadmin", "admin", "manager", "kitchen_staff"), async (req, res, next) => {
  try {
    const { allergy_name, excluded_item, action_type, substitution_guidance, safety_note } = req.body;
    const result = await pool.query(`
      UPDATE allergy_rules SET
        allergy_name = COALESCE($1, allergy_name),
        excluded_item = COALESCE($2, excluded_item),
        action_type = COALESCE($3, action_type),
        substitution_guidance = COALESCE($4, substitution_guidance),
        safety_note = COALESCE($5, safety_note)
      WHERE allergy_id = $6
      RETURNING *
    `, [allergy_name?.trim(), excluded_item?.trim(), action_type, substitution_guidance?.trim(), safety_note?.trim(), req.params.id]);

    if (!result.rows.length) return res.status(404).json({ message: "Allergy rule not found" });
    res.json({ rule: result.rows[0] });
  } catch (err) { next(err); }
});

router.delete("/allergy-rules/:id", requireRole("superadmin", "admin", "manager"), async (req, res, next) => {
  try {
    const result = await pool.query("DELETE FROM allergy_rules WHERE allergy_id = $1 RETURNING allergy_id", [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ message: "Allergy rule not found" });
    res.json({ message: "Allergy rule deleted" });
  } catch (err) { next(err); }
});

// ─── RECIPE INGREDIENT INVENTORY & STOCK GAPS ANALYSIS ─────────────────────
router.get("/out-of-stock-ingredients", AI_ROLES, async (req, res, next) => {
  try {
    const [ingredientsRes, productsRes, substitutionsRes, mealsRes] = await Promise.all([
      pool.query(`
        SELECT mi.*, m.meal_name, m.meal_category
        FROM meal_ingredients mi
        JOIN meals m ON m.meal_id = mi.meal_id
        ORDER BY mi.importance_score DESC
      `),
      pool.query(`SELECT id, name, stock, price, unit FROM products WHERE status != 'archived'`),
      pool.query(`SELECT original_item, substitute_item FROM admin_substitutions WHERE is_active = true`),
      pool.query(`SELECT meal_id, meal_name, meal_category FROM meals ORDER BY meal_name ASC`)
    ]);

    const allIngredients = ingredientsRes.rows;
    const allProducts = productsRes.rows;
    const allSubs = substitutionsRes.rows;

    const outOfStock = [];
    const lowStock = [];
    const unlisted = [];
    const affectedMealsMap = new Map();

    const stopWords = new Set(["pure", "fresh", "rich", "style", "authentic", "nigerian", "best", "biggest", "pack", "kg", "g", "ml", "liters", "unit", "piece", "sachet", "carton", "bag", "roll", "bottle"]);

    for (const ing of allIngredients) {
      const ingRaw = ing.ingredient_name.toLowerCase();
      // Extract primary words and any bracketed aliases
      const cleanAlias = ingRaw.replace(/[\(\)]/g, " ").replace(/\s+/g, " ").trim();
      const ingKeywords = cleanAlias.split(" ").filter(w => w.length > 2 && !stopWords.has(w));

      // Find matching catalog product with score
      let bestMatch = null;
      let highestScore = 0;

      for (const p of allProducts) {
        const pName = p.name.toLowerCase();
        let score = 0;

        // Exact full phrase match
        if (pName.includes(cleanAlias) || cleanAlias.includes(pName)) {
          score += 10;
        }

        // Core noun matching
        for (const kw of ingKeywords) {
          // Avoid matching brand prefix if core product type differs (e.g. honeywell vs honey beans)
          if (kw === "beans" && pName.includes("beans")) score += 6;
          else if (kw === "rice" && pName.includes("rice")) score += 6;
          else if (kw === "tomatoes" && (pName.includes("tomato") || pName.includes("tomatoes"))) score += 6;
          else if (kw === "yam" && pName.includes("yam")) score += 6;
          else if (kw === "crayfish" && pName.includes("crayfish")) score += 6;
          else if (kw === "salt" && pName.includes("salt")) score += 6;
          else if (kw === "oil" && pName.includes("oil")) score += 4;
          else if (kw === "plantain" && pName.includes("plantain")) score += 6;
          else if (kw === "egusi" && (pName.includes("egusi") || pName.includes("melon"))) score += 6;
          else if (kw === "semovita" && pName.includes("semovita")) score += 6;
          else if (kw === "wheat" && pName.includes("wheat") && !ingRaw.includes("bean")) score += 6;
          else if (pName.includes(kw) && kw.length > 3) score += 2;
        }

        if (score > highestScore && score >= 4) {
          highestScore = score;
          bestMatch = p;
        }
      }

      const matched = bestMatch;

      // Find configured substitute if any
      const subMatch = allSubs.find(s => 
        s.original_item.toLowerCase().includes(ingRaw) || ingRaw.includes(s.original_item.toLowerCase())
      );

      const itemReport = {
        ingredient_name: ing.ingredient_name,
        meal_name: ing.meal_name,
        meal_id: ing.meal_id,
        role_in_meal: ing.role_in_meal || "Essential",
        matched_product_name: matched ? matched.name : null,
        product_id: matched ? matched.id : null,
        current_stock: matched ? (matched.stock ?? 0) : 0,
        suggested_substitute: subMatch ? subMatch.substitute_item : null,
      };

      if (!matched) {
        unlisted.push(itemReport);
        itemReport.status = "UNLISTED";
      } else if (matched.stock <= 0) {
        outOfStock.push(itemReport);
        itemReport.status = "OUT_OF_STOCK";
      } else if (matched.stock <= 5) {
        lowStock.push(itemReport);
        itemReport.status = "LOW_STOCK";
      }

      if (!matched || matched.stock <= 5) {
        if (!affectedMealsMap.has(ing.meal_id)) {
          affectedMealsMap.set(ing.meal_id, {
            meal_id: ing.meal_id,
            meal_name: ing.meal_name,
            meal_category: ing.meal_category,
            ingredients: [],
            missing_count: 0
          });
        }
        const mealRecord = affectedMealsMap.get(ing.meal_id);
        mealRecord.ingredients.push({
          ingredient_name: ing.ingredient_name,
          status: !matched ? "UNLISTED" : matched.stock <= 0 ? "OUT_OF_STOCK" : "LOW_STOCK",
          stock: matched ? matched.stock : 0
        });
        mealRecord.missing_count += 1;
      }
    }

    res.json({
      summary: {
        total_out: outOfStock.length,
        total_low: lowStock.length,
        total_unlisted: unlisted.length,
        total_meals_affected: affectedMealsMap.size
      },
      out_of_stock: outOfStock,
      low_stock: lowStock,
      unlisted: unlisted,
      affected_meals: Array.from(affectedMealsMap.values())
    });
  } catch (err) { next(err); }
});

module.exports = router;


