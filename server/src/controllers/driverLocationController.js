const pool = require("../db/pool");

// ── POST /api/driver/location ────────────────────────────────────────
// Record periodic GPS coordinates from driver's device
const updateLocation = async (req, res, next) => {
  try {
    const driverId = req.driver.id;
    const { latitude, longitude, heading, speed, accuracy } = req.body;

    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({ message: "latitude and longitude are required" });
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return res.status(400).json({ message: "Invalid latitude or longitude values" });
    }

    const result = await pool.query(
      `
      INSERT INTO driver_locations (driver_id, latitude, longitude, heading, speed, accuracy, recorded_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
      RETURNING id, driver_id, latitude, longitude, heading, speed, accuracy, recorded_at
      `,
      [
        driverId,
        lat,
        lng,
        heading !== undefined ? parseFloat(heading) : null,
        speed !== undefined ? parseFloat(speed) : null,
        accuracy !== undefined ? parseFloat(accuracy) : null,
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
        latitude: lat,
        longitude: lng,
        heading: heading !== undefined ? parseFloat(heading) : null,
        speed: speed !== undefined ? parseFloat(speed) : null,
        accuracy: accuracy !== undefined ? parseFloat(accuracy) : null,
        recorded_at: new Date().toISOString(),
      });
      broadcastDriverTelemetry({
        driver_id: driverId,
        is_available: true,
        status: "active",
        last_ping_at: new Date().toISOString(),
      });
    } catch (_) {}

    res.status(201).json({
      success: true,
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
