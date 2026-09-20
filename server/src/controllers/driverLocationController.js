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

    res.status(201).json({
      success: true,
      location: result.rows[0],
    });
  } catch (err) {
    console.error("Driver updateLocation error:", err.message);
    next(err);
  }
};

module.exports = {
  updateLocation,
};
