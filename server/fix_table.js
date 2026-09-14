require("dotenv").config();
const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function dropAndCreate() {
  try {
    await pool.query('DROP TABLE IF EXISTS customer_saved_items;');
    console.log("Table dropped");
    
    await pool.query(`
      CREATE TABLE customer_saved_items (
        user_id     INT REFERENCES users(id) ON DELETE CASCADE,
        product_id  INT REFERENCES products(id) ON DELETE CASCADE,
        created_at  TIMESTAMP DEFAULT NOW(),
        PRIMARY KEY (user_id, product_id)
      );
    `);
    console.log("Table created correctly!");
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}
dropAndCreate();
