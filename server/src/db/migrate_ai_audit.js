"use strict";
require("dotenv").config({ path: require("path").resolve(__dirname, "../../.env") });
const pool = require("./pool");

async function migrate() {
  console.log("⚡ Running AI Audit Logs & Guest Tracking Migration...");

  try {
    // 1. Create ai_audit_logs table
    await pool.query(`
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
        created_at      TIMESTAMP    DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_ai_audit_created ON ai_audit_logs(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_ai_audit_ip ON ai_audit_logs(ip_address, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_ai_audit_user ON ai_audit_logs(user_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_ai_audit_bot ON ai_audit_logs(bot_type, created_at DESC);

      -- Add ip_address and guest_name to admin_ai_conversations if missing
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='admin_ai_conversations' AND column_name='ip_address') THEN
          ALTER TABLE admin_ai_conversations ADD COLUMN ip_address VARCHAR(60);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='admin_ai_conversations' AND column_name='guest_identifier') THEN
          ALTER TABLE admin_ai_conversations ADD COLUMN guest_identifier VARCHAR(150);
        END IF;
      END $$;
    `);

    console.log("✅ ai_audit_logs table and indices verified successfully!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Migration failed:", err);
    process.exit(1);
  }
}

migrate();
