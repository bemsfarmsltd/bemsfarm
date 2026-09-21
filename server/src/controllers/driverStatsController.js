// server/src/controllers/driverStatsController.js
const pool = require("../db/pool");

// ── GET /api/driver/stats ────────────────────────────────────────────
// Fetch driver performance scorecard, customer rating, on-time rate, acceptance rate, and trip analytics
const getDriverStats = async (req, res, next) => {
  try {
    const driverId = req.driver.id;

    // 1. Fetch driver profile info & pre-aggregated ratings
    const driverRes = await pool.query(
      `
      SELECT 
        id,
        name,
        phone,
        vehicle_type,
        vehicle_plate,
        COALESCE(rating, 5.00) AS rating,
        COALESCE(total_ratings_count, 0) AS total_ratings_count,
        COALESCE(acceptance_rate, 100.00) AS acceptance_rate,
        COALESCE(on_time_rate, 98.50) AS on_time_rate,
        COALESCE(total_km_driven, 0) AS total_km_driven,
        COALESCE(total_earnings, 0) AS total_earnings,
        COALESCE(total_deliveries, 0) AS total_deliveries,
        created_at AS member_since
      FROM drivers
      WHERE id = $1
      `,
      [driverId]
    );

    if (driverRes.rows.length === 0) {
      return res.status(404).json({ status: "error", message: "Driver not found" });
    }

    const driver = driverRes.rows[0];

    // 2. Compute delivery stats breakdown (Today, This Week, This Month, All Time)
    const statsRes = await pool.query(
      `
      SELECT 
        COUNT(*) AS total_all_time,
        COUNT(CASE WHEN status = 'delivered' THEN 1 END) AS total_completed,
        COUNT(CASE WHEN status = 'delivered' AND completed_at >= CURRENT_DATE THEN 1 END) AS completed_today,
        COUNT(CASE WHEN status = 'delivered' AND completed_at >= DATE_TRUNC('week', CURRENT_DATE) THEN 1 END) AS completed_this_week,
        COUNT(CASE WHEN status = 'delivered' AND completed_at >= DATE_TRUNC('month', CURRENT_DATE) THEN 1 END) AS completed_this_month,
        COUNT(CASE WHEN status = 'delivery_attempted' OR status = 'failed' THEN 1 END) AS failed_deliveries,
        COALESCE(AVG(CASE WHEN customer_rating IS NOT NULL THEN customer_rating END), driver_rating.rating) AS computed_rating
      FROM deliveries
      CROSS JOIN (SELECT COALESCE(rating, 5.00) AS rating FROM drivers WHERE id = $1) driver_rating
      WHERE driver_id = $1
      GROUP BY driver_rating.rating
      `,
      [driverId]
    );

    const counts = statsRes.rows[0] || {
      total_all_time: 0,
      total_completed: 0,
      completed_today: 0,
      completed_this_week: 0,
      completed_this_month: 0,
      failed_deliveries: 0,
      computed_rating: 5.0
    };

    // 3. Zone earnings distribution breakdown
    const zoneBreakdown = await pool.query(
      `
      SELECT 
        COALESCE(dz.zone_name, 'Other Zones') AS zone_name,
        COUNT(d.id) AS total_drops,
        COALESCE(SUM(dz.driver_earning_fee), COUNT(d.id) * 700) AS total_earned
      FROM deliveries d
      LEFT JOIN delivery_zones dz ON d.zone_id = dz.zone_id
      WHERE d.driver_id = $1 AND d.status = 'delivered'
      GROUP BY dz.zone_name
      ORDER BY total_drops DESC
      LIMIT 6
      `,
      [driverId]
    );

    // 4. Badges & Milestones
    const completedCount = parseInt(counts.total_completed) || parseInt(driver.total_deliveries) || 0;
    const badges = [
      { id: "top_rated", name: "Top Rated Star", earned: parseFloat(driver.rating) >= 4.8, icon: "⭐" },
      { id: "century_rider", name: "100 Deliveries Club", earned: completedCount >= 100, icon: "🏆" },
      { id: "speedy_courier", name: "Fast Dispatcher", earned: parseFloat(driver.on_time_rate) >= 95, icon: "⚡" },
      { id: "verified_pro", name: "Verified Bems Courier", earned: true, icon: "🛡️" }
    ];

    res.json({
      status: "success",
      scorecard: {
        customer_rating: parseFloat(parseFloat(counts.computed_rating || driver.rating).toFixed(2)),
        total_ratings_count: parseInt(driver.total_ratings_count) || Math.max(1, completedCount),
        acceptance_rate: parseFloat(parseFloat(driver.acceptance_rate).toFixed(1)),
        on_time_delivery_rate: parseFloat(parseFloat(driver.on_time_rate).toFixed(1)),
        total_km_driven: parseFloat(driver.total_km_driven) || (completedCount * 8.4)
      },
      deliveries_summary: {
        completed_today: parseInt(counts.completed_today) || 0,
        completed_this_week: parseInt(counts.completed_this_week) || 0,
        completed_this_month: parseInt(counts.completed_this_month) || 0,
        total_completed: completedCount,
        failed_attempts: parseInt(counts.failed_deliveries) || 0
      },
      zone_distribution: zoneBreakdown.rows,
      badges: badges
    });
  } catch (err) {
    console.error("getDriverStats error:", err.message);
    next(err);
  }
};

module.exports = {
  getDriverStats
};
