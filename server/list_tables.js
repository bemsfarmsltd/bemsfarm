require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function run() {
  const inv = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'invoices'");
  console.log('--- INVOICES ---');
  console.log(inv.rows);

  const ret = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'returns'");
  console.log('--- RETURNS ---');
  console.log(ret.rows);
  
  pool.end();
}
run().catch(console.error);
