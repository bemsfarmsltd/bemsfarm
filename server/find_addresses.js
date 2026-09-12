require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function run() {
  try {
    const res = await pool.query("SELECT table_name, column_name FROM information_schema.columns WHERE column_name LIKE '%address%' AND table_schema = 'public'");
    console.log("Address columns:");
    console.log(res.rows);
  } catch (err) {
    console.error("Error:", err);
  } finally {
    pool.end();
  }
}
run();
