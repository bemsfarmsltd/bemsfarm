const { Pool } = require("pg");
require("dotenv").config({ path: require("path").resolve(__dirname, "../../.env") });

const migrationSql = `
  -- 1. Add referral columns if not exist
  ALTER TABLE email_subscriptions ADD COLUMN IF NOT EXISTS referral_code VARCHAR(50) UNIQUE;
  ALTER TABLE email_subscriptions ADD COLUMN IF NOT EXISTS referred_by VARCHAR(50);
  ALTER TABLE email_subscriptions ADD COLUMN IF NOT EXISTS referral_count INT DEFAULT 0;

  -- 2. Populate missing referral codes for existing subscriptions (using a simple random code hash)
  UPDATE email_subscriptions 
  SET referral_code = 'BF-' || UPPER(SUBSTRING(MD5(email || NOW()::text) FROM 1 FOR 6)) 
  WHERE referral_code IS NULL;
`;

async function runMigration() {
  console.log("Connecting to Database (no SSL)...");
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: false
  });
  
  const client = await pool.connect();
  try {
    console.log("Applying referral database migrations...");
    await client.query(migrationSql);
    console.log("🎉 Referral database migration applied successfully!");
  } catch (err) {
    console.error("❌ Referral migration failed:", err.message);
  } finally {
    client.release();
    await pool.end();
    process.exit();
  }
}

runMigration();
