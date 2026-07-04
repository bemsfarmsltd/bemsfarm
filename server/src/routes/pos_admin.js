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
// ───────────────────────────────────────────────────────────────────────────

const express = require("express");
const router  = express.Router();
const pool    = require("../db/pool");
const { protect, requireRole } = require("../middleware/authMiddleware");

router.use(protect);

// ─── Sequence helper ────────────────────────────────────────────────────────
async function nextPOSRef(client) {
  const r = await client.query(
    `SELECT COALESCE(MAX(CAST(REGEXP_REPLACE(reference,'POS-','') AS INTEGER)),1000)+1 AS next
     FROM orders WHERE reference LIKE 'POS-%'`
  );
  return `POS-${r.rows[0].next}`;
}

// ════════════════════════════════════════════════════════════════════════════
// OPEN SESSION  ──  POST /api/admin/pos/session/open
// ════════════════════════════════════════════════════════════════════════════
router.post("/session/open", requireRole("superadmin","manager","admin","cashier"), async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Check no already-open session for this user
    const open = await client.query(
      "SELECT id FROM pos_sessions WHERE cashier_id=$1 AND status='open'",
      [req.user.id]
    );
    if (open.rows.length) {
      return res.status(400).json({ message: "You already have an open POS session", session_id: open.rows[0].id });
    }

    const { opening_cash = 0, store_id, terminal_id } = req.body;

    const result = await client.query(
      `INSERT INTO pos_sessions
         (cashier_id, store_id, terminal_id, opening_cash, status, opened_at, created_at)
       VALUES ($1,$2,$3,$4,'open',NOW(),NOW())
       RETURNING *`,
      [req.user.id, store_id || null, terminal_id || null, parseFloat(opening_cash)]
    );

    await client.query("COMMIT");
    res.status(201).json({ session: result.rows[0] });
  } catch (err) {
    await client.query("ROLLBACK");
    res.status(500).json({ message: err.message });
  } finally {
    client.release();
  }
});

// ════════════════════════════════════════════════════════════════════════════
// CLOSE SESSION  ──  POST /api/admin/pos/session/:id/close
// ════════════════════════════════════════════════════════════════════════════
router.post("/session/:id/close", requireRole("superadmin","manager","admin","cashier"), async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const session = await client.query(
      "SELECT * FROM pos_sessions WHERE id=$1", [req.params.id]
    );
    if (!session.rows.length) return res.status(404).json({ message: "Session not found" });
    if (session.rows[0].status !== "open") return res.status(400).json({ message: "Session is already closed" });

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
    res.status(500).json({ message: err.message });
  } finally {
    client.release();
  }
});

// ════════════════════════════════════════════════════════════════════════════
// GET CURRENT SESSION  ──  GET /api/admin/pos/session/current
// ════════════════════════════════════════════════════════════════════════════
router.get("/session/current", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT ps.*, u.name AS cashier_name, s.name AS store_name
       FROM pos_sessions ps
       LEFT JOIN users u ON u.id = ps.cashier_id
       LEFT JOIN stores s ON s.id = ps.store_id
       WHERE ps.cashier_id=$1 AND ps.status='open'
       ORDER BY ps.opened_at DESC LIMIT 1`,
      [req.user.id]
    );
    res.json({ session: result.rows[0] || null });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// SESSION HISTORY  ──  GET /api/admin/pos/sessions
// ════════════════════════════════════════════════════════════════════════════
router.get("/sessions", requireRole("superadmin","manager","admin"), async (req, res) => {
  try {
    const { page = 1, limit = 20, from, to, cashier_id } = req.query;
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
        `SELECT ps.*, u.name AS cashier_name, s.name AS store_name
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
    res.status(500).json({ message: err.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// POS SALE  ──  POST /api/admin/pos/sale
// Creates an order from the POS terminal.
// ════════════════════════════════════════════════════════════════════════════
router.post("/sale", requireRole("superadmin","manager","admin","cashier"), async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const {
      items, customer_id, customer_name = "Walk-in Customer",
      payment_method = "cash", amount_tendered,
      discount_amount = 0, coupon_code,
      notes, session_id,
    } = req.body;

    if (!items?.length) return res.status(400).json({ message: "Items required" });

    // Calculate totals from products
    let subtotal = 0;
    const lineItems = [];
    for (const item of items) {
      const prod = await client.query(
        "SELECT id, name, unit_price, price FROM products WHERE id=$1", [item.product_id]
      );
      if (!prod.rows.length) continue;
      const p = prod.rows[0];
      const unit_price = parseFloat(p.unit_price || p.price || 0);
      const line_total = unit_price * parseInt(item.quantity);
      subtotal += line_total;
      lineItems.push({ product_id: p.id, name: p.name, quantity: item.quantity, unit_price, line_total });
    }

    const tax_amount     = 0; // Pull from settings if needed
    const total          = subtotal - parseFloat(discount_amount) + tax_amount;
    const change_amount  = amount_tendered ? Math.max(0, parseFloat(amount_tendered) - total) : 0;
    const reference      = await nextPOSRef(client);

    // Create order
    const order = await client.query(
      `INSERT INTO orders
         (reference, customer_id, customer_name, subtotal, discount_amount, tax_amount,
          total, payment_method, payment_status, status, source, pos_session_id,
          notes, created_by, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'paid','completed','pos',$9,$10,$11,NOW(),NOW())
       RETURNING *`,
      [
        reference, customer_id || null, customer_name,
        subtotal, parseFloat(discount_amount), tax_amount, total,
        payment_method, session_id || null, notes || null, req.user.id,
      ]
    );
    const orderId = order.rows[0].id;

    // Insert order items and deduct stock
    for (const item of lineItems) {
      await client.query(
        `INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, subtotal)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [orderId, item.product_id, item.name, item.quantity, item.unit_price, item.line_total]
      );
      await client.query(
        `UPDATE products
         SET stock_quantity = GREATEST(0, COALESCE(stock_quantity,0) - $1),
             updated_at = NOW()
         WHERE id=$2`,
        [item.quantity, item.product_id]
      );
    }

    // Track coupon usage
    if (coupon_code) {
      const coupon = await client.query("SELECT id FROM coupons WHERE UPPER(code)=UPPER($1)", [coupon_code]);
      if (coupon.rows.length) {
        await client.query(
          "INSERT INTO coupon_usages (coupon_id, customer_id, order_id, discount_amount, used_at) VALUES ($1,$2,$3,$4,NOW())",
          [coupon.rows[0].id, customer_id || null, reference, parseFloat(discount_amount)]
        );
        await client.query(
          "UPDATE coupons SET used_count=used_count+1, updated_at=NOW() WHERE id=$1",
          [coupon.rows[0].id]
        );
      }
    }

    await client.query("COMMIT");
    res.status(201).json({
      order:         order.rows[0],
      items:         lineItems,
      change_amount: Math.round(change_amount * 100) / 100,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    res.status(500).json({ message: err.message });
  } finally {
    client.release();
  }
});

// ════════════════════════════════════════════════════════════════════════════
// HELD ORDERS  ──  GET | POST /api/admin/pos/held
// ════════════════════════════════════════════════════════════════════════════
router.get("/held", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM pos_held_orders
       WHERE cashier_id=$1 AND status='held'
       ORDER BY created_at DESC`,
      [req.user.id]
    );
    res.json({ held_orders: result.rows });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/held", async (req, res) => {
  try {
    const { label, items, session_id } = req.body;
    if (!items?.length) return res.status(400).json({ message: "Items required" });

    const result = await pool.query(
      `INSERT INTO pos_held_orders (cashier_id, session_id, label, items, status, created_at)
       VALUES ($1,$2,$3,$4::JSONB,'held',NOW())
       RETURNING *`,
      [req.user.id, session_id || null, label || `Hold ${new Date().toLocaleTimeString()}`, JSON.stringify(items)]
    );
    res.status(201).json({ held_order: result.rows[0] });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete("/held/:id", async (req, res) => {
  try {
    await pool.query(
      "UPDATE pos_held_orders SET status='released' WHERE id=$1 AND cashier_id=$2",
      [req.params.id, req.user.id]
    );
    res.json({ message: "Hold released" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// VERIFY PAYMENT  ──  POST /api/admin/pos/verify-payment
// Match a payment by last 4 digits of transaction ID + optional amount.
// Only searches transactions from the last 24 hours that haven't been used.
// ════════════════════════════════════════════════════════════════════════════
const ENSURE_POS_TXN_TABLE = `
  CREATE TABLE IF NOT EXISTS pos_transactions (
    id                SERIAL PRIMARY KEY,
    transaction_id    VARCHAR(100) UNIQUE NOT NULL,
    last_four         CHAR(4)       NOT NULL,
    amount            DECIMAL(12,2) NOT NULL,
    payment_method    VARCHAR(50),
    status            VARCHAR(30)   NOT NULL DEFAULT 'successful',
    payment_time      TIMESTAMP     NOT NULL DEFAULT NOW(),
    customer_name     VARCHAR(255),
    terminal_id       VARCHAR(100),
    used_for_order_id INTEGER,
    session_id        INTEGER,
    created_at        TIMESTAMP DEFAULT NOW()
  )`;

router.post("/verify-payment", requireRole("superadmin","manager","admin","cashier"), async (req, res) => {
  try {
    const { last_four, amount } = req.body;
    if (!last_four || String(last_four).length !== 4) {
      return res.status(400).json({ message: "Please provide exactly 4 digits" });
    }

    await pool.query(ENSURE_POS_TXN_TABLE);

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
    res.status(500).json({ message: err.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// MARK TRANSACTION USED  ──  PATCH /api/admin/pos/verify-payment/:id/use
// ════════════════════════════════════════════════════════════════════════════
router.patch("/verify-payment/:id/use", requireRole("superadmin","manager","admin","cashier"), async (req, res) => {
  try {
    const { order_id } = req.body;
    await pool.query(
      "UPDATE pos_transactions SET used_for_order_id=$1 WHERE id=$2 AND used_for_order_id IS NULL",
      [order_id || null, req.params.id]
    );
    res.json({ message: "Transaction marked as used" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// RECORD TRANSACTION  ──  POST /api/admin/pos/transaction
// Called by POS terminal integration or manually to log a payment record.
// ════════════════════════════════════════════════════════════════════════════
router.post("/transaction", requireRole("superadmin","manager","admin","cashier"), async (req, res) => {
  try {
    const { transaction_id, amount, payment_method, payment_time, customer_name, terminal_id, session_id } = req.body;
    if (!transaction_id || !amount) {
      return res.status(400).json({ message: "transaction_id and amount are required" });
    }

    await pool.query(ENSURE_POS_TXN_TABLE);

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
    res.status(500).json({ message: err.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// RECEIPTS  ──  GET /api/admin/pos/receipts
// Completed POS sales with full item breakdown
// ════════════════════════════════════════════════════════════════════════════
router.get("/receipts", requireRole("superadmin","manager","admin","cashier","accountant"), async (req, res) => {
  try {
    const { search = "", from, to, payment_method, cashier_id, page = 1, limit = 20 } = req.query;
    const params = []; const where = ["o.status = 'completed'", "o.source = 'pos'"];

    if (search) {
      params.push(`%${search}%`);
      where.push(`(o.reference ILIKE $${params.length} OR o.customer_name ILIKE $${params.length} OR u.name ILIKE $${params.length} OR pt.transaction_id ILIKE $${params.length})`);
    }
    if (from)           { params.push(from);           where.push(`DATE(o.created_at) >= $${params.length}`); }
    if (to)             { params.push(to);             where.push(`DATE(o.created_at) <= $${params.length}`); }
    if (payment_method) { params.push(payment_method); where.push(`o.payment_method = $${params.length}`); }
    if (cashier_id)     { params.push(cashier_id);     where.push(`o.created_by = $${params.length}`); }

    const clause = `WHERE ${where.join(" AND ")}`;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const [rows, countRow, stats] = await Promise.all([
      pool.query(
        `SELECT o.id, o.reference AS receipt_number, o.customer_name, o.payment_method,
                o.subtotal, o.total, o.tax_amount, o.discount_amount, o.created_at AS paid_at,
                u.name AS cashier_name, u.id AS cashier_id,
                pt.transaction_id,
                COUNT(oi.id) AS items_count
         FROM orders o
         LEFT JOIN users u ON u.id = o.created_by
         LEFT JOIN pos_transactions pt ON pt.used_for_order_id = o.id
         LEFT JOIN order_items oi ON oi.order_id = o.id
         ${clause}
         GROUP BY o.id, u.name, u.id, pt.transaction_id
         ORDER BY o.created_at DESC
         LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, parseInt(limit), offset]
      ),
      pool.query(`SELECT COUNT(*) FROM orders o LEFT JOIN users u ON u.id = o.created_by LEFT JOIN pos_transactions pt ON pt.used_for_order_id = o.id ${clause}`, params),
      pool.query(
        `SELECT
           COUNT(*) AS total_count,
           COALESCE(SUM(CASE WHEN DATE(o.created_at) = CURRENT_DATE THEN o.total ELSE 0 END), 0) AS today_sales,
           COALESCE(SUM(CASE WHEN o.payment_method = 'cash' THEN o.total ELSE 0 END), 0) AS cash_total,
           COALESCE(SUM(CASE WHEN o.payment_method != 'cash' THEN o.total ELSE 0 END), 0) AS card_transfer_total
         FROM orders o
         LEFT JOIN users u ON u.id = o.created_by
         LEFT JOIN pos_transactions pt ON pt.used_for_order_id = o.id
         ${clause}`,
        params
      ),
    ]);

    // Fetch items for visible receipts
    const ids = rows.rows.map(r => r.id);
    const items = ids.length
      ? await pool.query(`SELECT oi.*, oi.order_id FROM order_items oi WHERE oi.order_id = ANY($1::int[])`, [ids])
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
    res.status(500).json({ message: err.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// PRODUCT LOOKUP  ──  GET /api/admin/pos/products
// Optimised for POS: barcode search, or text search, returns only what POS needs
// ════════════════════════════════════════════════════════════════════════════
router.get("/products", async (req, res) => {
  try {
    const { q = "", barcode, category_id, limit = 50 } = req.query;
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
      `SELECT p.id, p.name, p.sku, p.barcode, p.unit_price AS price,
              p.stock_quantity AS stock, p.image_url,
              c.name AS category
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE ${where.join(" AND ")}
       ORDER BY p.name
       LIMIT $${params.length}`,
      params
    );
    res.json({ products: result.rows });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// CUSTOMER LOOKUP  ──  GET /api/admin/pos/customers
// ════════════════════════════════════════════════════════════════════════════
router.get("/customers", async (req, res) => {
  try {
    const { q = "", limit = 20 } = req.query;
    const result = await pool.query(
      `SELECT id, name, email, phone, loyalty_points
       FROM customers
       WHERE name ILIKE $1 OR phone ILIKE $1 OR email ILIKE $1
       ORDER BY name LIMIT $2`,
      [`%${q}%`, parseInt(limit)]
    );
    res.json({ customers: result.rows });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// SESSION ORDERS  ──  GET /api/admin/pos/session/:id/orders
// ════════════════════════════════════════════════════════════════════════════
router.get("/session/:id/orders", async (req, res) => {
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
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
