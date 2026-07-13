const express = require("express");
const router = express.Router();
const pool = require("../db/pool");
const {
  getProducts,
  getProductById,
  getFeaturedProducts,
} = require("../controllers/productsController");

// IMPORTANT: /featured must come BEFORE /:id
router.get("/featured", getFeaturedProducts);
router.get("/", getProducts);
// ================================================================
// ADD THIS TO server/src/routes/products.js
// Insert BEFORE the existing "router.get('/:id', ...)" route
// (must be before the wildcard to avoid /:id matching "search")
//
// This powers the Navbar's expanding search bar dropdown.
// Called by NavSearchBar component with ?q=...&limit=6
// ================================================================

router.get("/search", async (req, res) => {
  try {
    const { q, limit = 8 } = req.query;
    if (!q || !q.trim()) {
      return res.json({ products: [] });
    }

    const search = `%${q.trim()}%`;
    const maxResults = Math.min(parseInt(limit) || 8, 20);

    const result = await pool.query(
      `SELECT
         p.id, p.name, p.price, p.unit, p.image_url,
         p.stock, p.is_featured,
         c.name as category_name
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE
         (LOWER(p.name) LIKE LOWER($1)
          OR LOWER(c.name) LIKE LOWER($1)
          OR LOWER(p.description) LIKE LOWER($1))
         AND COALESCE(p.stock, 100) > 0
       ORDER BY
         CASE WHEN LOWER(p.name) LIKE LOWER($1) THEN 0 ELSE 1 END,
         p.is_featured DESC,
         p.name ASC
       LIMIT $2`,
      [search, maxResults],
    );

    res.json({ products: result.rows });
  } catch (err) {
    console.error("Product search error:", err.message);
    res.status(500).json({ message: "Search failed: " + err.message });
  }
});

router.get("/:id", getProductById);

module.exports = router;
