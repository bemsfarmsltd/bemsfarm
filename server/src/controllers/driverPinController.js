const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../db/pool");

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("FATAL CONFIGURATION ERROR: JWT_SECRET environment variable is not defined!");
}

// Helper: validate 6-digit numeric PIN
function isValid6DigitPin(pin) {
  return typeof pin === "string" && /^\d{6}$/.test(pin.trim());
}

// ── GET /api/driver/pin/status ─────────────────────────────────────────
// Check if driver has configured a PIN and whether it is locked
const getPinStatus = async (req, res, next) => {
  try {
    const driverId = req.driver.id;

    const result = await pool.query(
      `
      SELECT 
        (pin_hash IS NOT NULL) AS has_pin,
        pin_updated_at,
        pin_failed_attempts,
        pin_locked_until,
        COALESCE(payout_locked, false) AS payout_locked,
        payout_locked_reason,
        payout_locked_at
      FROM drivers
      WHERE id = $1
      `,
      [driverId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Driver not found" });
    }

    const row = result.rows[0];
    const isLocked = Boolean(row.pin_locked_until && new Date(row.pin_locked_until) > new Date());
    const remainingMinutes = isLocked 
      ? Math.max(1, Math.ceil((new Date(row.pin_locked_until) - new Date()) / 60000))
      : 0;

    res.json({
      success: true,
      has_pin: Boolean(row.has_pin),
      is_locked: isLocked,
      payout_locked: Boolean(row.payout_locked),
      payout_locked_reason: row.payout_locked_reason,
      remaining_lock_minutes: remainingMinutes,
      locked_until: row.pin_locked_until,
      pin_updated_at: row.pin_updated_at,
    });
  } catch (err) {
    console.error("Driver getPinStatus error:", err.message);
    next(err);
  }
};

// ── POST /api/driver/pin/setup ─────────────────────────────────────────
// Create or update 6-digit PIN
const setupPin = async (req, res, next) => {
  try {
    const driverId = req.driver.id;
    const rawPin = req.body.pin || req.body.new_pin || req.body.newPin || req.body.security_pin;
    const rawConfirm = req.body.confirm_pin || req.body.confirmPin || req.body.pin_confirmation;
    const rawCurrent = req.body.current_pin || req.body.currentPin || req.body.old_pin || req.body.oldPin;

    const cleanPin = rawPin ? String(rawPin).trim() : "";
    const cleanConfirm = rawConfirm ? String(rawConfirm).trim() : "";
    const cleanCurrent = rawCurrent ? String(rawCurrent).trim() : "";

    if (!isValid6DigitPin(cleanPin)) {
      return res.status(400).json({
        success: false,
        message: "PIN must be exactly 6 numeric digits (e.g. 123456)",
      });
    }

    // Check confirmation if supplied
    if (cleanConfirm && cleanConfirm !== cleanPin) {
      return res.status(400).json({
        success: false,
        message: "New PIN and confirmation PIN do not match",
      });
    }

    // Check existing PIN
    const existing = await pool.query(
      "SELECT pin_hash FROM drivers WHERE id = $1",
      [driverId]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Driver not found" });
    }

    const currentHash = existing.rows[0].pin_hash;

    // If driver already has a PIN, verify current_pin first
    if (currentHash) {
      if (!cleanCurrent) {
        return res.status(400).json({
          success: false,
          needs_current_pin: true,
          message: "Current PIN is required to change your existing security PIN",
        });
      }

      const isCurrentValid = await bcrypt.compare(cleanCurrent, currentHash);
      if (!isCurrentValid) {
        return res.status(400).json({
          success: false,
          message: "Current PIN is incorrect",
        });
      }
    }

    // Hash the new 6-digit PIN
    const hashed = await bcrypt.hash(cleanPin, 10);

    // Save to drivers table
    await pool.query(
      `
      UPDATE drivers
      SET 
        pin_hash = $1,
        pin_updated_at = NOW(),
        pin_failed_attempts = 0,
        pin_locked_until = NULL
      WHERE id = $2
      `,
      [hashed, driverId]
    );

    // Sync to driver_auth if row exists
    try {
      await pool.query(
        "UPDATE driver_auth SET pin_hash = $1 WHERE driver_id = $2",
        [hashed, driverId]
      );
    } catch (_) {}

    res.json({
      success: true,
      message: currentHash ? "PIN changed successfully" : "PIN set up successfully",
      has_pin: true,
    });
  } catch (err) {
    console.error("Driver setupPin error:", err.message);
    next(err);
  }
};

// ── POST /api/driver/pin/verify ────────────────────────────────────────
// Verify 6-digit PIN on app unlock or cashout
const verifyPin = async (req, res, next) => {
  try {
    const driverId = req.driver.id;
    const rawPin = req.body.pin || req.body.security_pin || req.body.code;
    const action = req.body.action || "verify"; // e.g. "unlock", "cashout", "withdrawal"

    const cleanPin = rawPin ? String(rawPin).trim() : "";

    if (!isValid6DigitPin(cleanPin)) {
      return res.status(400).json({
        success: false,
        valid: false,
        message: "PIN must be exactly 6 numeric digits",
      });
    }

    // Fetch driver's PIN hash and lockout telemetry
    const driverResult = await pool.query(
      `
      SELECT 
        pin_hash,
        pin_failed_attempts,
        pin_locked_until
      FROM drivers
      WHERE id = $1
      `,
      [driverId]
    );

    if (driverResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Driver not found" });
    }

    const row = driverResult.rows[0];

    // If driver never configured a PIN
    if (!row.pin_hash) {
      return res.status(400).json({
        success: false,
        valid: false,
        has_pin: false,
        needs_setup: true,
        message: "Security PIN is not set up yet. Please create your 6-digit PIN.",
      });
    }

    // Check temporary lockout
    if (row.pin_locked_until && new Date(row.pin_locked_until) > new Date()) {
      const remainingMinutes = Math.max(1, Math.ceil((new Date(row.pin_locked_until) - new Date()) / 60000));
      return res.status(423).json({
        success: false,
        valid: false,
        locked: true,
        remaining_lock_minutes: remainingMinutes,
        locked_until: row.pin_locked_until,
        message: `Too many failed attempts. Security PIN is locked. Please try again in ${remainingMinutes} minute(s).`,
      });
    }

    // Compare entered PIN with stored hash
    const isValid = await bcrypt.compare(cleanPin, row.pin_hash);

    if (!isValid) {
      const currentAttempts = parseInt(row.pin_failed_attempts, 10) || 0;
      const newAttempts = currentAttempts + 1;

      if (newAttempts >= 5) {
        // Anti-fraud security rule: Lock PIN and lock payout requests
        await pool.query(
          `
          UPDATE drivers 
          SET 
            pin_failed_attempts = $1,
            pin_locked_until = NOW() + INTERVAL '15 minutes',
            payout_locked = true,
            payout_locked_reason = 'Too many failed PIN attempts. Payout requests locked to protect against unauthorized cashouts.',
            payout_locked_at = NOW(),
            wallet_is_frozen = true,
            wallet_frozen_reason = 'Payout security lock: Failed PIN threshold reached.'
          WHERE id = $2
          `,
          [newAttempts, driverId]
        );

        // Record security alert in driver notifications
        try {
          await pool.query(
            `INSERT INTO driver_notifications (driver_id, title, body, type, reference_type, created_at)
             VALUES ($1, 'Security Alert: Payout Requests Locked', 'Multiple incorrect security PIN attempts were entered. For your account security, payout requests are locked. Please complete identity verification to unlock cashout.', 'security', 'wallet', NOW())`,
            [driverId]
          );
        } catch (_) {}

        return res.status(423).json({
          success: false,
          valid: false,
          locked: true,
          payout_locked: true,
          remaining_attempts: 0,
          remaining_lock_minutes: 15,
          message: "Incorrect PIN. Account security and payout requests are locked to prevent fraud. Please complete identity verification to unlock cashout.",
          requires_verification: true,
        });
      }

      await pool.query(
        "UPDATE drivers SET pin_failed_attempts = $1 WHERE id = $2",
        [newAttempts, driverId]
      );

      return res.status(401).json({
        success: false,
        valid: false,
        remaining_attempts: 5 - newAttempts,
        message: `Incorrect PIN. ${5 - newAttempts} attempt(s) remaining.`,
      });
    }

    // Reset failed attempts on success
    await pool.query(
      `
      UPDATE drivers 
      SET 
        pin_failed_attempts = 0,
        pin_locked_until = NULL
      WHERE id = $1
      `,
      [driverId]
    );

    // Generate a short-lived verification token (15 mins) that cashout or app can use
    const pinToken = jwt.sign(
      {
        driver_id: driverId,
        pin_verified: true,
        action,
        timestamp: Date.now(),
      },
      JWT_SECRET,
      { expiresIn: "15m" }
    );

    res.json({
      success: true,
      valid: true,
      message: "PIN verified successfully",
      action,
      pin_token: pinToken,
    });
  } catch (err) {
    console.error("Driver verifyPin error:", err.message);
    next(err);
  }
};

// ── POST /api/driver/pin/reset ─────────────────────────────────────────
// Reset PIN using Driver Account Password
const resetPinWithPassword = async (req, res, next) => {
  try {
    const driverId = req.driver.id;
    const { password, new_pin, confirm_pin } = req.body;

    const cleanPassword = password ? String(password).trim() : "";
    const cleanPin = new_pin ? String(new_pin).trim() : "";
    const cleanConfirm = confirm_pin ? String(confirm_pin).trim() : "";

    if (!cleanPassword) {
      return res.status(400).json({
        success: false,
        message: "Driver account password is required to reset your PIN",
      });
    }

    if (!isValid6DigitPin(cleanPin)) {
      return res.status(400).json({
        success: false,
        message: "New PIN must be exactly 6 numeric digits",
      });
    }

    if (cleanConfirm && cleanConfirm !== cleanPin) {
      return res.status(400).json({
        success: false,
        message: "New PIN and confirmation PIN do not match",
      });
    }

    // Verify driver password from driver_auth
    const authResult = await pool.query(
      "SELECT password_hash FROM driver_auth WHERE driver_id = $1",
      [driverId]
    );

    if (authResult.rows.length === 0 || !authResult.rows[0].password_hash) {
      return res.status(400).json({
        success: false,
        message: "No driver password set on file. Please reset your driver password first.",
      });
    }

    const isPasswordValid = await bcrypt.compare(cleanPassword, authResult.rows[0].password_hash);
    if (!isPasswordValid) {
      return res.status(400).json({
        success: false,
        message: "Incorrect account password",
      });
    }

    // Hash the new PIN
    const hashed = await bcrypt.hash(cleanPin, 10);

    // Save and unlock
    await pool.query(
      `
      UPDATE drivers 
      SET 
        pin_hash = $1,
        pin_updated_at = NOW(),
        pin_failed_attempts = 0,
        pin_locked_until = NULL
      WHERE id = $2
      `,
      [hashed, driverId]
    );

    try {
      await pool.query(
        "UPDATE driver_auth SET pin_hash = $1 WHERE driver_id = $2",
        [hashed, driverId]
      );
    } catch (_) {}

    res.json({
      success: true,
      message: "PIN reset successfully",
      has_pin: true,
    });
  } catch (err) {
    console.error("Driver resetPinWithPassword error:", err.message);
    next(err);
  }
};

// ── POST /api/driver/pin/send-unlock-otp & /api/driver/security/send-unlock-otp ──
// Send 6-digit verification code to registered email to unlock payouts
const sendUnlockPayoutOtp = async (req, res, next) => {
  try {
    const driverId = req.driver.id;

    // Fetch driver details
    const driverResult = await pool.query(
      "SELECT id, name, email, phone FROM drivers WHERE id = $1",
      [driverId]
    );

    if (driverResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Driver not found" });
    }

    const driver = driverResult.rows[0];
    if (!driver.email) {
      return res.status(400).json({
        success: false,
        message: "No registered email on file. Please contact Bems Farms dispatch operations for assistance.",
      });
    }

    // Generate secure 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    await pool.query(
      `
      INSERT INTO driver_auth (driver_id, reset_token, reset_token_expires, created_at)
      VALUES ($1, $2, $3, NOW())
      ON CONFLICT (driver_id)
      DO UPDATE SET reset_token = $2, reset_token_expires = $3
      `,
      [driverId, otpCode, expiresAt]
    );

    const emailService = require("../services/emailService");
    await emailService.sendDriverSecurityVerificationEmail(driver, otpCode);

    res.json({
      success: true,
      message: `Security verification OTP sent to ${driver.email}. Valid for 15 minutes.`,
      expires_in_minutes: 15,
    });
  } catch (err) {
    console.error("Driver sendUnlockPayoutOtp error:", err.message);
    next(err);
  }
};

// ── POST /api/driver/pin/verify-unlock & /api/driver/security/verify-unlock ──
// Verify account password + OTP to unlock payouts and optionally set new PIN
const verifyAndUnlockPayout = async (req, res, next) => {
  try {
    const driverId = req.driver.id;
    const { password, otp_code, code, new_pin, confirm_pin } = req.body;

    const cleanPassword = password ? String(password).trim() : "";
    const cleanOtp = (otp_code || code) ? String(otp_code || code).trim() : "";
    const cleanPin = new_pin ? String(new_pin).trim() : "";
    const cleanConfirm = confirm_pin ? String(confirm_pin).trim() : "";

    if (!cleanPassword) {
      return res.status(400).json({
        success: false,
        message: "Driver account password is required for security verification.",
      });
    }

    if (!cleanOtp) {
      return res.status(400).json({
        success: false,
        message: "One-time security verification code (OTP) is required.",
      });
    }

    // Fetch auth record
    const authResult = await pool.query(
      "SELECT password_hash, reset_token, reset_token_expires FROM driver_auth WHERE driver_id = $1",
      [driverId]
    );

    if (authResult.rows.length === 0 || !authResult.rows[0].password_hash) {
      return res.status(400).json({
        success: false,
        message: "Driver credentials not found. Please contact dispatch.",
      });
    }

    const auth = authResult.rows[0];

    // 1. Verify Password
    const isPasswordValid = await bcrypt.compare(cleanPassword, auth.password_hash);
    if (!isPasswordValid) {
      return res.status(400).json({
        success: false,
        message: "Incorrect account password.",
      });
    }

    // 2. Verify OTP
    if (!auth.reset_token || auth.reset_token !== cleanOtp) {
      return res.status(400).json({
        success: false,
        message: "Invalid verification code. Please check the code sent to your email.",
      });
    }

    if (auth.reset_token_expires && new Date(auth.reset_token_expires) < new Date()) {
      return res.status(400).json({
        success: false,
        message: "Verification code has expired. Please request a new code.",
      });
    }

    // 3. Optional New PIN setup
    let newPinHash = null;
    if (cleanPin) {
      if (!isValid6DigitPin(cleanPin)) {
        return res.status(400).json({
          success: false,
          message: "New PIN must be exactly 6 numeric digits.",
        });
      }
      if (cleanConfirm && cleanConfirm !== cleanPin) {
        return res.status(400).json({
          success: false,
          message: "New PIN and confirmation PIN do not match.",
        });
      }
      newPinHash = await bcrypt.hash(cleanPin, 10);
    }

    // 4. Unlock driver payouts, clear failed attempts and unlock PIN
    const updateQuery = newPinHash
      ? `
        UPDATE drivers 
        SET 
          payout_locked = false,
          payout_locked_reason = NULL,
          payout_locked_at = NULL,
          wallet_is_frozen = false,
          wallet_frozen_reason = NULL,
          pin_failed_attempts = 0,
          pin_locked_until = NULL,
          pin_hash = $1,
          pin_updated_at = NOW(),
          updated_at = NOW()
        WHERE id = $2
        RETURNING *
      `
      : `
        UPDATE drivers 
        SET 
          payout_locked = false,
          payout_locked_reason = NULL,
          payout_locked_at = NULL,
          wallet_is_frozen = false,
          wallet_frozen_reason = NULL,
          pin_failed_attempts = 0,
          pin_locked_until = NULL,
          updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `;

    const updateParams = newPinHash ? [newPinHash, driverId] : [driverId];
    await pool.query(updateQuery, updateParams);

    // Clear reset token in driver_auth
    await pool.query(
      "UPDATE driver_auth SET reset_token = NULL, reset_token_expires = NULL" + (newPinHash ? ", pin_hash = $1" : "") + " WHERE driver_id = " + (newPinHash ? "$2" : "$1"),
      newPinHash ? [newPinHash, driverId] : [driverId]
    );

    // Insert security notification
    try {
      await pool.query(
        `INSERT INTO driver_notifications (driver_id, title, body, type, reference_type, created_at)
         VALUES ($1, 'Security Verification Passed', 'Your identity has been verified. Payout requests and wallet cashout access have been fully restored.', 'security', 'wallet', NOW())`,
        [driverId]
      );
    } catch (_) {}

    res.json({
      success: true,
      payout_locked: false,
      message: "Security verification successful! Payout requests and wallet cashouts are now unlocked.",
      has_pin: true,
    });
  } catch (err) {
    console.error("Driver verifyAndUnlockPayout error:", err.message);
    next(err);
  }
};

module.exports = {
  getPinStatus,
  setupPin,
  verifyPin,
  resetPinWithPassword,
  sendUnlockPayoutOtp,
  verifyAndUnlockPayout,
};
