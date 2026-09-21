// server/src/controllers/driverIncidentController.js
const pool = require("../db/pool");
const crypto = require("crypto");

// ── POST /api/driver/deliveries/:orderId/report-issue ─────────────────
// Report mid-trip delivery problem or incident
const reportIncident = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const driverId = req.driver.id;
    const { orderId } = req.params;
    const { issue_type, description, photo_urls = [], latitude, longitude } = req.body;

    if (!issue_type || !description) {
      return res.status(400).json({
        status: "error",
        message: "issue_type and description are required to report an incident"
      });
    }

    await client.query("BEGIN");

    // Fetch delivery for order
    const delRes = await client.query(
      `SELECT d.*, o.order_ref FROM deliveries d JOIN orders o ON d.order_id = o.id WHERE (d.order_id = $1 OR o.order_ref = $1) AND d.driver_id = $2`,
      [orderId, driverId]
    );

    let deliveryId = null;
    let targetOrderId = orderId;
    if (delRes.rows.length > 0) {
      deliveryId = delRes.rows[0].id;
      targetOrderId = delRes.rows[0].order_id;
    }

    const incidentRef = `INC-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(2).toString("hex").toUpperCase()}`;

    const insertRes = await client.query(
      `
      INSERT INTO driver_incidents (
        incident_ref, driver_id, order_id, delivery_id, issue_type,
        description, photo_urls, latitude, longitude, status, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'open', NOW())
      RETURNING *
      `,
      [
        incidentRef,
        driverId,
        String(targetOrderId),
        deliveryId,
        issue_type,
        description,
        JSON.stringify(Array.isArray(photo_urls) ? photo_urls : [photo_urls]),
        latitude || null,
        longitude || null
      ]
    );

    // If customer unreachable or wrong address, update delivery failure reason and attempt status
    if (deliveryId && ["customer_unreachable", "wrong_address", "damaged_goods", "delivery_refused"].includes(issue_type)) {
      await client.query(
        `
        UPDATE deliveries 
        SET 
          status = 'delivery_attempted',
          failure_reason = $1,
          attempts = COALESCE(attempts, 0) + 1,
          updated_at = NOW()
        WHERE id = $2
        `,
        [`[Incident ${incidentRef}] ${issue_type}: ${description}`, deliveryId]
      );

      await client.query(
        `UPDATE orders SET tracking_status = 'delivery_attempted', updated_at = NOW() WHERE id = $1`,
        [targetOrderId]
      );
    }

    await client.query("COMMIT");

    res.status(201).json({
      status: "success",
      message: "Incident report submitted to dispatch operations",
      incident: insertRes.rows[0]
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("reportIncident error:", err.message);
    next(err);
  } finally {
    client.release();
  }
};

// ── GET /api/driver/incidents ────────────────────────────────────────
// List all past incidents reported by the driver
const getDriverIncidents = async (req, res, next) => {
  try {
    const driverId = req.driver.id;
    const result = await pool.query(
      `
      SELECT 
        di.*,
        o.order_ref,
        o.customer_name
      FROM driver_incidents di
      LEFT JOIN orders o ON di.order_id = o.id::varchar OR di.order_id = o.order_ref
      WHERE di.driver_id = $1
      ORDER BY di.created_at DESC
      LIMIT 50
      `,
      [driverId]
    );

    res.json({
      status: "success",
      count: result.rows.length,
      incidents: result.rows
    });
  } catch (err) {
    console.error("getDriverIncidents error:", err.message);
    next(err);
  }
};

module.exports = {
  reportIncident,
  getDriverIncidents
};
