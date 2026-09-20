const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../db/pool");
const { protect } = require("../middleware/authMiddleware");
const { upsertContext, trackActivity } = require("../utils/aiContext");
const { sendPasswordResetEmail, sendWelcomeEmail } = require("../services/emailService");
const validate = require("../middleware/validate");
const authSchemas = require("../schemas/authSchemas");
const { recordAuditRich } = require('../services/auditService');
const { detectChannel } = require('../utils/channel');

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
    const { name, email, password, phone, address, city, state, latitude, longitude, preferences } = req.body;

    const existing = await pool.query(
      "SELECT id FROM users WHERE LOWER(email) = LOWER($1)",
      [email],
    );
    if (existing.rows.length > 0)
      return res.status(400).json({ message: "Email already exists" });

    const hashedPw = await bcrypt.hash(password, 12);
    const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digit OTP

    const result = await pool.query(
      `INSERT INTO users (name, email, password, phone, role, verification_token, created_at)
       VALUES ($1, $2, $3, $4, 'user', $5, NOW())
       RETURNING id, name, email, phone, role`,
      [name.trim(), email.toLowerCase().trim(), hashedPw, phone.trim(), otp],
    );

    const user = result.rows[0];
    if (user) req.auditActor = {id:user.id,role:user.role};

    // If permanent delivery address is provided, persist to addresses table
    if (address && address.trim()) {
      try {
        await pool.query(
          `INSERT INTO user_addresses (user_id, label, receiver_name, receiver_phone, street_address, city, state, latitude, longitude, is_default, created_at)
           VALUES ($1, 'Home', $2, $3, $4, $5, $6, $7, $8, true, NOW())`,
          [user.id, user.name, user.phone, address.trim(), (city || "Abia State").trim(), (state || "Abia State").trim(), latitude || null, longitude || null],
        );
      } catch (addrErr) {
        console.warn("Failed to seed initial address for user:", addrErr.message);
      }
    }

    // Seed AI context record for new user (fire-and-forget)
    upsertContext(user.id, {
      full_name:    user.name,
      email:        user.email,
      phone:        user.phone,
      role:         user.role,
      registered_at: new Date().toISOString(),
      last_login:   new Date().toISOString(),
      raw_context:  preferences?.length ? { preferences } : undefined,
    });
    trackActivity(user.id, "registered", { ip: req.ip });

    sendWelcomeEmail(user, otp).catch((err) =>
      console.error(`Welcome email failed for ${email}:`, err.message),
    );

    res.status(201).json({ message: "Registration successful. Please verify your email.", requiresVerification: true });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────
// LOGIN
// ─────────────────────────────────────────────
router.post("/login", validate(authSchemas.login), async (req, res, next) => {
  const clientIP = req.ip || req.connection?.remoteAddress || "unknown";
  const origin =
    req.headers["origin"] || req.headers["referer"] || "mobile/unknown";

  try {
    const { email, password } = req.body;

    // locked_until is compared against NOW() here rather than pulled into
    // JS and compared with `new Date()` — locked_until is a timezone-naive
    // column, and node-postgres reads/writes naive timestamps using the
    // process's local timezone, which silently drifted the effective lock
    // window whenever the app server's timezone wasn't UTC (accounts could
    // stay "locked" well past the intended 15 minutes). Comparing entirely
    // inside Postgres sidesteps that mismatch.
    const result = await pool.query(
      "SELECT *, (locked_until IS NOT NULL AND locked_until > NOW()) AS is_locked FROM users WHERE LOWER(email) = LOWER($1)",
      [email.trim()],
    );
    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }



    // Check account status
    const userStatus = String(user.status || "active").toLowerCase().trim();
    if (userStatus === "suspended") {
      return res
        .status(403)
        .json({ message: "Account suspended. Contact support." });
    }
    if (userStatus === "inactive" || userStatus === "deactivated" || userStatus === "deleted") {
      return res
        .status(403)
        .json({ message: "Account inactive. Contact support." });
    }

    // Enforce portal separation
    const STAFF_ROLES = ["superadmin", "admin", "manager", "accountant", "delivery_manager", "cashier", "storekeeper", "kitchen_staff", "rider"];
    const portal = String(req.body.portal || "").toLowerCase().trim();

    if ((portal === "storefront" || portal === "customer" || portal === "client") && STAFF_ROLES.includes(user.role)) {
      return res.status(403).json({
        message: "Administrative accounts are restricted to the Admin Portal and cannot log in on the customer storefront. Please log in at /admin/login.",
      });
    }

    if (portal === "admin" && !STAFF_ROLES.includes(user.role)) {
      return res.status(403).json({
        message: "Access Denied: Customer accounts cannot access the Administrative Portal.",
      });
    }

    // Check lockout
    if (user.is_locked) {
      return res
        .status(403)
        .json({ message: "Account temporarily locked. Try again later." });
    }

    const valid = await bcrypt.compare(password, user.password);

    if (!valid) {
      // Increment failed attempts — the lock window itself is computed by
      // Postgres (NOW() + INTERVAL) rather than in JS, for the same reason
      // the check above moved into SQL.
      const attempts = (user.failed_login_attempts || 0) + 1;
      await pool.query(
        attempts >= 5
          ? "UPDATE users SET failed_login_attempts=$1, locked_until = NOW() + INTERVAL '15 minutes' WHERE id=$2"
          : "UPDATE users SET failed_login_attempts=$1, locked_until=NULL WHERE id=$2",
        [attempts, user.id],
      );
      // God Eye — security: failed login attempt
      recordAuditRich({
        source: 'api', action: 'LOGIN_FAILED',
        actor_id: user.id, actor_name: user.email, actor_role: user.role,
        request_id: req.auditRequestId, resource: '/api/auth/login',
        outcome: 'failure', category: 'security',
        severity: attempts >= 5 ? 'critical' : 'warning',
        entity_type: 'user', entity_id: String(user.id),
        ip_address: clientIP, user_agent: (req.headers['user-agent'] || '').slice(0,300),
        details: { attempts, locked: attempts >= 5, email: user.email },
      }).catch(() => {});
      return res.status(401).json({ message: "Invalid credentials" });
    }

    if (!user.email_verified && user.password !== 'GOOGLE_AUTH' && user.role !== 'superadmin' && user.role !== 'admin') {
       const otp = Math.floor(100000 + Math.random() * 900000).toString();
       await pool.query("UPDATE users SET verification_token = $1 WHERE id = $2", [otp, user.id]);
       sendWelcomeEmail(user, otp).catch(console.error);
       
       return res.status(403).json({ 
         message: "Please verify your email before logging in.", 
         requiresVerification: true, 
         email: user.email 
       });
    }

    // Reset failed attempts on success
    await pool.query(
      "UPDATE users SET failed_login_attempts=0, locked_until=NULL WHERE id=$1",
      [user.id],
    );

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user.id);
    const channel = detectChannel(req);

    await pool.query(
      "UPDATE users SET refresh_token=$1, last_login=NOW(), last_channel=$3 WHERE id=$2",
      [refreshToken, user.id, channel],
    ).catch(() => {
      // Fallback if last_channel column doesn't exist yet
      return pool.query("UPDATE users SET refresh_token=$1, last_login=NOW() WHERE id=$2", [refreshToken, user.id]);
    });

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

    // Sync AI context (fire-and-forget — never blocks login response)
    upsertContext(user.id, {
      full_name:  user.name,
      email:      user.email,
      phone:      user.phone || null,
      role:       user.role,
      last_login: new Date().toISOString(),
    });
    trackActivity(user.id, "login", { ip: clientIP, metadata: { origin } });

    // God Eye — auth: successful login
    recordAuditRich({
      source: 'api', action: 'LOGIN_SUCCESS',
      actor_id: user.id, actor_name: user.name, actor_role: user.role,
      request_id: req.auditRequestId, resource: '/api/auth/login',
      outcome: 'success', category: 'auth', severity: 'info',
      entity_type: 'user', entity_id: String(user.id),
      ip_address: clientIP, user_agent: (req.headers['user-agent'] || '').slice(0,300),
      details: { origin, role: user.role },
    }).catch(() => {});

    res.json({ token: accessToken, user: userPayload });
  } catch (err) {
    console.error(`   💥 LOGIN ERROR — ${err.message}`);
    next(err);
  }
});

// ─────────────────────────────────────────────
// VERIFY INVITATION TOKEN  ──  GET /api/auth/invitation/:token
// ─────────────────────────────────────────────
router.get("/invitation/:token", async (req, res, next) => {
  try {
    const { token } = req.params;
    if (!token || token.trim().length < 10) {
      return res.status(400).json({ valid: false, message: "Invalid invitation link." });
    }

    const inviteRes = await pool.query(
      `SELECT si.*, u.name as invited_by_name
       FROM staff_invitations si
       LEFT JOIN users u ON si.invited_by = u.id
       WHERE si.token = $1`,
      [token.trim()]
    );

    if (inviteRes.rows.length === 0) {
      return res.status(404).json({ valid: false, message: "Invitation not found or link has expired." });
    }

    const inv = inviteRes.rows[0];

    if (inv.status === "accepted") {
      return res.status(400).json({
        valid: false,
        message: "This invitation has already been accepted. Please log in with your credentials.",
        alreadyAccepted: true,
      });
    }

    if (inv.status === "revoked") {
      return res.status(400).json({
        valid: false,
        message: "This invitation has been revoked by an administrator.",
      });
    }

    if (new Date(inv.expires_at) < new Date()) {
      return res.status(400).json({
        valid: false,
        message: "This invitation has expired. Please contact an administrator to request a new link.",
        expired: true,
      });
    }

    res.json({
      valid: true,
      email: inv.email,
      role: inv.role,
      department: inv.department || "",
      invited_by: inv.invited_by_name || "Bems Farms Admin",
      expires_at: inv.expires_at,
    });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────
// ACCEPT INVITATION & COMPLETE ONBOARDING  ──  POST /api/auth/accept-invite
// ─────────────────────────────────────────────
router.post("/accept-invite", validate(authSchemas.acceptInvite), async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { token, name, phone, password, address } = req.body;

    const inviteRes = await client.query(
      "SELECT * FROM staff_invitations WHERE token = $1 FOR UPDATE",
      [token.trim()]
    );

    if (inviteRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Invalid or nonexistent invitation token." });
    }

    const inv = inviteRes.rows[0];

    if (inv.status === "accepted") {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "This invitation has already been accepted. Please log in." });
    }

    if (inv.status === "revoked") {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "This invitation has been revoked by an administrator." });
    }

    if (new Date(inv.expires_at) < new Date()) {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "This invitation link has expired. Please request a new one." });
    }

    // Hash user's chosen password
    const hashedPw = await bcrypt.hash(password, 12);
    const normalizedEmail = inv.email.toLowerCase().trim();

    // Check if a user record already exists for this email
    const existingUserRes = await client.query(
      "SELECT id, role, status FROM users WHERE LOWER(email) = $1",
      [normalizedEmail]
    );

    let user;
    if (existingUserRes.rows.length > 0) {
      // Existing user (e.g. was a customer or created earlier)
      const existingUser = existingUserRes.rows[0];
      const updateRes = await client.query(
        `UPDATE users
         SET name = $1, password = $2, phone = $3, role = $4, status = 'active', email_verified = true, updated_at = NOW()
         WHERE id = $5
         RETURNING id, name, email, phone, role, status, avatar_url, store_id`,
        [name.trim(), hashedPw, phone.trim(), inv.role, existingUser.id]
      );
      user = updateRes.rows[0];
    } else {
      // Create fresh user account
      const insertRes = await client.query(
        `INSERT INTO users (name, email, password, phone, role, status, email_verified, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, 'active', true, NOW(), NOW())
         RETURNING id, name, email, phone, role, status, avatar_url, store_id`,
        [name.trim(), normalizedEmail, hashedPw, phone.trim(), inv.role]
      );
      user = insertRes.rows[0];
    }

    // Generate employee code and ensure staff record is present
    await client.query("SELECT pg_advisory_xact_lock(hashtext('staff_employee_code'))");
    const codeRow = await client.query(
      `SELECT MAX(CAST(SPLIT_PART(employee_code, '-', 2) AS INTEGER)) AS max_n
       FROM staff WHERE employee_code LIKE 'EMP-%'`
    );
    const n = (codeRow.rows[0]?.max_n || 0) + 1;
    const empCode = `EMP-${String(n).padStart(3, "0")}`;

    const existingStaff = await client.query(
      "SELECT id FROM staff WHERE user_id = $1 OR LOWER(email) = $2",
      [user.id, normalizedEmail]
    );

    const department = inv.department || "Operations";
    const roleTitle = inv.role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

    if (existingStaff.rows.length > 0) {
      await client.query(
        `UPDATE staff
         SET name = $1, phone = $2, system_role = $3, department = $4, role = $5,
             address = COALESCE($6, address), status = 'active', updated_at = NOW()
         WHERE id = $7`,
        [name.trim(), phone.trim(), inv.role, department, roleTitle, address || null, existingStaff.rows[0].id]
      );
    } else {
      await client.query(
        `INSERT INTO staff
           (user_id, employee_id, employee_code, name, email, phone, system_role,
            department, role, shift, address, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'morning', $10, 'active', NOW(), NOW())`,
        [user.id, empCode, empCode, name.trim(), normalizedEmail, phone.trim(), inv.role, department, roleTitle, address || null]
      );
    }

    // Mark invitation accepted
    await client.query(
      "UPDATE staff_invitations SET status = 'accepted', accepted_at = NOW(), updated_at = NOW() WHERE id = $1",
      [inv.id]
    );

    await client.query("COMMIT");

    // Generate authentication tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user.id);

    await pool.query(
      "UPDATE users SET refresh_token=$1, last_login=NOW() WHERE id=$2",
      [refreshToken, user.id]
    );

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

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

    upsertContext(user.id, {
      full_name:  user.name,
      email:      user.email,
      phone:      user.phone || null,
      role:       user.role,
      last_login: new Date().toISOString(),
    });
    trackActivity(user.id, "accepted_invite", { role: inv.role });

    res.status(200).json({
      message: "Account setup successful! Welcome to the Bems Farms team.",
      token: accessToken,
      user: userPayload,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("accept-invite error:", err);
    next(err);
  } finally {
    client.release();
  }
});

// ─────────────────────────────────────────────
// ADMIN BYPASS (One-Click Staff / Admin Auth)
// ─────────────────────────────────────────────
router.post("/admin-bypass", async (req, res, next) => {
  try {
    // Find an existing active superadmin or admin, or fallback to any staff role
    let result = await pool.query(
      "SELECT * FROM users WHERE role IN ('superadmin', 'admin') AND status = 'active' ORDER BY (role = 'superadmin') DESC LIMIT 1"
    );

    let staff = result.rows[0];

    // If no superadmin/admin exists, look for any user with superadmin or admin role
    if (!staff) {
      result = await pool.query(
        "SELECT * FROM users WHERE role IN ('superadmin', 'admin') LIMIT 1"
      );
      staff = result.rows[0];
    }

    // If still none exists, create a default superadmin user
    if (!staff) {
      const hashedPw = await bcrypt.hash("AdminSecret123!", 10);
      const inserted = await pool.query(
        `INSERT INTO users (name, email, password, phone, role, email_verified, status, created_at)
         VALUES ('Bems Super Admin', 'admin@bemsfarms.com', $1, '08000000000', 'superadmin', true, 'active', NOW())
         ON CONFLICT (email) DO UPDATE SET role = 'superadmin', status = 'active'
         RETURNING *`,
        [hashedPw]
      );
      staff = inserted.rows[0];
    }

    const accessToken = generateAccessToken(staff);
    const refreshToken = generateRefreshToken(staff.id);

    await pool.query(
      "UPDATE users SET refresh_token=$1, last_login=NOW() WHERE id=$2",
      [refreshToken, staff.id]
    );

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    const nameParts = (staff.name || "").trim().split(" ");
    const userPayload = {
      id: staff.id,
      name: staff.name,
      first_name: nameParts[0] || "",
      last_name: nameParts.slice(1).join(" ") || "",
      email: staff.email,
      role: staff.role || "superadmin",
      avatar_url: staff.avatar_url || null,
      store_id: staff.store_id || null,
      status: staff.status || "active",
    };

    return res.json({
      message: "Admin login bypassed successfully",
      user: userPayload,
      token: accessToken,
    });
  } catch (err) {
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
      `SELECT id, name, email, phone, role, avatar_url, store_id, status,
              gender, id_number, tax_id, tax_country, address
       FROM users WHERE id = $1`,
      [req.user.id],
    );

    if (!result.rows.length) {
      return res.status(404).json({ message: "User not found" });
    }

    const user = result.rows[0];

    // Mirror login's blocking rule — only suspended/inactive accounts are
    // rejected here, so a staff member marked "on_leave" doesn't get bounced
    // straight back out on the very next /me call after logging in.
    if (user.status === "suspended" || user.status === "inactive" || user.status === "deleted") {
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
        gender: user.gender || "",
        id_number: user.id_number || "",
        tax_id: user.tax_id || "",
        tax_country: user.tax_country || "",
        address: user.address || "",
      },
    });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────
// UPDATE PROFILE
// ─────────────────────────────────────────────
router.patch("/profile", protect, validate(authSchemas.updateProfile), async (req, res, next) => {
  try {
    const { name, email, phone, gender, id_number, tax_id, tax_country, address } = req.body;

    if (email) {
      const dup = await pool.query(
        "SELECT id FROM users WHERE LOWER(email)=LOWER($1) AND id != $2",
        [email, req.user.id],
      );
      if (dup.rows.length) {
        return res.status(400).json({ message: "That email is already in use by another account" });
      }
    }

    const result = await pool.query(
      `UPDATE users SET
         name=$1, email=COALESCE($2, email), phone=$3, gender=$4, id_number=$5, tax_id=$6, tax_country=$7, address=$8,
         updated_at=NOW()
       WHERE id=$9
       RETURNING id, name, email, phone, gender, id_number, tax_id, tax_country, address`,
      [
        name.trim(),
        email ? email.trim().toLowerCase() : null,
        phone || null,
        gender || null,
        id_number || null,
        tax_id || null,
        tax_country || null,
        address || null,
        req.user.id,
      ],
    );
    res.json({ user: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────
// UPDATE AVATAR  (previously only ever saved to localStorage — never
// actually persisted, despite avatar_url existing as a real column)
// ─────────────────────────────────────────────
router.patch("/avatar", protect, validate(authSchemas.updateAvatar), async (req, res, next) => {
  try {
    const { avatar_url } = req.body;
    const result = await pool.query(
      "UPDATE users SET avatar_url=$1, updated_at=NOW() WHERE id=$2 RETURNING id, avatar_url",
      [avatar_url, req.user.id],
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
    // Bump token_version (invalidates every already-issued access token via
    // the check in protect()) and clear refresh_token, same as reset-password
    // — otherwise a stolen token/session survives a voluntary password
    // change too. Issue a fresh token in the response so the device the
    // user just changed their password FROM doesn't get logged out too.
    const updated = await pool.query(
      "UPDATE users SET password=$1, updated_at=NOW(), token_version=token_version+1, refresh_token=NULL WHERE id=$2 RETURNING id, name, email, role, token_version",
      [hash, req.user.id],
    );

    const accessToken = generateAccessToken(updated.rows[0]);
    // God Eye — auth: password changed
    recordAuditRich({
      source: 'api', action: 'PASSWORD_CHANGED',
      actor_id: req.user.id, actor_name: req.user.name, actor_role: req.user.role,
      request_id: req.auditRequestId, resource: '/api/auth/change-password',
      outcome: 'success', category: 'auth', severity: 'warning',
      entity_type: 'user', entity_id: String(req.user.id),
      ip_address: req.headers['cf-connecting-ip'] || req.ip,
      user_agent: (req.headers['user-agent'] || '').slice(0, 300),
      details: { self_service: true },
    }).catch(() => {});
    res.json({ message: "Password updated successfully", token: accessToken });
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
    next(err);
  }
});


// ─────────────────────────────────────────────
// FORGOT PASSWORD
// ─────────────────────────────────────────────
router.post("/forgot-password", validate(authSchemas.forgotPassword), async (req, res, next) => {
  try {
    const { email } = req.body;

    const result = await pool.query(
      "SELECT id, role FROM users WHERE LOWER(email) = LOWER($1)",
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

    // Staff/admin accounts reset from the admin hub, not the storefront —
    // send them to ADMIN_URL so the link actually lands on a page that exists.
    const isStaff = result.rows[0].role && result.rows[0].role !== "user";
    const domain = isStaff
      ? process.env.ADMIN_URL || process.env.FRONTEND_URL || "https://bemsfarms.com"
      : process.env.FRONTEND_URL || "https://bemsfarms.com";
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
// VERIFY EMAIL
// ─────────────────────────────────────────────
router.post("/verify-email", validate(authSchemas.verifyEmail), async (req, res, next) => {
  const clientIP = req.ip || req.connection?.remoteAddress || "unknown";
  const origin = req.headers["origin"] || req.headers["referer"] || "mobile/unknown";

  try {
    const { email, token } = req.body;
    const result = await pool.query(
      "SELECT * FROM users WHERE LOWER(email) = LOWER($1) AND verification_token = $2",
      [email.trim(), token.trim()]
    );
    
    if (!result.rows.length) {
      return res.status(400).json({ message: "Invalid verification code" });
    }
    
    const user = result.rows[0];
    
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user.id);
    const channel = detectChannel(req);

    await pool.query(
      "UPDATE users SET email_verified = true, verification_token = NULL, refresh_token = $1, last_login = NOW(), last_channel = $3 WHERE id = $2",
      [refreshToken, user.id, channel]
    ).catch(() => {
      return pool.query("UPDATE users SET email_verified = true, verification_token = NULL, refresh_token = $1, last_login = NOW() WHERE id = $2", [refreshToken, user.id]);
    });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

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

    upsertContext(user.id, {
      full_name:  user.name,
      email:      user.email,
      phone:      user.phone || null,
      role:       user.role,
      last_login: new Date().toISOString(),
    });
    trackActivity(user.id, "email_verified_login", { ip: clientIP, metadata: { origin } });
    
    res.json({
      message: "Email verified successfully",
      token: accessToken,
      user: userPayload,
    });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────
// RESEND VERIFICATION EMAIL
// ─────────────────────────────────────────────
router.post("/resend-verification", validate(authSchemas.resendVerification), async (req, res, next) => {
  try {
    const { email } = req.body;
    const result = await pool.query(
      "SELECT * FROM users WHERE LOWER(email) = LOWER($1)",
      [email.trim()]
    );
    
    if (!result.rows.length || result.rows[0].email_verified) {
      return res.json({ message: "If your email is unverified, a new code has been sent." });
    }
    
    const user = result.rows[0];
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    await pool.query(
      "UPDATE users SET verification_token = $1 WHERE id = $2",
      [otp, user.id]
    );
    
    sendWelcomeEmail(user, otp).catch(console.error);
    
    res.json({ message: "If your email is unverified, a new code has been sent." });
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

    let userResult = await pool.query("SELECT * FROM users WHERE LOWER(email) = LOWER($1)", [
      email,
    ]);
    let user;

    if (userResult.rows.length > 0) {
      user = userResult.rows[0];
      // /login blocks suspended/inactive accounts — Google sign-in must too,
      // or a deactivated/suspended user can just re-authenticate around it.
      const userStatus = String(user.status || "active").toLowerCase().trim();
      if (userStatus === "suspended") {
        return res
          .status(403)
          .json({ message: "Account suspended. Contact support." });
      }
      if (userStatus === "inactive" || userStatus === "deactivated" || userStatus === "deleted") {
        return res
          .status(403)
          .json({ message: "Account inactive. Contact support." });
      }

      const STAFF_ROLES = ["superadmin", "admin", "manager", "accountant", "delivery_manager", "cashier", "storekeeper", "kitchen_staff", "rider"];
      const portal = String(req.body.portal || "").toLowerCase().trim();

      if ((portal === "storefront" || portal === "customer" || portal === "client") && STAFF_ROLES.includes(user.role)) {
        return res.status(403).json({
          message: "Administrative accounts are restricted to the Admin Portal and cannot sign in on the customer storefront. Please log in at /admin/login.",
        });
      }
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
    const channel = detectChannel(req);

    // The password-login route above stamps last_login on every successful
    // sign-in; this Google route never did, so any account that only ever
    // signs in via Google always showed "Never Logged In" on the admin
    // Customer Detail page regardless of how recently they'd actually used it.
    await pool.query("UPDATE users SET last_login=NOW(), last_channel=$2 WHERE id=$1", [user.id, channel]).catch(() => {
      return pool.query("UPDATE users SET last_login=NOW() WHERE id=$1", [user.id]);
    });

    const clientIP = req.ip || req.connection?.remoteAddress || "unknown";
    upsertContext(user.id, {
      full_name:  user.name,
      email:      user.email,
      phone:      user.phone || null,
      role:       user.role,
      last_login: new Date().toISOString(),
    });
    trackActivity(user.id, "login", { ip: clientIP, metadata: { origin: "google" } });

    recordAuditRich({
      source: 'api', action: 'LOGIN_SUCCESS',
      actor_id: user.id, actor_name: user.name, actor_role: user.role,
      request_id: req.auditRequestId, resource: '/api/auth/google',
      outcome: 'success', category: 'auth', severity: 'info',
      entity_type: 'user', entity_id: String(user.id),
      ip_address: clientIP, user_agent: (req.headers['user-agent'] || '').slice(0,300),
      details: { origin: "google", role: user.role },
    }).catch(() => {});

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
    next(err);
  }
});

// ─────────────────────────────────────────────
// SOCIAL LOGIN (GOOGLE & APPLE - CUSTOMER APP)
// POST /api/auth/social
// ─────────────────────────────────────────────
router.post("/social", async (req, res, next) => {
  try {
    const { provider = "google", email, name, token: socialToken, id: socialId, picture, avatar_url } = req.body;

    if (!email && !socialToken) {
      return res.status(400).json({ message: "Email or authentication token is required" });
    }

    const targetEmail = (email || "").toLowerCase().trim();
    if (!targetEmail) {
      return res.status(400).json({ message: "Valid email required from social provider" });
    }

    let userResult = await pool.query("SELECT * FROM users WHERE LOWER(email) = LOWER($1)", [targetEmail]);
    let user;

    if (userResult.rows.length > 0) {
      user = userResult.rows[0];
      const userStatus = String(user.status || "active").toLowerCase().trim();
      if (userStatus === "suspended" || userStatus === "deactivated" || userStatus === "deleted") {
        return res.status(403).json({ message: "Account is not active. Please contact support." });
      }
    } else {
      const defaultName = name || targetEmail.split("@")[0];
      const providerCol = provider === "apple" ? "apple_id" : "google_id";
      const newUser = await pool.query(
        `INSERT INTO users (name, email, password, role, avatar_url, created_at)
         VALUES ($1, $2, $3, 'user', $4, NOW())
         RETURNING id, name, email, role`,
        [defaultName, targetEmail, `${provider.toUpperCase()}_AUTH`, picture || avatar_url || null]
      );
      user = newUser.rows[0];
    }

    const token = generateAccessToken(user);
    const nameParts = (user.name || "").trim().split(" ");
    const channel = detectChannel(req);

    await pool.query("UPDATE users SET last_login=NOW(), last_channel=$2 WHERE id=$1", [user.id, channel]).catch(() => {
      return pool.query("UPDATE users SET last_login=NOW() WHERE id=$1", [user.id]);
    });

    const clientIP = req.ip || req.connection?.remoteAddress || "unknown";
    upsertContext(user.id, {
      full_name: user.name,
      email: user.email,
      role: user.role,
      last_login: new Date().toISOString(),
    });
    trackActivity(user.id, "social_login", { ip: clientIP, metadata: { provider } });

    res.json({
      message: `${provider} authentication successful`,
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
    console.error("Social auth error:", err.message);
    next(err);
  }
});

module.exports = router;

