// server/src/routes/orders_admin.js
// Mounted at /api/admin/orders

const express = require("express");
const router = express.Router();
const pool = require("../db/pool");
const { clampLimit } = require("../utils/pagination");
const { protect, requireRole } = require("../middleware/authMiddleware");
const validate = require("../middleware/validate");
const orderAdminSchemas = require("../schemas/orderAdminSchemas");
const emailService = require("../services/emailService");
const { restoreOrderStock } = require("../utils/orderStock");
const { initiateMonnifyRefund } = require("../utils/monnify");
const { COA, postGeneralJournal, postInventoryDoubleEntry } = require("../utils/doubleEntryLedger");

router.use(protect);

// ── helpers ───────────────────────────────────────────────────────
async function logStatusChange(
  client,
  orderId,
  fromStatus,
  toStatus,
  userId,
  notes,
) {
  await client.query(
    `
    INSERT INTO order_status_history (order_id, from_status, to_status, changed_by, notes, created_at)
    VALUES ($1,$2,$3,$4,$5,NOW())
  `,
    [orderId, fromStatus, toStatus, userId || null, notes || null],
  );
}

async function logTrackingEvent(
  client,
  orderId,
  deliveryId,
  eventType,
  description,
  triggeredBy,
  triggeredById,
) {
  // order_tracking_events has no delivery_id column — the real columns are
  // actor_type/actor_id (not triggered_by/triggered_by_id). deliveryId is
  // accepted for call-site compatibility but has nowhere to be stored.
  await client.query(
    `
    INSERT INTO order_tracking_events
      (order_id, event_type, description, actor_type, actor_id, created_at)
    VALUES ($1,$2,$3,$4,$5,NOW())
  `,
    [
      orderId,
      eventType,
      description,
      triggeredBy || "admin",
      triggeredById || null,
    ],
  );
}

// ── GET /api/admin/orders ─────────────────────────────────────────
router.get("/", requireRole("superadmin", "manager", "admin", "delivery_manager", "accountant", "cashier", "kitchen_staff"), async (req, res, next) => {
  try {
    const {
      page = 1,
      limit: limitRaw = 20,
      search = "",
      status = "",
      channel = "",
    } = req.query;
    const limit = clampLimit(limitRaw, 20);

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const params = [];
    const where = ["(c.role IS NULL OR c.role IN ('user', 'customer'))"];

    if (search) {
      params.push(`%${search}%`);
      where.push(
        `(o.id ILIKE $${params.length} OR c.name ILIKE $${params.length} OR c.phone ILIKE $${params.length} OR o.address ILIKE $${params.length})`,
      );
    }
    if (status) {
      params.push(status);
      where.push(`o.status = $${params.length}`);
    }
    if (channel) {
      // orders.source is a free-text label ("Web App", "Physical Store
      // (POS)", "online", ...) that has drifted across a few different
      // literal spellings over time — match by the same keyword the admin
      // UI's own channel badge classifier uses (getChannelCfg), instead of
      // an exact string match that only ever matches one spelling.
      const CHANNEL_PATTERNS = {
        online:       ["%online%", "%web%"],
        chef_bems_ai: ["%chef%", "%ai%", "%agent%"],
        pos:          ["%physical%", "%pos%", "%store%"],
        mobile_app:   ["%mobile%"],
      };
      const patterns = CHANNEL_PATTERNS[channel] || [`%${channel}%`];
      const clauses = patterns.map((p) => { params.push(p); return `o.source ILIKE $${params.length}`; });
      where.push(`(${clauses.join(" OR ")})`);
    }

    const whereClause = where.length ? "WHERE " + where.join(" AND ") : "";

    const countRes = await pool.query(
      `SELECT COUNT(*) FROM orders o LEFT JOIN users c ON o.user_id = c.id ${whereClause}`,
      params,
    );

    params.push(parseInt(limit));
    params.push(offset);

    const rows = await pool.query(
      `
      SELECT
        o.id, o.total, o.status, o.source AS channel, o.payment_method, o.payment_ref,
        COALESCE(o.invoice_printed, false) AS invoice_printed, o.invoice_printed_at,
        COALESCE(o.delivery_fee, 0) AS delivery_fee, o.created_at, o.cancel_reason, o.cancelled_at,
        COALESCE(NULLIF(TRIM(o.address), ''), ua.street_address, '') AS address,
        COALESCE(ua.city, 'Umuahia') AS delivery_city,
        COALESCE(ua.state, 'Abia') AS delivery_state,
        ua.latitude,
        ua.longitude,
        COALESCE(
          NULLIF(TRIM(c.name), ''),
          NULLIF(TRIM(ua.receiver_name), ''),
          CASE WHEN o.source ILIKE '%pos%' OR o.source ILIKE '%physical%' THEN 'Walk-in Customer' ELSE 'Online Customer' END
        ) AS customer_name,
        COALESCE(
          NULLIF(TRIM(c.phone), ''),
          NULLIF(TRIM(ua.receiver_phone), ''),
          ''
        ) AS customer_phone,
        c.email AS customer_email,
        c.id AS customer_id,
        dr.name AS driver_name, dr.phone AS driver_phone,
        dr.vehicle_plate AS driver_plate,
        d.id AS delivery_id, d.status AS delivery_status,
        d.attempts, d.eta_minutes,
        (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) AS item_count,
        (
          SELECT STRING_AGG(COALESCE(p.name, 'Item'), ', ' ORDER BY oi.id) 
          FROM order_items oi 
          LEFT JOIN products p ON oi.product_id = p.id 
          WHERE oi.order_id = o.id
        ) AS item_names,
        COALESCE(
          (
            SELECT json_agg(json_build_object(
              'id', oi.id,
              'product_id', oi.product_id,
              'name', COALESCE(p.name, 'Item'),
              'sku', COALESCE(p.sku, ''),
              'quantity', oi.quantity,
              'qty', oi.quantity,
              'price', oi.price,
              'unit_price', oi.price,
              'unit', COALESCE(p.unit, 'unit'),
              'image', COALESCE(p.image_url, ''),
              'total', (oi.quantity * oi.price)
            ) ORDER BY oi.id)
            FROM order_items oi
            LEFT JOIN products p ON oi.product_id = p.id
            WHERE oi.order_id = o.id
          ),
          '[]'::json
        ) AS items
      FROM orders o
      LEFT JOIN users c ON o.user_id = c.id
      LEFT JOIN LATERAL (
        SELECT street_address, city, state, latitude, longitude, receiver_name, receiver_phone 
        FROM user_addresses 
        WHERE user_id = c.id 
        ORDER BY is_default DESC, created_at DESC 
        LIMIT 1
      ) ua ON true
      LEFT JOIN drivers dr ON o.driver_id = dr.id
      LEFT JOIN deliveries d ON d.order_id = o.id
      ${whereClause}
      ORDER BY o.created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `,
      params,
    );

    // Stats
    const stats = await pool.query(`
      SELECT
        COUNT(*)                                              AS total,
        COUNT(*) FILTER (WHERE status IN ('pending','new_order','paid','confirmed')) AS new_orders,
        COUNT(*) FILTER (WHERE status IN ('processing','packed_ready','packed','driver_assigned','assigned')) AS in_progress,
        COUNT(*) FILTER (WHERE status IN ('out_for_delivery','shipped'))  AS out_for_delivery,
        COUNT(*) FILTER (WHERE status = 'delivery_attempted') AS delivery_attempted,
        COUNT(*) FILTER (WHERE status IN ('delivered','completed'))         AS delivered,
        COUNT(*) FILTER (WHERE status = 'dispute')           AS disputes,
        COALESCE(SUM(total) FILTER (WHERE status IN ('delivered','completed')), 0) AS revenue
      FROM orders
    `);

    res.json({
      orders: rows.rows,
      total: parseInt(countRes.rows[0].count),
      page: parseInt(page),
      pages: Math.ceil(parseInt(countRes.rows[0].count) / parseInt(limit)),
      stats: stats.rows[0],
    });
  } catch (err) {
    console.error("GET /admin/orders:", err.message);
    next(err);
  }
});

// ── GET /api/admin/orders/form-data/staff ─────────────────────────
// Returns staff members eligible for picking & packing
router.get("/form-data/staff", requireRole("superadmin", "manager", "admin", "delivery_manager", "kitchen_staff", "cashier"), async (req, res, next) => {
  try {
    const rows = await pool.query(`
      SELECT DISTINCT COALESCE(u.name, s.employee_code, 'Staff') AS name
      FROM users u
      LEFT JOIN staff s ON s.user_id = u.id
      WHERE u.role NOT IN ('user', 'customer')
      ORDER BY name ASC
    `);
    const names = rows.rows.map(r => r.name).filter(Boolean);
    res.json({ staff: names.length ? names : ["Admin Staff", "Kitchen Team", "Store Team"] });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/admin/orders/form-data/drivers ───────────────────────
// Returns available drivers for the assign modal
router.get("/form-data/drivers", requireRole("superadmin", "manager", "admin", "delivery_manager"), async (req, res, next) => {
  try {
    const rows = await pool.query(`
      SELECT id, name, phone, vehicle_plate, vehicle_type, status,
        true AS is_available
      FROM drivers
      WHERE status IN ('active','on_delivery')
      ORDER BY name
    `);
    res.json({ drivers: rows.rows });
  } catch (err) {
    next(err);
  }
});

// ── DELETE /api/admin/orders/:id  (superadmin only) ──────────────
router.delete("/:id", requireRole("superadmin"), async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const order = await client.query(
      "SELECT id, status FROM orders WHERE id=$1",
      [req.params.id]
    );
    if (!order.rows.length) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Order not found" });
    }

    // Don't let a hard delete silently orphan real financial records —
    // payments.order_id is ON DELETE SET NULL (so it wouldn't error, just
    // quietly disconnect a successful payment from the order it was for),
    // and returns.order_id has no FK at all, so a refunded return would be
    // left pointing at an id that no longer exists. Block deletion if either
    // exists; otherwise clean up the non-financial leftovers explicitly.
    const livePayment = await client.query(
      "SELECT id FROM payments WHERE order_id=$1 AND status='successful' LIMIT 1",
      [req.params.id]
    );
    if (livePayment.rows.length) {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "Cannot delete an order with a successful payment on record — that payment's financial history must be preserved." });
    }
    const refundedReturn = await client.query(
      "SELECT id FROM returns WHERE order_id=$1 AND status='refunded' LIMIT 1",
      [req.params.id]
    );
    if (refundedReturn.rows.length) {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "Cannot delete an order with a refunded return on record — that return's financial history must be preserved." });
    }

    // Remove child rows before deleting the parent
    const linkedReturns = await client.query("SELECT id FROM returns WHERE order_id=$1", [req.params.id]);
    if (linkedReturns.rows.length) {
      const returnIds = linkedReturns.rows.map(r => r.id);
      await client.query("DELETE FROM return_items WHERE return_id = ANY($1)", [returnIds]).catch(() => {});
      await client.query("DELETE FROM returns WHERE order_id=$1", [req.params.id]);
    }
    await client.query("DELETE FROM payments WHERE order_id=$1", [req.params.id]);
    await client.query("DELETE FROM order_items WHERE order_id=$1", [req.params.id]);
    await client.query(
      "DELETE FROM order_status_history WHERE order_id=$1",
      [req.params.id]
    ).catch(() => {}); // table may not exist in all environments
    await client.query(
      "DELETE FROM order_tracking_events WHERE order_id=$1",
      [req.params.id]
    ).catch(() => {});

    await client.query("DELETE FROM orders WHERE id=$1", [req.params.id]);

    await client.query("COMMIT");
    res.json({ message: `Order ${req.params.id} deleted successfully` });
  } catch (err) {
    await client.query("ROLLBACK");
    next(err);
  } finally {
    client.release();
  }
});

// ── GET /api/admin/orders/invoices ─────────────────────────────────────────
router.get("/invoices", requireRole("superadmin", "manager", "admin", "delivery_manager", "accountant", "cashier", "kitchen_staff"), async (req, res, next) => {
  try {
    const { page = 1, limit: limitRaw = 20, search = "", status = "" } = req.query;
    const limit = clampLimit(limitRaw, 20);
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const params = [];
    const where = [];

    if (search) {
      params.push(`%${search}%`);
      where.push(`(invoice_ref ILIKE $${params.length} OR order_id ILIKE $${params.length} OR customer_name ILIKE $${params.length})`);
    }
    if (status && status !== "all") {
      // Supports a comma-separated list so a stat card covering more than
      // one status (e.g. "Sent / Draft") can filter to exactly what it counted.
      const statuses = status.split(",").map((s) => s.trim()).filter(Boolean);
      params.push(statuses);
      where.push(`status = ANY($${params.length})`);
    }

    const whereClause = where.length ? "WHERE " + where.join(" AND ") : "";
    const countRes = await pool.query(`SELECT COUNT(*) FROM invoices ${whereClause}`, params);
    
    params.push(parseInt(limit));
    params.push(offset);

    const rows = await pool.query(`
      SELECT * FROM invoices
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `, params);

    // The table view reads flat/snake_case fields (inv.due_date, inv.amount,
    // ...); the view modal reads a nested customer object + camelCase
    // aliases (selected.customer.name, selected.dueDate, ...). Both shapes
    // are included so either consumer works off the same response.
    const invoices = rows.rows.map((row) => ({
      ...row,
      customer: {
        name: row.customer_name,
        phone: row.customer_phone,
        email: row.customer_email,
        address: row.customer_address,
      },
      orderId: row.order_id,
      issuedDate: row.date_issued,
      dueDate: row.due_date,
      paymentMethod: row.payment_method,
      deliveryFee: parseFloat(row.delivery_fee) || 0,
      discount: parseFloat(row.discount_amount) || 0,
      paidDate: row.paid_at,
      items: Array.isArray(row.items) ? row.items : [],
    }));

    res.json({
      invoices,
      total: parseInt(countRes.rows[0].count),
      page: parseInt(page),
      pages: Math.ceil(parseInt(countRes.rows[0].count) / parseInt(limit))
    });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/admin/orders/invoices ─────────────────────────────────────────
router.post("/invoices", requireRole("superadmin", "manager", "admin"), validate(orderAdminSchemas.createInvoice), async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const {
      customer_id,
      customer_name,
      customer_phone,
      customer_email,
      customer_address,
      due_date,
      payment_method,
      notes,
      items,
      delivery_fee = 0,
      discount_amount = 0,
      status = "draft"
    } = req.body;

    let linkedCustomerId = null;
    if (customer_id) {
      const custCheck = await client.query(
        "SELECT id FROM users WHERE id::text=$1 OR customer_code=$1",
        [String(customer_id)],
      );
      if (custCheck.rows.length) linkedCustomerId = custCheck.rows[0].id;
    }

    // Calculate subtotal — qty/price shape and positivity already enforced by createInvoice schema
    let subtotal = 0;
    const cleanItems = [];
    for (const item of items) {
      const qty = parseInt(item.qty ?? item.quantity);
      const price = parseFloat(item.price ?? item.unit_price ?? 0);
      const itemTotal = qty * price;
      subtotal += itemTotal;
      cleanItems.push({
        name: item.name,
        qty,
        unit: item.unit || "kg",
        price,
        total: itemTotal
      });
    }

    const df = parseFloat(delivery_fee);
    const disc = parseFloat(discount_amount);
    const totalAmount = subtotal + df - disc;

    const tempRef = `temp-${Date.now()}`;

    // Insert invoice
    const result = await client.query(
      `INSERT INTO invoices (
        invoice_ref, customer_name, customer_phone, customer_email, customer_address,
        customer_id, channel, type, date_issued, due_date,
        amount, discount_amount, delivery_fee, payment_method, status, notes,
        created_by, created_at, items
      ) VALUES ($1, $2, $3, $4, $5, $6, 'manual', 'manual', NOW(), $7, $8, $9, $10, $11, $12, $13, $14, NOW(), $15)
      RETURNING id`,
      [
        tempRef,
        customer_name,
        customer_phone || null,
        customer_email || null,
        customer_address || null,
        linkedCustomerId,
        due_date || null,
        totalAmount,
        disc,
        df,
        payment_method || "Bank Transfer",
        status || "draft",
        notes || null,
        req.user.id,
        JSON.stringify(cleanItems)
      ]
    );

    const invoiceId = result.rows[0].id;
    const invoiceRef = `INV-2026-${String(invoiceId).padStart(4, "0")}`;

    // Update invoice reference
    await client.query(
      `UPDATE invoices SET invoice_ref = $1 WHERE id = $2`,
      [invoiceRef, invoiceId]
    );

    await client.query("COMMIT");
    res.status(201).json({ message: "Invoice created successfully", id: invoiceId, invoice_ref: invoiceRef });
  } catch (err) {
    await client.query("ROLLBACK");
    next(err);
  } finally {
    client.release();
  }
});

// ── PATCH /api/admin/orders/invoices/:id/status ───────────────────────────
router.patch("/invoices/:id/status", requireRole("superadmin", "manager", "admin"), validate(orderAdminSchemas.invoiceStatus), async (req, res, next) => {
  try {
    const { status, notes } = req.body;
    await pool.query(
      `UPDATE invoices SET status = $1::varchar, notes = COALESCE($2, notes), paid_at = CASE WHEN $1::varchar = 'paid' THEN NOW() ELSE paid_at END WHERE id::text = $3 OR invoice_ref = $3`,
      [status, notes || null, String(req.params.id)]
    );
    res.json({ message: "Invoice updated", status });
  } catch (err) {
    next(err);
  }
});

// ── DELETE /api/admin/orders/invoices/:id ───────────────────────────
router.delete("/invoices/:id", requireRole("superadmin", "manager", "admin"), async (req, res, next) => {
  try {
    const existing = await pool.query(
      `SELECT status FROM invoices WHERE id::text = $1 OR invoice_ref = $1::text`,
      [String(req.params.id)]
    );
    if (!existing.rows.length) {
      return res.status(404).json({ message: "Invoice not found" });
    }
    if (existing.rows[0].status === "paid") {
      return res.status(400).json({ message: "Cannot delete a paid invoice. Cancel it instead or issue a refund." });
    }
    await pool.query(`DELETE FROM invoices WHERE id::text = $1 OR invoice_ref = $1::text`, [String(req.params.id)]);
    res.json({ message: "Invoice deleted" });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/admin/orders/returns ─────────────────────────────────────────
router.post("/returns", requireRole("superadmin", "manager", "admin"), validate(orderAdminSchemas.createReturn), async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const {
      ordRef,
      customer,
      customer_id: customerIdInput,
      product,
      product_id: productIdInput,
      qty,
      unitPrice,
      reason,
      notes,
      refundMethod = "Bank Transfer"
    } = req.body;

    // customer/product presence and qty > 0 already enforced by createReturn schema

    // 1. Resolve customer_id — the admin UI now sends a real customer_id
    // directly (picked from the actual customers table); the name-based
    // lookup below only exists for older/manual callers that still send a
    // bare name, and uses a trimmed, case-insensitive match rather than an
    // exact string, since two customers can share a name / differ by case.
    let customer_id = customerIdInput ? parseInt(customerIdInput) : null;
    if (!customer_id && customer) {
      const custRes = await client.query(
        "SELECT id FROM users WHERE LOWER(REGEXP_REPLACE(TRIM(name), '\\s+', ' ', 'g')) = LOWER(REGEXP_REPLACE(TRIM($1), '\\s+', ' ', 'g')) LIMIT 1",
        [customer]
      );
      customer_id = custRes.rows[0]?.id || null;
    }

    // 2. Resolve product_id — same real-id-first pattern as customer_id.
    let product_id = productIdInput ? parseInt(productIdInput) : null;
    if (!product_id && product) {
      const prodRes = await client.query("SELECT id FROM products WHERE LOWER(TRIM(name)) = LOWER(TRIM($1)) LIMIT 1", [product]);
      product_id = prodRes.rows[0]?.id || null;
    }

    if (!product_id) {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: `Product "${product || productIdInput}" not found in catalog` });
    }

    const calculatedRefund = parseFloat(qty) * parseFloat(unitPrice || 0);
    const tempRef = `temp-rtn-${Date.now()}`;

    // 3. Insert return record
    const insertRes = await client.query(
      `INSERT INTO returns (
        refund_ref, order_id, user_id, customer_id, product_id, quantity,
        reason, description, status, created_at, refund_amount, refund_method, processed_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending', NOW(), $9, $10, $11)
      RETURNING id`,
      [
        tempRef,
        ordRef || null,
        req.user.id,
        customer_id,
        product_id,
        parseInt(qty),
        reason || "Damaged on delivery",
        notes || null,
        calculatedRefund,
        refundMethod,
        req.user.id
      ]
    );

    const returnId = insertRes.rows[0].id;
    const finalRef = `RTN-2026-${String(returnId).padStart(3, "0")}`;

    // 4. Update final reference
    await client.query("UPDATE returns SET refund_ref = $1 WHERE id = $2", [finalRef, returnId]);

    await client.query("COMMIT");
    res.status(201).json({ message: "Return logged successfully", id: returnId, refund_ref: finalRef });
  } catch (err) {
    await client.query("ROLLBACK");
    next(err);
  } finally {
    client.release();
  }
});

// ── GET /api/admin/orders/returns ─────────────────────────────────────────
router.get("/returns", requireRole("superadmin", "manager", "admin"), async (req, res, next) => {
  try {
    const { page = 1, limit: limitRaw = 20, search = "", status = "" } = req.query;
    const limit = clampLimit(limitRaw, 20);
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const params = [];
    const where = ["(c.role IS NULL OR c.role IN ('user', 'customer'))"];

    if (search) {
      params.push(`%${search}%`);
      where.push(`(r.refund_ref ILIKE $${params.length} OR r.order_id ILIKE $${params.length} OR c.name ILIKE $${params.length})`);
    }
    if (status && status !== "all") {
      params.push(status);
      where.push(`r.status = $${params.length}`);
    }

    const whereClause = where.length ? "WHERE " + where.join(" AND ") : "";
    const countRes = await pool.query(`SELECT COUNT(*) FROM returns r LEFT JOIN users c ON r.customer_id = c.id ${whereClause}`, params);

    params.push(parseInt(limit));
    params.push(offset);

    const rows = await pool.query(`
      SELECT r.*, c.name as customer_name, c.email as customer_email, c.phone as customer_phone,
             p.name as product_name, p.unit as product_unit, COALESCE(p.unit_price, p.price, 0) as product_price,
             staff.name as processed_by_name
      FROM returns r
      LEFT JOIN users c ON r.customer_id = c.id
      LEFT JOIN products p ON r.product_id = p.id
      LEFT JOIN users staff ON r.processed_by = staff.id
      ${whereClause}
      ORDER BY r.created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `, params);

    res.json({
      returns: rows.rows,
      total: parseInt(countRes.rows[0].count),
      page: parseInt(page),
      pages: Math.ceil(parseInt(countRes.rows[0].count) / parseInt(limit))
    });
  } catch (err) {
    next(err);
  }
});

// ── PATCH /api/admin/orders/returns/:id/status ───────────────────────────
router.patch("/returns/:id/status", requireRole("superadmin", "manager", "admin"), validate(orderAdminSchemas.returnStatus), async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const existing = await client.query(
      `SELECT id, status, order_id, refund_amount, refund_method FROM returns WHERE id = $1 OR refund_ref = $1::text`,
      [req.params.id]
    );
    if (!existing.rows.length) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Return not found" });
    }
    const ret = existing.rows[0];
    const { status, description, refund_amount, refund_method } = req.body;

    // The Process modal lets staff confirm/edit the refund amount and method
    // at decision time — persist those overrides onto the record itself
    // rather than silently discarding them.
    const finalRefundAmount = refund_amount != null ? refund_amount : ret.refund_amount;
    const finalRefundMethod = refund_method || ret.refund_method;

    // Moving a return to "refunded" used to just flip the status text — no
    // Monnify call, no money actually moved. Same honest treatment as the
    // dispute-resolution refund flow: only auto-refund orders paid via
    // Monnify (payment_ref set); everything else needs a manual refund.
    let refundOutcome = null;
    if (status === "refunded" && ret.status !== "refunded") {
      const amountToRefund = parseFloat(finalRefundAmount || 0);
      const orderRes = ret.order_id
        ? await client.query("SELECT payment_ref FROM orders WHERE id = $1", [ret.order_id])
        : { rows: [] };
      const paymentRef = orderRes.rows[0]?.payment_ref;

      if (paymentRef && amountToRefund > 0) {
        try {
          const refundReference = `BF-RTN-${ret.id}-${Date.now().toString(36).toUpperCase()}`;
          await initiateMonnifyRefund({
            transactionReference: paymentRef,
            refundReference,
            refundAmount: amountToRefund,
            refundReason: `Return ${req.params.id} refund`,
            customerNote: "BemsFarms return refund",
          });
          refundOutcome = "initiated";
        } catch (refundErr) {
          console.error("[Return Refund] Monnify refund failed:", refundErr.response?.data || refundErr.message);
          refundOutcome = "failed";
        }
      } else {
        refundOutcome = "manual";
      }
    }

    const refundNote = refundOutcome === "initiated"
      ? `Refund of ₦${finalRefundAmount} initiated via Monnify.`
      : refundOutcome === "failed"
        ? "Refund approved but the Monnify refund call failed — needs manual follow-up."
        : refundOutcome === "manual"
          ? `No online payment reference on this order — process the ₦${finalRefundAmount} refund manually (${finalRefundMethod || "method not set"}).`
          : null;
    const finalDescription = refundNote
      ? [description, refundNote].filter(Boolean).join(" ")
      : description;

    await client.query(
      `UPDATE returns SET status = $1, description = COALESCE($2, description),
              refund_amount = $3, refund_method = $4 WHERE id = $5`,
      [status, finalDescription || null, finalRefundAmount, finalRefundMethod, ret.id]
    );

    await client.query("COMMIT");
    res.json({ message: "Return updated", status, refund_outcome: refundOutcome });
  } catch (err) {
    await client.query("ROLLBACK");
    next(err);
  } finally {
    client.release();
  }
});

// ── DELETE /api/admin/orders/returns/:id ─────────────────────────────────
router.delete("/returns/:id", requireRole("superadmin", "manager", "admin"), async (req, res, next) => {
  try {
    const existing = await pool.query(
      `SELECT status FROM returns WHERE id = $1 OR refund_ref = $1::text`,
      [req.params.id]
    );
    if (!existing.rows.length) {
      return res.status(404).json({ message: "Return not found" });
    }
    // A refunded return is a completed financial record — don't let it be
    // erased from the audit trail, same reasoning as other money-movement rows.
    if (existing.rows[0].status === "refunded") {
      return res.status(400).json({ message: "Cannot delete a return that has already been refunded." });
    }
    await pool.query(`DELETE FROM returns WHERE id = $1 OR refund_ref = $1::text`, [req.params.id]);
    res.json({ message: "Return deleted" });
  } catch (err) {
    next(err);
  }
});




// ── GET /api/admin/orders/:id ─────────────────────────────────────
router.get("/:id", requireRole("superadmin", "manager", "admin", "delivery_manager", "accountant", "cashier", "kitchen_staff"), async (req, res, next) => {
  try {
    const rawId = String(req.params.id || "").trim();
    if (!rawId || rawId === "null" || rawId === "undefined") {
      return res.status(404).json({ message: "Order not found" });
    }

    const isNumeric = /^\d+$/.test(rawId);
    const order = await pool.query(
      `
      SELECT
        o.*,
        COALESCE(c.name, 'Walk-In Customer') AS customer_name,
        COALESCE(c.phone, '')               AS customer_phone,
        c.email AS customer_email,
        dr.name AS driver_name, dr.phone AS driver_phone,
        dr.vehicle_plate AS driver_plate, dr.vehicle_type,
        d.id AS delivery_id, d.status AS delivery_status,
        d.attempts, d.eta_minutes, d.dispatched_at, d.arrived_at, d.delivered_at,
        d.proof_photos, d.item_proofs, d.proof_note AS delivery_notes, d.failure_reason
      FROM orders o
      LEFT JOIN users c ON o.user_id = c.id
      LEFT JOIN drivers dr ON o.driver_id = dr.id
      LEFT JOIN deliveries d ON d.order_id = o.id
      WHERE CAST(o.id AS TEXT) = $1
      LIMIT 1
    `,
      [rawId],
    );

    if (!order.rows.length) {
      return res.status(404).json({ message: "Order not found" });
    }

    const o = order.rows[0];
    const realOrderId = o.id;

    let items = [];
    try {
      const itemsRes = await pool.query(
        `
        SELECT
          oi.*,
          COALESCE(oi.product_name, p.name, 'Item') AS name,
          COALESCE(oi.sku, p.sku, '') AS sku,
          p.image_url,
          COALESCE(oi.unit_price, oi.price, 0) AS unit_price,
          COALESCE(oi.subtotal, oi.quantity * COALESCE(oi.unit_price, oi.price, 0)) AS subtotal
        FROM order_items oi
        LEFT JOIN products p ON oi.product_id = p.id
        WHERE oi.order_id = $1 OR CAST(oi.order_id AS TEXT) = $2
        ORDER BY oi.id ASC
      `,
        [realOrderId, rawId],
      );
      items = itemsRes.rows;
    } catch (e) {
      console.warn("Could not query order_items:", e.message);
    }

    let timeline = [];
    try {
      const timelineRes = await pool.query(
        `
        SELECT * FROM order_status_history
        WHERE order_id = $1 OR CAST(order_id AS TEXT) = $2
        ORDER BY created_at ASC
      `,
        [realOrderId, rawId],
      );
      timeline = timelineRes.rows;
    } catch (e) {
      console.warn("Could not query order_status_history:", e.message);
    }

    let tracking = [];
    try {
      const trackingRes = await pool.query(
        `
        SELECT * FROM order_tracking_events
        WHERE order_id = $1 OR CAST(order_id AS TEXT) = $2
        ORDER BY created_at ASC
      `,
        [realOrderId, rawId],
      );
      tracking = trackingRes.rows;
    } catch (e) {
      console.warn("Could not query order_tracking_events:", e.message);
    }

    res.json({
      ...o,
      items,
      timeline,
      tracking,
    });
  } catch (err) {
    console.error("GET /api/admin/orders/:id error:", err.message);
    next(err);
  }
});

// ── POST /api/admin/orders/:id/print-invoice ───────────────────────────
// Triggered immediately when invoice is printed from Admin or POS.
// Transitions order to packaging ('processing') and activates proximity auto-dispatch.
router.post(
  "/:id/print-invoice",
  requireRole("superadmin", "manager", "admin", "delivery_manager", "staff"),
  async (req, res, next) => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const { id } = req.params;

      const orderRes = await client.query(
        "SELECT id, order_ref, status, total, address, latitude, longitude, driver_id FROM orders WHERE (UPPER(id)=UPPER($1) OR UPPER(order_ref)=UPPER($1)) FOR UPDATE",
        [id]
      );

      if (!orderRes.rows.length) {
        await client.query("ROLLBACK");
        return res.status(404).json({ message: "Order not found" });
      }

      const order = orderRes.rows[0];

      if (order.status === "cancelled") {
        await client.query("ROLLBACK");
        return res.status(400).json({ message: "Cannot print invoice for a cancelled order" });
      }

      // Mark invoice printed and advance to processing / packaging
      await client.query(
        `UPDATE orders
         SET invoice_printed = true,
             invoice_printed_at = NOW(),
             status = CASE 
               WHEN status IN ('pending', 'paid', 'new_order', 'confirmed') THEN 'processing'
               ELSE status
             END,
             tracking_status = CASE
               WHEN tracking_status IN ('order_placed', 'pending', 'confirmed') THEN 'processing'
               ELSE tracking_status
             END,
             updated_at = NOW()
         WHERE id = $1`,
        [order.id]
      );

      // Log tracking event safely with savepoint
      try {
        await client.query("SAVEPOINT print_event");
        await client.query(
          `INSERT INTO order_tracking_events (order_id, event_type, description, actor_type, actor_id, created_at)
           VALUES ($1, 'invoice_printed', 'Order invoice printed. Moved to packaging & queued for dispatch.', 'admin', $2, NOW())`,
          [order.id, req.user.id]
        );
        await client.query("RELEASE SAVEPOINT print_event");
      } catch (e) {
        await client.query("ROLLBACK TO SAVEPOINT print_event");
      }

      await client.query("COMMIT");

      // Trigger autoAssignClosestDriver if driver not yet assigned
      let dispatchResult = null;
      if (!order.driver_id) {
        try {
          const { autoAssignClosestDriver } = require("../services/dispatchEngine");
          dispatchResult = await autoAssignClosestDriver(order.id);
        } catch (dispErr) {
          console.warn("Auto-dispatch on invoice print notice:", dispErr.message);
        }
      }

      res.json({
        success: true,
        message: "Invoice printed successfully. Order moved to packaging.",
        order_id: order.id,
        status: "processing",
        dispatch: dispatchResult,
      });
    } catch (err) {
      await client.query("ROLLBACK");
      next(err);
    } finally {
      client.release();
    }
  }
);

// ── PATCH /api/admin/orders/:id/status ───────────────────────────
// Generic status update with timeline logging
router.patch(
  "/:id/status",
  requireRole("superadmin", "manager", "admin", "delivery_manager", "cashier"),
  async (req, res, next) => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      let { status, notes, picking_staff } = req.body;
      let nextStatus = String(status || '').toLowerCase().trim();
      if (nextStatus === 'packed') nextStatus = 'packed_ready';
      if (nextStatus === 'assigned') nextStatus = 'driver_assigned';
      if (nextStatus === 'shipped') nextStatus = 'out_for_delivery';
      if (nextStatus === 'completed') nextStatus = 'delivered';
      if (nextStatus === 'new_order' || nextStatus === 'pending') nextStatus = 'paid';

      const VALID_STATUSES = ["paid", "confirmed", "processing", "packed_ready", "driver_assigned", "out_for_delivery", "delivery_attempted", "delivered", "cancelled", "dispute"];
      if (!VALID_STATUSES.includes(nextStatus)) {
        await client.query("ROLLBACK");
        return res.status(400).json({ message: `status must be one of: ${VALID_STATUSES.join(", ")}` });
      }

      const current = await client.query(
        "SELECT id, status, driver_id FROM orders WHERE UPPER(id::text)=UPPER($1) OR UPPER(order_ref)=UPPER($1)",
        [req.params.id],
      );
      if (!current.rows.length) {
        await client.query("ROLLBACK");
        return res.status(404).json({ message: "Order not found" });
      }

      const resolvedId = current.rows[0].id;

      const fromStatus = current.rows[0].status;

      if (fromStatus === "cancelled" && nextStatus !== "cancelled") {
        await client.query("ROLLBACK");
        return res.status(400).json({ message: "Cannot process or update the status of a cancelled order" });
      }

      if (fromStatus === "dispute") {
        await client.query("ROLLBACK");
        return res.status(400).json({ message: "This order is disputed — use the dispute resolution flow instead" });
      }
      if (["driver_assigned", "out_for_delivery"].includes(nextStatus) && !current.rows[0].driver_id) {
        await client.query("ROLLBACK");
        return res.status(400).json({ message: "Assign a driver first" });
      }

      await client.query(
        "UPDATE orders SET status=$1, updated_at=NOW() WHERE id=$2",
        [nextStatus, resolvedId],
      );

      // Only restore on the transition INTO cancelled
      if (nextStatus === "cancelled" && fromStatus !== "cancelled") {
        await restoreOrderStock(client, resolvedId);
      }

      // ── DOUBLE-ENTRY POSTING ON ORDER DELIVERED ────────────────────
      if (nextStatus === "delivered" && fromStatus !== "delivered") {
        try {
          const ord = current.rows[0];
          const totalAmt = parseFloat(ord.total) || 0;
          const delFee = parseFloat(ord.delivery_fee) || 0;
          const subtotalAmt = Math.max(0, totalAmt - delFee);

          // 1. Post Revenue Double-Entry Journal
          await postGeneralJournal(client, {
            source_module: "orders",
            source_ref: ord.order_ref || req.params.id,
            journal_ref: `JRN-ORD-REV-${req.params.id}`,
            debit_account: COA.CASH_MONNIFY_VAULT,
            credit_account: COA.REVENUE_PRODUCT_SALES,
            amount: subtotalAmt,
            narration: `Product Sales Revenue for Order #${ord.order_ref || req.params.id}`,
            user_id: req.user.id,
          });

          if (delFee > 0) {
            await postGeneralJournal(client, {
              source_module: "orders",
              source_ref: ord.order_ref || req.params.id,
              journal_ref: `JRN-ORD-DELREV-${req.params.id}`,
              debit_account: COA.CASH_MONNIFY_VAULT,
              credit_account: COA.REVENUE_DELIVERY_FEES,
              amount: delFee,
              narration: `Delivery Logistics Revenue for Order #${ord.order_ref || req.params.id}`,
              user_id: req.user.id,
            });
          }

          // 2. Post COGS Perpetual Inventory Double-Entry
          const itemsRes = await client.query(
            `SELECT oi.product_id, oi.product_name, oi.quantity, COALESCE(p.cost_price, p.unit_price, 0) AS cost_price 
             FROM order_items oi 
             LEFT JOIN products p ON oi.product_id = p.id 
             WHERE oi.order_id = $1`,
            [resolvedId]
          );

          for (const item of itemsRes.rows) {
            const qty = parseInt(item.quantity) || 1;
            const unitCost = parseFloat(item.cost_price) || 0;
            if (qty > 0 && unitCost > 0) {
              await postInventoryDoubleEntry(client, {
                event_type: "cogs",
                product_id: item.product_id,
                product_name: item.product_name,
                warehouse_id: null,
                quantity: qty,
                unit_cost: unitCost,
                debit_account: COA.COGS_PRODUCE,
                credit_account: COA.INVENTORY_FINISHED_GOODS,
                reference: `ORD-${resolvedId}`,
                narration: `Delivered Order COGS: ${item.product_name} (Qty: ${qty})`,
                user_id: req.user.id,
              });
            }
          }
        } catch (finErr) {
          console.warn("Order delivery double-entry non-fatal warning:", finErr.message);
        }
      }

      await logStatusChange(
        client,
        resolvedId,
        fromStatus,
        nextStatus,
        req.user.id,
        notes,
      );

      // Map status to tracking event
      const eventMap = {
        processing: {
          type: "kitchen_preparing",
          desc: `Order sent to picking queue${picking_staff ? `. Staff: ${picking_staff}` : ""}`,
        },
        packed_ready: {
          type: "packed_ready",
          desc: `Goods picked, packed and labelled. Ready for driver collection${picking_staff ? `. Staff: ${picking_staff}` : ""}`,
        },
        driver_assigned: {
          type: "driver_assigned",
          desc: notes || "Driver assigned and notified",
        },
        out_for_delivery: {
          type: "out_for_delivery",
          desc: "Driver confirmed pickup. Out for delivery.",
        },
        delivered: { type: "delivered", desc: "Order delivered successfully." },
        cancelled: { type: "cancelled", desc: notes || "Order cancelled" },
        delivery_attempted: {
          type: "delivery_attempted",
          desc: notes || "Delivery attempted but customer unavailable",
        },
        dispute: { type: "cancelled", desc: notes || "Dispute raised" },
      };

      const ev = eventMap[nextStatus];
      if (ev) {
        await logTrackingEvent(
          client,
          resolvedId,
          null,
          ev.type,
          ev.desc,
          "admin",
          req.user.id,
        );
      }

      await client.query("COMMIT");
      
      // Send email notification to customer
      try {
        const emailResult = await pool.query(
          `SELECT o.id, o.total, COALESCE(o.customer_name, u.name) AS name, COALESCE(u.email, c.email) AS email
           FROM orders o
           LEFT JOIN users u ON u.id = o.customer_id
           LEFT JOIN users c ON c.phone = o.customer_phone
           WHERE o.id = $1`,
          [resolvedId]
        );
        if (emailResult.rows.length && emailResult.rows[0].email) {
          const orderInfo = emailResult.rows[0];
          await emailService.sendOrderStatusEmail(
            { id: orderInfo.id, total: orderInfo.total },
            { name: orderInfo.name, email: orderInfo.email },
            ev ? ev.type : nextStatus
          );
          console.log("Email sent to:", orderInfo.email);
        }
      } catch (emailErr) {
        console.error("Email failed:", emailErr.message);
      }

      res.json({ message: "Status updated", status: nextStatus });
    } catch (err) {
      await client.query("ROLLBACK");
      next(err);
    } finally {
      client.release();
    }
  },
);

// ── PATCH /api/admin/orders/:id/assign-driver ─────────────────────
router.patch(
  "/:id/assign-driver",
  requireRole("superadmin", "manager", "admin", "delivery_manager"),
  validate(orderAdminSchemas.assignDriver),
  async (req, res, next) => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const { driver_id, reassign = false } = req.body;

      const order = await client.query("SELECT * FROM orders WHERE id=$1", [
        req.params.id,
      ]);
      if (!order.rows.length) {
        await client.query("ROLLBACK");
        return res.status(404).json({ message: "Order not found" });
      }

      if (order.rows[0].status === "cancelled") {
        await client.query("ROLLBACK");
        return res.status(400).json({ message: "Cannot assign a driver to a cancelled order" });
      }

      const driver = await client.query("SELECT * FROM drivers WHERE id=$1", [
        driver_id,
      ]);
      if (!driver.rows.length) {
        await client.query("ROLLBACK");
        return res.status(404).json({ message: "Driver not found" });
      }

      const d = driver.rows[0];
      const prevDriverId = order.rows[0].driver_id;

      // Update order
      await client.query(
        "UPDATE orders SET driver_id=$1, status='driver_assigned', updated_at=NOW() WHERE id=$2",
        [driver_id, req.params.id],
      );

      // Create or update delivery record
      const existingDelivery = await client.query(
        "SELECT id FROM deliveries WHERE order_id=$1",
        [req.params.id],
      );

      let deliveryId;
      if (existingDelivery.rows.length) {
        deliveryId = existingDelivery.rows[0].id;
        await client.query(
          "UPDATE deliveries SET driver_id=$1, status='assigned', assigned_at=NOW() WHERE id=$2",
          [driver_id, deliveryId],
        );
      } else {
        const del = await client.query(
          `
        INSERT INTO deliveries (delivery_ref, order_id, driver_id, delivery_address, status, assigned_at, created_at)
        VALUES ($1,$2,$3,$4,'assigned',NOW(),NOW()) RETURNING id
      `,
          [
            `DEL-${Date.now()}`,
            req.params.id,
            driver_id,
            order.rows[0].delivery_address || order.rows[0].address,
          ],
        );
        deliveryId = del.rows[0].id;
      }

      // Log assignment
      await client.query(
        `
      INSERT INTO delivery_assignments (delivery_id, driver_id, assignment_type, assigned_by, driver_response, created_at)
      VALUES ($1,$2,$3,$4,'pending',NOW())
    `,
        // Both a fresh assignment and a reassignment are manual actions from
        // this table's perspective (deliveries_admin.js's auto-log query
        // distinguishes them from 'auto'/'system' rows, not from each other —
        // the reassign-vs-assign distinction lives in the `note` text below).
        [deliveryId, driver_id, "manual", req.user.id],
      );

      const note = reassign
        ? `Manual reassignment. Previous driver ID: ${prevDriverId || "none"} → New driver: ${d.name}. Push notification sent.`
        : `Driver assigned: ${d.name} (${d.vehicle_plate || d.vehicle_type}). Push notification sent.`;

      await logStatusChange(
        client,
        req.params.id,
        order.rows[0].status,
        "driver_assigned",
        req.user.id,
        note,
      );
      await logTrackingEvent(
        client,
        req.params.id,
        deliveryId,
        "driver_assigned",
        note,
        "admin",
        req.user.id,
      );

      await client.query("COMMIT");
      res.json({
        message: "Driver assigned",
        driver: d,
        delivery_id: deliveryId,
      });
    } catch (err) {
      await client.query("ROLLBACK");
      next(err);
    } finally {
      client.release();
    }
  },
);

// ── PATCH /api/admin/orders/:id/resolve-dispute ───────────────────
router.patch(
  "/:id/resolve-dispute",
  requireRole("superadmin", "manager", "admin"),
  validate(orderAdminSchemas.resolveDispute),
  async (req, res, next) => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const { decision, notes, refund_amount } = req.body;

      const current = await client.query("SELECT status, total, payment_ref FROM orders WHERE id=$1", [req.params.id]);
      if (!current.rows.length) {
        await client.query("ROLLBACK");
        return res.status(404).json({ message: "Order not found" });
      }
      if (current.rows[0].status !== "dispute") {
        await client.query("ROLLBACK");
        return res.status(400).json({ message: "This order is not currently disputed" });
      }
      const order = current.rows[0];

      // A dispute "refund" decision used to just write a note saying a refund
      // happened — no Monnify call, no ledger entry, nothing actually moved.
      // Only orders paid via Monnify (payment_ref set) can be auto-refunded
      // here; COD/other methods need a manual refund, so say so honestly
      // instead of claiming it was processed.
      const isRefundDecision = decision === "full_refund" || decision === "partial_refund";
      const amountToRefund = decision === "full_refund" ? parseFloat(order.total) : parseFloat(refund_amount || 0);
      let refundOutcome = null;
      if (isRefundDecision) {
        if (order.payment_ref && amountToRefund > 0) {
          try {
            const refundReference = `BF-DSP-${req.params.id}-${Date.now().toString(36).toUpperCase()}`;
            await initiateMonnifyRefund({
              transactionReference: order.payment_ref,
              refundReference,
              refundAmount: amountToRefund,
              refundReason: `Dispute resolution for order #${req.params.id}`,
              customerNote: "BemsFarms dispute refund",
            });
            await client.query("UPDATE orders SET payment_status='refund_pending', updated_at=NOW() WHERE id=$1", [req.params.id]);
            refundOutcome = "initiated";
          } catch (refundErr) {
            console.error("[Dispute Refund] Monnify refund failed:", refundErr.response?.data || refundErr.message);
            refundOutcome = "failed";
          }
        } else {
          refundOutcome = "manual";
        }
      }

      const noteMap = {
        full_refund: refundOutcome === "initiated"
          ? `Admin decision: Full refund of ₦${amountToRefund} initiated via Monnify. ${notes || ""}`
          : refundOutcome === "failed"
            ? `Admin decision: Full refund approved but the Monnify refund call failed — needs manual follow-up. ${notes || ""}`
            : `Admin decision: Full refund approved — no online payment reference on this order, process manually. ${notes || ""}`,
        partial_refund: refundOutcome === "initiated"
          ? `Admin decision: Partial refund of ₦${amountToRefund} initiated via Monnify. Notes: ${notes || ""}`
          : refundOutcome === "failed"
            ? `Admin decision: Partial refund of ₦${amountToRefund} approved but the Monnify refund call failed — needs manual follow-up. Notes: ${notes || ""}`
            : `Admin decision: Partial refund of ₦${amountToRefund} approved — no online payment reference on this order, process manually. Notes: ${notes || ""}`,
        replacement: `Admin decision: Replacement arranged. Driver to collect goods.`,
        reject: `Admin decision: Claim rejected. Reason: ${notes || ""}`,
      };

      await client.query(
        "UPDATE orders SET status='delivered', delivered_at=NOW(), updated_at=NOW() WHERE id=$1",
        [req.params.id],
      );

      await logStatusChange(
        client,
        req.params.id,
        "dispute",
        "delivered",
        req.user.id,
        noteMap[decision],
      );
      await logTrackingEvent(
        client,
        req.params.id,
        null,
        "delivered",
        noteMap[decision],
        "admin",
        req.user.id,
      );

      await client.query("COMMIT");
      res.json({ message: "Dispute resolved", refund_outcome: refundOutcome });
    } catch (err) {
      await client.query("ROLLBACK");
      next(err);
    } finally {
      client.release();
    }
  },
);

// Alias: PATCH /api/admin/orders/:id/dispute
router.patch(
  "/:id/dispute",
  requireRole("superadmin", "manager", "admin"),
  validate(orderAdminSchemas.resolveDispute),
  async (req, res, next) => {
    // Forward to resolve-dispute logic
    req.url = req.url.replace(/\/dispute$/, "/resolve-dispute");
    router.handle(req, res, next);
  }
);

// ── PATCH /api/admin/orders/:id/reschedule ───────────────────────
router.patch(
  "/:id/reschedule",
  requireRole("superadmin", "manager", "admin", "delivery_manager"),
  async (req, res, next) => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const { notes } = req.body;

      const current = await client.query(
        "SELECT status, attempts FROM orders WHERE id=$1",
        [req.params.id]
      );
      if (!current.rows.length) {
        await client.query("ROLLBACK");
        return res.status(404).json({ message: "Order not found" });
      }

      if (current.rows[0].status === "cancelled") {
        await client.query("ROLLBACK");
        return res.status(400).json({ message: "Cannot reschedule a cancelled order" });
      }

      const nextAttempts = (current.rows[0].attempts || 0) + 1;
      await client.query(
        "UPDATE orders SET status='driver_assigned', attempts=$1, updated_at=NOW() WHERE id=$2",
        [nextAttempts, req.params.id]
      );

      await logStatusChange(
        client,
        req.params.id,
        current.rows[0].status,
        "driver_assigned",
        req.user.id,
        notes || `Delivery rescheduled (attempt ${nextAttempts})`
      );

      await logTrackingEvent(
        client,
        req.params.id,
        null,
        "driver_assigned",
        notes || `Delivery rescheduled (attempt ${nextAttempts})`,
        "admin",
        req.user.id
      );

      await client.query("COMMIT");
      res.json({ message: "Delivery rescheduled", attempts: nextAttempts, status: "driver_assigned" });
    } catch (err) {
      await client.query("ROLLBACK");
      next(err);
    } finally {
      client.release();
    }
  }
);

// ── PATCH /api/admin/orders/:id/cancel ───────────────────────────
router.patch(
  "/:id/cancel",
  requireRole("superadmin", "manager", "admin", "delivery_manager"),
  async (req, res, next) => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const { reason } = req.body;

      const order = await client.query(
        "SELECT status FROM orders WHERE id=$1",
        [req.params.id],
      );
      if (!order.rows.length) {
        await client.query("ROLLBACK");
        return res.status(404).json({ message: "Order not found" });
      }
      if (["delivered", "cancelled"].includes(order.rows[0].status)) {
        await client.query("ROLLBACK");
        return res.status(400).json({ message: `Cannot cancel an order that is already ${order.rows[0].status}` });
      }

      await client.query(
        "UPDATE orders SET status='cancelled', cancel_reason=$1, cancelled_at=NOW(), updated_at=NOW() WHERE id=$2",
        [reason || null, req.params.id],
      );

      // Cancel associated delivery records
      await client.query(
        "UPDATE deliveries SET status='cancelled', updated_at=NOW() WHERE order_id=$1",
        [req.params.id],
      );

      // Cancel pending driver assignments
      await client.query(
        `UPDATE delivery_assignments da
         SET driver_response='rejected', notes='Order cancelled by admin'
         FROM deliveries d
         WHERE da.delivery_id = d.id AND d.order_id = $1 AND da.driver_response = 'pending'`,
        [req.params.id],
      );

      await restoreOrderStock(client, req.params.id);

      await logStatusChange(
        client,
        req.params.id,
        order.rows[0].status,
        "cancelled",
        req.user.id,
        reason,
      );
      await logTrackingEvent(
        client,
        req.params.id,
        null,
        "cancelled",
        `Order cancelled. Reason: ${reason || "No reason given"}.`,
        "admin",
        req.user.id,
      );

      await client.query("COMMIT");
      res.json({ message: "Order cancelled" });
    } catch (err) {
      await client.query("ROLLBACK");
      next(err);
    } finally {
      client.release();
    }
  },
);


module.exports = router;
