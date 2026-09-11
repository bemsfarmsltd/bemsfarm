const express = require("express");
const router = express.Router();
const { Pool } = require("pg");
const { protect } = require("../middleware/authMiddleware");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});

// GET /api/wishlist
// Fetch all saved items for the logged-in user
router.get("/", protect, async (req, res) => {
  try {
    const customerId = req.user.id;
    const query = `
      SELECT p.*
      FROM products p
      JOIN customer_saved_items csi ON p.id = csi.product_id
      WHERE csi.customer_id = $1
      ORDER BY csi.created_at DESC;
    `;
    const result = await pool.query(query, [customerId]);
    res.json({ products: result.rows });
  } catch (error) {
    console.error("Error fetching wishlist:", error);
    res.status(500).json({ message: "Server error fetching wishlist" });
  }
});

// POST /api/wishlist
// Add an item to the wishlist
router.post("/", protect, async (req, res) => {
  try {
    const customerId = req.user.id;
    const { productId } = req.body;

    if (!productId) {
      return res.status(400).json({ message: "Product ID is required" });
    }

    // Upsert (do nothing if already exists due to unique constraint)
    const query = `
      INSERT INTO customer_saved_items (customer_id, product_id)
      VALUES ($1, $2)
      ON CONFLICT (customer_id, product_id) DO NOTHING
      RETURNING *;
    `;
    const result = await pool.query(query, [customerId, productId]);
    
    res.json({ message: "Product added to wishlist", savedItem: result.rows[0] || null });
  } catch (error) {
    console.error("Error adding to wishlist:", error);
    res.status(500).json({ message: "Server error adding to wishlist" });
  }
});

// DELETE /api/wishlist/:productId
// Remove an item from the wishlist
router.delete("/:productId", protect, async (req, res) => {
  try {
    const customerId = req.user.id;
    const productId = req.params.productId;

    const query = `
      DELETE FROM customer_saved_items
      WHERE customer_id = $1 AND product_id = $2
      RETURNING *;
    `;
    const result = await pool.query(query, [customerId, productId]);

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Item not found in wishlist" });
    }

    res.json({ message: "Product removed from wishlist" });
  } catch (error) {
    console.error("Error removing from wishlist:", error);
    res.status(500).json({ message: "Server error removing from wishlist" });
  }
});

module.exports = router;
