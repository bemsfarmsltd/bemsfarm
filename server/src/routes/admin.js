// Legacy admin route — only the paths not covered by a dedicated
// /api/admin/* router (products_admin.js, orders_admin.js, etc).
const express = require("express");
const router = express.Router();
const pool = require("../db/pool");
const { protect, adminOnly } = require("../middleware/authMiddleware");
const { getStats, getSubscribers } = require("../controllers/adminController");
const {
  getAllReturns,
  updateReturn,
  setItemDisposition,
} = require("../controllers/returnsController");

router.get("/stats", protect, adminOnly, getStats);
router.get("/subscribers", protect, adminOnly, getSubscribers);
router.get("/returns", protect, adminOnly, getAllReturns);
router.patch("/returns/:id", protect, adminOnly, updateReturn);
router.post("/returns/items/:itemId/disposition", protect, adminOnly, setItemDisposition);

// ── GET /api/admin/search?q= ── global topbar search across products, orders, customers, staff
router.get("/search", protect, async (req, res, next) => {
  try {
    const q = (req.query.q || "").trim();
    if (q.length < 2) return res.json({ products: [], orders: [], customers: [], staff: [] });

    const like = `%${q}%`;

    const [products, orders, customers, staff] = await Promise.all([
      pool.query(
        `SELECT id, name, sku, price, stock, image_url
         FROM products
         WHERE name ILIKE $1 OR sku ILIKE $1 OR barcode ILIKE $1
         ORDER BY name ASC LIMIT 6`,
        [like]
      ),
      pool.query(
        `SELECT id, order_ref, customer_name, customer_phone, status, total, created_at
         FROM orders
         WHERE order_ref ILIKE $1 OR customer_name ILIKE $1 OR customer_phone ILIKE $1 OR id::text ILIKE $1
         ORDER BY created_at DESC LIMIT 6`,
        [like]
      ),
      pool.query(
        `SELECT id, name, phone, email, customer_code
         FROM customers
         WHERE name ILIKE $1 OR phone ILIKE $1 OR email ILIKE $1 OR customer_code ILIKE $1
         ORDER BY name ASC LIMIT 6`,
        [like]
      ),
      pool.query(
        `SELECT id, name, email, role
         FROM users
         WHERE role != 'customer' AND (name ILIKE $1 OR email ILIKE $1)
         ORDER BY name ASC LIMIT 6`,
        [like]
      ),
    ]);

    res.json({
      products: products.rows,
      orders: orders.rows,
      customers: customers.rows,
      staff: staff.rows,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
