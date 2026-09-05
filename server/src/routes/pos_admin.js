// server/src/routes/pos_admin.js
// Mounted at /api/admin/pos in index.js
//
// Point-of-Sale admin management:
//   - Open / close POS sessions
//   - Record sales and held orders
//   - End-of-day reconciliation
//   - POS-specific product and customer lookup
//
// Uses existing tables: pos_sessions, pos_held_orders, orders, products
//
// -- Run once to create pos_returns table:
// CREATE TABLE IF NOT EXISTS pos_returns (
//   id SERIAL PRIMARY KEY,
//   return_ref VARCHAR(50) UNIQUE NOT NULL,
//   session_id INT REFERENCES pos_sessions(id) ON DELETE SET NULL,
//   product_id INT REFERENCES products(id),
//   quantity INT NOT NULL,
//   unit_price DECIMAL(10,2) NOT NULL,
//   total DECIMAL(10,2) NOT NULL,
//   reason VARCHAR(255),
//   condition VARCHAR(50),
//   refund_method VARCHAR(50),
//   customer_name VARCHAR(100),
//   phone VARCHAR(20),
//   notes TEXT,
//   processed_by INT REFERENCES users(id),
//   created_at TIMESTAMP DEFAULT NOW()
// );
// ───────────────────────────────────────────────────────────────────────────

const express = require("express");
const router  = express.Router();
const pool    = require("../db/pool");
const { protect, requireRole } = require("../middleware/authMiddleware");
const { NAIRA_PER_UNIT } = require("../utils/currency");
const { validateCoupon, recordCouponUsage } = require("../utils/coupons");
const { getTaxSettings, computeTax } = require("../utils/taxSettings");
const { clampLimit } = require("../utils/pagination");
const validate = require("../middleware/validate");
const posSchemas = require("../schemas/posSchemas");

router.use(protect);

// ─── Sequence helpers ───────────────────────────────────────────────────────
// pg_advisory_xact_lock serializes concurrent callers within the same
// generator (auto-released at COMMIT/ROLLBACK) so two requests reading
// "next" at the same instant can't both compute the same ref before either
// commits — closes a real race under concurrency (e.g. two cashiers opening
// a session at once) without needing a retry loop or schema change.
async function nextPOSRef(client) {
  await client.query("SELECT pg_advisory_xact_lock(hashtext('pos_order_ref'))");
  const r = await client.query(
    `SELECT COALESCE(MAX(CAST(REGEXP_REPLACE(order_ref,'POS-','') AS INTEGER)),1000)+1 AS next
     FROM orders WHERE order_ref LIKE 'POS-%'`
  );
  return `POS-${r.rows[0].next}`;
}

async function nextSessionRef(client) {
  await client.query("SELECT pg_advisory_xact_lock(hashtext('pos_session_ref'))");
  const r = await client.query(
    `SELECT COALESCE(MAX(CAST(REGEXP_REPLACE(session_ref,'SESS-','') AS INTEGER)),1000)+1 AS next
     FROM pos_sessions WHERE session_ref LIKE 'SESS-%'`
  );
  return `SESS-${r.rows[0].next}`;
}

// ════════════════════════════════════════════════════════════════════════════
// OPEN SESSION  ──  POST /api/admin/pos/session/open
// ════════════════════════════════════════════════════════════════════════════
router.post("/session/open", requireRole("superadmin","manager","admin","cashier"), validate(posSchemas.sessionOpen), async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { opening_cash = 0, store_id, terminal_id } = req.body;

    // Check no already-open session for this user
    const openUser = await client.query(
      "SELECT id FROM pos_sessions WHERE cashier_id=$1 AND status='open'",
      [req.user.id]
    );
    if (openUser.rows.length) {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "You already have an open POS session", session_id: openUser.rows[0].id });
    }

    // Check no already-open session for this terminal (if provided)
    if (terminal_id) {
      const openTerminal = await client.query(
        "SELECT id, cashier_id FROM pos_sessions WHERE terminal_id=$1 AND status='open'",
        [terminal_id]
      );
      if (openTerminal.rows.length) {
        await client.query("ROLLBACK");
        return res.status(400).json({ message: "This terminal is already in use by another cashier", session_id: openTerminal.rows[0].id });
      }
    }
    const sessionRef = await nextSessionRef(client);

    const result = await client.query(
      `INSERT INTO pos_sessions
         (session_ref, cashier_id, store_id, terminal_id, opening_cash, status, opened_at, created_at)
       VALUES ($1,$2,$3,$4,$5,'open',NOW(),NOW())
       RETURNING *`,
      [sessionRef, req.user.id, store_id || null, terminal_id || null, parseFloat(opening_cash)]
    );

    await client.query("COMMIT");
    res.status(201).json({ session: result.rows[0] });
  } catch (err) {
    await client.query("ROLLBACK");
    next(err);
  } finally {
    client.release();
  }
});

// ════════════════════════════════════════════════════════════════════════════
// CLOSE SESSION  ──  POST /api/admin/pos/session/:id/close
// ════════════════════════════════════════════════════════════════════════════
router.post("/session/:id/close", requireRole("superadmin","manager","admin","cashier"), validate(posSchemas.sessionClose), async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const session = await client.query(
      "SELECT * FROM pos_sessions WHERE id=$1", [req.params.id]
    );
    if (!session.rows.length) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Session not found" });
    }
    if (session.rows[0].status !== "open") {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "Session is already closed" });
    }

    // Calculate session totals from orders
    const totals = await client.query(
      `SELECT
         COUNT(*)                                                   AS order_count,
         COALESCE(SUM(total),0)                                    AS gross_sales,
         COALESCE(SUM(CASE WHEN payment_method='cash' THEN total ELSE 0 END),0) AS cash_sales,
         COALESCE(SUM(CASE WHEN payment_method='card' THEN total ELSE 0 END),0) AS card_sales,
         COALESCE(SUM(CASE WHEN payment_method='transfer' THEN total ELSE 0 END),0) AS transfer_sales
       FROM orders
       WHERE pos_session_id=$1 AND status NOT IN ('cancelled','refunded')`,
      [req.params.id]
    );

    const { closing_cash = 0, notes } = req.body;
    const t = totals.rows[0];

    const result = await client.query(
      `UPDATE pos_sessions SET
         status        = 'closed',
         closing_cash  = $1,
         expected_cash = opening_cash + $2::DECIMAL,
         cash_variance = $1::DECIMAL - (opening_cash + $2::DECIMAL),
         total_sales   = $3,
         total_orders  = $4,
         cash_sales    = $5,
         card_sales    = $6,
         transfer_sales= $7,
         notes         = $8,
         closed_at     = NOW()
       WHERE id=$9
       RETURNING *`,
      [
        parseFloat(closing_cash), parseFloat(t.cash_sales),
        parseFloat(t.gross_sales), parseInt(t.order_count),
        parseFloat(t.cash_sales), parseFloat(t.card_sales),
        parseFloat(t.transfer_sales), notes || null,
        req.params.id,
      ]
    );

    await client.query("COMMIT");
    res.json({ session: result.rows[0] });
  } catch (err) {
    await client.query("ROLLBACK");
    next(err);
  } finally {
    client.release();
  }
});

// ════════════════════════════════════════════════════════════════════════════
// GET CURRENT SESSION  ──  GET /api/admin/pos/session/current
// ════════════════════════════════════════════════════════════════════════════
router.get("/session/current", requireRole("superadmin", "manager", "admin", "cashier"), async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT ps.*, u.name AS cashier_name, s.store_name AS store_name
       FROM pos_sessions ps
       LEFT JOIN users u ON u.id = ps.cashier_id
       LEFT JOIN stores s ON s.id = ps.store_id
       WHERE ps.cashier_id=$1 AND ps.status='open'
       ORDER BY ps.opened_at DESC LIMIT 1`,
      [req.user.id]
    );
    res.json({ session: result.rows[0] || null });
  } catch (err) {
    next(err);
  }
});

// ════════════════════════════════════════════════════════════════════════════
// SESSION HISTORY  ──  GET /api/admin/pos/sessions
// ════════════════════════════════════════════════════════════════════════════
router.get("/sessions", requireRole("superadmin","manager","admin"), async (req, res, next) => {
  try {
    const { page = 1, limit: limitRaw = 20, from, to, cashier_id } = req.query;
    const limit = clampLimit(limitRaw, 20);
    const params = []; const where = [];

    if (from) { params.push(from); where.push(`DATE(ps.opened_at)>=$${params.length}`); }
    if (to)   { params.push(to);   where.push(`DATE(ps.opened_at)<=$${params.length}`); }
    if (cashier_id) { params.push(cashier_id); where.push(`ps.cashier_id=$${params.length}`); }

    const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const offset = (parseInt(page) - 1) * parseInt(limit);
    params.push(parseInt(limit)); const limitIdx  = params.length;
    params.push(offset);          const offsetIdx = params.length;

    const [rows, count] = await Promise.all([
      pool.query(
        `SELECT ps.*, u.name AS cashier_name, s.store_name AS store_name
         FROM pos_sessions ps
         LEFT JOIN users u ON u.id = ps.cashier_id
         LEFT JOIN stores s ON s.id = ps.store_id
         ${clause}
         ORDER BY ps.opened_at DESC
         LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
        params
      ),
      pool.query(`SELECT COUNT(*) FROM pos_sessions ps ${clause}`, params.slice(0, -2)),
    ]);

    res.json({
      sessions: rows.rows,
      total:    parseInt(count.rows[0].count),
      page:     parseInt(page),
      pages:    Math.ceil(parseInt(count.rows[0].count) / parseInt(limit)),
    });
  } catch (err) {
    next(err);
  }
});

// ════════════════════════════════════════════════════════════════════════════
// POS SALE  ──  POST /api/admin/pos/sale
// Creates an order from the POS terminal.
// ════════════════════════════════════════════════════════════════════════════
router.post("/sale", requireRole("superadmin","manager","admin","cashier"), validate(posSchemas.sale), async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const {
      items, customer_id, customer_name = "Walk-in Customer",
      payment_method = "cash", amount_tendered,
      discount_amount = 0, coupon_code,
      notes, session_id, split_payments,
    } = req.body;

    // A split sale must actually carry its per-method breakdown, and that
    // breakdown must add up to the sale total — otherwise a sale can be
    // marked "paid" with no record of what was collected, or with less
    // than the full amount. Verified against `total` further down once
    // it's computed, since the request can't know tax/discount in advance.
    let normalizedSplitPayments = null;
    if (payment_method === "Split Payment") {
      if (!Array.isArray(split_payments) || split_payments.length === 0) {
        await client.query("ROLLBACK");
        return res.status(400).json({ message: "Split payment breakdown is required" });
      }
      normalizedSplitPayments = split_payments.map((p) => ({
        method: String(p.method || "").trim(),
        amount: Math.round((parseFloat(p.amount) || 0) * 100) / 100,
      }));
      if (normalizedSplitPayments.some((p) => !p.method || !(p.amount > 0))) {
        await client.query("ROLLBACK");
        return res.status(400).json({ message: "Every split payment row needs a method and a positive amount" });
      }
    }

    // Calculate totals from products — lock rows so stock can't be
    // oversold by a concurrent sale, and never trust a client-supplied price.
    const productIds = [...new Set(items.map((i) => parseInt(i.product_id)))];
    const prodRows = await client.query(
      "SELECT id, name, unit_price, price, stock FROM products WHERE id = ANY($1::int[]) FOR UPDATE",
      [productIds]
    );
    const productsById = new Map(prodRows.rows.map((p) => [p.id, p]));

    let subtotal = 0;
    const lineItems = [];
    for (const item of items) {
      const productId = parseInt(item.product_id);
      const quantity = parseInt(item.quantity);
      const p = productsById.get(productId);
      if (!p || !Number.isInteger(quantity) || quantity <= 0) {
        await client.query("ROLLBACK");
        return res.status(400).json({ message: `Product ${item.product_id} is not available` });
      }
      const availableStock = p.stock ?? 0;
      if (quantity > availableStock) {
        await client.query("ROLLBACK");
        return res.status(400).json({ message: `Only ${availableStock} of "${p.name}" left in stock` });
      }
      // price/unit_price are stored in a smaller base unit — convert to Naira
      const unit_price = parseFloat(p.unit_price || p.price || 0) * NAIRA_PER_UNIT;
      const line_total = unit_price * quantity;
      subtotal += line_total;
      lineItems.push({ product_id: p.id, name: p.name, quantity, unit_price, line_total });
    }

    // Discount is never trusted as-is from the client:
    //  - with a coupon code, the discount is computed server-side from the
    //    coupon's own rules (mirrors POST /admin/coupons/validate)
    //  - without one, only manager+ roles may apply a manual discount, so a
    //    cashier token can't zero out a sale on its own
    let appliedCoupon = null;
    let finalDiscount = 0;

    if (coupon_code) {
      const result = await validateCoupon(client, { code: coupon_code, subtotal, customerId: customer_id || null });
      if (!result.ok) {
        await client.query("ROLLBACK");
        return res.status(400).json({ message: result.message });
      }
      appliedCoupon = result.coupon;
      finalDiscount = result.discount;
    } else {
      const requestedDiscount = parseFloat(discount_amount) || 0;
      if (requestedDiscount > 0) {
        if (!["superadmin", "manager", "admin"].includes(req.user.role)) {
          await client.query("ROLLBACK");
          return res.status(403).json({ message: "A manager must apply a discount without a coupon code" });
        }
        finalDiscount = Math.max(0, Math.min(requestedDiscount, subtotal));
      }
    }

    // Uses the real tax config from Settings → Tax, not a hardcoded rate
    const taxSettings    = await getTaxSettings();
    const tax_amount     = computeTax(subtotal - finalDiscount, taxSettings);
    const total          = subtotal - finalDiscount + tax_amount;
    const change_amount  = amount_tendered ? Math.max(0, parseFloat(amount_tendered) - total) : 0;
    const reference      = await nextPOSRef(client);

    if (normalizedSplitPayments) {
      const allocated = normalizedSplitPayments.reduce((s, p) => s + p.amount, 0);
      // Allow a 1-kobo rounding tolerance rather than requiring an exact float match
      if (Math.abs(allocated - total) > 0.01) {
        await client.query("ROLLBACK");
        return res.status(400).json({
          message: `Split payment total (₦${allocated.toLocaleString()}) doesn't match the sale total (₦${total.toLocaleString()})`,
        });
      }
    }

    // "Pay Later" hands the goods over now but collects payment on credit —
    // everything else about the sale (stock deduction, receipt, items) is
    // identical, only the payment/order status differ from a paid-in-full sale.
    const isPayLater = payment_method === "Pay Later";

    // Create order — `id` has no DB default, so it must be supplied explicitly
    // (the `reference` value, e.g. "POS-1001", doubles as the order id).
    const order = await client.query(
      `INSERT INTO orders
         (id, order_ref, customer_id, customer_name, subtotal, discount_amount, tax_amount,
          total, payment_method, payment_status, status, source, pos_session_id,
          notes, created_by, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'Physical Store (POS)',$12,$13,$14,NOW(),NOW())
       RETURNING *`,
      [
        reference, reference, customer_id || null, customer_name,
        subtotal, finalDiscount, tax_amount, total,
        payment_method, isPayLater ? "unpaid" : "paid", isPayLater ? "pending" : "completed",
        session_id || null, notes || null, req.user.id,
      ]
    );
    const orderId = order.rows[0].id;

    // A split sale gets one payments-ledger row per method so the actual
    // per-method breakdown is auditable, not just the literal string
    // "Split Payment" on the order.
    if (normalizedSplitPayments) {
      for (let i = 0; i < normalizedSplitPayments.length; i++) {
        const p = normalizedSplitPayments[i];
        await client.query(
          `INSERT INTO payments (payment_ref, order_id, amount, status, payment_method, metadata, paid_at, created_at, updated_at)
           VALUES ($1,$2,$3,'paid',$4,$5,NOW(),NOW(),NOW())`,
          [`${reference}-${i + 1}`, orderId, p.amount, p.method, JSON.stringify({ pos_session_id: session_id || null, split_index: i })]
        );
      }
    }

    // Insert order items and deduct stock
    for (const item of lineItems) {
      await client.query(
        `INSERT INTO order_items (order_id, product_id, product_name, quantity, price, unit_price, subtotal)
         VALUES ($1,$2,$3,$4,$5,$5,$6)`,
        [orderId, item.product_id, item.name, item.quantity, item.unit_price, item.line_total]
      );
      await client.query(
        `UPDATE products
         SET stock = GREATEST(0, COALESCE(stock,0) - $1),
             stock_quantity = GREATEST(0, COALESCE(stock_quantity,0) - $1),
             updated_at = NOW()
         WHERE id=$2`,
        [item.quantity, item.product_id]
      );
    }

    if (appliedCoupon) {
      await recordCouponUsage(client, { coupon: appliedCoupon, discount: finalDiscount, customerId: customer_id || null, orderId: reference });
    }

    await client.query("COMMIT");
    res.status(201).json({
      order:         order.rows[0],
      items:         lineItems,
      change_amount: Math.round(change_amount * 100) / 100,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    next(err);
  } finally {
    client.release();
  }
});

// ════════════════════════════════════════════════════════════════════════════
// HELD ORDERS  ──  GET | POST /api/admin/pos/held
// ════════════════════════════════════════════════════════════════════════════
router.get("/held", requireRole("superadmin", "manager", "admin", "cashier"), async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT * FROM pos_held_orders
       WHERE cashier_id=$1 AND status='held'
       ORDER BY created_at DESC`,
      [req.user.id]
    );
    res.json({ held_orders: result.rows });
  } catch (err) {
    next(err);
  }
});

router.post("/held", requireRole("superadmin", "manager", "admin", "cashier"), validate(posSchemas.heldOrder), async (req, res, next) => {
  try {
    const { label, items, session_id } = req.body;

    const result = await pool.query(
      `INSERT INTO pos_held_orders (cashier_id, session_id, label, items, status, created_at)
       VALUES ($1,$2,$3,$4::JSONB,'held',NOW())
       RETURNING *`,
      [req.user.id, session_id || null, label || `Hold ${new Date().toLocaleTimeString()}`, JSON.stringify(items)]
    );
    res.status(201).json({ held_order: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

router.delete("/held/:id", requireRole("superadmin", "manager", "admin", "cashier"), async (req, res, next) => {
  try {
    await pool.query(
      "UPDATE pos_held_orders SET status='released' WHERE id=$1 AND cashier_id=$2",
      [req.params.id, req.user.id]
    );
    res.json({ message: "Hold released" });
  } catch (err) {
    next(err);
  }
});

// ════════════════════════════════════════════════════════════════════════════
// VERIFY PAYMENT  ──  POST /api/admin/pos/verify-payment
// Match a payment by last 4 digits of transaction ID + optional amount.
// Only searches transactions from the last 24 hours that haven't been used.
// ════════════════════════════════════════════════════════════════════════════
// pos_transactions is created once in migrations.sql (#28), not per-request.

router.post("/verify-payment", requireRole("superadmin","manager","admin","cashier"), validate(posSchemas.verifyPayment), async (req, res, next) => {
  try {
    const { last_four, amount } = req.body;

    const params = [String(last_four)];
    const conditions = [
      "t.last_four = $1",
      "t.status = 'successful'",
      "t.used_for_order_id IS NULL",
      "t.payment_time > NOW() - INTERVAL '24 hours'",
    ];

    if (amount) {
      params.push(parseFloat(amount));
      conditions.push(`ABS(t.amount - $${params.length}) < 1`);
    }

    const result = await pool.query(
      `SELECT t.* FROM pos_transactions t
       WHERE ${conditions.join(" AND ")}
       ORDER BY t.payment_time DESC`,
      params
    );

    res.json({ matches: result.rows });
  } catch (err) {
    next(err);
  }
});

// ════════════════════════════════════════════════════════════════════════════
// MARK TRANSACTION USED  ──  PATCH /api/admin/pos/verify-payment/:id/use
// ════════════════════════════════════════════════════════════════════════════
router.patch("/verify-payment/:id/use", requireRole("superadmin","manager","admin","cashier"), validate(posSchemas.markTransactionUsed), async (req, res, next) => {
  try {
    const { order_id } = req.body;
    await pool.query(
      "UPDATE pos_transactions SET used_for_order_id=$1 WHERE id=$2 AND used_for_order_id IS NULL",
      [order_id || null, req.params.id]
    );
    res.json({ message: "Transaction marked as used" });
  } catch (err) {
    next(err);
  }
});

// ════════════════════════════════════════════════════════════════════════════
// RECORD TRANSACTION  ──  POST /api/admin/pos/transaction
// Called by POS terminal integration or manually to log a payment record.
// ════════════════════════════════════════════════════════════════════════════
router.post("/transaction", requireRole("superadmin","manager","admin","cashier"), validate(posSchemas.recordTransaction), async (req, res, next) => {
  try {
    const { transaction_id, amount, payment_method, payment_time, customer_name, terminal_id, session_id } = req.body;

    const last_four = String(transaction_id).slice(-4);
    const result = await pool.query(
      `INSERT INTO pos_transactions
         (transaction_id, last_four, amount, payment_method, payment_time, customer_name, terminal_id, session_id, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'successful')
       ON CONFLICT (transaction_id) DO UPDATE SET status = EXCLUDED.status, customer_name = EXCLUDED.customer_name
       RETURNING *`,
      [
        transaction_id, last_four, parseFloat(amount),
        payment_method || null, payment_time ? new Date(payment_time) : new Date(),
        customer_name || null, terminal_id || null, session_id || null,
      ]
    );
    res.status(201).json({ transaction: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// ════════════════════════════════════════════════════════════════════════════
// RECEIPTS  ──  GET /api/admin/pos/receipts
// Completed POS sales with full item breakdown
// ════════════════════════════════════════════════════════════════════════════
router.get("/receipts", requireRole("superadmin","manager","admin","cashier","accountant"), async (req, res, next) => {
  try {
    const { search = "", from, to, payment_method, cashier_id, page = 1, limit: limitRaw = 20 } = req.query;
    const limit = clampLimit(limitRaw, 20);
    const params = []; const where = ["o.status = 'completed'", "(o.source = 'pos' OR o.source = 'Physical Store (POS)')"];

    if (search) {
      params.push(`%${search}%`);
      where.push(`(o.id ILIKE $${params.length} OR o.customer_name ILIKE $${params.length} OR u.name ILIKE $${params.length} OR pt.transaction_id ILIKE $${params.length})`);
    }
    if (from)           { params.push(from);           where.push(`DATE(o.created_at) >= $${params.length}`); }
    if (to)             { params.push(to);             where.push(`DATE(o.created_at) <= $${params.length}`); }
    if (payment_method) { params.push(payment_method); where.push(`o.payment_method = $${params.length}`); }
    if (cashier_id)     { params.push(cashier_id);     where.push(`o.created_by = $${params.length}`); }

    const clause = `WHERE ${where.join(" AND ")}`;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const [rows, countRow, stats] = await Promise.all([
      pool.query(
        `SELECT o.id, o.id AS receipt_number, o.customer_name, o.payment_method,
                o.subtotal, o.total, o.tax_amount, o.discount_amount, o.created_at AS paid_at,
                u.name AS cashier_name, u.id AS cashier_id,
                pt.transaction_id,
                COUNT(oi.id) AS items_count
         FROM orders o
         LEFT JOIN users u ON u.id = o.created_by
         LEFT JOIN pos_transactions pt ON pt.used_for_order_id::text = o.id::text
         LEFT JOIN order_items oi ON oi.order_id::text = o.id::text
         ${clause}
         GROUP BY o.id, u.name, u.id, pt.transaction_id
         ORDER BY o.created_at DESC
         LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, parseInt(limit), offset]
      ),
      pool.query(`SELECT COUNT(*) FROM orders o LEFT JOIN users u ON u.id = o.created_by LEFT JOIN pos_transactions pt ON pt.used_for_order_id::text = o.id::text ${clause}`, params),
      pool.query(
        `SELECT
           COUNT(*) AS total_count,
           COALESCE(SUM(CASE WHEN DATE(o.created_at) = CURRENT_DATE THEN o.total ELSE 0 END), 0) AS today_sales,
           COALESCE(SUM(CASE WHEN o.payment_method = 'cash' THEN o.total ELSE 0 END), 0) AS cash_total,
           COALESCE(SUM(CASE WHEN o.payment_method != 'cash' THEN o.total ELSE 0 END), 0) AS card_transfer_total
         FROM orders o
         LEFT JOIN users u ON u.id = o.created_by
         LEFT JOIN pos_transactions pt ON pt.used_for_order_id::text = o.id::text
         ${clause}`,
        params
      ),
    ]);

    // Fetch items for visible receipts
    const ids = rows.rows.map(r => r.id);
    const items = ids.length
      ? await pool.query(`SELECT oi.*, oi.order_id FROM order_items oi WHERE oi.order_id::text = ANY($1::text[])`, [ids])
      : { rows: [] };

    const itemsMap = {};
    items.rows.forEach(i => { if (!itemsMap[i.order_id]) itemsMap[i.order_id] = []; itemsMap[i.order_id].push(i); });

    const receipts = rows.rows.map(r => ({ ...r, items: itemsMap[r.id] || [] }));

    res.json({
      receipts,
      total: parseInt(countRow.rows[0].count),
      page: parseInt(page),
      pages: Math.ceil(parseInt(countRow.rows[0].count) / parseInt(limit)),
      stats: stats.rows[0],
    });
  } catch (err) {
    next(err);
  }
});

// ════════════════════════════════════════════════════════════════════════════
// PRODUCT LOOKUP  ──  GET /api/admin/pos/products
// Optimised for POS: barcode search, or text search, returns only what POS needs
// ════════════════════════════════════════════════════════════════════════════
router.get("/products", requireRole("superadmin", "manager", "admin", "cashier"), async (req, res, next) => {
  try {
    const { q = "", barcode, category_id, limit: limitRaw = 50 } = req.query;
    const limit = clampLimit(limitRaw, 50);
    const params = []; const where = ["p.status='active'"];

    if (barcode) {
      params.push(barcode);
      where.push(`p.barcode=$${params.length}`);
    } else if (q) {
      params.push(`%${q}%`);
      where.push(`(p.name ILIKE $${params.length} OR p.sku ILIKE $${params.length} OR p.barcode ILIKE $${params.length})`);
    }
    if (category_id) { params.push(category_id); where.push(`p.category_id=$${params.length}`); }

    params.push(parseInt(limit));

    const result = await pool.query(
      `SELECT p.id, p.name, p.sku, p.barcode, p.unit_price AS price, p.unit,
              p.stock_quantity AS stock, p.image_url, p.category_id,
              c.name AS category
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE ${where.join(" AND ")}
       ORDER BY p.name
       LIMIT $${params.length}`,
      params
    );
    // product prices are stored in a smaller base unit — convert to Naira here
    const products = result.rows.map((p) => ({
      ...p,
      price: parseFloat(p.price || 0) * NAIRA_PER_UNIT,
    }));
    res.json({ products });
  } catch (err) {
    next(err);
  }
});

// ════════════════════════════════════════════════════════════════════════════
// CUSTOMER LOOKUP  ──  GET /api/admin/pos/customers
// ════════════════════════════════════════════════════════════════════════════
router.get("/customers", requireRole("superadmin", "manager", "admin", "cashier"), async (req, res, next) => {
  try {
    const { q = "", limit: limitRaw = 20 } = req.query;
    const limit = clampLimit(limitRaw, 20);
    const result = await pool.query(
      `SELECT id, name, email, phone, loyalty_points
       FROM customers
       WHERE name ILIKE $1 OR phone ILIKE $1 OR email ILIKE $1
       ORDER BY name LIMIT $2`,
      [`%${q}%`, parseInt(limit)]
    );
    res.json({ customers: result.rows });
  } catch (err) {
    next(err);
  }
});

// ════════════════════════════════════════════════════════════════════════════
// SESSION ORDERS  ──  GET /api/admin/pos/session/:id/orders
// ════════════════════════════════════════════════════════════════════════════
router.get("/session/:id/orders", requireRole("superadmin", "manager", "admin", "cashier"), async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT o.*, COUNT(oi.id) AS item_count
       FROM orders o
       LEFT JOIN order_items oi ON oi.order_id = o.id
       WHERE o.pos_session_id=$1
       GROUP BY o.id
       ORDER BY o.created_at DESC`,
      [req.params.id]
    );
    res.json({ orders: result.rows });
  } catch (err) {
    next(err);
  }
});

// ════════════════════════════════════════════════════════════════════════════
// GOODS RETURN  ──  POST /api/admin/pos/returns
// ════════════════════════════════════════════════════════════════════════════
router.post("/returns", requireRole("superadmin","manager","admin","cashier"), async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { ref, product_id, quantity, unit_price, reason, condition, refund_method, customer_name, phone, notes } = req.body;
    if (!ref || !product_id || !quantity || !unit_price) {
      return res.status(400).json({ message: "Missing required return fields" });
    }
    
    await client.query("BEGIN");
    
    // 1. Idempotency Check
    const existing = await client.query("SELECT id FROM pos_returns WHERE return_ref=$1", [ref]);
    if (existing.rows.length) {
      await client.query("ROLLBACK");
      return res.json({ success: true, message: "Return already processed", return_id: existing.rows[0].id });
    }

    // 2. Insert Return Record
    const total = parseFloat(quantity) * parseFloat(unit_price);
    
    const activeSession = await client.query("SELECT id FROM pos_sessions WHERE cashier_id=$1 AND status='open'", [req.user.id]);
    const sessionId = activeSession.rows.length ? activeSession.rows[0].id : null;

    const retResult = await client.query(
      `INSERT INTO pos_returns
         (return_ref, session_id, product_id, quantity, unit_price, total, reason, condition, refund_method, customer_name, phone, notes, processed_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING id`,
      [ref, sessionId, product_id, parseInt(quantity), parseFloat(unit_price), total, reason, condition, refund_method, customer_name || null, phone || null, notes || null, req.user.id]
    );

    // 3. Stock Restoration
    if (condition === 'resalable') {
      const prodRes = await client.query("SELECT stock FROM products WHERE id=$1 FOR UPDATE", [product_id]);
      if (prodRes.rows.length) {
        const currentStock = parseInt(prodRes.rows[0].stock) || 0;
        const newStock = currentStock + parseInt(quantity);
        await client.query("UPDATE products SET stock=$1, stock_quantity=$1, updated_at=NOW() WHERE id=$2", [newStock, product_id]);
        
        // Log movement
        await client.query(
          `INSERT INTO stock_movements (product_id, type, quantity, before_qty, after_qty, reference, notes, created_by, created_at)
           VALUES ($1, 'return_in', $2, $3, $4, $5, $6, $7, NOW())`,
          [product_id, parseInt(quantity), currentStock, newStock, ref, `Returned: ${reason}`, req.user.id]
        );
      }
    }

    await client.query("COMMIT");
    res.json({ success: true, return_id: retResult.rows[0].id });
  } catch (err) {
    await client.query("ROLLBACK");
    // Ensure table exists gracefully (lazy schema init just in case)
    if (err.message.includes('relation "pos_returns" does not exist')) {
      return res.status(500).json({ message: "System error: pos_returns table not migrated yet." });
    }
    next(err);
  } finally {
    client.release();
  }
});

module.exports = router;
