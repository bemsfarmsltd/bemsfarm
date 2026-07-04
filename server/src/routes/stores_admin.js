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

router.use(protect);

// ════════════════════════════════════════════════════════════════════════════
// LIST STORES  ──  GET /api/admin/stores
// ════════════════════════════════════════════════════════════════════════════
router.get("/", async (req, res) => {
  try {
    const { status = "", search = "", page = 1, limit = 50 } = req.query;
    const params = [];
    const where  = [];

    if (status) { params.push(status);  where.push(`s.status = $${params.length}`); }
    if (search) {
      params.push(`%${search}%`);
      where.push(`(s.name ILIKE $${params.length} OR s.address ILIKE $${params.length} OR s.city ILIKE $${params.length})`);
    }

    const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const offset = (parseInt(page) - 1) * parseInt(limit);
    params.push(parseInt(limit)); const limitIdx  = params.length;
    params.push(offset);          const offsetIdx = params.length;

    const [rows, count] = await Promise.all([
      pool.query(
        `SELECT s.*,
                u.name AS manager_name
         FROM stores s
         LEFT JOIN users u ON u.id = s.manager_id
         ${clause}
         ORDER BY s.name
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
    res.status(500).json({ message: err.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// GET SINGLE STORE  ──  GET /api/admin/stores/:id
// ════════════════════════════════════════════════════════════════════════════
router.get("/:id", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT s.*, u.name AS manager_name
       FROM stores s
       LEFT JOIN users u ON u.id = s.manager_id
       WHERE s.id = $1`,
      [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ message: "Store not found" });
    res.json({ store: result.rows[0] });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// CREATE STORE  ──  POST /api/admin/stores
// ════════════════════════════════════════════════════════════════════════════
router.post("/", requireRole("superadmin", "manager"), async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const {
      name, address, city, state, country = "Nigeria",
      phone, email, manager_id, opening_hours, notes, status = "active",
    } = req.body;

    if (!name?.trim()) return res.status(400).json({ message: "Store name is required" });

    // Guard: ensure manager exists if provided
    if (manager_id) {
      const mgr = await client.query("SELECT id FROM users WHERE id=$1", [manager_id]);
      if (!mgr.rows.length) return res.status(400).json({ message: "Manager user not found" });
    }

    const result = await client.query(
      `INSERT INTO stores
         (name, address, city, state, country, phone, email, manager_id,
          opening_hours, notes, status, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW(),NOW())
       RETURNING *`,
      [name.trim(), address || null, city || null, state || null, country,
       phone || null, email || null, manager_id || null,
       opening_hours || null, notes || null, status]
    );

    await client.query("COMMIT");
    res.status(201).json({ store: result.rows[0] });
  } catch (err) {
    await client.query("ROLLBACK");
    res.status(500).json({ message: err.message });
  } finally {
    client.release();
  }
});

// ════════════════════════════════════════════════════════════════════════════
// UPDATE STORE  ──  PATCH /api/admin/stores/:id
// ════════════════════════════════════════════════════════════════════════════
router.patch("/:id", requireRole("superadmin", "manager"), async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const store = await client.query("SELECT id FROM stores WHERE id=$1", [req.params.id]);
    if (!store.rows.length) return res.status(404).json({ message: "Store not found" });

    const allowed = ["name","address","city","state","country","phone","email",
                     "manager_id","opening_hours","notes","status"];
    const sets   = [];
    const params = [];

    for (const field of allowed) {
      if (req.body[field] !== undefined) {
        params.push(req.body[field]);
        sets.push(`${field} = $${params.length}`);
      }
    }

    if (!sets.length) return res.status(400).json({ message: "No fields to update" });

    params.push(req.params.id);
    const result = await client.query(
      `UPDATE stores SET ${sets.join(", ")}, updated_at=NOW() WHERE id=$${params.length} RETURNING *`,
      params
    );

    await client.query("COMMIT");
    res.json({ store: result.rows[0] });
  } catch (err) {
    await client.query("ROLLBACK");
    res.status(500).json({ message: err.message });
  } finally {
    client.release();
  }
});

// ════════════════════════════════════════════════════════════════════════════
// DELETE STORE  ──  DELETE /api/admin/stores/:id  (soft delete)
// ════════════════════════════════════════════════════════════════════════════
router.delete("/:id", requireRole("superadmin"), async (req, res) => {
  try {
    const result = await pool.query(
      "UPDATE stores SET status='inactive', updated_at=NOW() WHERE id=$1 RETURNING id, name",
      [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ message: "Store not found" });
    res.json({ message: `Store "${result.rows[0].name}" deactivated` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// ASSIGN MANAGER  ──  POST /api/admin/stores/:id/manager
// ════════════════════════════════════════════════════════════════════════════
router.post("/:id/manager", requireRole("superadmin"), async (req, res) => {
  try {
    const { manager_id } = req.body;
    if (!manager_id) return res.status(400).json({ message: "manager_id required" });

    const result = await pool.query(
      "UPDATE stores SET manager_id=$1, updated_at=NOW() WHERE id=$2 RETURNING *",
      [manager_id, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ message: "Store not found" });
    res.json({ store: result.rows[0] });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// LIST STAFF FOR A STORE  ──  GET /api/admin/stores/:id/staff
// ════════════════════════════════════════════════════════════════════════════
router.get("/:id/staff", async (req, res) => {
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
