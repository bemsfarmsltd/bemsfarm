// server/src/db/migrate_crm_chat_broadcast.js
// Migration and idempotent schema initializer for:
// 1. Customer <-> Admin Support Live Chat (customer_conversations, customer_messages)
// 2. Customer Broadcasts (single or all customers) and Login Pop-up Card dismissals (customer_broadcasts, customer_broadcast_reads)
// 3. Product Demand Telemetry for Out-of-Stock click tracking and procurement planning

const pool = require("./pool");

const migrationSql = `
  -- 1. Support Chat Conversations
  CREATE TABLE IF NOT EXISTS customer_conversations (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'open',
    last_message TEXT,
    last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT uq_customer_conversation UNIQUE (customer_id)
  );

  -- 2. Support Chat Messages
  CREATE TABLE IF NOT EXISTS customer_messages (
    id SERIAL PRIMARY KEY,
    conversation_id INTEGER REFERENCES customer_conversations(id) ON DELETE CASCADE,
    customer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    sender_type VARCHAR(20) NOT NULL, -- 'customer' | 'admin'
    admin_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS idx_customer_messages_conv ON customer_messages(conversation_id, created_at ASC);
  CREATE INDEX IF NOT EXISTS idx_customer_messages_cust ON customer_messages(customer_id, created_at ASC);

  -- 3. Customer Broadcasts
  CREATE TABLE IF NOT EXISTS customer_broadcasts (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'announcement', -- 'announcement', 'promotion', 'alert', 'personal'
    target_type VARCHAR(20) DEFAULT 'all', -- 'all' | 'single'
    customer_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    action_label VARCHAR(100),
    action_url VARCHAR(255),
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    status VARCHAR(20) DEFAULT 'active', -- 'active' | 'archived'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS idx_customer_broadcasts_target ON customer_broadcasts(target_type, customer_id, status);

  -- 4. Customer Broadcast Dismissals / Reads
  CREATE TABLE IF NOT EXISTS customer_broadcast_reads (
    id SERIAL PRIMARY KEY,
    broadcast_id INTEGER NOT NULL REFERENCES customer_broadcasts(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    dismissed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT uq_user_broadcast_dismiss UNIQUE (broadcast_id, user_id)
  );

  -- 5. Product Demand Telemetry (Out of stock clicks)
  CREATE TABLE IF NOT EXISTS product_demand_telemetry (
    id SERIAL PRIMARY KEY,
    product_id INTEGER,
    product_name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    source VARCHAR(50) DEFAULT 'catalog',
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    user_email VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS idx_product_demand_prod ON product_demand_telemetry(product_id, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_product_demand_user ON product_demand_telemetry(user_id, created_at DESC);
`;

let initialization;
async function initCrmTables() {
  if (!initialization) initialization = pool.query(migrationSql).catch(err => { initialization = null; throw err; });
  return initialization;
}
module.exports = {migrationSql,initCrmTables};
