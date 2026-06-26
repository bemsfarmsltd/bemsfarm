const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../db/pool");
const { protect } = require("../middleware/authMiddleware");

const JWT_SECRET =
  process.env.JWT_SECRET || "frutella_super_secret_key_change_in_production";

const REFRESH_SECRET =
  process.env.REFRESH_SECRET || "frutella_refresh_secret_key";

// ─────────────────────────────────────────────
// TOKEN HELPERS
// ─────────────────────────────────────────────
function generateAccessToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role || "user",
    },
    JWT_SECRET,
    { expiresIn: "7d" },
  );
}

function generateRefreshToken(userId) {
  return jwt.sign({ id: userId }, REFRESH_SECRET, {
    expiresIn: "30d",
  });
}

// ─────────────────────────────────────────────
// REGISTER
// ─────────────────────────────────────────────
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name?.trim())
      return res.status(400).json({ message: "Name is required" });

    if (!email?.includes("@"))
      return res.status(400).json({ message: "Valid email required" });

    if (!password || password.length < 6)
      return res.status(400).json({
        message: "Password must be at least 6 characters",
      });

    const existing = await pool.query(
      "SELECT id FROM users WHERE LOWER(email) = LOWER($1)",
      [email],
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({
        message: "Email already exists",
      });
    }

    const hashedPw = await bcrypt.hash(password, 12);

    const result = await pool.query(
      `INSERT INTO users (name, email, password, role, created_at)
       VALUES ($1, $2, $3, 'user', NOW())
       RETURNING id, name, email, role`,
      [name.trim(), email.toLowerCase().trim(), hashedPw],
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

    res.status(201).json({
      token: accessToken,
      user,
    });
  } catch (err) {
    res.status(500).json({
      message: "Registration failed: " + err.message,
    });
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
    `   Body keys:  ${Object.keys(req.body || {}).join(", ") || "EMPTY — possible Content-Type issue"}`,
  );

  try {
    const { email, password } = req.body;

    // ── Missing fields ────────────────────────────────────────
    if (!email || !password) {
      console.log(
        `   ❌ FAILED — missing fields (email: ${!!email}, password: ${!!password})`,
      );
      console.log(
        `   → Likely cause: mobile app not sending Content-Type: application/json`,
      );
      return res.status(400).json({
        message: "Email and password required",
        hint: "Ensure Content-Type: application/json header is set",
      });
    }

    console.log(`   Email: ${email.trim().toLowerCase()}`);

    // ── User lookup ───────────────────────────────────────────
    const result = await pool.query(
      "SELECT * FROM users WHERE LOWER(email) = LOWER($1)",
      [email.trim()],
    );

    const user = result.rows[0];

    if (!user) {
      console.log(
        `   ❌ FAILED — no user found for email: ${email.trim().toLowerCase()}`,
      );
      return res.status(401).json({ message: "Invalid credentials" });
    }

    console.log(`   ✅ User found — id: ${user.id}, role: ${user.role}`);

    // ── Password check ────────────────────────────────────────
    const valid = await bcrypt.compare(password, user.password);

    if (!valid) {
      console.log(`   ❌ FAILED — wrong password for user id: ${user.id}`);
      return res.status(401).json({ message: "Invalid credentials" });
    }

    console.log(`   ✅ Password valid`);

    // ── Generate tokens ───────────────────────────────────────
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

    console.log(
      `   ✅ LOGIN SUCCESS — user: ${user.email}, role: ${user.role}\n`,
    );

    res.json({
      token: accessToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error(`   💥 LOGIN ERROR — ${err.message}`);
    console.error(err.stack);
    res.status(500).json({ message: "Login failed: " + err.message });
  }
});

// ─────────────────────────────────────────────
// REFRESH TOKEN
// ─────────────────────────────────────────────
router.post("/refresh", async (req, res) => {
  try {
    const token = req.cookies?.refreshToken;

    if (!token) {
      return res.status(401).json({ message: "No refresh token" });
    }

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

    if (!result.rows.length) {
      return res.status(401).json({
        message: "Refresh token invalid",
      });
    }

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
    res.status(401).json({
      message: "Refresh failed: " + err.message,
    });
  }
});

// ─────────────────────────────────────────────
// GET ME
// ─────────────────────────────────────────────
router.get("/me", protect, (req, res) => {
  res.json(req.user);
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

const { OAuth2Client } = require("google-auth-library");

router.post("/google", async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) {
      return res.status(400).json({ message: "Google credential required" });
    }

    // Verify the Google ID token
    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();

    const { email, name, picture, sub: googleId } = payload;
    if (!email) {
      return res
        .status(400)
        .json({ message: "Could not get email from Google" });
    }

    // Check if user already exists
    let userResult = await pool.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);

    let user;
    if (userResult.rows.length > 0) {
      // Existing user — log them in
      user = userResult.rows[0];
    } else {
      // New user — create account
      const newUser = await pool.query(
        `INSERT INTO users (name, email, password, role, google_id, avatar_url, created_at)
         VALUES ($1, $2, $3, 'user', $4, $5, NOW())
         RETURNING id, name, email, role`,
        [
          name || email.split("@")[0],
          email,
          "GOOGLE_AUTH", // No password for Google users
          googleId,
          picture || null,
        ],
      );
      user = newUser.rows[0];
    }

    // TEMPORARY — remove after use
    router.post("/reset-admin", async (req, res) => {
      const bcrypt = require("bcryptjs");
      const hash = await bcrypt.hash("BemsFarms2026!", 12);
      await pool.query("UPDATE users SET password = $1 WHERE email = $2", [
        hash,
        "est0295@gmail.com",
      ]);
      res.json({ message: "Password reset" });
    });

    // Generate JWT — same as your regular login
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );

    res.json({
      message: "Google authentication successful",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      token,
    });
  } catch (err) {
    console.error("❌ Google auth error:", err.message);
    if (err.message?.includes("Token used too late")) {
      return res
        .status(401)
        .json({ message: "Google token expired. Please try again." });
    }
    res
      .status(500)
      .json({ message: "Google authentication failed: " + err.message });
  }
});

module.exports = router;
