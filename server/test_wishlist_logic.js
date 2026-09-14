require("dotenv").config();
const { Pool } = require("pg");
const axios = require("axios");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function testWishlist() {
  try {
    // 1. Create a test user directly in DB (or use an existing one if possible)
    // First let's check if the table exists
    const checkTable = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'customer_saved_items'
      );
    `);
    console.log("Table exists:", checkTable.rows[0].exists);

    // Let's test the route logic directly using pool without starting the server
    const userRes = await pool.query("SELECT id FROM users LIMIT 1");
    if (userRes.rows.length === 0) {
       console.log("No users found");
       process.exit(0);
    }
    const userId = userRes.rows[0].id;
    console.log("Using userId:", userId);

    const productRes = await pool.query("SELECT id FROM products LIMIT 1");
    if (productRes.rows.length === 0) {
       console.log("No products found");
       process.exit(0);
    }
    const productId = productRes.rows[0].id;
    console.log("Using productId:", productId);

    // Test POST logic
    console.log("Inserting wishlist item...");
    const insertRes = await pool.query(`
      INSERT INTO customer_saved_items (user_id, product_id)
      VALUES ($1, $2)
      ON CONFLICT (user_id, product_id) DO NOTHING
      RETURNING *;
    `, [userId, productId]);
    console.log("Insert result:", insertRes.rows);

    // Test GET logic
    console.log("Fetching wishlist items...");
    const fetchRes = await pool.query(`
      SELECT p.*
      FROM products p
      JOIN customer_saved_items csi ON p.id = csi.product_id
      WHERE csi.user_id = $1
      ORDER BY csi.created_at DESC;
    `, [userId]);
    console.log("Fetch result length:", fetchRes.rows.length);
    console.log("First item:", fetchRes.rows[0]?.name);

  } catch (err) {
    console.error("Test failed:", err);
  } finally {
    await pool.end();
  }
}

testWishlist();
