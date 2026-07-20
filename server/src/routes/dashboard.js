// server/src/routes/dashboard.js
// ─────────────────────────────────────────────────────────────────
// All data endpoints for the admin dashboard tabs
// GET /api/dashboard/overview
// GET /api/dashboard/sales
// GET /api/dashboard/finance
// GET /api/dashboard/inventory
// GET /api/dashboard/operations
// GET /api/dashboard/customers
// GET /api/dashboard/ai
// ─────────────────────────────────────────────────────────────────

const express = require("express");
const router = express.Router();
const pool = require("../db/pool");
const { protect, requireRole } = require("../middleware/authMiddleware");

// All dashboard routes require login
router.use(protect);

// ── HELPER: safe query (returns [] on error) ──────────────────────
async function q(sql, params = []) {
  try {
    const result = await pool.query(sql, params);
    return result.rows;
  } catch (err) {
    console.error("Dashboard query error:", err.message, "\nSQL:", sql);
    return [];
  }
}

async function q1(sql, params = []) {
  const rows = await q(sql, params);
  return rows[0] || {};
}

// ── OVERVIEW TAB ─────────────────────────────────────────────────
router.get("/overview", async (req, res) => {
  try {
    const [
      revenueToday,
      pendingOrders,
      activeDeliveries,
      lowStock,
      activeCustomers,
      staffOnDuty,
      pipeline,
      recentOrders,
      weekRevenue,
      weekOrders,
    ] = await Promise.all([
      // Today's revenue + order count
      q1(`SELECT
            COALESCE(SUM(total),0) AS revenue,
            COUNT(*) AS orders
          FROM orders
          WHERE DATE(created_at) = CURRENT_DATE
            AND status NOT IN ('cancelled')`),

      // Pending orders
      q1(`SELECT COUNT(*) AS count FROM orders
          WHERE status IN ('pending','new_order','processing')`),

      // Active deliveries
      q1(`SELECT COUNT(*) AS count FROM deliveries
          WHERE status IN ('assigned','awaiting_pickup','en_route')`),

      // Low stock items
      q1(`SELECT COUNT(*) AS count FROM products
          WHERE stock <= low_stock_threshold
            AND status = 'active'`),

      // Active customers (ordered in last 30 days)
      q1(`SELECT COUNT(DISTINCT customer_id) AS count FROM orders
          WHERE created_at >= NOW() - INTERVAL '30 days'`),

      // Staff on duty today
      q1(`SELECT COUNT(*) AS count FROM staff_attendance
          WHERE date = CURRENT_DATE AND status = 'present'`),

      // Pipeline counts
      q(`SELECT status, COUNT(*) AS count FROM orders
         WHERE DATE(created_at) = CURRENT_DATE
         GROUP BY status`),

      // Recent orders (last 10)
      q(`SELECT
           o.id, o.total, o.status, o.created_at,
           COALESCE(o.customer_name, c.name, 'Walk-in') AS customer,
           (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) AS items
         FROM orders o
         LEFT JOIN customers c ON o.customer_id = c.id
         ORDER BY o.created_at DESC
         LIMIT 10`),

      // Revenue last 7 days
      q(`SELECT
           TO_CHAR(d.day, 'Dy') AS label,
           COALESCE(SUM(o.total), 0) AS revenue
         FROM generate_series(
           CURRENT_DATE - INTERVAL '6 days',
           CURRENT_DATE, '1 day'
         ) AS d(day)
         LEFT JOIN orders o
           ON DATE(o.created_at) = d.day
           AND o.status NOT IN ('cancelled')
         GROUP BY d.day
         ORDER BY d.day`),

      // Orders last 7 days
      q(`SELECT
           TO_CHAR(d.day, 'Dy') AS label,
           COALESCE(COUNT(o.id), 0) AS orders
         FROM generate_series(
           CURRENT_DATE - INTERVAL '6 days',
           CURRENT_DATE, '1 day'
         ) AS d(day)
         LEFT JOIN orders o
           ON DATE(o.created_at) = d.day
           AND o.status NOT IN ('cancelled')
         GROUP BY d.day
         ORDER BY d.day`),
    ]);

    // Build pipeline map
    const pipelineMap = {};
    pipeline.forEach((r) => {
      pipelineMap[r.status] = parseInt(r.count);
    });

    res.json({
      kpis: {
        revenue_today: parseFloat(revenueToday.revenue || 0),
        orders_today: parseInt(revenueToday.orders || 0),
        pending_orders: parseInt(pendingOrders.count || 0),
        active_deliveries: parseInt(activeDeliveries.count || 0),
        low_stock_alerts: parseInt(lowStock.count || 0),
        active_customers: parseInt(activeCustomers.count || 0),
        staff_on_duty: parseInt(staffOnDuty.count || 0),
      },
      pipeline: pipelineMap,
      recent_orders: recentOrders,
      charts: {
        week_revenue: weekRevenue.map((r) => ({
          label: r.label,
          revenue: parseFloat(r.revenue),
        })),
        week_orders: weekOrders.map((r) => ({
          label: r.label,
          orders: parseInt(r.orders),
        })),
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── SALES TAB ────────────────────────────────────────────────────
router.get("/sales", async (req, res) => {
  try {
    const [
      todayStats,
      monthStats,
      last6Months,
      topProducts,
      recentOrders,
      byCategory,
      byPayment,
      bySource,
    ] = await Promise.all([
      q1(`SELECT
            COALESCE(SUM(total),0) AS revenue,
            COUNT(*) AS orders,
            COALESCE(AVG(total),0) AS avg_order
          FROM orders
          WHERE DATE(created_at) = CURRENT_DATE
            AND status NOT IN ('cancelled')`),

      q1(`SELECT
            COALESCE(SUM(total),0) AS revenue,
            COUNT(*) AS orders
          FROM orders
          WHERE DATE_TRUNC('month', created_at) = DATE_TRUNC('month', NOW())
            AND status NOT IN ('cancelled')`),

      q(`SELECT
           TO_CHAR(DATE_TRUNC('month', created_at), 'Mon') AS month,
           COALESCE(SUM(total), 0) AS revenue,
           COUNT(*) AS orders
         FROM orders
         WHERE created_at >= NOW() - INTERVAL '6 months'
           AND status NOT IN ('cancelled')
         GROUP BY DATE_TRUNC('month', created_at)
         ORDER BY DATE_TRUNC('month', created_at)`),

      q(`SELECT
           p.name,
           p.sku,
           SUM(oi.quantity) AS sold,
           SUM(oi.subtotal) AS revenue,
           0 AS trend
         FROM order_items oi
         JOIN products p ON oi.product_id = p.id
         JOIN orders o ON oi.order_id = o.id
         WHERE o.created_at >= NOW() - INTERVAL '30 days'
           AND o.status NOT IN ('cancelled')
         GROUP BY p.id, p.name, p.sku
         ORDER BY revenue DESC
         LIMIT 5`),

      q(`SELECT
           o.id, o.total, o.status, o.created_at,
           COALESCE(o.customer_name, c.name, 'Walk-in') AS customer,
           (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) AS items
         FROM orders o
         LEFT JOIN customers c ON o.customer_id = c.id
         ORDER BY o.created_at DESC
         LIMIT 10`),

      q(`SELECT
           cat.name AS category,
           COALESCE(SUM(oi.subtotal), 0) AS revenue
         FROM order_items oi
         JOIN products p ON oi.product_id = p.id
         JOIN categories cat ON p.category_id = cat.id
         JOIN orders o ON oi.order_id = o.id
         WHERE o.created_at >= DATE_TRUNC('month', NOW())
           AND o.status NOT IN ('cancelled')
         GROUP BY cat.name
         ORDER BY revenue DESC
         LIMIT 6`),

      q(`SELECT
           COALESCE(payment_method, 'unknown') AS method,
           COUNT(*) AS count,
           SUM(total) AS revenue
         FROM orders
         WHERE created_at >= DATE_TRUNC('month', NOW())
           AND status NOT IN ('cancelled')
         GROUP BY payment_method
         ORDER BY count DESC`),

      q(`SELECT
           COALESCE(source, 'Web App') AS source,
           COUNT(*) AS count,
           SUM(total) AS revenue
         FROM orders
         WHERE created_at >= DATE_TRUNC('month', NOW())
           AND status NOT IN ('cancelled')
         GROUP BY source
         ORDER BY count DESC`),
    ]);

    res.json({
      kpis: {
        revenue_today: parseFloat(todayStats.revenue || 0),
        orders_today: parseInt(todayStats.orders || 0),
        avg_order_value: parseFloat(todayStats.avg_order || 0),
        revenue_month: parseFloat(monthStats.revenue || 0),
        orders_month: parseInt(monthStats.orders || 0),
      },
      charts: {
        last_6_months: last6Months,
        by_category: byCategory,
        by_payment: byPayment,
        by_source: bySource,
      },
      top_products: topProducts,
      recent_orders: recentOrders,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── FINANCE TAB ──────────────────────────────────────────────────
router.get("/finance", async (req, res) => {
  try {
    const [
      monthIncome,
      monthExpenses,
      bankAccounts,
      supplierDues,
      last6Months,
    ] = await Promise.all([
      q1(`SELECT COALESCE(SUM(amount),0) AS total
          FROM income
          WHERE DATE_TRUNC('month', date) = DATE_TRUNC('month', NOW())
            AND status = 'completed'`),

      q1(`SELECT COALESCE(SUM(amount),0) AS total
          FROM expenses
          WHERE DATE_TRUNC('month', date) = DATE_TRUNC('month', NOW())
            AND status IN ('approved','paid')`),

      q(`SELECT bank_name, account_name, account_type,
                balance, currency, status
         FROM bank_accounts
         WHERE status = 'active'
         ORDER BY balance DESC`),

      q(`SELECT supplier_name, amount, due_date, status
         FROM expenses
         WHERE status = 'pending'
           AND category = 'produce_purchase'
         ORDER BY due_date ASC
         LIMIT 5`),

      q(`SELECT
           TO_CHAR(DATE_TRUNC('month', d), 'Mon') AS month,
           COALESCE(i.total, 0) AS income,
           COALESCE(e.total, 0) AS expenses
         FROM generate_series(
           DATE_TRUNC('month', NOW()) - INTERVAL '5 months',
           DATE_TRUNC('month', NOW()), '1 month'
         ) AS d
         LEFT JOIN (
           SELECT DATE_TRUNC('month', date) AS m, SUM(amount) AS total
           FROM income WHERE status = 'completed'
           GROUP BY m
         ) i ON i.m = d
         LEFT JOIN (
           SELECT DATE_TRUNC('month', date) AS m, SUM(amount) AS total
           FROM expenses WHERE status IN ('approved','paid')
           GROUP BY m
         ) e ON e.m = d
         ORDER BY d`),
    ]);

    const income = parseFloat(monthIncome.total || 0);
    const expenses = parseFloat(monthExpenses.total || 0);
    const totalBankBalance = bankAccounts.reduce(
      (sum, a) => sum + parseFloat(a.balance || 0),
      0,
    );

    res.json({
      kpis: {
        revenue_month: income,
        expenses_month: expenses,
        net_profit: income - expenses,
        profit_margin:
          income > 0 ? (((income - expenses) / income) * 100).toFixed(1) : 0,
        total_bank_balance: totalBankBalance,
      },
      bank_accounts: bankAccounts,
      supplier_dues: supplierDues,
      charts: { last_6_months: last6Months },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── INVENTORY TAB ────────────────────────────────────────────────
router.get("/inventory", async (req, res) => {
  try {
    const [
      totalSkus,
      totalValue,
      lowStockItems,
      expiringBatches,
      inventoryList,
      valueByCategory,
    ] = await Promise.all([
      q1(`SELECT COUNT(*) AS count FROM products WHERE status = 'active'`),

      q1(`SELECT COALESCE(SUM(stock * COALESCE(unit_price, price, 0)), 0) AS total
          FROM products WHERE status = 'active'`),

      q(`SELECT id, name, sku, stock AS qty, low_stock_threshold AS reorder_qty,
                expiry_date, status
         FROM products
         WHERE stock <= low_stock_threshold
           AND status = 'active'
         ORDER BY stock ASC
         LIMIT 10`),

      q(`SELECT p.name, b.batch_no, b.quantity, b.expiry_date
         FROM batch_management b
         JOIN products p ON b.product_id = p.id
         WHERE b.expiry_date <= CURRENT_DATE + INTERVAL '7 days'
           AND b.status = 'active'
         ORDER BY b.expiry_date ASC
         LIMIT 5`),

      q(`SELECT
           p.name, p.sku,
           cat.name AS category,
           p.stock AS qty,
           COALESCE(p.unit_price, p.price, 0) AS unit_price,
           p.stock * COALESCE(p.unit_price, p.price, 0) AS value,
           CASE
             WHEN p.stock = 0 THEN 'out_of_stock'
             WHEN p.stock <= p.low_stock_threshold THEN 'low'
             ELSE 'in_stock'
           END AS stock_status
         FROM products p
         LEFT JOIN categories cat ON p.category_id = cat.id
         WHERE p.status = 'active'
         ORDER BY p.stock ASC
         LIMIT 20`),

      q(`SELECT
           cat.name AS category,
           SUM(p.stock * COALESCE(p.unit_price, p.price, 0)) AS value
         FROM products p
         JOIN categories cat ON p.category_id = cat.id
         WHERE p.status = 'active'
         GROUP BY cat.name
         ORDER BY value DESC`),
    ]);

    res.json({
      kpis: {
        total_skus: parseInt(totalSkus.count || 0),
        total_value: parseFloat(totalValue.total || 0),
        low_stock_count: lowStockItems.length,
        expiring_count: expiringBatches.length,
      },
      low_stock_items: lowStockItems,
      expiring_batches: expiringBatches,
      inventory_list: inventoryList,
      charts: { value_by_category: valueByCategory },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── OPERATIONS TAB ───────────────────────────────────────────────
router.get("/operations", async (req, res) => {
  try {
    const [
      activeDeliveries,
      driversOnDuty,
      avgDeliveryTime,
      staffToday,
      purchaseOrders,
      deliveryBreakdown,
    ] = await Promise.all([
      q(`SELECT
           d.id, d.delivery_ref, d.status,
           COALESCE(o.customer_name, c.name, 'Customer') AS customer,
           COALESCE(dr.name, '—') AS driver,
           dz.zone_name AS zone,
           d.eta_minutes AS eta
         FROM deliveries d
         LEFT JOIN orders o ON d.order_id = o.id
         LEFT JOIN customers c ON o.customer_id = c.id
         LEFT JOIN drivers dr ON d.driver_id = dr.id
         LEFT JOIN delivery_zones dz ON d.zone_id = dz.zone_id
         WHERE d.status IN ('assigned','awaiting_pickup','en_route')
         ORDER BY d.created_at DESC
         LIMIT 10`),

      q1(`SELECT COUNT(*) AS count FROM drivers
          WHERE status IN ('active','on_delivery')`),

      q1(`SELECT
            COALESCE(
              AVG(EXTRACT(EPOCH FROM (delivered_at - dispatched_at))/60),
              0
            ) AS avg_mins
          FROM deliveries
          WHERE status = 'delivered'
            AND DATE(delivered_at) = CURRENT_DATE`),

      q(`SELECT
           s.name, st.role, st.shift,
           sa.clock_in, sa.status
         FROM staff_attendance sa
         JOIN staff st ON sa.staff_id = st.id
         JOIN users s ON st.user_id = s.id
         WHERE sa.date = CURRENT_DATE
         ORDER BY sa.clock_in ASC NULLS LAST
         LIMIT 10`),

      q(`SELECT
           e.reference AS po_ref,
           e.description AS supplier,
           e.amount, e.date,
           e.status
         FROM expenses e
         WHERE e.category = 'produce_purchase'
         ORDER BY e.date DESC
         LIMIT 5`),

      q(`SELECT status, COUNT(*) AS count
         FROM deliveries
         WHERE DATE(created_at) = CURRENT_DATE
         GROUP BY status`),
    ]);

    const breakdownMap = {};
    deliveryBreakdown.forEach((r) => {
      breakdownMap[r.status] = parseInt(r.count);
    });

    res.json({
      kpis: {
        active_deliveries: activeDeliveries.length,
        drivers_on_duty: parseInt(driversOnDuty.count || 0),
        avg_delivery_mins: parseFloat(avgDeliveryTime.avg_mins || 0).toFixed(0),
        staff_on_duty: staffToday.filter((s) => s.status === "present").length,
      },
      active_deliveries: activeDeliveries,
      staff_today: staffToday,
      purchase_orders: purchaseOrders,
      delivery_breakdown: breakdownMap,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── CUSTOMERS TAB ────────────────────────────────────────────────
router.get("/customers", async (req, res) => {
  try {
    const [
      totalCustomers,
      newThisMonth,
      loyaltyStats,
      walletStats,
      customerList,
      growthLast6,
    ] = await Promise.all([
      q1(`SELECT COUNT(*) AS count FROM customers WHERE status = 'active'`),

      q1(`SELECT COUNT(*) AS count FROM customers
          WHERE DATE_TRUNC('month', joined_at) = DATE_TRUNC('month', NOW())`),

      q1(`SELECT
            COALESCE(SUM(points_balance), 0) AS total_balance,
            COALESCE(SUM(lifetime_points), 0) AS total_lifetime
          FROM customer_loyalty`),

      q1(`SELECT
            COALESCE(SUM(balance), 0) AS total_balance,
            COALESCE(SUM(total_topped_up), 0) AS total_funded,
            COALESCE(SUM(total_spent), 0) AS total_spent
          FROM customer_wallets`),

      q(`SELECT
           c.name, c.phone, c.total_orders, c.status,
           COALESCE(cl.points_balance, 0) AS points,
           COALESCE(cw.balance, 0) AS wallet_balance
         FROM customers c
         LEFT JOIN customer_loyalty cl ON c.id = cl.customer_id
         LEFT JOIN customer_wallets cw ON c.id = cw.customer_id
         ORDER BY c.total_orders DESC
         LIMIT 10`),

      q(`SELECT
           TO_CHAR(DATE_TRUNC('month', joined_at), 'Mon') AS month,
           COUNT(*) AS new_customers
         FROM customers
         WHERE joined_at >= NOW() - INTERVAL '6 months'
         GROUP BY DATE_TRUNC('month', joined_at)
         ORDER BY DATE_TRUNC('month', joined_at)`),
    ]);

    res.json({
      kpis: {
        total_customers: parseInt(totalCustomers.count || 0),
        new_this_month: parseInt(newThisMonth.count || 0),
        total_points: parseInt(loyaltyStats.total_balance || 0),
        lifetime_points: parseInt(loyaltyStats.total_lifetime || 0),
        wallet_balance: parseFloat(walletStats.total_balance || 0),
        wallet_funded: parseFloat(walletStats.total_funded || 0),
      },
      customer_list: customerList,
      charts: { growth_last_6: growthLast6 },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── CHEF BEMS AI TAB ─────────────────────────────────────────────
router.get("/ai", async (req, res) => {
  try {
    // Ensure admin_dietary_rules table exists
    await pool.query(`CREATE TABLE IF NOT EXISTS admin_dietary_rules (
      id SERIAL PRIMARY KEY, condition VARCHAR(255) UNIQUE NOT NULL, rule_text TEXT NOT NULL,
      tags VARCHAR(255), priority INTEGER DEFAULT 0, created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW()
    )`);

    const [
      convToday,
      pendingConvs,
      dietaryRules,
      mealAssociations,
      recentConvs,
      convBreakdown,
    ] = await Promise.all([
      q1(`SELECT COUNT(*) AS count FROM ai_conversations
          WHERE DATE(started_at) = CURRENT_DATE`),

      q1(`SELECT COUNT(*) AS count FROM ai_conversations
          WHERE status = 'pending'`),

      q(`SELECT condition AS name, rule_text AS scope, 'active' AS status
         FROM admin_dietary_rules
         LIMIT 10`),

      q(`SELECT
           ma.name AS meal,
           COUNT(mdf.id) AS association_count
         FROM meal_associations ma
         LEFT JOIN meal_dietary_flags mdf ON ma.id = mdf.meal_id
         GROUP BY ma.id, ma.name
         ORDER BY association_count DESC
         LIMIT 5`),

      q(`SELECT
           ac.id,
           COALESCE(c.name, 'Anonymous') AS customer,
           COALESCE(ac.messages->0->>'content', 'No message') AS query,
           ac.status,
           ac.started_at AS created_at
         FROM ai_conversations ac
         LEFT JOIN customers c ON ac.customer_id = c.id
         ORDER BY ac.started_at DESC
         LIMIT 10`),

      q(`SELECT status, COUNT(*) AS count
         FROM ai_conversations
         WHERE DATE(started_at) = CURRENT_DATE
         GROUP BY status`),
    ]);

    const breakdownMap = {};
    convBreakdown.forEach((r) => {
      breakdownMap[r.status] = parseInt(r.count);
    });

    res.json({
      kpis: {
        conversations_today: parseInt(convToday.count || 0),
        pending_replies: parseInt(pendingConvs.count || 0),
        dietary_rules: dietaryRules.length,
        meal_associations: mealAssociations.length,
      },
      dietary_rules: dietaryRules,
      meal_associations: mealAssociations,
      recent_convs: recentConvs,
      conv_breakdown: breakdownMap,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
