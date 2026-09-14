// server/src/routes/broadcasts.js
const express = require("express");
const router = express.Router();
const pool = require("../db/pool");
const { protect, requireRole } = require("../middleware/authMiddleware");
const { initCrmTables } = require("../db/migrate_crm_chat_broadcast");

router.use(protect);

// ── CUSTOMER STOREFRONT BROADCAST ENDPOINTS ──────────────────────────────

// GET /api/broadcasts/active
// Fetches active undismissed broadcasts for the logged-in customer (targeted or global)
router.get("/active", requireRole("user"), async (req, res, next) => {
  try {

    const userId = req.user.id;

    const query = `
      SELECT b.id, b.title, b.message, b.type, b.target_type, b.customer_id,
             b.action_label, b.action_url, b.created_at
      FROM customer_broadcasts b
      LEFT JOIN customer_broadcast_reads r 
             ON r.broadcast_id = b.id AND r.user_id = $1
      WHERE b.status = 'active'
        AND r.id IS NULL
        AND (
          b.target_type = 'all' 
          OR (b.target_type = 'single' AND b.customer_id = $1)
        )
      ORDER BY b.created_at DESC
      LIMIT 1;
    `;

    const result = await pool.query(query, [userId]);
    res.json({
      broadcast: result.rows[0] || null,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/broadcasts/:id/dismiss
// Customer dismissed the popup card
router.post("/:id/dismiss", requireRole("user"), async (req, res, next) => {
  try {

    const broadcastId = req.params.id;
    const userId = req.user.id;

    await pool.query(
      `INSERT INTO customer_broadcast_reads (broadcast_id, user_id, dismissed_at)
       SELECT id, $2, NOW() FROM customer_broadcasts WHERE id=$1 AND status='active' AND (target_type='all' OR customer_id=$2)
       ON CONFLICT (broadcast_id, user_id) DO UPDATE SET dismissed_at = NOW()`,
      [broadcastId, userId]
    );

    res.json({ success: true, message: "Broadcast dismissed" });
  } catch (err) {
    next(err);
  }
});

// ── ADMIN BROADCAST MANAGEMENT ENDPOINTS ─────────────────────────────────

// GET /api/broadcasts/admin/all
// Admin lists all broadcasts with delivery statistics
router.get("/admin/all", requireRole("superadmin", "manager", "admin"), async (req, res, next) => {
  try {

    const result = await pool.query(`
      SELECT b.id, b.title, b.message, b.type, b.target_type, b.customer_id,
             b.action_label, b.action_url, b.status, b.created_at,
             u.name AS creator_name,
             c.name AS target_customer_name,
             c.customer_code AS target_customer_code,
             c.email AS target_customer_email,
             COUNT(r.id) AS dismiss_count
      FROM customer_broadcasts b
      LEFT JOIN users u ON u.id = b.created_by
      LEFT JOIN users c ON c.id = b.customer_id
      LEFT JOIN customer_broadcast_reads r ON r.broadcast_id = b.id
      GROUP BY b.id, u.name, c.name, c.customer_code, c.email
      ORDER BY b.created_at DESC
      LIMIT 100;
    `);

    res.json({ broadcasts: result.rows });
  } catch (err) {
    next(err);
  }
});

// POST /api/broadcasts/admin
// Admin creates a targeted or platform-wide broadcast
router.post("/admin", requireRole("superadmin", "manager", "admin"), async (req, res, next) => {
  try {

    const {
      title,
      message,
      type = "announcement",
      target_type = "all",
      customer_id = null,
      action_label = null,
      action_url = null,
    } = req.body;

    if (typeof title !== 'string' || !title.trim() || title.length > 200) {
      return res.status(400).json({ message: "Broadcast title is required" });
    }
    if (typeof message !== 'string' || !message.trim() || message.length > 4000) {
      return res.status(400).json({ message: "Broadcast message is required" });
    }

    if (!['announcement','promotion','alert','personal'].includes(type) || !['all','single'].includes(target_type)) return res.status(400).json({message:'Invalid broadcast type or audience'});
    if (action_url && (typeof action_url !== 'string' || !/^\/(?!\/)[^\\\s]*$/.test(action_url) || action_url.length > 255)) return res.status(400).json({message:'Action must be a storefront path such as /products'});
    if (action_label && (typeof action_label !== 'string' || action_label.length > 100)) return res.status(400).json({message:'Action label is too long'});
    let targetCustomerId = null;
    if (target_type === "single") {
      if (!customer_id) {
        return res.status(400).json({ message: "Please specify a customer for single-target broadcast" });
      }
      // Resolve customer if customer_code passed
      const targetStr = String(customer_id).trim();
      const isNum = !isNaN(Number(targetStr));
      const custRow = isNum
        ? await pool.query("SELECT id FROM users WHERE role='user' AND status <> 'deleted' AND id = $1", [Number(targetStr)])
        : await pool.query("SELECT id FROM users WHERE role='user' AND status <> 'deleted' AND (customer_code = $1 OR email = $1)", [targetStr]);
      
      if (custRow.rowCount === 0) {
        return res.status(404).json({ message: "Specified customer not found" });
      }
      targetCustomerId = custRow.rows[0].id;
    }

    const result = await pool.query(
      `INSERT INTO customer_broadcasts 
        (title, message, type, target_type, customer_id, action_label, action_url, created_by, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active', NOW())
       RETURNING *`,
      [
        title.trim(),
        message.trim(),
        type,
        target_type,
        targetCustomerId,
        action_label ? action_label.trim() : null,
        action_url ? action_url.trim() : null,
        req.user.id,
      ]
    );

    res.status(201).json({
      message: "Broadcast published successfully",
      broadcast: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/broadcasts/admin/:id
// Admin archives or deletes a broadcast
router.delete("/admin/:id", requireRole("superadmin", "manager", "admin"), async (req, res, next) => {
  try {

    const id = req.params.id;
    await pool.query("UPDATE customer_broadcasts SET status='archived' WHERE id = $1", [id]);
    res.json({ message: "Broadcast removed successfully" });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
