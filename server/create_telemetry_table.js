require("dotenv").config();
const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function createTelemetryTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS product_demand_telemetry (
        id SERIAL PRIMARY KEY,
        product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
        product_name VARCHAR(255),
        category VARCHAR(100),
        source VARCHAR(100),
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        user_email VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log("Telemetry table created successfully.");
  } catch (err) {
    console.error("Error creating telemetry table:", err);
  } finally {
    await pool.end();
  }
}
createTelemetryTable();
