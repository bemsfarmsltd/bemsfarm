// server/src/utils/aiContext.js
// Central helper for all AI user context operations.
// Used by: routes/ai.js, routes/ai_context.js, routes/auth.js,
//          and any future module that wants to track activity.
//
// ── REQUIRED SCHEMA MIGRATIONS ─────────────────────────────────────────────
//
// -- CORE USER CONTEXT (one row per user, upserted on every significant event)
// CREATE TABLE IF NOT EXISTS ai_user_context (
//   id                 SERIAL PRIMARY KEY,
//   user_id            INT UNIQUE REFERENCES users(id) ON DELETE CASCADE,
//   full_name          VARCHAR(255),
//   email              VARCHAR(255),
//   phone              VARCHAR(20),
//   role               VARCHAR(30),
//   registered_at      TIMESTAMP,
//   last_login         TIMESTAMP,
//   last_activity      TIMESTAMP DEFAULT NOW(),
//   preferred_language VARCHAR(10)  DEFAULT 'en',
//   preferred_currency VARCHAR(10)  DEFAULT 'NGN',
//   preferred_theme    VARCHAR(10)  DEFAULT 'light',
//   timezone           VARCHAR(50)  DEFAULT 'Africa/Lagos',
//   context_version    INT          DEFAULT 1,
//   raw_context        JSONB        DEFAULT '{}',
//   updated_at         TIMESTAMP    DEFAULT NOW()
// );
//
// -- ONBOARDING / BUSINESS DATA (one row per user)
// CREATE TABLE IF NOT EXISTS ai_onboarding_data (
//   id                  SERIAL PRIMARY KEY,
//   user_id             INT UNIQUE REFERENCES users(id) ON DELETE CASCADE,
//   business_name       VARCHAR(255),
//   business_type       VARCHAR(100),
//   industry            VARCHAR(100),
//   business_size       VARCHAR(50),
//   store_name          VARCHAR(255),
//   country             VARCHAR(100) DEFAULT 'Nigeria',
//   state               VARCHAR(100),
//   city                VARCHAR(100),
//   goals               JSONB        DEFAULT '[]',
//   completed_steps     JSONB        DEFAULT '[]',
//   onboarding_complete BOOLEAN      DEFAULT false,
//   created_at          TIMESTAMP    DEFAULT NOW(),
//   updated_at          TIMESTAMP    DEFAULT NOW()
// );
//
// -- ACTIVITY LOG (append-only, never updated)
// CREATE TABLE IF NOT EXISTS ai_user_activity (
//   id          SERIAL PRIMARY KEY,
//   user_id     INT    REFERENCES users(id) ON DELETE CASCADE,
//   type        VARCHAR(60) NOT NULL,
//   entity_type VARCHAR(50),
//   entity_id   VARCHAR(60),
//   metadata    JSONB       DEFAULT '{}',
//   ip_address  VARCHAR(45),
//   created_at  TIMESTAMP   DEFAULT NOW()
// );
// CREATE INDEX IF NOT EXISTS idx_ai_activity_user ON ai_user_activity(user_id, created_at DESC);
// CREATE INDEX IF NOT EXISTS idx_ai_activity_type ON ai_user_activity(type, created_at DESC);
//
// -- CONVERSATION SESSIONS
// CREATE TABLE IF NOT EXISTS admin_ai_conversations (
//   id              SERIAL PRIMARY KEY,
//   user_id         INT REFERENCES users(id) ON DELETE CASCADE,
//   session_id      VARCHAR(100),
//   bot_type        VARCHAR(30) DEFAULT 'general',  -- general | chef | admin
//   title           VARCHAR(255),
//   summary         TEXT,
//   topics          JSONB    DEFAULT '[]',
//   message_count   INT      DEFAULT 0,
//   last_message_at TIMESTAMP,
//   archived        BOOLEAN  DEFAULT false,
//   created_at      TIMESTAMP DEFAULT NOW()
// );
// CREATE INDEX IF NOT EXISTS idx_ai_conv_user ON admin_ai_conversations(user_id, created_at DESC);
//
// -- CONVERSATION MESSAGES
// CREATE TABLE IF NOT EXISTS ai_conversation_messages (
//   id              SERIAL  PRIMARY KEY,
//   conversation_id INT     REFERENCES admin_ai_conversations(id) ON DELETE CASCADE,
//   role            VARCHAR(10) NOT NULL,  -- user | assistant | system
//   content         TEXT    NOT NULL,
//   source          VARCHAR(30),           -- gemini | rule-based | fallback | context
//   created_at      TIMESTAMP DEFAULT NOW()
// );
// CREATE INDEX IF NOT EXISTS idx_ai_messages_conv ON ai_conversation_messages(conversation_id, created_at);
//
// ───────────────────────────────────────────────────────────────────────────

"use strict";

const pool = require("../db/pool");

// ════════════════════════════════════════════════════════════════════════════
// CONTEXT UPSERT
// Call this after any significant user event (login, profile update, etc.)
// ════════════════════════════════════════════════════════════════════════════
async function upsertContext(userId, updates = {}) {
  try {
    await pool.query(
      `INSERT INTO ai_user_context
         (user_id, full_name, email, phone, role, registered_at, last_login, last_activity,
          preferred_language, preferred_currency, preferred_theme, timezone, raw_context, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,NOW(),$8,$9,$10,$11,$12::JSONB,NOW())
       ON CONFLICT (user_id) DO UPDATE SET
         full_name          = COALESCE($2, ai_user_context.full_name),
         email              = COALESCE($3, ai_user_context.email),
         phone              = COALESCE($4, ai_user_context.phone),
         role               = COALESCE($5, ai_user_context.role),
         registered_at      = COALESCE($6, ai_user_context.registered_at),
         last_login         = COALESCE($7, ai_user_context.last_login),
         last_activity      = NOW(),
         preferred_language = COALESCE($8, ai_user_context.preferred_language),
         preferred_currency = COALESCE($9, ai_user_context.preferred_currency),
         preferred_theme    = COALESCE($10, ai_user_context.preferred_theme),
         timezone           = COALESCE($11, ai_user_context.timezone),
         raw_context        = ai_user_context.raw_context || COALESCE($12::JSONB, '{}'),
         context_version    = ai_user_context.context_version + 1,
         updated_at         = NOW()`,
      [
        userId,
        updates.full_name         || null,
        updates.email             || null,
        updates.phone             || null,
        updates.role              || null,
        updates.registered_at     || null,
        updates.last_login        || null,
        updates.preferred_language || null,
        updates.preferred_currency || null,
        updates.preferred_theme    || null,
        updates.timezone           || null,
        updates.raw_context ? JSON.stringify(updates.raw_context) : null,
      ]
    );
  } catch (err) {
    // Context sync is non-critical — log but never crash the calling request
    console.warn("[aiContext] upsertContext failed:", err.message);
  }
}

// ════════════════════════════════════════════════════════════════════════════
// ACTIVITY TRACKER
// Fire-and-forget. Never awaited in the critical path.
// type examples: 'login' | 'logout' | 'order_created' | 'product_viewed' |
//   'product_purchased' | 'return_processed' | 'inventory_updated' |
//   'report_viewed' | 'ai_chat' | 'setting_changed' | 'onboarding_step'
// ════════════════════════════════════════════════════════════════════════════
function trackActivity(userId, type, { entityType, entityId, metadata, ip } = {}) {
  pool
    .query(
      `INSERT INTO ai_user_activity (user_id, type, entity_type, entity_id, metadata, ip_address, created_at)
       VALUES ($1,$2,$3,$4,$5::JSONB,$6,NOW())`,
      [
        userId,
        type,
        entityType || null,
        entityId   ? String(entityId) : null,
        JSON.stringify(metadata || {}),
        ip         || null,
      ]
    )
    .catch((err) => console.warn("[aiContext] trackActivity failed:", err.message));

  // Also bump last_activity timestamp
  pool
    .query("UPDATE ai_user_context SET last_activity=NOW(), updated_at=NOW() WHERE user_id=$1", [userId])
    .catch(() => {});
}

// ════════════════════════════════════════════════════════════════════════════
// ONBOARDING UPSERT
// ════════════════════════════════════════════════════════════════════════════
async function upsertOnboarding(userId, data = {}) {
  try {
    await pool.query(
      `INSERT INTO ai_onboarding_data
         (user_id, business_name, business_type, industry, business_size, store_name,
          country, state, city, goals, completed_steps, onboarding_complete, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::JSONB,$11::JSONB,$12,NOW(),NOW())
       ON CONFLICT (user_id) DO UPDATE SET
         business_name       = COALESCE($2,  ai_onboarding_data.business_name),
         business_type       = COALESCE($3,  ai_onboarding_data.business_type),
         industry            = COALESCE($4,  ai_onboarding_data.industry),
         business_size       = COALESCE($5,  ai_onboarding_data.business_size),
         store_name          = COALESCE($6,  ai_onboarding_data.store_name),
         country             = COALESCE($7,  ai_onboarding_data.country),
         state               = COALESCE($8,  ai_onboarding_data.state),
         city                = COALESCE($9,  ai_onboarding_data.city),
         goals               = COALESCE($10::JSONB, ai_onboarding_data.goals),
         completed_steps     = COALESCE($11::JSONB, ai_onboarding_data.completed_steps),
         onboarding_complete = COALESCE($12, ai_onboarding_data.onboarding_complete),
         updated_at          = NOW()`,
      [
        userId,
        data.business_name       || null,
        data.business_type       || null,
        data.industry            || null,
        data.business_size       || null,
        data.store_name          || null,
        data.country             || null,
        data.state               || null,
        data.city                || null,
        data.goals               ? JSON.stringify(data.goals) : null,
        data.completed_steps     ? JSON.stringify(data.completed_steps) : null,
        data.onboarding_complete != null ? data.onboarding_complete : null,
      ]
    );
  } catch (err) {
    console.warn("[aiContext] upsertOnboarding failed:", err.message);
  }
}

// ════════════════════════════════════════════════════════════════════════════
// BUILD CONTEXT STRING FOR AI PROMPT INJECTION
// Returns a compact, readable context block to prepend to any AI system prompt.
// Loads only what's needed — no full message history.
// ════════════════════════════════════════════════════════════════════════════
async function buildContextString(userId) {
  try {
    const [ctxRow, onbRow, recentActivity, convSummaries] = await Promise.all([

      pool.query("SELECT * FROM ai_user_context WHERE user_id=$1", [userId]),

      pool.query("SELECT * FROM ai_onboarding_data WHERE user_id=$1", [userId]),

      // Last 8 distinct activity types in the past 24 hours
      pool.query(`
        SELECT type, entity_type, entity_id, metadata, created_at
        FROM ai_user_activity
        WHERE user_id=$1 AND created_at > NOW() - INTERVAL '24 hours'
        ORDER BY created_at DESC LIMIT 8
      `, [userId]),

      // Last 3 conversation summaries for context continuity
      pool.query(`
        SELECT summary, topics, bot_type, created_at
        FROM admin_ai_conversations
        WHERE user_id=$1 AND summary IS NOT NULL AND archived=false
        ORDER BY created_at DESC LIMIT 3
      `, [userId]),
    ]);

    const ctx = ctxRow.rows[0];
    const onb = onbRow.rows[0];

    if (!ctx && !onb) return null;

    const lines = [];

    lines.push("─── USER CONTEXT (Authenticated) ───");

    if (ctx) {
      lines.push(`Name: ${ctx.full_name || "Unknown"} | Role: ${ctx.role || "user"} | Currency: ${ctx.preferred_currency || "NGN"} | Theme: ${ctx.preferred_theme || "light"}`);
      if (ctx.last_login) {
        const minsAgo = Math.round((Date.now() - new Date(ctx.last_login)) / 60000);
        const loginAgo = minsAgo < 60 ? `${minsAgo} min ago` : `${Math.round(minsAgo / 60)}h ago`;
        lines.push(`Last login: ${loginAgo}`);
      }
    }

    if (onb) {
      const bizParts = [onb.business_name, onb.business_type, onb.city, onb.state].filter(Boolean);
      if (bizParts.length) lines.push(`Business: ${bizParts.join(", ")}`);
      if (onb.goals?.length) lines.push(`Goals: ${onb.goals.slice(0, 3).join(", ")}`);
      if (!onb.onboarding_complete) lines.push("Note: onboarding not yet complete");
    }

    if (recentActivity.rows.length) {
      const activitySummary = recentActivity.rows
        .map((a) => {
          const meta = a.metadata || {};
          const label = a.entity_id ? `${a.type}:${a.entity_id}` : a.type;
          return label;
        })
        .join(", ");
      lines.push(`Recent activity: ${activitySummary}`);
    }

    if (convSummaries.rows.length) {
      const topicSet = new Set();
      convSummaries.rows.forEach((c) => {
        if (Array.isArray(c.topics)) c.topics.forEach((t) => topicSet.add(t));
      });
      if (topicSet.size) lines.push(`Past AI topics: ${[...topicSet].slice(0, 5).join(", ")}`);

      const lastSummary = convSummaries.rows[0]?.summary;
      if (lastSummary) lines.push(`Last conversation summary: ${lastSummary.slice(0, 200)}`);
    }

    lines.push("─── (Use the above to personalize your response. Do not repeat this block to the user.) ───");

    return lines.join("\n");
  } catch (err) {
    console.warn("[aiContext] buildContextString failed:", err.message);
    return null;
  }
}

// ════════════════════════════════════════════════════════════════════════════
// CONVERSATION MANAGEMENT
// ════════════════════════════════════════════════════════════════════════════
async function getOrCreateConversation(userId, sessionId, botType = "general") {
  try {
    // Re-use existing open conversation from same session
    const existing = await pool.query(
      `SELECT id FROM admin_ai_conversations
       WHERE user_id=$1 AND session_id=$2 AND bot_type=$3 AND archived=false
       ORDER BY created_at DESC LIMIT 1`,
      [userId, sessionId, botType]
    );
    if (existing.rows.length) return existing.rows[0].id;

    const result = await pool.query(
      `INSERT INTO admin_ai_conversations (user_id, session_id, bot_type, message_count, created_at)
       VALUES ($1,$2,$3,0,NOW()) RETURNING id`,
      [userId, sessionId, botType]
    );
    return result.rows[0].id;
  } catch (err) {
    console.warn("[aiContext] getOrCreateConversation failed:", err.message);
    return null;
  }
}

async function saveMessages(conversationId, messages = []) {
  // messages: [{ role, content, source }]
  if (!conversationId || !messages.length) return;
  try {
    const values = messages
      .map((_, i) => `($1, $${i * 3 + 2}, $${i * 3 + 3}, $${i * 3 + 4}, NOW())`)
      .join(", ");
    const params = [conversationId, ...messages.flatMap((m) => [m.role, m.content, m.source || null])];

    await pool.query(
      `INSERT INTO ai_conversation_messages (conversation_id, role, content, source, created_at) VALUES ${values}`,
      params
    );

    await pool.query(
      `UPDATE admin_ai_conversations SET
         message_count   = message_count + $2,
         last_message_at = NOW()
       WHERE id=$1`,
      [conversationId, messages.length]
    );
  } catch (err) {
    console.warn("[aiContext] saveMessages failed:", err.message);
  }
}

// ════════════════════════════════════════════════════════════════════════════
// CONVERSATION SUMMARIZER
// Called when a conversation reaches 20+ messages to archive the history
// and store a compact summary for future context injection.
// ════════════════════════════════════════════════════════════════════════════
async function maybeSummarizeConversation(conversationId, callGeminiRaw) {
  try {
    const conv = await pool.query(
      "SELECT message_count, summary FROM admin_ai_conversations WHERE id=$1",
      [conversationId]
    );
    if (!conv.rows.length || conv.rows[0].message_count < 20 || conv.rows[0].summary) return;

    const messages = await pool.query(
      `SELECT role, content FROM ai_conversation_messages
       WHERE conversation_id=$1 ORDER BY created_at LIMIT 20`,
      [conversationId]
    );

    if (!messages.rows.length) return;

    const transcript = messages.rows
      .map((m) => `${m.role === "user" ? "User" : "AI"}: ${m.content}`)
      .join("\n");

    const prompt = `Summarize this AI conversation in 2-3 sentences. Focus on what the user asked about, any key decisions, and topics covered. Be specific. Conversation:\n${transcript}`;

    const summary = await callGeminiRaw(prompt, { maxOutputTokens: 150, temperature: 0.3 });

    // Extract topics (simple keyword approach)
    const topicKeywords = ["inventory", "orders", "staff", "sales", "report", "delivery", "products", "accounts", "payroll", "settings"];
    const topics = topicKeywords.filter((t) => transcript.toLowerCase().includes(t));

    await pool.query(
      "UPDATE admin_ai_conversations SET summary=$1, topics=$2::JSONB, archived=true WHERE id=$3",
      [summary, JSON.stringify(topics), conversationId]
    );
  } catch (err) {
    console.warn("[aiContext] maybeSummarizeConversation failed:", err.message);
  }
}

// ════════════════════════════════════════════════════════════════════════════
// GDPR: LOAD FULL USER DATA EXPORT
// ════════════════════════════════════════════════════════════════════════════
async function exportUserData(userId) {
  const [ctx, onb, activities, conversations] = await Promise.all([
    pool.query("SELECT * FROM ai_user_context    WHERE user_id=$1", [userId]),
    pool.query("SELECT * FROM ai_onboarding_data WHERE user_id=$1", [userId]),
    pool.query("SELECT * FROM ai_user_activity   WHERE user_id=$1 ORDER BY created_at DESC LIMIT 500", [userId]),
    pool.query(`
      SELECT c.*, COALESCE(
        JSON_AGG(m.* ORDER BY m.created_at) FILTER (WHERE m.id IS NOT NULL), '[]'
      ) AS messages
      FROM admin_ai_conversations c
      LEFT JOIN ai_conversation_messages m ON m.conversation_id = c.id
      WHERE c.user_id=$1
      GROUP BY c.id ORDER BY c.created_at DESC
    `, [userId]),
  ]);

  return {
    context:       ctx.rows[0]        || null,
    onboarding:    onb.rows[0]        || null,
    activities:    activities.rows,
    conversations: conversations.rows,
    exported_at:   new Date().toISOString(),
  };
}

// ════════════════════════════════════════════════════════════════════════════
// GDPR: DELETE ALL AI MEMORY FOR A USER
// ════════════════════════════════════════════════════════════════════════════
async function deleteAllMemory(userId) {
  // Cascade handles messages via FK. We delete conversations, activity, onboarding, context.
  await pool.query("DELETE FROM admin_ai_conversations  WHERE user_id=$1", [userId]);
  await pool.query("DELETE FROM ai_user_activity  WHERE user_id=$1", [userId]);
  await pool.query("DELETE FROM ai_onboarding_data WHERE user_id=$1", [userId]);
  await pool.query("DELETE FROM ai_user_context    WHERE user_id=$1", [userId]);
}

module.exports = {
  upsertContext,
  upsertOnboarding,
  trackActivity,
  buildContextString,
  getOrCreateConversation,
  saveMessages,
  maybeSummarizeConversation,
  exportUserData,
  deleteAllMemory,
};
