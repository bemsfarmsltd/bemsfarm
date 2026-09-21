const jwt = require("jsonwebtoken");
const pool = require("../db/pool");

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("FATAL CONFIGURATION ERROR: JWT_SECRET environment variable is not defined!");
}

const driverProtect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization?.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    } else if (req.cookies?.driverToken || req.cookies?.token) {
      token = req.cookies.driverToken || req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({ message: "Not authorized — no driver token provided" });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (jwtErr) {
      if (jwtErr.name === "TokenExpiredError") {
        return res.status(401).json({ message: "Token expired", code: "TOKEN_EXPIRED" });
      }
      return res.status(401).json({ message: "Invalid driver token" });
    }

    if (decoded.role && decoded.role !== "driver") {
      return res.status(403).json({ message: "Access denied — driver credentials required" });
    }

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
        d.onboarding_status,
        d.license_number,
        d.nin_number,
        d.address,
        d.bank_name,
        d.account_number,
        d.account_name,
        d.documents,
        d.compliance_notes,
        d.wallet_account_number,
        d.wallet_bank_name,
        d.wallet_account_name,
        COALESCE(da.is_available, d.is_available, false) AS is_available,
        COALESCE(da.is_on_delivery, false) AS is_on_delivery
      FROM drivers d
      LEFT JOIN driver_availability da ON d.id = da.driver_id
      WHERE d.id = $1
      `,
      [decoded.id]
    );

    if (driverResult.rows.length === 0) {
      return res.status(401).json({ message: "Driver account not found" });
    }

    const driver = driverResult.rows[0];

    const status = String(driver.status || "active").toLowerCase().trim();
    if (status === "suspended") {
      return res.status(403).json({ message: "Driver account is suspended. Please contact administrator." });
    }

    req.driver = driver;
    next();
  } catch (err) {
    console.error("Driver auth middleware error:", err.message);
    res.status(401).json({ message: "Driver authorization failed" });
  }
};

module.exports = { driverProtect };
