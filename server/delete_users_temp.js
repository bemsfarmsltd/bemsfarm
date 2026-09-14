require("dotenv").config();
const pool = require("./src/db/pool");

const emails = ["anachordestiniewoyike@gmail.com", "dest.nacho@gmail.com"];

(async () => {
  try {
    for (const email of emails) {
      const res = await pool.query(
        "DELETE FROM users WHERE email = $1 RETURNING id, email",
        [email]
      );
      if (res.rowCount > 0) {
        console.log(`Deleted: ${res.rows[0].email}`);
      } else {
        console.log(`Not found: ${email}`);
      }
    }
  } catch (err) {
    console.error("Database error:", err.message);
  } finally {
    process.exit(0);
  }
})();
