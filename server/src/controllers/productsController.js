require("dotenv").config();
const pool = require("../db/pool");

// These routes are public. Remove financial, staff, and AI-vector fields
// selected by p.* before returning product data to a visitor.
function stripPrivateProductFields(row) {
  if (!row) return row;
  const { cost_price, margin_pct, embedding, created_by, ...rest } = row;
  return rest;
}

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

    let where = "WHERE p.status != 'archived'";
    const params = [];

    // Filter by category
    if (category) {
      params.push(category);
      where += ` AND c.name = $${params.length}`;
    }

    let orderByClause = "ORDER BY p.is_featured DESC, p.id ASC";

    // Smart Multi-Token Search
    if (search && search.trim()) {
      const cleanSearch = search.trim();
      const rawTokens = cleanSearch
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter((t) => t.length >= 2);

      const tokens = [...new Set(rawTokens)];

      if (tokens.length === 0) {
        params.push(`%${cleanSearch}%`);
        where += ` AND p.name ILIKE $${params.length}`;
      } else {
        const exactPhrase = cleanSearch.toLowerCase();
        const wildcardPhrase = `%${cleanSearch}%`;

        params.push(exactPhrase, wildcardPhrase);
        const exactParam = `$${params.length - 1}`;
        const wildcardParam = `$${params.length}`;

        const tokenConditions = [];
        tokens.forEach((t) => {
          params.push(`%${t}%`);
          const ilikeParam = `$${params.length}`;

          params.push(t);
          const wordParam = `$${params.length}`;

          tokenConditions.push(`(
            p.name ILIKE ${ilikeParam}
            OR c.name ILIKE ${ilikeParam}
            OR EXISTS (SELECT 1 FROM jsonb_array_elements_text(COALESCE(p.tags, '[]'::jsonb)) tag WHERE tag ILIKE ${ilikeParam})
            OR p.description ~* ('\\m' || ${wordParam} || '\\M')
          )`);
        });

        where += ` AND (${tokenConditions.join(" AND ")})`;
        orderByClause = `
          ORDER BY (
            CASE WHEN LOWER(p.name) = ${exactParam} THEN 150 ELSE 0 END
            + CASE WHEN p.name ILIKE ${wildcardParam} THEN 90 ELSE 0 END
            + CASE WHEN LOWER(c.name) = ${exactParam} THEN 50 ELSE 0 END
            + CASE WHEN c.name ILIKE ${wildcardParam} THEN 30 ELSE 0 END
            + CASE WHEN COALESCE(p.stock, 0) > 0 THEN 25 ELSE 0 END
            + CASE WHEN p.is_featured THEN 10 ELSE 0 END
          ) DESC, COALESCE(p.stock, 0) > 0 DESC, p.is_featured DESC, p.name ASC
        `;
      }
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
       LEFT JOIN categories c ON c.id = p.category_id
       LEFT JOIN (
         SELECT product_id, AVG(rating) AS avg_rating, COUNT(*) AS review_count
         FROM product_reviews WHERE status = 'approved' GROUP BY product_id
       ) pr ON pr.product_id = p.id
       ${where}
       ${orderByClause}
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset],
    );

    res.json({
      products: result.rows.map(stripPrivateProductFields),
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
      `SELECT p.*, c.name as category_name,
              COALESCE(pr.avg_rating, 0) AS avg_rating,
              COALESCE(pr.review_count, 0) AS review_count
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       LEFT JOIN (
         SELECT product_id, AVG(rating) AS avg_rating, COUNT(*) AS review_count
         FROM product_reviews WHERE status = 'approved' GROUP BY product_id
       ) pr ON pr.product_id = p.id
       WHERE p.id = $1 AND p.status != 'archived'`,
      [id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Get related products from same category — same rating join as the
    // main product list, so ProductCard (used for these related cards
    // elsewhere) has ratings available if it's ever wired to show them.
    const related = await pool.query(
      `SELECT p.*,
              COALESCE(pr.avg_rating, 0) AS avg_rating,
              COALESCE(pr.review_count, 0) AS review_count
       FROM products p
       LEFT JOIN (
         SELECT product_id, AVG(rating) AS avg_rating, COUNT(*) AS review_count
         FROM product_reviews WHERE status = 'approved' GROUP BY product_id
       ) pr ON pr.product_id = p.id
       WHERE p.category_id = $1 AND p.id != $2 AND p.status != 'archived'
       LIMIT 4`,
      [result.rows[0].category_id, id],
    );

    res.json({
      product: stripPrivateProductFields(result.rows[0]),
      related: related.rows.map(stripPrivateProductFields),
    });
  } catch (error) {
    next(error);
  }
};


module.exports = { getProducts, getProductById };
