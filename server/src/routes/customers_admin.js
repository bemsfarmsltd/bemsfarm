// server/src/routes/customers_admin.js
// Mounted at /api/admin/customers

const express = require("express");
const router = express.Router();
const pool = require("../db/pool");
const { protect, requireRole } = require("../middleware/authMiddleware");

router.use(protect);

// ── GET /api/admin/customers ──────────────────────────────────────
router.get("/", async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search = "",
      tier = "",
      status = "",
    } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const params = [];
    const where = [];

    if (search) {
      params.push(`%${search}%`);
      where.push(
        `(c.name ILIKE $${params.length} OR c.phone ILIKE $${params.length} OR c.email ILIKE $${params.length} OR c.customer_code ILIKE $${params.length} OR c.area ILIKE $${params.length})`,
      );
    }
    if (status) {
      params.push(status);
      where.push(`c.status = $${params.length}`);
    }
    if (tier) {
      params.push(tier);
      where.push(`lt.name = $${params.length}`);
    }

    const whereClause = where.length ? "WHERE " + where.join(" AND ") : "";

    const countRes = await pool.query(
      `SELECT COUNT(*) FROM customers c
       LEFT JOIN customer_loyalty cl ON c.id = cl.customer_id
       LEFT JOIN loyalty_tiers lt ON cl.tier_id = lt.id
       ${whereClause}`,
      params,
    );

    params.push(parseInt(limit));
    params.push(offset);

    const rows = await pool.query(
      `
      SELECT
        c.id, c.customer_code, c.name, c.phone, c.email,
        c.area AS zone, c.status, c.total_orders, c.total_spent,
        c.joined_at, c.last_order_at,
        COALESCE(cl.points_balance, 0) AS points,
        COALESCE(lt.name, 'Bronze') AS tier,
        COALESCE(cw.balance, 0) AS wallet_balance
      FROM customers c
      LEFT JOIN customer_loyalty cl ON c.id = cl.customer_id
      LEFT JOIN loyalty_tiers lt ON cl.tier_id = lt.id
      LEFT JOIN customer_wallets cw ON c.id = cw.customer_id
      ${whereClause}
      ORDER BY c.total_spent DESC NULLS LAST
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `,
      params,
    );

    // KPI stats
    const stats = await pool.query(`
      SELECT
        COUNT(*)                                          AS total,
        COUNT(*) FILTER (WHERE status = 'active')        AS active,
        COUNT(*) FILTER (WHERE DATE_TRUNC('month', joined_at) = DATE_TRUNC('month', NOW())) AS new_this_month,
        COALESCE(SUM(total_spent), 0)                    AS total_revenue,
        COALESCE(AVG(total_spent), 0)                    AS avg_spent
      FROM customers
    `);

    const platinum = await pool.query(`
      SELECT COUNT(*) FROM customer_loyalty cl
      JOIN loyalty_tiers lt ON cl.tier_id = lt.id
      WHERE lt.name = 'Platinum'
    `);

    res.json({
      customers: rows.rows,
      total: parseInt(countRes.rows[0].count),
      page: parseInt(page),
      pages: Math.ceil(parseInt(countRes.rows[0].count) / parseInt(limit)),
      stats: {
        ...stats.rows[0],
        platinum: parseInt(platinum.rows[0].count),
      },
    });
  } catch (err) {
    console.error("GET /admin/customers:", err.message);
    res.status(500).json({ message: err.message });
  }
});

// ── GET /api/admin/customers/report ──────────────────────────────
// NOTE: must be declared BEFORE /:id to avoid the wildcard swallowing it.
router.get(
  "/report",
  requireRole("superadmin", "manager", "accountant"),
  async (req, res) => {
    try {
      const {
        search   = "",
        from,
        to,
        sort_by  = "total_spending",
        page     = 1,
        limit    = 20,
      } = req.query;

      const params = [];
      const searchCond = search
        ? (() => {
            params.push(`%${search}%`);
            return `AND (u.name ILIKE $${params.length} OR u.email ILIKE $${params.length} OR u.phone ILIKE $${params.length})`;
          })()
        : "";

      const dateCond = (() => {
        let c = "";
        if (from) { params.push(from); c += ` AND u.created_at >= $${params.length}`; }
        if (to)   { params.push(to);   c += ` AND u.created_at <= $${params.length}::date + INTERVAL '1 day'`; }
        return c;
      })();

      const offset = (parseInt(page) - 1) * parseInt(limit);

      const sortMap = {
        total_spending:  "total_spending DESC",
        total_orders:    "total_orders DESC",
        latest_purchase: "last_purchase DESC NULLS LAST",
        newest:          "u.created_at DESC",
        oldest:          "u.created_at ASC",
      };
      const orderBy = sortMap[sort_by] || "total_spending DESC";

      const [statsRow, customersRes, totalRow, segmentsRow, growthRow] =
        await Promise.all([
          // Overall stats
          pool.query(`
            SELECT
              COUNT(DISTINCT u.id)                                                       AS total,
              COUNT(DISTINCT CASE WHEN DATE_TRUNC('month', u.created_at) = DATE_TRUNC('month', NOW()) THEN u.id END) AS new_this_month,
              COUNT(DISTINCT CASE WHEN o_active.last_order > NOW() - INTERVAL '30 days' THEN u.id END) AS active,
              COALESCE(AVG(o.total), 0)                                                  AS avg_order_value
            FROM users u
            LEFT JOIN orders o ON o.user_id = u.id AND o.status NOT IN ('cancelled', 'pending')
            LEFT JOIN (
              SELECT user_id, MAX(created_at) AS last_order FROM orders
              WHERE status NOT IN ('cancelled', 'pending')
              GROUP BY user_id
            ) o_active ON o_active.user_id = u.id
            WHERE u.role = 'customer'
          `),

          // Customer list
          pool.query(
            `SELECT
               u.id, u.name, u.email, u.phone, u.created_at,
               COUNT(DISTINCT o.id)          AS total_orders,
               COALESCE(SUM(o.total), 0)     AS total_spending,
               COALESCE(AVG(o.total), 0)     AS avg_order_value,
               MAX(o.created_at)             AS last_purchase
             FROM users u
             LEFT JOIN orders o ON o.user_id = u.id AND o.status NOT IN ('cancelled', 'pending')
             WHERE u.role = 'customer' ${searchCond} ${dateCond}
             GROUP BY u.id
             ORDER BY ${orderBy}
             LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
            [...params, parseInt(limit), offset],
          ),

          // Total count for pagination
          pool.query(
            `SELECT COUNT(*) FROM users u
             WHERE u.role = 'customer' ${searchCond} ${dateCond}`,
            params,
          ),

          // Segments
          pool.query(`
            SELECT
              COUNT(CASE WHEN order_count > 1 THEN 1 END)                                            AS returning_customers,
              COUNT(CASE WHEN order_count = 1 THEN 1 END)                                            AS one_time_customers,
              COUNT(CASE WHEN last_purchase < NOW() - INTERVAL '60 days' OR last_purchase IS NULL THEN 1 END) AS at_risk
            FROM (
              SELECT
                u.id,
                COUNT(o.id)       AS order_count,
                MAX(o.created_at) AS last_purchase
              FROM users u
              LEFT JOIN orders o ON o.user_id = u.id AND o.status NOT IN ('cancelled')
              WHERE u.role = 'customer'
              GROUP BY u.id
            ) t
          `),

          // Growth
          pool.query(`
            SELECT
              COUNT(CASE WHEN DATE_TRUNC('month', created_at) = DATE_TRUNC('month', NOW())                        THEN 1 END) AS this_month,
              COUNT(CASE WHEN DATE_TRUNC('month', created_at) = DATE_TRUNC('month', NOW() - INTERVAL '1 month')   THEN 1 END) AS last_month
            FROM users WHERE role = 'customer'
          `),
        ]);

      const s   = statsRow.rows[0];
      const seg = segmentsRow.rows[0];
      const g   = growthRow.rows[0];

      res.json({
        stats: {
          total:           parseInt(s.total)           || 0,
          new_this_month:  parseInt(s.new_this_month)  || 0,
          active:          parseInt(s.active)           || 0,
          avg_order_value: parseFloat(s.avg_order_value) || 0,
        },
        segments: {
          returning: parseInt(seg.returning_customers) || 0,
          one_time:  parseInt(seg.one_time_customers)  || 0,
          vip:       Math.ceil((parseInt(s.total) || 0) * 0.1),
          at_risk:   parseInt(seg.at_risk)             || 0,
        },
        growth: {
          this_month: parseInt(g.this_month) || 0,
          last_month: parseInt(g.last_month) || 0,
        },
        customers: customersRes.rows,
        total:  parseInt(totalRow.rows[0].count) || 0,
        page:   parseInt(page),
        pages:  Math.ceil((parseInt(totalRow.rows[0].count) || 0) / parseInt(limit)),
      });
    } catch (err) {
      console.error("GET /admin/customers/report:", err.message);
      res.status(500).json({ message: err.message });
    }
  },
);

// ── GET /api/admin/customers/:id ──────────────────────────────────
router.get("/:id", async (req, res) => {
  try {
    const isCode = req.params.id.startsWith("CUS-");
    const whereCol = isCode ? "c.customer_code" : "c.id";

    const result = await pool.query(
      `
      SELECT
        c.*,
        COALESCE(cl.points_balance, 0)  AS points,
        COALESCE(cl.lifetime_points, 0) AS lifetime_points,
        COALESCE(lt.name, 'Bronze')     AS tier,
        lt.id AS tier_id,
        COALESCE(cw.balance, 0)         AS wallet_balance,
        COALESCE(cw.total_topped_up, 0) AS wallet_funded,
        COALESCE(cw.total_spent, 0)     AS wallet_spent
      FROM customers c
      LEFT JOIN customer_loyalty cl ON c.id = cl.customer_id
      LEFT JOIN loyalty_tiers lt ON cl.tier_id = lt.id
      LEFT JOIN customer_wallets cw ON c.id = cw.customer_id
      WHERE ${whereCol} = $1
    `,
      [req.params.id],
    );

    if (!result.rows.length)
      return res.status(404).json({ message: "Customer not found" });

    const customer = result.rows[0];

    // Orders
    const orders = await pool.query(
      `
      SELECT id, total, status, created_at,
        (SELECT STRING_AGG(COALESCE(oi.product_name, p.name) || ' ×' || oi.quantity, ', ')
         FROM order_items oi LEFT JOIN products p ON oi.product_id = p.id
         WHERE oi.order_id = o.id) AS items_summary
      FROM orders o
      WHERE customer_id = $1
      ORDER BY created_at DESC
      LIMIT 10
    `,
      [customer.id],
    );

    // Loyalty transactions
    const loyalty = await pool.query(
      `
      SELECT type, description, points, created_at
      FROM loyalty_transactions
      WHERE customer_id = $1
      ORDER BY created_at DESC
      LIMIT 20
    `,
      [customer.id],
    );

    // Addresses
    const addresses = await pool.query(
      `
      SELECT * FROM customer_addresses WHERE customer_id = $1 ORDER BY is_default DESC
    `,
      [customer.id],
    );

    // Activity log
    const activity = await pool.query(
      `
      SELECT * FROM customer_activity_log WHERE customer_id = $1
      ORDER BY created_at DESC LIMIT 20
    `,
      [customer.id],
    );

    res.json({
      ...customer,
      orders: orders.rows,
      loyalty: loyalty.rows,
      addresses: addresses.rows,
      activity: activity.rows,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── POST /api/admin/customers ─────────────────────────────────────
router.post(
  "/",
  requireRole("superadmin", "manager", "admin", "cashier"),
  async (req, res) => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const {
        first_name,
        last_name,
        name,
        phone,
        email,
        zone,
        area,
        address,
        landmark,
        tier = "Bronze",
        status = "active",
        referral,
        notes,
        sms_alerts = true,
      } = req.body;

      const fullName = name || `${first_name || ""} ${last_name || ""}`.trim();
      if (!fullName)
        return res.status(400).json({ message: "Customer name required" });
      if (!phone)
        return res.status(400).json({ message: "Phone number required" });

      // Check duplicate phone
      const exists = await client.query(
        "SELECT id FROM customers WHERE phone=$1",
        [phone],
      );
      if (exists.rows.length)
        return res
          .status(400)
          .json({
            message: "A customer with this phone number already exists",
          });

      // Generate customer code
      const countRow = await client.query("SELECT COUNT(*) FROM customers");
      const code = `CUS-${String(parseInt(countRow.rows[0].count) + 1).padStart(3, "0")}`;

      const result = await client.query(
        `
      INSERT INTO customers
        (customer_code, name, phone, email, area, status, notes, joined_at, created_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,NOW(),NOW())
      RETURNING *
    `,
        [
          code,
          fullName,
          phone,
          email || null,
          zone || area || null,
          status,
          notes || null,
        ],
      );

      const customer = result.rows[0];

      // Create wallet
      await client.query(
        "INSERT INTO customer_wallets (customer_id, balance, created_at) VALUES ($1, 0, NOW())",
        [customer.id],
      );

      // Set loyalty tier
      const tierRow = await client.query(
        "SELECT id FROM loyalty_tiers WHERE name=$1",
        [tier],
      );
      if (tierRow.rows.length) {
        await client.query(
          `
        INSERT INTO customer_loyalty (customer_id, tier_id, points_balance, lifetime_points, updated_at)
        VALUES ($1,$2,0,0,NOW())
      `,
          [customer.id, tierRow.rows[0].id],
        );
      }

      // Save address if provided
      if (address) {
        await client.query(
          `
        INSERT INTO customer_addresses (customer_id, label, full_address, area, is_default, created_at)
        VALUES ($1,'Home',$2,$3,true,NOW())
      `,
          [customer.id, address, zone || area || null],
        );
      }

      await client.query("COMMIT");
      res
        .status(201)
        .json({ customer, message: "Customer registered successfully" });
    } catch (err) {
      await client.query("ROLLBACK");
      res.status(500).json({ message: err.message });
    } finally {
      client.release();
    }
  },
);

// ── PATCH /api/admin/customers/:id/status ────────────────────────
router.patch(
  "/:id/status",
  requireRole("superadmin", "manager", "admin"),
  async (req, res) => {
    try {
      const { status } = req.body;
      await pool.query(
        "UPDATE customers SET status=$1 WHERE id=$2 OR customer_code=$2",
        [status, req.params.id],
      );
      res.json({ message: "Status updated" });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },
);

// ── DELETE /api/admin/customers/:id ──────────────────────────────
router.delete(
  "/:id",
  requireRole("superadmin", "manager"),
  async (req, res) => {
    try {
      // Soft delete — anonymise PII
      await pool.query(
        `
      UPDATE customers SET
        name   = 'Deleted Customer',
        phone  = 'deleted_' || id,
        email  = NULL,
        status = 'inactive'
      WHERE id=$1 OR customer_code=$1
    `,
        [req.params.id],
      );
      res.json({ message: "Customer removed" });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },
);

// ── POST /api/admin/customers/:id/loyalty ────────────────────────
// Manually award or deduct points
router.post(
  "/:id/loyalty",
  requireRole("superadmin", "manager", "admin"),
  async (req, res) => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const { points, type = "bonus", description } = req.body;
      if (!points) return res.status(400).json({ message: "points required" });

      const custRow = await client.query(
        "SELECT id FROM customers WHERE id=$1 OR customer_code=$1",
        [req.params.id],
      );
      if (!custRow.rows.length)
        return res.status(404).json({ message: "Customer not found" });
      const customerId = custRow.rows[0].id;

      await client.query(
        `
      INSERT INTO loyalty_transactions (customer_id, type, points, description, created_by, created_at)
      VALUES ($1,$2,$3,$4,$5,NOW())
    `,
        [
          customerId,
          type,
          parseInt(points),
          description || "Manual adjustment",
          req.user.id,
        ],
      );

      await client.query(
        `
      UPDATE customer_loyalty SET
        points_balance  = points_balance + $1,
        lifetime_points = CASE WHEN $1 > 0 THEN lifetime_points + $1 ELSE lifetime_points END,
        updated_at      = NOW()
      WHERE customer_id = $2
    `,
        [parseInt(points), customerId],
      );

      await client.query("COMMIT");
      res.json({ message: "Points updated" });
    } catch (err) {
      await client.query("ROLLBACK");
      res.status(500).json({ message: err.message });
    } finally {
      client.release();
    }
  },
);

module.exports = router;
