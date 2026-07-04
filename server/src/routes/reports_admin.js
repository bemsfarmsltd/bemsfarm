// server/src/routes/reports_admin.js
// Mounted at /api/admin/reports in index.js
//
// No new tables required — all queries draw from existing tables:
//   orders, order_items, products, categories, customers/users,
//   income, expenses, bank_accounts, transactions,
//   purchase_orders, purchase_order_items, suppliers,
//   stock_movements, products (stock)
//
// Common query params for all report endpoints:
//   from=YYYY-MM-DD  (default: first day of current month)
//   to=YYYY-MM-DD    (default: today)
//   group_by=day|week|month|year  (default: day when range ≤ 31d, else month)
// ───────────────────────────────────────────────────────────────────────────

const express = require("express");
const router  = express.Router();
const pool    = require("../db/pool");
const { protect, requireRole } = require("../middleware/authMiddleware");

router.use(protect);
router.use(requireRole("superadmin", "manager", "admin"));

// ── DATE HELPERS ─────────────────────────────────────────────────────────────
function defaultDates(query) {
  const to   = query.to   || new Date().toISOString().slice(0, 10);
  const from = query.from || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
  return { from, to };
}

function groupFormat(group_by) {
  switch (group_by) {
    case "week":  return "IYYY-IW";       // ISO week
    case "month": return "YYYY-MM";
    case "year":  return "YYYY";
    default:      return "YYYY-MM-DD";    // day
  }
}

function groupLabel(group_by) {
  switch (group_by) {
    case "week":  return "TO_CHAR(DATE_TRUNC('week',  %col%), 'YYYY-\"W\"IW')";
    case "month": return "TO_CHAR(DATE_TRUNC('month', %col%), 'Mon YYYY')";
    case "year":  return "TO_CHAR(DATE_TRUNC('year',  %col%), 'YYYY')";
    default:      return "TO_CHAR(%col%::DATE, 'DD Mon')";
  }
}

function truncFn(group_by) {
  const map = { day: "day", week: "week", month: "month", year: "year" };
  return map[group_by] || "day";
}

// ════════════════════════════════════════════════════════════════════════════
// SALES REPORT  ──  GET /api/admin/reports/sales
// ════════════════════════════════════════════════════════════════════════════
router.get("/sales", async (req, res) => {
  try {
    const { from, to } = defaultDates(req.query);
    const group_by = req.query.group_by || "day";
    const trunc    = truncFn(group_by);
    const labelExpr = groupLabel(group_by).replace(/%col%/g, "o.created_at");

    const [summary, timeline, topProducts, topCategories, byStatus, topCustomers] = await Promise.all([

      // KPIs
      pool.query(`
        SELECT
          COUNT(DISTINCT o.id)                               AS total_orders,
          COUNT(DISTINCT o.id) FILTER (WHERE o.status NOT IN ('cancelled','failed')) AS valid_orders,
          COALESCE(SUM(o.total) FILTER (WHERE o.status NOT IN ('cancelled','failed')), 0) AS gross_revenue,
          COALESCE(SUM(o.discount_amount), 0)                AS total_discounts,
          COALESCE(SUM(o.total - COALESCE(o.discount_amount,0)) FILTER (WHERE o.status NOT IN ('cancelled','failed')), 0) AS net_revenue,
          COALESCE(AVG(o.total) FILTER (WHERE o.status NOT IN ('cancelled','failed')), 0) AS avg_order_value,
          COUNT(DISTINCT o.user_id)                          AS unique_customers,
          COALESCE(SUM(o.total) FILTER (WHERE o.status='cancelled'), 0) AS cancelled_value,
          COUNT(*) FILTER (WHERE o.status='cancelled')       AS cancelled_count
        FROM orders o
        WHERE o.created_at::DATE BETWEEN $1 AND $2
      `, [from, to]),

      // Revenue over time
      pool.query(`
        SELECT
          ${labelExpr} AS label,
          DATE_TRUNC($3, o.created_at) AS period,
          COUNT(DISTINCT o.id) AS orders,
          COALESCE(SUM(o.total) FILTER (WHERE o.status NOT IN ('cancelled','failed')), 0) AS revenue
        FROM orders o
        WHERE o.created_at::DATE BETWEEN $1 AND $2
        GROUP BY period, label
        ORDER BY period
      `, [from, to, trunc]),

      // Top 10 products by revenue
      pool.query(`
        SELECT
          p.id, p.name, p.sku,
          COALESCE(p.image_url, '') AS image_url,
          SUM(oi.quantity)          AS units_sold,
          SUM(oi.price * oi.quantity) AS revenue,
          COUNT(DISTINCT o.id)      AS order_count
        FROM order_items oi
        JOIN orders o   ON oi.order_id  = o.id
        JOIN products p ON oi.product_id = p.id
        WHERE o.created_at::DATE BETWEEN $1 AND $2
          AND o.status NOT IN ('cancelled','failed')
        GROUP BY p.id, p.name, p.sku, p.image_url
        ORDER BY revenue DESC LIMIT 10
      `, [from, to]),

      // By category
      pool.query(`
        SELECT
          c.name AS category,
          SUM(oi.quantity)               AS units_sold,
          SUM(oi.price * oi.quantity)    AS revenue,
          COUNT(DISTINCT o.id)           AS order_count
        FROM order_items oi
        JOIN orders    o  ON oi.order_id   = o.id
        JOIN products  p  ON oi.product_id = p.id
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE o.created_at::DATE BETWEEN $1 AND $2
          AND o.status NOT IN ('cancelled','failed')
        GROUP BY c.name
        ORDER BY revenue DESC
      `, [from, to]),

      // Orders by status
      pool.query(`
        SELECT status, COUNT(*) AS count, COALESCE(SUM(total),0) AS value
        FROM orders
        WHERE created_at::DATE BETWEEN $1 AND $2
        GROUP BY status ORDER BY count DESC
      `, [from, to]),

      // Top 10 customers
      pool.query(`
        SELECT
          u.id, u.name, u.email, u.phone,
          COUNT(DISTINCT o.id)           AS order_count,
          COALESCE(SUM(o.total),0)       AS total_spend,
          MAX(o.created_at)              AS last_order
        FROM orders o
        JOIN users u ON o.user_id = u.id
        WHERE o.created_at::DATE BETWEEN $1 AND $2
          AND o.status NOT IN ('cancelled','failed')
        GROUP BY u.id, u.name, u.email, u.phone
        ORDER BY total_spend DESC LIMIT 10
      `, [from, to]),
    ]);

    res.json({
      period: { from, to, group_by },
      summary: summary.rows[0],
      timeline: timeline.rows,
      top_products: topProducts.rows,
      by_category: topCategories.rows,
      by_status: byStatus.rows,
      top_customers: topCustomers.rows,
    });
  } catch (err) {
    console.error("GET /admin/reports/sales:", err.message);
    res.status(500).json({ message: err.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// FINANCE REPORT  ──  GET /api/admin/reports/finance
// ════════════════════════════════════════════════════════════════════════════
router.get("/finance", async (req, res) => {
  try {
    const { from, to } = defaultDates(req.query);
    const group_by     = req.query.group_by || "month";
    const trunc        = truncFn(group_by);
    const incLabel     = groupLabel(group_by).replace(/%col%/g, "i.date");
    const expLabel     = groupLabel(group_by).replace(/%col%/g, "e.date");

    const [kpis, plTimeline, bankBalances, incomeBySource, expenseByCategory, topExpenses] = await Promise.all([

      pool.query(`
        SELECT
          COALESCE((SELECT SUM(amount) FROM income   WHERE date BETWEEN $1 AND $2 AND status='completed'), 0) AS total_income,
          COALESCE((SELECT SUM(amount) FROM expenses WHERE date BETWEEN $1 AND $2 AND status IN ('approved','paid')), 0) AS total_expenses,
          COALESCE((SELECT SUM(amount) FROM income   WHERE date BETWEEN $1 AND $2 AND status='completed'), 0)
          - COALESCE((SELECT SUM(amount) FROM expenses WHERE date BETWEEN $1 AND $2 AND status IN ('approved','paid')), 0)
          AS net_profit,
          COALESCE((SELECT SUM(balance) FROM bank_accounts WHERE status='active'), 0) AS total_cash
      `, [from, to]),

      // P&L over time — unified time series for both income and expenses
      pool.query(`
        WITH periods AS (
          SELECT DISTINCT DATE_TRUNC($3, d) AS period
          FROM generate_series($1::DATE, $2::DATE, '1 day'::INTERVAL) d
        ),
        inc AS (
          SELECT DATE_TRUNC($3, date) AS period, SUM(amount) AS income
          FROM income WHERE date BETWEEN $1 AND $2 AND status='completed'
          GROUP BY 1
        ),
        exp AS (
          SELECT DATE_TRUNC($3, date) AS period, SUM(amount) AS expenses
          FROM expenses WHERE date BETWEEN $1 AND $2 AND status IN ('approved','paid')
          GROUP BY 1
        )
        SELECT
          TO_CHAR(p.period, 'YYYY-MM-DD') AS period,
          COALESCE(i.income,   0)          AS income,
          COALESCE(e.expenses, 0)          AS expenses,
          COALESCE(i.income,0) - COALESCE(e.expenses,0) AS profit
        FROM periods p
        LEFT JOIN inc i ON i.period = p.period
        LEFT JOIN exp e ON e.period = p.period
        ORDER BY p.period
      `, [from, to, trunc]),

      pool.query(`
        SELECT id, account_name, bank_name, account_number, account_type,
               balance, currency, is_primary
        FROM bank_accounts WHERE status='active'
        ORDER BY is_primary DESC, balance DESC
      `),

      pool.query(`
        SELECT source, COALESCE(SUM(amount),0) AS total, COUNT(*) AS count
        FROM income WHERE date BETWEEN $1 AND $2 AND status='completed'
        GROUP BY source ORDER BY total DESC
      `, [from, to]),

      pool.query(`
        SELECT category, COALESCE(SUM(amount),0) AS total, COUNT(*) AS count
        FROM expenses WHERE date BETWEEN $1 AND $2 AND status IN ('approved','paid')
        GROUP BY category ORDER BY total DESC
      `, [from, to]),

      pool.query(`
        SELECT id, reference, description, supplier_name, category, amount, date, status
        FROM expenses WHERE date BETWEEN $1 AND $2
        ORDER BY amount DESC LIMIT 10
      `, [from, to]),
    ]);

    const totalIncome   = parseFloat(kpis.rows[0]?.total_income   || 0);
    const totalExpenses = parseFloat(kpis.rows[0]?.total_expenses || 0);

    res.json({
      period: { from, to, group_by },
      kpis: {
        ...kpis.rows[0],
        profit_margin: totalIncome > 0 ? +((totalIncome - totalExpenses) / totalIncome * 100).toFixed(1) : 0,
      },
      pl_timeline: plTimeline.rows,
      bank_balances: bankBalances.rows,
      income_by_source: incomeBySource.rows,
      expense_by_category: expenseByCategory.rows,
      top_expenses: topExpenses.rows,
    });
  } catch (err) {
    console.error("GET /admin/reports/finance:", err.message);
    res.status(500).json({ message: err.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// INVENTORY REPORT  ──  GET /api/admin/reports/inventory
// ════════════════════════════════════════════════════════════════════════════
router.get("/inventory", async (req, res) => {
  try {
    const { from, to } = defaultDates(req.query);
    const low_stock_threshold = parseInt(req.query.low_stock_threshold) || 10;

    const [summary, stockByCategory, lowStock, outOfStock, deadStock, topMovers, recentMovements] = await Promise.all([

      pool.query(`
        SELECT
          COUNT(*)                                            AS total_products,
          COUNT(*) FILTER (WHERE status='active')            AS active_products,
          COALESCE(SUM(COALESCE(stock,0)), 0)                AS total_units,
          COALESCE(SUM(COALESCE(stock,0) * COALESCE(cost_price, price, unit_price, 0)), 0) AS stock_value,
          COUNT(*) FILTER (WHERE COALESCE(stock,0) = 0)      AS out_of_stock_count,
          COUNT(*) FILTER (WHERE COALESCE(stock,0) > 0 AND COALESCE(stock,0) <= $1) AS low_stock_count
        FROM products
      `, [low_stock_threshold]),

      pool.query(`
        SELECT
          c.name AS category,
          COUNT(p.id)                          AS products,
          COALESCE(SUM(p.stock), 0)            AS total_units,
          COALESCE(SUM(p.stock * COALESCE(p.cost_price, p.price, p.unit_price, 0)), 0) AS stock_value
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.status = 'active'
        GROUP BY c.name
        ORDER BY stock_value DESC
      `),

      pool.query(`
        SELECT id, name, sku, stock, COALESCE(reorder_level, $1) AS reorder_level,
               COALESCE(cost_price, price, unit_price, 0) AS unit_cost,
               stock * COALESCE(cost_price, price, unit_price, 0) AS stock_value,
               image_url
        FROM products
        WHERE stock > 0 AND stock <= $1 AND status='active'
        ORDER BY stock ASC LIMIT 30
      `, [low_stock_threshold]),

      pool.query(`
        SELECT id, name, sku, COALESCE(cost_price, price, unit_price, 0) AS unit_cost, image_url
        FROM products WHERE COALESCE(stock,0) = 0 AND status='active'
        ORDER BY name
      `),

      // Dead stock: active products with no sales in the period
      pool.query(`
        SELECT
          p.id, p.name, p.sku, p.stock,
          COALESCE(p.cost_price, p.price, p.unit_price, 0) AS unit_cost,
          p.stock * COALESCE(p.cost_price, p.price, p.unit_price, 0) AS dead_value,
          p.updated_at AS last_updated
        FROM products p
        WHERE p.status='active' AND p.stock > 0
          AND p.id NOT IN (
            SELECT DISTINCT oi.product_id FROM order_items oi
            JOIN orders o ON oi.order_id = o.id
            WHERE o.created_at::DATE BETWEEN $1 AND $2
              AND o.status NOT IN ('cancelled','failed')
          )
        ORDER BY dead_value DESC LIMIT 20
      `, [from, to]),

      // Top sellers by units moved
      pool.query(`
        SELECT
          p.id, p.name, p.sku, p.stock, p.image_url,
          SUM(oi.quantity)               AS units_sold,
          SUM(oi.price * oi.quantity)    AS revenue
        FROM order_items oi
        JOIN orders   o ON oi.order_id   = o.id
        JOIN products p ON oi.product_id = p.id
        WHERE o.created_at::DATE BETWEEN $1 AND $2
          AND o.status NOT IN ('cancelled','failed')
        GROUP BY p.id, p.name, p.sku, p.stock, p.image_url
        ORDER BY units_sold DESC LIMIT 10
      `, [from, to]),

      pool.query(`
        SELECT
          sm.type, sm.reference, sm.reason,
          sm.quantity, sm.created_at,
          p.name AS product_name, p.sku
        FROM stock_movements sm
        JOIN products p ON sm.product_id = p.id
        WHERE sm.created_at::DATE BETWEEN $1 AND $2
        ORDER BY sm.created_at DESC LIMIT 50
      `, [from, to]),
    ]);

    res.json({
      period: { from, to },
      summary: {
        ...summary.rows[0],
        low_stock_threshold,
      },
      stock_by_category: stockByCategory.rows,
      low_stock: lowStock.rows,
      out_of_stock: outOfStock.rows,
      dead_stock: deadStock.rows,
      top_movers: topMovers.rows,
      recent_movements: recentMovements.rows,
    });
  } catch (err) {
    console.error("GET /admin/reports/inventory:", err.message);
    res.status(500).json({ message: err.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// CUSTOMER REPORT  ──  GET /api/admin/reports/customers
// ════════════════════════════════════════════════════════════════════════════
router.get("/customers", async (req, res) => {
  try {
    const { from, to } = defaultDates(req.query);
    const group_by = req.query.group_by || "month";
    const trunc    = truncFn(group_by);

    const [kpis, timeline, topSpenders, newVsReturning, byLocation, cohort] = await Promise.all([

      pool.query(`
        SELECT
          COUNT(DISTINCT u.id)                                    AS total_customers,
          COUNT(DISTINCT u.id) FILTER (WHERE u.created_at::DATE BETWEEN $1 AND $2) AS new_customers,
          COUNT(DISTINCT o.user_id)                               AS active_buyers,
          COUNT(DISTINCT o.user_id) FILTER (
            WHERE (SELECT COUNT(*) FROM orders WHERE user_id=o.user_id AND status NOT IN ('cancelled','failed')) > 1
          )                                                       AS repeat_buyers,
          COALESCE(AVG(sub.total_spend), 0)                       AS avg_customer_ltv,
          COALESCE(AVG(sub.order_count)::DECIMAL, 0)              AS avg_orders_per_customer
        FROM users u
        LEFT JOIN orders o ON o.user_id = u.id
          AND o.created_at::DATE BETWEEN $1 AND $2
          AND o.status NOT IN ('cancelled','failed')
        LEFT JOIN (
          SELECT user_id,
                 COUNT(*) AS order_count,
                 SUM(total) AS total_spend
          FROM orders WHERE status NOT IN ('cancelled','failed') GROUP BY user_id
        ) sub ON sub.user_id = u.id
        WHERE u.role = 'customer' OR u.role IS NULL
      `, [from, to]),

      // Customer sign-ups over time
      pool.query(`
        SELECT
          DATE_TRUNC($3, created_at) AS period,
          COUNT(*) AS new_signups
        FROM users
        WHERE created_at::DATE BETWEEN $1 AND $2
          AND (role='customer' OR role IS NULL)
        GROUP BY period ORDER BY period
      `, [from, to, trunc]),

      // Top 10 spenders
      pool.query(`
        SELECT
          u.id, u.name, u.email, u.phone, u.created_at AS joined,
          COUNT(DISTINCT o.id)       AS order_count,
          COALESCE(SUM(o.total), 0)  AS total_spend,
          MAX(o.created_at)          AS last_order
        FROM orders o
        JOIN users u ON o.user_id = u.id
        WHERE o.created_at::DATE BETWEEN $1 AND $2
          AND o.status NOT IN ('cancelled','failed')
        GROUP BY u.id, u.name, u.email, u.phone, u.created_at
        ORDER BY total_spend DESC LIMIT 10
      `, [from, to]),

      // New vs returning buyers
      pool.query(`
        SELECT
          CASE
            WHEN (SELECT COUNT(*) FROM orders o2 WHERE o2.user_id=o.user_id AND o2.created_at < $1) > 0
            THEN 'returning'
            ELSE 'new'
          END AS customer_type,
          COUNT(DISTINCT o.user_id) AS buyers,
          COALESCE(SUM(o.total), 0) AS revenue,
          COUNT(DISTINCT o.id)      AS orders
        FROM orders o
        WHERE o.created_at::DATE BETWEEN $1 AND $2
          AND o.status NOT IN ('cancelled','failed')
        GROUP BY customer_type
      `, [from, to]),

      // By delivery location / city
      pool.query(`
        SELECT
          COALESCE(o.delivery_city, 'Unknown') AS city,
          COUNT(DISTINCT o.id) AS orders,
          COUNT(DISTINCT o.user_id) AS customers,
          COALESCE(SUM(o.total), 0) AS revenue
        FROM orders o
        WHERE o.created_at::DATE BETWEEN $1 AND $2
          AND o.status NOT IN ('cancelled','failed')
        GROUP BY o.delivery_city
        ORDER BY orders DESC LIMIT 15
      `, [from, to]),

      // Monthly cohort size (month of first purchase)
      pool.query(`
        SELECT
          TO_CHAR(DATE_TRUNC('month', first_order), 'Mon YYYY') AS cohort_month,
          COUNT(*) AS customers
        FROM (
          SELECT user_id, MIN(created_at) AS first_order
          FROM orders WHERE status NOT IN ('cancelled','failed')
          GROUP BY user_id
        ) first_purchases
        WHERE first_order::DATE BETWEEN $1 AND $2
        GROUP BY DATE_TRUNC('month', first_order)
        ORDER BY DATE_TRUNC('month', first_order)
      `, [from, to]),
    ]);

    const krow = kpis.rows[0];
    const repeatRate = parseInt(krow.active_buyers || 0) > 0
      ? +((parseInt(krow.repeat_buyers || 0) / parseInt(krow.active_buyers)) * 100).toFixed(1)
      : 0;

    res.json({
      period: { from, to, group_by },
      kpis: { ...krow, repeat_rate: repeatRate },
      timeline: timeline.rows,
      top_spenders: topSpenders.rows,
      new_vs_returning: newVsReturning.rows,
      by_location: byLocation.rows,
      cohort: cohort.rows,
    });
  } catch (err) {
    console.error("GET /admin/reports/customers:", err.message);
    res.status(500).json({ message: err.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// EXPENSE REPORT  ──  GET /api/admin/reports/expenses
// ════════════════════════════════════════════════════════════════════════════
router.get("/expenses", async (req, res) => {
  try {
    const { from, to } = defaultDates(req.query);
    const group_by = req.query.group_by || "month";
    const trunc    = truncFn(group_by);

    const [kpis, byCategory, timeline, topVendors, byStatus, pendingList] = await Promise.all([

      pool.query(`
        SELECT
          COALESCE(SUM(amount) FILTER (WHERE status IN ('approved','paid')), 0) AS total_paid,
          COALESCE(SUM(amount) FILTER (WHERE status='pending'), 0)             AS total_pending,
          COALESCE(SUM(amount) FILTER (WHERE status='rejected'), 0)            AS total_rejected,
          COUNT(*) FILTER (WHERE status='pending')                             AS pending_count,
          COUNT(*) FILTER (WHERE status IN ('approved','paid'))                AS paid_count,
          COALESCE(AVG(amount) FILTER (WHERE status IN ('approved','paid')), 0) AS avg_expense
        FROM expenses
        WHERE date BETWEEN $1 AND $2
      `, [from, to]),

      pool.query(`
        SELECT
          category,
          COALESCE(SUM(amount) FILTER (WHERE status IN ('approved','paid')), 0) AS paid,
          COALESCE(SUM(amount) FILTER (WHERE status='pending'), 0)             AS pending,
          COUNT(*) AS count
        FROM expenses
        WHERE date BETWEEN $1 AND $2
        GROUP BY category ORDER BY paid DESC
      `, [from, to]),

      pool.query(`
        SELECT
          DATE_TRUNC($3, date) AS period,
          COALESCE(SUM(amount) FILTER (WHERE status IN ('approved','paid')), 0) AS paid,
          COALESCE(SUM(amount) FILTER (WHERE status='pending'), 0)             AS pending
        FROM expenses
        WHERE date BETWEEN $1 AND $2
        GROUP BY period ORDER BY period
      `, [from, to, trunc]),

      pool.query(`
        SELECT
          COALESCE(supplier_name, 'No Vendor') AS vendor,
          COUNT(*) AS count,
          COALESCE(SUM(amount), 0) AS total
        FROM expenses
        WHERE date BETWEEN $1 AND $2 AND status IN ('approved','paid') AND supplier_name IS NOT NULL
        GROUP BY supplier_name
        ORDER BY total DESC LIMIT 10
      `, [from, to]),

      pool.query(`
        SELECT status, COUNT(*) AS count, COALESCE(SUM(amount),0) AS value
        FROM expenses WHERE date BETWEEN $1 AND $2
        GROUP BY status ORDER BY value DESC
      `, [from, to]),

      pool.query(`
        SELECT id, reference, description, supplier_name, category, amount, due_date
        FROM expenses WHERE status='pending' AND date BETWEEN $1 AND $2
        ORDER BY due_date ASC NULLS LAST LIMIT 20
      `, [from, to]),
    ]);

    res.json({
      period: { from, to, group_by },
      kpis: kpis.rows[0],
      by_category: byCategory.rows,
      timeline: timeline.rows,
      top_vendors: topVendors.rows,
      by_status: byStatus.rows,
      pending_list: pendingList.rows,
    });
  } catch (err) {
    console.error("GET /admin/reports/expenses:", err.message);
    res.status(500).json({ message: err.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// PURCHASE REPORT  ──  GET /api/admin/reports/purchases
// ════════════════════════════════════════════════════════════════════════════
router.get("/purchases", async (req, res) => {
  try {
    const { from, to } = defaultDates(req.query);
    const group_by = req.query.group_by || "month";
    const trunc    = truncFn(group_by);

    const [kpis, byStatus, timeline, topSuppliers, topItems, returns] = await Promise.all([

      pool.query(`
        SELECT
          COUNT(*) AS total_orders,
          COUNT(*) FILTER (WHERE status NOT IN ('cancelled','draft')) AS active_orders,
          COALESCE(SUM(total) FILTER (WHERE status NOT IN ('cancelled','draft')), 0) AS total_value,
          COALESCE(SUM(paid_amount) FILTER (WHERE status NOT IN ('cancelled','draft')), 0) AS total_paid,
          COALESCE(SUM(total - paid_amount) FILTER (WHERE payment_status != 'paid' AND status NOT IN ('cancelled','draft')), 0) AS outstanding,
          COUNT(*) FILTER (WHERE payment_status = 'unpaid' AND status NOT IN ('cancelled','draft')) AS unpaid_count,
          COUNT(*) FILTER (WHERE status = 'received') AS fully_received
        FROM purchase_orders
        WHERE created_at::DATE BETWEEN $1 AND $2
      `, [from, to]),

      pool.query(`
        SELECT status, COUNT(*) AS count, COALESCE(SUM(total),0) AS value
        FROM purchase_orders WHERE created_at::DATE BETWEEN $1 AND $2
        GROUP BY status ORDER BY count DESC
      `, [from, to]),

      pool.query(`
        SELECT
          DATE_TRUNC($3, created_at) AS period,
          COUNT(*) AS orders,
          COALESCE(SUM(total) FILTER (WHERE status NOT IN ('cancelled','draft')), 0) AS value,
          COALESCE(SUM(paid_amount), 0) AS paid
        FROM purchase_orders
        WHERE created_at::DATE BETWEEN $1 AND $2
        GROUP BY period ORDER BY period
      `, [from, to, trunc]),

      pool.query(`
        SELECT
          s.id, s.name AS supplier_name, s.supplier_code,
          COUNT(po.id)              AS orders,
          COALESCE(SUM(po.total), 0)       AS total_purchased,
          COALESCE(SUM(po.paid_amount), 0) AS total_paid,
          COALESCE(SUM(po.total - po.paid_amount), 0) AS outstanding
        FROM purchase_orders po
        JOIN suppliers s ON po.supplier_id = s.id
        WHERE po.created_at::DATE BETWEEN $1 AND $2
          AND po.status NOT IN ('cancelled','draft')
        GROUP BY s.id, s.name, s.supplier_code
        ORDER BY total_purchased DESC LIMIT 10
      `, [from, to]),

      pool.query(`
        SELECT
          p.name AS product_name, p.sku,
          SUM(poi.quantity_ordered)  AS units_ordered,
          SUM(poi.quantity_received) AS units_received,
          SUM(poi.subtotal)          AS total_cost
        FROM purchase_order_items poi
        JOIN purchase_orders po ON poi.purchase_order_id = po.id
        JOIN products p ON poi.product_id = p.id
        WHERE po.created_at::DATE BETWEEN $1 AND $2
          AND po.status NOT IN ('cancelled','draft')
        GROUP BY p.name, p.sku
        ORDER BY total_cost DESC LIMIT 10
      `, [from, to]),

      pool.query(`
        SELECT
          COUNT(*) AS total_returns,
          COALESCE(SUM(total_value), 0) AS total_return_value,
          COUNT(*) FILTER (WHERE status='refunded') AS refunded_count
        FROM purchase_returns WHERE created_at::DATE BETWEEN $1 AND $2
      `, [from, to]),
    ]);

    res.json({
      period: { from, to, group_by },
      kpis: kpis.rows[0],
      by_status: byStatus.rows,
      timeline: timeline.rows,
      top_suppliers: topSuppliers.rows,
      top_items: topItems.rows,
      returns_summary: returns.rows[0],
    });
  } catch (err) {
    console.error("GET /admin/reports/purchases:", err.message);
    res.status(500).json({ message: err.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// SUPPLIER REPORT  ──  GET /api/admin/reports/suppliers
// ════════════════════════════════════════════════════════════════════════════
router.get("/suppliers", async (req, res) => {
  try {
    const { from, to } = defaultDates(req.query);

    const [kpis, topSuppliers, byCategory, paymentPerformance, ageing] = await Promise.all([

      pool.query(`
        SELECT
          COUNT(*)                                     AS total_suppliers,
          COUNT(*) FILTER (WHERE status='active')      AS active_suppliers,
          COALESCE(SUM(balance), 0)                    AS total_outstanding,
          COALESCE(SUM(total_purchases), 0)            AS total_purchased,
          COALESCE(SUM(total_paid), 0)                 AS total_paid
        FROM suppliers
      `),

      pool.query(`
        SELECT
          s.id, s.name, s.supplier_code, s.category, s.phone,
          s.balance, s.total_purchases, s.total_paid, s.payment_terms,
          COUNT(po.id) FILTER (WHERE po.created_at::DATE BETWEEN $1 AND $2) AS orders_in_period,
          COALESCE(SUM(po.total) FILTER (WHERE po.created_at::DATE BETWEEN $1 AND $2 AND po.status NOT IN ('cancelled','draft')), 0) AS spend_in_period
        FROM suppliers s
        LEFT JOIN purchase_orders po ON po.supplier_id = s.id
        WHERE s.status = 'active'
        GROUP BY s.id, s.name, s.supplier_code, s.category, s.phone, s.balance, s.total_purchases, s.total_paid, s.payment_terms
        ORDER BY s.total_purchases DESC LIMIT 15
      `, [from, to]),

      pool.query(`
        SELECT
          category,
          COUNT(*) AS count,
          COALESCE(SUM(balance), 0)         AS outstanding,
          COALESCE(SUM(total_purchases), 0) AS purchased
        FROM suppliers WHERE status='active'
        GROUP BY category ORDER BY purchased DESC
      `),

      // Payment performance: avg days to pay per supplier
      pool.query(`
        SELECT
          s.name AS supplier_name,
          COUNT(sp.id) AS payment_count,
          COALESCE(SUM(sp.amount), 0) AS total_paid,
          COALESCE(AVG(EXTRACT(DAY FROM sp.payment_date::TIMESTAMP - po.created_at)), 0) AS avg_days_to_pay,
          s.payment_terms
        FROM supplier_payments sp
        JOIN suppliers s ON sp.supplier_id = s.id
        LEFT JOIN purchase_orders po ON sp.purchase_order_id = po.id
        WHERE sp.payment_date BETWEEN $1 AND $2
        GROUP BY s.name, s.payment_terms
        ORDER BY total_paid DESC LIMIT 10
      `, [from, to]),

      // Ageing of total outstanding balance across all suppliers
      pool.query(`
        SELECT
          COALESCE(SUM(po.total - po.paid_amount) FILTER (WHERE EXTRACT(DAY FROM NOW()-po.created_at) <= 30), 0)        AS bucket_0_30,
          COALESCE(SUM(po.total - po.paid_amount) FILTER (WHERE EXTRACT(DAY FROM NOW()-po.created_at) BETWEEN 31 AND 60), 0) AS bucket_31_60,
          COALESCE(SUM(po.total - po.paid_amount) FILTER (WHERE EXTRACT(DAY FROM NOW()-po.created_at) BETWEEN 61 AND 90), 0) AS bucket_61_90,
          COALESCE(SUM(po.total - po.paid_amount) FILTER (WHERE EXTRACT(DAY FROM NOW()-po.created_at) > 90), 0)          AS bucket_over_90
        FROM purchase_orders po
        WHERE po.payment_status != 'paid' AND po.status NOT IN ('cancelled','draft')
      `),
    ]);

    res.json({
      period: { from, to },
      kpis: kpis.rows[0],
      top_suppliers: topSuppliers.rows,
      by_category: byCategory.rows,
      payment_performance: paymentPerformance.rows,
      ageing: ageing.rows[0],
    });
  } catch (err) {
    console.error("GET /admin/reports/suppliers:", err.message);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
