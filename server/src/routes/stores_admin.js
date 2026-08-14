// server/src/routes/stores_admin.js
// Mounted at /api/admin/stores in index.js
//
// Manages the `stores` table — physical Bems Farms store locations.
// All write endpoints require manager or superadmin role.
// ───────────────────────────────────────────────────────────────────────────

const express = require("express");
const router  = express.Router();
const pool    = require("../db/pool");
const { protect, requireRole } = require("../middleware/authMiddleware");
const validate = require("../middleware/validate");
const storeAdminSchemas = require("../schemas/storeAdminSchemas");
const { clampLimit } = require("../utils/pagination");

router.use(protect);

// ════════════════════════════════════════════════════════════════════════════
// LIST STORES  ──  GET /api/admin/stores
// ════════════════════════════════════════════════════════════════════════════
router.get("/", requireRole("superadmin", "manager"), async (req, res, next) => {
  try {
    const { status = "", search = "", page = 1, limit: limitRaw = 50 } = req.query;
    const limit = clampLimit(limitRaw, 50);
    const params = [];
    const where  = [];

    if (status) { params.push(status);  where.push(`s.status = $${params.length}`); }
    if (search) {
      params.push(`%${search}%`);
      where.push(`(s.store_name ILIKE $${params.length} OR s.address ILIKE $${params.length} OR s.city ILIKE $${params.length})`);
    }

    const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const offset = (parseInt(page) - 1) * parseInt(limit);
    params.push(parseInt(limit)); const limitIdx  = params.length;
    params.push(offset);          const offsetIdx = params.length;

    // s.store_name/store_code aliased to name/code — the field names the
    // admin UI expects. u.name AS manager_name intentionally shadows the
    // stores table's own (unused) manager_name column with the joined
    // user's actual name.
    const [rows, count] = await Promise.all([
      pool.query(
        `SELECT s.*,
                s.store_name AS name,
                s.store_code AS code,
                u.name AS manager_name
         FROM stores s
         LEFT JOIN users u ON u.id = s.manager_id
         ${clause}
         ORDER BY s.store_name
         LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
        params
      ),
      pool.query(`SELECT COUNT(*) FROM stores s ${clause}`, params.slice(0, -2)),
    ]);

    res.json({
      stores: rows.rows,
      total:  parseInt(count.rows[0].count),
      page:   parseInt(page),
      pages:  Math.ceil(parseInt(count.rows[0].count) / parseInt(limit)),
    });
  } catch (err) {
    next(err);
  }
});

// ════════════════════════════════════════════════════════════════════════════
// GET SINGLE STORE  ──  GET /api/admin/stores/:id
// ════════════════════════════════════════════════════════════════════════════
router.get("/:id", requireRole("superadmin", "manager"), async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT s.*, s.store_name AS name, s.store_code AS code, u.name AS manager_name
       FROM stores s
       LEFT JOIN users u ON u.id = s.manager_id
       WHERE s.id = $1`,
      [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ message: "Store not found" });
    res.json({ store: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// ════════════════════════════════════════════════════════════════════════════
// CREATE STORE  ──  POST /api/admin/stores
// ════════════════════════════════════════════════════════════════════════════
router.post("/", requireRole("superadmin", "manager"), validate(storeAdminSchemas.createStore), async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const {
      name, code, address, city, state, country,
      phone, email, manager_id, opening_hours, notes, status,
    } = req.body;

    const dupCode = await client.query("SELECT id FROM stores WHERE store_code=$1", [code.trim().toUpperCase()]);
    if (dupCode.rows.length) {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: `Store code "${code.trim().toUpperCase()}" is already in use` });
    }

    // Guard: ensure manager exists if provided
    if (manager_id) {
      const mgr = await client.query("SELECT id FROM users WHERE id=$1", [manager_id]);
      if (!mgr.rows.length) {
        await client.query("ROLLBACK");
        return res.status(400).json({ message: "Manager user not found" });
      }
    }

    const result = await client.query(
      `INSERT INTO stores
         (store_code, store_name, address, city, state, country, phone, email, manager_id,
          opening_hours, notes, status, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW(),NOW())
       RETURNING *, store_name AS name, store_code AS code`,
      [code.trim().toUpperCase(), name.trim(), address || null, city || null, state || null, country,
       phone || null, email || null, manager_id || null,
       opening_hours || null, notes || null, status]
    );

    await client.query("COMMIT");
    res.status(201).json({ store: result.rows[0] });
  } catch (err) {
    await client.query("ROLLBACK");
    next(err);
  } finally {
    client.release();
  }
});

// ════════════════════════════════════════════════════════════════════════════
// UPDATE STORE  ──  PATCH /api/admin/stores/:id
// ════════════════════════════════════════════════════════════════════════════
router.patch("/:id", requireRole("superadmin", "manager"), validate(storeAdminSchemas.updateStore), async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const store = await client.query("SELECT id FROM stores WHERE id=$1", [req.params.id]);
    if (!store.rows.length) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Store not found" });
    }

    // Maps the admin UI's field names to the real DB columns — `name`/`code`
    // in the request body are stored as store_name/store_code.
    const allowed = { name: "store_name", code: "store_code", address: "address", city: "city",
      state: "state", country: "country", phone: "phone", email: "email",
      manager_id: "manager_id", opening_hours: "opening_hours",
      notes: "notes", status: "status" };
    const sets   = [];
    const params = [];

    if (req.body.code !== undefined) {
      const newCode = String(req.body.code).trim().toUpperCase();
      const dupCode = await client.query(
        "SELECT id FROM stores WHERE store_code=$1 AND id!=$2",
        [newCode, req.params.id],
      );
      if (dupCode.rows.length) {
        await client.query("ROLLBACK");
        return res.status(400).json({ message: `Store code "${newCode}" is already in use` });
      }
      req.body.code = newCode;
    }

    for (const [field, column] of Object.entries(allowed)) {
      if (req.body[field] !== undefined) {
        params.push(req.body[field]);
        sets.push(`${column} = $${params.length}`);
      }
    }

    if (!sets.length) {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "No fields to update" });
    }

    params.push(req.params.id);
    const result = await client.query(
      `UPDATE stores SET ${sets.join(", ")}, updated_at=NOW() WHERE id=$${params.length} RETURNING *, store_name AS name, store_code AS code`,
      params
    );

    await client.query("COMMIT");
    res.json({ store: result.rows[0] });
  } catch (err) {
    await client.query("ROLLBACK");
    next(err);
  } finally {
    client.release();
  }
});

// ════════════════════════════════════════════════════════════════════════════
// DELETE STORE  ──  DELETE /api/admin/stores/:id  (soft delete)
// ════════════════════════════════════════════════════════════════════════════
router.delete("/:id", requireRole("superadmin"), async (req, res, next) => {
  try {
    const result = await pool.query(
      "UPDATE stores SET status='inactive', updated_at=NOW() WHERE id=$1 RETURNING id, store_name AS name",
      [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ message: "Store not found" });
    res.json({ message: `Store "${result.rows[0].name}" deactivated` });
  } catch (err) {
    next(err);
  }
});

// ════════════════════════════════════════════════════════════════════════════
// ASSIGN MANAGER  ──  POST /api/admin/stores/:id/manager
// ════════════════════════════════════════════════════════════════════════════
router.post("/:id/manager", requireRole("superadmin"), validate(storeAdminSchemas.assignManager), async (req, res, next) => {
  try {
    const { manager_id } = req.body;

    const result = await pool.query(
      "UPDATE stores SET manager_id=$1, updated_at=NOW() WHERE id=$2 RETURNING *",
      [manager_id, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ message: "Store not found" });
    res.json({ store: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// ════════════════════════════════════════════════════════════════════════════
// LIST STAFF FOR A STORE  ──  GET /api/admin/stores/:id/staff
// ════════════════════════════════════════════════════════════════════════════
router.get("/:id/staff", requireRole("superadmin", "manager"), async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT id, employee_code, name, email, phone, role, department, status
       FROM staff
       WHERE store_id=$1 OR (store_id IS NULL AND $1::INT = (
         SELECT id FROM stores ORDER BY id LIMIT 1
       ))
       ORDER BY name`,
      [req.params.id]
    );
    res.json({ staff: result.rows });
  } catch (err) {
    // Fallback if staff.store_id column doesn't exist yet
    res.json({ staff: [] });
  }
});

module.exports = router;
