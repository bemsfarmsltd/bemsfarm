// server/src/routes/payments_admin.js
// Mounted at /api/admin/payments in index.js

const express = require("express");
const router = express.Router();
const pool = require("../db/pool");
const { protect, requireRole } = require("../middleware/authMiddleware");

// Enforce auth for all admin payment endpoints
router.use(protect);

// ── GET /api/admin/payments/reconciliation ──────────────────────
router.get("/reconciliation", requireRole("superadmin", "manager", "admin", "accountant"), async (req, res) => {
  try {
    const { status = "", search = "", limit = 20, page = 1 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    const params = [];
    const where = [];

    if (status) {
      params.push(status);
      where.push(`p.status = $${params.length}`);
    }

    if (search) {
      params.push(`%${search}%`);
      where.push(`(p.payment_ref ILIKE $${params.length} OR p.customer_email ILIKE $${params.length} OR p.pos_terminal_id ILIKE $${params.length} OR p.order_id::text ILIKE $${params.length})`);
    }

    const whereClause = where.length ? "WHERE " + where.join(" AND ") : "";

    const countRes = await pool.query(
      `SELECT COUNT(*) FROM payments p ${whereClause}`,
      params
    );

    params.push(parseInt(limit));
    params.push(offset);

    const paymentsQuery = `
      SELECT 
        p.id, p.payment_ref, p.order_id, p.amount, p.status, 
        p.payment_method, p.customer_email, p.pos_terminal_id, 
        p.paid_at, p.created_at,
        o.id AS order_reference, o.status AS order_status, o.total AS order_total
      FROM payments p
      LEFT JOIN orders o ON p.order_id = o.id
      ${whereClause}
      ORDER BY p.created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `;

    const rows = await pool.query(paymentsQuery, params);

    // Pull KPI Stats
    const statsQuery = await pool.query(`
      SELECT 
        COALESCE(SUM(amount) FILTER (WHERE status = 'successful'), 0) AS total_reconciled,
        COUNT(*) FILTER (WHERE status = 'successful') AS count_successful,
        COUNT(*) FILTER (WHERE status = 'failed') AS count_failed,
        COUNT(*) FILTER (WHERE order_id IS NULL AND status = 'successful') AS count_unreconciled
      FROM payments
    `);

    res.json({
      payments: rows.rows,
      total: parseInt(countRes.rows[0].count),
      page: parseInt(page),
      pages: Math.ceil(parseInt(countRes.rows[0].count) / parseInt(limit)),
      stats: statsQuery.rows[0]
    });
  } catch (err) {
    console.error("GET payments reconciliation error:", err.message);
    res.status(500).json({ message: "Database error: " + err.message });
  }
});

// ── GET /api/admin/payments/webhook-logs ────────────────────────
router.get("/webhook-logs", requireRole("superadmin", "manager", "admin", "accountant"), async (req, res) => {
  try {
    const { status = "", limit = 50, page = 1 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    const params = [];
    const where = [];

    if (status) {
      params.push(status);
      where.push(`status = $${params.length}`);
    }

    const whereClause = where.length ? "WHERE " + where.join(" AND ") : "";

    const countRes = await pool.query(
      `SELECT COUNT(*) FROM payment_webhook_logs ${whereClause}`,
      params
    );

    params.push(parseInt(limit));
    params.push(offset);

    const logsQuery = `
      SELECT id, event_type, payment_ref, payload, signature_verified, status, error_message, created_at
      FROM payment_webhook_logs
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `;

    const rows = await pool.query(logsQuery, params);

    res.json({
      logs: rows.rows,
      total: parseInt(countRes.rows[0].count),
      page: parseInt(page),
      pages: Math.ceil(parseInt(countRes.rows[0].count) / parseInt(limit))
    });
  } catch (err) {
    console.error("GET webhook-logs error:", err.message);
    res.status(500).json({ message: "Database error: " + err.message });
  }
});

// ── POST /api/admin/payments/reconcile-manual ───────────────────
router.post("/reconcile-manual", requireRole("superadmin", "manager", "admin", "accountant"), async (req, res) => {
  const { payment_ref, order_id } = req.body;

  if (!payment_ref || !order_id) {
    return res.status(400).json({ message: "payment_ref and order_id are required" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1. Check if the payment exists
    const payCheck = await client.query(
      "SELECT id, amount, status, payment_method, order_id FROM payments WHERE payment_ref = $1",
      [payment_ref]
    );

    if (payCheck.rows.length === 0) {
      return res.status(404).json({ message: `Payment reference ${payment_ref} not found in validated payments list.` });
    }

    const payment = payCheck.rows[0];

    // 2. Check if the order exists
    const orderCheck = await client.query(
      "SELECT id, total, status FROM orders WHERE id = $1",
      [order_id]
    );

    if (orderCheck.rows.length === 0) {
      return res.status(404).json({ message: `Order ID ${order_id} not found.` });
    }

    const order = orderCheck.rows[0];

    // 3. Update the payment record to point to this order
    await client.query(
      "UPDATE payments SET order_id = $1, updated_at = NOW() WHERE payment_ref = $2",
      [order_id, payment_ref]
    );

    // 4. Update the order to confirmed & save reference
    await client.query(
      "UPDATE orders SET status = 'confirmed', payment_method = $1, payment_ref = $2, updated_at = NOW() WHERE id = $3",
      [payment.payment_method || "transfer", payment_ref, order_id]
    );

    // 5. Post to accounting income ledger
    await client.query(
      `INSERT INTO income (reference, source, source_type, category, description, amount, payment_method, order_id, status, date, created_by)
       VALUES ($1, 'sales', 'online_order', 'POS/Online Sale', $2, $3, $4, $5, 'completed', CURRENT_DATE, $6)
       ON CONFLICT (reference) DO UPDATE SET order_id = EXCLUDED.order_id`,
      [`INC-${payment_ref}`, `Manual payment reconciliation for Order #${order_id}`, payment.amount, payment.payment_method || "transfer", String(order_id), req.user.id]
    );

    await client.query("COMMIT");
    console.log(`✅ Manually reconciled payment ${payment_ref} with Order #${order_id}`);

    res.json({ success: true, message: `Successfully reconciled payment ${payment_ref} with Order #${order_id}` });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Manual reconciliation failed:", err.message);
    res.status(500).json({ message: "Failed to reconcile: " + err.message });
  } finally {
    client.release();
  }
});

module.exports = router;
