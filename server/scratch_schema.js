require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'customer_saved_items'").then(res => { console.log(res.rows); pool.end(); }).catch(console.error);
