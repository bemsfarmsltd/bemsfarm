require('dotenv').config({path: './.env'});
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function test() {
  const t1 = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'pos_transactions'");
  console.log("POS TRANSACTIONS:", t1.rows);
  const t2 = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'returns'");
  console.log("RETURNS:", t2.rows);
  const t3 = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'invoices'");
  console.log("INVOICES:", t3.rows);
  pool.end();
}
test();
