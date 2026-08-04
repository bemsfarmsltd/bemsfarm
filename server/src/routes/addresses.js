// server/src/routes/addresses.js
// Mounted at /api/addresses — the customer's own saved delivery addresses.
// Backs ProfilePage.jsx's Address Book tab (previously Add/Edit/Delete were
// all no-ops with no backing table).
const express = require("express");
const router = express.Router();
const pool = require("../db/pool");
const { protect } = require("../middleware/authMiddleware");

router.use(protect);

router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM user_addresses WHERE user_id=$1 ORDER BY is_default DESC, created_at DESC",
      [req.user.id],
    );
    res.json({ addresses: result.rows });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/", async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { label, receiver_name, receiver_phone, street_address, city, state, is_default } = req.body;
    if (!street_address?.trim()) {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "Street address is required" });
    }

    const existing = await client.query("SELECT COUNT(*) FROM user_addresses WHERE user_id=$1", [req.user.id]);
    const makeDefault = is_default || parseInt(existing.rows[0].count) === 0;

    if (makeDefault) {
      await client.query("UPDATE user_addresses SET is_default=false WHERE user_id=$1", [req.user.id]);
    }

    const result = await client.query(
      `INSERT INTO user_addresses (user_id, label, receiver_name, receiver_phone, street_address, city, state, is_default, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW()) RETURNING *`,
      [req.user.id, label || "Home", receiver_name || null, receiver_phone || null, street_address.trim(), city || null, state || null, makeDefault],
    );

    await client.query("COMMIT");
    res.status(201).json({ address: result.rows[0] });
  } catch (err) {
    await client.query("ROLLBACK");
    res.status(500).json({ message: err.message });
  } finally {
    client.release();
  }
});

router.patch("/:id", async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { label, receiver_name, receiver_phone, street_address, city, state, is_default } = req.body;

    const existing = await client.query("SELECT id FROM user_addresses WHERE id=$1 AND user_id=$2", [req.params.id, req.user.id]);
    if (!existing.rows.length) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Address not found" });
    }

    if (is_default) {
      await client.query("UPDATE user_addresses SET is_default=false WHERE user_id=$1", [req.user.id]);
    }

    const result = await client.query(
      `UPDATE user_addresses SET
         label          = COALESCE($1, label),
         receiver_name  = COALESCE($2, receiver_name),
         receiver_phone = COALESCE($3, receiver_phone),
         street_address = COALESCE($4, street_address),
         city           = COALESCE($5, city),
         state          = COALESCE($6, state),
         is_default     = COALESCE($7, is_default),
         updated_at     = NOW()
       WHERE id=$8 AND user_id=$9 RETURNING *`,
      [
        label || null,
        receiver_name || null,
        receiver_phone || null,
        street_address || null,
        city || null,
        state || null,
        typeof is_default === "boolean" ? is_default : null,
        req.params.id,
        req.user.id,
      ],
    );

    await client.query("COMMIT");
    res.json({ address: result.rows[0] });
  } catch (err) {
    await client.query("ROLLBACK");
    res.status(500).json({ message: err.message });
  } finally {
    client.release();
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const result = await pool.query(
      "DELETE FROM user_addresses WHERE id=$1 AND user_id=$2 RETURNING id",
      [req.params.id, req.user.id],
    );
    if (!result.rows.length) {
      return res.status(404).json({ message: "Address not found" });
    }
    res.json({ message: "Address deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;