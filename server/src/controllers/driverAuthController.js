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

// ── POST /api/driver/auth/register & /api/driver/register ────────────
// Self-Service Driver Registration (Awaiting Admin Verification)
const register = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const {
      name,
      phone,
      email,
      password,
      vehicle_type = "motorcycle",
      vehicle_plate = "",
      nin_number = "",
      license_number = "",
      address = "",
      city = "Aba",
      state = "Abia State",
      emergency_contact_name = "",
      emergency_contact_phone = "",
      emergency_contact_relationship = "",
      guarantor_name = "",
      guarantor_phone = "",
      guarantor_address = "",
      bank_name = "",
      account_number = "",
      account_name = "",
      avatar_url = "",
      documents = {},
      primary_zone_id = null,
    } = req.body;

    const cleanName = (name || "").trim();
    const cleanPhone = (phone || "").trim().replace(/\s+/g, "");
    const cleanEmail = (email || "").trim().toLowerCase();
    const cleanPassword = (password || "").trim();

    if (!cleanName) {
      return res.status(400).json({ message: "Driver full name is required" });
    }
    if (!cleanPhone) {
      return res.status(400).json({ message: "Driver phone number is required" });
    }
    if (!cleanPassword || cleanPassword.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters long" });
    }

    await client.query("BEGIN");

    // Check if phone or email already exists
    const existingCheck = await client.query(
      `
      SELECT id, name, phone, email, status, onboarding_status 
      FROM drivers 
      WHERE phone = $1 OR phone = $2 OR ($3 != '' AND LOWER(email) = $3)
      LIMIT 1
      `,
      [cleanPhone, phone.trim(), cleanEmail]
    );

    if (existingCheck.rows.length > 0) {
      await client.query("ROLLBACK");
      const existing = existingCheck.rows[0];

      if (existing.status === "pending" || existing.onboarding_status === "pending_verification") {
        return res.status(409).json({
          code: "APPLICATION_EXISTS_PENDING",
          message: "An application with this phone number or email is already registered and under review. You can log in directly to check your verification status or upload missing documents.",
          driver_id: existing.id,
        });
      }

      if (existing.status === "suspended") {
        return res.status(403).json({
          code: "ACCOUNT_SUSPENDED",
          message: "This driver account has been suspended. Please contact Bems Farms dispatch operations.",
        });
      }

      return res.status(409).json({
        code: "ACCOUNT_EXISTS",
        message: "A driver account with this phone number or email already exists. Please log in with your credentials.",
      });
    }

    // 1. Insert into drivers table with status='pending' and is_available=false
    const driverInsert = await client.query(
      `
      INSERT INTO drivers (
        name,
        phone,
        email,
        vehicle_type,
        vehicle_plate,
        primary_zone_id,
        status,
        onboarding_status,
        is_available,
        license_number,
        nin_number,
        address,
        emergency_contact_name,
        emergency_contact_phone,
        emergency_contact_relationship,
        guarantor_name,
        guarantor_phone,
        guarantor_address,
        bank_name,
        account_number,
        account_name,
        avatar_url,
        documents,
        commission_per_delivery,
        rating,
        total_deliveries,
        total_earnings,
        notes,
        created_at,
        updated_at
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, 'pending', 'pending_verification', false,
        $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19,
        $20::jsonb, 700.00, 5.0, 0, 0.00,
        $21, NOW(), NOW()
      )
      RETURNING *
      `,
      [
        cleanName,
        cleanPhone,
        cleanEmail || null,
        vehicle_type || "motorcycle",
        vehicle_plate ? vehicle_plate.trim().toUpperCase() : null,
        primary_zone_id || null,
        license_number ? license_number.trim() : null,
        nin_number ? nin_number.trim() : null,
        address ? address.trim() : null,
        emergency_contact_name ? emergency_contact_name.trim() : null,
        emergency_contact_phone ? emergency_contact_phone.trim() : null,
        emergency_contact_relationship ? emergency_contact_relationship.trim() : null,
        guarantor_name ? guarantor_name.trim() : null,
        guarantor_phone ? guarantor_phone.trim() : null,
        guarantor_address ? guarantor_address.trim() : null,
        bank_name ? bank_name.trim() : null,
        account_number ? account_number.trim() : null,
        account_name ? account_name.trim() : null,
        avatar_url || null,
        typeof documents === "object" ? JSON.stringify(documents) : "{}",
        `Self-service registered on ${new Date().toISOString().slice(0, 10)}. Awaiting admin verification.`,
      ]
    );

    const newDriver = driverInsert.rows[0];

    // 2. Hash password and insert into driver_auth
    const hashedPassword = await bcrypt.hash(cleanPassword, 10);
    await client.query(
      `
      INSERT INTO driver_auth (driver_id, password_hash, created_at)
      VALUES ($1, $2, NOW())
      `,
      [newDriver.id, hashedPassword]
    );

    // 3. Insert initial offline availability record
    await client.query(
      `
      INSERT INTO driver_availability (driver_id, is_available, is_on_delivery, last_toggled_at)
      VALUES ($1, false, false, NOW())
      ON CONFLICT (driver_id) DO NOTHING
      `,
      [newDriver.id]
    );

    // 4. Send Welcome in-app notification
    await client.query(
      `
      INSERT INTO driver_notifications (
        driver_id, title, body, type, reference_type, created_at
      )
      VALUES ($1, 'Welcome to Bems Farms Delivery Team', $2, 'announcement', 'onboarding', NOW())
      `,
      [
        newDriver.id,
        "Your application has been received! Our compliance team is verifying your documents. You can browse the app and check your verification status anytime.",
      ]
    );

    await client.query("COMMIT");

    // Auto-provision Monnify Reserved Account in background
    (async () => {
      try {
        const { createMonnifyReservedAccount } = require("../utils/monnify");
        const monnifyRes = await createMonnifyReservedAccount({
          accountReference: `DRV_BEMS_${newDriver.id}_${Date.now()}`,
          accountName: `BEMS - ${newDriver.name.toUpperCase()}`,
          customerEmail: newDriver.email || `driver_${newDriver.id}@bemsfarms.com`,
          customerName: newDriver.name,
        });

        if (monnifyRes?.accounts && monnifyRes.accounts.length > 0) {
          const primary = monnifyRes.accounts[0];
          await pool.query(
            `UPDATE drivers 
             SET wallet_account_number = $1, 
                 wallet_bank_name = $2, 
                 wallet_account_name = $3, 
                 updated_at = NOW() 
             WHERE id = $4`,
            [primary.accountNumber, primary.bankName || "Wema Bank / Monnify", primary.accountName || `BEM - ${newDriver.name.toUpperCase()}`, newDriver.id]
          );
        }
      } catch (monErr) {
        console.warn("[driver-reg] Monnify provisioning notice:", monErr.message);
      }
    })();

    const token = generateDriverToken(newDriver);

    res.status(201).json({
      status: "success",
      message: "Driver registered successfully. Your account is currently awaiting verification by the dispatch team.",
      token,
      driver: {
        id: newDriver.id,
        name: newDriver.name,
        phone: newDriver.phone,
        email: newDriver.email,
        vehicle_type: newDriver.vehicle_type,
        vehicle_plate: newDriver.vehicle_plate,
        avatar_url: newDriver.avatar_url,
        status: newDriver.status,
        onboarding_status: newDriver.onboarding_status,
        is_available: false,
        is_on_delivery: false,
        rating: 5.0,
        total_deliveries: 0,
        total_earnings: 0,
      },
      verification: {
        status: "pending",
        onboarding_status: "pending_verification",
        is_verified: false,
        can_accept_orders: false,
        message: "Your application is currently under review by Bems Farms Dispatch. You can log in and update your profile or documents while awaiting activation.",
      },
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Driver self-service registration error:", err.message);
    next(err);
  } finally {
    client.release();
  }
};

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
      return res.status(401).json({
        message: "Driver credentials not initialized. Please contact your dispatch manager or register.",
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

    const isVerified = driver.status === "active";
    const token = generateDriverToken(driver);

    res.json({
      token,
      driver: {
        ...driver,
        is_available: isVerified ? driver.is_available : false,
      },
      verification: {
        status: driver.status,
        onboarding_status: driver.onboarding_status || (isVerified ? "verified" : "pending_verification"),
        is_verified: isVerified,
        can_accept_orders: isVerified,
        message: isVerified
          ? "Account is verified and active."
          : "Your driver account is currently pending verification. You can view your profile and upload missing documents while our compliance team verifies your details.",
      },
      message: "Login successful",
    });
  } catch (err) {
    console.error("Driver login error:", err.message);
    next(err);
  }
};

// ── GET /api/driver/auth/status & /api/driver/auth/verification ───────
// Get live verification status, document checklist, and approval status
const getVerificationStatus = async (req, res, next) => {
  try {
    const driver = req.driver;
    const isVerified = driver.status === "active";

    let documents = {};
    if (typeof driver.documents === "object" && driver.documents !== null) {
      documents = driver.documents;
    } else if (typeof driver.documents === "string") {
      try {
        documents = JSON.parse(driver.documents);
      } catch {}
    }

    const checklist = {
      profile_completed: Boolean(driver.name && driver.phone),
      driver_license_uploaded: Boolean(
        driver.license_number || documents.driver_license_front || documents.driver_license || documents.license
      ),
      nin_verified: Boolean(
        driver.nin_number || documents.nin_slip || documents.nin
      ),
      vehicle_registered: Boolean(driver.vehicle_type && driver.vehicle_plate),
      payout_bank_added: Boolean(driver.bank_name && driver.account_number),
    };

    const completedCount = Object.values(checklist).filter(Boolean).length;
    const totalChecklist = Object.keys(checklist).length;
    const progressPercent = Math.round((completedCount / totalChecklist) * 100);

    res.json({
      driver_id: driver.id,
      name: driver.name,
      phone: driver.phone,
      email: driver.email,
      status: driver.status,
      onboarding_status: driver.onboarding_status || (isVerified ? "verified" : "pending_verification"),
      is_verified: isVerified,
      can_go_online: isVerified,
      compliance_notes: driver.compliance_notes || null,
      checklist,
      completion: {
        completed: completedCount,
        total: totalChecklist,
        percent: progressPercent,
      },
      documents,
      message: isVerified
        ? "Your account is verified and ready for deliveries."
        : "Your application is under review by Bems Farms Dispatch.",
    });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/driver/auth/me ─────────────────────────────────────────
const getMe = async (req, res, next) => {
  try {
    const driver = req.driver;
    const isVerified = driver.status === "active";

    res.json({
      driver: {
        ...driver,
        is_available: isVerified ? driver.is_available : false,
      },
      verification: {
        status: driver.status,
        onboarding_status: driver.onboarding_status || (isVerified ? "verified" : "pending_verification"),
        is_verified: isVerified,
        can_accept_orders: isVerified,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ── PATCH /api/driver/auth/profile ──────────────────────────────────
const updateProfile = async (req, res, next) => {
  try {
    const driverId = req.driver.id;
    const {
      phone,
      email,
      avatar_url,
      photo,
      bank_name,
      account_number,
      account_name,
      license_number,
      nin_number,
      address,
      vehicle_type,
      vehicle_plate,
      emergency_contact_name,
      emergency_contact_phone,
      emergency_contact_relationship,
      guarantor_name,
      guarantor_phone,
      guarantor_address,
      documents,
    } = req.body;

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
    if (license_number !== undefined) {
      params.push(license_number.trim());
      updates.push(`license_number = $${params.length}`);
    }
    if (nin_number !== undefined) {
      params.push(nin_number.trim());
      updates.push(`nin_number = $${params.length}`);
    }
    if (address !== undefined) {
      params.push(address.trim());
      updates.push(`address = $${params.length}`);
    }
    if (vehicle_type !== undefined) {
      params.push(vehicle_type.trim());
      updates.push(`vehicle_type = $${params.length}`);
    }
    if (vehicle_plate !== undefined) {
      params.push(vehicle_plate.trim().toUpperCase());
      updates.push(`vehicle_plate = $${params.length}`);
    }
    if (emergency_contact_name !== undefined) {
      params.push(emergency_contact_name.trim());
      updates.push(`emergency_contact_name = $${params.length}`);
    }
    if (emergency_contact_phone !== undefined) {
      params.push(emergency_contact_phone.trim());
      updates.push(`emergency_contact_phone = $${params.length}`);
    }
    if (emergency_contact_relationship !== undefined) {
      params.push(emergency_contact_relationship.trim());
      updates.push(`emergency_contact_relationship = $${params.length}`);
    }
    if (guarantor_name !== undefined) {
      params.push(guarantor_name.trim());
      updates.push(`guarantor_name = $${params.length}`);
    }
    if (guarantor_phone !== undefined) {
      params.push(guarantor_phone.trim());
      updates.push(`guarantor_phone = $${params.length}`);
    }
    if (guarantor_address !== undefined) {
      params.push(guarantor_address.trim());
      updates.push(`guarantor_address = $${params.length}`);
    }
    if (documents !== undefined) {
      params.push(typeof documents === "object" ? JSON.stringify(documents) : documents);
      updates.push(`documents = $${params.length}::jsonb`);
    }

    if (updates.length === 0) {
      return res.status(400).json({ message: "No profile fields to update" });
    }

    params.push(driverId);
    const sql = `
      UPDATE drivers 
      SET ${updates.join(", ")}, updated_at = NOW()
      WHERE id = $${params.length}
      RETURNING *
    `;

    const result = await pool.query(sql, params);
    const updatedDriver = result.rows[0];

    res.json({
      driver: {
        ...updatedDriver,
        is_available: updatedDriver.status === "active" ? req.driver.is_available : false,
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

    // Block unverified / pending / suspended drivers from going online
    if (req.driver.status !== "active") {
      return res.status(403).json({
        message: `Your driver account is currently '${req.driver.status}' (awaiting admin verification). You cannot go online until your application is approved.`,
        status: req.driver.status,
        onboarding_status: req.driver.onboarding_status,
      });
    }

    let { is_available } = req.body;
    if (is_available === undefined) {
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

    // Sync drivers table status
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

// ── POST /api/driver/auth/forgot-password ────────────────────────────
const forgotPassword = async (req, res, next) => {
  try {
    const { emailOrPhone, email, phone } = req.body;
    const identifier = (emailOrPhone || email || phone || "").trim();

    if (!identifier) {
      return res.status(400).json({ message: "Phone number or email is required" });
    }

    const driverResult = await pool.query(
      "SELECT id, name, email, phone FROM drivers WHERE LOWER(email) = LOWER($1) OR phone = $1 OR phone = $2 LIMIT 1",
      [identifier, identifier.replace(/\s+/g, "")]
    );

    if (driverResult.rows.length === 0) {
      return res.json({ message: "If a matching driver account exists, a password reset link has been sent." });
    }

    const driver = driverResult.rows[0];
    if (!driver.email) {
      return res.status(400).json({ message: "Driver account has no registered email. Please contact your dispatch manager." });
    }

    const resetToken = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 3600 * 1000);

    await pool.query(
      `
      INSERT INTO driver_auth (driver_id, reset_token, reset_token_expires, created_at)
      VALUES ($1, $2, $3, NOW())
      ON CONFLICT (driver_id)
      DO UPDATE SET reset_token = $2, reset_token_expires = $3
      `,
      [driver.id, resetToken, expiresAt]
    );

    const emailService = require("../services/emailService");
    await emailService.sendDriverPasswordResetEmail(driver, resetToken);

    res.json({
      success: true,
      message: `Password reset instructions have been sent to ${driver.email}`,
    });
  } catch (err) {
    console.error("Driver forgotPassword error:", err.message);
    next(err);
  }
};

// ── POST /api/driver/auth/reset-password ─────────────────────────────
const resetPassword = async (req, res, next) => {
  try {
    const { token, newPassword, password } = req.body;
    const finalPassword = newPassword || password;

    if (!token || !finalPassword) {
      return res.status(400).json({ message: "Reset token and new password are required" });
    }

    if (String(finalPassword).length < 6) {
      return res.status(400).json({ message: "New password must be at least 6 characters long" });
    }

    const authCheck = await pool.query(
      `
      SELECT da.*, d.name, d.email, d.phone 
      FROM driver_auth da
      JOIN drivers d ON da.driver_id = d.id
      WHERE da.reset_token = $1 AND da.reset_token_expires > NOW()
      LIMIT 1
      `,
      [String(token).trim()]
    );

    if (authCheck.rows.length === 0) {
      return res.status(400).json({ message: "Invalid or expired password reset token" });
    }

    const record = authCheck.rows[0];
    const hashedPassword = await bcrypt.hash(finalPassword, 10);

    await pool.query(
      `
      UPDATE driver_auth 
      SET 
        password_hash = $1,
        reset_token = NULL,
        reset_token_expires = NULL,
        failed_attempts = 0,
        locked_until = NULL
      WHERE driver_id = $2
      `,
      [hashedPassword, record.driver_id]
    );

    res.json({
      success: true,
      message: "Password reset successfully! You can now log in with your new password.",
    });
  } catch (err) {
    console.error("Driver resetPassword error:", err.message);
    next(err);
  }
};

module.exports = {
  register,
  login,
  getMe,
  getVerificationStatus,
  updateProfile,
  toggleAvailability,
  forgotPassword,
  resetPassword,
};

