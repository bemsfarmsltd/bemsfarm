require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function run() {
  try {
    const { rows } = await pool.query('SELECT id FROM products');
    for (const row of rows) {
      // Generate a fake price between 1000 and 15000 Naira
      const fakePrice = Math.floor(Math.random() * 140 + 10) * 100;
      await pool.query('UPDATE products SET price = $1, unit_price = $1 WHERE id = $2', [fakePrice, row.id]);
    }
    console.log('Successfully assigned fake prices to all products.');
  } catch (err) {
    console.error('Error updating prices:', err);
  } finally {
    pool.end();
  }
}
run();
