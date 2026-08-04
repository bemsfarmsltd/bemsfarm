const express = require("express");
const router = express.Router();
const pool = require("../db/pool");
const { protect, requireRole } = require("../middleware/authMiddleware");
const { trackActivity } = require("../utils/aiContext");
const { NAIRA_PER_UNIT } = require("../utils/currency");
const { verifyPaystackTransaction } = require("../utils/paystack");
const { validateCoupon, recordCouponUsage } = require("../utils/coupons");

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

const VALID_PAYMENT_METHODS = ["paystack", "cod"];
const DELIVERY_FEE = 500; // Naira — must match client/src/pages/CheckoutPage.jsx DELIVERY

// ─────────────────────────────────────────────
// CREATE ORDER
// Prices/total are ALWAYS recomputed here from the products table.
// Client-supplied price/total values are never trusted.
// ─────────────────────────────────────────────
router.post("/", protect, async (req, res) => {
  const { items, payment_method, payment_ref, address, source, coupon_code } = req.body;

  if (!items || !items.length) {
    return res.status(400).json({ message: "No items in order" });
  }

  const method = payment_method || "paystack";
  if (!VALID_PAYMENT_METHODS.includes(method)) {
    return res.status(400).json({ message: "Invalid payment method" });
  }

  // Normalize + dedupe requested items
  const requested = new Map();
  for (const item of items) {
    const productId = parseInt(item.product_id);
    const quantity = parseInt(item.quantity);
    if (!Number.isInteger(productId) || !Number.isInteger(quantity) || quantity <= 0) {
      return res.status(400).json({ message: "Invalid item in order" });
    }
    requested.set(productId, (requested.get(productId) || 0) + quantity);
  }

  // For Paystack orders, verify the transaction with Paystack directly
  // BEFORE touching the DB — never trust the client's "payment succeeded"
  // callback, and never charge order rows/stock a lock for a slow HTTP call.
  let paystackData = null;
  if (method === "paystack") {
    if (!payment_ref) {
      return res.status(400).json({ message: "Missing payment reference" });
    }
    try {
      paystackData = await verifyPaystackTransaction(payment_ref);
    } catch (err) {
      return res.status(402).json({
        message: "Payment could not be verified: " + err.message,
      });
    }
    if (paystackData.status !== "success") {
      return res.status(402).json({ message: "Payment was not successful" });
    }
    if (paystackData.currency !== "NGN") {
      return res.status(402).json({ message: "Unexpected payment currency" });
    }
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Idempotency: don't let the same Paystack payment fund two orders
    if (method === "paystack") {
      const dup = await client.query(
        "SELECT id FROM orders WHERE payment_ref = $1",
        [payment_ref],
      );
      if (dup.rows.length) {
        await client.query("ROLLBACK");
        return res.status(200).json({
          message: "Order already created for this payment",
          orderId: dup.rows[0].id,
        });
      }
    }

    const productIds = [...requested.keys()];
    const productRows = await client.query(
      `SELECT id, name, price, stock, available_for_sale
       FROM products WHERE id = ANY($1::int[]) FOR UPDATE`,
      [productIds],
    );
    const productsById = new Map(productRows.rows.map((p) => [p.id, p]));

    let subtotal = 0;
    const orderItemRows = [];
    for (const [productId, quantity] of requested) {
      const p = productsById.get(productId);
      if (!p) {
        await client.query("ROLLBACK");
        return res.status(400).json({ message: `Product ${productId} is not available` });
      }
      if (p.available_for_sale === false) {
        await client.query("ROLLBACK");
        return res.status(400).json({ message: `${p.name} is no longer available` });
      }
      const availableStock = p.stock ?? 0;
      if (quantity > availableStock) {
        await client.query("ROLLBACK");
        return res.status(400).json({
          message: `Only ${availableStock} of "${p.name}" left in stock`,
        });
      }
      const unitPrice = parseFloat(p.price) * NAIRA_PER_UNIT;
      const lineTotal = unitPrice * quantity;
      subtotal += lineTotal;
      orderItemRows.push({ productId, quantity, unitPrice });
    }

    // Coupon discount is recomputed here from the coupons table — the
    // client's preview discount is never trusted directly.
    let appliedCoupon = null;
    let couponDiscount = 0;
    if (coupon_code) {
      const couponResult = await validateCoupon(client, { code: coupon_code, subtotal, customerId: null });
      if (!couponResult.ok) {
        await client.query("ROLLBACK");
        return res.status(400).json({ message: couponResult.message });
      }
      appliedCoupon = couponResult.coupon;
      couponDiscount = couponResult.discount;
    }

    const total = subtotal - couponDiscount + DELIVERY_FEE;

    // Reconcile: the amount actually paid via Paystack must match the
    // server-computed total (protects against a tampered client-side amount).
    if (method === "paystack") {
      const expectedKobo = Math.round(total * 100);
      if (Math.abs(paystackData.amount - expectedKobo) > 1) {
        await client.query("ROLLBACK");
        return res.status(402).json({
          message: "Amount paid does not match order total. Please contact support with reference " + payment_ref,
        });
      }
    }

    const orderId = "BF-" + Date.now().toString(36).toUpperCase();
    const status = method === "paystack" ? "confirmed" : "pending";

    await client.query(
      `INSERT INTO orders
       (id, user_id, total, discount_amount, status, payment_method, payment_ref, address, created_at, source)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), $9)`,
      [
        orderId,
        req.user.id,
        total,
        couponDiscount,
        status,
        method,
        method === "paystack" ? payment_ref : null,
        address || "",
        source || "Web App",
      ],
    );

    for (const item of orderItemRows) {
      await client.query(
        `INSERT INTO order_items (order_id, product_id, quantity, price)
         VALUES ($1, $2, $3, $4)`,
        [orderId, item.productId, item.quantity, item.unitPrice],
      );

      await client.query(
        `UPDATE products
         SET stock = GREATEST(0, COALESCE(stock, 0) - $1),
             stock_quantity = GREATEST(0, COALESCE(stock_quantity, 0) - $1)
         WHERE id = $2`,
        [item.quantity, item.productId],
      );
    }

    if (appliedCoupon) {
      await recordCouponUsage(client, { coupon: appliedCoupon, discount: couponDiscount, customerId: null, orderId });
    }

    await client.query("COMMIT");

    // Log order creation for AI memory
    trackActivity(req.user.id, "order_created", {
      entityType: "order",
      entityId: orderId,
      metadata: { total, item_count: orderItemRows.length },
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
router.patch(
  "/:id/status",
  protect,
  requireRole("superadmin", "admin", "manager", "delivery_manager"),
  async (req, res) => {
    try {
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
  },
);

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
