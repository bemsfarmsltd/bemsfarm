const express = require("express");
const router = express.Router();
const pool = require("../db/pool");

// POST /api/telemetry/demand-click
// Records a telemetry event for out-of-stock clicks
router.post("/demand-click", async (req, res, next) => {
  try {
    const { productId, productName, category, source, userEmail, userId } = req.body;

    if (!productId || !productName) {
      return res.status(400).json({ message: "Missing required product fields" });
    }

    const result = await pool.query(
      `INSERT INTO product_demand_telemetry (product_id, product_name, category, source, user_id, user_email, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       RETURNING *`,
      [
        productId,
        productName,
        category || "Produce",
        source || "catalog",
        userId || null,
        userEmail || null,
      ]
    );

    res.status(201).json({
      message: "Telemetry event recorded successfully",
      record: result.rows[0],
    });
  } catch (err) {
    console.error("Failed to record telemetry:", err.message);
    next(err);
  }
});

module.exports = router;
