require("dotenv").config();
const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function deleteUser() {
  const email = "dest.nacho@gmail.com";
  try {
    const res = await pool.query('DELETE FROM users WHERE email = $1 RETURNING *', [email]);
    if (res.rowCount > 0) {
      console.log(`Successfully deleted ${res.rowCount} user(s) with email: ${email}`);
    } else {
      console.log(`No user found with email: ${email}`);
    }
  } catch (err) {
    console.error("Error deleting user:", err);
  } finally {
    await pool.end();
  }
}
deleteUser();
