require("dotenv").config();
const pool = require("../db/pool");

// ─── GET ALL PRODUCTS ──────────────────────────────────────────
// GET /api/products
// GET /api/products?category=rice-grains
// GET /api/products?search=garri
const getProducts = async (req, res) => {
  try {
    const { category, search } = req.query;

    let query = `
      SELECT p.*, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE 1=1
    `;
    const params = [];

    // Filter by category
    if (category) {
      params.push(category);
      query += ` AND c.slug = $${params.length}`;
    }

    // Search by name
    if (search) {
      params.push(`%${search}%`);
      query += ` AND p.name ILIKE $${params.length}`;
    }

    query += ` ORDER BY p.is_featured DESC, p.id ASC`;

    const result = await pool.query(query, params);

    res.json({
      products: result.rows,
      count: result.rows.length,
    });
  } catch (error) {
    console.error("getProducts error:", error.message);
    res.status(500).json({ message: "Server error fetching products" });
  }
};

// ─── GET SINGLE PRODUCT ────────────────────────────────────────
// GET /api/products/:id
const getProductById = async (req, res) => {
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
    console.error("getProductById error:", error.message);
    res.status(500).json({ message: "Server error fetching product" });
  }
};

// ─── GET FEATURED PRODUCTS ─────────────────────────────────────
// GET /api/products/featured
const getFeaturedProducts = async (req, res) => {
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
    console.error("getFeaturedProducts error:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = { getProducts, getProductById, getFeaturedProducts };
