// server/src/routes/staff_admin.js
// Mounted at /api/admin/staff in index.js
//
// ── REQUIRED SCHEMA MIGRATIONS ─────────────────────────────────────────────
//
// -- STAFF (employee records linked to user accounts)
// CREATE TABLE IF NOT EXISTS staff (
//   id                SERIAL PRIMARY KEY,
//   user_id           INT REFERENCES users(id) ON DELETE SET NULL,
//   employee_code     VARCHAR(20) UNIQUE,
//   department        VARCHAR(100),
//   role              VARCHAR(100),
//   shift             VARCHAR(20) DEFAULT 'morning',
//   basic_salary      DECIMAL(12,2),
//   hire_date         DATE,
//   bank_name         VARCHAR(100),
//   account_number    VARCHAR(30),
//   account_name      VARCHAR(255),
//   emergency_contact VARCHAR(100),
//   emergency_phone   VARCHAR(20),
//   address           TEXT,
//   notes             TEXT,
//   status            VARCHAR(20) DEFAULT 'active',
//   created_at        TIMESTAMP DEFAULT NOW(),
//   updated_at        TIMESTAMP DEFAULT NOW()
// );
//
// -- STAFF ATTENDANCE
// CREATE TABLE IF NOT EXISTS staff_attendance (
//   id          SERIAL PRIMARY KEY,
//   staff_id    INT REFERENCES staff(id) ON DELETE CASCADE,
//   date        DATE NOT NULL,
//   clock_in    TIMESTAMP,
//   clock_out   TIMESTAMP,
//   status      VARCHAR(20) DEFAULT 'present',  -- present | absent | late | half_day
//   notes       TEXT,
//   created_by  INT REFERENCES users(id) ON DELETE SET NULL,
//   created_at  TIMESTAMP DEFAULT NOW(),
//   UNIQUE (staff_id, date)
// );
// CREATE INDEX IF NOT EXISTS idx_attendance_date ON staff_attendance(date DESC);
//
// -- STAFF PAYROLL
// CREATE TABLE IF NOT EXISTS staff_payroll (
//   id             SERIAL PRIMARY KEY,
//   staff_id       INT REFERENCES staff(id) ON DELETE CASCADE,
//   month          INT NOT NULL,
//   year           INT NOT NULL,
//   basic_salary   DECIMAL(12,2),
//   bonuses        DECIMAL(12,2) DEFAULT 0,
//   deductions     DECIMAL(12,2) DEFAULT 0,
//   tax            DECIMAL(12,2) DEFAULT 0,
//   net_pay        DECIMAL(12,2),
//   days_worked    INT DEFAULT 0,
//   days_absent    INT DEFAULT 0,
//   status         VARCHAR(20) DEFAULT 'draft',  -- draft | approved | paid
//   payment_date   DATE,
//   payment_ref    VARCHAR(100),
//   created_by     INT REFERENCES users(id) ON DELETE SET NULL,
//   created_at     TIMESTAMP DEFAULT NOW(),
//   UNIQUE (staff_id, month, year)
// );
//
// -- STAFF SCHEDULE
// CREATE TABLE IF NOT EXISTS staff_schedule (
//   id          SERIAL PRIMARY KEY,
//   staff_id    INT REFERENCES staff(id) ON DELETE CASCADE,
//   date        DATE NOT NULL,
//   shift_start TIME,
//   shift_end   TIME,
//   shift_type  VARCHAR(20) DEFAULT 'morning',  -- morning | afternoon | night | off
//   notes       TEXT,
//   created_by  INT REFERENCES users(id) ON DELETE SET NULL,
//   created_at  TIMESTAMP DEFAULT NOW(),
//   UNIQUE (staff_id, date)
// );
//
// -- STAFF HOLIDAYS / LEAVE
// CREATE TABLE IF NOT EXISTS staff_holidays (
//   id          SERIAL PRIMARY KEY,
//   staff_id    INT REFERENCES staff(id) ON DELETE CASCADE,
//   type        VARCHAR(30) DEFAULT 'annual',  -- annual | sick | maternity | emergency | unpaid
//   start_date  DATE NOT NULL,
//   end_date    DATE NOT NULL,
//   days        INT,
//   reason      TEXT,
//   status      VARCHAR(20) DEFAULT 'pending',  -- pending | approved | rejected
//   approved_by INT REFERENCES users(id) ON DELETE SET NULL,
//   notes       TEXT,
//   created_at  TIMESTAMP DEFAULT NOW()
// );
//
// -- STAFF ROLES & PERMISSIONS
// CREATE TABLE IF NOT EXISTS staff_roles (
//   id          SERIAL PRIMARY KEY,
//   name        VARCHAR(100) UNIQUE NOT NULL,
//   description TEXT,
//   permissions JSONB DEFAULT '[]',
//   is_system   BOOLEAN DEFAULT false,
//   created_at  TIMESTAMP DEFAULT NOW(),
//   updated_at  TIMESTAMP DEFAULT NOW()
// );
// INSERT INTO staff_roles (name, description, is_system, permissions) VALUES
//   ('superadmin',       'Full system access',         true, '["*"]'),
//   ('manager',          'Store manager',               true, '["orders","products","customers","inventory","staff","reports","accounts"]'),
//   ('cashier',          'POS cashier',                 true, '["pos","orders.view","customers.view"]'),
//   ('storekeeper',      'Inventory keeper',            true, '["inventory","products.view","suppliers.view"]'),
//   ('delivery_manager', 'Delivery operations manager', true, '["deliveries","orders.view","drivers"]')
// ON CONFLICT (name) DO NOTHING;
//
// ───────────────────────────────────────────────────────────────────────────

const express  = require("express");
const router   = express.Router();
const bcrypt   = require("bcryptjs");
const pool     = require("../db/pool");
const { protect, requireRole } = require("../middleware/authMiddleware");

router.use(protect);

// ── HELPER: generate employee code ──────────────────────────────────────────
async function generateEmployeeCode(client) {
  const row = await client.query("SELECT COUNT(*) FROM staff");
  const n   = parseInt(row.rows[0].count) + 1;
  return `EMP-${String(n).padStart(3, "0")}`;
}

// ════════════════════════════════════════════════════════════════════════════
// STAFF LIST  ──  GET /api/admin/staff
// ════════════════════════════════════════════════════════════════════════════
router.get("/", async (req, res) => {
  try {
    const { page = 1, limit = 20, search = "", department = "", status = "", role = "" } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const params = [];
    const where  = [];

    if (search) {
      params.push(`%${search}%`);
      where.push(`(u.name ILIKE $${params.length} OR u.email ILIKE $${params.length} OR s.employee_code ILIKE $${params.length} OR u.phone ILIKE $${params.length})`);
    }
    if (department) { params.push(department); where.push(`s.department = $${params.length}`); }
    if (status)     { params.push(status);     where.push(`s.status = $${params.length}`);     }
    if (role)       { params.push(role);        where.push(`s.role = $${params.length}`);       }

    const whereClause = where.length ? "WHERE " + where.join(" AND ") : "";

    const countRes = await pool.query(
      `SELECT COUNT(*) FROM staff s JOIN users u ON s.user_id = u.id ${whereClause}`, params
    );
    const total = parseInt(countRes.rows[0].count);

    params.push(parseInt(limit));
    params.push(offset);

    const rows = await pool.query(`
      SELECT
        s.id, s.employee_code, s.department, s.role, s.shift,
        s.basic_salary, s.hire_date, s.status, s.created_at,
        u.id AS user_id, u.name, u.email, u.phone, u.avatar_url,
        (SELECT status FROM staff_attendance
         WHERE staff_id = s.id AND date = CURRENT_DATE
         LIMIT 1) AS today_status,
        (SELECT COUNT(*) FROM staff_attendance
         WHERE staff_id = s.id
           AND date >= DATE_TRUNC('month', NOW())
           AND status = 'present') AS present_this_month
      FROM staff s
      JOIN users u ON s.user_id = u.id
      ${whereClause}
      ORDER BY s.created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `, params);

    // Summary stats
    const stats = await pool.query(`
      SELECT
        COUNT(*)                                      AS total,
        COUNT(*) FILTER (WHERE s.status = 'active')   AS active,
        COUNT(*) FILTER (WHERE sa.status = 'present' AND sa.date = CURRENT_DATE) AS on_duty_today,
        COUNT(DISTINCT s.department)                  AS departments
      FROM staff s
      LEFT JOIN staff_attendance sa ON sa.staff_id = s.id AND sa.date = CURRENT_DATE
    `);

    res.json({
      staff: rows.rows,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      stats: stats.rows[0],
    });
  } catch (err) {
    console.error("GET /admin/staff:", err.message);
    res.status(500).json({ message: err.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// STAFF DETAIL  ──  GET /api/admin/staff/:id
// ════════════════════════════════════════════════════════════════════════════
router.get("/:id", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        s.*, u.name, u.email, u.phone, u.avatar_url, u.role AS system_role
      FROM staff s
      JOIN users u ON s.user_id = u.id
      WHERE s.id = $1
    `, [req.params.id]);

    if (!result.rows.length) return res.status(404).json({ message: "Staff member not found" });

    const member = result.rows[0];

    const [attendance, payroll, upcoming, holidays] = await Promise.all([
      pool.query(`
        SELECT date, status, clock_in, clock_out
        FROM staff_attendance
        WHERE staff_id = $1
        ORDER BY date DESC LIMIT 30
      `, [member.id]),

      pool.query(`
        SELECT * FROM staff_payroll
        WHERE staff_id = $1
        ORDER BY year DESC, month DESC
        LIMIT 6
      `, [member.id]),

      pool.query(`
        SELECT * FROM staff_schedule
        WHERE staff_id = $1 AND date >= CURRENT_DATE
        ORDER BY date ASC LIMIT 7
      `, [member.id]),

      pool.query(`
        SELECT * FROM staff_holidays
        WHERE staff_id = $1
        ORDER BY created_at DESC LIMIT 10
      `, [member.id]),
    ]);

    res.json({
      ...member,
      attendance: attendance.rows,
      payroll: payroll.rows,
      upcoming_shifts: upcoming.rows,
      holidays: holidays.rows,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// ADD STAFF  ──  POST /api/admin/staff
// Creates user account + staff record in a single transaction
// ════════════════════════════════════════════════════════════════════════════
router.post(
  "/",
  requireRole("superadmin", "manager"),
  async (req, res) => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const {
        name, email, phone, password,
        department, role, shift = "morning",
        basic_salary, hire_date,
        bank_name, account_number, account_name,
        emergency_contact, emergency_phone,
        address, notes,
        system_role = "cashier",
      } = req.body;

      if (!name?.trim())    return res.status(400).json({ message: "Name is required" });
      if (!email?.includes("@")) return res.status(400).json({ message: "Valid email required" });
      if (!department)      return res.status(400).json({ message: "Department is required" });
      if (!role)            return res.status(400).json({ message: "Role/position is required" });

      const existing = await client.query("SELECT id FROM users WHERE LOWER(email)=LOWER($1)", [email]);
      if (existing.rows.length) return res.status(400).json({ message: "Email already in use" });

      const tempPassword = password || `Bems@${Math.floor(1000 + Math.random() * 9000)}`;
      const hash = await bcrypt.hash(tempPassword, 12);

      const userRes = await client.query(
        `INSERT INTO users (name, email, password, phone, role, status, created_at)
         VALUES ($1,$2,$3,$4,$5,'active',NOW()) RETURNING id, name, email, role`,
        [name.trim(), email.toLowerCase().trim(), hash, phone || null, system_role]
      );
      const user = userRes.rows[0];

      const code = await generateEmployeeCode(client);

      const staffRes = await client.query(
        `INSERT INTO staff
           (user_id, employee_code, department, role, shift, basic_salary, hire_date,
            bank_name, account_number, account_name,
            emergency_contact, emergency_phone, address, notes, status, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'active',NOW(),NOW())
         RETURNING *`,
        [
          user.id, code, department, role, shift,
          basic_salary ? parseFloat(basic_salary) : null,
          hire_date || null,
          bank_name || null, account_number || null, account_name || null,
          emergency_contact || null, emergency_phone || null,
          address || null, notes || null,
        ]
      );

      await client.query("COMMIT");
      res.status(201).json({
        staff: { ...staffRes.rows[0], name: user.name, email: user.email },
        temp_password: password ? undefined : tempPassword,
        message: "Staff member created successfully",
      });
    } catch (err) {
      await client.query("ROLLBACK");
      console.error("POST /admin/staff:", err.message);
      res.status(500).json({ message: err.message });
    } finally {
      client.release();
    }
  }
);

// ════════════════════════════════════════════════════════════════════════════
// UPDATE STAFF  ──  PATCH /api/admin/staff/:id
// ════════════════════════════════════════════════════════════════════════════
router.patch("/:id", requireRole("superadmin", "manager"), async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const {
      name, phone, department, role, shift, basic_salary, hire_date,
      bank_name, account_number, account_name,
      emergency_contact, emergency_phone, address, notes,
    } = req.body;

    const cur = await client.query("SELECT user_id FROM staff WHERE id=$1", [req.params.id]);
    if (!cur.rows.length) return res.status(404).json({ message: "Staff member not found" });

    if (name || phone) {
      await client.query(
        "UPDATE users SET name=COALESCE($1,name), phone=COALESCE($2,phone) WHERE id=$3",
        [name || null, phone || null, cur.rows[0].user_id]
      );
    }

    await client.query(
      `UPDATE staff SET
         department        = COALESCE($1, department),
         role              = COALESCE($2, role),
         shift             = COALESCE($3, shift),
         basic_salary      = COALESCE($4, basic_salary),
         hire_date         = COALESCE($5, hire_date),
         bank_name         = COALESCE($6, bank_name),
         account_number    = COALESCE($7, account_number),
         account_name      = COALESCE($8, account_name),
         emergency_contact = COALESCE($9, emergency_contact),
         emergency_phone   = COALESCE($10, emergency_phone),
         address           = COALESCE($11, address),
         notes             = COALESCE($12, notes),
         updated_at        = NOW()
       WHERE id = $13`,
      [department||null, role||null, shift||null, basic_salary?parseFloat(basic_salary):null,
       hire_date||null, bank_name||null, account_number||null, account_name||null,
       emergency_contact||null, emergency_phone||null, address||null, notes||null,
       req.params.id]
    );

    await client.query("COMMIT");
    res.json({ message: "Staff member updated" });
  } catch (err) {
    await client.query("ROLLBACK");
    res.status(500).json({ message: err.message });
  } finally {
    client.release();
  }
});

// ════════════════════════════════════════════════════════════════════════════
// STATUS CHANGE  ──  PATCH /api/admin/staff/:id/status
// ════════════════════════════════════════════════════════════════════════════
router.patch("/:id/status", requireRole("superadmin", "manager"), async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ["active", "inactive", "suspended", "on_leave"];
    if (!allowed.includes(status)) return res.status(400).json({ message: `status must be one of: ${allowed.join(", ")}` });

    const cur = await pool.query("SELECT user_id FROM staff WHERE id=$1", [req.params.id]);
    if (!cur.rows.length) return res.status(404).json({ message: "Staff member not found" });

    await Promise.all([
      pool.query("UPDATE staff SET status=$1, updated_at=NOW() WHERE id=$2", [status, req.params.id]),
      pool.query("UPDATE users SET status=$1 WHERE id=$2", [status === "active" ? "active" : "inactive", cur.rows[0].user_id]),
    ]);

    res.json({ message: `Staff member ${status}` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// SOFT DELETE  ──  DELETE /api/admin/staff/:id
// ════════════════════════════════════════════════════════════════════════════
router.delete("/:id", requireRole("superadmin"), async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const cur = await client.query("SELECT user_id FROM staff WHERE id=$1", [req.params.id]);
    if (!cur.rows.length) return res.status(404).json({ message: "Staff member not found" });

    await client.query("UPDATE staff SET status='inactive', updated_at=NOW() WHERE id=$1", [req.params.id]);
    await client.query("UPDATE users SET status='inactive' WHERE id=$1", [cur.rows[0].user_id]);
    await client.query("COMMIT");
    res.json({ message: "Staff member deactivated" });
  } catch (err) {
    await client.query("ROLLBACK");
    res.status(500).json({ message: err.message });
  } finally {
    client.release();
  }
});

// ════════════════════════════════════════════════════════════════════════════
// ATTENDANCE  ──  GET /api/admin/staff/attendance
// ════════════════════════════════════════════════════════════════════════════
router.get("/attendance", async (req, res) => {
  try {
    const { date = new Date().toISOString().slice(0, 10), page = 1, limit = 50, staff_id = "" } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const params = [date];
    const extra  = staff_id ? ["sa.staff_id = $2"] : [];

    if (staff_id) params.push(parseInt(staff_id));
    const whereClause = extra.length ? "AND " + extra.join(" AND ") : "";

    const rows = await pool.query(`
      SELECT
        sa.id, sa.date, sa.status, sa.clock_in, sa.clock_out, sa.notes,
        s.id AS staff_id, s.employee_code, s.department, s.role,
        u.name, u.avatar_url,
        EXTRACT(EPOCH FROM (sa.clock_out - sa.clock_in))/3600 AS hours_worked
      FROM staff_attendance sa
      JOIN staff s ON sa.staff_id = s.id
      JOIN users u ON s.user_id   = u.id
      WHERE sa.date = $1 ${whereClause}
      ORDER BY sa.clock_in ASC NULLS LAST
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `, [...params, parseInt(limit), offset]);

    // Day summary
    const summary = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'present')  AS present,
        COUNT(*) FILTER (WHERE status = 'absent')   AS absent,
        COUNT(*) FILTER (WHERE status = 'late')     AS late,
        COUNT(*) FILTER (WHERE status = 'half_day') AS half_day,
        (SELECT COUNT(*) FROM staff WHERE status = 'active') AS total_staff
      FROM staff_attendance WHERE date = $1
    `, [date]);

    res.json({ attendance: rows.rows, summary: summary.rows[0], date });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// CLOCK IN  ──  POST /api/admin/staff/attendance/clock-in
router.post(
  "/attendance/clock-in",
  requireRole("superadmin", "manager", "admin"),
  async (req, res) => {
    try {
      const { staff_id, notes } = req.body;
      if (!staff_id) return res.status(400).json({ message: "staff_id required" });

      const today    = new Date().toISOString().slice(0, 10);
      const nowTime  = new Date();

      // Determine late status (if after 9:00 AM WAT)
      const hour   = nowTime.getUTCHours() + 1; // rough WAT offset
      const status = hour >= 9 ? "late" : "present";

      const result = await pool.query(
        `INSERT INTO staff_attendance (staff_id, date, clock_in, status, notes, created_by, created_at)
         VALUES ($1,$2,NOW(),$3,$4,$5,NOW())
         ON CONFLICT (staff_id, date) DO UPDATE
           SET clock_in = NOW(), status = EXCLUDED.status, notes = COALESCE(EXCLUDED.notes, staff_attendance.notes)
         RETURNING *`,
        [parseInt(staff_id), today, status, notes || null, req.user.id]
      );

      res.json({ attendance: result.rows[0], message: "Clocked in successfully" });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

// CLOCK OUT  ──  POST /api/admin/staff/attendance/clock-out
router.post(
  "/attendance/clock-out",
  requireRole("superadmin", "manager", "admin"),
  async (req, res) => {
    try {
      const { staff_id, notes } = req.body;
      if (!staff_id) return res.status(400).json({ message: "staff_id required" });

      const today = new Date().toISOString().slice(0, 10);

      const result = await pool.query(
        `UPDATE staff_attendance SET clock_out=NOW(), notes=COALESCE($1, notes)
         WHERE staff_id=$2 AND date=$3
         RETURNING *, EXTRACT(EPOCH FROM (clock_out - clock_in))/3600 AS hours_worked`,
        [notes || null, parseInt(staff_id), today]
      );

      if (!result.rows.length) return res.status(400).json({ message: "No clock-in record found for today. Clock in first." });
      res.json({ attendance: result.rows[0], message: "Clocked out successfully" });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

// MANUAL ATTENDANCE CORRECTION  ──  PATCH /api/admin/staff/attendance/:id
router.patch(
  "/attendance/:id",
  requireRole("superadmin", "manager"),
  async (req, res) => {
    try {
      const { status, clock_in, clock_out, notes } = req.body;
      const result = await pool.query(
        `UPDATE staff_attendance SET
           status    = COALESCE($1, status),
           clock_in  = COALESCE($2::TIMESTAMP, clock_in),
           clock_out = COALESCE($3::TIMESTAMP, clock_out),
           notes     = COALESCE($4, notes)
         WHERE id = $5 RETURNING *`,
        [status || null, clock_in || null, clock_out || null, notes || null, req.params.id]
      );
      if (!result.rows.length) return res.status(404).json({ message: "Attendance record not found" });
      res.json({ attendance: result.rows[0] });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

// MARK ABSENT (bulk) ── POST /api/admin/staff/attendance/mark-absent
router.post("/attendance/mark-absent", requireRole("superadmin", "manager"), async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    await pool.query(`
      INSERT INTO staff_attendance (staff_id, date, status, created_by, created_at)
      SELECT s.id, $1, 'absent', $2, NOW()
      FROM staff s
      WHERE s.status = 'active'
        AND s.id NOT IN (SELECT staff_id FROM staff_attendance WHERE date = $1)
      ON CONFLICT (staff_id, date) DO NOTHING
    `, [today, req.user.id]);
    res.json({ message: "Absent records created for all unmarked active staff" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// SCHEDULE  ──  GET /api/admin/staff/schedule
// ════════════════════════════════════════════════════════════════════════════
router.get("/schedule", async (req, res) => {
  try {
    const { week_start } = req.query;
    const start = week_start || new Date().toISOString().slice(0, 10);

    const rows = await pool.query(`
      SELECT
        ss.id, ss.date, ss.shift_type, ss.shift_start, ss.shift_end, ss.notes,
        s.id AS staff_id, s.employee_code, s.department, s.role,
        u.name, u.avatar_url
      FROM staff_schedule ss
      JOIN staff s ON ss.staff_id = s.id
      JOIN users u ON s.user_id   = u.id
      WHERE ss.date BETWEEN $1::DATE AND $1::DATE + INTERVAL '6 days'
      ORDER BY ss.date ASC, ss.shift_start ASC
    `, [start]);

    res.json({ schedule: rows.rows, week_start: start });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/schedule", requireRole("superadmin", "manager"), async (req, res) => {
  try {
    const { staff_id, date, shift_type, shift_start, shift_end, notes } = req.body;
    if (!staff_id || !date) return res.status(400).json({ message: "staff_id and date required" });

    const result = await pool.query(
      `INSERT INTO staff_schedule (staff_id, date, shift_type, shift_start, shift_end, notes, created_by, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())
       ON CONFLICT (staff_id, date) DO UPDATE SET
         shift_type  = EXCLUDED.shift_type,
         shift_start = EXCLUDED.shift_start,
         shift_end   = EXCLUDED.shift_end,
         notes       = EXCLUDED.notes
       RETURNING *`,
      [parseInt(staff_id), date, shift_type || "morning", shift_start || null, shift_end || null, notes || null, req.user.id]
    );
    res.status(201).json({ schedule: result.rows[0] });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete("/schedule/:id", requireRole("superadmin", "manager"), async (req, res) => {
  try {
    await pool.query("DELETE FROM staff_schedule WHERE id=$1", [req.params.id]);
    res.json({ message: "Schedule entry removed" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// HOLIDAYS / LEAVE  ──  GET /api/admin/staff/holidays
// ════════════════════════════════════════════════════════════════════════════
router.get("/holidays", async (req, res) => {
  try {
    const { status = "", staff_id = "", page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const params = [];
    const where  = [];

    if (status)   { params.push(status);              where.push(`sh.status = $${params.length}`);   }
    if (staff_id) { params.push(parseInt(staff_id));  where.push(`sh.staff_id = $${params.length}`); }

    const whereClause = where.length ? "WHERE " + where.join(" AND ") : "";
    const countRes    = await pool.query(`SELECT COUNT(*) FROM staff_holidays sh ${whereClause}`, params);

    params.push(parseInt(limit));
    params.push(offset);

    const rows = await pool.query(`
      SELECT
        sh.*,
        s.employee_code, s.department,
        u.name AS staff_name,
        a.name AS approved_by_name
      FROM staff_holidays sh
      JOIN staff s  ON sh.staff_id   = s.id
      JOIN users u  ON s.user_id     = u.id
      LEFT JOIN users a ON sh.approved_by = a.id
      ${whereClause}
      ORDER BY sh.created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `, params);

    res.json({
      holidays: rows.rows,
      total: parseInt(countRes.rows[0].count),
      page: parseInt(page),
      pages: Math.ceil(parseInt(countRes.rows[0].count) / parseInt(limit)),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/holidays", requireRole("superadmin", "manager"), async (req, res) => {
  try {
    const { staff_id, type, start_date, end_date, reason, notes } = req.body;
    if (!staff_id)   return res.status(400).json({ message: "staff_id required" });
    if (!start_date) return res.status(400).json({ message: "start_date required" });
    if (!end_date)   return res.status(400).json({ message: "end_date required" });

    const start = new Date(start_date);
    const end   = new Date(end_date);
    if (end < start) return res.status(400).json({ message: "end_date must be after start_date" });

    // Count working days (rough: exclude weekends)
    let days = 0;
    const cur = new Date(start);
    while (cur <= end) {
      if (cur.getDay() !== 0 && cur.getDay() !== 6) days++;
      cur.setDate(cur.getDate() + 1);
    }

    const result = await pool.query(
      `INSERT INTO staff_holidays (staff_id, type, start_date, end_date, days, reason, notes, status, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'pending',NOW()) RETURNING *`,
      [parseInt(staff_id), type || "annual", start_date, end_date, days, reason || null, notes || null]
    );
    res.status(201).json({ holiday: result.rows[0], working_days: days });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.patch("/holidays/:id/approve", requireRole("superadmin", "manager"), async (req, res) => {
  try {
    const { action, notes } = req.body; // "approve" | "reject"
    if (!["approve", "reject"].includes(action)) return res.status(400).json({ message: "action must be approve or reject" });

    const status = action === "approve" ? "approved" : "rejected";
    const result = await pool.query(
      "UPDATE staff_holidays SET status=$1, approved_by=$2, notes=COALESCE($3,notes) WHERE id=$4 RETURNING *",
      [status, req.user.id, notes || null, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ message: "Leave request not found" });

    // If approved, mark those days as leave in attendance
    if (status === "approved") {
      const h = result.rows[0];
      const cur = new Date(h.start_date);
      const end = new Date(h.end_date);
      while (cur <= end) {
        const dateStr = cur.toISOString().slice(0, 10);
        await pool.query(
          `INSERT INTO staff_attendance (staff_id, date, status, notes, created_by, created_at)
           VALUES ($1,$2,'absent',$3,$4,NOW())
           ON CONFLICT (staff_id, date) DO UPDATE SET status='absent', notes=EXCLUDED.notes`,
          [h.staff_id, dateStr, `Approved ${h.type} leave`, req.user.id]
        );
        cur.setDate(cur.getDate() + 1);
      }
    }

    res.json({ message: `Leave request ${status}`, holiday: result.rows[0] });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// PAYROLL  ──  GET /api/admin/staff/payroll
// ════════════════════════════════════════════════════════════════════════════
router.get("/payroll", async (req, res) => {
  try {
    const now   = new Date();
    const month = parseInt(req.query.month) || now.getMonth() + 1;
    const year  = parseInt(req.query.year)  || now.getFullYear();

    const rows = await pool.query(`
      SELECT
        sp.*,
        s.employee_code, s.department, s.role,
        u.name, u.email, u.avatar_url
      FROM staff_payroll sp
      JOIN staff s ON sp.staff_id = s.id
      JOIN users u ON s.user_id   = u.id
      WHERE sp.month = $1 AND sp.year = $2
      ORDER BY u.name ASC
    `, [month, year]);

    const summary = await pool.query(`
      SELECT
        COUNT(*)                                        AS total_staff,
        COALESCE(SUM(basic_salary), 0)                  AS total_basic,
        COALESCE(SUM(bonuses), 0)                       AS total_bonuses,
        COALESCE(SUM(deductions), 0)                    AS total_deductions,
        COALESCE(SUM(net_pay), 0)                       AS total_net_pay,
        COUNT(*) FILTER (WHERE status = 'paid')         AS paid_count,
        COUNT(*) FILTER (WHERE status = 'approved')     AS approved_count,
        COUNT(*) FILTER (WHERE status = 'draft')        AS draft_count
      FROM staff_payroll
      WHERE month = $1 AND year = $2
    `, [month, year]);

    res.json({ payroll: rows.rows, summary: summary.rows[0], month, year });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GENERATE PAYROLL  ──  POST /api/admin/staff/payroll/generate
router.post("/payroll/generate", requireRole("superadmin", "manager"), async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const now   = new Date();
    const month = parseInt(req.body.month) || now.getMonth() + 1;
    const year  = parseInt(req.body.year)  || now.getFullYear();
    const { bonuses = {}, deductions = {} } = req.body;

    // Get all active staff
    const staffRows = await client.query(
      "SELECT s.id, s.basic_salary FROM staff s WHERE s.status = 'active'"
    );

    let generated = 0;
    for (const s of staffRows.rows) {
      // Count attendance for the month
      const att = await client.query(`
        SELECT
          COUNT(*) FILTER (WHERE status = 'present' OR status = 'late') AS days_worked,
          COUNT(*) FILTER (WHERE status = 'absent') AS days_absent
        FROM staff_attendance
        WHERE staff_id = $1
          AND EXTRACT(MONTH FROM date) = $2
          AND EXTRACT(YEAR  FROM date) = $3
      `, [s.id, month, year]);

      const daysWorked  = parseInt(att.rows[0]?.days_worked)  || 0;
      const daysAbsent  = parseInt(att.rows[0]?.days_absent)  || 0;
      const basicSalary = parseFloat(s.basic_salary) || 0;
      const bonus       = parseFloat(bonuses[s.id])       || 0;
      const deduction   = parseFloat(deductions[s.id])    || 0;
      const taxRate     = 0.075; // Nigerian PAYE base — 7.5%
      const tax         = basicSalary * taxRate;
      const netPay      = basicSalary + bonus - deduction - tax;

      await client.query(
        `INSERT INTO staff_payroll
           (staff_id, month, year, basic_salary, bonuses, deductions, tax, net_pay, days_worked, days_absent, status, created_by, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'draft',$11,NOW())
         ON CONFLICT (staff_id, month, year) DO UPDATE SET
           basic_salary = EXCLUDED.basic_salary,
           bonuses      = EXCLUDED.bonuses,
           deductions   = EXCLUDED.deductions,
           tax          = EXCLUDED.tax,
           net_pay      = EXCLUDED.net_pay,
           days_worked  = EXCLUDED.days_worked,
           days_absent  = EXCLUDED.days_absent,
           status       = CASE WHEN staff_payroll.status = 'paid' THEN 'paid' ELSE 'draft' END`,
        [s.id, month, year, basicSalary, bonus, deduction, tax, netPay, daysWorked, daysAbsent, req.user.id]
      );
      generated++;
    }

    await client.query("COMMIT");
    res.json({ message: `Payroll generated for ${generated} staff members`, month, year });
  } catch (err) {
    await client.query("ROLLBACK");
    res.status(500).json({ message: err.message });
  } finally {
    client.release();
  }
});

// APPROVE / MARK PAID  ──  PATCH /api/admin/staff/payroll/:id
router.patch("/payroll/:id", requireRole("superadmin", "manager"), async (req, res) => {
  try {
    const { status, payment_date, payment_ref, bonuses, deductions } = req.body;
    const allowed = ["draft", "approved", "paid"];
    if (status && !allowed.includes(status)) return res.status(400).json({ message: `status must be: ${allowed.join(", ")}` });

    const result = await pool.query(
      `UPDATE staff_payroll SET
         status       = COALESCE($1, status),
         payment_date = COALESCE($2::DATE, payment_date),
         payment_ref  = COALESCE($3, payment_ref),
         bonuses      = COALESCE($4, bonuses),
         deductions   = COALESCE($5, deductions),
         net_pay      = basic_salary + COALESCE($4, bonuses) - COALESCE($5, deductions) - tax
       WHERE id = $6 RETURNING *`,
      [status || null, payment_date || null, payment_ref || null, bonuses !== undefined ? parseFloat(bonuses) : null, deductions !== undefined ? parseFloat(deductions) : null, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ message: "Payroll record not found" });
    res.json({ payroll: result.rows[0] });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// ROLES & PERMISSIONS  ──  GET /api/admin/staff/roles
// ════════════════════════════════════════════════════════════════════════════
router.get("/roles", async (req, res) => {
  try {
    const roles = await pool.query(`
      SELECT sr.*,
        (SELECT COUNT(*) FROM staff s
         JOIN users u ON s.user_id = u.id
         WHERE u.role = sr.name AND s.status = 'active') AS staff_count
      FROM staff_roles sr
      ORDER BY sr.is_system DESC, sr.name ASC
    `);
    res.json({ roles: roles.rows });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/roles", requireRole("superadmin"), async (req, res) => {
  try {
    const { name, description, permissions = [] } = req.body;
    if (!name?.trim()) return res.status(400).json({ message: "Role name required" });

    const result = await pool.query(
      `INSERT INTO staff_roles (name, description, permissions, is_system, created_at, updated_at)
       VALUES ($1,$2,$3,false,NOW(),NOW()) RETURNING *`,
      [name.toLowerCase().replace(/\s+/g, "_"), description || null, JSON.stringify(permissions)]
    );
    res.status(201).json({ role: result.rows[0] });
  } catch (err) {
    if (err.code === "23505") return res.status(400).json({ message: "A role with that name already exists" });
    res.status(500).json({ message: err.message });
  }
});

router.patch("/roles/:id", requireRole("superadmin"), async (req, res) => {
  try {
    const { description, permissions } = req.body;

    const cur = await pool.query("SELECT is_system FROM staff_roles WHERE id=$1", [req.params.id]);
    if (!cur.rows.length) return res.status(404).json({ message: "Role not found" });
    if (cur.rows[0].is_system) return res.status(403).json({ message: "System roles cannot be modified" });

    const result = await pool.query(
      `UPDATE staff_roles SET
         description = COALESCE($1, description),
         permissions = COALESCE($2::JSONB, permissions),
         updated_at  = NOW()
       WHERE id = $3 RETURNING *`,
      [description || null, permissions ? JSON.stringify(permissions) : null, req.params.id]
    );
    res.json({ role: result.rows[0] });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete("/roles/:id", requireRole("superadmin"), async (req, res) => {
  try {
    const cur = await pool.query("SELECT is_system FROM staff_roles WHERE id=$1", [req.params.id]);
    if (!cur.rows.length) return res.status(404).json({ message: "Role not found" });
    if (cur.rows[0].is_system) return res.status(403).json({ message: "System roles cannot be deleted" });

    await pool.query("DELETE FROM staff_roles WHERE id=$1", [req.params.id]);
    res.json({ message: "Role deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
