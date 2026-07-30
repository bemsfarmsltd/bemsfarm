const pool = require("../db/pool");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const emailService = require("../services/emailService");

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("FATAL CONFIGURATION ERROR: JWT_SECRET environment variable is not defined!");
}
const REFRESH_SECRET = process.env.REFRESH_SECRET;
if (!REFRESH_SECRET) {
  throw new Error("FATAL CONFIGURATION ERROR: REFRESH_SECRET environment variable is not defined!");
}
const JWT_EXPIRES = "15m";
const REFRESH_EXPIRES = "7d";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

// ── Helper: generate tokens ──────────────────────────────────
function generateTokens(user) {
  const accessToken = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES },
  );
  const refreshToken = jwt.sign(
    { id: user.id },
    REFRESH_SECRET,
    { expiresIn: REFRESH_EXPIRES },
  );
  return { accessToken, refreshToken };
}

// ── REGISTER ─────────────────────────────────────────────────
const register = async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    // Validation
    if (!name || name.trim().length < 2)
      return res
        .status(400)
        .json({ message: "Name must be at least 2 characters" });
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return res.status(400).json({ message: "Invalid email address" });
    if (!password || password.length < 8)
      return res
        .status(400)
        .json({ message: "Password must be at least 8 characters" });
    if (!/(?=.*[A-Z])/.test(password))
      return res
        .status(400)
        .json({
          message: "Password must contain at least one uppercase letter",
        });
    if (!/(?=.*\d)/.test(password))
      return res
        .status(400)
        .json({ message: "Password must contain at least one number" });
    if (!/(?=.*[!@#$%^&*])/.test(password))
      return res
        .status(400)
        .json({
          message:
            "Password must contain at least one special character (!@#$%^&*)",
        });

    // Check existing
    const existing = await pool.query("SELECT id FROM users WHERE email = $1", [
      email.toLowerCase(),
    ]);
    if (existing.rows.length > 0)
      return res
        .status(400)
        .json({ message: "An account with this email already exists" });

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Verification token
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // Insert user
    const result = await pool.query(
      `INSERT INTO users (name, email, password, phone, role, email_verified, verification_token, verification_expires)
       VALUES ($1, $2, $3, $4, 'user', false, $5, $6) RETURNING id, name, email, role`,
      [
        name.trim(),
        email.toLowerCase(),
        hashedPassword,
        phone || null,
        verificationToken,
        verificationExpires,
      ],
    );
    const user = result.rows[0];

    // Send verification email
    const verifyUrl = `${FRONTEND_URL}/verify-email?token=${verificationToken}`;
    try {
      await emailService.sendWelcomeEmail(user, verifyUrl);
    } catch (emailErr) {
      console.error("Email send failed:", emailErr.message);
      // Don't fail registration if email fails
    }

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user);
    await pool.query(
      "UPDATE users SET refresh_token=$1, last_login=NOW() WHERE id=$2",
      [refreshToken, user.id],
    );

    // Set refresh token as httpOnly cookie
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(201).json({
      message:
        "Account created! Please check your email to verify your account.",
      token: accessToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("Register error:", err.message);
    res.status(500).json({ message: "Registration failed. Please try again." });
  }
};

// ── LOGIN ────────────────────────────────────────────────────
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res
        .status(400)
        .json({ message: "Email and password are required" });

    const result = await pool.query("SELECT * FROM users WHERE email = $1", [
      email.toLowerCase(),
    ]);
    const user = result.rows[0];

    if (!user)
      return res.status(401).json({ message: "Invalid email or password" });

    // Check if account is locked
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      const minutesLeft = Math.ceil(
        (new Date(user.locked_until) - new Date()) / 60000,
      );
      return res.status(423).json({
        message: `Account locked due to too many failed attempts. Try again in ${minutesLeft} minutes.`,
      });
    }

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      // Increment failed attempts
      const newAttempts = (user.failed_login_attempts || 0) + 1;
      const lockUntil =
        newAttempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null;
      await pool.query(
        "UPDATE users SET failed_login_attempts=$1, locked_until=$2 WHERE id=$3",
        [newAttempts, lockUntil, user.id],
      );
      const remaining = 5 - newAttempts;
      return res.status(401).json({
        message:
          remaining > 0
            ? `Invalid password. ${remaining} attempt${remaining !== 1 ? "s" : ""} remaining before lockout.`
            : "Account locked for 15 minutes due to too many failed attempts.",
      });
    }

    // Reset failed attempts on success
    const { accessToken, refreshToken } = generateTokens(user);
    await pool.query(
      "UPDATE users SET failed_login_attempts=0, locked_until=NULL, refresh_token=$1, last_login=NOW() WHERE id=$2",
      [refreshToken, user.id],
    );

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

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
    console.error("Login error:", err.message);
    res.status(500).json({ message: "Login failed. Please try again." });
  }
};

// ── REFRESH TOKEN ────────────────────────────────────────────
const refreshToken = async (req, res) => {
  try {
    const token = req.cookies.refreshToken;
    if (!token) return res.status(401).json({ message: "No refresh token" });

    const decoded = jwt.verify(
      token,
      REFRESH_SECRET,
    );
    const result = await pool.query(
      "SELECT * FROM users WHERE id=$1 AND refresh_token=$2",
      [decoded.id, token],
    );
    if (!result.rows.length)
      return res.status(401).json({ message: "Invalid refresh token" });

    const user = result.rows[0];
    const { accessToken: newAccess, refreshToken: newRefresh } =
      generateTokens(user);
    await pool.query("UPDATE users SET refresh_token=$1 WHERE id=$2", [
      newRefresh,
      user.id,
    ]);

    res.cookie("refreshToken", newRefresh, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    res.json({ token: newAccess });
  } catch (err) {
    res.status(401).json({ message: "Invalid or expired refresh token" });
  }
};

// ── VERIFY EMAIL ─────────────────────────────────────────────
const verifyEmail = async (req, res) => {
  try {
    const { token } = req.query;
    const result = await pool.query(
      "SELECT id FROM users WHERE verification_token=$1 AND verification_expires>NOW()",
      [token],
    );
    if (!result.rows.length)
      return res
        .status(400)
        .json({ message: "Invalid or expired verification link" });

    await pool.query(
      "UPDATE users SET email_verified=true, verification_token=NULL WHERE id=$1",
      [result.rows[0].id],
    );
    res.json({ message: "Email verified successfully!" });
  } catch (err) {
    res.status(500).json({ message: "Verification failed" });
  }
};

// ── FORGOT PASSWORD ──────────────────────────────────────────
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const result = await pool.query("SELECT * FROM users WHERE email=$1", [
      email.toLowerCase(),
    ]);
    // Always return success to prevent email enumeration
    if (!result.rows.length)
      return res.json({
        message: "If that email exists, a reset link has been sent.",
      });

    const user = result.rows[0];
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await pool.query(
      "UPDATE users SET reset_token=$1, reset_expires=$2 WHERE id=$3",
      [resetToken, resetExpires, user.id],
    );

    const resetUrl = `${FRONTEND_URL}/reset-password?token=${resetToken}`;
    await emailService.sendPasswordResetEmail(user, resetUrl);

    res.json({ message: "If that email exists, a reset link has been sent." });
  } catch (err) {
    res.status(500).json({ message: "Failed to send reset email" });
  }
};

// ── RESET PASSWORD ───────────────────────────────────────────
const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!password || password.length < 8)
      return res
        .status(400)
        .json({ message: "Password must be at least 8 characters" });

    const result = await pool.query(
      "SELECT id FROM users WHERE reset_token=$1 AND reset_expires>NOW()",
      [token],
    );
    if (!result.rows.length)
      return res.status(400).json({ message: "Invalid or expired reset link" });

    const hashed = await bcrypt.hash(password, 12);
    await pool.query(
      "UPDATE users SET password=$1, reset_token=NULL, reset_expires=NULL WHERE id=$2",
      [hashed, result.rows[0].id],
    );
    res.json({ message: "Password reset successfully!" });
  } catch (err) {
    res.status(500).json({ message: "Password reset failed" });
  }
};

// ── LOGOUT ───────────────────────────────────────────────────
const logout = async (req, res) => {
  try {
    if (req.user)
      await pool.query("UPDATE users SET refresh_token=NULL WHERE id=$1", [
        req.user.id,
      ]);
    res.clearCookie("refreshToken");
    res.json({ message: "Logged out successfully" });
  } catch (err) {
    res.status(500).json({ message: "Logout failed" });
  }
};

// ── GET ME ───────────────────────────────────────────────────
const getMe = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, name, email, role, phone, email_verified, created_at FROM users WHERE id=$1",
      [req.user.id],
    );
    if (!result.rows.length)
      return res.status(404).json({ message: "User not found" });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: "Failed to get user data" });
  }
};

module.exports = {
  register,
  login,
  refreshToken,
  verifyEmail,
  forgotPassword,
  resetPassword,
  logout,
  getMe,
};
