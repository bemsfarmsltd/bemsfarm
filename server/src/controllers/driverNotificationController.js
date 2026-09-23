// server/src/controllers/driverNotificationController.js
const pool = require("../db/pool");

// ── POST /api/driver/device-token ────────────────────────────────────
// Register / update device push notification token (Expo / FCM)
const registerDeviceToken = async (req, res, next) => {
  try {
    const driverId = req.driver.id;
    const { token, platform = "expo", device_info = {} } = req.body;

    if (!token || typeof token !== "string") {
      return res.status(400).json({ status: "error", message: "A valid device push token string is required" });
    }

    const cleanToken = token.trim();

    // Upsert into driver_device_tokens
    const result = await pool.query(
      `
      INSERT INTO driver_device_tokens (driver_id, token, platform, device_info, is_active, updated_at)
      VALUES ($1, $2, $3, $4, TRUE, NOW())
      ON CONFLICT (driver_id, token) 
      DO UPDATE SET 
        platform = EXCLUDED.platform,
        device_info = EXCLUDED.device_info,
        is_active = TRUE,
        updated_at = NOW()
      RETURNING *
      `,
      [driverId, cleanToken, platform, JSON.stringify(device_info)]
    );

    // Update primary token on driver record
    await pool.query(
      `UPDATE drivers SET fcm_token = $1, device_platform = $2, updated_at = NOW() WHERE id = $3`,
      [cleanToken, platform, driverId]
    );

    res.json({
      status: "success",
      message: "Device push token registered successfully",
      device: result.rows[0]
    });
  } catch (err) {
    console.error("registerDeviceToken error:", err.message);
    next(err);
  }
};

// ── GET /api/driver/notifications ────────────────────────────────────
// Fetch driver's in-app notification feed with pagination and unread count
const getNotifications = async (req, res, next) => {
  try {
    const driverId = req.driver.id;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    const unreadOnly = req.query.unread_only === "true";

    let countQuery = "SELECT COUNT(*) FROM driver_notifications WHERE driver_id = $1";
    let countParams = [driverId];

    if (unreadOnly) {
      countQuery += " AND is_read = FALSE";
    }

    const totalRes = await pool.query(countQuery, countParams);
    const total = parseInt(totalRes.rows[0].count) || 0;

    const unreadRes = await pool.query(
      "SELECT COUNT(*) FROM driver_notifications WHERE driver_id = $1 AND is_read = FALSE",
      [driverId]
    );
    const unreadCount = parseInt(unreadRes.rows[0].count) || 0;

    let fetchQuery = `
      SELECT id, title, body, type, data, is_read, read_at, created_at
      FROM driver_notifications
      WHERE driver_id = $1
    `;
    const fetchParams = [driverId];

    if (unreadOnly) {
      fetchQuery += " AND is_read = FALSE";
    }

    fetchQuery += ` ORDER BY created_at DESC LIMIT $${fetchParams.length + 1} OFFSET $${fetchParams.length + 2}`;
    fetchParams.push(limit, offset);

    const result = await pool.query(fetchQuery, fetchParams);

    res.json({
      status: "success",
      page,
      limit,
      total,
      unread_count: unreadCount,
      notifications: result.rows.map(n => ({
        ...n,
        id: parseInt(n.id, 10) || 0,
      }))
    });
  } catch (err) {
    console.error("getNotifications error:", err.message);
    next(err);
  }
};

// ── PATCH /api/driver/notifications/:id/read ─────────────────────────
// Mark single notification as read
const markNotificationRead = async (req, res, next) => {
  try {
    const driverId = req.driver.id;
    const { id } = req.params;

    const result = await pool.query(
      `
      UPDATE driver_notifications 
      SET is_read = TRUE, read_at = NOW()
      WHERE id = $1 AND driver_id = $2
      RETURNING *
      `,
      [id, driverId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ status: "error", message: "Notification not found" });
    }

    res.json({
      status: "success",
      message: "Notification marked as read",
      notification: result.rows[0]
    });
  } catch (err) {
    console.error("markNotificationRead error:", err.message);
    next(err);
  }
};

// ── PATCH /api/driver/notifications/read-all ─────────────────────────
// Mark all notifications as read for the driver
const markAllNotificationsRead = async (req, res, next) => {
  try {
    const driverId = req.driver.id;

    await pool.query(
      `
      UPDATE driver_notifications 
      SET is_read = TRUE, read_at = NOW()
      WHERE driver_id = $1 AND is_read = FALSE
      `,
      [driverId]
    );

    res.json({
      status: "success",
      message: "All notifications marked as read"
    });
  } catch (err) {
    console.error("markAllNotificationsRead error:", err.message);
    next(err);
  }
};

module.exports = {
  registerDeviceToken,
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead
};
