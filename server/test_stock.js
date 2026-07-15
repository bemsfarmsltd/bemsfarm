require('dotenv').config({path: './.env'});
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
pool.query("SELECT id, name, stock, stock_quantity, low_stock_threshold FROM products LIMIT 5").then(res => {
  console.table(res.rows);
  pool.end();
}).catch(console.error);
