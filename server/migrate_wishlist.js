require('dotenv').config();
// Supabase databases are now IPv6. Force Node to prefer IPv6 resolution.
require('dns').setDefaultResultOrder('ipv6first');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});

async function runMigration() {
  try {
    console.log("Creating customer_saved_items table...");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS customer_saved_items (
        user_id     INT REFERENCES users(id) ON DELETE CASCADE,
        product_id  INT REFERENCES products(id) ON DELETE CASCADE,
        created_at  TIMESTAMP DEFAULT NOW(),
        PRIMARY KEY (user_id, product_id)
      );
    `);
    console.log("✅ Migration successful: customer_saved_items table created!");
  } catch (error) {
    console.error("❌ Migration failed:", error);
  } finally {
    await pool.end();
  }
}

runMigration();
