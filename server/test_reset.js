require('dotenv').config({path: './.env'});
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function reset() {
  try {
    const hash = await bcrypt.hash('super123', 12);
    await pool.query("UPDATE users SET password = $1 WHERE email = 'est0295@gmail.com'", [hash]);
    console.log("Password updated successfully.");
    pool.end();
  } catch(e) {
    console.error(e);
    pool.end();
  }
}
reset();
