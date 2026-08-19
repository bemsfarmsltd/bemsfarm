const express = require("express");
const router = express.Router();
const pool = require("../db/pool");
const { protect, requireRole } = require("../middleware/authMiddleware");
const { trackActivity } = require("../utils/aiContext");
const { NAIRA_PER_UNIT } = require("../utils/currency");
const { verifyMonnifyTransaction } = require("../utils/monnify");
const { validateCoupon, recordCouponUsage } = require("../utils/coupons");
const validate = require("../middleware/validate");
const orderSchemas = require("../schemas/orderSchemas");
const { restoreOrderStock } = require("../utils/orderStock");
const { submitReturn, getUserReturns } = require("../controllers/returnsController");

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

const VALID_PAYMENT_METHODS = ["monnify", "cod"];

// Must mirror client/src/utils/delivery.js exactly — Cart and Checkout used
// to disagree (Cart: free above ₦15,000, Checkout: flat ₦500), and this
// value is also what a Monnify payment is checked against, so any mismatch
// here means a customer paying the amount they were shown gets rejected
// with "amount does not match order total".
const FREE_DELIVERY_THRESHOLD = 15000;
const STANDARD_DELIVERY_FEE = 1500;
function getDeliveryFee(subtotal) {
  return subtotal > FREE_DELIVERY_THRESHOLD ? 0 : STANDARD_DELIVERY_FEE;
}

// ─────────────────────────────────────────────
// CREATE ORDER
// Prices/total are ALWAYS recomputed here from the products table.
// Client-supplied price/total values are never trusted.
// ─────────────────────────────────────────────
router.post("/", protect, validate(orderSchemas.createOrder), async (req, res, next) => {
  const { items, payment_method, payment_ref, address, source, coupon_code } = req.body;

  const method = payment_method || "monnify";
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

  // For Monnify orders, verify the transaction with Monnify directly
  // BEFORE touching the DB — never trust the client's "payment succeeded"
  // callback, and never hold a row lock for a slow HTTP call.
  // NOTE: Monnify amounts are plain Naira decimals (unlike Paystack's kobo).
  let monnifyData = null;
  if (method === "monnify") {
    if (!payment_ref) {
      return res.status(400).json({ message: "Missing payment reference" });
    }
    try {
      monnifyData = await verifyMonnifyTransaction(payment_ref);
    } catch (err) {
      return res.status(402).json({
        message: "Payment could not be verified: " + err.message,
      });
    }
    if (monnifyData.paymentStatus !== "PAID") {
      return res.status(402).json({ message: "Payment was not successful" });
    }
    if (monnifyData.currency !== "NGN") {
      return res.status(402).json({ message: "Unexpected payment currency" });
    }
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Idempotency: don't let the same Monnify payment fund two orders
    if (method === "monnify") {
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
       FROM products WHERE id = ANY($1::int[]) AND status != 'archived' FOR UPDATE`,
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
      const couponResult = await validateCoupon(client, { code: coupon_code, subtotal, userId: req.user.id });
      if (!couponResult.ok) {
        await client.query("ROLLBACK");
        return res.status(400).json({ message: couponResult.message });
      }
      appliedCoupon = couponResult.coupon;
      couponDiscount = couponResult.discount;
    }

    const total = subtotal - couponDiscount + getDeliveryFee(subtotal);

    // Reconcile: the amount actually paid via Monnify must match the
    // server-computed total (protects against a tampered client-side amount).
    // Monnify amounts are plain Naira decimals, not kobo.
    if (method === "monnify") {
      if (Math.abs(monnifyData.amountPaid - total) > 1) {
        await client.query("ROLLBACK");
        return res.status(402).json({
          message: "Amount paid does not match order total. Please contact support with reference " + payment_ref,
        });
      }
    }

    const orderId = "BF-" + Date.now().toString(36).toUpperCase();
    const status = method === "monnify" ? "confirmed" : "pending";

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
        method === "monnify" ? payment_ref : null,
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
      await recordCouponUsage(client, { coupon: appliedCoupon, discount: couponDiscount, userId: req.user.id, orderId });
    }

    // Monnify's webhook can arrive before this order row exists (it fires the
    // moment Monnify's backend sees the payment, independent of our own
    // create-order round trip). When that happens, the webhook's order lookup
    // in misc.js finds nothing, writes its `payments` row with order_id=NULL,
    // and — since webhooks aren't retried on a 2xx response — never gets
    // another chance to link it or write the income ledger entry. Close that
    // gap here: if an orphaned payment for this payment_ref is already
    // sitting there, link it and backfill the ledger entry the webhook would
    // have written had it found this order in time.
    if (method === "monnify") {
      const orphanedPayment = await client.query(
        "UPDATE payments SET order_id = $1, updated_at = NOW() WHERE payment_ref = $2 AND order_id IS NULL RETURNING id",
        [orderId, payment_ref],
      );
      if (orphanedPayment.rows.length > 0) {
        const systemUserRes = await client.query(
          "SELECT id FROM users ORDER BY (CASE WHEN role='superadmin' THEN 1 WHEN role='manager' THEN 2 WHEN role='admin' THEN 3 ELSE 4 END) LIMIT 1",
        );
        const systemUserId = systemUserRes.rows[0]?.id || null;
        await client.query(
          `INSERT INTO income (reference, source, source_type, category, description, amount, payment_method, order_id, status, date, created_by)
           VALUES ($1, 'sales', 'online_order', 'POS/Online Sale', $2, $3, 'transfer', $4, 'completed', CURRENT_DATE, $5)
           ON CONFLICT (reference) DO NOTHING`,
          [`INC-${payment_ref}`, `Automated payment reconciliation for Order #${orderId}`, monnifyData.amountPaid, String(orderId), systemUserId],
        );
      }
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
    return next(err);
  } finally {
    client.release();
  }
});

// ─────────────────────────────────────────────
// GET USER ORDERS
// ─────────────────────────────────────────────
router.get("/", protect, async (req, res, next) => {
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
    next(err);
  }
});

// ─────────────────────────────────────────────
// RETURNS — must be registered before GET/POST "/:id" below, or
// Express would match "/returns" as :id="returns" first.
// ─────────────────────────────────────────────
router.get("/returns", protect, getUserReturns);
router.post("/returns", protect, submitReturn);

// ─────────────────────────────────────────────
// GET SINGLE ORDER
// ─────────────────────────────────────────────
router.get("/:id", protect, async (req, res, next) => {
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
    next(err);
  }
});

// ─────────────────────────────────────────────
// UPDATE ORDER STATUS (ADMIN ONLY - SIMPLE VERSION)
// ─────────────────────────────────────────────
router.patch(
  "/:id/status",
  protect,
  requireRole("superadmin", "admin", "manager", "delivery_manager"),
  validate(orderSchemas.updateStatus(VALID_STATUSES)),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

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
      next(err);
    }
  },
);

// ─────────────────────────────────────────────
// CANCEL ORDER
// ─────────────────────────────────────────────
router.patch("/:id/cancel", protect, validate(orderSchemas.cancelOrder), async (req, res, next) => {
  const client = await pool.connect();

  try {
    const { id } = req.params;
    const { reason } = req.body;

    await client.query("BEGIN");

    // Lock the row and re-check status inside the transaction — without
    // this, two concurrent cancel requests for the same order (e.g. a
    // double-submitted click) could both pass the status check before
    // either commits, restoring stock twice for one order.
    const order = await client.query(
      `SELECT * FROM orders WHERE id = $1 AND user_id = $2 FOR UPDATE`,
      [id, req.user.id],
    );

    if (!order.rows.length) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Order not found" });
    }

    const o = order.rows[0];

    if (!["pending", "confirmed"].includes(o.status)) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        message: "This order can no longer be cancelled",
      });
    }

    await client.query(
      `UPDATE orders
       SET status='cancelled',
           cancel_reason=$1,
           cancelled_at=NOW()
       WHERE id=$2`,
      [reason.trim(), id],
    );

    await restoreOrderStock(client, id);

    await client.query("COMMIT");

    res.json({
      message: "Order cancelled successfully",
    });
  } catch (err) {
    await client.query("ROLLBACK");
    next(err);
  } finally {
    client.release();
  }
});

module.exports = router;
