require('dotenv').config({path: './.env'});
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

pool.query("SELECT id, email, role, password FROM users").then(res => {
  console.table(res.rows);
  pool.end();
}).catch(console.error);
