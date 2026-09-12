require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function run() {
  try {
    const { rows: products } = await pool.query('SELECT id, name, price FROM products LIMIT 1');
    if (products.length === 0) throw new Error('No products found');
    const product = products[0];

    const cartRes = await pool.query("INSERT INTO customer_carts (session_id, status, source) VALUES ('test_session', 'active', 'web') RETURNING id");
    const cartId = cartRes.rows[0].id;
    console.log('Cart created:', cartId);
    
    const itemRes = await pool.query(
      "INSERT INTO customer_cart_items (cart_id, product_id, product_name, quantity, unit_price, subtotal) VALUES ($1, $2, $3, 1, $4, $4) RETURNING id", 
      [cartId, product.id, product.name, product.price]
    );
    console.log('Item added successfully:', itemRes.rows[0].id);
    
    // Cleanup
    await pool.query("DELETE FROM customer_cart_items WHERE cart_id = $1", [cartId]);
    await pool.query("DELETE FROM customer_carts WHERE id = $1", [cartId]);
    console.log('Test successful. No database constraints blocking cart addition.');
  } catch (err) {
    console.error('Database Error:', err.message);
  } finally {
    pool.end();
  }
}
run();
