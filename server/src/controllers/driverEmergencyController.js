// server/src/controllers/driverEmergencyController.js
const pool = require("../db/pool");
const crypto = require("crypto");

// ── POST /api/driver/emergency ───────────────────────────────────────
// Trigger 1-Tap Emergency SOS panic alert to Operations Dispatch Dashboard
const triggerEmergency = async (req, res, next) => {
  try {
    const driverId = req.driver.id;
    const { latitude, longitude, address, battery_level, emergency_type = "sos_panic", notes } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({
        status: "error",
        message: "Live GPS latitude and longitude are required to trigger an SOS alert"
      });
    }

    const emergencyRef = `SOS-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(2).toString("hex").toUpperCase()}`;

    const result = await pool.query(
      `
      INSERT INTO driver_emergencies (
        emergency_ref, driver_id, latitude, longitude, address, 
        battery_level, emergency_type, status, notes, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', $8, NOW())
      RETURNING *
      `,
      [
        emergencyRef,
        driverId,
        latitude,
        longitude,
        address || "Current GPS Location",
        battery_level || null,
        emergency_type,
        notes || null
      ]
    );

    // Fetch driver details for socket broadcast
    const drvRes = await pool.query("SELECT name, phone, vehicle_plate FROM drivers WHERE id = $1", [driverId]);
    const driver = drvRes.rows[0] || {};

    // Create system notification for dispatch
    await pool.query(
      `
      INSERT INTO driver_notifications (driver_id, title, body, type, data, created_at)
      VALUES ($1, 'SOS Alert Broadcast Active', 'Your emergency alert has been sent to the Operations Dispatch Team with your live coordinates.', 'emergency', $2, NOW())
      `,
      [driverId, JSON.stringify({ emergency_ref: emergencyRef, latitude, longitude })]
    );

    // Live Socket.io broadcast to all admin dashboards & dispatch screens
    try {
      const { broadcastEmergencyAlert, broadcastNotification } = require("../services/socketService");
      broadcastEmergencyAlert({
        id: result.rows[0]?.id,
        emergency_ref: emergencyRef,
        driver_id: driverId,
        driver_name: driver.name,
        phone: driver.phone,
        vehicle_plate: driver.vehicle_plate,
        latitude,
        longitude,
        emergency_type,
        notes,
      });
      broadcastNotification({
        type: "security_event",
        title: `🚨 Driver SOS Alert: ${driver.name}`,
        message: `Driver ${driver.name} activated SOS (${emergency_type}). Immediate response required.`,
        severity: "critical",
        link: "/deliveries/telemetry",
      });
    } catch (_) {}

    res.status(201).json({
      status: "success",
      message: "🚨 Emergency SOS alert activated. Dispatch Operations team has been notified immediately.",
      emergency: result.rows[0],
      driver_contact: {
        name: driver.name,
        phone: driver.phone,
        vehicle_plate: driver.vehicle_plate
      }
    });
  } catch (err) {
    console.error("triggerEmergency error:", err.message);
    next(err);
  }
};

// ── POST /api/driver/emergency/:id/cancel ────────────────────────────
// Cancel SOS false alarm
const cancelEmergency = async (req, res, next) => {
  try {
    const driverId = req.driver.id;
    const { id } = req.params;

    const result = await pool.query(
      `
      UPDATE driver_emergencies
      SET 
        status = 'cancelled_false_alarm',
        resolved_at = NOW(),
        notes = CONCAT(COALESCE(notes, ''), ' [Cancelled by driver as false alarm]')
      WHERE (id = $1::bigint OR emergency_ref = $1) AND driver_id = $2
      RETURNING *
      `,
      [id, driverId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ status: "error", message: "Emergency record not found" });
    }

    res.json({
      status: "success",
      message: "Emergency SOS cancelled. Status marked as false alarm.",
      emergency: result.rows[0]
    });
  } catch (err) {
    console.error("cancelEmergency error:", err.message);
    next(err);
  }
};

module.exports = {
  triggerEmergency,
  cancelEmergency
};
