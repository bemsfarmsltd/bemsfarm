const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../db/pool");
const { protect } = require("../middleware/authMiddleware");
const { upsertContext, trackActivity } = require("../utils/aiContext");
const { sendPasswordResetEmail } = require("../services/emailService");
const validate = require("../middleware/validate");
const authSchemas = require("../schemas/authSchemas");

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("FATAL CONFIGURATION ERROR: JWT_SECRET environment variable is not defined!");
}
const REFRESH_SECRET = process.env.REFRESH_SECRET;
if (!REFRESH_SECRET) {
  throw new Error("FATAL CONFIGURATION ERROR: REFRESH_SECRET environment variable is not defined!");
}

// ─────────────────────────────────────────────
// TOKEN HELPERS
// ─────────────────────────────────────────────
function generateAccessToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role || "user",
      tokenVersion: user.token_version || 0,
    },
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
router.post("/register", validate(authSchemas.register), async (req, res, next) => {
  try {
    const { name, email, password, phone } = req.body;

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
    next(err);
  }
});

// ─────────────────────────────────────────────
// LOGIN
// ─────────────────────────────────────────────
router.post("/login", validate(authSchemas.login), async (req, res, next) => {
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
    next(err);
  }
});

// ─────────────────────────────────────────────
// GET ME  (Henry's AuthContext calls this on mount)
// Returns { user: {...} } — note the wrapper object
// ─────────────────────────────────────────────
router.get("/me", protect, async (req, res, next) => {
  try {
    // Fetch fresh user data from DB (don't rely on stale JWT payload)
    const result = await pool.query(
      `SELECT id, name, email, phone, role, avatar_url, store_id, status
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
        phone: user.phone || "",
        role: user.role,
        avatar_url: user.avatar_url || null,
        store_id: user.store_id || null,
        status: user.status,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────
// UPDATE PROFILE  (name / phone — the fields that are real DB columns)
// ─────────────────────────────────────────────
router.patch("/profile", protect, validate(authSchemas.updateProfile), async (req, res, next) => {
  try {
    const { name, phone } = req.body;
    const result = await pool.query(
      "UPDATE users SET name=$1, phone=$2, updated_at=NOW() WHERE id=$3 RETURNING id, name, email, phone",
      [name.trim(), phone || null, req.user.id],
    );
    res.json({ user: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────
// CHANGE PASSWORD  (logged-in user, knows their current password)
// ─────────────────────────────────────────────
router.post("/change-password", protect, validate(authSchemas.changePassword), async (req, res, next) => {
  try {
    const { current_password, new_password } = req.body;

    const result = await pool.query("SELECT password FROM users WHERE id=$1", [req.user.id]);
    if (!result.rows.length) {
      return res.status(404).json({ message: "User not found" });
    }

    const valid = await bcrypt.compare(current_password, result.rows[0].password);
    if (!valid) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }

    const hash = await bcrypt.hash(new_password, 12);
    await pool.query("UPDATE users SET password=$1, updated_at=NOW() WHERE id=$2", [hash, req.user.id]);

    res.json({ message: "Password updated successfully" });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────
// REFRESH TOKEN
// ─────────────────────────────────────────────
router.post("/refresh", async (req, res, next) => {
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
router.post("/logout", protect, async (req, res, next) => {
  await pool.query("UPDATE users SET refresh_token=NULL WHERE id=$1", [
    req.user.id,
  ]);
  res.clearCookie("refreshToken");
  res.json({ message: "Logged out" });
});

// ─────────────────────────────────────────────
// FORGOT PASSWORD
// ─────────────────────────────────────────────
router.post("/forgot-password", validate(authSchemas.forgotPassword), async (req, res, next) => {
  try {
    const { email } = req.body;

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

    const domain = process.env.FRONTEND_URL || "https://bemsfarms.com";
    const resetUrl = `${domain}/reset-password?token=${token}`;
    sendPasswordResetEmail({ email }, resetUrl).catch((err) =>
      console.error(`Password reset email failed for ${email}:`, err.message),
    );

    res.json({ message: "If that email exists, a reset link has been sent." });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────
// RESET PASSWORD
// ─────────────────────────────────────────────
router.post("/reset-password", validate(authSchemas.resetPassword), async (req, res, next) => {
  try {
    const { token, password } = req.body;

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
    // Bump token_version (invalidates every already-issued access token via
    // the check in protect()) and clear refresh_token (invalidates refresh
    // tokens too) so a stolen session can't survive a password reset.
    await pool.query(
      "UPDATE users SET password=$1, reset_token=NULL, reset_expires=NULL, token_version=token_version+1, refresh_token=NULL WHERE id=$2",
      [hash, decoded.id],
    );

    res.json({ message: "Password reset successful" });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────
// GOOGLE OAUTH
// ─────────────────────────────────────────────
const { OAuth2Client } = require("google-auth-library");

router.post("/google", validate(authSchemas.google), async (req, res, next) => {
  try {
    const { credential } = req.body;

    // ── GOOGLE TOKENINFO VERIFICATION ──
    // Query Google's tokeninfo endpoint to verify token signature and claims.
    // This host (oauth2.googleapis.com) is whitelisted for data center IP outbound traffic.
    const tokenInfoRes = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`
    );
    if (!tokenInfoRes.ok) {
      const errorMsg = await tokenInfoRes.text();
      return res.status(400).json({ 
        message: `Google token validation failed: ${tokenInfoRes.statusText}`,
        details: errorMsg 
      });
    }
    const payload = await tokenInfoRes.json();

    // Verify that the audience matches our configured Client ID or fallback
    const expectedClientId = process.env.GOOGLE_CLIENT_ID || "399237493446-uqgrc94dbsmb7jnm8rl7rfv97q0bi898.apps.googleusercontent.com";
    if (payload.aud !== expectedClientId) {
      console.error(`Google token audience mismatch. Expected: ${expectedClientId}, Got: ${payload.aud}`);
      return res.status(400).json({ message: "Google token audience mismatch" });
    }

    const { email, name, picture, sub: googleId } = payload;

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

module.exports = router;
