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
const { validateCoupon, recordCouponUsage } = require("../utils/coupons");
const { getTaxSettings, computeTax } = require("../utils/taxSettings");
const { clampLimit } = require("../utils/pagination");
const validate = require("../middleware/validate");
const posSchemas = require("../schemas/posSchemas");
const { notifyAdmin } = require("../services/notificationService");
const { COA, postGeneralJournal, postInventoryDoubleEntry } = require("../utils/doubleEntryLedger");
const { logOrderAudit, logInventoryTransaction } = require("../utils/workflowAudit");
const { autoAssignClosestDriver } = require("../services/dispatchEngine");

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

    if (req.user.role === "cashier" && session.rows[0].cashier_id !== req.user.id) {
      await client.query("ROLLBACK");
      return res.status(403).json({ message: "You can only close your own POS session" });
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
    const params = []; const where = ["c.role = 'user'"];

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
router.post(["/sale", "/sales"], requireRole("superadmin","manager","admin","cashier"), validate(posSchemas.sale), async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const {
      items, customer_id, customer_name = "Walk-in Customer",
      payment_method = "cash", amount_tendered,
      discount_amount = 0, coupon_code,
      notes, session_id, split_payments,
    } = req.body;

    const validCustomerId = (customer_id && !isNaN(customer_id) && parseInt(customer_id) > 0) ? parseInt(customer_id) : null;
    const validSessionId = (session_id && !isNaN(session_id) && parseInt(session_id) > 0) ? parseInt(session_id) : null;

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
    const validProductIds = [...new Set(items.map((i) => parseInt(i.product_id)).filter((id) => !isNaN(id) && id > 0))];
    let prodRows = { rows: [] };
    if (validProductIds.length > 0) {
      prodRows = await client.query(
        "SELECT id, name, unit_price, price, stock, stock_quantity, cost_price FROM products WHERE id = ANY($1::int[]) FOR UPDATE",
        [validProductIds]
      );
    }
    const productsById = new Map(prodRows.rows.map((p) => [p.id, p]));

    // Fetch packaging units if specified
    const pkgUnitIds = items.map((i) => parseInt(i.packaging_unit_id)).filter((id) => !isNaN(id) && id > 0);
    let pkgUnitsMap = new Map();
    if (pkgUnitIds.length > 0) {
      const pkgRows = await client.query(
        "SELECT id, product_id, unit_name, multiplier, price FROM product_packaging_units WHERE id = ANY($1::int[])",
        [pkgUnitIds]
      );
      pkgUnitsMap = new Map(pkgRows.rows.map((u) => [u.id, u]));
    }

    let subtotal = 0;
    const lineItems = [];
    for (const item of items) {
      const rawPid = item.product_id;
      const productId = (!isNaN(rawPid) && parseInt(rawPid) > 0) ? parseInt(rawPid) : null;
      const quantity = Math.max(1, parseInt(item.quantity) || 1);

      if (productId && productsById.has(productId)) {
        const p = productsById.get(productId);
        const pkg = item.packaging_unit_id ? pkgUnitsMap.get(parseInt(item.packaging_unit_id)) : null;
        const multiplier = pkg ? parseFloat(pkg.multiplier) : (parseFloat(item.multiplier) || 1);
        const unit_price = pkg ? parseFloat(pkg.price) : (item.unit_price ? parseFloat(item.unit_price) : parseFloat(p.unit_price || p.price || 0));
        const packaging_unit_name = pkg ? pkg.unit_name : (item.packaging_unit_name || item.packaging_name || null);

        const availableStock = p.stock != null ? p.stock : (p.stock_quantity != null ? p.stock_quantity : 999);
        const effectiveNeeded = quantity * multiplier;
        if (p.stock != null && effectiveNeeded > availableStock && availableStock >= 0) {
          await client.query("ROLLBACK");
          return res.status(400).json({
            message: `Only ${availableStock} base unit(s) of "${p.name}" in stock. Order requires ${effectiveNeeded} units.`,
          });
        }

        const line_total = unit_price * quantity;
        subtotal += line_total;
        lineItems.push({
          product_id: p.id,
          name: p.name,
          quantity,
          unit_price,
          line_total,
          multiplier,
          packaging_unit_name,
          packaging_unit_id: pkg?.id || null,
        });
      } else {
        // Custom item, order package, or non-inventory line item
        const unit_price = Math.max(0, parseFloat(item.unit_price || item.price || 0));
        const line_total = unit_price * quantity;
        subtotal += line_total;
        lineItems.push({
          product_id: null,
          name: item.name || item.product_name || `Order Item`,
          quantity,
          unit_price,
          line_total,
          multiplier: 1,
          packaging_unit_name: item.packaging_unit_name || item.packaging_name || item.unit || null,
          packaging_unit_id: null,
        });
      }
    }

    // Discount is never trusted as-is from the client:
    //  - with a coupon code, the discount is computed server-side from the
    //    coupon's own rules (mirrors POST /admin/coupons/validate)
    //  - without one, only manager+ roles may apply a manual discount, so a
    //    cashier token can't zero out a sale on its own
    let appliedCoupon = null;
    let finalDiscount = 0;

    if (coupon_code) {
      const result = await validateCoupon(client, { code: coupon_code, subtotal, customerId: validCustomerId });
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
         (id, order_ref, customer_id, user_id, customer_name, subtotal, discount_amount, tax_amount,
          total, payment_method, payment_status, status, source, pos_session_id,
          notes, created_by, created_at, updated_at)
       VALUES ($1, $2, $3::bigint, $4::int, $5, $6, $7, $8, $9, $10, $11, $12, 'Physical Store (POS)', $13, $14, $15, NOW(), NOW())
       RETURNING *`,
      [
        reference,
        reference,
        validCustomerId,
        validCustomerId,
        customer_name,
        subtotal,
        finalDiscount,
        tax_amount,
        total,
        payment_method,
        isPayLater ? "unpaid" : "paid",
        isPayLater ? "pending" : "completed",
        validSessionId,
        notes || null,
        req.user.id,
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
          [`${reference}-${i + 1}`, orderId, p.amount, p.method, JSON.stringify({ pos_session_id: validSessionId, split_index: i })]
        );
      }
    }

    // Insert order items, calculate COGS, and deduct stock
    let totalCogsAmount = 0;
    for (const item of lineItems) {
      const multiplier = parseFloat(item.multiplier || item.packaging_multiplier || 1) || 1;
      const effectiveDeduction = parseFloat(item.quantity) * multiplier;
      const displayName = item.packaging_unit_name && item.packaging_unit_name !== 'Piece' && item.packaging_unit_name !== 'Unit'
        ? `${item.name} (${item.packaging_unit_name})`
        : item.name;

      await client.query(
        `INSERT INTO order_items (order_id, product_id, product_name, quantity, price, unit_price, subtotal)
         VALUES ($1,$2,$3,$4,$5,$5,$6)`,
        [orderId, item.product_id || null, displayName, item.quantity, item.unit_price, item.line_total]
      );

      if (item.product_id) {
        const prodRes = await client.query(
          `UPDATE products
           SET stock = GREATEST(0, COALESCE(stock,0) - $1),
               stock_quantity = GREATEST(0, COALESCE(stock_quantity,0) - $1),
               updated_at = NOW()
           WHERE id=$2
           RETURNING cost_price, unit_price, name`,
          [effectiveDeduction, item.product_id]
        );

        const itemCost = prodRes.rows[0]
          ? parseFloat(prodRes.rows[0].cost_price || prodRes.rows[0].unit_price || 0)
          : 0;
        const lineCogs = effectiveDeduction * itemCost;
        totalCogsAmount += lineCogs;

        // Post perpetual inventory reduction for this line item
        try {
          await postInventoryDoubleEntry(client, {
            event_type: "cogs",
            product_id: item.product_id,
            product_name: displayName,
            warehouse_id: null,
            quantity: effectiveDeduction,
            unit_cost: itemCost,
            debit_account: COA.COGS_PRODUCE,
            credit_account: COA.INVENTORY_FINISHED_GOODS,
            reference: reference,
            narration: `POS Counter Sale fulfillment: ${displayName} (Qty: ${effectiveDeduction})`,
            user_id: req.user.id,
          });
        } catch (finErr) {
          console.warn("POS line COGS double-entry non-fatal warning:", finErr.message);
        }
      }
    }

    // ── POST REVENUE DOUBLE-ENTRY JOURNAL ──────────────────────────
    // Dr: Cash POS Drawer (1130) or Accounts Receivable (1140)
    // Cr: Product Sales Revenue (4110)
    try {
      await postGeneralJournal(client, {
        source_module: "pos",
        source_ref: reference,
        journal_ref: `JRN-POS-REV-${reference}`,
        debit_account: isPayLater ? COA.ACCOUNTS_RECEIVABLE : COA.CASH_POS_DRAWER,
        credit_account: COA.REVENUE_PRODUCT_SALES,
        amount: total,
        narration: `POS Retail Sale (${reference}) for ${customer_name} (${payment_method})`,
        user_id: req.user.id,
      });
    } catch (finErr) {
      console.warn("POS revenue double-entry non-fatal warning:", finErr.message);
    }

    if (appliedCoupon) {
      await recordCouponUsage(client, { coupon: appliedCoupon, discount: finalDiscount, customerId: customer_id || null, orderId: reference });
    }

    await client.query("COMMIT");

    notifyAdmin({
      type: 'pos_sale',
      title: `💳 POS Counter Sale (${reference})`,
      message: `Cashier ${req.user.name || 'Staff'} completed a counter sale (${reference}) totaling ₦${Number(total).toLocaleString()} for ${customer_name}.`,
      link: '/pos',
      severity: 'info',
      data: {
        reference,
        customer_name,
        total: `₦${Number(total).toLocaleString()}`,
        payment_method,
        cashier: req.user.name || req.user.email,
        items_count: lineItems.length,
      },
      actor: { id: req.user.id, name: req.user.name, role: req.user.role },
    }).catch(() => {});

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
      params.push(barcode.trim());
      where.push(`(
        p.barcode = $${params.length}
        OR p.barcode ILIKE $${params.length}
        OR p.sku = $${params.length}
        OR p.sku ILIKE $${params.length}
        OR EXISTS (
          SELECT 1 FROM product_packaging_units ppu 
          WHERE ppu.product_id = p.id 
            AND (ppu.barcode = $${params.length} OR ppu.barcode ILIKE $${params.length} OR ppu.sku = $${params.length} OR ppu.sku ILIKE $${params.length})
        )
        OR (p.barcode IS NOT NULL AND REGEXP_REPLACE(p.barcode, '\\D', '', 'g') = REGEXP_REPLACE($${params.length}, '\\D', '', 'g') AND LENGTH($${params.length}) >= 4)
      )`);
    } else if (q) {
      params.push(`%${q}%`);
      where.push(`(
        p.name ILIKE $${params.length} 
        OR p.sku ILIKE $${params.length} 
        OR p.barcode ILIKE $${params.length}
        OR EXISTS (
          SELECT 1 FROM product_packaging_units ppu 
          WHERE ppu.product_id = p.id 
            AND (ppu.unit_name ILIKE $${params.length} OR ppu.barcode ILIKE $${params.length} OR ppu.sku ILIKE $${params.length})
        )
      )`);
    }
    if (category_id) { params.push(category_id); where.push(`p.category_id=$${params.length}`); }

    params.push(parseInt(limit));

    const result = await pool.query(
      `SELECT p.id, p.name, p.sku, p.barcode,
              COALESCE(p.unit_price, p.price, 0) AS price,
              p.unit,
              COALESCE(p.stock, p.stock_quantity, 0) AS stock,
              p.image_url, p.category_id,
              c.name AS category
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE ${where.join(" AND ")}
       ORDER BY p.name
       LIMIT $${params.length}`,
      params
    );

    const productIds = result.rows.map((p) => p.id);
    let packagingMap = {};

    if (productIds.length > 0) {
      try {
        const puRes = await pool.query(
          `SELECT id, product_id, unit_name, multiplier, price, cost_price, barcode, sku, is_default
           FROM product_packaging_units
           WHERE product_id = ANY($1::int[]) AND is_active = true
           ORDER BY multiplier ASC`,
          [productIds]
        );
        puRes.rows.forEach((pu) => {
          if (!packagingMap[pu.product_id]) packagingMap[pu.product_id] = [];
          packagingMap[pu.product_id].push({
            ...pu,
            multiplier: parseFloat(pu.multiplier || 1),
            price: parseFloat(pu.price || 0),
            cost_price: pu.cost_price ? parseFloat(pu.cost_price) : null,
          });
        });
      } catch (pkgErr) {
        console.warn("POS packaging units lookup notice:", pkgErr?.message);
      }
    }

    const trimmedBc = barcode ? barcode.trim().toLowerCase() : null;

    const products = result.rows.map((p) => {
      const pkgUnits = packagingMap[p.id] || [];
      let matchedUnit = null;

      if (trimmedBc && pkgUnits.length > 0) {
        matchedUnit = pkgUnits.find(
          (u) =>
            (u.barcode && u.barcode.toLowerCase() === trimmedBc) ||
            (u.sku && u.sku.toLowerCase() === trimmedBc)
        );
      }

      return {
        ...p,
        price: parseFloat(p.price || 0),
        stock: parseFloat(p.stock || 0),
        packaging_units: pkgUnits,
        matched_packaging_unit: matchedUnit || null,
      };
    });

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
       FROM users
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

// ════════════════════════════════════════════════════════════════════════════
// ANALYTICS  ──  GET /api/admin/pos/analytics?timeframe=shift|today|yesterday|week|month
// Every number here is computed live from orders/order_items/payments/products —
// no demo/placeholder data. 'shift' scopes to the caller's open POS session
// (or ?session_id= for a manager reviewing a specific one); everything else is
// a calendar window over POS-channel orders (source = pos / 'Physical Store (POS)').
// ════════════════════════════════════════════════════════════════════════════
const POS_DATE_FILTERS = {
  today:     "DATE(o.created_at) = CURRENT_DATE",
  yesterday: "DATE(o.created_at) = CURRENT_DATE - INTERVAL '1 day'",
  week:      "o.created_at >= NOW() - INTERVAL '7 days'",
  month:     "o.created_at >= NOW() - INTERVAL '30 days'",
};
const POS_PREV_DATE_FILTERS = {
  today:     "DATE(o.created_at) = CURRENT_DATE - INTERVAL '1 day'",
  yesterday: "DATE(o.created_at) = CURRENT_DATE - INTERVAL '2 days'",
  week:      "o.created_at >= NOW() - INTERVAL '14 days' AND o.created_at < NOW() - INTERVAL '7 days'",
  month:     "o.created_at >= NOW() - INTERVAL '60 days' AND o.created_at < NOW() - INTERVAL '30 days'",
};
const HOUR_LABEL = (h) => {
  const hour = parseInt(h);
  const period = hour >= 12 ? "PM" : "AM";
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${String(h12).padStart(2, "0")}:00 ${period}`;
};

router.get("/analytics", requireRole("superadmin", "manager", "admin", "cashier"), async (req, res, next) => {
  try {
    const timeframe = ["shift", "today", "yesterday", "week", "month"].includes(req.query.timeframe)
      ? req.query.timeframe
      : "shift";

    let session = null;
    let orderWhere = "o.status NOT IN ('cancelled')";
    let orderParams = [];
    let prevWhere = null;

    if (timeframe === "shift") {
      const sessionRes = req.query.session_id
        ? await pool.query("SELECT * FROM pos_sessions WHERE id=$1", [req.query.session_id])
        : await pool.query(
            "SELECT * FROM pos_sessions WHERE cashier_id=$1 AND status='open' ORDER BY opened_at DESC LIMIT 1",
            [req.user.id]
          );
      session = sessionRes.rows[0] || null;
      if (session) {
        orderWhere += " AND o.pos_session_id = $1";
        orderParams = [session.id];
      } else {
        orderWhere += " AND 1=0"; // no open session — nothing to analyze yet
      }
    } else {
      orderWhere += ` AND (${POS_DATE_FILTERS[timeframe]}) AND (o.source = 'pos' OR o.source = 'Physical Store (POS)')`;
      prevWhere = `o.status NOT IN ('cancelled') AND (${POS_PREV_DATE_FILTERS[timeframe]}) AND (o.source = 'pos' OR o.source = 'Physical Store (POS)')`;
    }

    // pos_returns has its own created_at/session_id, not orders.created_at, so it
    // needs its own filter mirroring the same window rather than reusing orderWhere.
    let returnsWhere = "1=1";
    let returnsParams = [];
    if (timeframe === "shift") {
      if (session) {
        returnsWhere = "session_id = $1";
        returnsParams = [session.id];
      } else {
        returnsWhere = "1=0";
      }
    } else {
      const returnsDateFilter = POS_DATE_FILTERS[timeframe].replace(/o\.created_at/g, "created_at");
      returnsWhere = returnsDateFilter;
    }

    const [
      orderAgg,
      itemsAgg,
      marginAgg,
      tenderDirect,
      tenderSplit,
      hourlyRows,
      categoryRows,
      channelRows,
      topProducts,
      topCustomers,
      prevAgg,
      returnsAgg,
      tierRows,
      repeatAgg,
    ] = await Promise.all([
      pool.query(
        `SELECT COUNT(*) AS txn_count, COALESCE(SUM(total),0) AS gross_sales, COALESCE(SUM(discount_amount),0) AS discount_total
         FROM orders o WHERE ${orderWhere}`,
        orderParams
      ),

      pool.query(
        `SELECT COALESCE(SUM(oi.quantity),0) AS items_count, COUNT(DISTINCT oi.product_id) AS sku_count
         FROM order_items oi JOIN orders o ON oi.order_id = o.id
         WHERE ${orderWhere}`,
        orderParams
      ),

      pool.query(
        `SELECT
           COALESCE(SUM(oi.subtotal),0) AS revenue,
           COALESCE(SUM(oi.quantity * COALESCE(p.cost_price,0)),0) AS cogs
         FROM order_items oi
         JOIN orders o ON oi.order_id = o.id
         LEFT JOIN products p ON oi.product_id = p.id
         WHERE ${orderWhere}`,
        orderParams
      ),

      pool.query(
        `SELECT COALESCE(payment_method,'unknown') AS method, COUNT(*) AS count, COALESCE(SUM(total),0) AS amount
         FROM orders o WHERE ${orderWhere} AND COALESCE(payment_method,'') <> 'Split Payment'
         GROUP BY payment_method`,
        orderParams
      ),

      pool.query(
        `SELECT COALESCE(p.payment_method,'unknown') AS method, COUNT(*) AS count, COALESCE(SUM(p.amount),0) AS amount
         FROM payments p JOIN orders o ON o.id = p.order_id
         WHERE ${orderWhere} AND o.payment_method = 'Split Payment' AND p.status = 'paid'
         GROUP BY p.payment_method`,
        orderParams
      ),

      pool.query(
        `SELECT EXTRACT(HOUR FROM o.created_at) AS hour, COUNT(*) AS count, COALESCE(SUM(o.total),0) AS amount
         FROM orders o WHERE ${orderWhere}
         GROUP BY hour ORDER BY hour`,
        orderParams
      ),

      pool.query(
        `SELECT COALESCE(cat.name,'Uncategorized') AS category, COALESCE(SUM(oi.subtotal),0) AS revenue, COALESCE(SUM(oi.quantity),0) AS qty
         FROM order_items oi
         JOIN orders o ON oi.order_id = o.id
         LEFT JOIN products p ON oi.product_id = p.id
         LEFT JOIN categories cat ON p.category_id = cat.id
         WHERE ${orderWhere}
         GROUP BY cat.name ORDER BY revenue DESC`,
        orderParams
      ),

      // Full cross-channel mix for context — not scoped to POS-only, so the
      // cashier can see how much of today's business came through other
      // channels. Not meaningful for a single 'shift', so skipped there.
      timeframe === "shift"
        ? Promise.resolve({ rows: [] })
        : pool.query(
            `SELECT COALESCE(source,'Unknown') AS source, COUNT(*) AS count, COALESCE(SUM(total),0) AS revenue
             FROM orders o
             WHERE o.status NOT IN ('cancelled') AND (${POS_DATE_FILTERS[timeframe]})
             GROUP BY source ORDER BY revenue DESC`
          ),

      pool.query(
        `SELECT
           p.name, p.sku,
           COALESCE(p.cost_price,0) AS cost_price,
           COALESCE(p.unit_price, p.price, 0) AS selling_price,
           COALESCE(p.stock, p.stock_quantity, 0) AS stock,
           COALESCE(p.low_stock_threshold, 10) AS low_stock_threshold,
           SUM(oi.quantity) AS units_sold,
           SUM(oi.subtotal) AS revenue,
           SUM(oi.subtotal) - SUM(oi.quantity * COALESCE(p.cost_price,0)) AS profit,
           CASE WHEN SUM(oi.subtotal) > 0
             THEN ((SUM(oi.subtotal) - SUM(oi.quantity * COALESCE(p.cost_price,0))) / SUM(oi.subtotal)) * 100
             ELSE 0
           END AS margin_pct
         FROM order_items oi
         JOIN orders o ON oi.order_id = o.id
         JOIN products p ON oi.product_id = p.id
         WHERE ${orderWhere}
         GROUP BY p.id, p.name, p.sku, p.cost_price, p.unit_price, p.price, p.stock, p.stock_quantity, p.low_stock_threshold
         ORDER BY revenue DESC
         LIMIT 10`,
        orderParams
      ),

      pool.query(
        `SELECT u.id, u.name, u.phone, COUNT(o.id) AS orders,
                COALESCE(SUM(o.total),0) AS total_spent, COALESCE(u.loyalty_points,0) AS loyalty_points
         FROM orders o
         JOIN users u ON o.customer_id = u.id
         WHERE ${orderWhere}
         GROUP BY u.id, u.name, u.phone, u.loyalty_points
         ORDER BY total_spent DESC
         LIMIT 10`,
        orderParams
      ),

      prevWhere
        ? pool.query(`SELECT COALESCE(SUM(total),0) AS gross_sales FROM orders o WHERE ${prevWhere}`)
        : Promise.resolve({ rows: [{ gross_sales: null }] }),

      pool.query(`SELECT COUNT(*) AS count, COALESCE(SUM(total),0) AS amount FROM pos_returns WHERE ${returnsWhere}`, returnsParams)
        .catch(() => ({ rows: [{ count: 0, amount: 0 }] })),

      // Loyalty-tier revenue contribution: a transparent points-threshold
      // classification computed live, not a stored/fabricated tier.
      pool.query(
        `SELECT
           CASE
             WHEN COALESCE(u.loyalty_points,0) >= 3000 THEN 'Platinum'
             WHEN COALESCE(u.loyalty_points,0) >= 1500 THEN 'Gold'
             WHEN COALESCE(u.loyalty_points,0) >= 500  THEN 'Silver'
             ELSE 'Bronze'
           END AS tier,
           COUNT(DISTINCT u.id) AS customers,
           COUNT(o.id) AS orders,
           COALESCE(SUM(o.total),0) AS revenue
         FROM orders o
         JOIN users u ON o.customer_id = u.id
         WHERE ${orderWhere}
         GROUP BY tier`,
        orderParams
      ),

      pool.query(
        `SELECT
           COUNT(*) FILTER (WHERE order_count > 1) AS repeat_customers,
           COUNT(*) AS total_customers
         FROM (
           SELECT o.customer_id, COUNT(*) AS order_count
           FROM orders o
           WHERE ${orderWhere} AND o.customer_id IS NOT NULL
           GROUP BY o.customer_id
         ) t`,
        orderParams
      ),
    ]);

    const grossSales = parseFloat(orderAgg.rows[0].gross_sales || 0);
    const txnCount = parseInt(orderAgg.rows[0].txn_count || 0);
    const itemsCount = parseInt(itemsAgg.rows[0].items_count || 0);
    const skuCount = parseInt(itemsAgg.rows[0].sku_count || 0);
    const productRevenue = parseFloat(marginAgg.rows[0].revenue || 0);
    const cogs = parseFloat(marginAgg.rows[0].cogs || 0);
    const grossProfit = productRevenue - cogs;
    const grossMarginPct = productRevenue > 0 ? (grossProfit / productRevenue) * 100 : 0;

    const tenderMap = {};
    [...tenderDirect.rows, ...tenderSplit.rows].forEach((r) => {
      const method = (r.method || "unknown").toLowerCase();
      if (!tenderMap[method]) tenderMap[method] = { method, amount: 0, count: 0 };
      tenderMap[method].amount += parseFloat(r.amount || 0);
      tenderMap[method].count += parseInt(r.count || 0);
    });
    const tenderBreakdown = Object.values(tenderMap).sort((a, b) => b.amount - a.amount);
    const cashSales = tenderMap.cash?.amount || 0;

    const hourly = hourlyRows.rows.map((r) => ({
      hour: parseInt(r.hour),
      label: HOUR_LABEL(r.hour),
      count: parseInt(r.count || 0),
      amount: parseFloat(r.amount || 0),
    }));
    const maxHourlyAmount = Math.max(1, ...hourly.map((h) => h.amount));

    const categoryBreakdown = categoryRows.rows.map((r) => ({
      category: r.category,
      revenue: parseFloat(r.revenue || 0),
      qty: parseInt(r.qty || 0),
      share: productRevenue > 0 ? (parseFloat(r.revenue || 0) / productRevenue) * 100 : 0,
    }));

    const channelTotal = channelRows.rows.reduce((s, r) => s + parseFloat(r.revenue || 0), 0);
    const channelBreakdown = channelRows.rows.map((r) => ({
      source: r.source,
      revenue: parseFloat(r.revenue || 0),
      count: parseInt(r.count || 0),
      share: channelTotal > 0 ? (parseFloat(r.revenue || 0) / channelTotal) * 100 : 0,
    }));

    const topProductsOut = topProducts.rows.map((p) => ({
      name: p.name,
      sku: p.sku,
      cost_price: parseFloat(p.cost_price || 0),
      selling_price: parseFloat(p.selling_price || 0),
      stock: parseInt(p.stock || 0),
      low_stock_threshold: parseInt(p.low_stock_threshold || 10),
      units_sold: parseInt(p.units_sold || 0),
      revenue: parseFloat(p.revenue || 0),
      profit: parseFloat(p.profit || 0),
      margin_pct: parseFloat(p.margin_pct || 0),
    }));

    const topCustomersOut = topCustomers.rows.map((c) => ({
      id: c.id,
      name: c.name,
      phone: c.phone,
      orders: parseInt(c.orders || 0),
      total_spent: parseFloat(c.total_spent || 0),
      loyalty_points: parseInt(c.loyalty_points || 0),
    }));

    const prevGrossSales = prevAgg.rows[0].gross_sales != null ? parseFloat(prevAgg.rows[0].gross_sales) : null;
    const growthPct = prevGrossSales != null && prevGrossSales > 0
      ? ((grossSales - prevGrossSales) / prevGrossSales) * 100
      : null;

    const discountTotal = parseFloat(orderAgg.rows[0].discount_total || 0);
    const returnsCount = parseInt(returnsAgg.rows[0]?.count || 0);
    const returnRatePct = txnCount > 0 ? (returnsCount / txnCount) * 100 : 0;

    const tierBreakdown = tierRows.rows.map((r) => ({
      tier: r.tier,
      customers: parseInt(r.customers || 0),
      orders: parseInt(r.orders || 0),
      revenue: parseFloat(r.revenue || 0),
    })).sort((a, b) => b.revenue - a.revenue);

    const repeatCustomers = parseInt(repeatAgg.rows[0]?.repeat_customers || 0);
    const totalDistinctCustomers = parseInt(repeatAgg.rows[0]?.total_customers || 0);
    const repeatRatePct = totalDistinctCustomers > 0 ? (repeatCustomers / totalDistinctCustomers) * 100 : 0;

    // Real, derived insights — no scripted marketing copy.
    const insights = [];
    if (topProductsOut.length) {
      const top = topProductsOut[0];
      insights.push({
        type: "top_seller",
        title: `${top.name} is your top seller`,
        detail: `${top.units_sold} sold, ${top.revenue.toLocaleString()} in revenue this period.`,
      });
      const bestMargin = [...topProductsOut].sort((a, b) => b.margin_pct - a.margin_pct)[0];
      if (bestMargin && bestMargin.units_sold > 0) {
        insights.push({
          type: "best_margin",
          title: `${bestMargin.name} has your best margin`,
          detail: `${bestMargin.margin_pct.toFixed(1)}% margin, ${bestMargin.profit.toLocaleString()} profit this period.`,
        });
      }
    }
    if (hourly.some((h) => h.count > 0)) {
      const busiest = [...hourly].sort((a, b) => b.amount - a.amount)[0];
      insights.push({
        type: "busiest_hour",
        title: `${busiest.label} was your busiest hour`,
        detail: `${busiest.count} transaction${busiest.count === 1 ? "" : "s"}, ${busiest.amount.toLocaleString()} in sales.`,
      });
    }

    res.json({
      timeframe,
      session: session
        ? {
            id: session.id,
            session_ref: session.session_ref,
            opened_at: session.opened_at,
            opening_cash: parseFloat(session.opening_cash || 0),
          }
        : null,
      kpis: {
        gross_sales: grossSales,
        txn_count: txnCount,
        aov: txnCount > 0 ? grossSales / txnCount : 0,
        items_per_txn: txnCount > 0 ? itemsCount / txnCount : 0,
        sku_count: skuCount,
        cash_sales: cashSales,
        tender_breakdown: tenderBreakdown,
        gross_margin_pct: grossMarginPct,
        estimated_profit: grossProfit,
        starting_float: timeframe === "shift" && session ? parseFloat(session.opening_cash || 0) : null,
        expected_drawer_cash: timeframe === "shift" && session ? parseFloat(session.opening_cash || 0) + cashSales : null,
        growth_pct: growthPct,
        pending_online_count: null, // supplied client-side from the live online-orders feed
        discount_total: discountTotal,
        returns_count: returnsCount,
        return_rate_pct: returnRatePct,
        repeat_customer_rate_pct: repeatRatePct,
      },
      hourly,
      max_hourly_amount: maxHourlyAmount,
      category_breakdown: categoryBreakdown,
      channel_breakdown: channelBreakdown,
      tier_breakdown: tierBreakdown,
      top_products: topProductsOut,
      top_customers: topCustomersOut,
      insights,
    });
  } catch (err) {
    next(err);
  }
});

// ════════════════════════════════════════════════════════════════════════════
// POS ONLINE ORDER PACKING & INVENTORY DEDUCTION (Sections 11 - 17)
// ════════════════════════════════════════════════════════════════════════════

// ── GET /api/admin/pos/packing/:orderId ──────────────────────────────────────
// Returns item-by-item packing progress for an order
router.get("/packing/:orderId", requireRole("superadmin", "manager", "admin", "cashier", "staff"), async (req, res, next) => {
  try {
    const { orderId } = req.params;

    const orderRes = await pool.query(
      `SELECT o.id, o.order_ref, o.status, o.tracking_status, o.customer_name, o.customer_phone,
              o.address, o.invoice_printed, o.invoice_number, o.packed_at, o.packed_by
       FROM orders o
       WHERE (UPPER(o.id) = UPPER($1) OR UPPER(o.order_ref) = UPPER($1))`,
      [orderId]
    );

    if (!orderRes.rows.length) {
      return res.status(404).json({ message: "Order not found" });
    }

    const order = orderRes.rows[0];

    const itemsRes = await pool.query(
      `SELECT oi.id, oi.product_id, COALESCE(oi.product_name, p.name) as product_name,
              oi.quantity as ordered_quantity,
              COALESCE(oi.scanned_quantity, 0) as scanned_quantity,
              GREATEST(0, oi.quantity - COALESCE(oi.scanned_quantity, 0)) as remaining_quantity,
              p.barcode, p.sku, p.image_url, COALESCE(p.stock, p.stock_quantity, 0) as current_stock,
              (COALESCE(oi.scanned_quantity, 0) >= oi.quantity) as is_completed
       FROM order_items oi
       LEFT JOIN products p ON oi.product_id = p.id
       WHERE oi.order_id = $1
       ORDER BY oi.id ASC`,
      [order.id]
    );

    const totalOrdered = itemsRes.rows.reduce((sum, r) => sum + parseInt(r.ordered_quantity, 10), 0);
    const totalScanned = itemsRes.rows.reduce((sum, r) => sum + parseInt(r.scanned_quantity, 10), 0);
    const allCompleted = itemsRes.rows.length > 0 && itemsRes.rows.every(r => r.is_completed);

    res.json({
      order: {
        id: order.id,
        order_ref: order.order_ref,
        status: order.status,
        tracking_status: order.tracking_status,
        customer_name: order.customer_name,
        invoice_printed: order.invoice_printed,
        invoice_number: order.invoice_number,
        total_ordered: totalOrdered,
        total_scanned: totalScanned,
        is_all_packed: allCompleted,
      },
      items: itemsRes.rows,
    });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/admin/pos/pack-scan ───────────────────────────────────────────
// Scans a single physical item barcode at POS, validates, deducts inventory, and updates packing progress
router.post("/pack-scan", requireRole("superadmin", "manager", "admin", "cashier", "staff"), async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { order_id, barcode, quantity = 1, terminal_id = "POS-MAIN" } = req.body;
    const scanQty = Math.max(1, parseInt(quantity, 10) || 1);

    if (!order_id || !barcode) {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "Order ID and barcode are required for packing scan" });
    }

    // 1. Fetch Order with lock
    const orderRes = await client.query(
      `SELECT o.id, o.order_ref, o.status, o.tracking_status
       FROM orders o
       WHERE (UPPER(o.id) = UPPER($1) OR UPPER(o.order_ref) = UPPER($1))
       FOR UPDATE OF o`,
      [order_id]
    );

    if (!orderRes.rows.length) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Order not found" });
    }

    const order = orderRes.rows[0];

    // Must be in packaging or partially_packed (or processing)
    const allowedPackingStatuses = ["packaging", "partially_packed", "processing", "confirmed"];
    if (!allowedPackingStatuses.includes(order.status)) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        message: `Order #${order.order_ref || order.id} is in status '${order.status}' and cannot be packed at POS.`
      });
    }

    // 2. Identify Product by barcode (or SKU/ID)
    const cleanCode = String(barcode).trim();
    const productRes = await client.query(
      `SELECT p.id, p.name, p.barcode, p.sku, p.stock, p.stock_quantity
       FROM products p
       WHERE p.barcode = $1 OR p.sku = $1 OR p.id::text = $1
       LIMIT 1
       FOR UPDATE`,
      [cleanCode]
    );

    if (!productRes.rows.length) {
      await client.query("ROLLBACK");
      // Section 14: Wrong item scanned -> reject immediately
      return res.status(400).json({
        success: false,
        error_type: "WRONG_ITEM",
        message: `Scanned code "${cleanCode}" does not match any catalog product.`
      });
    }

    const product = productRes.rows[0];

    // 3. Verify Product belongs to this order
    const itemRes = await client.query(
      `SELECT oi.id, oi.product_id, oi.quantity, COALESCE(oi.scanned_quantity, 0) as scanned_quantity
       FROM order_items oi
       WHERE oi.order_id = $1 AND oi.product_id = $2
       LIMIT 1
       FOR UPDATE`,
      [order.id, product.id]
    );

    if (!itemRes.rows.length) {
      await client.query("ROLLBACK");
      // Section 14: Item does not belong to this order
      return res.status(400).json({
        success: false,
        error_type: "WRONG_ITEM",
        message: `Product "${product.name}" (${cleanCode}) is not part of Order #${order.order_ref || order.id}.`
      });
    }

    const orderItem = itemRes.rows[0];
    const orderedQty = parseInt(orderItem.quantity, 10);
    const prevScannedQty = parseInt(orderItem.scanned_quantity, 10);

    // 4. Duplicate scan protection (Section 13)
    if (prevScannedQty >= orderedQty) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        success: false,
        error_type: "DUPLICATE_SCAN",
        message: `Required quantity (${orderedQty}) for "${product.name}" has already been completely packed. Duplicate scan rejected.`
      });
    }

    if (prevScannedQty + scanQty > orderedQty) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        success: false,
        error_type: "OVER_SCAN",
        message: `Scanning ${scanQty} exceeds required remaining quantity (${orderedQty - prevScannedQty}) for "${product.name}".`
      });
    }

    // 5. Check physical stock availability (Section 15)
    const currentStock = parseInt(product.stock ?? product.stock_quantity ?? 0, 10);
    if (currentStock < scanQty) {
      // Prevent negative stock, set PACKAGING_EXCEPTION
      await client.query(
        `UPDATE orders
         SET status = 'packaging_exception',
             tracking_status = 'packaging_exception',
             notes = COALESCE(notes || ' | ', '') || $1,
             updated_at = NOW()
         WHERE id = $2`,
        [`Insufficient stock at POS for ${product.name} (Available: ${currentStock}, Required: ${scanQty})`, order.id]
      );

      await logOrderAudit(client, {
        order_id: order.id,
        actor_id: req.user.id,
        actor_name: req.user.name,
        actor_role: req.user.role,
        action: 'packaging_exception',
        previous_state: order.status,
        new_state: 'packaging_exception',
        metadata: { product_id: product.id, product_name: product.name, available_stock: currentStock, required: scanQty }
      });

      await client.query("COMMIT");

      return res.status(400).json({
        success: false,
        error_type: "INSUFFICIENT_STOCK",
        order_status: "packaging_exception",
        message: `Available inventory (${currentStock}) is insufficient for "${product.name}". Order moved to PACKAGING_EXCEPTION.`
      });
    }

    // 6. Mandatory Rule (Section 12): Deduct stock AT POS PACKING
    const newStock = currentStock - scanQty;
    await client.query(
      `UPDATE products
       SET stock = $1,
           stock_quantity = $1,
           updated_at = NOW()
       WHERE id = $2`,
      [newStock, product.id]
    );

    // Record inventory transaction audit
    await logInventoryTransaction(client, {
      order_id: order.id,
      product_id: product.id,
      quantity: scanQty,
      previous_quantity: currentStock,
      new_quantity: newStock,
      pos_terminal: terminal_id,
      pos_operator_id: req.user.id,
      transaction_type: 'pos_packaging_stockout',
      source_reference: `POS-PACK-${order.id}`,
      notes: `Physical item packed for order #${order.order_ref || order.id}`
    });

    // Record scan entry in order_item_scans
    await client.query(
      `INSERT INTO order_item_scans 
       (order_id, order_item_id, product_id, scanned_barcode, scanned_quantity, operator_id, terminal_id, scanned_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
      [order.id, orderItem.id, product.id, cleanCode, scanQty, req.user.id, terminal_id]
    );

    // Update scanned quantity on order_item
    const updatedScannedQty = prevScannedQty + scanQty;
    await client.query(
      `UPDATE order_items
       SET scanned_quantity = $1
       WHERE id = $2`,
      [updatedScannedQty, orderItem.id]
    );

    // 7. Verify overall order completeness (Sections 16 & 17)
    const checkAllItems = await client.query(
      `SELECT oi.id, oi.quantity, oi.scanned_quantity
       FROM order_items oi
       WHERE oi.order_id = $1`,
      [order.id]
    );

    const isFullyPacked = checkAllItems.rows.every(r => parseInt(r.scanned_quantity, 10) >= parseInt(r.quantity, 10));

    let nextOrderStatus = "partially_packed";
    if (isFullyPacked) {
      nextOrderStatus = "packed";
      await client.query(
        `UPDATE orders
         SET status = 'packed',
             tracking_status = 'packed_ready',
             packed_at = NOW(),
             packed_by = $2,
             updated_at = NOW()
         WHERE id = $1`,
        [order.id, req.user.id]
      );

      await logOrderAudit(client, {
        order_id: order.id,
        actor_id: req.user.id,
        actor_name: req.user.name,
        actor_role: req.user.role,
        action: 'order_packed',
        previous_state: order.status,
        new_state: 'packed',
        metadata: { packed_by: req.user.name, terminal_id }
      });
    } else {
      await client.query(
        `UPDATE orders
         SET status = 'partially_packed',
             tracking_status = 'processing',
             updated_at = NOW()
         WHERE id = $1`,
        [order.id]
      );
    }

    await client.query("COMMIT");

    // 8. Auto-dispatch gate: Trigger driver assignment ONLY when order becomes PACKED (Section 20)
    let dispatchResult = null;
    if (isFullyPacked) {
      try {
        console.log(`📦 Order #${order.id} 100% packed at POS. Initiating auto-dispatch...`);
        dispatchResult = await autoAssignClosestDriver(order.id);
      } catch (dispErr) {
        console.warn(`[dispatchEngine] Non-fatal auto-dispatch error on pack completion:`, dispErr.message);
      }
    }

    res.json({
      success: true,
      message: isFullyPacked
        ? `"${product.name}" scanned. Order #${order.order_ref || order.id} is 100% PACKED! Queued for courier dispatch.`
        : `"${product.name}" scanned successfully (${updatedScannedQty}/${orderedQty}).`,
      product: {
        id: product.id,
        name: product.name,
        scanned_quantity: updatedScannedQty,
        ordered_quantity: orderedQty,
        remaining_quantity: orderedQty - updatedScannedQty,
        is_completed: updatedScannedQty >= orderedQty
      },
      order_status: nextOrderStatus,
      is_order_packed: isFullyPacked,
      dispatch: dispatchResult
    });
  } catch (err) {
    await client.query("ROLLBACK");
    next(err);
  } finally {
    client.release();
  }
});

// ── POST /api/admin/pos/pack-all ───────────────────────────────────────────
// Directly inspects & packs ALL items in an order (no scanning required), deducts stock, and marks order as packed
router.post("/pack-all", requireRole("superadmin", "manager", "admin", "cashier", "staff"), async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { order_id, terminal_id = "POS-MAIN" } = req.body;

    if (!order_id) {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "Order ID is required" });
    }

    const orderRes = await client.query(
      `SELECT o.id, o.order_ref, o.status, o.tracking_status
       FROM orders o
       WHERE (UPPER(o.id) = UPPER($1) OR UPPER(o.order_ref) = UPPER($1))
       FOR UPDATE OF o`,
      [order_id]
    );

    if (!orderRes.rows.length) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Order not found" });
    }

    const order = orderRes.rows[0];

    // Fetch all items for this order
    const itemsRes = await client.query(
      `SELECT oi.id, oi.product_id, oi.quantity, COALESCE(oi.scanned_quantity, 0) as scanned_quantity,
              p.name as product_name, p.stock, p.stock_quantity
       FROM order_items oi
       JOIN products p ON p.id = oi.product_id
       WHERE oi.order_id = $1
       FOR UPDATE OF p`,
      [order.id]
    );

    for (const item of itemsRes.rows) {
      const orderedQty = parseInt(item.quantity, 10);
      const prevScannedQty = parseInt(item.scanned_quantity, 10);
      const remainingQty = Math.max(0, orderedQty - prevScannedQty);

      if (remainingQty > 0) {
        const currentStock = parseInt(item.stock ?? item.stock_quantity ?? 0, 10);
        const newStock = Math.max(0, currentStock - remainingQty);

        // Update product stock
        await client.query(
          `UPDATE products
           SET stock = $1, stock_quantity = $1, updated_at = NOW()
           WHERE id = $2`,
          [newStock, item.product_id]
        );

        // Log inventory transaction
        await logInventoryTransaction(client, {
          order_id: order.id,
          product_id: item.product_id,
          quantity: remainingQty,
          previous_quantity: currentStock,
          new_quantity: newStock,
          pos_terminal: terminal_id,
          pos_operator_id: req.user.id,
          transaction_type: 'pos_packaging_stockout',
          source_reference: `POS-PACKALL-${order.id}`,
          notes: `Batch inspected & packed at POS for order #${order.order_ref || order.id}`
        });

        // Update order_items
        await client.query(
          `UPDATE order_items
           SET scanned_quantity = quantity
           WHERE id = $1`,
          [item.id]
        );
      }
    }

    // Mark order as packed
    await client.query(
      `UPDATE orders
       SET status = 'packed',
           tracking_status = 'packed_ready',
           packed_at = NOW(),
           packed_by = $2,
           updated_at = NOW()
       WHERE id = $1`,
      [order.id, req.user.id]
    );

    await logOrderAudit(client, {
      order_id: order.id,
      actor_id: req.user.id,
      actor_name: req.user.name,
      actor_role: req.user.role,
      action: 'order_packed_direct',
      previous_state: order.status,
      new_state: 'packed',
      metadata: { packed_by: req.user.name, method: 'direct_inspection', terminal_id }
    });

    await client.query("COMMIT");

    // Trigger auto-dispatch
    let dispatchResult = null;
    try {
      dispatchResult = await autoAssignClosestDriver(order.id);
    } catch (dispErr) {
      console.warn(`[dispatchEngine] Non-fatal auto-dispatch error on pack-all:`, dispErr.message);
    }

    return res.json({
      success: true,
      message: `All items for Order #${order.order_ref || order.id} marked as inspected & packed!`,
      order_status: "packed",
      is_order_packed: true,
      dispatch: dispatchResult
    });
  } catch (err) {
    await client.query("ROLLBACK");
    next(err);
  } finally {
    client.release();
  }
});

module.exports = router;
