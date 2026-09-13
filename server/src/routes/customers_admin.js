// server/src/routes/customers_admin.js
// Mounted at /api/admin/customers

const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const pool = require("../db/pool");
const { protect, requireRole } = require("../middleware/authMiddleware");
const { CUSTOMER_ROLE } = require("../config/roles");
const validate = require("../middleware/validate");
const customerAdminSchemas = require("../schemas/customerAdminSchemas");
const { clampLimit } = require("../utils/pagination");

router.use(protect);

// ── GET /api/admin/customers ──────────────────────────────────────
router.get("/", requireRole("superadmin", "manager", "admin", "accountant", "cashier"), async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      search = "",
      tier = "",
      status = "",
    } = req.query;
    const cappedLimit = clampLimit(limit, 20);
    const offset = (parseInt(page) - 1) * cappedLimit;
    const params = [];
    const where = [
      "c.role = 'user'",
      "COALESCE(c.status, '') != 'deleted'",
      "COALESCE(c.name, '') != 'Deleted Customer'",
    ];

    if (search) {
      params.push(`%${search}%`);
      where.push(
        `(c.name ILIKE $${params.length} OR c.phone ILIKE $${params.length} OR c.email ILIKE $${params.length} OR c.customer_code ILIKE $${params.length} OR c.address ILIKE $${params.length})`,
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
      `SELECT COUNT(*) FROM users c
       LEFT JOIN customer_loyalty cl ON c.id = cl.customer_id
       LEFT JOIN loyalty_tiers lt ON cl.tier_id = lt.id
       ${whereClause}`,
      params,
    );

    params.push(cappedLimit);
    params.push(offset);

    // Auto-backfill missing customer_codes in background
    pool.query("UPDATE users SET customer_code = 'CUS-' || LPAD(id::text, 4, '0') WHERE customer_code IS NULL AND role = 'user'").catch(() => {});

    const rows = await pool.query(
      `
      SELECT
        c.id,
        COALESCE(c.customer_code, 'CUS-' || LPAD(c.id::text, 4, '0')) AS customer_code,
        c.name, c.phone, c.email,
        c.address AS zone, c.status, c.total_orders, c.total_spent,
        c.joined_at, c.last_order_at, c.last_login,
        COALESCE(cl.points_balance, 0) AS points,
        COALESCE(cl.lifetime_points, 0) AS lifetime_points,
        cl.last_earned_at,
        COALESCE(lt.name, 'Bronze') AS tier,
        COALESCE(cw.balance, 0) AS wallet_balance,
        COALESCE(cw.total_topped_up, 0) AS wallet_total_topped_up
      FROM users c
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
      FROM users
      WHERE role = 'user' AND COALESCE(status, '') != 'deleted' AND COALESCE(name, '') != 'Deleted Customer'
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
      pages: Math.ceil(parseInt(countRes.rows[0].count) / cappedLimit),
      stats: {
        ...stats.rows[0],
        platinum: parseInt(platinum.rows[0].count),
      },
    });
  } catch (err) {
    console.error("GET /admin/customers:", err.message);
    next(err);
  }
});

// ── GET /api/admin/customers/report ──────────────────────────────
// NOTE: must be declared BEFORE /:id to avoid the wildcard swallowing it.
router.get(
  "/report",
  requireRole("superadmin", "manager", "accountant"),
  async (req, res, next) => {
    try {
      const {
        search   = "",
        from,
        to,
        sort_by  = "total_spending",
        page     = 1,
        limit: limitRaw = 20,
      } = req.query;
      const limit = clampLimit(limitRaw, 20);

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
            LEFT JOIN orders o ON o.customer_id = u.id AND o.status NOT IN ('cancelled', 'pending')
            LEFT JOIN (
              SELECT customer_id, MAX(created_at) AS last_order FROM orders
              WHERE status NOT IN ('cancelled', 'pending')
              GROUP BY customer_id
            ) o_active ON o_active.customer_id = u.id
            WHERE u.status = 'active'
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
             LEFT JOIN orders o ON o.customer_id = u.id AND o.status NOT IN ('cancelled', 'pending')
             WHERE u.role = 'user' ${searchCond} ${dateCond}
             GROUP BY u.id
             ORDER BY ${orderBy}
             LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
            [...params, parseInt(limit), offset],
          ),

          // Total count for pagination
          pool.query(
            `SELECT COUNT(*) FROM users u
             WHERE u.role = 'user' ${searchCond} ${dateCond}`,
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
              LEFT JOIN orders o ON o.customer_id = u.id AND o.status NOT IN ('cancelled')
              GROUP BY u.id
            ) t
          `),

          // Growth
          pool.query(`
            SELECT
              COUNT(CASE WHEN DATE_TRUNC('month', created_at) = DATE_TRUNC('month', NOW())                        THEN 1 END) AS this_month,
              COUNT(CASE WHEN DATE_TRUNC('month', created_at) = DATE_TRUNC('month', NOW() - INTERVAL '1 month')   THEN 1 END) AS last_month
            FROM users
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
      next(err);
    }
  },
);

// ── GET /api/admin/customers/:id/insights ─────────────────────────
router.get("/:id/insights", requireRole("superadmin", "manager", "admin", "accountant"), async (req, res, next) => {
  try {
    const customerId = req.params.id;
    const isCode = customerId.startsWith("CUS-");
    const whereCol = isCode ? "c.customer_code" : "c.id";

    // 1. Fetch customer details
    const custRes = await pool.query(
      `SELECT c.*, COALESCE(cl.points_balance, 0) AS points, COALESCE(lt.name, 'Bronze') AS tier
       FROM users c
       LEFT JOIN customer_loyalty cl ON c.id = cl.customer_id
       LEFT JOIN loyalty_tiers lt ON cl.tier_id = lt.id
       WHERE ${whereCol} = $1`,
      [customerId]
    );

    if (!custRes.rows.length) {
      return res.status(404).json({ message: "Customer not found" });
    }

    const customer = custRes.rows[0];

    // 2. Fetch purchase history (recent order items)
    const itemsRes = await pool.query(
      `SELECT oi.product_name, oi.quantity, o.created_at
       FROM order_items oi
       JOIN orders o ON oi.order_id = o.id
       WHERE o.customer_id = $1
       ORDER BY o.created_at DESC LIMIT 30`,
      [customer.id]
    );

    const history = itemsRes.rows;

    if (!process.env.GEMINI_API_KEY) {
      return res.json({
        insights: `### 🛒 Buying Persona\nBased on their total spent of **₦${Number(customer.total_spent || 0).toLocaleString()}**, this customer is a valuable contributor. They buy fresh produce and staples.\n\n### 🌟 Favorite Items & Categories\nNo recent orders or mock analysis available (Gemini API key is not configured).\n\n### 💡 Suggested Promotions & Next Best Actions\nOffer them a 10% discount on fresh produce categories to incentivize their next checkout.`
      });
    }

    // 3. Prompt construction
    const historyText = history.length > 0
      ? history.map(h => `- ${h.product_name} (Qty: ${h.quantity}) on ${new Date(h.created_at).toISOString().slice(0, 10)}`).join("\n")
      : "No order history found for this customer.";

    const prompt = `You are the Bems Farms AI Customer Success Analyst.
Analyze the purchase history of the customer:
- Name: ${customer.name}
- Tier: ${customer.tier}
- Total Orders: ${customer.total_orders || 0}
- Total Spent: ₦${Number(customer.total_spent || 0).toLocaleString()}
- Loyalty Points: ${customer.points || 0}

Here are the products they purchased in their recent orders:
${historyText}

Provide a professional, high-fidelity analysis of their buying behavior under the following Markdown headers:

### 🛒 Buying Persona
Analyze their buying patterns (frequency, order sizes, potential business use vs home use). Assign them a clear, descriptive persona archetype (e.g. "Family Household Stocker", "Mega Event Planner", "Healthy Lifestyle Enthusiast").

### 🌟 Favorite Items & Categories
Highlight which products or categories they order most frequently. Suggest why they prefer these products based on their transaction timing and quantities.

### 💡 Suggested Promotions & Next Best Actions
Offer 3 highly targeted promotions or outreach strategies we can execute (e.g. "Since they frequently buy scotch bonnet, offer a bundle deal with tomatoes", "Invite to VIP events", etc.). Keep the tone strategic, professional, and commercial.`;

    const model = "gemini-2.5-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`;

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }],
          generationConfig: {
            maxOutputTokens: 800,
            temperature: 0.5
          }
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Gemini status ${response.status}: ${errText}`);
      }

      const data = await response.json();
      const insightsText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!insightsText) throw new Error("Empty response from Gemini");

      res.json({ insights: insightsText });
    } catch (aiErr) {
      console.warn("AI generation failed, falling back to rule-based insights:", aiErr.message);

      let itemsList = "no recent orders";
      if (history.length > 0) {
        itemsList = Array.from(new Set(history.map(h => h.product_name))).slice(0, 3).join(", ");
      }

      const fallbackInsights = `### 🛒 Buying Persona
Based on purchase history and a total spending of **₦${Number(customer.total_spent || 0).toLocaleString()}**, **${customer.name}** behaves as a **Staple & Bulk Stocker**. They focus on consistent stock levels and regular replenishment cycles.

### 🌟 Favorite Items & Categories
* **Most Ordered:** ${itemsList}
* **Pattern:** Orders are concentrated on high-demand kitchen staples with regular quantities per order.

### 💡 Suggested Promotions & Next Best Actions
1. **Accompanying Products:** Offer bundle discounts on oils or peppers since they frequently buy staples.
2. **Loyalty Push:** They are currently in the **${customer.tier}** tier. Send a reminder of points needed for the next tier to increase frequency.
3. **Preferred Delivery:** Schedule auto-restock reminders every 2 weeks based on their purchase pattern.`;

      res.json({ insights: fallbackInsights });
    }
  } catch (err) {
    next(err);
  }
});

// ── GET /api/admin/customers/site-activity ────────────────────────
// Real platform-wide activity feed (logins, orders, admin product edits,
// AI chats, etc.) recorded by utils/aiContext.js's trackActivity() —
// replaces ActivityLog.jsx's previously fully-hardcoded 25-row fixture.
// Must be registered before GET /:id or Express treats "site-activity"
// as an :id value.
router.get("/site-activity", requireRole("superadmin", "manager"), async (req, res, next) => {
  try {
    const { type = "", search = "", date_from = "", date_to = "", limit: limitRaw = 100 } = req.query;
    const limit = clampLimit(limitRaw, 100);
    const params = [];
    const where = ["c.role = 'user'"];

    if (type) {
      params.push(type);
      where.push(`a.type = $${params.length}`);
    }
    if (search) {
      params.push(`%${search}%`);
      where.push(`(u.name ILIKE $${params.length} OR u.email ILIKE $${params.length} OR a.entity_id ILIKE $${params.length})`);
    }
    if (date_from) {
      params.push(date_from);
      where.push(`a.created_at::date >= $${params.length}`);
    }
    if (date_to) {
      params.push(date_to);
      where.push(`a.created_at::date <= $${params.length}`);
    }

    const clause = where.length ? "WHERE " + where.join(" AND ") : "";
    params.push(parseInt(limit));

    const [result, countRow, typeCounts] = await Promise.all([
      pool.query(
        `SELECT a.id, a.type, a.entity_type, a.entity_id, a.metadata, a.ip_address, a.created_at,
                u.id AS user_id, u.name AS user_name, u.email AS user_email
         FROM ai_user_activity a
         LEFT JOIN users u ON u.id = a.user_id
         ${clause}
         ORDER BY a.created_at DESC
         LIMIT $${params.length}`,
        params,
      ),
      pool.query(
        `SELECT COUNT(*) FROM ai_user_activity a LEFT JOIN users u ON u.id = a.user_id ${clause}`,
        params.slice(0, -1),
      ),
      pool.query(`SELECT type, COUNT(*) FROM ai_user_activity GROUP BY type`),
    ]);

    res.json({
      activity: result.rows,
      total: parseInt(countRow.rows[0].count),
      type_counts: Object.fromEntries(typeCounts.rows.map((r) => [r.type, parseInt(r.count)])),
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/admin/customers/:id ──────────────────────────────────
router.get("/:id", requireRole("superadmin", "manager", "admin", "accountant", "cashier"), async (req, res, next) => {
  try {
    const target = req.params.id;
    const isNum = !isNaN(Number(target));

    const result = await pool.query(
      `
      SELECT
        c.*,
        COALESCE(c.customer_code, 'CUS-' || LPAD(c.id::text, 4, '0')) AS customer_code,
        COALESCE(cl.points_balance, 0)  AS points,
        COALESCE(cl.lifetime_points, 0) AS lifetime_points,
        COALESCE(lt.name, 'Bronze')     AS tier,
        lt.id AS tier_id,
        COALESCE(cw.balance, 0)         AS wallet_balance,
        COALESCE(cw.total_topped_up, 0) AS wallet_funded,
        COALESCE(cw.total_spent, 0)     AS wallet_spent
      FROM users c
      LEFT JOIN customer_loyalty cl ON c.id = cl.customer_id
      LEFT JOIN loyalty_tiers lt ON cl.tier_id = lt.id
      LEFT JOIN customer_wallets cw ON c.id = cw.customer_id
      WHERE ${isNum ? "(c.id = $1 OR c.customer_code = $2)" : "(c.customer_code = $1 OR LOWER(c.email) = LOWER($1))"}
    `,
      isNum ? [Number(target), target] : [target],
    );

    if (!result.rows.length)
      return res.status(404).json({ message: "Customer not found" });

    const customer = result.rows[0];

    // Orders with items summary, payment method, delivery status
    const orders = await pool.query(
      `
      SELECT id, total, status, delivery_status, payment_method, created_at,
        (SELECT STRING_AGG(COALESCE(oi.product_name, p.name) || ' ×' || oi.quantity, ', ')
         FROM order_items oi LEFT JOIN products p ON oi.product_id = p.id
         WHERE oi.order_id = o.id) AS items_summary,
        (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) AS items_count
      FROM orders o
      WHERE customer_id = $1
      ORDER BY created_at DESC
      LIMIT 25
    `,
      [customer.id],
    ).catch(() => ({ rows: [] }));

    // Loyalty transactions
    const loyalty = await pool.query(
      `
      SELECT type, description, points, created_at
      FROM loyalty_transactions
      WHERE customer_id = $1
      ORDER BY created_at DESC
      LIMIT 25
    `,
      [customer.id],
    ).catch(() => ({ rows: [] }));

    // Addresses from user_addresses
    const addresses = await pool.query(
      `SELECT * FROM user_addresses WHERE user_id = $1 ORDER BY is_default DESC, created_at DESC`,
      [customer.id],
    ).catch(() => ({ rows: [] }));

    // Activity log from ai_user_activity
    const activity = await pool.query(
      `SELECT id, type, entity_type, entity_id, metadata, ip_address, created_at FROM ai_user_activity WHERE user_id = $1 ORDER BY created_at DESC LIMIT 35`,
      [customer.id],
    ).catch(() => ({ rows: [] }));

    // Wallet activity ledger
    const wallet = await pool.query(
      `SELECT id, type, amount, balance_after, note, created_at FROM customer_wallet_transactions WHERE customer_id = $1 ORDER BY created_at DESC LIMIT 20`,
      [customer.id],
    ).catch(() => ({ rows: [] }));

    // AI context and preferences
    const aiContext = await pool.query(
      `SELECT * FROM ai_user_context WHERE user_id = $1`,
      [customer.id],
    ).catch(() => ({ rows: [] }));

    res.json({
      ...customer,
      orders: orders.rows,
      loyalty: loyalty.rows,
      addresses: addresses.rows,
      activity: activity.rows,
      wallet_transactions: wallet.rows,
      ai_context: aiContext.rows[0] || null,
    });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/admin/customers ─────────────────────────────────────
router.post(
  "/",
  requireRole("superadmin", "manager", "admin", "cashier"),
  async (req, res, next) => {
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
        address,
        landmark,
        tier = "Bronze",
        status = "active",
        referral,
        notes,
        sms_alerts = true,
      } = req.body;

      const fullName = name || `${first_name || ""} ${last_name || ""}`.trim();
      if (!fullName) {
        await client.query("ROLLBACK");
        return res.status(400).json({ message: "Customer name required" });
      }
      if (!phone) {
        await client.query("ROLLBACK");
        return res.status(400).json({ message: "Phone number required" });
      }

      // Check duplicate phone
      const exists = await client.query(
        "SELECT id FROM users WHERE phone=$1",
        [phone],
      );
      if (exists.rows.length) {
        await client.query("ROLLBACK");
        return res
          .status(400)
          .json({
            message: "A customer with this phone number already exists",
          });
      }

      // Check duplicate email
      if (email) {
        const existsEmail = await client.query(
          "SELECT id FROM users WHERE email=$1",
          [email],
        );
        if (existsEmail.rows.length) {
          await client.query("ROLLBACK");
          return res.status(400).json({ message: "A customer with this email address already exists" });
        }
      }

      // Generate customer code — MAX of the existing numeric suffix, not
      // COUNT(*), which undercounts (and risks a duplicate code) if any
      // customer row was ever deleted.
      const maxRow = await client.query(
        `SELECT MAX(CAST(SPLIT_PART(customer_code, '-', 2) AS INTEGER)) AS max_n
         FROM users WHERE customer_code LIKE 'CUS-%'`
      );
      const code = `CUS-${String((maxRow.rows[0].max_n || 0) + 1).padStart(3, "0")}`;

      const result = await client.query(
        `
      INSERT INTO users
        (customer_code, name, phone, email, address, status, notes, joined_at, created_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,NOW(),NOW())
      RETURNING *
    `,
        [
          code,
          fullName,
          phone,
          email || null,
          zone || address || null,
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
        INSERT INTO customer_addresses (customer_id, label, full_address, address, is_default, created_at)
        VALUES ($1,'Home',$2,$3,true,NOW())
      `,
          [customer.id, address, zone || address || null],
        );
      }

      await client.query("COMMIT");
      res
        .status(201)
        .json({ customer, message: "Customer registered successfully" });
    } catch (err) {
      await client.query("ROLLBACK");
      next(err);
    } finally {
      client.release();
    }
  },
);

// ── PATCH /api/admin/customers/:id/status ────────────────────────
router.patch(
  "/:id/status",
  requireRole("superadmin", "manager", "admin"),
  validate(customerAdminSchemas.updateStatus),
  async (req, res, next) => {
    try {
      const { status } = req.body;
      const target = String(req.params.id || "").trim();

      if (!target || target === "undefined" || target === "null") {
        return res.status(400).json({ message: "Valid customer identifier required" });
      }

      let result;
      if (!isNaN(Number(target))) {
        result = await pool.query(
          `UPDATE users SET status=$1, token_version = token_version + 1, updated_at=NOW()
           WHERE id=$2 OR customer_code=$3
           RETURNING id, name, email, status`,
          [status, Number(target), target],
        );
      } else {
        result = await pool.query(
          `UPDATE users SET status=$1, token_version = token_version + 1, updated_at=NOW()
           WHERE customer_code=$2 OR LOWER(email)=LOWER($2)
           RETURNING id, name, email, status`,
          [status, target],
        );
      }

      if (!result.rowCount) {
        return res.status(404).json({ message: "Customer not found" });
      }

      res.json({ message: `Customer status updated to ${status}`, user: result.rows[0] });
    } catch (err) {
      next(err);
    }
  },
);

// ── PATCH /api/admin/customers/:id/notes ─────────────────────────
router.patch(
  "/:id/notes",
  requireRole("superadmin", "manager", "admin"),
  async (req, res, next) => {
    try {
      const { notes } = req.body;
      const target = String(req.params.id || "").trim();
      if (!target || target === "undefined" || target === "null") {
        return res.status(400).json({ message: "Valid customer identifier required" });
      }

      await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS notes TEXT").catch(() => {});

      let result;
      if (!isNaN(Number(target))) {
        result = await pool.query(
          `UPDATE users SET notes=$1, updated_at=NOW() WHERE id=$2 OR customer_code=$3 RETURNING id, notes`,
          [notes, Number(target), target]
        );
      } else {
        result = await pool.query(
          `UPDATE users SET notes=$1, updated_at=NOW() WHERE customer_code=$2 OR LOWER(email)=LOWER($2) RETURNING id, notes`,
          [notes, target]
        );
      }

      if (!result.rowCount) {
        return res.status(404).json({ message: "Customer not found" });
      }
      res.json({ message: "Customer notes updated", notes: result.rows[0].notes });
    } catch (err) {
      next(err);
    }
  },
);

// ── DELETE /api/admin/customers/:id ──────────────────────────────
router.delete(
  "/:id",
  requireRole("superadmin", "manager", "admin"),
  async (req, res, next) => {
    try {
      const adminPassword =
        req.body?.admin_password ||
        req.body?.password ||
        req.headers["x-admin-password"];

      if (!adminPassword || typeof adminPassword !== "string" || !adminPassword.trim()) {
        return res.status(400).json({
          message: "Admin password is required to delete a customer.",
        });
      }

      // Verify the authenticated admin user's credentials
      const adminUser = await pool.query(
        "SELECT id, password, role FROM users WHERE id = $1",
        [req.user.id],
      );

      if (!adminUser.rows.length) {
        return res.status(401).json({ message: "Administrator account not found." });
      }

      const isValidPassword = await bcrypt.compare(
        adminPassword.trim(),
        adminUser.rows[0].password || "",
      );

      if (!isValidPassword) {
        return res.status(401).json({
          message: "Incorrect admin password. Customer deletion was cancelled.",
        });
      }

      const target = String(req.params.id || "").trim();
      if (!target || target === "undefined" || target === "null") {
        return res.status(400).json({ message: "Valid customer identifier required." });
      }

      // Find the customer record
      let findQuery, findParams;
      if (!isNaN(Number(target))) {
        findQuery = "SELECT id, name, email FROM users WHERE id = $1 OR customer_code = $2";
        findParams = [Number(target), target];
      } else {
        findQuery = "SELECT id, name, email FROM users WHERE customer_code = $1 OR LOWER(email) = LOWER($1)";
        findParams = [target];
      }

      const custRes = await pool.query(findQuery, findParams);
      if (!custRes.rows.length) {
        return res.status(404).json({ message: "Customer not found." });
      }

      const customerId = custRes.rows[0].id;

      // Clean up customer associations and unlink historical orders
      await pool.query("UPDATE orders SET customer_id = NULL, user_id = NULL WHERE customer_id = $1 OR user_id = $1", [customerId]).catch(() => {});
      await pool.query("DELETE FROM customer_wallet_transactions WHERE customer_id = $1", [customerId]).catch(() => {});
      await pool.query("DELETE FROM customer_wallets WHERE customer_id = $1", [customerId]).catch(() => {});
      await pool.query("DELETE FROM loyalty_transactions WHERE customer_id = $1", [customerId]).catch(() => {});
      await pool.query("DELETE FROM customer_loyalty WHERE customer_id = $1", [customerId]).catch(() => {});
      await pool.query("DELETE FROM user_addresses WHERE user_id = $1", [customerId]).catch(() => {});
      await pool.query("DELETE FROM ai_user_activity WHERE user_id = $1", [customerId]).catch(() => {});
      await pool.query("DELETE FROM ai_user_context WHERE user_id = $1", [customerId]).catch(() => {});
      await pool.query("DELETE FROM ai_onboarding_data WHERE user_id = $1", [customerId]).catch(() => {});
      await pool.query("DELETE FROM customer_carts WHERE customer_id = $1", [customerId]).catch(() => {});
      await pool.query("DELETE FROM coupon_usages WHERE user_id = $1", [customerId]).catch(() => {});
      await pool.query("DELETE FROM product_reviews WHERE user_id = $1", [customerId]).catch(() => {});

      // Attempt hard delete; fallback to status='deleted' if any other DB constraint fires
      try {
        await pool.query("DELETE FROM users WHERE id = $1", [customerId]);
      } catch (delErr) {
        await pool.query(
          `UPDATE users SET
             name = 'Deleted Customer',
             phone = 'deleted_' || id,
             email = NULL,
             status = 'deleted',
             token_version = token_version + 1,
             updated_at = NOW()
           WHERE id = $1`,
          [customerId],
        );
      }

      res.json({ message: "Customer successfully deleted." });
    } catch (err) {
      next(err);
    }
  },
);

// ── POST /api/admin/customers/:id/loyalty ────────────────────────
// Manually award or deduct points
router.post(
  "/:id/loyalty",
  requireRole("superadmin", "manager", "admin"),
  async (req, res, next) => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const { points, type: requestedType, description } = req.body;
      const delta = parseInt(points);
      if (!delta) {
        await client.query("ROLLBACK");
        return res.status(400).json({ message: "points required" });
      }
      // loyalty_transactions.type is DB-constrained to a fixed set — fall
      // back to a sign-appropriate value if the caller didn't send a valid one
      const VALID_LOYALTY_TYPES = ["earned", "redeemed", "bonus", "referral", "deducted"];
      const type = VALID_LOYALTY_TYPES.includes(requestedType)
        ? requestedType
        : (delta > 0 ? "bonus" : "deducted");

      const custRow = await client.query(
        "SELECT id FROM users WHERE id::text=$1 OR customer_code=$1",
        [req.params.id],
      );
      if (!custRow.rows.length) {
        await client.query("ROLLBACK");
        return res.status(404).json({ message: "Customer not found" });
      }
      const customerId = custRow.rows[0].id;

      // Lock (or create) the loyalty row so the balance math below is safe
      // against concurrent awards/deductions for the same customer.
      let loyaltyRow = await client.query(
        "SELECT points_balance, lifetime_points FROM customer_loyalty WHERE customer_id=$1 FOR UPDATE",
        [customerId],
      );
      if (!loyaltyRow.rows.length) {
        loyaltyRow = await client.query(
          `INSERT INTO customer_loyalty (customer_id, tier_id, points_balance, lifetime_points, updated_at)
           VALUES ($1, (SELECT id FROM loyalty_tiers ORDER BY min_points ASC LIMIT 1), 0, 0, NOW())
           RETURNING points_balance, lifetime_points`,
          [customerId],
        );
      }

      const currentBalance = loyaltyRow.rows[0].points_balance;
      const newBalance = currentBalance + delta;
      if (newBalance < 0) {
        await client.query("ROLLBACK");
        return res.status(400).json({ message: `Cannot deduct more than the current balance (${currentBalance} pts)` });
      }
      const newLifetime = delta > 0 ? loyaltyRow.rows[0].lifetime_points + delta : loyaltyRow.rows[0].lifetime_points;

      await client.query(
        `INSERT INTO loyalty_transactions (customer_id, type, points, description, created_by, created_at)
         VALUES ($1,$2,$3,$4,$5,NOW())`,
        [customerId, type, delta, description || "Manual adjustment", req.user.id],
      );

      const newTier = await client.query(
        "SELECT id FROM loyalty_tiers WHERE min_points <= $1 ORDER BY min_points DESC LIMIT 1",
        [newBalance],
      );

      await client.query(
        `UPDATE customer_loyalty SET
           points_balance  = $1,
           lifetime_points = $2,
           tier_id         = COALESCE($3, tier_id),
           last_earned_at  = CASE WHEN $4 > 0 THEN NOW() ELSE last_earned_at END,
           updated_at      = NOW()
         WHERE customer_id = $5`,
        [newBalance, newLifetime, newTier.rows[0]?.id || null, delta, customerId],
      );

      // customers.loyalty_points is a denormalized copy read directly by the
      // POS customer lookup — keep it in sync with the real ledger.
      await client.query(
        "UPDATE users SET loyalty_points = $1 WHERE id = $2",
        [newBalance, customerId],
      );

      await client.query("COMMIT");
      res.json({ message: "Points updated", points_balance: newBalance });
    } catch (err) {
      await client.query("ROLLBACK");
      next(err);
    } finally {
      client.release();
    }
  },
);

// ── POST /api/admin/customers/:id/wallet ──────────────────────────
// Manually top up or debit a customer's wallet
router.post(
  "/:id/wallet",
  requireRole("superadmin", "manager", "admin"),
  async (req, res, next) => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const { amount, type, method = "Admin Adjustment", note } = req.body;
      const amt = parseFloat(amount);
      if (!amt || amt <= 0) {
        await client.query("ROLLBACK");
        return res.status(400).json({ message: "A positive amount is required" });
      }
      if (!["topup", "debit"].includes(type)) {
        await client.query("ROLLBACK");
        return res.status(400).json({ message: "type must be topup or debit" });
      }

      const custRow = await client.query(
        "SELECT id FROM users WHERE id::text=$1 OR customer_code=$1",
        [req.params.id],
      );
      if (!custRow.rows.length) {
        await client.query("ROLLBACK");
        return res.status(404).json({ message: "Customer not found" });
      }
      const customerId = custRow.rows[0].id;

      let walletRow = await client.query(
        "SELECT id, balance FROM customer_wallets WHERE customer_id=$1 FOR UPDATE",
        [customerId],
      );
      if (!walletRow.rows.length) {
        walletRow = await client.query(
          `INSERT INTO customer_wallets (customer_id, balance, total_topped_up, total_spent, updated_at)
           VALUES ($1, 0, 0, 0, NOW()) RETURNING id, balance`,
          [customerId],
        );
      }
      const walletId = walletRow.rows[0].id;
      const currentBalance = parseFloat(walletRow.rows[0].balance);
      const signedAmount = type === "topup" ? amt : -amt;
      const newBalance = currentBalance + signedAmount;

      if (newBalance < 0) {
        await client.query("ROLLBACK");
        return res.status(400).json({ message: `Cannot debit more than the current balance (₦${currentBalance})` });
      }

      const reference = `${type === "topup" ? "WLT" : "DBT"}-${Date.now().toString(36).toUpperCase()}`;
      const dbType = type === "topup" ? "top_up" : "admin_debit";

      await client.query(
        `INSERT INTO wallet_transactions
           (customer_id, wallet_id, type, amount, balance_after, reference, payment_method, description, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW())`,
        [customerId, walletId, dbType, signedAmount, newBalance, reference, method, note || (type === "debit" ? "Manual admin debit" : null)],
      );

      await client.query(
        `UPDATE customer_wallets SET
           balance          = $1,
           total_topped_up  = total_topped_up + $2,
           total_spent      = total_spent + $3,
           updated_at       = NOW()
         WHERE id = $4`,
        [newBalance, type === "topup" ? amt : 0, type === "debit" ? amt : 0, walletId],
      );

      await client.query("COMMIT");
      res.json({ message: "Wallet updated", balance: newBalance, reference });
    } catch (err) {
      await client.query("ROLLBACK");
      next(err);
    } finally {
      client.release();
    }
  },
);

// ── GET /api/admin/customers/loyalty/activity ─────────────────────
router.get("/loyalty/activity", requireRole("superadmin", "manager", "admin", "accountant"), async (req, res, next) => {
  try {
    const { limit: limitRaw = 30, customer_id } = req.query;
    const params = [];
    const where = ["c.role = 'user'"];
    if (customer_id) {
      params.push(customer_id);
      where.push(`(c.id::text = $${params.length} OR c.customer_code = $${params.length})`);
    }
    params.push(clampLimit(limitRaw, 30));
    const result = await pool.query(
      `SELECT lt.id, lt.type, lt.points, lt.description, lt.created_at,
              c.id AS customer_id, c.customer_code, c.name AS customer_name
       FROM loyalty_transactions lt
       JOIN users c ON c.id = lt.customer_id
       ${where.length ? "WHERE " + where.join(" AND ") : ""}
       ORDER BY lt.created_at DESC
       LIMIT $${params.length}`,
      params,
    );
    res.json({ activity: result.rows });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/admin/customers/wallet/activity ──────────────────────
router.get("/wallet/activity", requireRole("superadmin", "manager", "admin", "accountant"), async (req, res, next) => {
  try {
    const { limit: limitRaw = 30, customer_id } = req.query;
    const params = [];
    const where = ["c.role = 'user'"];
    if (customer_id) {
      params.push(customer_id);
      where.push(`(c.id::text = $${params.length} OR c.customer_code = $${params.length})`);
    }
    params.push(clampLimit(limitRaw, 30));
    const result = await pool.query(
      `SELECT wt.id, wt.type, wt.amount, wt.balance_after, wt.reference,
              wt.payment_method, wt.description, wt.created_at,
              c.id AS customer_id, c.customer_code, c.name AS customer_name
       FROM wallet_transactions wt
       JOIN users c ON c.id = wt.customer_id
       ${where.length ? "WHERE " + where.join(" AND ") : ""}
       ORDER BY wt.created_at DESC
       LIMIT $${params.length}`,
      params,
    );
    res.json({ activity: result.rows });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
