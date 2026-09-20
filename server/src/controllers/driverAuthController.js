const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../db/pool");

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("FATAL CONFIGURATION ERROR: JWT_SECRET environment variable is not defined!");
}

function generateDriverToken(driver) {
  return jwt.sign(
    {
      id: driver.id,
      phone: driver.phone,
      email: driver.email,
      role: "driver",
    },
    JWT_SECRET,
    { expiresIn: "30d" }
  );
}

// ── POST /api/driver/auth/login ─────────────────────────────────────
const login = async (req, res, next) => {
  try {
    const { emailOrPhone, email, phone, password } = req.body;
    const identifier = (emailOrPhone || email || phone || "").trim();

    if (!identifier || !password) {
      return res.status(400).json({ message: "Phone number/email and password are required" });
    }

    // Find driver by email or phone
    const driverResult = await pool.query(
      `
      SELECT 
        d.id,
        d.name,
        d.email,
        d.phone,
        d.avatar_url,
        d.vehicle_type,
        d.vehicle_plate,
        d.primary_zone_id AS zone_id,
        d.rating,
        d.total_deliveries,
        d.success_rate,
        d.total_earnings,
        d.commission_per_delivery,
        d.status,
        d.license_number,
        d.bank_name,
        d.account_number,
        d.account_name,
        COALESCE(da.is_available, d.is_available, true) AS is_available,
        COALESCE(da.is_on_delivery, false) AS is_on_delivery
      FROM drivers d
      LEFT JOIN driver_availability da ON d.id = da.driver_id
      WHERE LOWER(d.email) = LOWER($1) OR d.phone = $1 OR d.phone = $2
      LIMIT 1
      `,
      [identifier, identifier.replace(/\s+/g, "")]
    );

    if (driverResult.rows.length === 0) {
      return res.status(401).json({ message: "Invalid credentials — driver account not found" });
    }

    const driver = driverResult.rows[0];

    if (String(driver.status).toLowerCase() === "suspended") {
      return res.status(403).json({ message: "Account is suspended. Please contact dispatch/admin." });
    }

    // Check credentials in driver_auth
    const authResult = await pool.query(
      "SELECT * FROM driver_auth WHERE driver_id = $1",
      [driver.id]
    );

    if (authResult.rows.length === 0) {
      // If admin hasn't set an explicit password yet, check if driver password matches phone or default
      return res.status(401).json({
        message: "Driver credentials not set by administrator. Please contact your dispatch manager.",
      });
    }

    const authRecord = authResult.rows[0];

    // Check if account is temporarily locked
    if (authRecord.locked_until && new Date(authRecord.locked_until) > new Date()) {
      return res.status(403).json({
        message: "Account temporarily locked due to failed attempts. Please try again later.",
      });
    }

    const isMatch = await bcrypt.compare(password, authRecord.password_hash);
    if (!isMatch) {
      await pool.query(
        "UPDATE driver_auth SET failed_attempts = failed_attempts + 1 WHERE id = $1",
        [authRecord.id]
      );
      return res.status(401).json({ message: "Invalid phone/email or password" });
    }

    // Successful login - reset failed attempts and update last_login
    await pool.query(
      "UPDATE driver_auth SET failed_attempts = 0, last_login = NOW() WHERE id = $1",
      [authRecord.id]
    );

    const token = generateDriverToken(driver);

    res.json({
      token,
      driver,
      message: "Login successful",
    });
  } catch (err) {
    console.error("Driver login error:", err.message);
    next(err);
  }
};

// ── GET /api/driver/auth/me ─────────────────────────────────────────
const getMe = async (req, res, next) => {
  try {
    const driver = req.driver;
    res.json({
      driver,
    });
  } catch (err) {
    next(err);
  }
};

// ── PATCH /api/driver/auth/profile ──────────────────────────────────
const updateProfile = async (req, res, next) => {
  try {
    const driverId = req.driver.id;
    const { phone, email, avatar_url, photo, bank_name, account_number, account_name } = req.body;

    const updates = [];
    const params = [];

    if (phone !== undefined) {
      params.push(phone.trim());
      updates.push(`phone = $${params.length}`);
    }
    if (email !== undefined) {
      params.push(email.trim().toLowerCase());
      updates.push(`email = $${params.length}`);
    }
    if (avatar_url !== undefined || photo !== undefined) {
      params.push(avatar_url || photo);
      updates.push(`avatar_url = $${params.length}`);
    }
    if (bank_name !== undefined) {
      params.push(bank_name.trim());
      updates.push(`bank_name = $${params.length}`);
    }
    if (account_number !== undefined) {
      params.push(account_number.trim());
      updates.push(`account_number = $${params.length}`);
    }
    if (account_name !== undefined) {
      params.push(account_name.trim());
      updates.push(`account_name = $${params.length}`);
    }

    if (updates.length === 0) {
      return res.status(400).json({ message: "No profile fields to update" });
    }

    params.push(driverId);
    const sql = `
      UPDATE drivers 
      SET ${updates.join(", ")}, updated_at = NOW()
      WHERE id = $${params.length}
      RETURNING 
        id, name, email, phone, avatar_url, vehicle_type, 
        vehicle_plate, primary_zone_id AS zone_id, rating, 
        total_deliveries, success_rate, total_earnings, 
        commission_per_delivery, status, license_number,
        bank_name, account_number, account_name
    `;

    const result = await pool.query(sql, params);
    res.json({
      driver: {
        ...result.rows[0],
        is_available: req.driver.is_available,
        is_on_delivery: req.driver.is_on_delivery,
      },
      message: "Profile updated successfully",
    });
  } catch (err) {
    console.error("Driver updateProfile error:", err.message);
    next(err);
  }
};

// ── PATCH /api/driver/availability ───────────────────────────────────
const toggleAvailability = async (req, res, next) => {
  try {
    const driverId = req.driver.id;
    let { is_available } = req.body;

    if (is_available === undefined) {
      // Toggle current status if not specified
      is_available = !req.driver.is_available;
    } else {
      is_available = Boolean(is_available);
    }

    // Upsert into driver_availability
    await pool.query(
      `
      INSERT INTO driver_availability (driver_id, is_available, last_toggled_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (driver_id)
      DO UPDATE SET is_available = $2, last_toggled_at = NOW()
      `,
      [driverId, is_available]
    );

    // Also sync drivers table status / is_available
    const newStatus = is_available ? "active" : "off_duty";
    await pool.query(
      "UPDATE drivers SET is_available = $1, status = CASE WHEN status = 'suspended' THEN 'suspended' ELSE $2 END, updated_at = NOW() WHERE id = $3",
      [is_available, newStatus, driverId]
    );

    res.json({
      is_available,
      status: req.driver.status === "suspended" ? "suspended" : newStatus,
      message: is_available ? "Driver is now ONLINE and ready for orders" : "Driver is now OFFLINE",
    });
  } catch (err) {
    console.error("Driver toggleAvailability error:", err.message);
    next(err);
  }
};

module.exports = {
  login,
  getMe,
  updateProfile,
  toggleAvailability,
};
