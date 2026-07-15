require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function run() {
  const res = await pool.query("SELECT id, total, created_at, (SELECT COUNT(*) FROM order_items WHERE order_id = orders.id) as item_count FROM orders WHERE id LIKE 'BF-TEST%' LIMIT 5");
  console.log(res.rows);
  pool.end();
}
run().catch(console.error);
