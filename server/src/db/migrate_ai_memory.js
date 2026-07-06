const { Pool } = require("pg");
require("dotenv").config({ path: require("path").resolve(__dirname, "../../.env") });

const migrationSql = `
  -- 1. Core User Context (one row per user, updated on login/preferences change)
  CREATE TABLE IF NOT EXISTS ai_user_context (
    id                 SERIAL PRIMARY KEY,
    user_id            INT UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    full_name          VARCHAR(255),
    email              VARCHAR(255),
    phone              VARCHAR(20),
    role               VARCHAR(30),
    registered_at      TIMESTAMP,
    last_login         TIMESTAMP,
    last_activity      TIMESTAMP DEFAULT NOW(),
    preferred_language VARCHAR(10)  DEFAULT 'en',
    preferred_currency VARCHAR(10)  DEFAULT 'NGN',
    preferred_theme    VARCHAR(10)  DEFAULT 'light',
    timezone           VARCHAR(50)  DEFAULT 'Africa/Lagos',
    context_version    INT          DEFAULT 1,
    raw_context        JSONB        DEFAULT '{}',
    updated_at         TIMESTAMP    DEFAULT NOW()
  );

  -- 2. Onboarding Data (one row per user detailing business setup details)
  CREATE TABLE IF NOT EXISTS ai_onboarding_data (
    id                  SERIAL PRIMARY KEY,
    user_id             INT UNIQUE REFERENCES users(id) ON DELETE CASCADE,
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

  -- 3. User Activity Log (append-only log tracking system events)
  CREATE TABLE IF NOT EXISTS ai_user_activity (
    id          SERIAL PRIMARY KEY,
    user_id     INT    REFERENCES users(id) ON DELETE CASCADE,
    type        VARCHAR(60) NOT NULL,
    entity_type VARCHAR(50),
    entity_id   VARCHAR(60),
    metadata    JSONB       DEFAULT '{}',
    ip_address  VARCHAR(45),
    created_at  TIMESTAMP   DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS idx_ai_activity_user ON ai_user_activity(user_id, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_ai_activity_type ON ai_user_activity(type, created_at DESC);

  -- 4. Conversation Sessions (summarizes chat interactions)
  CREATE TABLE IF NOT EXISTS admin_ai_conversations (
    id              SERIAL PRIMARY KEY,
    user_id         INT REFERENCES users(id) ON DELETE CASCADE,
    session_id      VARCHAR(100),
    bot_type        VARCHAR(30) DEFAULT 'general',  -- general | chef | admin
    title           VARCHAR(255),
    summary         TEXT,
    topics          JSONB    DEFAULT '[]',
    message_count   INT      DEFAULT 0,
    last_message_at TIMESTAMP,
    archived        BOOLEAN  DEFAULT false,
    created_at      TIMESTAMP DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS idx_ai_conv_user ON admin_ai_conversations(user_id, created_at DESC);

  -- 5. Conversation Messages (holds individual lines of chat history)
  CREATE TABLE IF NOT EXISTS ai_conversation_messages (
    id              SERIAL  PRIMARY KEY,
    conversation_id INT     REFERENCES admin_ai_conversations(id) ON DELETE CASCADE,
    role            VARCHAR(10) NOT NULL,  -- user | assistant | system
    content         TEXT    NOT NULL,
    source          VARCHAR(30),           -- gemini | rule-based | fallback | context
    created_at      TIMESTAMP DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS idx_ai_messages_conv ON ai_conversation_messages(conversation_id, created_at);
`;

async function runMigration() {
  console.log("Connecting to Database...");
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: false
  });
  
  const client = await pool.connect();
  try {
    console.log("Applying AI memory schema migration...");
    await client.query(migrationSql);
    console.log("🎉 AI Memory schema migration applied successfully!");
  } catch (err) {
    console.error("❌ AI Memory schema migration failed:", err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
    process.exit(0);
  }
}

runMigration();
