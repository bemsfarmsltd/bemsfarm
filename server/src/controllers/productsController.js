require("dotenv").config();
const pool = require("../db/pool");

// ─── GET ALL PRODUCTS ──────────────────────────────────────────
// GET /api/products
// GET /api/products?category=rice-grains
// GET /api/products?search=garri
const getProducts = async (req, res, next) => {
  try {
    const { category, search } = req.query;
    // Default limit is generous enough to return the whole catalog as-is
    // today (existing client pages don't paginate yet) while still capping
    // response size and accepting page/limit once a client asks for them.
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit) || 200));
    const offset = (page - 1) * limit;

    let where = "WHERE 1=1";
    const params = [];

    // Filter by category
    if (category) {
      params.push(category);
      where += ` AND c.name = $${params.length}`;
    }

    // Search by name
    if (search) {
      params.push(`%${search}%`);
      where += ` AND p.name ILIKE $${params.length}`;
    }

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM products p LEFT JOIN categories c ON p.category_id = c.id ${where}`,
      params,
    );
    const total = parseInt(countResult.rows[0].count);

    const result = await pool.query(
      `SELECT p.*, c.name as category_name,
              COALESCE(pr.avg_rating, 0) AS avg_rating,
              COALESCE(pr.review_count, 0) AS review_count
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       LEFT JOIN (
         SELECT product_id, AVG(rating) AS avg_rating, COUNT(*) AS review_count
         FROM product_reviews WHERE status = 'approved' GROUP BY product_id
       ) pr ON pr.product_id = p.id
       ${where}
       ORDER BY p.is_featured DESC, p.id ASC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset],
    );

    res.json({
      products: result.rows,
      count: result.rows.length,
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    next(error);
  }
};

// ─── GET SINGLE PRODUCT ────────────────────────────────────────
// GET /api/products/:id
const getProductById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT p.*, c.name as category_name
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE p.id = $1`,
      [id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Get related products from same category
    const related = await pool.query(
      `SELECT * FROM products 
       WHERE category_id = $1 AND id != $2 
       LIMIT 4`,
      [result.rows[0].category_id, id],
    );

    res.json({
      product: result.rows[0],
      related: related.rows,
    });
  } catch (error) {
    next(error);
  }
};

// ─── GET FEATURED PRODUCTS ─────────────────────────────────────
// GET /api/products/featured
const getFeaturedProducts = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT p.*, c.name as category_name 
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE p.is_featured = true
       ORDER BY p.id ASC`,
    );

    res.json({ products: result.rows });
  } catch (error) {
    next(error);
  }
};

module.exports = { getProducts, getProductById, getFeaturedProducts };
