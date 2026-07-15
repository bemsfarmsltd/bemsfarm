require('dotenv').config({path: './.env'});
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function test() {
  try {
    const q = `SELECT r.*, c.name as customer_name, c.email as customer_email, c.phone as customer_phone
      FROM returns r
      LEFT JOIN customers c ON r.customer_id = c.id LIMIT 1`;
    await pool.query(q);
    console.log("Returns Query success.");
  } catch(e) {
    console.error("Returns error:", e.message);
  }
  pool.end();
}
test();
