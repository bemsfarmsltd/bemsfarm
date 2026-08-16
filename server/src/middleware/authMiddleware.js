const jwt = require("jsonwebtoken");
const pool = require("../db/pool");

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("FATAL CONFIGURATION ERROR: JWT_SECRET environment variable is not defined!");
}

// ── protect ───────────────────────────────────────────────────────
// Validates JWT and attaches req.user
const protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization?.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    } else if (req.cookies?.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return res
        .status(401)
        .json({ message: "Not authorized — no token provided" });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (jwtErr) {
      if (jwtErr.name === "TokenExpiredError") {
        return res
          .status(401)
          .json({ message: "Token expired", code: "TOKEN_EXPIRED" });
      }
      return res.status(401).json({ message: "Invalid token" });
    }

    const result = await pool.query(
      "SELECT id, name, email, role, status, token_version FROM users WHERE id = $1",
      [decoded.id],
    );

    if (!result.rows.length) {
      return res.status(401).json({ message: "User not found" });
    }

    if (result.rows[0].status === "suspended") {
      return res.status(403).json({ message: "Account suspended" });
    }
    if (result.rows[0].status === "inactive") {
      return res.status(403).json({ message: "Account deactivated" });
    }

    // Tokens issued before this field existed carry no tokenVersion claim —
    // treat that as version 0 so already-issued valid sessions aren't broken
    // by this rollout. Any token minted after a password reset always carries
    // an explicit tokenVersion, so the check below still catches those.
    const tokenVersion = decoded.tokenVersion || 0;
    if (tokenVersion !== result.rows[0].token_version) {
      return res.status(401).json({
        message: "Session invalidated — please log in again",
        code: "TOKEN_REVOKED",
      });
    }

    req.user = result.rows[0];
    next();
  } catch (err) {
    console.error("Auth middleware error:", err.message);
    res.status(401).json({ message: "Authorization failed" });
  }
};

// ── requireRole ───────────────────────────────────────────────────
// Usage: router.get('/route', protect, requireRole('superadmin','manager'), handler)
const requireRole =
  (...roles) =>
  (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Access denied. Required role: ${roles.join(" or ")}`,
      });
    }
    next();
  };

// ── adminOnly ─────────────────────────────────────────────────────
// Legacy — kept for backward compat with existing routes
// Allows: superadmin, admin, manager
const adminOnly = (req, res, next) => {
  const allowed = ["superadmin", "admin", "manager"];
  if (!allowed.includes(req.user?.role)) {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
};

// ── superadminOnly ────────────────────────────────────────────────
const superadminOnly = (req, res, next) => {
  if (req.user?.role !== "superadmin") {
    return res.status(403).json({ message: "Superadmin access required" });
  }
  next();
};

module.exports = { protect, requireRole, adminOnly, superadminOnly };
