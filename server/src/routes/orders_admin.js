// server/src/routes/orders_admin.js
// Mounted at /api/admin/orders

const express = require("express");
const router = express.Router();
const pool = require("../db/pool");
const { protect, requireRole } = require("../middleware/authMiddleware");

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
  await client.query(
    `
    INSERT INTO order_tracking_events
      (order_id, delivery_id, event_type, description, triggered_by, triggered_by_id, created_at)
    VALUES ($1,$2,$3,$4,$5,$6,NOW())
  `,
    [
      orderId,
      deliveryId || null,
      eventType,
      description,
      triggeredBy || "admin",
      triggeredById || null,
    ],
  );
}

// ── GET /api/admin/orders ─────────────────────────────────────────
router.get("/", async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search = "",
      status = "",
      channel = "",
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const params = [];
    const where = [];

    if (search) {
      params.push(`%${search}%`);
      where.push(
        `(o.id ILIKE $${params.length} OR c.name ILIKE $${params.length} OR c.phone ILIKE $${params.length} OR o.customer_name ILIKE $${params.length})`,
      );
    }
    if (status) {
      params.push(status);
      where.push(`o.status = $${params.length}`);
    }
    if (channel) {
      params.push(channel);
      where.push(`o.source = $${params.length}`);
    }

    const whereClause = where.length ? "WHERE " + where.join(" AND ") : "";

    const countRes = await pool.query(
      `SELECT COUNT(*) FROM orders o LEFT JOIN customers c ON o.customer_id = c.id ${whereClause}`,
      params,
    );

    params.push(parseInt(limit));
    params.push(offset);

    const rows = await pool.query(
      `
      SELECT
        o.id, o.total, o.status, o.source AS channel, o.payment_method,
        o.delivery_fee, o.discount_amount, o.created_at, o.notes,
        o.address, o.delivery_address,
        COALESCE(o.customer_name, c.name, 'Walk-in') AS customer_name,
        COALESCE(o.customer_phone, c.phone, '')       AS customer_phone,
        c.email AS customer_email,
        dr.name AS driver_name, dr.phone AS driver_phone,
        dr.vehicle_plate AS driver_plate,
        d.id AS delivery_id, d.status AS delivery_status,
        d.attempts, d.eta_minutes,
        (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) AS item_count
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
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
        COUNT(*) FILTER (WHERE status IN ('pending','new_order','paid')) AS new_orders,
        COUNT(*) FILTER (WHERE status IN ('processing','packed_ready','driver_assigned')) AS in_progress,
        COUNT(*) FILTER (WHERE status = 'out_for_delivery')  AS out_for_delivery,
        COUNT(*) FILTER (WHERE status = 'delivery_attempted') AS delivery_attempted,
        COUNT(*) FILTER (WHERE status = 'delivered')         AS delivered,
        COUNT(*) FILTER (WHERE status = 'dispute')           AS disputes,
        COALESCE(SUM(total) FILTER (WHERE status = 'delivered'), 0) AS revenue
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
    res.status(500).json({ message: err.message });
  }
});

// ── GET /api/admin/orders/:id ─────────────────────────────────────
router.get("/:id", async (req, res) => {
  try {
    const order = await pool.query(
      `
      SELECT
        o.*,
        COALESCE(o.customer_name, c.name, 'Walk-in') AS customer_name,
        COALESCE(o.customer_phone, c.phone, '')       AS customer_phone,
        c.email AS customer_email,
        dr.name AS driver_name, dr.phone AS driver_phone,
        dr.vehicle_plate AS driver_plate, dr.vehicle_type,
        d.id AS delivery_id, d.status AS delivery_status,
        d.attempts, d.eta_minutes, d.dispatched_at, d.delivered_at
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      LEFT JOIN drivers dr ON o.driver_id = dr.id
      LEFT JOIN deliveries d ON d.order_id = o.id
      WHERE o.id = $1
    `,
      [req.params.id],
    );

    if (!order.rows.length)
      return res.status(404).json({ message: "Order not found" });

    const items = await pool.query(
      `
      SELECT
        oi.*,
        COALESCE(oi.product_name, p.name) AS name,
        COALESCE(oi.sku, p.sku) AS sku,
        p.image_url,
        COALESCE(oi.unit_price, oi.price) AS unit_price,
        COALESCE(oi.subtotal, oi.quantity * oi.price) AS subtotal
      FROM order_items oi
      LEFT JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = $1
    `,
      [req.params.id],
    );

    const timeline = await pool.query(
      `
      SELECT * FROM order_status_history
      WHERE order_id = $1
      ORDER BY created_at ASC
    `,
      [req.params.id],
    );

    const tracking = await pool.query(
      `
      SELECT * FROM order_tracking_events
      WHERE order_id = $1
      ORDER BY created_at ASC
    `,
      [req.params.id],
    );

    res.json({
      ...order.rows[0],
      items: items.rows,
      timeline: timeline.rows,
      tracking: tracking.rows,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── PATCH /api/admin/orders/:id/status ───────────────────────────
// Generic status update with timeline logging
router.patch(
  "/:id/status",
  requireRole("superadmin", "manager", "admin", "delivery_manager"),
  async (req, res) => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const { status, notes, picking_staff } = req.body;

      const current = await client.query(
        "SELECT status FROM orders WHERE id=$1",
        [req.params.id],
      );
      if (!current.rows.length)
        return res.status(404).json({ message: "Order not found" });

      const fromStatus = current.rows[0].status;

      await client.query(
        "UPDATE orders SET status=$1, updated_at=NOW() WHERE id=$2",
        [status, req.params.id],
      );

      await logStatusChange(
        client,
        req.params.id,
        fromStatus,
        status,
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

      const ev = eventMap[status];
      if (ev) {
        await logTrackingEvent(
          client,
          req.params.id,
          null,
          ev.type,
          ev.desc,
          "admin",
          req.user.id,
        );
      }

      await client.query("COMMIT");
      res.json({ message: "Status updated", status });
    } catch (err) {
      await client.query("ROLLBACK");
      res.status(500).json({ message: err.message });
    } finally {
      client.release();
    }
  },
);

// ── PATCH /api/admin/orders/:id/assign-driver ─────────────────────
router.patch(
  "/:id/assign-driver",
  requireRole("superadmin", "manager", "admin", "delivery_manager"),
  async (req, res) => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const { driver_id, reassign = false } = req.body;

      if (!driver_id)
        return res.status(400).json({ message: "driver_id required" });

      const order = await client.query("SELECT * FROM orders WHERE id=$1", [
        req.params.id,
      ]);
      if (!order.rows.length)
        return res.status(404).json({ message: "Order not found" });

      const driver = await client.query("SELECT * FROM drivers WHERE id=$1", [
        driver_id,
      ]);
      if (!driver.rows.length)
        return res.status(404).json({ message: "Driver not found" });

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
        [deliveryId, driver_id, reassign ? "manual" : "manual", req.user.id],
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
      res.status(500).json({ message: err.message });
    } finally {
      client.release();
    }
  },
);

// ── PATCH /api/admin/orders/:id/resolve-dispute ───────────────────
router.patch(
  "/:id/resolve-dispute",
  requireRole("superadmin", "manager", "admin"),
  async (req, res) => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const { decision, notes, refund_amount } = req.body;

      if (!decision)
        return res.status(400).json({ message: "decision required" });

      const noteMap = {
        full_refund: `Admin decision: Full refund processed. ${notes || ""}`,
        partial_refund: `Admin decision: Partial refund of ₦${refund_amount || 0}. Notes: ${notes || ""}`,
        replacement: `Admin decision: Replacement arranged. Driver to collect goods.`,
        reject: `Admin decision: Claim rejected. Reason: ${notes || ""}`,
      };

      await client.query(
        "UPDATE orders SET status='delivered', updated_at=NOW() WHERE id=$1",
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
      res.json({ message: "Dispute resolved" });
    } catch (err) {
      await client.query("ROLLBACK");
      res.status(500).json({ message: err.message });
    } finally {
      client.release();
    }
  },
);

// ── PATCH /api/admin/orders/:id/cancel ───────────────────────────
router.patch(
  "/:id/cancel",
  requireRole("superadmin", "manager", "admin", "delivery_manager"),
  async (req, res) => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const { reason } = req.body;

      const order = await client.query(
        "SELECT status FROM orders WHERE id=$1",
        [req.params.id],
      );
      if (!order.rows.length)
        return res.status(404).json({ message: "Order not found" });

      await client.query(
        "UPDATE orders SET status='cancelled', cancel_reason=$1, cancelled_at=NOW(), updated_at=NOW() WHERE id=$2",
        [reason || null, req.params.id],
      );

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
        `Order cancelled. Reason: ${reason || "No reason given"}. Refund triggered.`,
        "admin",
        req.user.id,
      );

      await client.query("COMMIT");
      res.json({ message: "Order cancelled" });
    } catch (err) {
      await client.query("ROLLBACK");
      res.status(500).json({ message: err.message });
    } finally {
      client.release();
    }
  },
);

// ── GET /api/admin/orders/form-data/drivers ───────────────────────
// Returns available drivers for the assign modal
router.get("/form-data/drivers", async (req, res) => {
  try {
    const rows = await pool.query(`
      SELECT id, name, phone, vehicle_plate, vehicle_type, status,
        COALESCE(is_available, true) AS is_available
      FROM drivers
      WHERE status IN ('active','on_delivery')
      ORDER BY name
    `);
    res.json({ drivers: rows.rows });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── DELETE /api/admin/orders/:id  (superadmin only) ──────────────
router.delete("/:id", requireRole("superadmin"), async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const order = await client.query(
      "SELECT id, status FROM orders WHERE id=$1",
      [req.params.id]
    );
    if (!order.rows.length)
      return res.status(404).json({ message: "Order not found" });

    // Remove child rows before deleting the parent
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
    res.status(500).json({ message: err.message });
  } finally {
    client.release();
  }
});

module.exports = router;
