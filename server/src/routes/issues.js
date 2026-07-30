// server/src/routes/issues.js
// Mounted at /api/issues in index.js
//
// Customer issue reporting + admin resolution (refund / replacement / no action),
// with an activity timeline and SMS notifications on resolution.
//
// ── SCHEMA (auto-created on first use if missing, see ensureIssueTables) ───
//
// Verified 2026-07-30 against the live DB: both tables already existed
// (created outside this file, before it was ever wired up) with exactly
// this shape, plus `issues.updated_at TIMESTAMP DEFAULT now()`, kept fresh
// by an existing DB trigger (`issues_updated_at` -> update_updated_at_column())
// rather than application code — ensureIssueTables() below intentionally
// doesn't declare that column; it's a no-op against the real table either way.
//
// CREATE TABLE issues (
//   id SERIAL PRIMARY KEY,
//   order_id VARCHAR(30) REFERENCES orders(id) ON DELETE SET NULL,
//   user_id INT REFERENCES users(id) ON DELETE CASCADE,
//   type VARCHAR(50) NOT NULL,
//   title VARCHAR(255) NOT NULL,
//   description TEXT NOT NULL,
//   photo_urls TEXT[] DEFAULT '{}',
//   status VARCHAR(30) NOT NULL DEFAULT 'open',
//   admin_notes TEXT,
//   resolution TEXT,
//   resolved_by INT REFERENCES users(id) ON DELETE SET NULL,
//   resolved_at TIMESTAMP,
//   refund_amount DECIMAL(10,2),
//   refund_status VARCHAR(20),
//   paystack_refund_id VARCHAR(100),
//   created_at TIMESTAMP DEFAULT NOW()
// );
// CREATE TABLE issue_activities (
//   id SERIAL PRIMARY KEY,
//   issue_id INT REFERENCES issues(id) ON DELETE CASCADE,
//   actor_type VARCHAR(20) NOT NULL,
//   actor_name VARCHAR(255),
//   action VARCHAR(255) NOT NULL,
//   note TEXT,
//   created_at TIMESTAMP DEFAULT NOW()
// );
// ─────────────────────────────────────────────────────────────────────────────

const express = require("express");
const router = express.Router();
const pool = require("../db/pool");
const { protect, requireRole } = require("../middleware/authMiddleware");
const { SMS } = require("../services/smsService");

const STAFF_ROLES = ["superadmin", "admin", "manager"];
const VALID_STATUSES = [
  "open",
  "under_review",
  "resolved_refund",
  "resolved_replacement",
  "resolved_no_action",
  "closed",
];

async function ensureIssueTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS issues (
      id SERIAL PRIMARY KEY,
      order_id VARCHAR(30) REFERENCES orders(id) ON DELETE SET NULL,
      user_id INT REFERENCES users(id) ON DELETE CASCADE,
      type VARCHAR(50) NOT NULL,
      title VARCHAR(255) NOT NULL,
      description TEXT NOT NULL,
      photo_urls TEXT[] DEFAULT '{}',
      status VARCHAR(30) NOT NULL DEFAULT 'open',
      admin_notes TEXT,
      resolution TEXT,
      resolved_by INT REFERENCES users(id) ON DELETE SET NULL,
      resolved_at TIMESTAMP,
      refund_amount DECIMAL(10,2),
      refund_status VARCHAR(20),
      paystack_refund_id VARCHAR(100),
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS issue_activities (
      id SERIAL PRIMARY KEY,
      issue_id INT REFERENCES issues(id) ON DELETE CASCADE,
      actor_type VARCHAR(20) NOT NULL,
      actor_name VARCHAR(255),
      action VARCHAR(255) NOT NULL,
      note TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
}

const activitiesSubquery = `
  COALESCE(
    (SELECT json_agg(a ORDER BY a.created_at ASC)
     FROM issue_activities a WHERE a.issue_id = i.id),
    '[]'
  ) AS issue_activities
`;

// ─── POST /api/issues — Customer reports an issue ─────────────────────────────
router.post("/", protect, async (req, res) => {
  const { order_id, type, title, description, photo_urls } = req.body;
  const user_id = req.user.id;

  if (!type || !title || !description) {
    return res
      .status(400)
      .json({ message: "type, title and description are required" });
  }

  try {
    await ensureIssueTables();

    const result = await pool.query(
      `INSERT INTO issues (order_id, user_id, type, title, description, photo_urls)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [order_id || null, user_id, type, title, description, photo_urls || []],
    );
    const issue = result.rows[0];

    await pool.query(
      `INSERT INTO issue_activities (issue_id, actor_type, actor_name, action, note)
       VALUES ($1, 'customer', $2, 'Issue reported', $3)`,
      [issue.id, req.user.name, `${type}: ${title}`],
    );
    await pool.query(
      `INSERT INTO issue_activities (issue_id, actor_type, action)
       VALUES ($1, 'system', 'Issue assigned to admin for review')`,
      [issue.id],
    );

    return res
      .status(201)
      .json({ message: "Issue reported successfully", issue });
  } catch (err) {
    console.error("Create issue error:", err.message);
    return res.status(500).json({ message: "Failed to create issue" });
  }
});

// ─── GET /api/issues — Customer gets their issues ─────────────────────────────
router.get("/", protect, async (req, res) => {
  try {
    await ensureIssueTables();

    const result = await pool.query(
      `SELECT i.*, ${activitiesSubquery}
       FROM issues i
       WHERE i.user_id = $1
       ORDER BY i.created_at DESC`,
      [req.user.id],
    );
    return res.json({ issues: result.rows });
  } catch (err) {
    console.error("Get issues error:", err.message);
    return res.status(500).json({ message: "Failed to fetch issues" });
  }
});

// ─── GET /api/issues/admin — Admin gets ALL issues ────────────────────────────
router.get(
  "/admin",
  protect,
  requireRole(...STAFF_ROLES),
  async (req, res) => {
    const { status, type, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    try {
      await ensureIssueTables();

      const params = [];
      const where = [];
      if (status) {
        params.push(status);
        where.push(`i.status = $${params.length}`);
      }
      if (type) {
        params.push(type);
        where.push(`i.type = $${params.length}`);
      }
      const whereClause = where.length ? "WHERE " + where.join(" AND ") : "";

      const countRes = await pool.query(
        `SELECT COUNT(*) FROM issues i ${whereClause}`,
        params,
      );

      params.push(parseInt(limit));
      params.push(offset);

      const result = await pool.query(
        `SELECT i.*, ${activitiesSubquery},
           json_build_object('id', o.id, 'total', o.total, 'payment_method', o.payment_method, 'status', o.status) AS order_info,
           json_build_object('id', u.id, 'name', u.name, 'email', u.email, 'phone', u.phone) AS customer
         FROM issues i
         LEFT JOIN orders o ON o.id = i.order_id
         LEFT JOIN users u ON u.id = i.user_id
         ${whereClause}
         ORDER BY i.created_at DESC
         LIMIT $${params.length - 1} OFFSET $${params.length}`,
        params,
      );

      return res.json({
        issues: result.rows,
        total: parseInt(countRes.rows[0].count),
        page: parseInt(page),
        limit: parseInt(limit),
      });
    } catch (err) {
      console.error("Admin get issues error:", err.message);
      return res.status(500).json({ message: "Failed to fetch issues" });
    }
  },
);

// ─── GET /api/issues/:id — Get single issue with full activity log ───────────
router.get("/:id", protect, async (req, res) => {
  const { id } = req.params;
  try {
    await ensureIssueTables();

    const result = await pool.query(
      `SELECT i.*, ${activitiesSubquery},
         json_build_object('id', o.id, 'total', o.total, 'payment_method', o.payment_method, 'status', o.status, 'created_at', o.created_at) AS order_info,
         json_build_object('id', u.id, 'name', u.name, 'email', u.email, 'phone', u.phone) AS customer
       FROM issues i
       LEFT JOIN orders o ON o.id = i.order_id
       LEFT JOIN users u ON u.id = i.user_id
       WHERE i.id = $1`,
      [id],
    );

    if (!result.rows.length) {
      return res.status(404).json({ message: "Issue not found" });
    }

    const issue = result.rows[0];

    // Only allow the reporting customer or staff to view it
    if (issue.user_id !== req.user.id && !STAFF_ROLES.includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    return res.json({ issue });
  } catch (err) {
    console.error("Get issue error:", err.message);
    return res.status(500).json({ message: "Failed to fetch issue" });
  }
});

// ─── PATCH /api/issues/:id/status — Admin updates issue status ───────────────
router.patch(
  "/:id/status",
  protect,
  requireRole(...STAFF_ROLES),
  async (req, res) => {
    const { id } = req.params;
    const { status, admin_notes, resolution, refund_amount } = req.body;

    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    try {
      await ensureIssueTables();

      const issueRes = await pool.query(
        `SELECT i.*,
           json_build_object('name', u.name, 'phone', u.phone, 'email', u.email) AS customer,
           o.payment_ref AS order_payment_ref
         FROM issues i
         LEFT JOIN users u ON u.id = i.user_id
         LEFT JOIN orders o ON o.id = i.order_id
         WHERE i.id = $1`,
        [id],
      );
      if (!issueRes.rows.length) {
        return res.status(404).json({ message: "Issue not found" });
      }
      const issue = issueRes.rows[0];

      const resolvedStatuses = [
        "resolved_refund",
        "resolved_replacement",
        "resolved_no_action",
        "closed",
      ];
      const resolvedAt = resolvedStatuses.includes(status) ? new Date() : null;
      const refundStatus = refund_amount ? "pending" : null;

      const updated = await pool.query(
        `UPDATE issues SET
           status = $1,
           admin_notes = COALESCE($2, admin_notes),
           resolution = COALESCE($3, resolution),
           resolved_by = $4,
           resolved_at = COALESCE($5, resolved_at),
           refund_amount = COALESCE($6, refund_amount),
           refund_status = COALESCE($7, refund_status)
         WHERE id = $8
         RETURNING *`,
        [
          status,
          admin_notes || null,
          resolution || null,
          req.user.id,
          resolvedAt,
          refund_amount || null,
          refundStatus,
          id,
        ],
      );

      const statusLabels = {
        under_review: "Issue marked as under review",
        resolved_refund: `Resolved with refund of ₦${refund_amount || 0}`,
        resolved_replacement: "Resolved with replacement delivery",
        resolved_no_action: "Closed — no refund/replacement",
        closed: "Issue closed",
      };
      await pool.query(
        `INSERT INTO issue_activities (issue_id, actor_type, actor_name, action, note)
         VALUES ($1, 'admin', $2, $3, $4)`,
        [
          id,
          req.user.name,
          statusLabels[status] || `Status changed to ${status}`,
          admin_notes || null,
        ],
      );

      // Send SMS to customer
      const customer = issue.customer;
      if (customer?.phone) {
        if (status === "resolved_refund") {
          await SMS.refundProcessed(
            customer.phone,
            customer.name,
            refund_amount || issue.refund_amount,
          );
        } else if (status === "resolved_replacement") {
          await SMS.replacementScheduled(
            customer.phone,
            customer.name,
            issue.order_id,
          );
        } else if (status === "resolved_no_action" || status === "closed") {
          await SMS.issueResolved(
            customer.phone,
            customer.name,
            resolution || "Please contact support for details",
          );
        }
      }

      // If refund — trigger Paystack refund (fire and forget)
      if (status === "resolved_refund" && refund_amount && issue.order_payment_ref) {
        triggerPaystackRefund(issue.order_payment_ref, refund_amount, id).catch(
          (err) => console.error("[Paystack Refund] Trigger failed:", err.message),
        );
      }

      return res.json({
        message: "Issue updated successfully",
        issue: updated.rows[0],
      });
    } catch (err) {
      console.error("Update issue status error:", err.message);
      return res.status(500).json({ message: "Failed to update issue" });
    }
  },
);

// ─── POST /api/issues/:id/note — Admin adds internal note ────────────────────
router.post(
  "/:id/note",
  protect,
  requireRole(...STAFF_ROLES),
  async (req, res) => {
    const { id } = req.params;
    const { note } = req.body;

    if (!note?.trim())
      return res.status(400).json({ message: "Note is required" });

    try {
      await ensureIssueTables();

      await pool.query(
        `INSERT INTO issue_activities (issue_id, actor_type, actor_name, action, note)
         VALUES ($1, 'admin', $2, 'Admin note added', $3)`,
        [id, req.user.name, note],
      );

      return res.json({ message: "Note added" });
    } catch (err) {
      console.error("Add note error:", err.message);
      return res.status(500).json({ message: "Failed to add note" });
    }
  },
);

// ─── Helper: Paystack refund ──────────────────────────────────────────────────
async function triggerPaystackRefund(paymentRef, amount, issueId) {
  const axios = require("axios");
  const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET;
  if (!PAYSTACK_SECRET) {
    console.warn(
      "[Paystack Refund] PAYSTACK_SECRET not configured — skipping refund trigger",
    );
    return;
  }

  try {
    const response = await axios.post(
      "https://api.paystack.co/refund",
      {
        transaction: paymentRef,
        amount: Math.round(amount * 100), // Paystack uses kobo
        currency: "NGN",
        customer_note: `Refund for issue #${issueId}`,
        merchant_note: `BemsFarms issue resolution refund`,
      },
      { headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` } },
    );

    await pool.query(
      `UPDATE issues SET refund_status = 'processing', paystack_refund_id = $1 WHERE id = $2`,
      [response.data?.data?.id || null, issueId],
    );

    console.log("[Paystack Refund] Initiated:", response.data);
  } catch (err) {
    console.error(
      "[Paystack Refund] Failed:",
      err.response?.data || err.message,
    );
    await pool.query(`UPDATE issues SET refund_status = 'failed' WHERE id = $1`, [
      issueId,
    ]);
  }
}

module.exports = router;
