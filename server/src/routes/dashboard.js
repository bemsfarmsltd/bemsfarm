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

// All dashboard routes require staff-level access
router.use(protect, requireRole("superadmin", "admin", "manager"));

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

// Real orders.status values (see BEMS_FARMS_DATABASE.md) collapsed into the
// friendly pipeline-chip stages the Overview tab displays.
const PIPELINE_STAGE_MAP = {
  new_order: "confirmed",
  processing: "preparing",
  packed_ready: "preparing",
  driver_assigned: "dispatched",
  out_for_delivery: "dispatched",
  delivery_attempted: "dispatched",
  delivered: "delivered",
};

// ── HELPER: Date range & timeframe parser ──────────────────────────
function parseDateFilter(query = {}) {
  const range = (query.range || 'today').toLowerCase();
  const customFrom = query.from;
  const customTo = query.to;

  if (range === 'custom' && customFrom && customTo) {
    const fromStr = `${customFrom} 00:00:00`;
    const toStr = `${customTo} 23:59:59`;
    return {
      range: 'custom',
      label: `${customFrom} to ${customTo}`,
      isFiltered: true,
      ordersWhere: `created_at >= '${fromStr}'::timestamp AND created_at <= '${toStr}'::timestamp`,
      incomeWhere: `date >= '${customFrom}'::date AND date <= '${customTo}'::date`,
      returnsWhere: `created_at >= '${fromStr}'::timestamp AND created_at <= '${toStr}'::timestamp`,
      attendanceWhere: `date >= '${customFrom}'::date AND date <= '${customTo}'::date`,
      usersWhere: `joined_at >= '${fromStr}'::timestamp AND joined_at <= '${toStr}'::timestamp`,
      aiWhere: `created_at >= '${fromStr}'::timestamp AND created_at <= '${toStr}'::timestamp`,
      from: customFrom,
      to: customTo,
    };
  }

  if (range === '7d') {
    return {
      range: '7d',
      label: 'Last 7 Days',
      isFiltered: true,
      ordersWhere: `created_at >= NOW() - INTERVAL '7 days'`,
      incomeWhere: `date >= CURRENT_DATE - INTERVAL '7 days'`,
      returnsWhere: `created_at >= NOW() - INTERVAL '7 days'`,
      attendanceWhere: `date >= CURRENT_DATE - INTERVAL '7 days'`,
      usersWhere: `joined_at >= NOW() - INTERVAL '7 days'`,
      aiWhere: `created_at >= NOW() - INTERVAL '7 days'`,
    };
  }

  if (range === '12d') {
    return {
      range: '12d',
      label: 'Last 12 Days',
      isFiltered: true,
      ordersWhere: `created_at >= NOW() - INTERVAL '12 days'`,
      incomeWhere: `date >= CURRENT_DATE - INTERVAL '12 days'`,
      returnsWhere: `created_at >= NOW() - INTERVAL '12 days'`,
      attendanceWhere: `date >= CURRENT_DATE - INTERVAL '12 days'`,
      usersWhere: `joined_at >= NOW() - INTERVAL '12 days'`,
      aiWhere: `created_at >= NOW() - INTERVAL '12 days'`,
    };
  }

  if (range === '1m' || range === '30d' || range === 'month') {
    return {
      range: '1m',
      label: 'Last 1 Month (30 Days)',
      isFiltered: true,
      ordersWhere: `created_at >= NOW() - INTERVAL '30 days'`,
      incomeWhere: `date >= CURRENT_DATE - INTERVAL '30 days'`,
      returnsWhere: `created_at >= NOW() - INTERVAL '30 days'`,
      attendanceWhere: `date >= CURRENT_DATE - INTERVAL '30 days'`,
      usersWhere: `joined_at >= NOW() - INTERVAL '30 days'`,
      aiWhere: `created_at >= NOW() - INTERVAL '30 days'`,
    };
  }

  if (range === '1y' || range === '365d' || range === 'year') {
    return {
      range: '1y',
      label: 'Last 1 Year',
      isFiltered: true,
      ordersWhere: `created_at >= NOW() - INTERVAL '1 year'`,
      incomeWhere: `date >= CURRENT_DATE - INTERVAL '1 year'`,
      returnsWhere: `created_at >= NOW() - INTERVAL '1 year'`,
      attendanceWhere: `date >= CURRENT_DATE - INTERVAL '1 year'`,
      usersWhere: `joined_at >= NOW() - INTERVAL '1 year'`,
      aiWhere: `created_at >= NOW() - INTERVAL '1 year'`,
    };
  }

  // Default: 'today'
  return {
    range: 'today',
    label: 'Today',
    isFiltered: false,
    ordersWhere: `DATE(created_at) = CURRENT_DATE`,
    incomeWhere: `DATE(date) = CURRENT_DATE`,
    returnsWhere: `DATE(created_at) = CURRENT_DATE`,
    attendanceWhere: `date = CURRENT_DATE`,
    usersWhere: `DATE(joined_at) = CURRENT_DATE`,
    aiWhere: `DATE(created_at) = CURRENT_DATE`,
  };
}

// ── OVERVIEW TAB ─────────────────────────────────────────────────
router.get("/overview", async (req, res, next) => {
  try {
    const filter = parseDateFilter(req.query);

    const [
      revenuePeriod,
      pendingOrders,
      readyDispatch,
      activeDeliveries,
      enRoute,
      lowStock,
      activeCustomers,
      newThisWeek,
      staffOnDuty,
      staffAbsent,
      pendingAi,
      returnsPeriod,
      pipeline,
      recentOrders,
      weekRevenue,
      weekOrders,
      topProducts,
      lowStockList,
      activeDeliveriesList,
      recentConvs,
    ] = await Promise.all([
      // Period revenue + order count
      q1(`SELECT
            COALESCE(SUM(total),0) AS revenue,
            COUNT(*) AS orders
          FROM orders
          WHERE ${filter.ordersWhere}
            AND status NOT IN ('cancelled')`),

      // Pending orders
      q1(`SELECT COUNT(*) AS count FROM orders
          WHERE status IN ('new_order','processing')`),

      // Ready for dispatch
      q1(`SELECT COUNT(*) AS count FROM orders
          WHERE status = 'packed_ready'`),

      // Active deliveries
      q1(`SELECT COUNT(*) AS count FROM deliveries
          WHERE status IN ('assigned','awaiting_pickup','en_route')`),

      // En route right now
      q1(`SELECT COUNT(*) AS count FROM deliveries WHERE status = 'en_route'`),

      // Low stock items
      q1(`SELECT COUNT(*) AS count FROM products
          WHERE stock <= low_stock_threshold
            AND status = 'active'`),

      // Active customers (ordered in last 30 days)
      q1(`SELECT COUNT(DISTINCT customer_id) AS count FROM orders
          WHERE created_at >= NOW() - INTERVAL '30 days'`),

      // New customer signups this week
      q1(`SELECT COUNT(*) AS count FROM users
          WHERE joined_at >= NOW() - INTERVAL '7 days'`),

      // Staff on duty today
      q1(`SELECT COUNT(*) AS count FROM staff_attendance
          WHERE date = CURRENT_DATE AND status = 'present'`),

      // Staff absent today
      q1(`SELECT COUNT(*) AS count FROM staff_attendance
          WHERE date = CURRENT_DATE AND status = 'absent'`),

      // Pending AI conversations
      q1(`SELECT COUNT(*) AS count FROM admin_ai_conversations WHERE bot_type='chef' AND archived=false`),

      // Returns/refunds submitted in period
      q1(`SELECT COUNT(*) AS count FROM returns WHERE ${filter.returnsWhere}`),

      // Pipeline counts in period
      q(`SELECT status, COUNT(*) AS count FROM orders
         WHERE ${filter.ordersWhere}
         GROUP BY status`),

      // Recent orders (last 10)
      q(`SELECT
           o.id, o.order_ref, o.total, o.status, o.created_at,
           COALESCE(o.customer_name, c.name, 'Walk-in') AS customer,
           GREATEST(
             COALESCE((SELECT SUM(oi.quantity) FROM order_items oi WHERE oi.order_id = o.id),
                      (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id),
                      0),
             CASE WHEN o.total > 0 THEN 1 ELSE 0 END
           ) AS items
         FROM orders o
         LEFT JOIN users c ON o.customer_id = c.id
         WHERE ${filter.ordersWhere}
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

      // Top selling produce in period
      q(`SELECT
           p.name, p.sku,
           SUM(oi.quantity) AS units_sold,
           SUM(oi.subtotal) AS total_revenue
         FROM order_items oi
         JOIN products p ON oi.product_id = p.id
         JOIN orders o ON oi.order_id = o.id
         WHERE ${filter.ordersWhere}
           AND o.status NOT IN ('cancelled')
         GROUP BY p.id, p.name, p.sku
         ORDER BY total_revenue DESC
         LIMIT 5`),

      // Low stock watchlist
      q(`SELECT id, name, sku, stock, low_stock_threshold
         FROM products
         WHERE stock <= low_stock_threshold
           AND status = 'active'
         ORDER BY stock ASC
         LIMIT 5`),

      // Active deliveries list
      q(`SELECT
           d.id, d.delivery_ref, d.status,
           COALESCE(o.customer_name, c.name, 'Customer') AS customer,
           COALESCE(dr.name, '—') AS driver,
           dz.zone_name AS zone,
           d.eta_minutes AS eta
         FROM deliveries d
         LEFT JOIN orders o ON d.order_id = o.id
         LEFT JOIN users c ON o.customer_id = c.id
         LEFT JOIN drivers dr ON d.driver_id = dr.id
         LEFT JOIN delivery_zones dz ON d.zone_id = dz.zone_id
         WHERE d.status IN ('assigned','awaiting_pickup','en_route')
         ORDER BY d.created_at DESC
         LIMIT 4`),

      // Recent AI conversations
      q(`SELECT
           ac.id,
           COALESCE(c.name, 'Anonymous') AS customer,
           COALESCE((SELECT content FROM ai_conversation_messages WHERE conversation_id=ac.id ORDER BY created_at LIMIT 1), 'No message') AS query,
           CASE WHEN ac.archived THEN 'completed' ELSE 'active' END AS status,
           ac.created_at
         FROM admin_ai_conversations ac
         LEFT JOIN users c ON ac.user_id = c.id
         WHERE ac.bot_type='chef'
         ORDER BY ac.created_at DESC
         LIMIT 3`),
    ]);

    const [activeCustomersList, staffOnDutyList] = await Promise.all([
      // Customers who ordered in the last 30 days
      q(`SELECT c.name, c.phone, COUNT(o.id) AS orders, COALESCE(SUM(o.total),0) AS spent
         FROM orders o
         JOIN users c ON o.customer_id = c.id
         WHERE o.created_at >= NOW() - INTERVAL '30 days'
         GROUP BY c.id, c.name, c.phone
         ORDER BY spent DESC
         LIMIT 10`),

      // Staff clocked in today
      q(`SELECT s.name, st.role, st.shift, sa.clock_in, sa.status
         FROM staff_attendance sa
         JOIN staff st ON sa.staff_id = st.id
         JOIN users s ON st.user_id = s.id
         WHERE sa.date = CURRENT_DATE
         ORDER BY sa.clock_in ASC NULLS LAST
         LIMIT 10`),
    ]);

    // Build pipeline map, collapsing real order statuses into friendly stages
    const pipelineMap = {};
    pipeline.forEach((r) => {
      const stage = PIPELINE_STAGE_MAP[r.status] || r.status;
      pipelineMap[stage] = (pipelineMap[stage] || 0) + parseInt(r.count);
    });
    pipelineMap.returned = parseInt(returnsPeriod.count || 0);

    res.json({
      filter: {
        range: filter.range,
        label: filter.label,
        from: filter.from,
        to: filter.to,
      },
      kpis: {
        revenue_today: parseFloat(revenuePeriod.revenue || 0),
        orders_today: parseInt(revenuePeriod.orders || 0),
        pending_orders: parseInt(pendingOrders.count || 0),
        ready_dispatch: parseInt(readyDispatch.count || 0),
        active_deliveries: parseInt(activeDeliveries.count || 0),
        en_route: parseInt(enRoute.count || 0),
        low_stock_alerts: parseInt(lowStock.count || 0),
        active_customers: parseInt(activeCustomers.count || 0),
        new_this_week: parseInt(newThisWeek.count || 0),
        staff_on_duty: parseInt(staffOnDuty.count || 0),
        staff_absent: parseInt(staffAbsent.count || 0),
        pending_ai: parseInt(pendingAi.count || 0),
      },
      pipeline: pipelineMap,
      recent_orders: recentOrders,
      top_products: topProducts,
      low_stock: lowStockList,
      active_deliveries: activeDeliveriesList,
      recent_convs: recentConvs,
      active_customers_list: activeCustomersList,
      staff_today: staffOnDutyList,
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
    next(err);
  }
});

// ── SALES TAB ────────────────────────────────────────────────────
router.get("/sales", async (req, res, next) => {
  try {
    const filter = parseDateFilter(req.query);

    const [
      periodStats,
      monthStats,
      returnsPeriod,
      skusSold,
      daily7d,
      last6Months,
      topProducts,
      recentOrders,
      byCategory,
      byPayment,
      bySource,
    ] = await Promise.all([
      // Revenue in selected period
      q1(`SELECT
            COALESCE(SUM(total),0) AS revenue,
            COUNT(*) AS orders,
            COALESCE(AVG(total),0) AS avg_order
          FROM orders
          WHERE ${filter.ordersWhere}
            AND status NOT IN ('cancelled')`),

      // 30-day baseline for comparison
      q1(`SELECT
            COALESCE(SUM(total),0) AS revenue,
            COUNT(*) AS orders
          FROM orders
          WHERE created_at >= NOW() - INTERVAL '30 days'
            AND status NOT IN ('cancelled')`),

      // Returns/refunds in period
      q1(`SELECT COUNT(*) AS count, COALESCE(SUM(refund_amount),0) AS total
          FROM returns
          WHERE ${filter.returnsWhere}`),

      // Distinct SKUs sold in period
      q1(`SELECT COUNT(DISTINCT oi.product_id) AS count
          FROM order_items oi
          JOIN orders o ON oi.order_id = o.id
          WHERE ${filter.ordersWhere}
            AND o.status NOT IN ('cancelled')`),

      // Revenue last 7 days (daily)
      q(`SELECT
           TO_CHAR(d.day, 'Dy') AS day_label,
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

      q(`SELECT
           TO_CHAR(DATE_TRUNC('month', created_at), 'Mon') AS month,
           COALESCE(SUM(total), 0) AS revenue,
           COUNT(*) AS orders
         FROM orders
         WHERE created_at >= NOW() - INTERVAL '6 months'
           AND status NOT IN ('cancelled')
         GROUP BY DATE_TRUNC('month', created_at)
         ORDER BY DATE_TRUNC('month', created_at)`),

      // Top products in period
      q(`SELECT
           p.name,
           p.sku,
           SUM(oi.quantity) AS sold,
           SUM(oi.subtotal) AS revenue,
           0 AS trend
         FROM order_items oi
         JOIN products p ON oi.product_id = p.id
         JOIN orders o ON oi.order_id = o.id
         WHERE ${filter.ordersWhere}
           AND o.status NOT IN ('cancelled')
         GROUP BY p.id, p.name, p.sku
         ORDER BY revenue DESC
         LIMIT 5`),

      // Recent orders in period
      q(`SELECT
           o.id, o.order_ref, o.total, o.status, o.created_at,
           COALESCE(o.customer_name, c.name, 'Walk-in') AS customer,
           (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) AS items
         FROM orders o
         LEFT JOIN users c ON o.customer_id = c.id
         WHERE ${filter.ordersWhere}
         ORDER BY o.created_at DESC
         LIMIT 10`),

      // Category revenue in period
      q(`SELECT
           cat.name AS category,
           COALESCE(SUM(oi.subtotal), 0) AS revenue
         FROM order_items oi
         JOIN products p ON oi.product_id = p.id
         JOIN categories cat ON p.category_id = cat.id
         JOIN orders o ON oi.order_id = o.id
         WHERE ${filter.ordersWhere}
           AND o.status NOT IN ('cancelled')
         GROUP BY cat.name
         ORDER BY revenue DESC
         LIMIT 6`),

      // Payment methods in period
      q(`SELECT
           COALESCE(NULLIF(TRIM(payment_method), ''), 'cash') AS method,
           COUNT(*) AS count,
           SUM(total) AS amount
         FROM orders
         WHERE ${filter.ordersWhere}
           AND status NOT IN ('cancelled')
         GROUP BY method
         ORDER BY count DESC`),

      // Sales source in period
      q(`SELECT
           COALESCE(source, 'Web App') AS source,
           COUNT(*) AS count,
           SUM(total) AS revenue
         FROM orders
         WHERE ${filter.ordersWhere}
           AND status NOT IN ('cancelled')
         GROUP BY source
         ORDER BY count DESC`),
    ]);

    const [returnsPeriodList, skusSoldList] = await Promise.all([
      q(`SELECT r.id, r.order_id, p.name AS product, r.reason, r.refund_amount, r.status
         FROM returns r
         LEFT JOIN products p ON r.product_id = p.id
         WHERE ${filter.returnsWhere}
         ORDER BY r.created_at DESC
         LIMIT 10`),

      q(`SELECT p.name, p.sku, SUM(oi.quantity) AS qty_sold, SUM(oi.subtotal) AS revenue
         FROM order_items oi
         JOIN orders o ON oi.order_id = o.id
         JOIN products p ON oi.product_id = p.id
         WHERE ${filter.ordersWhere}
           AND o.status NOT IN ('cancelled')
         GROUP BY p.id, p.name, p.sku
         ORDER BY revenue DESC
         LIMIT 20`),
    ]);

    res.json({
      filter: {
        range: filter.range,
        label: filter.label,
        from: filter.from,
        to: filter.to,
      },
      kpis: {
        today_revenue: parseFloat(periodStats.revenue || 0),
        orders_today: parseInt(periodStats.orders || 0),
        avg_order_value: parseFloat(periodStats.avg_order || 0),
        month_revenue: parseFloat(monthStats.revenue || 0),
        orders_month: parseInt(monthStats.orders || 0),
        returns_today: parseInt(returnsPeriod.count || 0),
        returns_value: parseFloat(returnsPeriod.total || 0),
        skus_sold: parseInt(skusSold.count || 0),
      },
      charts: {
        daily_7d: daily7d,
        monthly_6m: last6Months,
        by_category: byCategory,
        by_payment: byPayment,
        by_source: bySource,
      },
      top_products: topProducts,
      recent_orders: recentOrders,
      returns_today_list: returnsPeriodList,
      skus_sold_list: skusSoldList,
    });
  } catch (err) {
    next(err);
  }
});

// ── FINANCE / REVENUE & SETTLEMENTS TAB ─────────────────────────
router.get("/finance", async (req, res, next) => {
  try {
    const filter = parseDateFilter(req.query);

    const [
      periodGrossStats,
      allTimeGrossStats,
      posStatsPeriod,
      webStatsPeriod,
      walletStats,
      commissionsStatsPeriod,
      refundsStatsPeriod,
      monthly6m,
      byPayment,
      byChannel,
      daily7d,
      recentSettlements,
    ] = await Promise.all([
      // 1. Period gross revenue: orders revenue + non-order completed income in selected period
      q1(`SELECT
            (
              COALESCE((SELECT SUM(total) FROM orders WHERE ${filter.ordersWhere} AND status NOT IN ('cancelled')), 0)
              +
              COALESCE((SELECT SUM(amount) FROM income WHERE ${filter.incomeWhere} AND status = 'completed' AND (order_id IS NULL OR order_id = '')), 0)
            ) AS gross_revenue,
            COALESCE((SELECT COUNT(*) FROM orders WHERE ${filter.ordersWhere} AND status NOT IN ('cancelled')), 0) AS total_orders,
            COALESCE((SELECT AVG(total) FROM orders WHERE ${filter.ordersWhere} AND status NOT IN ('cancelled')), 0) AS avg_order_value`),

      // 2. All-time / 30-day baseline stats for reference
      q1(`SELECT
            (
              COALESCE((SELECT SUM(total) FROM orders WHERE status NOT IN ('cancelled')), 0)
              +
              COALESCE((SELECT SUM(amount) FROM income WHERE status = 'completed' AND (order_id IS NULL OR order_id = '')), 0)
            ) AS all_time_revenue,
            COALESCE((SELECT COUNT(*) FROM orders WHERE status NOT IN ('cancelled')), 0) AS all_time_orders`),

      // 3. POS In-Store Revenue in period
      q1(`SELECT
            COALESCE(SUM(total), 0) AS revenue,
            COUNT(*) AS orders
          FROM orders
          WHERE ${filter.ordersWhere}
            AND status NOT IN ('cancelled')
            AND (source = 'pos' OR payment_method = 'pos_terminal')`),

      // 4. Online & Storefront Revenue in period
      q1(`SELECT
            COALESCE(SUM(total), 0) AS revenue,
            COUNT(*) AS orders
          FROM orders
          WHERE ${filter.ordersWhere}
            AND status NOT IN ('cancelled')
            AND (source != 'pos' OR source IS NULL)
            AND (payment_method != 'pos_terminal' OR payment_method IS NULL)`),

      // 5. Customer Wallet Floating Balances
      q1(`SELECT
            COALESCE(SUM(balance), 0) AS total_balance,
            COALESCE(SUM(total_topped_up), 0) AS total_funded,
            COALESCE(SUM(total_spent), 0) AS total_spent
          FROM customer_wallets`),

      // 6. Driver Delivery Commission Accruals in period
      q1(`SELECT
            COALESCE(SUM(commission_amount), 0) AS total_commissions,
            COUNT(*) AS total_trips
          FROM driver_commissions
          WHERE ${filter.ordersWhere}`),

      // 7. Refunds & Returns Deductions in period
      q1(`SELECT
            COALESCE(SUM(refund_amount), 0) AS total_refunds,
            COUNT(*) AS count
          FROM returns
          WHERE ${filter.returnsWhere}`),

      // 8. 6-Month Gross Revenue & Order Volume
      q(`SELECT
           TO_CHAR(DATE_TRUNC('month', d), 'Mon') AS month,
           (COALESCE(ord.total, 0) + COALESCE(inc.total, 0)) AS revenue,
           COALESCE(ord.orders_count, 0) AS orders
         FROM generate_series(
           DATE_TRUNC('month', NOW()) - INTERVAL '5 months',
           DATE_TRUNC('month', NOW()), '1 month'
         ) AS d
         LEFT JOIN (
           SELECT DATE_TRUNC('month', created_at) AS m, SUM(total) AS total, COUNT(*) AS orders_count
           FROM orders WHERE status NOT IN ('cancelled')
           GROUP BY m
         ) ord ON ord.m = d
         LEFT JOIN (
           SELECT DATE_TRUNC('month', date) AS m, SUM(amount) AS total
           FROM income WHERE status = 'completed' AND (order_id IS NULL OR order_id = '')
           GROUP BY m
         ) inc ON inc.m = d
         ORDER BY d`),

      // 9. Payment Methods Breakdown in period
      q(`SELECT
           COALESCE(NULLIF(TRIM(payment_method), ''), 'cash') AS method,
           COUNT(*) AS count,
           SUM(total) AS amount
         FROM orders
         WHERE ${filter.ordersWhere}
           AND status NOT IN ('cancelled')
         GROUP BY method
         ORDER BY amount DESC`),

      // 10. Sales Channel Split in period (POS vs Web vs Manual)
      q(`SELECT
           CASE
             WHEN source = 'pos' OR payment_method = 'pos_terminal' THEN 'POS In-Store'
             WHEN source = 'storefront' THEN 'Online Storefront'
             WHEN source = 'web' THEN 'Web Portal'
             ELSE 'Direct / Admin'
           END AS channel,
           COUNT(*) AS count,
           SUM(total) AS amount
         FROM orders
         WHERE ${filter.ordersWhere}
           AND status NOT IN ('cancelled')
         GROUP BY channel
         ORDER BY amount DESC`),

      // 11. Daily Gross Inflows (Last 7 Days)
      q(`SELECT
           TO_CHAR(d.day, 'Dy (DD Mon)') AS label,
           COALESCE(SUM(o.total), 0) AS revenue,
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

      // 12. Recent Financial Transactions & Order Settlements in period
      q(`SELECT
           o.id,
           COALESCE(o.order_ref, CAST(o.id AS VARCHAR)) AS ref,
           COALESCE(o.customer_name, c.name, 'Walk-in Customer') AS customer,
           CASE
             WHEN o.source = 'pos' OR o.payment_method = 'pos_terminal' THEN 'POS In-Store'
             WHEN o.source = 'storefront' THEN 'Storefront'
             ELSE 'Web App'
           END AS channel,
           COALESCE(NULLIF(TRIM(o.payment_method), ''), 'cash') AS payment_method,
           o.total AS amount,
           o.status,
           o.created_at
         FROM orders o
         LEFT JOIN users c ON o.customer_id = c.id
         WHERE ${filter.ordersWhere}
           AND o.status NOT IN ('cancelled')
         ORDER BY o.created_at DESC
         LIMIT 25`),
    ]);

    const grossPeriod = parseFloat(periodGrossStats.gross_revenue || 0);
    const posRev = parseFloat(posStatsPeriod.revenue || 0);
    const webRev = parseFloat(webStatsPeriod.revenue || 0);
    const walletFloat = parseFloat(walletStats.total_balance || 0);
    const refundsPeriod = parseFloat(refundsStatsPeriod.total_refunds || 0);
    const commsPeriod = parseFloat(commissionsStatsPeriod.total_commissions || 0);

    // Calculate tender percentage shares
    const totalTenderAmount = byPayment.reduce((acc, p) => acc + parseFloat(p.amount || 0), 0) || 1;
    const paymentSummary = byPayment.map((p) => ({
      method: p.method,
      count: parseInt(p.count || 0),
      amount: parseFloat(p.amount || 0),
      share_pct: (((parseFloat(p.amount || 0) / totalTenderAmount) * 100) || 0).toFixed(1),
    }));

    res.json({
      filter: {
        range: filter.range,
        label: filter.label,
        from: filter.from,
        to: filter.to,
      },
      kpis: {
        month_revenue: grossPeriod,
        today_revenue: grossPeriod, // represents selected period gross
        total_orders_month: parseInt(periodGrossStats.total_orders || 0),
        today_orders: parseInt(periodGrossStats.total_orders || 0),
        avg_order_value: parseFloat(periodGrossStats.avg_order_value || 0),
        pos_revenue: posRev,
        pos_orders: parseInt(posStatsPeriod.orders || 0),
        web_revenue: webRev,
        web_orders: parseInt(webStatsPeriod.orders || 0),
        wallet_float: walletFloat,
        wallet_funded: parseFloat(walletStats.total_funded || 0),
        wallet_spent: parseFloat(walletStats.total_spent || 0),
        driver_commissions: commsPeriod,
        driver_trips: parseInt(commissionsStatsPeriod.total_trips || 0),
        refunds_month: refundsPeriod,
        refunds_count: parseInt(refundsStatsPeriod.count || 0),
      },
      charts: {
        monthly_6m: monthly6m.map((r) => ({
          month: r.month,
          revenue: parseFloat(r.revenue || 0),
          orders: parseInt(r.orders || 0),
        })),
        by_payment: paymentSummary,
        by_channel: byChannel.map((r) => ({
          channel: r.channel,
          count: parseInt(r.count || 0),
          amount: parseFloat(r.amount || 0),
        })),
        daily_7d: daily7d.map((r) => ({
          label: r.label,
          revenue: parseFloat(r.revenue || 0),
          orders: parseInt(r.orders || 0),
        })),
      },
      recent_settlements: recentSettlements,
      payment_summary: paymentSummary,
    });
  } catch (err) {
    next(err);
  }
});

// ── INVENTORY TAB ────────────────────────────────────────────────
router.get("/inventory", async (req, res, next) => {
  try {
    const [
      totalSkus,
      totalValue,
      outOfStock,
      lowStockCount,
      lowStockItems,
      expiringCount,
      expiringBatches,
      inventoryList,
      valueByCategory,
    ] = await Promise.all([
      q1(`SELECT COUNT(*) AS count FROM products WHERE status = 'active'`),

      q1(`SELECT COALESCE(SUM(stock * COALESCE(unit_price, price, 0)), 0) AS total
          FROM products WHERE status = 'active'`),

      q1(`SELECT COUNT(*) AS count FROM products
          WHERE stock = 0 AND status = 'active'`),

      // Exact count of low stock items across entire catalog (matching Overview)
      q1(`SELECT COUNT(*) AS count FROM products
          WHERE stock <= low_stock_threshold
            AND status = 'active'`),

      q(`SELECT id, name, sku, stock AS qty, low_stock_threshold AS reorder_qty,
                expiry_date, status
         FROM products
         WHERE stock <= low_stock_threshold
           AND status = 'active'
         ORDER BY stock ASC
         LIMIT 10`),

      // Exact count of expiring batches
      q1(`SELECT COUNT(*) AS count FROM batch_management
          WHERE expiry_date <= CURRENT_DATE + INTERVAL '7 days'
            AND status = 'active'`),

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
        low_stock_count: parseInt(lowStockCount.count || 0),
        expiring_count: parseInt(expiringCount.count || 0),
        out_of_stock: parseInt(outOfStock.count || 0),
      },
      low_stock_items: lowStockItems,
      expiring_batches: expiringBatches,
      inventory_list: inventoryList,
      charts: { value_by_category: valueByCategory },
    });
  } catch (err) {
    next(err);
  }
});

// ── OPERATIONS TAB ───────────────────────────────────────────────
router.get("/operations", async (req, res, next) => {
  try {
    const filter = parseDateFilter(req.query);

    const [
      activeDeliveriesCount,
      activeDeliveries,
      driversOnDuty,
      avgDeliveryTime,
      staffOnDutyCount,
      staffToday,
      purchaseOrders,
      deliveryBreakdown,
    ] = await Promise.all([
      // Real total count of active deliveries (matching Overview)
      q1(`SELECT COUNT(*) AS count FROM deliveries
          WHERE status IN ('assigned','awaiting_pickup','en_route')`),

      q(`SELECT
           d.id, d.delivery_ref, d.status,
           COALESCE(o.customer_name, c.name, 'Customer') AS customer,
           COALESCE(dr.name, '—') AS driver,
           dz.zone_name AS zone,
           d.eta_minutes AS eta
         FROM deliveries d
         LEFT JOIN orders o ON d.order_id = o.id
         LEFT JOIN users c ON o.customer_id = c.id
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
            AND ${filter.ordersWhere.replace(/created_at/g, 'delivered_at')}`),

      // Real total count of staff clocked in
      q1(`SELECT COUNT(*) AS count FROM staff_attendance
          WHERE ${filter.attendanceWhere} AND status = 'present'`),

      q(`SELECT
           s.name, st.role, st.shift,
           sa.clock_in, sa.status
         FROM staff_attendance sa
         JOIN staff st ON sa.staff_id = st.id
         JOIN users s ON st.user_id = s.id
         WHERE ${filter.attendanceWhere}
         ORDER BY sa.clock_in ASC NULLS LAST
         LIMIT 10`),

      q(`SELECT
           e.reference AS po_ref,
           e.description AS supplier,
           e.amount, e.date,
           e.status
         FROM expenses e
         WHERE e.category = 'produce_purchase'
           AND ${filter.incomeWhere}
         ORDER BY e.date DESC
         LIMIT 5`),

      q(`SELECT status, COUNT(*) AS count
         FROM deliveries
         WHERE ${filter.ordersWhere}
         GROUP BY status`),
    ]);

    const [driversOnDutyList, deliveryTimesList] = await Promise.all([
      q(`SELECT dr.name, dr.vehicle_type, dz.zone_name AS zone, dr.rating, dr.status
         FROM drivers dr
         LEFT JOIN delivery_zones dz ON dr.primary_zone_id = dz.zone_id
         WHERE dr.status IN ('active','on_delivery')
         ORDER BY dr.name ASC
         LIMIT 10`),

      q(`SELECT
           delivery_ref, dispatched_at, delivered_at,
           ROUND(EXTRACT(EPOCH FROM (delivered_at - dispatched_at)) / 60) AS minutes
         FROM deliveries
         WHERE status = 'delivered'
           AND ${filter.ordersWhere.replace(/created_at/g, 'delivered_at')}
         ORDER BY delivered_at DESC
         LIMIT 10`),
    ]);

    const breakdownMap = {};
    deliveryBreakdown.forEach((r) => {
      breakdownMap[r.status] = parseInt(r.count);
    });

    res.json({
      filter: {
        range: filter.range,
        label: filter.label,
        from: filter.from,
        to: filter.to,
      },
      kpis: {
        active_deliveries: parseInt(activeDeliveriesCount.count || 0),
        drivers_on_duty: parseInt(driversOnDuty.count || 0),
        avg_delivery_mins: parseFloat(avgDeliveryTime.avg_mins || 0).toFixed(0),
        staff_on_duty: parseInt(staffOnDutyCount.count || 0),
      },
      active_deliveries: activeDeliveries,
      staff_today: staffToday,
      purchase_orders: purchaseOrders,
      delivery_breakdown: breakdownMap,
      drivers_on_duty_list: driversOnDutyList,
      delivery_times_list: deliveryTimesList,
    });
  } catch (err) {
    next(err);
  }
});

// ── CUSTOMERS TAB ────────────────────────────────────────────────
router.get("/customers", async (req, res, next) => {
  try {
    const filter = parseDateFilter(req.query);

    const [
      totalCustomers,
      newInPeriod,
      loyaltyStats,
      walletStats,
      customerList,
      growthLast6,
    ] = await Promise.all([
      q1(`SELECT COUNT(*) AS count FROM users WHERE status = 'active'`),

      q1(`SELECT COUNT(*) AS count FROM users
          WHERE ${filter.usersWhere}`),

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
         FROM users c
         LEFT JOIN customer_loyalty cl ON c.id = cl.customer_id
         LEFT JOIN customer_wallets cw ON c.id = cw.customer_id
         ORDER BY c.total_orders DESC
         LIMIT 10`),

      q(`SELECT
           TO_CHAR(DATE_TRUNC('month', joined_at), 'Mon') AS month,
           COUNT(*) AS new_customers
         FROM users
         WHERE joined_at >= NOW() - INTERVAL '6 months'
         GROUP BY DATE_TRUNC('month', joined_at)
         ORDER BY DATE_TRUNC('month', joined_at)`),
    ]);

    res.json({
      filter: {
        range: filter.range,
        label: filter.label,
        from: filter.from,
        to: filter.to,
      },
      kpis: {
        total_customers: parseInt(totalCustomers.count || 0),
        new_this_month: parseInt(newInPeriod.count || 0),
        total_points: parseInt(loyaltyStats.total_balance || 0),
        lifetime_points: parseInt(loyaltyStats.total_lifetime || 0),
        wallet_balance: parseFloat(walletStats.total_balance || 0),
        wallet_funded: parseFloat(walletStats.total_funded || 0),
        wallet_spent: parseFloat(walletStats.total_spent || 0),
      },
      customer_list: customerList,
      charts: { growth_last_6: growthLast6 },
    });
  } catch (err) {
    next(err);
  }
});

// ── CHEF BEMS AI TAB ─────────────────────────────────────────────
router.get("/ai", async (req, res, next) => {
  try {
    const filter = parseDateFilter(req.query);

    const [
      convPeriod,
      pendingConvs,
      dietaryRulesCount,
      dietaryRules,
      mealAssociationsCount,
      mealAssociations,
      recentConvs,
      convBreakdown,
    ] = await Promise.all([
      q1(`SELECT COUNT(*) AS count FROM admin_ai_conversations
          WHERE bot_type='chef' AND ${filter.aiWhere}`),

      q1(`SELECT COUNT(*) AS count FROM admin_ai_conversations
          WHERE bot_type='chef' AND archived=false`),

      // Exact count of dietary rules
      q1(`SELECT COUNT(*) AS count FROM admin_dietary_rules`),

      q(`SELECT condition AS name, rule_text AS scope, 'active' AS status
         FROM admin_dietary_rules
         LIMIT 10`),

      // Exact count of meal associations
      q1(`SELECT COUNT(*) AS count FROM product_associations`),

      q(`SELECT
           product_a || ' + ' || product_b AS meal,
           association_strength AS association_count
         FROM product_associations
         ORDER BY association_strength DESC
         LIMIT 5`),

      q(`SELECT
           ac.id,
           COALESCE(c.name, 'Anonymous') AS customer,
           COALESCE((SELECT content FROM ai_conversation_messages WHERE conversation_id=ac.id ORDER BY created_at LIMIT 1), 'No message') AS query,
           CASE WHEN ac.archived THEN 'completed' ELSE 'active' END AS status,
           ac.created_at
         FROM admin_ai_conversations ac
         LEFT JOIN users c ON ac.user_id = c.id
         WHERE ac.bot_type='chef'
         ORDER BY ac.created_at DESC
         LIMIT 10`),

      q(`SELECT CASE WHEN archived THEN 'completed' ELSE 'active' END AS status, COUNT(*) AS count
         FROM admin_ai_conversations
         WHERE bot_type='chef' AND ${filter.aiWhere}
         GROUP BY archived`),
    ]);

    const breakdownMap = {};
    convBreakdown.forEach((r) => {
      breakdownMap[r.status] = parseInt(r.count);
    });

    res.json({
      filter: {
        range: filter.range,
        label: filter.label,
        from: filter.from,
        to: filter.to,
      },
      kpis: {
        conversations_today: parseInt(convPeriod.count || 0),
        pending_replies: parseInt(pendingConvs.count || 0),
        dietary_rules: parseInt(dietaryRulesCount.count || 0),
        meal_associations: parseInt(mealAssociationsCount.count || 0),
      },
      dietary_rules: dietaryRules,
      meal_associations: mealAssociations,
      recent_convs: recentConvs,
      conv_breakdown: breakdownMap,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
