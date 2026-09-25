// server/src/db/migrate_chat_support.js
// Idempotent migration for Enhanced Customer & Driver Support Chat with Order/Delivery Referencing

const pool = require("./pool");

async function initChatSupportTables() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1. Upgrade customer_messages to support order referencing & metadata
    await client.query(`
      ALTER TABLE customer_messages ADD COLUMN IF NOT EXISTS order_id VARCHAR(100);
      ALTER TABLE customer_messages ADD COLUMN IF NOT EXISTS delivery_id INTEGER;
      ALTER TABLE customer_messages ADD COLUMN IF NOT EXISTS metadata JSONB;
      ALTER TABLE user_addresses ADD COLUMN IF NOT EXISTS postal_code VARCHAR(30);
    `);

    // 2. Driver Support Conversations
    await client.query(`
      CREATE TABLE IF NOT EXISTS driver_conversations (
        id SERIAL PRIMARY KEY,
        driver_id INTEGER NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
        status VARCHAR(20) DEFAULT 'open',
        last_message TEXT,
        last_message_at TIMESTAMPTZ DEFAULT NOW(),
        active_order_id VARCHAR(100),
        active_delivery_id INTEGER,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        CONSTRAINT uq_driver_conversation UNIQUE (driver_id)
      );
      CREATE INDEX IF NOT EXISTS idx_driver_conv_driver ON driver_conversations(driver_id);
      CREATE INDEX IF NOT EXISTS idx_driver_conv_updated ON driver_conversations(last_message_at DESC);
    `);

    // 3. Driver Support Messages
    await client.query(`
      CREATE TABLE IF NOT EXISTS driver_messages (
        id SERIAL PRIMARY KEY,
        conversation_id INTEGER REFERENCES driver_conversations(id) ON DELETE CASCADE,
        driver_id INTEGER NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
        sender_type VARCHAR(20) NOT NULL, -- 'driver' | 'admin' | 'bot'
        admin_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        message TEXT NOT NULL,
        order_id VARCHAR(100),
        delivery_id INTEGER,
        metadata JSONB,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_driver_messages_conv ON driver_messages(conversation_id, created_at ASC);
      CREATE INDEX IF NOT EXISTS idx_driver_messages_drv ON driver_messages(driver_id, created_at ASC);
      CREATE INDEX IF NOT EXISTS idx_driver_messages_order ON driver_messages(order_id);
    `);

    await client.query("COMMIT");
    console.log("✅ Chat support tables & order referencing schema ready.");
  } catch (err) {
    await client.query("ROLLBACK");
    console.warn("⚠️ Chat support tables initialization warning:", err.message);
  } finally {
    client.release();
  }
}

module.exports = { initChatSupportTables };
