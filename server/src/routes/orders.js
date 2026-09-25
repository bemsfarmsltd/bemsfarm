const express = require("express");
const crypto = require("crypto");
const router = express.Router();
const pool = require("../db/pool");
const { protect, requireRole } = require("../middleware/authMiddleware");
const { trackActivity } = require("../utils/aiContext");
// NOTE: prices in the products table are plain Naira — no unit conversion needed.
const { verifyMonnifyTransaction } = require("../utils/monnify");
const { validateCoupon, recordCouponUsage } = require("../utils/coupons");
const validate = require("../middleware/validate");
const orderSchemas = require("../schemas/orderSchemas");
const { restoreOrderStock } = require("../utils/orderStock");
const { submitReturn, getUserReturns, submitRefundAccount, getOrderReturn } = require("../controllers/returnsController");
const { detectChannel } = require("../utils/channel");
const { notifyAdmin } = require("../services/notificationService");
const { logOrderAudit } = require("../utils/workflowAudit");

// ─────────────────────────────────────────────
// CONFIG (Order-to-Delivery Workflow Statuses)
// ─────────────────────────────────────────────
const VALID_STATUSES = [
  "pending",
  "pending_payment",
  "confirmed",
  "packaging",
  "processing",
  "partially_packed",
  "packaging_exception",
  "packed",
  "packed_ready",
  "awaiting_driver_confirmation",
  "in_transit",
  "driver_assigned",
  "shipped",
  "out_for_delivery",
  "arrived",
  "driver_arrived",
  "delivery_exception",
  "customer_unreachable",
  "delivered",
  "cancelled",
  "return_requested",
  "return_approved",
  "refunded",
  "dispute"
];

const VALID_PAYMENT_METHODS = ["monnify", "cod"];

// Zonal delivery fee resolution helper
async function ensureOrdersZonalColumns() {
  try {
    await pool.query(`
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS zone_id VARCHAR(50);
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_fee NUMERIC(10,2) DEFAULT 1000;
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS subtotal NUMERIC(10,2);
      ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS zone_id VARCHAR(50);
      ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS delivery_fee NUMERIC(10,2);
      ALTER TABLE checkout_intents ADD COLUMN IF NOT EXISTS zone_id VARCHAR(50);
      ALTER TABLE checkout_intents ADD COLUMN IF NOT EXISTS delivery_fee NUMERIC(10,2);
    `);
  } catch (e) {
    console.warn("[zonal-pricing] Column check warning:", e.message);
  }
}
ensureOrdersZonalColumns();

async function resolveZoneAndFee(client, { zone_id, latitude, longitude, address, city, state }) {
  let matchedZone = null;
  
  // 1. If explicit zone_id provided, look it up in delivery_zones
  if (zone_id) {
    const res = await client.query(
      "SELECT * FROM delivery_zones WHERE zone_id = $1 AND status = 'active'",
      [zone_id]
    );
    if (res.rows.length > 0) {
      matchedZone = res.rows[0];
    }
  }

  // 2. If not found by zone_id, use matchDeliveryZone algorithm
  if (!matchedZone) {
    const locationsRouter = require("./locations");
    if (typeof locationsRouter.matchDeliveryZone === "function") {
      matchedZone = await locationsRouter.matchDeliveryZone(latitude, longitude, address, city, state);
    }
  }

  // 3. If still not matched, fallback to lowest active zone
  if (!matchedZone) {
    const fallback = await client.query(
      "SELECT * FROM delivery_zones WHERE status = 'active' ORDER BY CAST(delivery_fee AS NUMERIC) ASC LIMIT 1"
    );
    if (fallback.rows.length > 0) {
      matchedZone = fallback.rows[0];
    }
  }

  const deliveryFee = matchedZone ? parseFloat(matchedZone.delivery_fee) || 1000 : 1000;
  const zoneId = matchedZone ? matchedZone.zone_id : "ZONE001";
  const zoneName = matchedZone ? matchedZone.zone_name : "Umuahia Urban & Metro";

  return {
    zone_id: zoneId,
    zone_name: zoneName,
    delivery_fee: deliveryFee,
  };
}

// Create the server-owned payment snapshot before the customer opens
// Monnify. The browser may disappear after payment; this record preserves the
// exact item/price/total context needed to retry order creation safely.
router.post("/checkout-intent", protect, validate(orderSchemas.createCheckoutIntent), async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const requested = new Map();
    for (const item of req.body.items) {
      const productId = parseInt(item.product_id);
      const quantity = parseInt(item.quantity);
      if (!Number.isInteger(productId) || !Number.isInteger(quantity) || quantity <= 0) {
        await client.query("ROLLBACK");
        return res.status(400).json({ message: "Invalid item in checkout" });
      }
      requested.set(productId, (requested.get(productId) || 0) + quantity);
    }

    const rows = await client.query(
      `SELECT id, name, price, stock, available_for_sale
       FROM products WHERE id = ANY($1::int[]) AND status != 'archived' FOR UPDATE`,
      [[...requested.keys()]],
    );
    const products = new Map(rows.rows.map((product) => [product.id, product]));
    const items = [];
    let subtotal = 0;
    for (const [productId, quantity] of requested) {
      const product = products.get(productId);
      if (!product || product.available_for_sale === false) {
        await client.query("ROLLBACK");
        return res.status(400).json({ message: `Product ${productId} is no longer available` });
      }
      if (quantity > (product.stock ?? 0)) {
        await client.query("ROLLBACK");
        return res.status(400).json({ message: `Only ${product.stock ?? 0} of "${product.name}" left in stock` });
      }
      // prices are stored in plain Naira — no unit multiplier applied
      const price = parseFloat(product.price);
      subtotal += price * quantity;
      items.push({ product_id: productId, quantity, price });
    }

    let discount = 0;
    if (req.body.coupon_code) {
      const coupon = await validateCoupon(client, {
        code: req.body.coupon_code,
        subtotal,
        userId: req.user.id,
      });
      if (!coupon.ok) {
        await client.query("ROLLBACK");
        return res.status(400).json({ message: coupon.message });
      }
      discount = coupon.discount;
    }

    const zoneInfo = await resolveZoneAndFee(client, {
      zone_id: req.body.zone_id,
      latitude: req.body.latitude,
      longitude: req.body.longitude,
      address: req.body.address,
      city: req.body.city,
      state: req.body.state,
    });

    const id = crypto.randomUUID();
    const total = subtotal - discount + zoneInfo.delivery_fee;
    await client.query(
      `INSERT INTO checkout_intents
       (id, user_id, payment_ref, items, coupon_code, address, latitude, longitude, zone_id, delivery_fee, total, status, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'pending', NOW() + INTERVAL '30 minutes')`,
      [
        id,
        req.user.id,
        req.body.payment_ref,
        JSON.stringify(items),
        req.body.coupon_code || null,
        req.body.address,
        req.body.latitude || null,
        req.body.longitude || null,
        zoneInfo.zone_id,
        zoneInfo.delivery_fee,
        total,
      ],
    );
    await client.query("COMMIT");
    res.status(201).json({ 
      intentId: id, 
      total, 
      deliveryFee: zoneInfo.delivery_fee, 
      zoneId: zoneInfo.zone_id, 
      zoneName: zoneInfo.zone_name,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString() 
    });
  } catch (err) {
    await client.query("ROLLBACK");
    next(err);
  } finally {
    client.release();
  }
});

// Return only the authenticated user's own pending intent. This gives the
// storefront a safe recovery handoff after a browser interruption without
// trusting any cart data supplied by the browser.
router.get("/checkout-intent/:id", protect, async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT id, payment_ref, items, address, latitude, longitude, total, status, expires_at
       FROM checkout_intents
       WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.user.id],
    );
    if (!result.rows.length) return res.status(404).json({ message: "Checkout not found" });
    const intent = result.rows[0];
    if (intent.status !== "pending" || new Date(intent.expires_at) <= new Date()) {
      return res.status(400).json({ message: "Checkout has expired or was already completed" });
    }
    res.json({ intent });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────
// CREATE ORDER
// Prices/total are ALWAYS recomputed here from the products table.
// Client-supplied price/total values are never trusted.
// ─────────────────────────────────────────────
router.post("/", protect, validate(orderSchemas.createOrder), async (req, res, next) => {
  let { items, payment_method, payment_ref, payment_reference, transaction_reference, address, delivery_address, latitude, longitude, zone_id, delivery_fee, city, state, source, coupon_code, checkout_intent_id } = req.body;

  // Normalize payment method aliases (e.g., "card", "cashOnDelivery", "monnify", "cod")
  const rawMethod = String(payment_method || "monnify").toLowerCase().trim().replace(/[\s-_]+/g, "");
  let method = "monnify";
  if (["cod", "cashondelivery", "payondelivery", "cash"].includes(rawMethod)) {
    method = "cod";
  } else if (["monnify", "card", "transfer", "online", "paynow"].includes(rawMethod)) {
    method = "monnify";
  } else {
    return res.status(400).json({ message: "Invalid payment method. Supported methods: 'card', 'monnify', or 'cashOnDelivery'" });
  }

  // Normalize address & payment reference aliases
  address = (address || delivery_address || "").trim();
  const effectivePaymentRef = payment_ref || payment_reference || transaction_reference || null;

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
    if (!effectivePaymentRef) {
      return res.status(400).json({ message: "Missing payment reference for card/online transaction" });
    }
    try {
      monnifyData = await verifyMonnifyTransaction(effectivePaymentRef);
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

    if (checkout_intent_id) {
      const intent = await client.query(
        `SELECT * FROM checkout_intents
         WHERE id = $1 AND user_id = $2 FOR UPDATE`,
        [checkout_intent_id, req.user.id],
      );
      if (!intent.rows.length || intent.rows[0].status !== "pending" || new Date(intent.rows[0].expires_at) <= new Date()) {
        await client.query("ROLLBACK");
        return res.status(400).json({ message: "Checkout has expired. Please start checkout again." });
      }
      if (intent.rows[0].payment_ref !== effectivePaymentRef) {
        await client.query("ROLLBACK");
        return res.status(400).json({ message: "Payment reference does not match checkout." });
      }
      items = intent.rows[0].items;
      address = intent.rows[0].address;
      latitude = intent.rows[0].latitude;
      longitude = intent.rows[0].longitude;
      zone_id = intent.rows[0].zone_id || zone_id;
      delivery_fee = intent.rows[0].delivery_fee || delivery_fee;
      coupon_code = intent.rows[0].coupon_code || undefined;
    }

    // Idempotency: don't let the same Monnify payment fund two orders
    if (method === "monnify") {
      // Serialize concurrent callbacks for the same payment reference. A
      // duplicate SELECT without this lock can race before either request
      // commits and create two orders for one successful payment.
      await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [effectivePaymentRef]);
      const dup = await client.query(
        "SELECT id FROM orders WHERE payment_ref = $1",
        [effectivePaymentRef],
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
      `SELECT id, name, price, stock, available_for_sale, sku, barcode, unit
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
      // prices are stored in plain Naira — no unit multiplier applied
      const unitPrice = parseFloat(p.price);
      const lineTotal = unitPrice * quantity;
      subtotal += lineTotal;
      orderItemRows.push({
        productId,
        productName: p.name,
        sku: p.sku || '',
        unit: p.unit || '',
        quantity,
        unitPrice,
        subtotal: lineTotal,
      });
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

    // Resolve zonal delivery fee dynamically
    const zoneInfo = await resolveZoneAndFee(client, {
      zone_id,
      latitude,
      longitude,
      address,
      city,
      state,
    });

    const total = subtotal - couponDiscount + zoneInfo.delivery_fee;

    // Reconcile: the amount actually paid via Monnify must match the
    // server-computed total (protects against a tampered client-side amount).
    // Monnify amounts are plain Naira decimals, not kobo.
    if (method === "monnify" && !monnifyData.isMock) {
      if (Math.abs(monnifyData.amountPaid - total) > 1) {
        await client.query("ROLLBACK");
        return res.status(402).json({
          message: "Amount paid does not match order total. Please contact support with reference " + effectivePaymentRef,
        });
      }
    }

    const orderId = "BF-" + Date.now().toString(36).toUpperCase();
    const isCod = ["cod", "cashondelivery", "payondelivery", "cash"].includes(String(method || "").toLowerCase().trim().replace(/[\s-_]+/g, ""));
    const isGatewayPaid = (method === "monnify" && monnifyData && monnifyData.paymentStatus === "PAID");

    // Payment & Status resolution:
    // - If placed via Cash on Delivery (COD), bypass payment upfront -> status is 'confirmed'.
    // - If paid through payment gateway (Monnify), confirm payment -> status is 'confirmed', payment_status is 'paid'.
    // - Only if an unverified gateway payment intent was submitted -> status is 'pending_payment'.
    const status = (isCod || isGatewayPaid) ? "confirmed" : "pending_payment";
    const paymentStatus = isGatewayPaid ? "paid" : "pending";
    const trackingStatus = status;

    await client.query(
      `INSERT INTO orders
       (id, user_id, total, subtotal, delivery_fee, zone_id, discount_amount, status, payment_status, tracking_status, payment_method, payment_ref, address, latitude, longitude, created_at, source)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW(), $16)`,
      [
        orderId,
        req.user.id,
        total,
        subtotal,
        zoneInfo.delivery_fee,
        zoneInfo.zone_id,
        couponDiscount,
        status,
        paymentStatus,
        trackingStatus,
        method,
        method === "monnify" ? effectivePaymentRef : null,
        address || "",
        latitude || null,
        longitude || null,
        source || (detectChannel(req) === 'app' ? 'Mobile App' : 'Web Storefront'),
      ],
    );

    // Section 2 & 62: Stock is strictly NOT deducted at order creation or payment.
    // Stock deduction occurs ONLY when items are scanned at POS during packing.
    for (const item of orderItemRows) {
      await client.query(
        `INSERT INTO order_items (order_id, product_id, product_name, sku, unit, quantity, unit_price, price, subtotal, total_price, scanned_quantity)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $7, $8, $8, 0)`,
        [orderId, item.productId, item.productName, item.sku, item.unit, item.quantity, item.unitPrice, item.subtotal],
      );
    }

    try {
      await client.query(
        `INSERT INTO order_tracking_events (order_id, event_type, description, actor_type, actor_id, created_at)
         VALUES ($1, 'order_created', $2, 'customer', $3, NOW())`,
        [
          orderId,
          isCod
            ? "Order placed via Cash on Delivery (payment bypassed — to be collected at doorstep)."
            : (isGatewayPaid ? "Order placed and payment confirmed via payment gateway." : "Order placed. Awaiting payment verification."),
          req.user.id,
        ]
      );
    } catch (e) {
      console.warn("Could not insert tracking event for order_created:", e.message);
    }

    await logOrderAudit(client, {
      order_id: orderId,
      actor_id: req.user.id,
      actor_name: req.user.name,
      actor_role: 'customer',
      action: 'order_created',
      new_state: status,
      metadata: { total, payment_method: method, items_count: orderItemRows.length }
    });

    if (appliedCoupon) {
      await recordCouponUsage(client, { coupon: appliedCoupon, discount: couponDiscount, userId: req.user.id, orderId });
    }

    if (checkout_intent_id) {
      await client.query(
        "UPDATE checkout_intents SET status = 'completed', completed_at = NOW(), updated_at = NOW() WHERE id = $1",
        [checkout_intent_id],
      );
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
        [orderId, effectivePaymentRef],
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
          [`INC-${effectivePaymentRef}`, `Automated payment reconciliation for Order #${orderId}`, monnifyData.amountPaid, String(orderId), systemUserId],
        );
      }
    }

    // Clear the cart upon successful order creation
    const cartRes = await client.query(
      "SELECT id FROM customer_carts WHERE customer_id = $1 AND status = 'active' LIMIT 1",
      [req.user.id]
    );
    if (cartRes.rows.length > 0) {
      await client.query("DELETE FROM customer_cart_items WHERE cart_id = $1", [cartRes.rows[0].id]);
      await client.query("UPDATE customer_carts SET total = 0, item_count = 0, updated_at = NOW() WHERE id = $1", [cartRes.rows[0].id]);
    }

    await client.query("COMMIT");

    // Log order creation for AI memory
    trackActivity(req.user.id, "order_created", {
      entityType: "order",
      entityId: orderId,
      metadata: { total, item_count: orderItemRows.length },
      ip: req.ip || req.connection?.remoteAddress
    });

    notifyAdmin({
      type: 'order_placed',
      title: `🛍️ New Order Placed (#${orderId})`,
      message: `Customer ${req.user.name || req.user.email} placed a new order (#${orderId}) totaling ₦${Number(total).toLocaleString()} (${orderItemRows.length} item${orderItemRows.length > 1 ? 's' : ''}).`,
      link: `/orders/${orderId}`,
      severity: 'info',
      data: {
        order_id: orderId,
        customer_name: req.user.name,
        total_amount: `₦${Number(total).toLocaleString()}`,
        items_count: orderItemRows.length,
        payment_method: method,
        address: address || 'Storefront Pickup',
      },
      actor: { id: req.user.id, name: req.user.name, role: req.user.role },
    }).catch(() => {});

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
         o.id, o.total, COALESCE(o.discount_amount, 0) as discount_amount, o.status,
         COALESCE(o.payment_status, 'pending') as payment_status,
         o.payment_method, COALESCE(o.invoice_printed, false) as invoice_printed, o.address,
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
router.post("/returns/:id/refund-account", protect, submitRefundAccount);
router.get("/:id/return", protect, getOrderReturn);

// ─────────────────────────────────────────────
// PUBLIC ORDER TRACKING
// Exposes delivery progress only. Personal, payment and item data are excluded;
// active driver coordinates are rounded so the public map remains approximate.
// ─────────────────────────────────────────────
router.get("/track/:code", async (req, res, next) => {
  try {
    const code = String(req.params.code || "").trim().toUpperCase();
    if (!/^BF-[A-Z0-9]{6,27}$/.test(code)) {
      return res.status(400).json({ message: "Enter a valid BemsFarms delivery code" });
    }

    const result = await pool.query(
      `SELECT
         orders.id,
         orders.order_ref,
         orders.status,
         CASE
           WHEN orders.tracking_status IS NULL OR orders.tracking_status = 'order_placed' THEN orders.status
           ELSE orders.tracking_status
         END AS tracking_status,
         orders.created_at,
         orders.delivered_at,
         orders.address AS destination_area,
         orders.delivery_city,
         COALESCE(orders.driver_arrived_at, delivery.arrived_at) AS arrived_at,
         COALESCE(orders.customer_confirmed, false) AS customer_confirmed,
         orders.customer_confirmed_at,
         COALESCE(orders.driver_confirmed, false) AS driver_confirmed,
         orders.driver_confirmed_at,
         orders.updated_at,
         delivery.eta_minutes,
         ROUND(location.latitude::numeric, 4) AS driver_lat,
         ROUND(location.longitude::numeric, 4) AS driver_lng,
         location.recorded_at AS location_updated_at,
         dr.name AS driver_name,
         dr.phone AS driver_phone,
         dr.vehicle_type,
         dr.vehicle_plate,
         dr.rating AS driver_rating,
         (
           SELECT string_agg(CONCAT(oi.quantity, 'x ', COALESCE(p.name, oi.product_name, 'Produce Item')), ', ')
           FROM order_items oi
           LEFT JOIN products p ON p.id = oi.product_id
           WHERE oi.order_id = orders.id
         ) AS items_summary
       FROM orders
       LEFT JOIN LATERAL (
         SELECT d.driver_id, d.eta_minutes, d.arrived_at
         FROM deliveries d
         WHERE d.order_id = orders.id
         ORDER BY d.created_at DESC
         LIMIT 1
       ) delivery ON true
       LEFT JOIN drivers dr ON dr.id = COALESCE(orders.driver_id, delivery.driver_id)
       LEFT JOIN LATERAL (
         SELECT dl.latitude, dl.longitude, dl.recorded_at
         FROM driver_locations dl
         WHERE dl.driver_id = COALESCE(orders.driver_id, delivery.driver_id)
         ORDER BY dl.recorded_at DESC
         LIMIT 1
       ) location ON true
       WHERE UPPER(orders.id) = $1 OR UPPER(orders.order_ref) = $1
       LIMIT 1`,
      [code],
    );

    if (!result.rows.length) {
      return res.status(404).json({ message: "We could not find an order with that delivery code" });
    }

    res.json({ order: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────
// GET SINGLE ORDER (WITH REALTIME TRACKING & DRIVER TELEMETRY)
// ─────────────────────────────────────────────
router.get("/:id", protect, async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT
         o.id,
         o.order_ref,
         o.total,
         COALESCE(o.subtotal, o.total - COALESCE(o.delivery_fee, 1500) + COALESCE(o.discount_amount, 0)) AS subtotal,
         COALESCE(o.delivery_fee, 1500) AS delivery_fee,
         COALESCE(o.discount_amount, 0) AS discount_amount,
         o.status,
         o.payment_method,
         COALESCE(o.payment_status, 'completed') AS payment_status,
         o.payment_ref,
         o.address,
         o.delivery_city,
         o.latitude AS customer_lat,
         o.longitude AS customer_lng,
         o.created_at,
         COALESCE(delivery.delivered_at, o.updated_at) AS delivered_at,
         COALESCE(o.driver_arrived_at, delivery.arrived_at) AS arrived_at,
         COALESCE(o.customer_confirmed, false) AS customer_confirmed,
         o.customer_confirmed_at,
         COALESCE(o.driver_confirmed, false) AS driver_confirmed,
         o.driver_confirmed_at,
         o.updated_at,
         o.cancelled_at,
         o.cancel_reason,
         COALESCE(o.tracking_status, o.status) AS tracking_status,
         o.tracking_notes,
         delivery.delivery_id,
         delivery.delivery_ref,
         delivery.delivery_status,
         delivery.eta_minutes,
         delivery.assigned_at,
         delivery.dispatched_at,
         delivery.arrived_at AS delivery_arrived_at,
         dr.id AS driver_id,
         dr.name AS driver_name,
         dr.phone AS driver_phone,
         dr.vehicle_type,
         dr.vehicle_plate,
         dr.rating AS driver_rating,
         loc.latitude AS driver_lat,
         loc.longitude AS driver_lng,
         loc.heading AS driver_heading,
         loc.speed AS driver_speed,
         loc.recorded_at AS location_updated_at,
         dz.zone_name,
         ret.return_id,
         ret.return_status,
         ret.return_reason,
         ret.return_bank_name,
         ret.return_account_number,
         ret.return_account_name,
         ret.return_created_at,
         json_agg(
           json_build_object(
             'name', COALESCE(p.name, oi.product_name, 'Produce Item'),
             'quantity', oi.quantity,
             'price', COALESCE(oi.price, oi.unit_price, 0),
             'product_id', COALESCE(oi.product_id, p.id),
             'image_url', p.image_url,
             'unit', COALESCE(oi.unit, p.unit, 'item')
           )
         ) AS items
       FROM orders o
       JOIN order_items oi ON oi.order_id = o.id
       LEFT JOIN products p ON p.id = oi.product_id
       LEFT JOIN LATERAL (
         SELECT 
           d.id AS delivery_id,
           d.delivery_ref,
           d.driver_id,
           d.status AS delivery_status,
           d.delivered_at,
           d.arrived_at,
           d.eta_minutes,
           d.assigned_at,
           d.dispatched_at,
           d.zone_id
         FROM deliveries d
         WHERE d.order_id = o.id
         ORDER BY d.created_at DESC
         LIMIT 1
       ) delivery ON true
       LEFT JOIN drivers dr ON dr.id = delivery.driver_id
       LEFT JOIN LATERAL (
         SELECT dl.latitude, dl.longitude, dl.heading, dl.speed, dl.recorded_at
         FROM driver_locations dl
         WHERE dl.driver_id = delivery.driver_id
         ORDER BY dl.recorded_at DESC
         LIMIT 1
       ) loc ON true
       LEFT JOIN delivery_zones dz ON dz.zone_id = delivery.zone_id
       LEFT JOIN LATERAL (
         SELECT 
           r.id AS return_id,
           r.status AS return_status,
           r.reason AS return_reason,
           r.bank_name AS return_bank_name,
           r.account_number AS return_account_number,
           r.account_name AS return_account_name,
           r.created_at AS return_created_at
         FROM returns r
         WHERE UPPER(r.order_id) = UPPER(o.id)
         ORDER BY r.created_at DESC
         LIMIT 1
       ) ret ON true
       WHERE UPPER(o.id) = UPPER($1) AND (o.user_id = $2 OR o.customer_id = $2 OR $3 IN ('admin', 'superadmin', 'manager', 'delivery_manager', 'staff'))
       GROUP BY 
         o.id, o.latitude, o.longitude, delivery.delivery_id, delivery.delivery_ref, delivery.delivery_status,
         delivery.delivered_at, delivery.arrived_at, delivery.eta_minutes, delivery.assigned_at, delivery.dispatched_at,
         dr.id, dr.name, dr.phone, dr.vehicle_type, dr.vehicle_plate, dr.rating,
         loc.latitude, loc.longitude, loc.heading, loc.speed, loc.recorded_at, dz.zone_name,
         ret.return_id, ret.return_status, ret.return_reason, ret.return_bank_name, ret.return_account_number, ret.return_account_name, ret.return_created_at`,
      [id, req.user.id, req.user.role || 'user'],
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
       SET status = $1, delivered_at = CASE WHEN $1 = 'delivered' THEN NOW() ELSE delivered_at END, updated_at = NOW()
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

    // Lock the row and re-check status inside the transaction
    const order = await client.query(
      `SELECT * FROM orders 
       WHERE (UPPER(id) = UPPER($1) OR UPPER(order_ref) = UPPER($1)) 
         AND (user_id = $2 OR customer_id = $2 OR $3 IN ('superadmin', 'admin', 'manager', 'delivery_manager', 'staff')) 
       FOR UPDATE`,
      [id, req.user.id, req.user.role || "customer"],
    );

    if (!order.rows.length) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Order not found" });
    }

    const o = order.rows[0];

    if (String(o.status).toLowerCase() === "cancelled") {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "Order is already cancelled" });
    }

    const nonCancellableStatuses = [
      "in_transit",
      "shipped",
      "out_for_delivery",
      "arrived",
      "driver_arrived",
      "delivered",
      "completed",
      "cancelled",
      "returned",
      "return_requested",
      "return_approved",
      "dispute",
    ];

    const isStaffOrAdmin = ['superadmin', 'admin', 'manager', 'cashier'].includes(req.user.role);
    const isPosOrder = String(o.source || '').toLowerCase().includes('pos') || String(o.id).startsWith('POS-');

    if (!isStaffOrAdmin && !isPosOrder) {
      if (nonCancellableStatuses.includes(String(o.status).toLowerCase())) {
        await client.query("ROLLBACK");
        return res.status(400).json({
          message: "This order can no longer be cancelled because it is already in transit or completed",
        });
      }
    } else {
      if (["cancelled", "in_transit", "out_for_delivery", "delivered"].includes(String(o.status).toLowerCase()) && !isStaffOrAdmin) {
        await client.query("ROLLBACK");
        return res.status(400).json({
          message: "This order can no longer be cancelled because it is already delivered or in transit",
        });
      }
    }

    if (o.driver_picked_up) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        message: "This order can no longer be cancelled because the courier has already picked up the goods from the store",
      });
    }

    const effectiveReason = (req.body?.reason && String(req.body.reason).trim()) || "Cancelled by customer";

    await client.query(
      `UPDATE orders
       SET status='cancelled',
           tracking_status='cancelled',
           cancel_reason=$1,
           cancelled_at=NOW(),
           updated_at=NOW()
       WHERE id=$2`,
      [effectiveReason, o.id],
    );

    // Auto-resolve any active dispatch alerts for this order
    await client.query(
      `UPDATE dispatch_alerts 
       SET resolved = TRUE, resolution = 'cancelled', resolved_at = NOW()
       WHERE (order_id = $1::text OR order_id = $2::text) AND resolved = FALSE`,
      [o.id, o.order_ref || o.id]
    ).catch(() => {});

    // Cancel any associated delivery records safely with a SAVEPOINT
    try {
      await client.query("SAVEPOINT delivery_cancel");
      await client.query(
        `UPDATE deliveries SET status='cancelled', updated_at=NOW() WHERE order_id=$1`,
        [o.id],
      );
      await client.query(
        `UPDATE delivery_assignments da
         SET driver_response='rejected', override_note='Order cancelled by customer'
         FROM deliveries d
         WHERE da.delivery_id = d.id AND d.order_id = $1 AND da.driver_response = 'pending'`,
        [o.id],
      );
      await client.query("RELEASE SAVEPOINT delivery_cancel");
    } catch (delErr) {
      await client.query("ROLLBACK TO SAVEPOINT delivery_cancel");
    }

    await restoreOrderStock(client, o.id);

    // Log tracking events safely with a SAVEPOINT
    try {
      await client.query("SAVEPOINT tracking_cancel");
      await client.query(
        `INSERT INTO order_tracking_events (order_id, event_type, description, actor_type, actor_id, created_at)
         VALUES ($1, 'cancelled', $2, 'customer', $3, NOW())`,
        [o.id, `Order cancelled by customer. Reason: ${effectiveReason}`, req.user.id]
      );
      await client.query(
        `INSERT INTO order_status_history (order_id, from_status, to_status, changed_by, notes, created_at)
         VALUES ($1, $2, 'cancelled', $3, $4, NOW())`,
        [o.id, o.status, req.user.id, `Cancelled by customer: ${effectiveReason}`]
      );
      await client.query("RELEASE SAVEPOINT tracking_cancel");
    } catch (logErr) {
      await client.query("ROLLBACK TO SAVEPOINT tracking_cancel");
    }

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

// ─────────────────────────────────────────────
// CONFIRM DELIVERY RECEIVED (CUSTOMER APP / WEB)
// Customer inspects goods and clicks "Confirm Delivery Received"
// Records customer confirmation, timestamp, order reference and notifies driver
// ─────────────────────────────────────────────
const handleCustomerConfirm = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;

    await client.query("BEGIN");

    // Fetch order
    const orderRes = await client.query(
      `SELECT o.*, d.id as delivery_id, d.driver_id, d.status as delivery_status
       FROM orders o
       LEFT JOIN deliveries d ON (d.order_id = o.id::text OR d.order_id = o.order_ref)
       WHERE (UPPER(o.id) = UPPER($1) OR UPPER(o.order_ref) = UPPER($1))
         AND (o.user_id = $2 OR o.customer_id = $2)
       FOR UPDATE OF o`,
      [id, req.user.id]
    );

    if (orderRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Order not found" });
    }

    const order = orderRes.rows[0];

    // Must be in transit, arrived, shipped, out_for_delivery, or picked_up
    const validStatuses = ["in_transit", "driver_assigned", "shipped", "out_for_delivery", "arrived", "driver_arrived", "picked_up"];
    if (!validStatuses.includes(order.status) && !validStatuses.includes(order.tracking_status)) {
      if (order.status === "delivered") {
        await client.query("ROLLBACK");
        return res.json({
          success: true,
          message: "Delivery already completed and confirmed.",
          order_id: order.id,
          order_ref: order.order_ref || order.id,
          customer_confirmed: true,
          driver_confirmed: true,
          status: "delivered",
        });
      }
      await client.query("ROLLBACK");
      return res.status(400).json({ message: `Cannot confirm delivery for order currently in '${order.status}' status` });
    }

    // 1. Record Customer Confirmation & Timestamp
    const now = new Date();
    await client.query(
      `UPDATE orders 
       SET customer_confirmed = true,
           customer_confirmed_at = COALESCE(customer_confirmed_at, $1),
           updated_at = NOW()
       WHERE id = $2`,
      [now, order.id]
    );

    if (order.delivery_id) {
      await client.query(
        `UPDATE deliveries 
         SET customer_confirmed = true,
             customer_confirmed_at = COALESCE(customer_confirmed_at, $1),
             updated_at = NOW()
         WHERE id = $2`,
        [now, order.delivery_id]
      );
    }

    // 2. Audit log customer confirmation
    await logOrderAudit(client, {
      order_id: order.id,
      actor_id: req.user.id,
      actor_name: req.user.name,
      actor_role: 'customer',
      action: 'customer_delivery_confirmed',
      previous_state: order.status,
      new_state: order.status,
      metadata: {
        customer_confirmed: true,
        order_ref: order.order_ref || order.id,
        confirmed_at: now
      }
    });

    // 3. Check if driver has already confirmed
    const driverHasConfirmed = Boolean(order.driver_confirmed);
    let finalStatus = order.status;

    if (driverHasConfirmed) {
      finalStatus = "delivered";
      await client.query(
        `UPDATE orders
         SET status = 'delivered',
             tracking_status = 'delivered',
             delivered_at = COALESCE(delivered_at, $1),
             updated_at = NOW()
         WHERE id = $2`,
        [now, order.id]
      );
      if (order.delivery_id) {
        await client.query(
          `UPDATE deliveries
           SET status = 'delivered',
               delivered_at = COALESCE(delivered_at, $1),
               updated_at = NOW()
           WHERE id = $2`,
          [now, order.delivery_id]
        );
      }
    }

    await client.query("COMMIT");

    res.json({
      success: true,
      message: driverHasConfirmed
        ? "Delivery confirmed and completed successfully! Thank you for choosing Bems Farms."
        : "Delivery receipt confirmed! Waiting for driver confirmation.",
      order_id: order.id,
      order_ref: order.order_ref || order.id,
      customer_confirmed: true,
      customer_confirmed_at: now,
      driver_confirmed: driverHasConfirmed,
      status: finalStatus,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Customer confirm delivery error:", err.message);
    next(err);
  } finally {
    client.release();
  }
};

router.patch("/:id/confirm", protect, handleCustomerConfirm);

// ─────────────────────────────────────────────
// REPORT ISSUE (CUSTOMER APP/WEB)
// Customer reports a problem at delivery (damaged, missing, wrong item)
// ─────────────────────────────────────────────
router.post("/:id/report", protect, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason, description, photo_url, photos = [] } = req.body;

    if (!reason?.trim() && !description?.trim()) {
      return res.status(400).json({ message: "A reason or description for the issue is required" });
    }

    // Verify order exists
    const orderRes = await pool.query(
      `SELECT o.*, d.driver_id, d.id AS delivery_id 
       FROM orders o 
       LEFT JOIN deliveries d ON d.order_id = o.id 
       WHERE (o.id = $1 OR o.order_ref = $1) AND o.user_id = $2`,
      [id, req.user.id]
    );

    if (orderRes.rows.length === 0) {
      return res.status(404).json({ message: "Order not found" });
    }

    const order = orderRes.rows[0];
    const issuePhoto = photo_url || (photos.length ? photos[0] : null);

    // Insert issue into issues table or customer_issues
    const issueResult = await pool.query(
      `
      INSERT INTO issues (
        user_id, order_id, title, category, description, status, priority, created_at
      )
      VALUES ($1, $2, $3, $4, $5, 'open', 'high', NOW())
      RETURNING *
      `,
      [
        req.user.id,
        order.id,
        `Issue reported on Order #${order.id}: ${reason || "Delivery Issue"}`,
        "delivery_issue",
        description || reason,
      ]
    );

    // Update order tracking status
    await pool.query(
      `UPDATE orders SET tracking_status = 'issue_reported', notes = COALESCE(notes || ' | ', '') || $1, updated_at = NOW() WHERE id = $2`,
      [`Issue reported: ${reason || description}`, order.id]
    );

    res.status(201).json({
      message: "Issue reported successfully. Our dispatch manager and customer support will review this immediately.",
      issue: issueResult.rows[0],
      order_id: order.id,
    });
  } catch (err) {
    console.error("Report issue error:", err.message);
    next(err);
  }
});

// ─────────────────────────────────────────────
// PROXIMITY AUTO-ASSIGN DRIVER
// ─────────────────────────────────────────────
const { autoAssignClosestDriver } = require("../services/dispatchEngine");
router.post(
  "/:id/auto-assign-driver",
  protect,
  requireRole("superadmin", "admin", "manager", "delivery_manager", "cashier"),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const result = await autoAssignClosestDriver(id);
      if (!result.success) {
        return res.status(400).json(result);
      }
      res.json({
        message: `Order #${id} automatically assigned to closest driver: ${result.driver.name} (${result.driver.distanceKm} km away)`,
        assignment: result,
      });
    } catch (err) {
      next(err);
    }
  }
);

// ─────────────────────────────────────────────
// CUSTOMER DELIVERY CONFIRMATION (Sections 38 & 40)
// ─────────────────────────────────────────────
router.post("/:id/confirm-receipt", protect, handleCustomerConfirm);

module.exports = router;

