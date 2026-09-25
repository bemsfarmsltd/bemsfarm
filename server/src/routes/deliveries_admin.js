const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const pool = require("../db/pool");
const { protect, requireRole } = require("../middleware/authMiddleware");
const validate = require("../middleware/validate");
const deliveryAdminSchemas = require("../schemas/deliveryAdminSchemas");
const { restoreOrderStock } = require("../utils/orderStock");
const {
  sendDriverInvitationEmail,
  sendDriverApprovedEmail,
  sendDriverRejectionEmail,
} = require("../services/emailService");

router.use(protect);

// delivery_zones.zone_id is a text PK ("ZONE001", ...), not an auto-increment
// column, so inserts must generate the next one themselves.
async function nextZoneId(client) {
  const row = await client.query(
    `SELECT COALESCE(MAX(CAST(SUBSTRING(zone_id FROM 5) AS INTEGER)), 0) + 1 AS n
     FROM delivery_zones WHERE zone_id ~ '^ZONE[0-9]+$'`
  );
  return `ZONE${String(row.rows[0].n).padStart(3, "0")}`;
}

// ── GET /api/admin/deliveries/active ─────────────────────────────
router.get("/active", requireRole("superadmin", "manager", "admin", "delivery_manager"), async (req, res, next) => {
  try {
    const { search = "", status = "" } = req.query;
    const params = [];
    const where = ["d.status NOT IN ('delivered','cancelled')", "d.driver_id IS NOT NULL"];

    if (status) {
      params.push(status);
      where.push(`d.status = $${params.length}`);
    }
    if (search) {
      params.push(`%${search}%`);
      where.push(
        `(d.delivery_ref ILIKE $${params.length} OR o.id::text ILIKE $${params.length} OR COALESCE(o.customer_name,c.name,'') ILIKE $${params.length} OR dr.name ILIKE $${params.length})`,
      );
    }

    const rows = await pool.query(
      `
      SELECT
        d.id, d.delivery_ref, d.status, d.attempts,
        d.eta_minutes, d.assigned_at, d.dispatched_at,
        COALESCE(NULLIF(d.delivery_address, ''), NULLIF(o.address, ''), '—') AS delivery_address,
        o.id AS order_id, o.total AS order_total, o.notes, o.source AS order_source,
        o.payment_method, o.payment_status, o.delivery_fee, o.created_at AS order_created_at,
        COALESCE(
          NULLIF(o.customer_name, ''),
          NULLIF(c.name, ''),
          'Customer'
        ) AS customer_name,
        COALESCE(NULLIF(o.customer_phone, ''), NULLIF(c.phone, ''), '—') AS customer_phone,
        COALESCE(NULLIF(c.email, ''), '—') AS customer_email,
        dr.id AS driver_id, dr.name AS driver_name,
        dr.phone AS driver_phone, dr.vehicle_plate AS driver_plate,
        dr.vehicle_type,
        dz.zone_name AS zone,
        dl.latitude AS driver_lat, dl.longitude AS driver_lng, dl.heading AS driver_heading,
        dl.speed AS driver_speed, dl.recorded_at AS driver_last_ping,
        (SELECT JSON_AGG(JSON_BUILD_OBJECT(
            'id', oi.id,
            'name', COALESCE(oi.product_name, p.name, 'Farm Produce Item'),
            'qty', oi.quantity || ' ' || COALESCE(p.unit, 'pcs'),
            'quantity', oi.quantity,
            'unit', COALESCE(p.unit, 'pcs'),
            'price', COALESCE(oi.price, 0)
          ))
          FROM order_items oi LEFT JOIN products p ON oi.product_id = p.id
          WHERE oi.order_id = o.id
        ) AS items
      FROM deliveries d
      JOIN orders o ON (d.order_id = o.id::text OR d.order_id = o.order_ref)
      LEFT JOIN users c ON (c.id = o.user_id OR c.id = o.customer_id)
      LEFT JOIN drivers dr ON d.driver_id = dr.id
      LEFT JOIN delivery_zones dz ON d.zone_id = dz.zone_id
      LEFT JOIN LATERAL (
        SELECT latitude, longitude, heading, speed, recorded_at 
        FROM driver_locations 
        WHERE driver_id = dr.id 
        ORDER BY recorded_at DESC 
        LIMIT 1
      ) dl ON true
      WHERE ${where.join(" AND ")}
      ORDER BY d.assigned_at DESC
    `,
      params,
    );

    // Stats
    const stats = await pool.query(`
      SELECT
        COUNT(*)                                              AS total,
        COUNT(*) FILTER (WHERE status = 'out_for_delivery')  AS en_route,
        COUNT(*) FILTER (WHERE status IN ('assigned', 'awaiting_pickup')) AS awaiting,
        COUNT(*) FILTER (WHERE status = 'delivery_attempted') AS attempted
      FROM deliveries
      WHERE status NOT IN ('delivered','cancelled')
        AND driver_id IS NOT NULL
    `);

    res.json({ deliveries: rows.rows, stats: stats.rows[0] });
  } catch (err) {
    console.error("GET /admin/deliveries/active:", err.message);
    next(err);
  }
});

// ── GET /api/admin/deliveries/auto-log ───────────────────────────
router.get("/auto-log", requireRole("superadmin", "manager", "admin", "delivery_manager"), async (req, res, next) => {
  try {
    const rows = await pool.query(`
      SELECT
        da.id, da.assignment_type, da.created_at,
        da.driver_response,
        o.id AS order_id, o.status AS order_status,
        COALESCE(o.customer_name, c.name) AS customer_name,
        dz.zone_name AS zone,
        dr.name AS driver_name, dr.vehicle_plate AS driver_plate,
        ov.overridden_by_name, ov.override_note
      FROM delivery_assignments da
      JOIN deliveries d ON da.delivery_id = d.id
      JOIN orders o ON (d.order_id = o.id::text OR d.order_id = o.order_ref)
      LEFT JOIN users c ON (c.id = o.user_id OR c.id = o.customer_id)
      LEFT JOIN drivers dr ON da.driver_id = dr.id
      LEFT JOIN delivery_zones dz ON d.zone_id = dz.zone_id
      LEFT JOIN (
        SELECT delivery_id,
          u.name AS overridden_by_name,
          da2.override_note
        FROM delivery_assignments da2
        JOIN users u ON da2.assigned_by = u.id
        WHERE da2.assignment_type = 'manual'
      ) ov ON ov.delivery_id = da.delivery_id
      WHERE da.assignment_type IN ('auto','system')
      ORDER BY da.created_at DESC
      LIMIT 50
    `);
    res.json({ log: rows.rows });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/admin/deliveries/automap-telemetry ───────────────────
// Comprehensive real-time auto-dispatch operations telemetry, stats & audit stream
router.get("/automap-telemetry", requireRole("superadmin", "manager", "admin", "delivery_manager"), async (req, res, next) => {
  try {
    const { status, driver_id, search, limit = 50, page = 1 } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
    const offset = (pageNum - 1) * limitNum;

    // 1. Calculate overall dispatch KPIs
    const kpiRes = await pool.query(`
      SELECT
        COUNT(*) AS total_assignments,
        COUNT(CASE WHEN da.driver_response = 'accepted' THEN 1 END) AS accepted_count,
        COUNT(CASE WHEN da.driver_response = 'rejected' THEN 1 END) AS rejected_count,
        COUNT(CASE WHEN da.driver_response = 'timed_out' THEN 1 END) AS timed_out_count,
        COUNT(CASE WHEN da.driver_response = 'pending' OR da.driver_response IS NULL THEN 1 END) AS pending_count,
        COUNT(CASE WHEN da.assignment_type = 'manual' THEN 1 END) AS manual_count,
        COUNT(CASE WHEN da.assignment_type IN ('auto', 'system') THEN 1 END) AS auto_count,
        ROUND(AVG(CASE WHEN da.response_at IS NOT NULL AND da.response_at >= da.created_at THEN EXTRACT(EPOCH FROM (da.response_at - da.created_at)) END)) AS avg_response_seconds
      FROM delivery_assignments da
    `);

    const rawKpis = kpiRes.rows[0] || {};
    const totalAssignments = parseInt(rawKpis.total_assignments, 10) || 0;
    const acceptedCount = parseInt(rawKpis.accepted_count, 10) || 0;
    const rejectedCount = parseInt(rawKpis.rejected_count, 10) || 0;
    const timedOutCount = parseInt(rawKpis.timed_out_count, 10) || 0;
    const pendingCount = parseInt(rawKpis.pending_count, 10) || 0;
    const autoCount = parseInt(rawKpis.auto_count, 10) || 0;
    const manualCount = parseInt(rawKpis.manual_count, 10) || 0;
    const avgResponseSeconds = parseInt(rawKpis.avg_response_seconds, 10) || 0;
    const acceptanceRate = totalAssignments > 0 ? parseFloat(((acceptedCount / totalAssignments) * 100).toFixed(1)) : 0;

    // 2. Build filtered log stream query
    let whereClauses = [];
    let params = [];

    if (status && status !== "all") {
      params.push(status);
      whereClauses.push(`da.driver_response = $${params.length}`);
    }

    if (driver_id) {
      params.push(parseInt(driver_id, 10));
      whereClauses.push(`da.driver_id = $${params.length}`);
    }

    if (search && search.trim()) {
      params.push(`%${search.trim()}%`);
      whereClauses.push(`(
        o.id::text ILIKE $${params.length} 
        OR o.order_ref ILIKE $${params.length} 
        OR d.delivery_ref ILIKE $${params.length} 
        OR dr.name ILIKE $${params.length} 
        OR dr.phone ILIKE $${params.length}
        OR COALESCE(o.customer_name, u.name) ILIKE $${params.length}
      )`);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

    const countQuery = `
      SELECT COUNT(*) AS total
      FROM delivery_assignments da
      JOIN deliveries d ON da.delivery_id = d.id
      JOIN orders o ON (d.order_id = o.id::text OR d.order_id = o.order_ref)
      LEFT JOIN users u ON (o.user_id = u.id OR o.customer_id = u.id)
      LEFT JOIN drivers dr ON da.driver_id = dr.id
      ${whereSql}
    `;
    const countRes = await pool.query(countQuery, params);
    const totalRecords = parseInt(countRes.rows[0]?.total, 10) || 0;

    // 3. Fetch paginated records
    const fetchParams = [...params, limitNum, offset];
    const dataQuery = `
      SELECT
        da.id AS assignment_id,
        da.delivery_id,
        da.driver_id,
        da.assignment_type,
        COALESCE(da.driver_response, 'pending') AS driver_response,
        da.response_at,
        da.rejection_reason,
        da.override_note,
        da.created_at AS assigned_at,
        CASE 
          WHEN da.response_at IS NOT NULL AND da.response_at >= da.created_at THEN 
            ROUND(EXTRACT(EPOCH FROM (da.response_at - da.created_at)))
          ELSE NULL
        END AS response_duration_seconds,
        d.status AS delivery_status,
        d.delivery_ref,
        d.eta_minutes,
        COALESCE(d.delivery_address, o.address) AS delivery_address,
        o.id AS order_id,
        COALESCE(o.order_ref, o.id::text) AS order_ref,
        o.status AS order_status,
        o.total AS order_total,
        o.payment_method,
        o.payment_status,
        COALESCE(o.customer_name, u.name, 'Customer') AS customer_name,
        COALESCE(o.customer_phone, u.phone, '') AS customer_phone,
        dr.name AS driver_name,
        dr.phone AS driver_phone,
        dr.vehicle_type,
        dr.vehicle_plate,
        dr.avatar_url AS driver_avatar,
        dr.rating AS driver_rating,
        dz.zone_name,
        ov.name AS assigned_by_name
      FROM delivery_assignments da
      JOIN deliveries d ON da.delivery_id = d.id
      JOIN orders o ON (d.order_id = o.id::text OR d.order_id = o.order_ref)
      LEFT JOIN users u ON (o.user_id = u.id OR o.customer_id = u.id)
      LEFT JOIN drivers dr ON da.driver_id = dr.id
      LEFT JOIN delivery_zones dz ON d.zone_id = dz.zone_id
      LEFT JOIN users ov ON da.assigned_by = ov.id
      ${whereSql}
      ORDER BY da.created_at DESC
      LIMIT $${fetchParams.length - 1} OFFSET $${fetchParams.length}
    `;

    const dataRes = await pool.query(dataQuery, fetchParams);

    res.json({
      success: true,
      kpis: {
        total_assignments: totalAssignments,
        auto_count: autoCount,
        manual_count: manualCount,
        accepted_count: acceptedCount,
        rejected_count: rejectedCount,
        timed_out_count: timedOutCount,
        pending_count: pendingCount,
        acceptance_rate: acceptanceRate,
        avg_response_seconds: avgResponseSeconds,
      },
      pagination: {
        page: pageNum,
        limit: limitNum,
        total_records: totalRecords,
        total_pages: Math.ceil(totalRecords / limitNum) || 1,
      },
      records: dataRes.rows.map(r => ({
        ...r,
        assignment_id: parseInt(r.assignment_id, 10),
        delivery_id: parseInt(r.delivery_id, 10),
        driver_id: r.driver_id ? parseInt(r.driver_id, 10) : null,
        order_total: parseFloat(r.order_total) || 0,
        response_duration_seconds: r.response_duration_seconds !== null ? parseInt(r.response_duration_seconds, 10) : null,
      })),
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/admin/deliveries/:id/dispatch-history ────────────────
// Fetch the complete multi-attempt dispatch cascade history for an order
router.get("/:id/dispatch-history", requireRole("superadmin", "manager", "admin", "delivery_manager"), async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `
      SELECT
        da.id AS assignment_id,
        da.delivery_id,
        da.driver_id,
        da.assignment_type,
        COALESCE(da.driver_response, 'pending') AS driver_response,
        da.response_at,
        da.rejection_reason,
        da.override_note,
        da.created_at AS assigned_at,
        CASE 
          WHEN da.response_at IS NOT NULL AND da.response_at >= da.created_at THEN 
            ROUND(EXTRACT(EPOCH FROM (da.response_at - da.created_at)))
          ELSE NULL
        END AS response_duration_seconds,
        dr.name AS driver_name,
        dr.phone AS driver_phone,
        dr.vehicle_type,
        dr.vehicle_plate,
        dr.avatar_url AS driver_avatar,
        dr.rating AS driver_rating,
        ov.name AS assigned_by_name
      FROM delivery_assignments da
      LEFT JOIN drivers dr ON da.driver_id = dr.id
      LEFT JOIN users ov ON da.assigned_by = ov.id
      WHERE da.delivery_id = $1::bigint OR da.delivery_id IN (
        SELECT id FROM deliveries WHERE order_id = $1::text OR delivery_ref = $1::text
      )
      ORDER BY da.created_at ASC
      `,
      [id]
    );

    res.json({
      success: true,
      attempts_count: result.rows.length,
      history: result.rows.map(r => ({
        ...r,
        assignment_id: parseInt(r.assignment_id, 10),
        delivery_id: parseInt(r.delivery_id, 10),
        driver_id: r.driver_id ? parseInt(r.driver_id, 10) : null,
        response_duration_seconds: r.response_duration_seconds !== null ? parseInt(r.response_duration_seconds, 10) : null,
      })),
    });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/admin/deliveries/:id/re-dispatch ────────────────────
// Trigger proximity re-dispatch for an order
router.post("/:id/re-dispatch", requireRole("superadmin", "manager", "admin", "delivery_manager"), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { autoAssignClosestDriver } = require("../services/dispatchEngine");

    const delRes = await pool.query(
      `SELECT d.id, d.order_id, d.status 
       FROM deliveries d 
       WHERE d.id::text = $1 OR d.order_id = $1 OR d.delivery_ref = $1 
       LIMIT 1`,
      [id]
    );

    if (!delRes.rows.length) {
      return res.status(404).json({ message: "Delivery not found for re-dispatch" });
    }

    const delivery = delRes.rows[0];
    const result = await autoAssignClosestDriver(delivery.id);

    res.json({
      success: result.success,
      message: result.success 
        ? `Re-dispatch successful: Assigned to ${result.driver?.name} (${result.driver?.distanceKm} km away)` 
        : `Re-dispatch notice: ${result.message}`,
      ...result,
    });
  } catch (err) {
    next(err);
  }
});

// ── PATCH /api/admin/deliveries/:id/status ────────────────────────
router.patch(
  "/:id/status",
  requireRole("superadmin", "manager", "admin", "delivery_manager"),
  validate(deliveryAdminSchemas.updateStatus),
  async (req, res, next) => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const { status, notes } = req.body;

      const del = await client.query("SELECT * FROM deliveries WHERE id=$1", [
        req.params.id,
      ]);
      if (!del.rows.length) {
        await client.query("ROLLBACK");
        return res.status(404).json({ message: "Delivery not found" });
      }

      const currentStatus = del.rows[0].status;
      const validTransitions = {
        pending: ["assigned", "cancelled"],
        assigned: ["en_route", "cancelled"],
        en_route: ["delivery_attempted", "delivered", "cancelled"],
        delivery_attempted: ["en_route", "delivered", "cancelled"],
        delivered: [], // Terminal state
        cancelled: []  // Terminal state
      };

      if (validTransitions[currentStatus] && !validTransitions[currentStatus].includes(status)) {
        await client.query("ROLLBACK");
        return res.status(400).json({ message: `Invalid state transition from ${currentStatus} to ${status}` });
      }

      await client.query(
        `UPDATE deliveries SET status=$1, updated_at=NOW()
       ${status === "en_route" ? ", dispatched_at=NOW()" : ""}
       ${status === "delivered" ? ", delivered_at=NOW()" : ""}
       WHERE id=$2`,
        [status, req.params.id],
      );

      // Mirror status on order — awaiting_pickup/en_route are delivery-level
      // states that don't have exact 1:1 order-status names, so they map to
      // the closest existing order status instead of being dropped silently.
      const orderStatus = {
        assigned: "driver_assigned",
        awaiting_pickup: "driver_assigned",
        en_route: "out_for_delivery",
        delivery_attempted: "delivery_attempted",
        delivered: "delivered",
        cancelled: "cancelled",
      }[status];

      if (orderStatus) {
        const prevOrder = await client.query(
          "SELECT status FROM orders WHERE id=$1",
          [del.rows[0].order_id],
        );
        await client.query(
          "UPDATE orders SET status=$1, delivered_at = CASE WHEN $1 = 'delivered' THEN NOW() ELSE delivered_at END, updated_at=NOW() WHERE id=$2",
          [orderStatus, del.rows[0].order_id],
        );
        await client.query(
          `
        INSERT INTO order_status_history (order_id, to_status, changed_by, notes, created_at)
        VALUES ($1,$2,$3,$4,NOW())
      `,
          [del.rows[0].order_id, orderStatus, req.user.id, notes || null],
        );
        // Cancelling a delivery mirrors 'cancelled' onto its order — restore
        // the stock that was deducted at order creation, same as every other
        // order-cancellation path. Guard against double-restoring if the
        // order was already cancelled.
        if (orderStatus === "cancelled" && prevOrder.rows[0]?.status !== "cancelled") {
          await restoreOrderStock(client, del.rows[0].order_id);
        }
      }

      // Log tracking event
      await client.query(
        `
      INSERT INTO order_tracking_events
        (order_id, event_type, description, actor_type, actor_id, created_at)
      VALUES ($1,$2,$3,'admin',$4,NOW())
    `,
        [
          del.rows[0].order_id,
          status,
          notes || status,
          req.user.id,
        ],
      );

      await client.query("COMMIT");
      res.json({ message: "Delivery status updated" });
    } catch (err) {
      await client.query("ROLLBACK");
      next(err);
    } finally {
      client.release();
    }
  },
);

// ── PATCH /api/admin/deliveries/:id/reassign ─────────────────────
router.patch(
  "/:id/reassign",
  requireRole("superadmin", "manager", "admin", "delivery_manager"),
  validate(deliveryAdminSchemas.reassign),
  async (req, res, next) => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const { driver_id, note } = req.body;

      const del = await client.query("SELECT * FROM deliveries WHERE id=$1", [
        req.params.id,
      ]);
      const driver = await client.query("SELECT * FROM drivers WHERE id=$1", [
        driver_id,
      ]);
      if (!del.rows.length) {
        await client.query("ROLLBACK");
        return res.status(404).json({ message: "Delivery not found" });
      }
      if (!driver.rows.length) {
        await client.query("ROLLBACK");
        return res.status(404).json({ message: "Driver not found" });
      }

      const d = driver.rows[0];

      await client.query(
        "UPDATE deliveries SET driver_id=$1, status='awaiting_pickup', accepted_at=NULL, assigned_at=NOW(), updated_at=NOW() WHERE id=$2",
        [driver_id, req.params.id],
      );
      await client.query(
        "UPDATE orders SET driver_id=$1, status='awaiting_pickup', tracking_status='driver_assigned', updated_at=NOW() WHERE id=$2",
        [driver_id, del.rows[0].order_id],
      );

      // Log manual reassignment
      await client.query(
        `
      INSERT INTO delivery_assignments
        (delivery_id, driver_id, assignment_type, assigned_by, override_note, driver_response, created_at)
      VALUES ($1,$2,'manual',$3,$4,'pending',NOW())
    `,
        [
          req.params.id,
          driver_id,
          req.user.id,
          note || `Manual reassignment to ${d.name}`,
        ],
      );

      await client.query(
        `
      INSERT INTO order_tracking_events
        (order_id, event_type, description, actor_type, actor_id, created_at)
      VALUES ($1,'driver_assigned',$2,'admin',$3,NOW())
    `,
        [
          del.rows[0].order_id,
          `Driver reassigned to: ${d.name} (${d.vehicle_plate}). ${note || ""}`,
          req.user.id,
        ],
      );

      await client.query("COMMIT");
      res.json({ message: "Driver reassigned", driver: d });
    } catch (err) {
      await client.query("ROLLBACK");
      next(err);
    } finally {
      client.release();
    }
  },
);

// ── PATCH /api/admin/deliveries/:id/attempt ──────────────────────
router.patch(
  "/:id/attempt",
  requireRole("superadmin", "manager", "admin", "delivery_manager"),
  validate(deliveryAdminSchemas.attempt),
  async (req, res, next) => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const { notes } = req.body;

      const del = await client.query("SELECT * FROM deliveries WHERE id=$1", [
        req.params.id,
      ]);
      if (!del.rows.length) {
        await client.query("ROLLBACK");
        return res.status(404).json({ message: "Delivery not found" });
      }

      const newAttempts = (del.rows[0].attempts || 0) + 1;

      await client.query(
        "UPDATE deliveries SET status='delivery_attempted', attempts=$1, updated_at=NOW() WHERE id=$2",
        [newAttempts, req.params.id],
      );
      await client.query(
        "UPDATE orders SET status='delivery_attempted', updated_at=NOW() WHERE id=$1",
        [del.rows[0].order_id],
      );
      await client.query(
        `
      INSERT INTO order_tracking_events
        (order_id, event_type, description, actor_type, actor_id, created_at)
      VALUES ($1,'delivery_attempted',$2,'admin',$3,NOW())
    `,
        [
          del.rows[0].order_id,
          notes ||
            `Delivery attempted. Customer unavailable. Attempt ${newAttempts}/2.`,
          req.user.id,
        ],
      );

      await client.query("COMMIT");
      res.json({ message: "Attempt logged", attempts: newAttempts });
    } catch (err) {
      await client.query("ROLLBACK");
      next(err);
    } finally {
      client.release();
    }
  },
);

// ── GET /api/admin/deliveries/drivers ────────────────────────────
router.get("/drivers", requireRole("superadmin", "manager", "admin", "delivery_manager", "cashier"), async (req, res, next) => {
  try {
    const { search = "", status = "" } = req.query;
    const params = [];
    const where = [];

    if (status) {
      if (status === "active") {
        where.push(`dr.status = 'active' AND COALESCE(da.is_available, dr.is_available, false) = true AND COALESCE(da.is_on_delivery, false) = false`);
      } else if (status === "off_duty") {
        where.push(`(COALESCE(da.is_available, dr.is_available, false) = false OR dr.status = 'off_duty') AND dr.status NOT IN ('suspended', 'pending')`);
      } else if (status === "on_delivery") {
        where.push(`COALESCE(da.is_on_delivery, false) = true`);
      } else {
        params.push(status);
        where.push(`dr.status = $${params.length}`);
      }
    }
    if (search) {
      params.push(`%${search}%`);
      where.push(
        `(dr.name ILIKE $${params.length} OR dr.phone ILIKE $${params.length} OR dz.zone_name ILIKE $${params.length})`,
      );
    }

    const whereClause = where.length ? "WHERE " + where.join(" AND ") : "";

    const rows = await pool.query(
      `
      SELECT
        dr.*,
        COALESCE(da.is_available, dr.is_available, false) AS is_available,
        COALESCE(da.is_on_delivery, false) AS is_on_delivery,
        GREATEST(dr.last_location_at, da.last_ping_at, dr.last_toggled_at, da.last_toggled_at) AS last_telemetry_at,
        true AS is_telemetry_fresh,
        CASE
          WHEN dr.status = 'suspended' THEN 'suspended'
          WHEN dr.status = 'pending' OR dr.onboarding_status = 'pending_verification' OR dr.onboarding_status = 'documents_submitted' THEN 'pending'
          WHEN COALESCE(da.is_on_delivery, false) = true THEN 'on_delivery'
          WHEN COALESCE(da.is_available, dr.is_available, false) = true THEN 'active'
          ELSE 'off_duty'
        END AS status,
        dr.primary_zone_id AS zone_id,
        dz.zone_name AS zone,
        COUNT(DISTINCT d.id) FILTER (WHERE d.status = 'delivered') AS total_deliveries,
        COUNT(DISTINCT d.id)                                       AS total_assigned,
        COALESCE(AVG(df.rating), 0)                                AS rating,
        COALESCE(dr.total_earnings, 0)                              AS earnings,
        (SELECT o.id FROM deliveries d2
         JOIN orders o ON d2.order_id = o.id
         WHERE d2.driver_id = dr.id AND d2.status NOT IN ('delivered','cancelled')
         LIMIT 1)                                                   AS current_order,
        (
          SELECT COALESCE(
            JSON_AGG(
              JSON_BUILD_OBJECT(
                'id', dba.id,
                'bank_name', dba.bank_name,
                'bank_code', dba.bank_code,
                'account_number', dba.account_number,
                'account_name', dba.account_name,
                'is_default', COALESCE(dba.is_default, false),
                'is_verified', COALESCE(dba.is_verified, false),
                'created_at', dba.created_at
              ) ORDER BY dba.is_default DESC, dba.id DESC
            ),
            '[]'::json
          )
          FROM driver_bank_accounts dba
          WHERE dba.driver_id = dr.id
        ) AS bank_accounts
      FROM drivers dr
      LEFT JOIN driver_availability da ON dr.id = da.driver_id
      LEFT JOIN delivery_zones dz ON dr.primary_zone_id = dz.zone_id
      LEFT JOIN deliveries d ON d.driver_id = dr.id
      LEFT JOIN driver_feedback df ON df.driver_id = dr.id
      ${whereClause}
      GROUP BY dr.id, da.is_available, da.is_on_delivery, da.last_ping_at, da.last_toggled_at, dz.zone_name
      ORDER BY 
        CASE 
          WHEN dr.status = 'pending' OR dr.onboarding_status IN ('pending_verification','documents_submitted') THEN 0 
          WHEN COALESCE(da.is_available, false) = true THEN 1
          ELSE 2 
        END,
        dr.name ASC
    `,
      params,
    );

    const stats = await pool.query(`
      SELECT
        COUNT(*)                                                                                     AS total,
        COUNT(*) FILTER (WHERE status = 'suspended')                                                 AS suspended,
        COUNT(*) FILTER (WHERE status = 'pending' OR onboarding_status IN ('pending_verification','documents_submitted')) AS pending_compliance,
        COUNT(*) FILTER (WHERE status = 'active' AND id IN (SELECT driver_id FROM driver_availability WHERE is_on_delivery = true)) AS on_delivery,
        COUNT(*) FILTER (
          WHERE status = 'active' 
          AND id IN (
            SELECT da.driver_id 
            FROM driver_availability da 
            WHERE da.is_available = true AND da.is_on_delivery = false
          )
        ) AS active,
        0 AS no_signal,
        COUNT(*) FILTER (WHERE status = 'active' AND id NOT IN (SELECT driver_id FROM driver_availability WHERE is_available = true)) AS off_duty
      FROM drivers
    `);

    res.json({ drivers: rows.rows, stats: stats.rows[0] });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/admin/deliveries/drivers/invite ────────────────────
router.post(
  "/drivers/invite",
  requireRole("superadmin", "manager", "admin", "delivery_manager"),
  async (req, res, next) => {
    const client = await pool.connect();
    try {
      const {
        name,
        email,
        phone,
        vehicle_type = "motorcycle",
        vehicle_plate,
        zone_id,
        commission_per_delivery = 500,
        notes,
      } = req.body;

      if (!name || !email || !phone) {
        return res.status(400).json({ message: "Full Name, Email Address, and Phone Number are required to send an onboarding invitation." });
      }

      await client.query("BEGIN");

      // Check if driver with same email or phone already exists
      const existing = await client.query(
        "SELECT id, email, phone, onboarding_status FROM drivers WHERE LOWER(email) = LOWER($1) OR phone = $2",
        [email.trim(), phone.trim()]
      );

      if (existing.rows.length > 0) {
        await client.query("ROLLBACK");
        return res.status(400).json({
          message: `A driver with this ${existing.rows[0].email.toLowerCase() === email.trim().toLowerCase() ? "email" : "phone number"} already exists (Status: ${existing.rows[0].onboarding_status || "Registered"}).`,
        });
      }

      const inviteToken = crypto.randomBytes(32).toString("hex");
      const inviteExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
      const tempPin = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit PIN
      const hashedPin = await bcrypt.hash(tempPin, 10);

      const insertRes = await client.query(
        `
        INSERT INTO drivers (
          name, email, phone, vehicle_type, vehicle_plate, primary_zone_id,
          commission_per_delivery, status, onboarding_status, invite_token,
          invite_expires_at, notes, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'inactive', 'invited', $8, $9, $10, NOW(), NOW())
        RETURNING *
        `,
        [
          name.trim(),
          email.trim().toLowerCase(),
          phone.trim(),
          vehicle_type,
          vehicle_plate || null,
          zone_id || null,
          commission_per_delivery,
          inviteToken,
          inviteExpires,
          notes || null,
        ]
      );

      const driver = insertRes.rows[0];

      // Auto-assign dedicated virtual wallet account number
      const walletAccount = '855' + String(driver.id).padStart(7, '0');
      const walletAccountName = `BEMS - ${driver.name.toUpperCase()}`;
      await client.query(
        `UPDATE drivers SET wallet_account_number = $1, wallet_bank_name = 'Monnify / Wema Bank', wallet_account_name = $2 WHERE id = $3`,
        [walletAccount, walletAccountName, driver.id]
      );
      driver.wallet_account_number = walletAccount;
      driver.wallet_bank_name = 'Monnify / Wema Bank';
      driver.wallet_account_name = walletAccountName;

      // Save initial PIN in driver_auth
      await client.query(
        `
        INSERT INTO driver_auth (driver_id, password_hash, created_at)
        VALUES ($1, $2, NOW())
        ON CONFLICT (driver_id)
        DO UPDATE SET password_hash = $2
        `,
        [driver.id, hashedPin]
      );

      await client.query("COMMIT");

      const origin = req.get("origin") || req.get("referer") || "https://www.bemsfarms.com";
      const baseUrl = origin.replace(/\/admin.*$/, "").replace(/\/$/, "");
      const inviteUrl = `${baseUrl}/driver/onboarding?token=${inviteToken}`;

      // Send email asynchronously
      sendDriverInvitationEmail({
        email: driver.email,
        name: driver.name,
        inviteUrl,
        temporaryPin: tempPin,
        vehicleType: driver.vehicle_type,
        invitedByName: req.user?.name || "Operations Team",
      }).catch((e) => console.error("Driver invite email failed:", e.message));

      res.status(201).json({
        message: "Driver onboarding invitation sent successfully.",
        driver,
        inviteUrl,
        tempPin,
      });
    } catch (err) {
      await client.query("ROLLBACK");
      next(err);
    } finally {
      client.release();
    }
  }
);

// ── PATCH /api/admin/deliveries/drivers/:id/compliance ────────────
router.patch(
  "/drivers/:id/compliance",
  requireRole("superadmin", "manager", "admin", "delivery_manager"),
  async (req, res, next) => {
    const client = await pool.connect();
    try {
      const { action, notes } = req.body; // action: 'approve' | 'reject' | 'request_changes'
      const driverId = req.params.id;

      await client.query("BEGIN");

      const driverRes = await client.query("SELECT * FROM drivers WHERE id = $1", [driverId]);
      if (!driverRes.rows.length) {
        await client.query("ROLLBACK");
        return res.status(404).json({ message: "Driver not found" });
      }

      const driver = driverRes.rows[0];

      if (action === "approve") {
        const updateRes = await client.query(
          `
          UPDATE drivers
          SET onboarding_status = 'approved',
              status = 'active',
              compliance_notes = $1,
              compliance_reviewed_at = NOW(),
              compliance_reviewed_by = $2,
              updated_at = NOW()
          WHERE id = $3
          RETURNING *
          `,
          [notes || "Compliance verified and approved by admin", req.user.id, driverId]
        );

        await client.query("COMMIT");

        // Auto-generate internal Bems Farms Wallet account number upon approval
        if (!driver.wallet_account_number) {
          const internalWalletNum = "855" + String(driver.id).padStart(7, "0");
          await pool.query(
            `UPDATE drivers 
             SET wallet_account_number = $1, 
                 wallet_bank_name = $2, 
                 wallet_account_name = $3, 
                 updated_at = NOW() 
             WHERE id = $4`,
            [internalWalletNum, "Bems Farms Internal Wallet", `BEMS - ${driver.name.toUpperCase()}`, driver.id]
          );
        }

        // Send approval congratulations email to driver
        const origin = req.get("origin") || req.get("referer") || "https://www.bemsfarms.com";
        const baseUrl = origin.replace(/\/admin.*$/, "").replace(/\/$/, "");

        sendDriverApprovedEmail({
          email: driver.email,
          name: driver.name,
          phone: driver.phone,
          loginUrl: `${baseUrl}/driver`,
        }).catch((e) => console.error("Driver approval email failed:", e.message));

        return res.json({
          message: "Driver compliance approved and account activated successfully.",
          driver: updateRes.rows[0],
        });
      } else {
        const updateRes = await client.query(
          `
          UPDATE drivers
          SET onboarding_status = 'rejected',
              status = 'inactive',
              compliance_notes = $1,
              compliance_reviewed_at = NOW(),
              compliance_reviewed_by = $2,
              updated_at = NOW()
          WHERE id = $3
          RETURNING *
          `,
          [notes || "Compliance documents require revision", req.user.id, driverId]
        );

        await client.query("COMMIT");

        const origin = req.get("origin") || req.get("referer") || "https://www.bemsfarms.com";
        const baseUrl = origin.replace(/\/admin.*$/, "").replace(/\/$/, "");
        const reuploadUrl = driver.invite_token
          ? `${baseUrl}/driver/onboarding?token=${driver.invite_token}`
          : `${baseUrl}/driver/onboarding`;

        sendDriverRejectionEmail({
          email: driver.email,
          name: driver.name,
          reasonNotes: notes,
          reuploadUrl,
        }).catch((e) => console.error("Driver rejection email failed:", e.message));

        return res.json({
          message: "Driver compliance status updated to rejected. Correction email sent to driver.",
          driver: updateRes.rows[0],
        });
      }
    } catch (err) {
      await client.query("ROLLBACK");
      next(err);
    } finally {
      client.release();
    }
  }
);

// ── POST /api/admin/deliveries/drivers/:id/resend-invite ───────────
router.post(
  "/drivers/:id/resend-invite",
  requireRole("superadmin", "manager", "admin", "delivery_manager"),
  async (req, res, next) => {
    try {
      const driverRes = await pool.query("SELECT * FROM drivers WHERE id = $1", [req.params.id]);
      if (!driverRes.rows.length) {
        return res.status(404).json({ message: "Driver not found" });
      }

      const driver = driverRes.rows[0];
      if (!driver.email) {
        return res.status(400).json({ message: "This driver has no email address recorded." });
      }

      const inviteToken = crypto.randomBytes(32).toString("hex");
      const inviteExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      await pool.query(
        "UPDATE drivers SET invite_token = $1, invite_expires_at = $2, onboarding_status = 'invited', updated_at = NOW() WHERE id = $3",
        [inviteToken, inviteExpires, driver.id]
      );

      const origin = req.get("origin") || req.get("referer") || "https://www.bemsfarms.com";
      const baseUrl = origin.replace(/\/admin.*$/, "").replace(/\/$/, "");
      const inviteUrl = `${baseUrl}/driver/onboarding?token=${inviteToken}`;

      sendDriverInvitationEmail({
        email: driver.email,
        name: driver.name,
        inviteUrl,
        vehicleType: driver.vehicle_type,
        invitedByName: req.user?.name || "Operations Team",
      }).catch((e) => console.error("Driver invite resend failed:", e.message));

      res.json({ message: "Onboarding invitation email resent successfully.", inviteUrl });
    } catch (err) {
      next(err);
    }
  }
);

// ── POST /api/admin/deliveries/drivers ───────────────────────────
router.post(
  "/drivers",
  requireRole("superadmin", "manager", "admin"),
  validate(deliveryAdminSchemas.createDriver),
  async (req, res, next) => {
    const client = await pool.connect();
    try {
      const {
        name,
        phone,
        email,
        password,
        vehicle_type,
        vehicle_plate,
        zone_id,
        notes,
        commission_per_delivery,
        status = "active",
      } = req.body;
      if (!name || !phone)
        return res.status(400).json({ message: "Name and phone required" });

      await client.query("BEGIN");

      const result = await client.query(
        `
      INSERT INTO drivers
        (name, phone, email, vehicle_type, vehicle_plate, primary_zone_id, notes, commission_per_delivery, status, joined_date, created_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,COALESCE($8, 500),$9,NOW(),NOW())
      RETURNING *, primary_zone_id AS zone_id
    `,
        [
          name,
          phone,
          email || null,
          vehicle_type || null,
          vehicle_plate || null,
          zone_id || null,
          notes || null,
          commission_per_delivery || null,
          status,
        ],
      );

      const driver = result.rows[0];

      // Auto-assign dedicated virtual wallet account number
      const walletAccount = '855' + String(driver.id).padStart(7, '0');
      const walletAccountName = `BEMS - ${driver.name.toUpperCase()}`;
      await client.query(
        `UPDATE drivers SET wallet_account_number = $1, wallet_bank_name = 'Monnify / Wema Bank', wallet_account_name = $2 WHERE id = $3`,
        [walletAccount, walletAccountName, driver.id]
      );
      driver.wallet_account_number = walletAccount;
      driver.wallet_bank_name = 'Monnify / Wema Bank';
      driver.wallet_account_name = walletAccountName;

      // Set initial driver login password in driver_auth
      const initialPassword = password || phone.replace(/\s+/g, "");
      const hashedPassword = await bcrypt.hash(initialPassword, 10);

      await client.query(
        `
        INSERT INTO driver_auth (driver_id, password_hash, created_at)
        VALUES ($1, $2, NOW())
        ON CONFLICT (driver_id)
        DO UPDATE SET password_hash = $2
        `,
        [driver.id, hashedPassword]
      );

      // Ensure driver_availability record exists
      await client.query(
        `
        INSERT INTO driver_availability (driver_id, is_available, last_toggled_at)
        VALUES ($1, true, NOW())
        ON CONFLICT (driver_id) DO NOTHING
        `,
        [driver.id]
      );

      await client.query("COMMIT");

      res.status(201).json({
        driver,
        message: "Driver created successfully with login credentials",
      });
    } catch (err) {
      await client.query("ROLLBACK");
      next(err);
    } finally {
      client.release();
    }
  },
);

// ── PATCH /api/admin/deliveries/drivers/:id ───────────────────────
router.patch(
  "/drivers/:id",
  requireRole("superadmin", "manager", "admin"),
  validate(deliveryAdminSchemas.updateDriver),
  async (req, res, next) => {
    try {
      const {
        name,
        phone,
        email,
        vehicle_type,
        vehicle_plate,
        zone_id,
        notes,
      } = req.body;
      await pool.query(
        `
      UPDATE drivers SET
        name             = COALESCE($1, name),
        phone            = COALESCE($2, phone),
        email            = COALESCE($3, email),
        vehicle_type     = COALESCE($4, vehicle_type),
        vehicle_plate    = COALESCE($5, vehicle_plate),
        primary_zone_id  = COALESCE($6, primary_zone_id),
        notes            = COALESCE($7, notes),
        updated_at       = NOW()
      WHERE id = $8
    `,
        [
          name || null,
          phone || null,
          email || null,
          vehicle_type || null,
          vehicle_plate || null,
          zone_id || null,
          notes || null,
          req.params.id,
        ],
      );
      res.json({ message: "Driver updated" });
    } catch (err) {
      next(err);
    }
  },
);

// ── PATCH /api/admin/deliveries/drivers/:id/suspend ───────────────
router.patch(
  "/drivers/:id/suspend",
  requireRole("superadmin", "manager", "admin"),
  async (req, res, next) => {
    try {
      const { reason } = req.body;
      await pool.query(
        "UPDATE drivers SET status='suspended', notes=$1, updated_at=NOW() WHERE id=$2",
        [reason || null, req.params.id],
      );
      res.json({ message: "Driver suspended" });
    } catch (err) {
      next(err);
    }
  },
);

// ── PATCH /api/admin/deliveries/drivers/:id/activate & approve ────
router.patch(
  "/drivers/:id/activate",
  requireRole("superadmin", "manager", "admin"),
  async (req, res, next) => {
    try {
      await pool.query(
        "UPDATE drivers SET status='active', onboarding_status='verified', updated_at=NOW() WHERE id=$1",
        [req.params.id],
      );
      await pool.query(
        "UPDATE driver_availability SET is_available=true, last_toggled_at=NOW() WHERE driver_id=$1",
        [req.params.id]
      );
      try {
        const { restartAutoAssignEngine } = require("../services/dispatchEngine");
        restartAutoAssignEngine({ triggerDriverId: req.params.id, reason: "admin_activated_driver" }).catch(() => {});
      } catch (_) {}
      res.json({ message: "Driver activated" });
    } catch (err) {
      next(err);
    }
  },
);

router.patch(
  "/drivers/:id/approve",
  requireRole("superadmin", "manager", "admin"),
  async (req, res, next) => {
    try {
      const driverRes = await pool.query(
        `UPDATE drivers 
         SET status='active', onboarding_status='verified', compliance_notes='Approved by admin on ' || TO_CHAR(NOW(), 'YYYY-MM-DD HH24:MI:SS'), updated_at=NOW() 
         WHERE id=$1 
         RETURNING *`,
        [req.params.id]
      );

      if (driverRes.rows.length === 0) {
        return res.status(404).json({ message: "Driver not found" });
      }

      const driver = driverRes.rows[0];

      await pool.query(
        "UPDATE driver_availability SET is_available=true, last_toggled_at=NOW() WHERE driver_id=$1",
        [driver.id]
      );

      try {
        const { restartAutoAssignEngine } = require("../services/dispatchEngine");
        restartAutoAssignEngine({ triggerDriverId: driver.id, reason: "admin_approved_driver" }).catch(() => {});
      } catch (_) {}

      // Send in-app notification
      await pool.query(
        `INSERT INTO driver_notifications (driver_id, title, body, type, reference_type, created_at)
         VALUES ($1, 'Account Verified & Activated', 'Congratulations! Your Bems Farms driver profile has been verified and approved. You can now toggle online and receive deliveries.', 'announcement', 'onboarding', NOW())`,
        [driver.id]
      );

      if (driver.email) {
        try {
          await sendDriverApprovedEmail(driver);
        } catch (e) {
          console.warn("sendDriverApprovedEmail error:", e.message);
        }
      }

      res.json({
        message: `Driver ${driver.name} approved and activated successfully.`,
        driver,
      });
    } catch (err) {
      next(err);
    }
  }
);

// ── PATCH /api/admin/deliveries/drivers/:id/reject ─────────────────
router.patch(
  "/drivers/:id/reject",
  requireRole("superadmin", "manager", "admin"),
  async (req, res, next) => {
    try {
      const { reason } = req.body;
      const driverRes = await pool.query(
        `UPDATE drivers 
         SET status='rejected', onboarding_status='rejected', compliance_notes=$1, updated_at=NOW() 
         WHERE id=$2 
         RETURNING *`,
        [reason || "Application documents did not meet verification criteria.", req.params.id]
      );

      if (driverRes.rows.length === 0) {
        return res.status(404).json({ message: "Driver not found" });
      }

      const driver = driverRes.rows[0];

      await pool.query(
        "UPDATE driver_availability SET is_available=false, last_toggled_at=NOW() WHERE driver_id=$1",
        [driver.id]
      );

      // Send in-app notification
      await pool.query(
        `INSERT INTO driver_notifications (driver_id, title, body, type, reference_type, created_at)
         VALUES ($1, 'Application Verification Update', $2, 'announcement', 'onboarding', NOW())`,
        [driver.id, `Your driver registration was not approved: ${reason || "Missing or invalid documents"}. Please update your profile.`]
      );

      if (driver.email) {
        try {
          await sendDriverRejectionEmail(driver, reason || "Documents did not meet compliance requirements");
        } catch (e) {
          console.warn("sendDriverRejectionEmail error:", e.message);
        }
      }

      res.json({
        message: `Driver application rejected.`,
        driver,
      });
    } catch (err) {
      next(err);
    }
  }
);

// ── DELETE /api/admin/deliveries/drivers/:id ────────────────────────
router.delete(
  "/drivers/:id",
  requireRole("superadmin", "manager", "admin"),
  async (req, res, next) => {
    const client = await pool.connect();
    try {
      const { id } = req.params;

      const driverRes = await client.query("SELECT * FROM drivers WHERE id = $1", [id]);
      if (driverRes.rows.length === 0) {
        return res.status(404).json({ message: "Driver not found" });
      }

      const driver = driverRes.rows[0];

      // Check if driver is currently on an active delivery in progress
      const activeDelivery = await client.query(
        "SELECT id, status FROM deliveries WHERE driver_id = $1 AND status IN ('assigned', 'accepted', 'awaiting_pickup', 'picked_up', 'out_for_delivery', 'en_route', 'arrived')",
        [id]
      );

      if (activeDelivery.rows.length > 0) {
        return res.status(400).json({
          message: `Cannot delete driver '${driver.name}' because they are currently assigned to active delivery #${activeDelivery.rows[0].id}. Please complete or reassign the delivery first.`
        });
      }

      await client.query("BEGIN");

      // 1. Clean up driver location tracking pings
      await client.query("DELETE FROM driver_locations WHERE driver_id = $1", [id]);

      // 2. Clean up driver availability records
      await client.query("DELETE FROM driver_availability WHERE driver_id = $1", [id]);

      // 3. Clean up driver notifications & device tokens
      await client.query("DELETE FROM driver_notifications WHERE driver_id = $1", [id]);
      await client.query("DELETE FROM driver_device_tokens WHERE driver_id = $1", [id]);

      // 4. Clean up driver incidents if table exists
      try {
        await client.query("DELETE FROM driver_incidents WHERE driver_id = $1", [id]);
      } catch (e) {
        // Ignore if table doesn't exist
      }

      // 5. Clean up driver wallet ledger, commissions, and payouts
      try {
        await client.query("DELETE FROM driver_wallet_ledger WHERE driver_id = $1", [id]);
      } catch (e) {}
      try {
        await client.query("DELETE FROM driver_commissions WHERE driver_id = $1", [id]);
      } catch (e) {}
      try {
        await client.query("DELETE FROM driver_payouts WHERE driver_id = $1", [id]);
      } catch (e) {}

      // 6. Nullify deliveries and assignments
      try {
        await client.query("DELETE FROM delivery_assignments WHERE driver_id = $1", [id]);
      } catch (e) {}
      await client.query("UPDATE deliveries SET driver_id = NULL WHERE driver_id = $1", [id]);

      // 7. Delete driver record
      await client.query("DELETE FROM drivers WHERE id = $1", [id]);

      await client.query("COMMIT");

      res.json({
        success: true,
        message: `Driver '${driver.name}' (ID: ${id}) has been permanently deleted.`
      });
    } catch (err) {
      await client.query("ROLLBACK");
      console.error("DELETE /api/admin/deliveries/drivers/:id error:", err);
      next(err);
    } finally {
      client.release();
    }
  }
);


// ── GET /api/admin/delivery-zones ─────────────────────────────────
router.get("/zones", requireRole("superadmin", "manager", "admin", "delivery_manager"), async (req, res, next) => {
  try {
    // delivery_zones' PK is zone_id (no id column) and its real fee/eta/active
    // columns are min_order_value / estimated_delivery_time / status — alias
    // them to the names the admin UI has always read (zone.id, .min_order_amount,
    // .estimated_eta, .is_active) rather than rewriting every call site.
    const rows = await pool.query(`
      SELECT
        dz.*,
        dz.zone_id AS id,
        dz.min_order_value AS min_order_amount,
        dz.estimated_delivery_time AS estimated_eta,
        (dz.status = 'active') AS is_active,
        COUNT(DISTINCT d.id) FILTER (WHERE d.status = 'delivered') AS deliveries,
        COALESCE(SUM(o.total) FILTER (WHERE d.status = 'delivered'), 0) AS revenue,
        JSON_AGG(DISTINCT dr.name) FILTER (WHERE dr.id IS NOT NULL) AS driver_names,
        JSON_AGG(DISTINCT dr.id)   FILTER (WHERE dr.id IS NOT NULL) AS driver_ids
      FROM delivery_zones dz
      LEFT JOIN deliveries d ON d.zone_id = dz.zone_id
      LEFT JOIN orders o ON d.order_id = o.id
      -- Only exclude suspended drivers here, not off-duty ones — a driver who
      -- is temporarily off duty is still assigned to this zone, and excluding
      -- them from driver_ids made the edit form's pre-fill wrongly show them
      -- as unassigned, so saving any unrelated zone edit silently dropped
      -- their assignment.
      LEFT JOIN drivers dr ON dr.primary_zone_id = dz.zone_id AND dr.status != 'suspended'
      GROUP BY dz.zone_id
      ORDER BY (dz.status = 'active') DESC, dz.zone_name ASC
    `);

    const drivers = await pool.query(`
      SELECT id, name, status FROM drivers
      WHERE status NOT IN ('suspended') ORDER BY name
    `);

    res.json({ zones: rows.rows, drivers: drivers.rows });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/admin/delivery-zones ────────────────────────────────
router.post(
  "/zones",
  requireRole("superadmin", "manager", "admin"),
  validate(deliveryAdminSchemas.createZone),
  async (req, res, next) => {
    try {
      const {
        zone_name,
        delivery_fee,
        min_order_amount,
        estimated_eta,
        coverage_areas,
        driver_ids = [],
        notes,
        is_active = true,
        center_lat,
        center_lng,
        radius_km,
        color_hex,
      } = req.body;

      if (!zone_name || !delivery_fee)
        return res.status(400).json({ message: "Zone name and fee required" });

      const client = await pool.connect();
      let result;
      try {
        await client.query("BEGIN");
        const zoneId = await nextZoneId(client);
        result = await client.query(
          `
        INSERT INTO delivery_zones
          (zone_id, zone_name, delivery_fee, min_order_value, estimated_delivery_time,
           coverage_areas, notes, status, center_lat, center_lng, radius_km, color_hex, created_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW())
        RETURNING *, zone_id AS id, min_order_value AS min_order_amount,
                  estimated_delivery_time AS estimated_eta, (status = 'active') AS is_active
      `,
          [
            zoneId,
            zone_name,
            parseFloat(delivery_fee),
            parseFloat(min_order_amount) || 0,
            estimated_eta || null,
            coverage_areas ? JSON.stringify(coverage_areas) : null,
            notes || null,
            is_active ? 'active' : 'inactive',
            center_lat !== undefined && center_lat !== null ? parseFloat(center_lat) : null,
            center_lng !== undefined && center_lng !== null ? parseFloat(center_lng) : null,
            radius_km !== undefined && radius_km !== null ? parseFloat(radius_km) : 25,
            color_hex || '#1B4332',
          ],
        );
        await client.query("COMMIT");
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      } finally {
        client.release();
      }

      const zone = result.rows[0];

      // Assign drivers to this zone
      if (driver_ids.length) {
        await pool.query(
          `UPDATE drivers SET primary_zone_id=$1 WHERE id = ANY($2::int[])`,
          [zone.zone_id, driver_ids],
        );
      }

      res.status(201).json({ zone, message: "Zone created" });
    } catch (err) {
      next(err);
    }
  },
);

// ── PATCH /api/admin/delivery-zones/:id ──────────────────────────
router.patch(
  "/zones/:id",
  requireRole("superadmin", "manager", "admin"),
  validate(deliveryAdminSchemas.updateZone),
  async (req, res, next) => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const {
        zone_name,
        delivery_fee,
        min_order_amount,
        estimated_eta,
        coverage_areas,
        driver_ids,
        notes,
        is_active,
        center_lat,
        center_lng,
        radius_km,
        color_hex,
      } = req.body;

      await client.query(
        `
      UPDATE delivery_zones SET
        zone_name             = COALESCE($1, zone_name),
        delivery_fee          = COALESCE($2, delivery_fee),
        min_order_value       = COALESCE($3, min_order_value),
        estimated_delivery_time = COALESCE($4, estimated_delivery_time),
        coverage_areas        = COALESCE($5, coverage_areas),
        notes                 = COALESCE($6, notes),
        status                = COALESCE($7, status),
        center_lat            = COALESCE($8, center_lat),
        center_lng            = COALESCE($9, center_lng),
        radius_km             = COALESCE($10, radius_km),
        color_hex             = COALESCE($11, color_hex)
      WHERE zone_id = $12
    `,
        [
          zone_name || null,
          delivery_fee ? parseFloat(delivery_fee) : null,
          min_order_amount ? parseFloat(min_order_amount) : null,
          estimated_eta || null,
          coverage_areas ? JSON.stringify(coverage_areas) : null,
          notes || null,
          is_active !== undefined ? (is_active ? 'active' : 'inactive') : null,
          center_lat !== undefined ? (center_lat !== null ? parseFloat(center_lat) : null) : null,
          center_lng !== undefined ? (center_lng !== null ? parseFloat(center_lng) : null) : null,
          radius_km !== undefined ? (radius_km !== null ? parseFloat(radius_km) : null) : null,
          color_hex || null,
          req.params.id,
        ],
      );

      // Reassign drivers if provided
      if (driver_ids !== undefined) {
        await client.query("UPDATE drivers SET primary_zone_id=NULL WHERE primary_zone_id=$1", [
          req.params.id,
        ]);
        if (driver_ids.length) {
          await client.query(
            "UPDATE drivers SET primary_zone_id=$1 WHERE id = ANY($2::int[])",
            [req.params.id, driver_ids],
          );
        }
      }

      await client.query("COMMIT");
      res.json({ message: "Zone updated" });
    } catch (err) {
      await client.query("ROLLBACK");
      next(err);
    } finally {
      client.release();
    }
  },
);

// ── DELETE /api/admin/delivery-zones/:id ─────────────────────────
router.delete(
  "/zones/:id",
  requireRole("superadmin", "manager"),
  async (req, res, next) => {
    try {
      await pool.query("UPDATE drivers SET primary_zone_id=NULL WHERE primary_zone_id=$1", [
        req.params.id,
      ]);
      await pool.query("DELETE FROM delivery_zones WHERE zone_id=$1", [
        req.params.id,
      ]);
      res.json({ message: "Zone deleted" });
    } catch (err) {
      next(err);
    }
  },
);

// ── POST /api/admin/deliveries/notifications ──────────────────────
router.post("/notifications", requireRole("superadmin", "manager"), async (req, res, next) => {
  try {
    const { title, message, target, driver_ids = [] } = req.body;
    if (!title?.trim()) return res.status(400).json({ message: "Title is required" });
    if (!message?.trim()) return res.status(400).json({ message: "Message is required" });

    const result = await pool.query(
      `INSERT INTO driver_notifications (title, message, target, driver_ids, sent_by)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [title.trim(), message.trim(), target || "all", driver_ids, req.user.id],
    );

    res.status(201).json({ notification: result.rows[0], message: "Notification sent" });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/admin/deliveries/notifications ───────────────────────
router.get("/notifications", requireRole("superadmin", "manager"), async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT dn.*, u.name AS sent_by_name
       FROM driver_notifications dn LEFT JOIN users u ON u.id = dn.sent_by
       ORDER BY dn.created_at DESC LIMIT 50`,
    );
    res.json({ notifications: result.rows });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/admin/deliveries/drivers/:id/location ─────────────────
// No per-driver login exists yet (drivers aren't linked to a users row), so
// this can't verify a driver is reporting only their own location — but it
// must at least require staff auth instead of any authenticated account.
router.post("/drivers/:id/location", requireRole("superadmin", "manager", "admin", "delivery_manager"), async (req, res, next) => {
  const { id } = req.params;
  const { latitude, longitude, heading = 0, speed = 0, accuracy = 0 } = req.body;
  if (latitude == null || longitude == null) {
    return res.status(400).json({ message: "latitude and longitude are required" });
  }
  try {
    const driver = await pool.query("SELECT id FROM drivers WHERE id=$1", [id]);
    if (!driver.rows.length) {
      return res.status(404).json({ message: "Driver not found" });
    }
    await pool.query(
      `INSERT INTO driver_locations (driver_id, latitude, longitude, heading, speed, accuracy, recorded_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [id, latitude, longitude, heading, speed, accuracy]
    );
    res.json({ success: true, message: "Driver location updated successfully" });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/admin/deliveries/drivers/:id/send-reset-link ──────────────
// Trigger secure password reset link to driver's email (Admin cannot see or set password)
router.post(
  "/drivers/:id/send-reset-link",
  requireRole("superadmin", "manager", "admin", "delivery_manager"),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const driverRes = await pool.query(
        "SELECT id, name, email, phone FROM drivers WHERE id = $1",
        [id]
      );
      if (driverRes.rows.length === 0) {
        return res.status(404).json({ message: "Driver not found" });
      }

      const driver = driverRes.rows[0];
      if (!driver.email) {
        return res.status(400).json({ message: "Driver has no email address configured to receive a reset link." });
      }

      const resetToken = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 3600 * 1000); // 1 hour

      await pool.query(
        `
        INSERT INTO driver_auth (driver_id, reset_token, reset_token_expires, created_at)
        VALUES ($1, $2, $3, NOW())
        ON CONFLICT (driver_id)
        DO UPDATE SET reset_token = $2, reset_token_expires = $3
        `,
        [id, resetToken, expiresAt]
      );

      const emailService = require("../services/emailService");
      await emailService.sendDriverPasswordResetEmail(driver, resetToken);

      res.json({
        success: true,
        message: `Password reset link & code successfully sent to ${driver.email}`,
      });
    } catch (err) {
      next(err);
    }
  }
);

// ── GET /api/admin/deliveries/payouts ──────────────────────────────
router.get("/payouts", requireRole("superadmin", "manager", "admin", "delivery_manager"), async (req, res, next) => {
  try {
    const { status = "" } = req.query;
    const params = [];
    let whereClause = "";

    if (status) {
      params.push(status);
      whereClause = `WHERE dp.status = $${params.length}`;
    }

    const result = await pool.query(
      `
      SELECT 
        dp.*,
        dr.name AS driver_name,
        dr.phone AS driver_phone,
        dr.email AS driver_email,
        u.name AS processed_by_name
      FROM driver_payouts dp
      JOIN drivers dr ON dp.driver_id = dr.id
      LEFT JOIN users u ON dp.processed_by = u.id
      ${whereClause}
      ORDER BY dp.requested_at DESC
      LIMIT 100
      `,
      params
    );

    res.json({ payouts: result.rows });
  } catch (err) {
    next(err);
  }
});

// ── PATCH /api/admin/deliveries/payouts/:id ────────────────────────
router.patch("/payouts/:id", requireRole("superadmin", "manager", "admin"), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, rejection_reason, notes } = req.body;

    if (!["approved", "paid", "rejected"].includes(status)) {
      return res.status(400).json({ message: "Status must be approved, paid, or rejected" });
    }

    const result = await pool.query(
      `
      UPDATE driver_payouts
      SET 
        status = $1,
        processed_at = NOW(),
        processed_by = $2,
        rejection_reason = COALESCE($3, rejection_reason),
        notes = COALESCE($4, notes)
      WHERE id = $5
      RETURNING *
      `,
      [status, req.user.id, rejection_reason || null, notes || null, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Payout request not found" });
    }

    const payout = result.rows[0];

    // If marked as paid, reconcile corresponding pending commissions
    if (status === "paid") {
      await pool.query(
        `UPDATE driver_commissions SET status = 'paid', updated_at = NOW() WHERE driver_id = $1 AND status = 'pending'`,
        [payout.driver_id]
      );
    }

    res.json({
      message: `Payout request marked as ${status}`,
      payout,
    });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/admin/deliveries/check-timeouts ────────────────────────
// Manually trigger check for 10-min unresponsive drivers and reassign them
const { autoAssignClosestDriver, processUnresponsiveAssignments } = require("../services/dispatchEngine");

router.post("/check-timeouts", requireRole("superadmin", "admin", "manager", "delivery_manager"), async (req, res, next) => {
  try {
    const timeoutMinutes = parseInt(req.body.timeout_minutes) || 10;
    const result = await processUnresponsiveAssignments(timeoutMinutes);
    res.json({
      message: `Processed unresponsive assignments check (${timeoutMinutes} min window)`,
      ...result,
    });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/admin/deliveries/:id/auto-assign ───────────────────────
// Proximity auto-assign delivery to closest available online driver
router.post("/:id/auto-assign", requireRole("superadmin", "admin", "manager", "delivery_manager"), async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await autoAssignClosestDriver(id);
    if (!result.success) {
      return res.status(400).json(result);
    }
    res.json({
      message: `Delivery #${id} automatically assigned to closest driver: ${result.driver.name} (${result.driver.distanceKm} km away)`,
      assignment: result,
    });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/admin/deliveries/engine/run ─────────────────────────────
// Manually restart or force auto-assign engine sweep across all unassigned deliveries
router.post("/engine/run", requireRole("superadmin", "admin", "manager", "delivery_manager"), async (req, res, next) => {
  try {
    const { restartAutoAssignEngine } = require("../services/dispatchEngine");
    const summary = await restartAutoAssignEngine({ reason: "admin_manual_trigger" });
    res.json({
      message: "Auto-assign proximity engine sweep completed",
      summary,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;


