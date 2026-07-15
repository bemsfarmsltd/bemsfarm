require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function run() {
  try {
    const res = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    console.log("Tables:", res.rows.map(r => r.table_name));

    const columnsRes = await pool.query(`
      SELECT table_name, column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name IN ('products', 'warehouses', 'inventory_movements', 'lost_items')
      ORDER BY table_name, ordinal_position;
    `);
    console.log("Columns:", columnsRes.rows);

  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}
run();
