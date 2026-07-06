const express = require("express");
const router = express.Router();
const { protect, adminOnly } = require("../middleware/authMiddleware");
const {
  getStats,
  updateOrderStatus,
  getAllOrders,
  updateProduct,
  deleteProduct,
  addProduct,
  getSubscribers,
} = require("../controllers/adminController");
console.log("getSubscribers:", getSubscribers);

const {
  getAllReturns,
  updateReturn,
} = require("../controllers/returnsController");
const pool = require("../db/pool");
const { trackActivity } = require("../utils/aiContext");

router.get("/stats", protect, adminOnly, getStats);
router.get("/subscribers", protect, adminOnly, getSubscribers);
router.post("/products", protect, adminOnly, addProduct);
router.put("/products/:id", protect, adminOnly, updateProduct);
router.delete("/products/:id", protect, adminOnly, deleteProduct);
router.get("/orders", protect, adminOnly, getAllOrders);
router.patch("/orders/:id/status", protect, adminOnly, updateOrderStatus);
router.get("/returns", protect, adminOnly, getAllReturns);
router.patch("/returns/:id", protect, adminOnly, updateReturn);

// Products CRUD
router.get("/products", protect, async (req, res) => {
  const r = await pool.query(
    `SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON c.id=p.category_id ORDER BY p.id`,
  );
  res.json({ products: r.rows });
});
router.post("/products", protect, async (req, res) => {
  const {
    name,
    price,
    unit,
    description,
    is_featured,
    image_url,
    category_id,
    stock,
  } = req.body;
  const r = await pool.query(
    `INSERT INTO products (name, price, unit, description, is_featured, image_url, category_id, stock)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [
      name,
      parseFloat(price) / 1500,
      unit,
      description || "",
      is_featured || false,
      image_url || "",
      parseInt(category_id) || 1,
      parseInt(stock) || 100,
    ],
  );
  const product = r.rows[0];
  trackActivity(req.user.id, "product_created", {
    entityType: "product",
    entityId: product.id,
    metadata: { name: product.name, price: product.price, stock: product.stock }
  });
  res.status(201).json({ product });
});
router.put("/products/:id", protect, async (req, res) => {
  const { name, price, unit, description, is_featured, image_url, stock } =
    req.body;
  const r = await pool.query(
    `UPDATE products SET name=$1,price=$2,unit=$3,description=$4,is_featured=$5,image_url=$6,stock=$7 WHERE id=$8 RETURNING *`,
    [
      name,
      parseFloat(price) / 1500,
      unit,
      description || "",
      is_featured || false,
      image_url || "",
      parseInt(stock) || 100,
      parseInt(req.params.id),
    ],
  );
  const product = r.rows[0];
  trackActivity(req.user.id, "product_updated", {
    entityType: "product",
    entityId: product.id,
    metadata: { name: product.name, price: product.price, stock: product.stock }
  });
  res.json({ product });
});
router.delete("/products/:id", protect, async (req, res) => {
  const id = parseInt(req.params.id);
  await pool.query("DELETE FROM order_items WHERE product_id=$1", [id]);
  await pool.query("DELETE FROM cart_items WHERE product_id=$1", [id]);
  await pool.query("DELETE FROM products WHERE id=$1", [id]);
  trackActivity(req.user.id, "product_deleted", {
    entityType: "product",
    entityId: id
  });
  res.json({ message: "Deleted" });
});

// Returns (admin)
router.get("/returns", protect, async (req, res) => {
  const r = await pool.query(`
    SELECT r.*, p.name as product_name, u.name as customer_name, u.email as customer_email
    FROM returns r JOIN products p ON p.id=r.product_id JOIN users u ON u.id=r.user_id
    ORDER BY r.created_at DESC
  `);
  res.json({ returns: r.rows });
});
router.patch("/returns/:id", protect, async (req, res) => {
  const { status } = req.body;
  await pool.query("UPDATE returns SET status=$1 WHERE id=$2", [
    status,
    req.params.id,
  ]);
  trackActivity(req.user.id, "return_processed", {
    entityType: "return",
    entityId: req.params.id,
    metadata: { status }
  });
  res.json({ message: "Updated" });
});

// Subscribers
router.get("/subscribers", protect, async (req, res) => {
  const r = await pool.query(
    "SELECT * FROM email_subscriptions ORDER BY subscribed_at DESC",
  );
  res.json({ subscribers: r.rows });
});

module.exports = router;
