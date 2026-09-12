require('dotenv').config();
const pool = require('./src/db/pool');

async function test() {
  const result = await pool.query("SELECT * FROM users WHERE email = 'kaluvictor130@gmail.com'");
  console.log(result.rows[0]);
  process.exit(0);
}
test();
