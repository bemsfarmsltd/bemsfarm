const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const pool = require("../src/db/pool");
const fs = require("fs");

async function runMigration() {
  const client = await pool.connect();
  try {
    const sqlPath = path.join(__dirname, "../src/db/driver_advanced_flows_migration.sql");
    const sql = fs.readFileSync(sqlPath, "utf8");
    console.log("Running Driver Advanced Flows Migration...");
    await client.query(sql);
    console.log("✅ Driver Advanced Flows Migration completed successfully!");
  } catch (err) {
    console.error("Migration error:", err.message);
  } finally {
    client.release();
    process.exit(0);
  }
}

runMigration();
