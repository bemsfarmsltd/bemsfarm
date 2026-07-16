// server/src/routes/ai_context.js
// Mounted at /api/ai/context in index.js
//
// User-facing memory management — lets authenticated users:
//   • view their AI context & preferences
//   • update preferences
//   • browse conversation history
//   • delete individual conversations or all AI memory (GDPR)
//   • export all their data
//   • log onboarding completion
//   • admin: view any user's context
// ───────────────────────────────────────────────────────────────────────────

const express = require("express");
const router  = express.Router();
const pool    = require("../db/pool");
const { protect, requireRole } = require("../middleware/authMiddleware");
const {
  upsertContext,
  upsertOnboarding,
  trackActivity,
  exportUserData,
  deleteAllMemory,
} = require("../utils/aiContext");

router.use(protect);

// ════════════════════════════════════════════════════════════════════════════
// GET OWN CONTEXT  ──  GET /api/ai/context/me
// ════════════════════════════════════════════════════════════════════════════
router.get("/me", async (req, res) => {
  try {
    const [ctx, onb, activityStats, convStats] = await Promise.all([
      pool.query("SELECT * FROM ai_user_context    WHERE user_id=$1", [req.user.id]),
      pool.query("SELECT * FROM ai_onboarding_data WHERE user_id=$1", [req.user.id]),
      pool.query(`
        SELECT type, COUNT(*) AS count
        FROM ai_user_activity WHERE user_id=$1
        GROUP BY type ORDER BY count DESC LIMIT 10
      `, [req.user.id]),
      pool.query(`
        SELECT COUNT(*) AS total_conversations,
               COALESCE(SUM(message_count),0) AS total_messages,
               MAX(last_message_at) AS last_chat
        FROM admin_ai_conversations WHERE user_id=$1
      `, [req.user.id]),
    ]);

    res.json({
      context:        ctx.rows[0]        || null,
      onboarding:     onb.rows[0]        || null,
      activity_stats: activityStats.rows,
      chat_stats:     convStats.rows[0]  || {},
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// UPDATE PREFERENCES  ──  PATCH /api/ai/context/me
// ════════════════════════════════════════════════════════════════════════════
router.patch("/me", async (req, res) => {
  try {
    const allowed = ["preferred_language", "preferred_currency", "preferred_theme", "timezone"];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }
    if (!Object.keys(updates).length) return res.status(400).json({ message: "No valid preference fields provided" });

    await upsertContext(req.user.id, updates);
    trackActivity(req.user.id, "setting_changed", { metadata: { fields: Object.keys(updates) } });

    const result = await pool.query("SELECT * FROM ai_user_context WHERE user_id=$1", [req.user.id]);
    res.json({ context: result.rows[0] });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// SAVE / UPDATE ONBOARDING  ──  POST /api/ai/context/onboarding
// ════════════════════════════════════════════════════════════════════════════
router.post("/onboarding", async (req, res) => {
  try {
    await upsertOnboarding(req.user.id, req.body);

    if (req.body.onboarding_complete) {
      trackActivity(req.user.id, "onboarding_completed");
    } else if (req.body.completed_steps?.length) {
      const step = req.body.completed_steps[req.body.completed_steps.length - 1];
      trackActivity(req.user.id, "onboarding_step", { metadata: { step } });
    }

    const result = await pool.query("SELECT * FROM ai_onboarding_data WHERE user_id=$1", [req.user.id]);
    res.json({ onboarding: result.rows[0] });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// ACTIVITY LOG  ──  GET /api/ai/context/activity
// ════════════════════════════════════════════════════════════════════════════
router.get("/activity", async (req, res) => {
  try {
    const { page = 1, limit = 50, type = "" } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const where  = type ? "AND type=$4" : "";
    const params = [req.user.id, parseInt(limit), offset];
    if (type) params.push(type);

    const rows = await pool.query(
      `SELECT id, type, entity_type, entity_id, metadata, created_at
       FROM ai_user_activity WHERE user_id=$1 ${where}
       ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      params
    );

    const count = await pool.query(
      `SELECT COUNT(*) FROM ai_user_activity WHERE user_id=$1 ${where}`,
      type ? [req.user.id, type] : [req.user.id]
    );

    res.json({
      activities: rows.rows,
      total: parseInt(count.rows[0].count),
      page: parseInt(page),
      pages: Math.ceil(parseInt(count.rows[0].count) / parseInt(limit)),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// CONVERSATIONS  ──  GET /api/ai/context/conversations
// ════════════════════════════════════════════════════════════════════════════
router.get("/conversations", async (req, res) => {
  try {
    const { page = 1, limit = 20, bot_type = "" } = req.query;
    const offset  = (parseInt(page) - 1) * parseInt(limit);
    const where   = bot_type ? "AND bot_type=$2" : "";
    const params  = bot_type ? [req.user.id, bot_type, parseInt(limit), offset] : [req.user.id, parseInt(limit), offset];
    const limitIdx = bot_type ? 3 : 2;

    const rows = await pool.query(
      `SELECT id, session_id, bot_type, title, summary, topics, message_count, last_message_at, archived, created_at
       FROM admin_ai_conversations WHERE user_id=$1 ${where}
       ORDER BY last_message_at DESC NULLS LAST
       LIMIT $${limitIdx} OFFSET $${limitIdx + 1}`,
      params
    );

    const count = await pool.query(
      `SELECT COUNT(*) FROM admin_ai_conversations WHERE user_id=$1 ${where}`,
      bot_type ? [req.user.id, bot_type] : [req.user.id]
    );

    res.json({
      conversations: rows.rows,
      total: parseInt(count.rows[0].count),
      page: parseInt(page),
      pages: Math.ceil(parseInt(count.rows[0].count) / parseInt(limit)),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// CONVERSATION MESSAGES  ──  GET /api/ai/context/conversations/:id
router.get("/conversations/:id", async (req, res) => {
  try {
    const conv = await pool.query(
      "SELECT * FROM admin_ai_conversations WHERE id=$1 AND user_id=$2",
      [req.params.id, req.user.id]
    );
    if (!conv.rows.length) return res.status(404).json({ message: "Conversation not found" });

    const messages = await pool.query(
      "SELECT id, role, content, source, created_at FROM ai_conversation_messages WHERE conversation_id=$1 ORDER BY created_at",
      [req.params.id]
    );

    res.json({ ...conv.rows[0], messages: messages.rows });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE CONVERSATION  ──  DELETE /api/ai/context/conversations/:id
router.delete("/conversations/:id", async (req, res) => {
  try {
    const result = await pool.query(
      "DELETE FROM admin_ai_conversations WHERE id=$1 AND user_id=$2 RETURNING id",
      [req.params.id, req.user.id]
    );
    if (!result.rows.length) return res.status(404).json({ message: "Conversation not found" });
    res.json({ message: "Conversation deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// EXPORT ALL DATA  ──  GET /api/ai/context/export  (GDPR)
// ════════════════════════════════════════════════════════════════════════════
router.get("/export", async (req, res) => {
  try {
    const data = await exportUserData(req.user.id);
    trackActivity(req.user.id, "data_export_requested");

    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", `attachment; filename="ai-memory-${req.user.id}-${Date.now()}.json"`);
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// DELETE ALL AI MEMORY  ──  DELETE /api/ai/context/memory  (GDPR)
// ════════════════════════════════════════════════════════════════════════════
router.delete("/memory", async (req, res) => {
  try {
    await deleteAllMemory(req.user.id);
    res.json({ message: "All AI memory cleared for your account" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// ADMIN: VIEW ANY USER'S CONTEXT  ──  GET /api/ai/context/users/:userId
// ════════════════════════════════════════════════════════════════════════════
router.get("/users/:userId", requireRole("superadmin", "manager"), async (req, res) => {
  try {
    const uid = parseInt(req.params.userId);
    const [ctx, onb, recentActivity] = await Promise.all([
      pool.query("SELECT * FROM ai_user_context    WHERE user_id=$1", [uid]),
      pool.query("SELECT * FROM ai_onboarding_data WHERE user_id=$1", [uid]),
      pool.query(`
        SELECT type, entity_type, entity_id, metadata, created_at
        FROM ai_user_activity WHERE user_id=$1
        ORDER BY created_at DESC LIMIT 30
      `, [uid]),
    ]);

    // Log admin access for audit trail
    trackActivity(req.user.id, "admin_viewed_user_context", { entityType: "user", entityId: uid });

    res.json({
      context:         ctx.rows[0]       || null,
      onboarding:      onb.rows[0]       || null,
      recent_activity: recentActivity.rows,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// ADMIN: LIST CONTEXT HEALTH  ──  GET /api/ai/context/admin/stats
// ════════════════════════════════════════════════════════════════════════════
router.get("/admin/stats", requireRole("superadmin"), async (req, res) => {
  try {
    const [contextStats, activityStats, convStats] = await Promise.all([
      pool.query(`
        SELECT
          COUNT(*) AS users_with_context,
          COUNT(*) FILTER (WHERE last_activity > NOW()-INTERVAL '24 hours') AS active_24h,
          COUNT(*) FILTER (WHERE last_activity > NOW()-INTERVAL '7 days')   AS active_7d,
          AVG(context_version) AS avg_context_version
        FROM ai_user_context
      `),
      pool.query(`
        SELECT type, COUNT(*) AS count
        FROM ai_user_activity
        WHERE created_at > NOW()-INTERVAL '7 days'
        GROUP BY type ORDER BY count DESC LIMIT 15
      `),
      pool.query(`
        SELECT
          COUNT(*) AS total_conversations,
          COALESCE(SUM(message_count),0) AS total_messages,
          COUNT(*) FILTER (WHERE created_at > NOW()-INTERVAL '24 hours') AS conversations_24h
        FROM admin_ai_conversations
      `),
    ]);

    res.json({
      context_stats:   contextStats.rows[0],
      top_activities:  activityStats.rows,
      conv_stats:      convStats.rows[0],
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// RENAME CONVERSATION  ──  PATCH /api/ai/context/conversations/:id
router.patch("/conversations/:id", async (req, res) => {
  try {
    const { title } = req.body;
    if (!title?.trim()) return res.status(400).json({ message: "title required" });

    const result = await pool.query(
      "UPDATE admin_ai_conversations SET title=$1 WHERE id=$2 AND user_id=$3 RETURNING *",
      [title.trim(), req.params.id, req.user.id]
    );
    if (!result.rows.length) return res.status(404).json({ message: "Conversation not found" });
    res.json({ conversation: result.rows[0] });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
