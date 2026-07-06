const { Pool } = require("pg");
require("dotenv").config({ path: require("path").resolve(__dirname, "../../.env") });

const migrationSql = `
  -- 1. Payments table with unique constraint on payment_ref
  CREATE TABLE IF NOT EXISTS payments (
    id              SERIAL PRIMARY KEY,
    payment_ref     VARCHAR(100) UNIQUE NOT NULL,
    order_id        VARCHAR(30) REFERENCES orders(id) ON DELETE SET NULL,
    amount          DECIMAL(12,2) NOT NULL,
    status          VARCHAR(50) NOT NULL, -- successful | failed | reversed | pending
    payment_method  VARCHAR(50),
    customer_email  VARCHAR(255),
    pos_terminal_id VARCHAR(50),
    metadata        JSONB,
    paid_at         TIMESTAMP,
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
  );

  -- 2. Audit logs for webhooks
  CREATE TABLE IF NOT EXISTS payment_webhook_logs (
    id                 SERIAL PRIMARY KEY,
    event_type         VARCHAR(100),
    payment_ref        VARCHAR(100),
    payload            JSONB,
    signature_verified BOOLEAN,
    status             VARCHAR(50), -- processed | ignored | error
    error_message      TEXT,
    created_at         TIMESTAMP DEFAULT NOW()
  );
`;

async function runMigration() {
  console.log("Connecting to Database (no SSL)...");
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: false
  });
  
  const client = await pool.connect();
  try {
    console.log("Applying payment reconciliation database schemas...");
    await client.query(migrationSql);
    console.log("🎉 Payment database migration applied successfully!");
  } catch (err) {
    console.error("❌ Payment migration failed:", err.message);
  } finally {
    client.release();
    await pool.end();
    process.exit();
  }
}

runMigration();
