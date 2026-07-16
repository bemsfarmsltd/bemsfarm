require('dotenv').config({path: './.env'});
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function test() {
  try {
    await pool.query('SELECT id, name, phone, vehicle_plate, vehicle_type, status, COALESCE(is_available, true) AS is_available FROM drivers LIMIT 1');
    console.log("Drivers Success");
  } catch(e) {
    console.error("Drivers Error:", e.message);
  }
  pool.end();
}
test();
