// server/src/routes/deliveries_admin.js
// Mounted at /api/admin/deliveries

const express = require("express");
const router = express.Router();
const pool = require("../db/pool");
const { protect, requireRole } = require("../middleware/authMiddleware");

router.use(protect);

// ── GET /api/admin/deliveries/active ─────────────────────────────
router.get("/active", async (req, res) => {
  try {
    const { search = "", status = "" } = req.query;
    const params = [];
    const where = ["d.status NOT IN ('delivered','cancelled')"];

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
        d.delivery_address,
        o.id AS order_id, o.total AS order_total, o.notes,
        COALESCE(o.customer_name, c.name, 'Walk-in') AS customer_name,
        COALESCE(o.customer_phone, c.phone, '')       AS customer_phone,
        dr.id AS driver_id, dr.name AS driver_name,
        dr.phone AS driver_phone, dr.vehicle_plate AS driver_plate,
        dr.vehicle_type,
        dz.zone_name AS zone,
        (SELECT JSON_AGG(JSON_BUILD_OBJECT(
            'name',  COALESCE(oi.product_name, p.name),
            'qty',   oi.quantity || ' ' || COALESCE(p.unit, '')
          ))
          FROM order_items oi LEFT JOIN products p ON oi.product_id = p.id
          WHERE oi.order_id = o.id
        ) AS items
      FROM deliveries d
      JOIN orders o ON d.order_id = o.id
      LEFT JOIN customers c ON o.customer_id = c.id
      LEFT JOIN drivers dr ON d.driver_id = dr.id
      LEFT JOIN delivery_zones dz ON d.zone_id = dz.zone_id
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
        COUNT(*) FILTER (WHERE status = 'assigned')          AS awaiting,
        COUNT(*) FILTER (WHERE status = 'delivery_attempted') AS attempted
      FROM deliveries
      WHERE status NOT IN ('delivered','cancelled')
    `);

    res.json({ deliveries: rows.rows, stats: stats.rows[0] });
  } catch (err) {
    console.error("GET /admin/deliveries/active:", err.message);
    res.status(500).json({ message: err.message });
  }
});

// ── GET /api/admin/deliveries/auto-log ───────────────────────────
router.get("/auto-log", async (req, res) => {
  try {
    const rows = await pool.query(`
      SELECT
        da.id, da.assignment_type, 
        0 AS confidence_score, da.created_at,
        da.driver_response,
        o.id AS order_id, o.status AS order_status,
        COALESCE(o.customer_name, c.name) AS customer_name,
        dz.zone_name AS zone,
        dr.name AS driver_name, dr.vehicle_plate AS driver_plate,
        ov.overridden_by_name, ov.override_note
      FROM delivery_assignments da
      JOIN deliveries d ON da.delivery_id = d.id
      JOIN orders o ON d.order_id = o.id
      LEFT JOIN customers c ON o.customer_id = c.id
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
    res.status(500).json({ message: err.message });
  }
});

// ── PATCH /api/admin/deliveries/:id/status ────────────────────────
router.patch(
  "/:id/status",
  requireRole("superadmin", "manager", "admin", "delivery_manager"),
  async (req, res) => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const { status, notes } = req.body;

      const del = await client.query("SELECT * FROM deliveries WHERE id=$1", [
        req.params.id,
      ]);
      if (!del.rows.length)
        return res.status(404).json({ message: "Delivery not found" });

      const patch = { status };
      if (status === "out_for_delivery") patch.dispatched_at = "NOW()";
      if (status === "delivered") patch.delivered_at = "NOW()";

      await client.query(
        `UPDATE deliveries SET status=$1, updated_at=NOW()
       ${status === "out_for_delivery" ? ", dispatched_at=NOW()" : ""}
       ${status === "delivered" ? ", delivered_at=NOW()" : ""}
       WHERE id=$2`,
        [status, req.params.id],
      );

      // Mirror status on order
      const orderStatus = {
        assigned: "driver_assigned",
        out_for_delivery: "out_for_delivery",
        delivery_attempted: "delivery_attempted",
        delivered: "delivered",
        cancelled: "cancelled",
      }[status];

      if (orderStatus) {
        await client.query(
          "UPDATE orders SET status=$1, updated_at=NOW() WHERE id=$2",
          [orderStatus, del.rows[0].order_id],
        );
        await client.query(
          `
        INSERT INTO order_status_history (order_id, to_status, changed_by, notes, created_at)
        VALUES ($1,$2,$3,$4,NOW())
      `,
          [del.rows[0].order_id, orderStatus, req.user.id, notes || null],
        );
      }

      // Log tracking event
      await client.query(
        `
      INSERT INTO order_tracking_events
        (order_id, delivery_id, event_type, description, triggered_by, triggered_by_id, created_at)
      VALUES ($1,$2,$3,$4,'admin',$5,NOW())
    `,
        [
          del.rows[0].order_id,
          req.params.id,
          status,
          notes || status,
          req.user.id,
        ],
      );

      await client.query("COMMIT");
      res.json({ message: "Delivery status updated" });
    } catch (err) {
      await client.query("ROLLBACK");
      res.status(500).json({ message: err.message });
    } finally {
      client.release();
    }
  },
);

// ── PATCH /api/admin/deliveries/:id/reassign ─────────────────────
router.patch(
  "/:id/reassign",
  requireRole("superadmin", "manager", "admin", "delivery_manager"),
  async (req, res) => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const { driver_id, note } = req.body;
      if (!driver_id)
        return res.status(400).json({ message: "driver_id required" });

      const del = await client.query("SELECT * FROM deliveries WHERE id=$1", [
        req.params.id,
      ]);
      const driver = await client.query("SELECT * FROM drivers WHERE id=$1", [
        driver_id,
      ]);
      if (!del.rows.length)
        return res.status(404).json({ message: "Delivery not found" });
      if (!driver.rows.length)
        return res.status(404).json({ message: "Driver not found" });

      const d = driver.rows[0];

      await client.query(
        "UPDATE deliveries SET driver_id=$1, status='assigned', assigned_at=NOW(), updated_at=NOW() WHERE id=$2",
        [driver_id, req.params.id],
      );
      await client.query(
        "UPDATE orders SET driver_id=$1, updated_at=NOW() WHERE id=$2",
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
        (order_id, delivery_id, event_type, description, triggered_by, triggered_by_id, created_at)
      VALUES ($1,$2,'driver_assigned',$3,'admin',$4,NOW())
    `,
        [
          del.rows[0].order_id,
          req.params.id,
          `Driver reassigned to: ${d.name} (${d.vehicle_plate}). ${note || ""}`,
          req.user.id,
        ],
      );

      await client.query("COMMIT");
      res.json({ message: "Driver reassigned", driver: d });
    } catch (err) {
      await client.query("ROLLBACK");
      res.status(500).json({ message: err.message });
    } finally {
      client.release();
    }
  },
);

// ── PATCH /api/admin/deliveries/:id/attempt ──────────────────────
router.patch(
  "/:id/attempt",
  requireRole("superadmin", "manager", "admin", "delivery_manager"),
  async (req, res) => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const { notes } = req.body;

      const del = await client.query("SELECT * FROM deliveries WHERE id=$1", [
        req.params.id,
      ]);
      if (!del.rows.length)
        return res.status(404).json({ message: "Delivery not found" });

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
        (order_id, delivery_id, event_type, description, triggered_by, triggered_by_id, created_at)
      VALUES ($1,$2,'delivery_attempted',$3,'admin',$4,NOW())
    `,
        [
          del.rows[0].order_id,
          req.params.id,
          notes ||
            `Delivery attempted. Customer unavailable. Attempt ${newAttempts}/2.`,
          req.user.id,
        ],
      );

      await client.query("COMMIT");
      res.json({ message: "Attempt logged", attempts: newAttempts });
    } catch (err) {
      await client.query("ROLLBACK");
      res.status(500).json({ message: err.message });
    } finally {
      client.release();
    }
  },
);

// ── GET /api/admin/deliveries/drivers ────────────────────────────
router.get("/drivers", async (req, res) => {
  try {
    const { search = "", status = "" } = req.query;
    const params = [];
    const where = [];

    if (status) {
      params.push(status);
      where.push(`dr.status = $${params.length}`);
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
        dz.zone_name AS zone,
        COUNT(DISTINCT d.id) FILTER (WHERE d.status = 'delivered') AS total_deliveries,
        COALESCE(AVG(df.rating), 0)                                AS rating,
        COALESCE(dr.total_earnings, 0)                              AS earnings,
        (SELECT o.id FROM deliveries d2
         JOIN orders o ON d2.order_id = o.id
         WHERE d2.driver_id = dr.id AND d2.status NOT IN ('delivered','cancelled')
         LIMIT 1)                                                   AS current_order
      FROM drivers dr
      LEFT JOIN delivery_zones dz ON dr.primary_zone_id = dz.zone_id
      LEFT JOIN deliveries d ON d.driver_id = dr.id
      LEFT JOIN driver_feedback df ON df.driver_id = dr.id
      ${whereClause}
      GROUP BY dr.id, dz.zone_name
      ORDER BY dr.status ASC, dr.name ASC
    `,
      params,
    );

    const stats = await pool.query(`
      SELECT
        COUNT(*)                                              AS total,
        COUNT(*) FILTER (WHERE status = 'active')            AS active,
        COUNT(*) FILTER (WHERE status = 'on_delivery')       AS on_delivery,
        COUNT(*) FILTER (WHERE status = 'off_duty')          AS off_duty,
        COUNT(*) FILTER (WHERE status = 'suspended')         AS suspended
      FROM drivers
    `);

    res.json({ drivers: rows.rows, stats: stats.rows[0] });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── POST /api/admin/deliveries/drivers ───────────────────────────
router.post(
  "/drivers",
  requireRole("superadmin", "manager", "admin"),
  async (req, res) => {
    try {
      const {
        name,
        phone,
        email,
        vehicle_type,
        vehicle_plate,
        zone_id,
        notes,
        status = "active",
      } = req.body;
      if (!name || !phone)
        return res.status(400).json({ message: "Name and phone required" });

      const result = await pool.query(
        `
      INSERT INTO drivers
        (name, phone, email, vehicle_type, vehicle_plate, zone_id, notes, status, joined_at, created_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW(),NOW())
      RETURNING *
    `,
        [
          name,
          phone,
          email || null,
          vehicle_type || null,
          vehicle_plate || null,
          zone_id || null,
          notes || null,
          status,
        ],
      );

      res.status(201).json({ driver: result.rows[0], message: "Driver added" });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },
);

// ── PATCH /api/admin/deliveries/drivers/:id ───────────────────────
router.patch(
  "/drivers/:id",
  requireRole("superadmin", "manager", "admin"),
  async (req, res) => {
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
        name          = COALESCE($1, name),
        phone         = COALESCE($2, phone),
        email         = COALESCE($3, email),
        vehicle_type  = COALESCE($4, vehicle_type),
        vehicle_plate = COALESCE($5, vehicle_plate),
        zone_id       = COALESCE($6, zone_id),
        notes         = COALESCE($7, notes),
        updated_at    = NOW()
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
      res.status(500).json({ message: err.message });
    }
  },
);

// ── PATCH /api/admin/deliveries/drivers/:id/suspend ───────────────
router.patch(
  "/drivers/:id/suspend",
  requireRole("superadmin", "manager", "admin"),
  async (req, res) => {
    try {
      const { reason } = req.body;
      await pool.query(
        "UPDATE drivers SET status='suspended', notes=$1, updated_at=NOW() WHERE id=$2",
        [reason || null, req.params.id],
      );
      res.json({ message: "Driver suspended" });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },
);

// ── PATCH /api/admin/deliveries/drivers/:id/activate ─────────────
router.patch(
  "/drivers/:id/activate",
  requireRole("superadmin", "manager", "admin"),
  async (req, res) => {
    try {
      await pool.query(
        "UPDATE drivers SET status='active', notes=NULL, updated_at=NOW() WHERE id=$1",
        [req.params.id],
      );
      res.json({ message: "Driver activated" });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },
);

// ── GET /api/admin/delivery-zones ─────────────────────────────────
router.get("/zones", async (req, res) => {
  try {
    const rows = await pool.query(`
      SELECT
        dz.*,
        COUNT(DISTINCT d.id) FILTER (WHERE d.status = 'delivered') AS deliveries,
        COALESCE(SUM(o.total) FILTER (WHERE d.status = 'delivered'), 0) AS revenue,
        JSON_AGG(DISTINCT dr.name) FILTER (WHERE dr.id IS NOT NULL) AS driver_names,
        JSON_AGG(DISTINCT dr.id)   FILTER (WHERE dr.id IS NOT NULL) AS driver_ids
      FROM delivery_zones dz
      LEFT JOIN deliveries d ON d.zone_id = dz.zone_id
      LEFT JOIN orders o ON d.order_id = o.id
      LEFT JOIN drivers dr ON dr.primary_zone_id = dz.zone_id AND dr.status NOT IN ('suspended','off_duty')
      GROUP BY dz.zone_id
      ORDER BY (dz.status = 'active') DESC, dz.zone_name ASC
    `);

    const drivers = await pool.query(`
      SELECT id, name, status FROM drivers
      WHERE status NOT IN ('suspended') ORDER BY name
    `);

    res.json({ zones: rows.rows, drivers: drivers.rows });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── POST /api/admin/delivery-zones ────────────────────────────────
router.post(
  "/zones",
  requireRole("superadmin", "manager", "admin"),
  async (req, res) => {
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
      } = req.body;

      if (!zone_name || !delivery_fee)
        return res.status(400).json({ message: "Zone name and fee required" });

      const result = await pool.query(
        `
      INSERT INTO delivery_zones
        (zone_name, delivery_fee, min_order_amount, estimated_eta,
         coverage_areas, notes, status, created_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())
      RETURNING *
    `,
        [
          zone_name,
          parseFloat(delivery_fee),
          parseFloat(min_order_amount) || 0,
          estimated_eta || null,
          coverage_areas ? JSON.stringify(coverage_areas) : null,
          notes || null,
          is_active ? 'active' : 'inactive',
        ],
      );

      const zone = result.rows[0];

      // Assign drivers to this zone
      if (driver_ids.length) {
        await pool.query(
          `UPDATE drivers SET primary_zone_id=$1 WHERE id = ANY($2::int[])`,
          [zone.id, driver_ids],
        );
      }

      res.status(201).json({ zone, message: "Zone created" });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },
);

// ── PATCH /api/admin/delivery-zones/:id ──────────────────────────
router.patch(
  "/zones/:id",
  requireRole("superadmin", "manager", "admin"),
  async (req, res) => {
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
      } = req.body;

      await client.query(
        `
      UPDATE delivery_zones SET
        zone_name          = COALESCE($1, zone_name),
        delivery_fee       = COALESCE($2, delivery_fee),
        min_order_amount   = COALESCE($3, min_order_amount),
        estimated_eta      = COALESCE($4, estimated_eta),
        coverage_areas     = COALESCE($5, coverage_areas),
        notes              = COALESCE($6, notes),
        status             = COALESCE($7, status),
        updated_at         = NOW()
      WHERE id = $8
    `,
        [
          zone_name || null,
          delivery_fee ? parseFloat(delivery_fee) : null,
          min_order_amount ? parseFloat(min_order_amount) : null,
          estimated_eta || null,
          coverage_areas ? JSON.stringify(coverage_areas) : null,
          notes || null,
          is_active !== undefined ? (is_active ? 'active' : 'inactive') : null,
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
      res.status(500).json({ message: err.message });
    } finally {
      client.release();
    }
  },
);

// ── DELETE /api/admin/delivery-zones/:id ─────────────────────────
router.delete(
  "/zones/:id",
  requireRole("superadmin", "manager"),
  async (req, res) => {
    try {
      await pool.query("UPDATE drivers SET zone_id=NULL WHERE zone_id=$1", [
        req.params.id,
      ]);
      await pool.query("DELETE FROM delivery_zones WHERE id=$1", [
        req.params.id,
      ]);
      res.json({ message: "Zone deleted" });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },
);

// ── POST /api/admin/deliveries/notifications ──────────────────────
router.post("/notifications", requireRole("superadmin", "manager"), async (req, res) => {
  try {
    const { title, message, target, driver_ids = [] } = req.body;
    if (!title?.trim()) return res.status(400).json({ message: "Title is required" });
    if (!message?.trim()) return res.status(400).json({ message: "Message is required" });

    await pool.query(`
      CREATE TABLE IF NOT EXISTS driver_notifications (
        id         SERIAL PRIMARY KEY,
        title      VARCHAR(255) NOT NULL,
        message    TEXT NOT NULL,
        target     VARCHAR(20) NOT NULL DEFAULT 'all',
        driver_ids INTEGER[],
        sent_by    INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    const result = await pool.query(
      `INSERT INTO driver_notifications (title, message, target, driver_ids, sent_by)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [title.trim(), message.trim(), target || "all", driver_ids, req.user.id],
    );

    res.status(201).json({ notification: result.rows[0], message: "Notification sent" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET /api/admin/deliveries/notifications ───────────────────────
router.get("/notifications", requireRole("superadmin", "manager"), async (req, res) => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS driver_notifications (
        id SERIAL PRIMARY KEY, title VARCHAR(255) NOT NULL, message TEXT NOT NULL,
        target VARCHAR(20) NOT NULL DEFAULT 'all', driver_ids INTEGER[],
        sent_by INTEGER REFERENCES users(id), created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    const result = await pool.query(
      `SELECT dn.*, u.name AS sent_by_name
       FROM driver_notifications dn LEFT JOIN users u ON u.id = dn.sent_by
       ORDER BY dn.created_at DESC LIMIT 50`,
    );
    res.json({ notifications: result.rows });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
