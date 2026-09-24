// server/src/routes/notifications.js
// Customer-facing in-app notifications
const express = require("express");
const router = express.Router();
const pool = require("../db/pool");
const { protect } = require("../middleware/authMiddleware");

router.use(protect);

// GET /api/notifications - List customer's notifications + unread count
router.get("/", async (req, res, next) => {
  try {
    const userId = req.user.id;
    const limit = Math.min(parseInt(req.query.limit, 10) || 30, 100);
    const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);

    const [listRes, countRes] = await Promise.all([
      pool.query(
        `SELECT id, user_id, type, title, body, reference_type, reference_id, is_read, created_at
         FROM notifications
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT $2 OFFSET $3`,
        [userId, limit, offset]
      ),
      pool.query(
        `SELECT COUNT(*) AS unread_count
         FROM notifications
         WHERE user_id = $1 AND is_read = false`,
        [userId]
      ),
    ]);

    res.json({
      success: true,
      notifications: listRes.rows,
      unread_count: parseInt(countRes.rows[0]?.unread_count || 0, 10),
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/notifications/:id/read - Mark single notification as read
router.patch("/:id/read", async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const result = await pool.query(
      `UPDATE notifications
       SET is_read = true
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Notification not found" });
    }

    res.json({ success: true, notification: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// POST / PATCH /api/notifications/read-all - Mark all customer notifications as read
const markAllRead = async (req, res, next) => {
  try {
    const userId = req.user.id;
    await pool.query(
      `UPDATE notifications
       SET is_read = true
       WHERE user_id = $1 AND is_read = false`,
      [userId]
    );
    res.json({ success: true, message: "All notifications marked as read" });
  } catch (err) {
    next(err);
  }
};

router.post("/read-all", markAllRead);
router.patch("/read-all", markAllRead);

module.exports = router;
