// server/src/routes/config_admin.js
const express = require("express");
const router = express.Router();
const pool = require("../db/pool");
const { protect, requireRole } = require("../middleware/authMiddleware");
const validate = require("../middleware/validate");
const configAdminSchemas = require("../schemas/configAdminSchemas");

// All routes require authentication
router.use(protect);

// Allow read-only (GET) operations for all authenticated staff — but the
// comment always said "staff", while the code only checked HTTP method, so
// any authenticated customer ("user" role) could read this too, including
// /export?type=products which returns cost_price (internal margin data).
// Restrict modifying operations (POST, PUT, DELETE) to superadmin, admin, or manager.
router.use((req, res, next) => {
  if (req.user?.role === "user") {
    return res.status(403).json({ message: "Access denied. Staff access required." });
  }
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    return next();
  }
  requireRole("superadmin", "admin", "manager")(req, res, next);
});

// ── CATEGORIES ────────────────────────────────────────────────────────
router.get("/categories", async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT c.*, 
        (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id) as products
       FROM categories c ORDER BY c.id DESC`
    );
    res.json({ categories: result.rows });
  } catch (err) {
    next(err);
  }
});

router.post("/categories", validate(configAdminSchemas.createCategory), async (req, res, next) => {
  try {
    const { name, code, description, status } = req.body;
    const result = await pool.query(
      `INSERT INTO categories (name, code, description, status) 
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [name, code, description, status || 'active']
    );
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

router.put("/categories/:id", validate(configAdminSchemas.updateCategory), async (req, res, next) => {
  try {
    const { name, code, description, status } = req.body;
    const result = await pool.query(
      `UPDATE categories SET name=$1, code=$2, description=$3, status=$4 WHERE id=$5 RETURNING *`,
      [name, code, description, status, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

router.delete("/categories/:id", async (req, res, next) => {
  try {
    // products.category_id has no ON DELETE behavior configured, so an
    // in-use category currently fails with a raw FK-violation 500 — check
    // first and return a readable 400 instead.
    const [products, subs, legacySubs] = await Promise.all([
      pool.query(`SELECT 1 FROM products WHERE category_id=$1 LIMIT 1`, [req.params.id]),
      pool.query(`SELECT 1 FROM subcategories WHERE category_id=$1 LIMIT 1`, [req.params.id]),
      pool.query(`SELECT 1 FROM sub_categories WHERE category_id=$1 LIMIT 1`, [req.params.id]),
    ]);
    if (products.rows.length || subs.rows.length || legacySubs.rows.length) {
      return res.status(400).json({ message: "Cannot delete a category that still has products or sub-categories assigned to it." });
    }
    await pool.query(`DELETE FROM categories WHERE id=$1`, [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// ── SUBCATEGORIES ─────────────────────────────────────────────────────
router.get("/subcategories", async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT s.*, c.name as category_name 
      FROM subcategories s
      LEFT JOIN categories c ON c.id = s.category_id
      ORDER BY s.id DESC
    `);
    res.json({ subcategories: result.rows });
  } catch (err) {
    next(err);
  }
});

router.post("/subcategories", validate(configAdminSchemas.createSubcategory), async (req, res, next) => {
  try {
    const { category_id, name, code, description, status } = req.body;
    const result = await pool.query(
      `INSERT INTO subcategories (category_id, name, code, description, status) 
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [category_id, name, code, description, status || 'active']
    );
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

router.put("/subcategories/:id", validate(configAdminSchemas.updateSubcategory), async (req, res, next) => {
  try {
    const { category_id, name, code, description, status } = req.body;
    const result = await pool.query(
      `UPDATE subcategories SET category_id=$1, name=$2, code=$3, description=$4, status=$5 WHERE id=$6 RETURNING *`,
      [category_id, name, code, description, status, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

router.delete("/subcategories/:id", async (req, res, next) => {
  try {
    await pool.query(`DELETE FROM subcategories WHERE id=$1`, [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// ── UNITS ─────────────────────────────────────────────────────────────
router.get("/units", async (req, res, next) => {
  try {
    const result = await pool.query(`SELECT * FROM units ORDER BY id DESC`);
    res.json({ units: result.rows });
  } catch (err) {
    next(err);
  }
});

router.post("/units", validate(configAdminSchemas.createUnit), async (req, res, next) => {
  try {
    const { name, short, type, step, status } = req.body;
    const result = await pool.query(
      `INSERT INTO units (name, short, type, step, status) 
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [name, short, type, step || 1.0, status || 'active']
    );
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

router.put("/units/:id", validate(configAdminSchemas.updateUnit), async (req, res, next) => {
  try {
    const { name, short, type, step, status } = req.body;
    const result = await pool.query(
      `UPDATE units SET name=$1, short=$2, type=$3, step=$4, status=$5 WHERE id=$6 RETURNING *`,
      [name, short, type, step, status, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

router.delete("/units/:id", async (req, res, next) => {
  try {
    await pool.query(`DELETE FROM units WHERE id=$1`, [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// ── WARRANTIES ────────────────────────────────────────────────────────
router.get("/warranties", async (req, res, next) => {
  try {
    const result = await pool.query(`SELECT * FROM warranties ORDER BY id DESC`);
    res.json({ warranties: result.rows });
  } catch (err) {
    next(err);
  }
});

router.post("/warranties", validate(configAdminSchemas.createWarranty), async (req, res, next) => {
  try {
    const { name, duration, type, description, status } = req.body;
    const result = await pool.query(
      `INSERT INTO warranties (name, duration, type, description, status) 
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [name, duration, type, description, status || 'active']
    );
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

router.put("/warranties/:id", validate(configAdminSchemas.updateWarranty), async (req, res, next) => {
  try {
    const { name, duration, type, description, status } = req.body;
    const result = await pool.query(
      `UPDATE warranties SET name=$1, duration=$2, type=$3, description=$4, status=$5 WHERE id=$6 RETURNING *`,
      [name, duration, type, description, status, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

router.delete("/warranties/:id", async (req, res, next) => {
  try {
    await pool.query(`DELETE FROM warranties WHERE id=$1`, [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// Helper to convert rows to CSV
function convertToCSV(headers, rows) {
  const csvRows = [headers.join(",")];
  for (const row of rows) {
    const values = headers.map(header => {
      const fieldVal = row[header] !== undefined && row[header] !== null ? row[header] : "";
      const escaped = String(fieldVal).replace(/"/g, '""');
      return `"${escaped}"`;
    });
    csvRows.push(values.join(","));
  }
  return csvRows.join("\n");
}

// ── GET /api/admin/config/export ─────────────────────────────────────
// Every column the export UI lets an admin pick a field for, per type —
// used to both validate the `fields` query param (whitelist, no raw column
// names ever reach SQL) and to build the SELECT/headers for just the
// columns that were actually requested.
const EXPORT_COLUMNS = {
  products: {
    table: "p", from: "products p LEFT JOIN categories c ON p.category_id = c.id",
    columns: {
      name: "p.name", sku: "p.sku", barcode: "p.barcode", category: "c.name",
      unit_price: "COALESCE(p.unit_price, p.price, 0)", cost_price: "COALESCE(p.cost_price, 0)",
      stock: "p.stock", status: "p.status", created_at: "p.created_at",
    },
    order: "p.id DESC",
  },
  categories: {
    from: "categories",
    columns: { name: "name", code: "code", status: "status", created_at: "created_at" },
    order: "id DESC",
  },
  sub_categories: {
    from: "subcategories s LEFT JOIN categories c ON s.category_id = c.id",
    columns: { name: "s.name", parent_category: "c.name", code: "s.code", status: "s.status", created_at: "s.created_at" },
    order: "s.id DESC",
  },
  units: {
    from: "units",
    columns: { name: "name", short: "short", type: "type", step: "step", status: "status", created_at: "created_at" },
    order: "id DESC",
  },
  inventory: {
    from: "products",
    columns: { name: "name", sku: "sku", stock: "stock", low_stock_threshold: "low_stock_threshold", status: "status" },
    order: "id DESC",
  },
};
// products/inventory both read the products table, so both filter on it directly.
const EXPORT_STATUS_COL = { products: "p.status", categories: "status", sub_categories: "s.status", units: "status", inventory: "status" };
const EXPORT_DATE_COL   = { products: "p.created_at", categories: "created_at", sub_categories: "s.created_at", units: "created_at", inventory: "created_at" };

router.get("/export", async (req, res, next) => {
  try {
    const { type, fields, status, date_from, date_to } = req.query;
    const config = EXPORT_COLUMNS[type];
    if (!config) return res.status(400).json({ message: "Invalid export type" });

    const requested = fields ? String(fields).split(",").filter((f) => config.columns[f]) : Object.keys(config.columns);
    const headers = requested.length ? requested : Object.keys(config.columns);
    const selectList = headers.map((h) => `${config.columns[h]} AS ${h}`).join(", ");

    const where = [];
    const params = [];
    if (status && status !== "all") {
      params.push(status);
      where.push(`${EXPORT_STATUS_COL[type]} = $${params.length}`);
    }
    if (date_from) {
      params.push(date_from);
      where.push(`${EXPORT_DATE_COL[type]} >= $${params.length}`);
    }
    if (date_to) {
      params.push(date_to);
      where.push(`${EXPORT_DATE_COL[type]} < ($${params.length}::date + INTERVAL '1 day')`);
    }
    const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const result = await pool.query(
      `SELECT ${selectList} FROM ${config.from} ${whereClause} ORDER BY ${config.order}`,
      params
    );
    const csvContent = convertToCSV(headers, result.rows);

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${type}_export_${Date.now()}.csv"`);
    res.status(200).send(csvContent);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
