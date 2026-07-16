const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../db/pool");
const { protect } = require("../middleware/authMiddleware");
const { upsertContext, trackActivity } = require("../utils/aiContext");

const JWT_SECRET =
  process.env.JWT_SECRET || "frutella_super_secret_key_change_in_production";
const REFRESH_SECRET =
  process.env.REFRESH_SECRET || "frutella_refresh_secret_key";

// ─────────────────────────────────────────────
// TOKEN HELPERS
// ─────────────────────────────────────────────
function generateAccessToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role || "user" },
    JWT_SECRET,
    { expiresIn: "7d" },
  );
}

function generateRefreshToken(userId) {
  return jwt.sign({ id: userId }, REFRESH_SECRET, { expiresIn: "30d" });
}

// ─────────────────────────────────────────────
// REGISTER  (BemsFarms customer app)
// ─────────────────────────────────────────────
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;
    if (!name?.trim())
      return res.status(400).json({ message: "Name is required" });
    if (!email?.includes("@"))
      return res.status(400).json({ message: "Valid email required" });
    if (!phone?.trim())
      return res.status(400).json({ message: "Phone number is required" });
    if (!password || password.length < 6)
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters" });

    const existing = await pool.query(
      "SELECT id FROM users WHERE LOWER(email) = LOWER($1)",
      [email],
    );
    if (existing.rows.length > 0)
      return res.status(400).json({ message: "Email already exists" });

    const hashedPw = await bcrypt.hash(password, 12);
    const result = await pool.query(
      `INSERT INTO users (name, email, password, phone, role, created_at)
       VALUES ($1, $2, $3, $4, 'user', NOW())
       RETURNING id, name, email, phone, role`,
      [name.trim(), email.toLowerCase().trim(), hashedPw, phone.trim()],
    );

    const user = result.rows[0];
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user.id);

    await pool.query("UPDATE users SET refresh_token=$1 WHERE id=$2", [
      refreshToken,
      user.id,
    ]);

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    // Seed AI context record for new user (fire-and-forget)
    upsertContext(user.id, {
      full_name:    user.name,
      email:        user.email,
      phone:        user.phone,
      role:         user.role,
      registered_at: new Date().toISOString(),
      last_login:   new Date().toISOString(),
    });
    trackActivity(user.id, "registered", { ip: req.ip });

    res.status(201).json({ token: accessToken, user });
  } catch (err) {
    res.status(500).json({ message: "Registration failed: " + err.message });
  }
});

// ─────────────────────────────────────────────
// LOGIN
// ─────────────────────────────────────────────
router.post("/login", async (req, res) => {
  const clientIP = req.ip || req.connection?.remoteAddress || "unknown";
  const userAgent = req.headers["user-agent"] || "unknown";
  const origin =
    req.headers["origin"] || req.headers["referer"] || "mobile/unknown";

  console.log(`\n🔐 LOGIN ATTEMPT`);
  console.log(`   IP:         ${clientIP}`);
  console.log(`   Origin:     ${origin}`);
  console.log(`   User-Agent: ${userAgent.substring(0, 80)}`);
  console.log(
    `   Body keys:  ${Object.keys(req.body || {}).join(", ") || "EMPTY"}`,
  );

  try {
    const { email, password } = req.body;

    if (!email || !password) {
      console.log(`   ❌ FAILED — missing fields`);
      return res.status(400).json({ message: "Email and password required" });
    }

    console.log(`   Email: ${email.trim().toLowerCase()}`);

    const result = await pool.query(
      "SELECT * FROM users WHERE LOWER(email) = LOWER($1)",
      [email.trim()],
    );
    const user = result.rows[0];

    if (!user) {
      console.log(`   ❌ FAILED — no user found`);
      return res.status(401).json({ message: "Invalid credentials" });
    }

    console.log(`   ✅ User found — id: ${user.id}, role: ${user.role}`);

    // Check account status
    if (user.status === "suspended") {
      console.log(`   ❌ FAILED — account suspended`);
      return res
        .status(403)
        .json({ message: "Account suspended. Contact support." });
    }
    if (user.status === "inactive") {
      console.log(`   ❌ FAILED — account inactive`);
      return res
        .status(403)
        .json({ message: "Account inactive. Contact support." });
    }

    // Check lockout
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      console.log(`   ❌ FAILED — account locked until ${user.locked_until}`);
      return res
        .status(403)
        .json({ message: "Account temporarily locked. Try again later." });
    }

    const valid = await bcrypt.compare(password, user.password);

    if (!valid) {
      // Increment failed attempts
      const attempts = (user.failed_login_attempts || 0) + 1;
      const lockUntil =
        attempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null;
      await pool.query(
        "UPDATE users SET failed_login_attempts=$1, locked_until=$2 WHERE id=$3",
        [attempts, lockUntil, user.id],
      );
      console.log(`   ❌ FAILED — wrong password (attempt ${attempts})`);
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Reset failed attempts on success
    await pool.query(
      "UPDATE users SET failed_login_attempts=0, locked_until=NULL WHERE id=$1",
      [user.id],
    );

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user.id);

    await pool.query(
      "UPDATE users SET refresh_token=$1, last_login=NOW() WHERE id=$2",
      [refreshToken, user.id],
    );

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    // ── Build user object matching Henry's AuthContext expectations ──
    // Henry uses: user.first_name, user.last_name, user.email, user.role
    // Your DB has: user.name (full name)
    // We split name into first/last for compatibility
    const nameParts = (user.name || "").trim().split(" ");
    const userPayload = {
      id: user.id,
      name: user.name,
      first_name: nameParts[0] || "",
      last_name: nameParts.slice(1).join(" ") || "",
      email: user.email,
      role: user.role,
      avatar_url: user.avatar_url || null,
      store_id: user.store_id || null,
      status: user.status,
    };

    console.log(
      `   ✅ LOGIN SUCCESS — user: ${user.email}, role: ${user.role}\n`,
    );

    // Sync AI context (fire-and-forget — never blocks login response)
    upsertContext(user.id, {
      full_name:  user.name,
      email:      user.email,
      phone:      user.phone || null,
      role:       user.role,
      last_login: new Date().toISOString(),
    });
    trackActivity(user.id, "login", { ip: clientIP, metadata: { origin } });

    res.json({ token: accessToken, user: userPayload });
  } catch (err) {
    console.error(`   💥 LOGIN ERROR — ${err.message}`);
    res.status(500).json({ message: "Login failed: " + err.message });
  }
});

// ─────────────────────────────────────────────
// GET ME  (Henry's AuthContext calls this on mount)
// Returns { user: {...} } — note the wrapper object
// ─────────────────────────────────────────────
router.get("/me", protect, async (req, res) => {
  try {
    // Fetch fresh user data from DB (don't rely on stale JWT payload)
    const result = await pool.query(
      `SELECT id, name, email, role, avatar_url, store_id, status
       FROM users WHERE id = $1`,
      [req.user.id],
    );

    if (!result.rows.length) {
      return res.status(404).json({ message: "User not found" });
    }

    const user = result.rows[0];

    if (user.status !== "active") {
      return res.status(403).json({ message: "Account is not active" });
    }

    const nameParts = (user.name || "").trim().split(" ");

    // Return { user: {...} } — matches Henry's: res.data.user
    res.json({
      user: {
        id: user.id,
        name: user.name,
        first_name: nameParts[0] || "",
        last_name: nameParts.slice(1).join(" ") || "",
        email: user.email,
        role: user.role,
        avatar_url: user.avatar_url || null,
        store_id: user.store_id || null,
        status: user.status,
      },
    });
  } catch (err) {
    res.status(500).json({ message: "Could not fetch user: " + err.message });
  }
});

// ─────────────────────────────────────────────
// REFRESH TOKEN
// ─────────────────────────────────────────────
router.post("/refresh", async (req, res) => {
  try {
    const token = req.cookies?.refreshToken;
    if (!token) return res.status(401).json({ message: "No refresh token" });

    let decoded;
    try {
      decoded = jwt.verify(token, REFRESH_SECRET);
    } catch {
      return res.status(401).json({ message: "Invalid refresh token" });
    }

    const result = await pool.query(
      "SELECT id, name, email, role FROM users WHERE id=$1 AND refresh_token=$2",
      [decoded.id, token],
    );
    if (!result.rows.length)
      return res.status(401).json({ message: "Refresh token invalid" });

    const user = result.rows[0];
    const newAccess = generateAccessToken(user);
    const newRefresh = generateRefreshToken(user.id);

    await pool.query("UPDATE users SET refresh_token=$1 WHERE id=$2", [
      newRefresh,
      user.id,
    ]);

    res.cookie("refreshToken", newRefresh, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    res.json({ token: newAccess });
  } catch (err) {
    res.status(401).json({ message: "Refresh failed: " + err.message });
  }
});

// ─────────────────────────────────────────────
// LOGOUT
// ─────────────────────────────────────────────
router.post("/logout", protect, async (req, res) => {
  await pool.query("UPDATE users SET refresh_token=NULL WHERE id=$1", [
    req.user.id,
  ]);
  res.clearCookie("refreshToken");
  res.json({ message: "Logged out" });
});

// ─────────────────────────────────────────────
// FORGOT PASSWORD
// ─────────────────────────────────────────────
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email required" });

    const result = await pool.query(
      "SELECT id FROM users WHERE LOWER(email) = LOWER($1)",
      [email],
    );

    // Always return success to prevent email enumeration
    if (!result.rows.length)
      return res.json({
        message: "If that email exists, a reset link has been sent.",
      });

    const token = jwt.sign({ id: result.rows[0].id }, JWT_SECRET, {
      expiresIn: "1h",
    });
    const expires = new Date(Date.now() + 60 * 60 * 1000);

    await pool.query(
      "UPDATE users SET reset_token=$1, reset_expires=$2 WHERE id=$3",
      [token, expires, result.rows[0].id],
    );

    // TODO: send email with reset link
    console.log(`🔑 Password reset token for ${email}: ${token}`);

    res.json({ message: "If that email exists, a reset link has been sent." });
  } catch (err) {
    res.status(500).json({ message: "Failed: " + err.message });
  }
});

// ─────────────────────────────────────────────
// RESET PASSWORD
// ─────────────────────────────────────────────
router.post("/reset-password", async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password)
      return res.status(400).json({ message: "Token and password required" });

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    const result = await pool.query(
      "SELECT id FROM users WHERE id=$1 AND reset_token=$2 AND reset_expires > NOW()",
      [decoded.id, token],
    );
    if (!result.rows.length)
      return res
        .status(400)
        .json({ message: "Invalid or expired reset token" });

    const hash = await bcrypt.hash(password, 12);
    await pool.query(
      "UPDATE users SET password=$1, reset_token=NULL, reset_expires=NULL WHERE id=$2",
      [hash, decoded.id],
    );

    res.json({ message: "Password reset successful" });
  } catch (err) {
    res.status(500).json({ message: "Failed: " + err.message });
  }
});

// ─────────────────────────────────────────────
// GOOGLE OAUTH
// ─────────────────────────────────────────────
const { OAuth2Client } = require("google-auth-library");

router.post("/google", async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential)
      return res.status(400).json({ message: "Google credential required" });

    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const { email, name, picture, sub: googleId } = ticket.getPayload();

    if (!email)
      return res
        .status(400)
        .json({ message: "Could not get email from Google" });

    let userResult = await pool.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);
    let user;

    if (userResult.rows.length > 0) {
      user = userResult.rows[0];
    } else {
      const newUser = await pool.query(
        `INSERT INTO users (name, email, password, role, google_id, avatar_url, created_at)
         VALUES ($1, $2, 'GOOGLE_AUTH', 'user', $3, $4, NOW())
         RETURNING id, name, email, role`,
        [name || email.split("@")[0], email, googleId, picture || null],
      );
      user = newUser.rows[0];
    }

    const token = generateAccessToken(user);
    const nameParts = (user.name || "").trim().split(" ");

    res.json({
      message: "Google authentication successful",
      token,
      user: {
        id: user.id,
        name: user.name,
        first_name: nameParts[0] || "",
        last_name: nameParts.slice(1).join(" ") || "",
        email: user.email,
        role: user.role,
        avatar_url: user.avatar_url || null,
      },
    });
  } catch (err) {
    console.error("❌ Google auth error:", err.message);
    res
      .status(500)
      .json({ message: "Google authentication failed: " + err.message });
  }
});

// ─────────────────────────────────────────────
// RESET ADMIN PASSWORD (one-time utility)
// Move to a standalone script — do not leave in production routes
// ─────────────────────────────────────────────
router.post("/reset-admin", async (req, res) => {
  try {
    const { secret, email, password } = req.body;
    if (secret !== process.env.ADMIN_RESET_SECRET)
      return res.status(403).json({ message: "Forbidden" });
    const hash = await bcrypt.hash(password, 12);
    await pool.query("UPDATE users SET password=$1 WHERE email=$2", [
      hash,
      email,
    ]);
    res.json({ message: "Password updated" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Temporary debugging route to test Google certs fetches on Render
router.get("/test-google-fetch", async (req, res) => {
  const results = {};
  
  // Test 1: Standard fetch
  try {
    const response = await fetch("https://www.googleapis.com/oauth2/v1/certs");
    results.standardFetch = {
      status: response.status,
      body: (await response.text()).substring(0, 150),
    };
  } catch (err) {
    results.standardFetch = { error: err.message };
  }

  // Test 2: Fetch with custom User-Agent
  try {
    const response = await fetch("https://www.googleapis.com/oauth2/v1/certs", {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      }
    });
    results.userAgentFetch = {
      status: response.status,
      body: (await response.text()).substring(0, 150),
    };
  } catch (err) {
    results.userAgentFetch = { error: err.message };
  }

  // Test 3: Fetch using DNS lookup family v4 explicitly
  try {
    const https = require("https");
    const dns = require("dns");
    
    // Perform standard dns lookup to see what addresses we resolve
    const lookupRes = await new Promise((resolve) => {
      dns.lookup("www.googleapis.com", { all: true }, (err, addresses) => {
        resolve(err ? { error: err.message } : addresses);
      });
    });
    results.dnsLookupAddresses = lookupRes;
  } catch (err) {
    results.dnsLookupAddresses = { error: err.message };
  }

  // Test 4: Verify if dns.setDefaultResultOrder actually is set
  try {
    const dns = require("dns");
    results.dnsOrder = dns.getDefaultResultOrder ? dns.getDefaultResultOrder() : "unknown";
  } catch (err) {
    results.dnsOrder = { error: err.message };
  }

  res.json(results);
});

module.exports = router;
