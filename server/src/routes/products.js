const express = require("express");
const router = express.Router();
const pool = require("../db/pool");
const {
  getProducts,
  getProductById,
  getFeaturedProducts,
} = require("../controllers/productsController");
const { protect } = require("../middleware/authMiddleware");
const validate = require("../middleware/validate");
const { submitReview } = require("../schemas/reviewSchemas");

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

router.get("/search", async (req, res, next) => {
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
    next(err);
  }
});

// ── GET /:id/reviews ── public: paginated approved reviews + average/count ──
router.get("/:id/reviews", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const [statsRes, reviewsRes] = await Promise.all([
      pool.query(
        `SELECT COALESCE(AVG(rating), 0) AS average, COUNT(*) AS count
         FROM product_reviews WHERE product_id = $1 AND status = 'approved'`,
        [id],
      ),
      pool.query(
        `SELECT r.id, r.rating, r.body AS comment, r.created_at, r.user_id, u.name AS reviewer_name
         FROM product_reviews r
         JOIN users u ON u.id = r.user_id
         WHERE r.product_id = $1 AND r.status = 'approved'
         ORDER BY r.created_at DESC
         LIMIT $2 OFFSET $3`,
        [id, parseInt(limit), offset],
      ),
    ]);

    const count = parseInt(statsRes.rows[0].count) || 0;

    res.json({
      reviews: reviewsRes.rows,
      average: parseFloat(statsRes.rows[0].average) || 0,
      count,
      page: parseInt(page),
      pages: Math.ceil(count / parseInt(limit)),
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /:id/reviews/mine ── the logged-in user's own review, to pre-fill edits
router.get("/:id/reviews/mine", protect, async (req, res, next) => {
  try {
    const result = await pool.query(
      "SELECT id, rating, body AS comment, created_at FROM product_reviews WHERE product_id=$1 AND user_id=$2",
      [req.params.id, req.user.id],
    );
    res.json({ review: result.rows[0] || null });
  } catch (err) {
    next(err);
  }
});

// ── POST /:id/reviews ── one review per user per product; resubmitting edits it
router.post("/:id/reviews", protect, validate(submitReview), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rating, comment } = req.body;

    const product = await pool.query("SELECT id FROM products WHERE id=$1", [id]);
    if (!product.rows.length) {
      return res.status(404).json({ message: "Product not found" });
    }

    const result = await pool.query(
      `INSERT INTO product_reviews (product_id, user_id, rating, body, status, created_at)
       VALUES ($1,$2,$3,$4,'approved',NOW())
       ON CONFLICT (product_id, user_id) DO UPDATE
         SET rating = EXCLUDED.rating, body = EXCLUDED.body
       RETURNING id, rating, body AS comment, created_at`,
      [id, req.user.id, rating, comment || null],
    );

    res.status(201).json({
      review: { ...result.rows[0], reviewer_name: req.user.name },
    });
  } catch (err) {
    next(err);
  }
});

router.get("/:id", getProductById);

module.exports = router;
