require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function run() {
  try {
    const res = await pool.query("UPDATE users SET email_verified = true WHERE email = 'admin@bemsfarms.com' RETURNING *");
    console.log("Admin email verified successfully:", res.rows[0].email_verified);
  } catch (err) {
    console.error("Error verifying admin email:", err);
  } finally {
    pool.end();
  }
}
run();
