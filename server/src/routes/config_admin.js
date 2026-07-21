// server/src/routes/config_admin.js
const express = require("express");
const router = express.Router();
const pool = require("../db/pool");
const { protect, requireRole } = require("../middleware/authMiddleware");

// All routes require authentication
router.use(protect);

// Allow read-only (GET) operations for all authenticated staff.
// Restrict modifying operations (POST, PUT, DELETE) to superadmin, admin, or manager.
router.use((req, res, next) => {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    return next();
  }
  requireRole("superadmin", "admin", "manager")(req, res, next);
});

// ── CATEGORIES ────────────────────────────────────────────────────────
router.get("/categories", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT c.*, 
        (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id) as products
       FROM categories c ORDER BY c.id DESC`
    );
    res.json({ categories: result.rows });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/categories", async (req, res) => {
  try {
    const { name, code, description, status } = req.body;
    const result = await pool.query(
      `INSERT INTO categories (name, code, description, status) 
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [name, code, description, status || 'active']
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put("/categories/:id", async (req, res) => {
  try {
    const { name, code, description, status } = req.body;
    const result = await pool.query(
      `UPDATE categories SET name=$1, code=$2, description=$3, status=$4 WHERE id=$5 RETURNING *`,
      [name, code, description, status, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete("/categories/:id", async (req, res) => {
  try {
    await pool.query(`DELETE FROM categories WHERE id=$1`, [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── SUBCATEGORIES ─────────────────────────────────────────────────────
router.get("/subcategories", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT s.*, c.name as category_name 
      FROM subcategories s
      LEFT JOIN categories c ON c.id = s.category_id
      ORDER BY s.id DESC
    `);
    res.json({ subcategories: result.rows });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/subcategories", async (req, res) => {
  try {
    const { category_id, name, code, description, status } = req.body;
    const result = await pool.query(
      `INSERT INTO subcategories (category_id, name, code, description, status) 
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [category_id, name, code, description, status || 'active']
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put("/subcategories/:id", async (req, res) => {
  try {
    const { category_id, name, code, description, status } = req.body;
    const result = await pool.query(
      `UPDATE subcategories SET category_id=$1, name=$2, code=$3, description=$4, status=$5 WHERE id=$6 RETURNING *`,
      [category_id, name, code, description, status, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete("/subcategories/:id", async (req, res) => {
  try {
    await pool.query(`DELETE FROM subcategories WHERE id=$1`, [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── UNITS ─────────────────────────────────────────────────────────────
router.get("/units", async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM units ORDER BY id DESC`);
    res.json({ units: result.rows });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/units", async (req, res) => {
  try {
    const { name, short, type, step, status } = req.body;
    const result = await pool.query(
      `INSERT INTO units (name, short, type, step, status) 
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [name, short, type, step || 1.0, status || 'active']
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put("/units/:id", async (req, res) => {
  try {
    const { name, short, type, step, status } = req.body;
    const result = await pool.query(
      `UPDATE units SET name=$1, short=$2, type=$3, step=$4, status=$5 WHERE id=$6 RETURNING *`,
      [name, short, type, step, status, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete("/units/:id", async (req, res) => {
  try {
    await pool.query(`DELETE FROM units WHERE id=$1`, [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── WARRANTIES ────────────────────────────────────────────────────────
router.get("/warranties", async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM warranties ORDER BY id DESC`);
    res.json({ warranties: result.rows });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/warranties", async (req, res) => {
  try {
    const { name, duration, type, description, status } = req.body;
    const result = await pool.query(
      `INSERT INTO warranties (name, duration, type, description, status) 
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [name, duration, type, description, status || 'active']
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put("/warranties/:id", async (req, res) => {
  try {
    const { name, duration, type, description, status } = req.body;
    const result = await pool.query(
      `UPDATE warranties SET name=$1, duration=$2, type=$3, description=$4, status=$5 WHERE id=$6 RETURNING *`,
      [name, duration, type, description, status, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete("/warranties/:id", async (req, res) => {
  try {
    await pool.query(`DELETE FROM warranties WHERE id=$1`, [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
