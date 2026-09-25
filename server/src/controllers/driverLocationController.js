const pool = require("../db/pool");

// ── POST /api/driver/location ────────────────────────────────────────
// Record periodic GPS coordinates from driver's device, with order_id and timestamp support
const updateLocation = async (req, res, next) => {
  try {
    const driverId = req.driver.id;
    const {
      latitude,
      longitude,
      heading,
      speed,
      accuracy,
      order_id,
      orderId,
      timestamp,
      recorded_at,
    } = req.body;

    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({ message: "latitude and longitude are required" });
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return res.status(400).json({ message: "Invalid latitude or longitude values" });
    }

    // Resolve order_id: from request body, or auto-detect driver's active delivery
    let targetOrderId = order_id || orderId || req.body.order_ref || req.body.orderRef || null;
    let targetDeliveryId = req.body.delivery_id || req.body.deliveryId || null;

    if (!targetOrderId) {
      try {
        const activeDel = await pool.query(
          `SELECT d.id AS delivery_id, d.order_id, o.order_ref
           FROM deliveries d
           JOIN orders o ON d.order_id = o.id
           WHERE d.driver_id = $1 
             AND d.status IN ('picked_up', 'en_route', 'out_for_delivery', 'arrived', 'assigned', 'awaiting_pickup')
           ORDER BY d.assigned_at DESC LIMIT 1`,
          [driverId]
        );
        if (activeDel.rows.length) {
          targetOrderId = activeDel.rows[0].order_ref || activeDel.rows[0].order_id;
          targetDeliveryId = activeDel.rows[0].delivery_id;
        }
      } catch (_) {}
    }

    // Parse timestamp if provided by mobile app
    // 1. Device GPS time: the time coordinates were captured on the driver's phone
    let deviceTimestamp = null;
    if (timestamp) {
      const parsedTime = new Date(timestamp);
      if (!isNaN(parsedTime.getTime())) {
        deviceTimestamp = parsedTime;
      }
    }
    if (!deviceTimestamp) {
      deviceTimestamp = new Date();
    }

    // 2. Server recorded time: the exact moment the backend received and logged the request
    const serverRecordedAt = new Date();

    const result = await pool.query(
      `
      INSERT INTO driver_locations (
        driver_id, latitude, longitude, heading, speed, accuracy, order_id, delivery_id, "timestamp", recorded_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id, driver_id, latitude, longitude, heading, speed, accuracy, order_id, delivery_id, "timestamp", recorded_at
      `,
      [
        driverId,
        lat,
        lng,
        heading !== undefined ? parseFloat(heading) : null,
        speed !== undefined ? parseFloat(speed) : null,
        accuracy !== undefined ? parseFloat(accuracy) : null,
        targetOrderId ? String(targetOrderId) : null,
        targetDeliveryId ? parseInt(targetDeliveryId, 10) : null,
        deviceTimestamp,
        serverRecordedAt,
      ]
    );

    // Update driver telemetry timestamps for active heartbeat
    pool.query(
      "UPDATE drivers SET last_location_at = NOW() WHERE id = $1",
      [driverId]
    ).catch(() => {});

    pool.query(
      `INSERT INTO driver_availability (driver_id, is_available, last_ping_at)
       VALUES ($1, true, NOW())
       ON CONFLICT (driver_id) DO UPDATE SET last_ping_at = NOW()`,
      [driverId]
    ).catch(() => {});

    try {
      const { broadcastDriverLocation, broadcastDriverTelemetry } = require("../services/socketService");
      broadcastDriverLocation({
        driver_id: driverId,
        order_id: targetOrderId,
        orderId: targetOrderId,
        delivery_id: targetDeliveryId,
        latitude: lat,
        longitude: lng,
        heading: heading !== undefined ? parseFloat(heading) : null,
        speed: speed !== undefined ? parseFloat(speed) : null,
        timestamp: deviceTimestamp.toISOString(),
        recorded_at: serverRecordedAt.toISOString(),
      });
      broadcastDriverTelemetry({
        driver_id: driverId,
        is_available: true,
        status: "active",
        last_ping_at: serverRecordedAt.toISOString(),
      });
    } catch (_) {}

    res.status(201).json({
      success: true,
      order_id: targetOrderId,
      orderId: targetOrderId,
      location: result.rows[0],
    });
  } catch (err) {
    console.error("Driver updateLocation error:", err.message);
    next(err);
  }
};

// ── POST /api/driver/heartbeat ────────────────────────────────────────
// Lightweight presence ping sent by mobile app every 30-60s while online
const recordHeartbeat = async (req, res, next) => {
  try {
    const driverId = req.driver.id;
    const { latitude, longitude } = req.body || {};

    if (latitude !== undefined && longitude !== undefined) {
      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);
      if (!isNaN(lat) && !isNaN(lng)) {
        await pool.query(
          "INSERT INTO driver_locations (driver_id, latitude, longitude, recorded_at) VALUES ($1, $2, $3, NOW())",
          [driverId, lat, lng]
        ).catch(() => {});
      }
    }

    await pool.query(
      "UPDATE drivers SET last_location_at = NOW() WHERE id = $1",
      [driverId]
    ).catch(() => {});

    await pool.query(
      `INSERT INTO driver_availability (driver_id, is_available, last_ping_at)
       VALUES ($1, true, NOW())
       ON CONFLICT (driver_id) DO UPDATE SET last_ping_at = NOW()`,
      [driverId]
    ).catch(() => {});

    try {
      const { broadcastDriverTelemetry } = require("../services/socketService");
      broadcastDriverTelemetry({
        driver_id: driverId,
        is_available: true,
        status: "active",
        last_ping_at: new Date().toISOString(),
      });
    } catch (_) {}

    res.json({ success: true, timestamp: new Date().toISOString() });
  } catch (err) {
    console.error("Driver recordHeartbeat error:", err.message);
    next(err);
  }
};

module.exports = {
  updateLocation,
  recordHeartbeat,
};
