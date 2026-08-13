require("dotenv").config();
const pool = require("../db/pool");
const { NAIRA_PER_UNIT } = require("../utils/currency");

// ── GET DASHBOARD STATS ──────────────────────────────────────
const getStats = async (req, res, next) => {
  try {
    console.log("📊 Fetching admin stats");

    const [
      revenueRes,
      ordersRes,
      customersRes,
      productsRes,
      topProductsRes,
      recentOrdersRes,
      stockLowRes,
      dailyRevenueRes,
    ] = await Promise.all([
      // ✅ FIX: Only CONFIRMED/DELIVERED orders (accurate revenue)
      pool.query(`
        SELECT COALESCE(SUM(total), 0) as total FROM orders
        WHERE status IN ('confirmed', 'delivered', 'being_packed', 'out_for_delivery')
        AND created_at > NOW() - INTERVAL '90 days'
      `),
      // ✅ Total orders (90 days, not cancelled)
      pool.query(`
        SELECT COUNT(*) as count FROM orders
        WHERE status != 'cancelled' AND created_at > NOW() - INTERVAL '90 days'
      `),
      // Total customers
      pool.query(`SELECT COUNT(*) as count FROM users WHERE role = 'user'`),
      // ✅ FIX: Only ACTIVE products (with stock)
      pool.query(`
        SELECT COUNT(*) as count FROM products WHERE COALESCE(stock, 100) > 0
      `),
      // ✅ FIX: 10 top products (not just 5)
      pool.query(`
        SELECT p.id, p.name, p.price, p.image_url,
          COALESCE(SUM(oi.quantity), 0) as total_sold,
          COALESCE(SUM(oi.quantity * oi.price * ${NAIRA_PER_UNIT}), 0) as revenue,
          COALESCE(p.stock, 100) as current_stock
        FROM products p
        LEFT JOIN order_items oi ON oi.product_id = p.id
        LEFT JOIN orders o ON o.id = oi.order_id AND o.status != 'cancelled'
        GROUP BY p.id, p.name, p.price, p.image_url, p.stock
        ORDER BY total_sold DESC NULLS LAST
        LIMIT 10
      `),
      // ✅ FIX: Include item_count, filter by 30 days
      pool.query(`
        SELECT
          o.id, u.name as customer, u.email,
          o.total as amount, o.status,
          COALESCE(o.tracking_status, o.status) as tracking_status,
          o.payment_method, o.address, o.created_at as date,
          COUNT(oi.id) as item_count
        FROM orders o
        JOIN users u ON u.id = o.user_id
        LEFT JOIN order_items oi ON oi.order_id = o.id
        WHERE o.created_at > NOW() - INTERVAL '30 days'
        GROUP BY o.id, u.id, u.name, u.email, o.total, o.status, o.tracking_status, o.payment_method, o.address, o.created_at
        ORDER BY o.created_at DESC
        LIMIT 20
      `),
      // ✅ NEW: Low stock alerts
      pool.query(`
        SELECT id, name, stock, COALESCE(stock, 100) as current_stock
        FROM products
        WHERE COALESCE(stock, 100) <= 10 AND COALESCE(stock, 100) > 0
        ORDER BY stock ASC
      `),
      // Daily revenue (keep from Document 4)
      pool.query(`
        SELECT
          DATE(created_at) as date,
          SUM(total) as revenue,
          COUNT(*) as order_count
        FROM orders
        WHERE created_at > NOW() - INTERVAL '30 days'
          AND status IN ('confirmed', 'delivered', 'being_packed', 'out_for_delivery')
        GROUP BY DATE(created_at)
        ORDER BY date
      `),
    ]);

    const stats = {
      totalRevenue: parseFloat(revenueRes.rows[0]?.total || 0),
      totalOrders: parseInt(ordersRes.rows[0]?.count || 0),
      totalCustomers: parseInt(customersRes.rows[0]?.count || 0),
      activeProducts: parseInt(productsRes.rows[0]?.count || 0),
      lowStockCount: stockLowRes.rows.length,
    };

    console.log("✅ Stats ready:", stats);

    res.json({
      stats,
      topProducts: topProductsRes.rows,
      recentOrders: recentOrdersRes.rows,
      lowStockProducts: stockLowRes.rows,
      dailyRevenue: dailyRevenueRes.rows,
    });
  } catch (err) {
    next(err);
  }
};

// ── GET SUBSCRIBERS ──────────────────────────────────────────
const getSubscribers = async (req, res, next) => {
  try {
    console.log("📧 Fetching subscribers");

    // ✅ FIX: Changed "subscribers" to "email_subscriptions"
    const result = await pool.query(
      `SELECT id, email, discount_code, is_active, subscribed_at
       FROM email_subscriptions
       WHERE is_active = true
       ORDER BY subscribed_at DESC`,
    );

    console.log("✅ Found", result.rows.length, "subscribers");
    res.json({ subscribers: result.rows || [], count: result.rows.length });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getStats,
  getSubscribers,
};
