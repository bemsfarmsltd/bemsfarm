require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  try {
    const users = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'users'");
    const user_addresses = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'user_addresses'");
    const customer_addresses = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'customer_addresses'");
    
    console.log("users columns:", users.rows.map(r => r.column_name));
    console.log("user_addresses columns:", user_addresses.rows.map(r => r.column_name));
    console.log("customer_addresses columns:", customer_addresses.rows.map(r => r.column_name));
  } catch (err) {
    console.error("Error:", err);
  } finally {
    pool.end();
  }
}
run();
