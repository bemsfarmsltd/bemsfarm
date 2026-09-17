"use strict";

const pool = require("../db/pool");

/**
 * Log an AI request/response into the ai_audit_logs table and system_audit_events.
 * Non-blocking: will never throw or crash the calling API request.
 */
async function recordAiAudit({
  req,
  user = null,
  botType = "chef",
  sessionId = null,
  prompt = "",
  response = "",
  tokensUsed = 0,
  source = "gemini",
  status = "success",
  errorMessage = null,
}) {
  try {
    const ip =
      req?.headers?.["cf-connecting-ip"] ||
      req?.headers?.["x-real-ip"] ||
      (req?.headers?.["x-forwarded-for"] ? req.headers["x-forwarded-for"].split(",")[0].trim() : null) ||
      req?.ip ||
      req?.connection?.remoteAddress ||
      "127.0.0.1";

    const userAgent = req?.headers?.["user-agent"] || "Unknown";

    const userId = user?.id || null;
    const userName = user?.name || (userId ? `User #${userId}` : "Anonymous Guest");
    const userEmail = user?.email || (req?.body?.email || req?.body?.customerEmail || null);
    const userRole = user?.role || "guest";

    // Estimate tokens if not provided (approx 1 token per 4 characters)
    const estimatedTokens =
      tokensUsed ||
      Math.max(1, Math.ceil(((prompt?.length || 0) + (response?.length || 0)) / 4));

    // 1. Insert into ai_audit_logs
    await pool.query(
      `INSERT INTO ai_audit_logs 
        (user_id, user_name, user_email, user_role, ip_address, user_agent, bot_type, session_id, prompt, response, tokens_used, source, status, error_message, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW())`,
      [
        userId,
        userName,
        userEmail,
        userRole,
        ip,
        userAgent,
        botType,
        sessionId,
        prompt ? prompt.slice(0, 4000) : null,
        response ? response.slice(0, 4000) : null,
        estimatedTokens,
        source,
        status,
        errorMessage ? String(errorMessage).slice(0, 1000) : null,
      ]
    );

    // 2. Also record in system_audit_events for God Eye
    await pool.query(
      `INSERT INTO system_audit_events 
        (source, action, actor_id, actor_name, actor_role, ip_address, user_agent, category, severity, outcome, details, occurred_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'ai', $8, $9, $10, NOW())`,
      [
        `ai_${botType}`,
        status === "success" ? `AI Prompt: ${prompt ? prompt.slice(0, 50) + "..." : "Chat interaction"}` : `AI Error / Blocked`,
        userId,
        userName,
        userRole,
        ip,
        userAgent,
        status === "error" ? "warning" : "info",
        status,
        JSON.stringify({
          botType,
          source,
          sessionId,
          promptSnippet: prompt ? prompt.slice(0, 150) : null,
          tokensEstimated: estimatedTokens,
          error: errorMessage || null,
        }),
      ]
    );
  } catch (err) {
    console.warn("[aiAuditService] recordAiAudit failed (non-critical):", err.message);
  }
}

module.exports = {
  recordAiAudit,
};
