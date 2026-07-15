require("dotenv").config();
const { Pool } = require("pg");

async function run() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false
  });

  try {
    await pool.query(`
      ALTER TABLE units 
      DROP COLUMN IF EXISTS abbreviation, 
      DROP COLUMN IF EXISTS base_unit, 
      DROP COLUMN IF EXISTS conversion_factor, 
      ADD COLUMN IF NOT EXISTS short VARCHAR(20), 
      ADD COLUMN IF NOT EXISTS type VARCHAR(50), 
      ADD COLUMN IF NOT EXISTS step NUMERIC(10,4);
    `);
    console.log("Success");
  } catch(e) {
    console.error(e);
  } finally {
    pool.end();
  }
}
run();
