const express = require("express");
const router = express.Router();
const pool = require("../db/pool");
const { protect } = require("../middleware/authMiddleware");
const { trackActivity } = require("../utils/aiContext");

// ─────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────
const VALID_STATUSES = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
];

// ─────────────────────────────────────────────
// CREATE ORDER
// ─────────────────────────────────────────────
router.post("/", protect, async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const { items, total, payment_method, payment_ref, address, source } = req.body;

    if (!items || !items.length) {
      return res.status(400).json({ message: "No items in order" });
    }

    const orderId = "BF-" + Date.now().toString(36).toUpperCase();

    // Insert order
    await client.query(
      `INSERT INTO orders 
       (id, user_id, total, status, payment_method, payment_ref, address, created_at, source)
       VALUES ($1, $2, $3, 'pending', $4, $5, $6, NOW(), $7)`,
      [
        orderId,
        req.user.id,
        parseFloat(total) || 0,
        payment_method || "paystack",
        payment_ref || null,
        address || "",
        source || "Web App",
      ],
    );

    // Insert order items + update stock
    for (const item of items) {
      await client.query(
        `INSERT INTO order_items (order_id, product_id, quantity, price)
         VALUES ($1, $2, $3, $4)`,
        [
          orderId,
          parseInt(item.product_id),
          parseInt(item.quantity),
          parseFloat(item.price),
        ],
      );

      await client.query(
        `UPDATE products 
         SET stock = GREATEST(0, COALESCE(stock, 100) - $1)
         WHERE id = $2`,
        [parseInt(item.quantity), parseInt(item.product_id)],
      );
    }

    await client.query("COMMIT");

    // Log order creation for AI memory
    trackActivity(req.user.id, "order_created", {
      entityType: "order",
      entityId: orderId,
      metadata: { total: parseFloat(total) || 0, item_count: items.length },
      ip: req.ip || req.connection?.remoteAddress
    });

    return res.status(201).json({
      message: "Order created",
      orderId,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    return res.status(500).json({
      message: "Order failed: " + err.message,
    });
  } finally {
    client.release();
  }
});

// ─────────────────────────────────────────────
// GET USER ORDERS
// ─────────────────────────────────────────────
router.get("/", protect, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         o.id, o.total, o.status, o.payment_method, o.address,
         o.created_at, o.cancelled_at, o.cancel_reason,
         COALESCE(o.tracking_status, o.status) as tracking_status,
         json_agg(
           json_build_object(
             'name', p.name,
             'quantity', oi.quantity,
             'price', oi.price,
             'product_id', p.id,
             'image_url', p.image_url
           )
         ) as items
       FROM orders o
       JOIN order_items oi ON oi.order_id = o.id
       JOIN products p ON p.id = oi.product_id
       WHERE o.user_id = $1
       GROUP BY o.id
       ORDER BY o.created_at DESC`,
      [req.user.id],
    );

    res.json({ orders: result.rows });
  } catch (err) {
    res.status(500).json({
      message: "Failed to fetch orders: " + err.message,
    });
  }
});

// ─────────────────────────────────────────────
// GET SINGLE ORDER
// ─────────────────────────────────────────────
router.get("/:id", protect, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT
         o.id, o.total, o.status, o.payment_method, o.payment_ref, o.address,
         o.created_at, o.cancelled_at, o.cancel_reason,
         COALESCE(o.tracking_status, o.status) as tracking_status,
         o.tracking_notes,
         json_agg(
           json_build_object(
             'name', p.name,
             'quantity', oi.quantity,
             'price', oi.price,
             'product_id', p.id,
             'image_url', p.image_url
           )
         ) as items
       FROM orders o
       JOIN order_items oi ON oi.order_id = o.id
       JOIN products p ON p.id = oi.product_id
       WHERE o.id = $1 AND o.user_id = $2
       GROUP BY o.id`,
      [id, req.user.id],
    );

    if (!result.rows.length) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.json({ order: result.rows[0] });
  } catch (err) {
    res.status(500).json({
      message: "Failed to fetch order: " + err.message,
    });
  }
});

// ─────────────────────────────────────────────
// UPDATE ORDER STATUS (ADMIN ONLY - SIMPLE VERSION)
// ─────────────────────────────────────────────
router.patch("/:id/status", protect, async (req, res) => {
  try {
    // TEMP SIMPLE ADMIN CHECK
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    const { id } = req.params;
    const { status } = req.body;

    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        message: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}`,
      });
    }

    const result = await pool.query(
      `UPDATE orders
       SET status = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [status, id],
    );

    if (!result.rows.length) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.json({
      message: "Order status updated successfully",
      order: result.rows[0],
    });
  } catch (err) {
    res.status(500).json({
      message: "Failed to update status: " + err.message,
    });
  }
});

// ─────────────────────────────────────────────
// CANCEL ORDER
// ─────────────────────────────────────────────
router.patch("/:id/cancel", protect, async (req, res) => {
  const client = await pool.connect();

  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason || reason.trim().length < 3) {
      return res.status(400).json({
        message: "Cancellation reason is required",
      });
    }

    const order = await client.query(
      `SELECT * FROM orders WHERE id = $1 AND user_id = $2`,
      [id, req.user.id],
    );

    if (!order.rows.length) {
      return res.status(404).json({ message: "Order not found" });
    }

    const o = order.rows[0];

    if (!["pending", "confirmed"].includes(o.status)) {
      return res.status(400).json({
        message: "This order can no longer be cancelled",
      });
    }

    await client.query("BEGIN");

    await client.query(
      `UPDATE orders
       SET status='cancelled',
           cancel_reason=$1,
           cancelled_at=NOW()
       WHERE id=$2`,
      [reason.trim(), id],
    );

    const items = await client.query(
      `SELECT product_id, quantity FROM order_items WHERE order_id=$1`,
      [id],
    );

    for (const item of items.rows) {
      await client.query(
        `UPDATE products
         SET stock = COALESCE(stock, 0) + $1
         WHERE id = $2`,
        [item.quantity, item.product_id],
      );
    }

    await client.query("COMMIT");

    res.json({
      message: "Order cancelled successfully",
    });
  } catch (err) {
    await client.query("ROLLBACK");

    res.status(500).json({
      message: "Cancellation failed: " + err.message,
    });
  } finally {
    client.release();
  }
});

module.exports = router;
