// server/src/routes/accounts_admin.js
// Mounted at /api/admin/accounts in index.js
//
// ── REQUIRED SCHEMA MIGRATIONS ─────────────────────────────────────────────
//
// -- BANK ACCOUNTS
// CREATE TABLE IF NOT EXISTS bank_accounts (
//   id            SERIAL PRIMARY KEY,
//   account_name  VARCHAR(255) NOT NULL,
//   bank_name     VARCHAR(100) NOT NULL,
//   account_number VARCHAR(30) NOT NULL,
//   account_type  VARCHAR(30) DEFAULT 'current',  -- current | savings | corporate
//   currency      VARCHAR(10) DEFAULT 'NGN',
//   balance       DECIMAL(15,2) DEFAULT 0,
//   is_primary    BOOLEAN DEFAULT false,
//   status        VARCHAR(20) DEFAULT 'active',
//   notes         TEXT,
//   created_at    TIMESTAMP DEFAULT NOW(),
//   updated_at    TIMESTAMP DEFAULT NOW()
// );
// INSERT INTO bank_accounts (account_name, bank_name, account_number, account_type, balance, is_primary)
// VALUES ('Bems Farms Ltd', 'Zenith Bank', '0123456789', 'current', 0, true)
// ON CONFLICT DO NOTHING;
//
// -- INCOME (all revenue streams)
// CREATE TABLE IF NOT EXISTS income (
//   id              SERIAL PRIMARY KEY,
//   reference       VARCHAR(50) UNIQUE,        -- INC-001
//   source          VARCHAR(100) NOT NULL,     -- sales | delivery_fee | loyalty | other
//   category        VARCHAR(100),
//   description     TEXT,
//   amount          DECIMAL(12,2) NOT NULL,
//   currency        VARCHAR(10) DEFAULT 'NGN',
//   date            DATE NOT NULL DEFAULT CURRENT_DATE,
//   payment_method  VARCHAR(50),
//   bank_account_id INT REFERENCES bank_accounts(id) ON DELETE SET NULL,
//   order_id        VARCHAR(30),
//   status          VARCHAR(20) DEFAULT 'completed',   -- pending | completed | reversed
//   notes           TEXT,
//   created_by      INT REFERENCES users(id) ON DELETE SET NULL,
//   created_at      TIMESTAMP DEFAULT NOW()
// );
// CREATE INDEX IF NOT EXISTS idx_income_date   ON income(date DESC);
// CREATE INDEX IF NOT EXISTS idx_income_source ON income(source);
//
// -- EXPENSES
// CREATE TABLE IF NOT EXISTS expenses (
//   id              SERIAL PRIMARY KEY,
//   reference       VARCHAR(50) UNIQUE,          -- EXP-001
//   category        VARCHAR(100) NOT NULL,       -- produce_purchase | staff | utilities | logistics | maintenance | other
//   description     TEXT NOT NULL,
//   supplier_name   VARCHAR(255),
//   amount          DECIMAL(12,2) NOT NULL,
//   currency        VARCHAR(10) DEFAULT 'NGN',
//   date            DATE NOT NULL DEFAULT CURRENT_DATE,
//   due_date        DATE,
//   payment_method  VARCHAR(50),
//   bank_account_id INT REFERENCES bank_accounts(id) ON DELETE SET NULL,
//   receipt_url     TEXT,
//   status          VARCHAR(20) DEFAULT 'pending',   -- pending | approved | paid | rejected
//   approved_by     INT REFERENCES users(id) ON DELETE SET NULL,
//   paid_by         INT REFERENCES users(id) ON DELETE SET NULL,
//   notes           TEXT,
//   created_by      INT REFERENCES users(id) ON DELETE SET NULL,
//   created_at      TIMESTAMP DEFAULT NOW(),
//   updated_at      TIMESTAMP DEFAULT NOW()
// );
// CREATE INDEX IF NOT EXISTS idx_expenses_date     ON expenses(date DESC);
// CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);
// CREATE INDEX IF NOT EXISTS idx_expenses_status   ON expenses(status);
//
// -- TRANSACTIONS (unified ledger — auto-populated from income + expenses + transfers)
// CREATE TABLE IF NOT EXISTS transactions (
//   id              SERIAL PRIMARY KEY,
//   reference       VARCHAR(50) UNIQUE,
//   type            VARCHAR(20) NOT NULL,   -- credit | debit | transfer
//   source_type     VARCHAR(30),            -- income | expense | transfer | payroll | commission
//   source_id       INT,
//   bank_account_id INT REFERENCES bank_accounts(id) ON DELETE SET NULL,
//   amount          DECIMAL(12,2) NOT NULL,
//   balance_after   DECIMAL(12,2),
//   description     TEXT,
//   payment_method  VARCHAR(50),
//   date            DATE NOT NULL DEFAULT CURRENT_DATE,
//   status          VARCHAR(20) DEFAULT 'completed',
//   created_by      INT REFERENCES users(id) ON DELETE SET NULL,
//   created_at      TIMESTAMP DEFAULT NOW()
// );
// CREATE INDEX IF NOT EXISTS idx_transactions_date    ON transactions(date DESC);
// CREATE INDEX IF NOT EXISTS idx_transactions_account ON transactions(bank_account_id);
//
// -- MONEY TRANSFERS (between bank accounts)
// CREATE TABLE IF NOT EXISTS money_transfers (
//   id                  SERIAL PRIMARY KEY,
//   reference           VARCHAR(50) UNIQUE,
//   from_account_id     INT REFERENCES bank_accounts(id) ON DELETE SET NULL,
//   to_account_id       INT REFERENCES bank_accounts(id) ON DELETE SET NULL,
//   amount              DECIMAL(12,2) NOT NULL,
//   fee                 DECIMAL(12,2) DEFAULT 0,
//   description         TEXT,
//   status              VARCHAR(20) DEFAULT 'completed',
//   date                DATE NOT NULL DEFAULT CURRENT_DATE,
//   created_by          INT REFERENCES users(id) ON DELETE SET NULL,
//   created_at          TIMESTAMP DEFAULT NOW()
// );
//
// -- DRIVER COMMISSIONS
// CREATE TABLE IF NOT EXISTS driver_commissions (
//   id          SERIAL PRIMARY KEY,
//   driver_id   INT REFERENCES drivers(id) ON DELETE SET NULL,
//   period_from DATE NOT NULL,
//   period_to   DATE NOT NULL,
//   deliveries  INT DEFAULT 0,
//   base_amount DECIMAL(12,2) DEFAULT 0,
//   bonus       DECIMAL(12,2) DEFAULT 0,
//   deductions  DECIMAL(12,2) DEFAULT 0,
//   net_payout  DECIMAL(12,2) DEFAULT 0,
//   status      VARCHAR(20) DEFAULT 'pending',   -- pending | approved | paid
//   paid_at     TIMESTAMP,
//   payment_ref VARCHAR(100),
//   created_by  INT REFERENCES users(id) ON DELETE SET NULL,
//   created_at  TIMESTAMP DEFAULT NOW()
// );
//
// ───────────────────────────────────────────────────────────────────────────

const express = require("express");
const router  = express.Router();
const pool    = require("../db/pool");
const { protect, requireRole } = require("../middleware/authMiddleware");
const accountsController = require("../controllers/accountsController");

router.use(protect);

// ── HELPERS ─────────────────────────────────────────────────────────────────
async function nextRef(client, prefix, table, refCol = "reference") {
  const row = await client.query(`SELECT COUNT(*) FROM ${table}`);
  const n   = parseInt(row.rows[0].count) + 1;
  return `${prefix}-${String(n).padStart(4, "0")}`;
}

async function postTransaction(client, { bankAccountId, type, sourceType, sourceId, amount, description, paymentMethod, date, userId }) {
  if (!bankAccountId) return;

  const sign = type === "credit" ? 1 : -1;

  await client.query(
    "UPDATE bank_accounts SET balance = balance + $1, updated_at=NOW() WHERE id=$2",
    [sign * parseFloat(amount), bankAccountId]
  );

  const bal = await client.query("SELECT balance FROM bank_accounts WHERE id=$1", [bankAccountId]);

  await client.query(
    `INSERT INTO transactions
       (reference, type, source_type, source_id, bank_account_id, amount, balance_after, description, payment_method, date, status, created_by, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'completed',$11,NOW())`,
    [
      `TXN-${Date.now()}`,
      type,
      sourceType || null,
      sourceId || null,
      bankAccountId,
      parseFloat(amount),
      parseFloat(bal.rows[0]?.balance || 0),
      description || null,
      paymentMethod || null,
      date || new Date().toISOString().slice(0, 10),
      userId || null,
    ]
  );
}

// ════════════════════════════════════════════════════════════════════════════
// FINANCIAL OVERVIEW  ──  GET /api/admin/accounts/overview
// ════════════════════════════════════════════════════════════════════════════
router.get("/overview", async (req, res) => {
  try {
    const [
      monthIncome,
      monthExpenses,
      bankAccounts,
      recentTxns,
      last6Months,
      incomeBySource,
      expenseByCategory,
      pendingExpenses,
    ] = await Promise.all([
      pool.query(`
        SELECT
          COALESCE(SUM(amount), 0) AS total,
          COUNT(*) AS count
        FROM income
        WHERE DATE_TRUNC('month', date) = DATE_TRUNC('month', NOW())
          AND status = 'completed'
      `),

      pool.query(`
        SELECT
          COALESCE(SUM(amount), 0) AS total,
          COUNT(*) AS count
        FROM expenses
        WHERE DATE_TRUNC('month', date) = DATE_TRUNC('month', NOW())
          AND status IN ('approved','paid')
      `),

      pool.query(`
        SELECT id, account_name, bank_name, account_number, account_type,
               balance, currency, is_primary, status
        FROM bank_accounts
        WHERE status = 'active'
        ORDER BY is_primary DESC, balance DESC
      `),

      pool.query(`
        SELECT t.*, ba.bank_name, ba.account_name AS account
        FROM transactions t
        LEFT JOIN bank_accounts ba ON t.bank_account_id = ba.id
        ORDER BY t.created_at DESC LIMIT 10
      `),

      pool.query(`
        SELECT
          TO_CHAR(DATE_TRUNC('month', d), 'Mon YYYY') AS month,
          COALESCE(i.total, 0) AS income,
          COALESCE(e.total, 0) AS expenses,
          COALESCE(i.total, 0) - COALESCE(e.total, 0) AS profit
        FROM generate_series(
          DATE_TRUNC('month', NOW()) - INTERVAL '5 months',
          DATE_TRUNC('month', NOW()), '1 month'
        ) AS d
        LEFT JOIN (
          SELECT DATE_TRUNC('month', date) AS m, SUM(amount) AS total
          FROM income WHERE status = 'completed' GROUP BY m
        ) i ON i.m = d
        LEFT JOIN (
          SELECT DATE_TRUNC('month', date) AS m, SUM(amount) AS total
          FROM expenses WHERE status IN ('approved','paid') GROUP BY m
        ) e ON e.m = d
        ORDER BY d
      `),

      pool.query(`
        SELECT source, COALESCE(SUM(amount),0) AS total, COUNT(*) AS count
        FROM income
        WHERE DATE_TRUNC('month', date) = DATE_TRUNC('month', NOW())
          AND status = 'completed'
        GROUP BY source ORDER BY total DESC
      `),

      pool.query(`
        SELECT category, COALESCE(SUM(amount),0) AS total, COUNT(*) AS count
        FROM expenses
        WHERE DATE_TRUNC('month', date) = DATE_TRUNC('month', NOW())
          AND status IN ('approved','paid')
        GROUP BY category ORDER BY total DESC
      `),

      pool.query(`
        SELECT id, reference, description, amount, due_date, supplier_name, category
        FROM expenses WHERE status = 'pending'
        ORDER BY due_date ASC NULLS LAST LIMIT 5
      `),
    ]);

    const income   = parseFloat(monthIncome.rows[0]?.total || 0);
    const expenses = parseFloat(monthExpenses.rows[0]?.total || 0);
    const totalBank = bankAccounts.rows.reduce((s, a) => s + parseFloat(a.balance || 0), 0);

    res.json({
      kpis: {
        revenue_month:   income,
        expenses_month:  expenses,
        net_profit:      income - expenses,
        profit_margin:   income > 0 ? +((income - expenses) / income * 100).toFixed(1) : 0,
        total_bank_balance: totalBank,
        income_count:    parseInt(monthIncome.rows[0]?.count   || 0),
        expense_count:   parseInt(monthExpenses.rows[0]?.count || 0),
      },
      bank_accounts:     bankAccounts.rows,
      recent_transactions: recentTxns.rows,
      pending_expenses:  pendingExpenses.rows,
      charts: {
        last_6_months:     last6Months.rows,
        income_by_source:  incomeBySource.rows,
        expense_by_category: expenseByCategory.rows,
      },
    });
  } catch (err) {
    console.error("GET /admin/accounts/overview:", err.message);
    res.status(500).json({ message: err.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// BANK ACCOUNTS
// ════════════════════════════════════════════════════════════════════════════
router.get("/bank-accounts", accountsController.getBankAccounts);
router.post("/bank-accounts", requireRole("superadmin", "manager"), accountsController.createBankAccount);
router.patch("/bank-accounts/:id", requireRole("superadmin", "manager"), accountsController.updateBankAccount);
router.delete("/bank-accounts/:id", requireRole("superadmin"), accountsController.deactivateBankAccount);

// ════════════════════════════════════════════════════════════════════════════
// INCOME
// ════════════════════════════════════════════════════════════════════════════
router.get("/income", async (req, res) => {
  try {
    const { page = 1, limit = 20, search = "", source = "", status = "", from = "", to = "" } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const params = [];
    const where  = [];

    if (search) { params.push(`%${search}%`); where.push(`(i.reference ILIKE $${params.length} OR i.description ILIKE $${params.length})`); }
    if (source) { params.push(source); where.push(`i.source = $${params.length}`); }
    if (status) { params.push(status); where.push(`i.status = $${params.length}`); }
    if (from)   { params.push(from);   where.push(`i.date >= $${params.length}`); }
    if (to)     { params.push(to);     where.push(`i.date <= $${params.length}`); }

    const whereClause = where.length ? "WHERE " + where.join(" AND ") : "";
    const countRes    = await pool.query(`SELECT COUNT(*) FROM income i ${whereClause}`, params);

    params.push(parseInt(limit));
    params.push(offset);

    const rows = await pool.query(`
      SELECT
        i.*,
        ba.bank_name, ba.account_name AS bank_account
      FROM income i
      LEFT JOIN bank_accounts ba ON i.bank_account_id = ba.id
      ${whereClause}
      ORDER BY i.date DESC, i.created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `, params);

    const stats = await pool.query(`
      SELECT
        COALESCE(SUM(amount) FILTER (WHERE status='completed'), 0) AS total_completed,
        COALESCE(SUM(amount) FILTER (WHERE status='pending'), 0)   AS total_pending,
        COUNT(*) AS total_records
      FROM income i ${whereClause}
    `, params.slice(0, params.length - 2));

    res.json({
      income: rows.rows,
      total: parseInt(countRes.rows[0].count),
      page: parseInt(page),
      pages: Math.ceil(parseInt(countRes.rows[0].count) / parseInt(limit)),
      stats: stats.rows[0],
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/income", requireRole("superadmin", "manager", "admin"), async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { source, category, description, amount, date, payment_method, bank_account_id, order_id, notes, status = "completed" } = req.body;
    if (!source)      return res.status(400).json({ message: "source required" });
    if (!amount || parseFloat(amount) <= 0) return res.status(400).json({ message: "amount must be > 0" });

    const ref    = await nextRef(client, "INC", "income");
    const result = await client.query(
      `INSERT INTO income (reference, source, category, description, amount, date, payment_method, bank_account_id, order_id, notes, status, created_by, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW()) RETURNING *`,
      [ref, source, category||null, description||null, parseFloat(amount), date||new Date().toISOString().slice(0,10), payment_method||null, bank_account_id?parseInt(bank_account_id):null, order_id||null, notes||null, status, req.user.id]
    );

    if (status === "completed" && bank_account_id) {
      await postTransaction(client, { bankAccountId: parseInt(bank_account_id), type: "credit", sourceType: "income", sourceId: result.rows[0].id, amount, description: description || source, paymentMethod: payment_method, date, userId: req.user.id });
    }

    await client.query("COMMIT");
    res.status(201).json({ income: result.rows[0] });
  } catch (err) {
    await client.query("ROLLBACK");
    res.status(500).json({ message: err.message });
  } finally {
    client.release();
  }
});

router.patch("/income/:id", requireRole("superadmin", "manager"), async (req, res) => {
  try {
    const { description, amount, status, notes } = req.body;
    const result = await pool.query(
      `UPDATE income SET
         description = COALESCE($1, description),
         amount      = COALESCE($2, amount),
         status      = COALESCE($3, status),
         notes       = COALESCE($4, notes)
       WHERE id = $5 RETURNING *`,
      [description||null, amount?parseFloat(amount):null, status||null, notes||null, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ message: "Income record not found" });
    res.json({ income: result.rows[0] });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete("/income/:id", requireRole("superadmin"), async (req, res) => {
  try {
    await pool.query("UPDATE income SET status='reversed' WHERE id=$1", [req.params.id]);
    res.json({ message: "Income reversed" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// EXPENSES
// ════════════════════════════════════════════════════════════════════════════
router.get("/expenses", async (req, res) => {
  try {
    const { page = 1, limit = 20, search = "", category = "", status = "", from = "", to = "" } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const params = [];
    const where  = [];

    if (search)   { params.push(`%${search}%`); where.push(`(e.reference ILIKE $${params.length} OR e.description ILIKE $${params.length} OR e.supplier_name ILIKE $${params.length})`); }
    if (category) { params.push(category); where.push(`e.category = $${params.length}`); }
    if (status)   { params.push(status);   where.push(`e.status = $${params.length}`);   }
    if (from)     { params.push(from);     where.push(`e.date >= $${params.length}`);     }
    if (to)       { params.push(to);       where.push(`e.date <= $${params.length}`);     }

    const whereClause = where.length ? "WHERE " + where.join(" AND ") : "";
    const countRes    = await pool.query(`SELECT COUNT(*) FROM expenses e ${whereClause}`, params);

    params.push(parseInt(limit));
    params.push(offset);

    const rows = await pool.query(`
      SELECT
        e.*,
        ba.bank_name, ba.account_name AS bank_account,
        a.name AS approved_by_name,
        p.name AS paid_by_name
      FROM expenses e
      LEFT JOIN bank_accounts ba ON e.bank_account_id = ba.id
      LEFT JOIN users a ON e.approved_by = a.id
      LEFT JOIN users p ON e.paid_by = p.id
      ${whereClause}
      ORDER BY e.date DESC, e.created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `, params);

    const stats = await pool.query(`
      SELECT
        COALESCE(SUM(amount) FILTER (WHERE status IN ('approved','paid')), 0) AS total_paid,
        COALESCE(SUM(amount) FILTER (WHERE status = 'pending'), 0)            AS total_pending,
        COUNT(*) FILTER (WHERE status = 'pending')                            AS pending_count
      FROM expenses e ${whereClause}
    `, params.slice(0, params.length - 2));

    res.json({
      expenses: rows.rows,
      total: parseInt(countRes.rows[0].count),
      page: parseInt(page),
      pages: Math.ceil(parseInt(countRes.rows[0].count) / parseInt(limit)),
      stats: stats.rows[0],
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/expenses", requireRole("superadmin", "manager", "admin"), async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { category, description, supplier_name, amount, date, due_date, payment_method, bank_account_id, receipt_url, notes } = req.body;
    if (!category)    return res.status(400).json({ message: "category required" });
    if (!description) return res.status(400).json({ message: "description required" });
    if (!amount || parseFloat(amount) <= 0) return res.status(400).json({ message: "amount must be > 0" });

    const ref    = await nextRef(client, "EXP", "expenses");
    const result = await client.query(
      `INSERT INTO expenses (reference, category, description, supplier_name, amount, date, due_date, payment_method, bank_account_id, receipt_url, notes, status, created_by, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'pending',$12,NOW(),NOW()) RETURNING *`,
      [ref, category, description, supplier_name||null, parseFloat(amount), date||new Date().toISOString().slice(0,10), due_date||null, payment_method||null, bank_account_id?parseInt(bank_account_id):null, receipt_url||null, notes||null, req.user.id]
    );

    await client.query("COMMIT");
    res.status(201).json({ expense: result.rows[0] });
  } catch (err) {
    await client.query("ROLLBACK");
    res.status(500).json({ message: err.message });
  } finally {
    client.release();
  }
});

router.patch("/expenses/:id", requireRole("superadmin", "manager"), async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { description, amount, category, supplier_name, due_date, notes, status, bank_account_id } = req.body;

    const cur = await client.query("SELECT * FROM expenses WHERE id=$1", [req.params.id]);
    if (!cur.rows.length) { await client.query("ROLLBACK"); return res.status(404).json({ message: "Expense not found" }); }

    const prev = cur.rows[0];
    const newStatus = status || prev.status;

    const result = await client.query(
      `UPDATE expenses SET
         description     = COALESCE($1, description),
         amount          = COALESCE($2, amount),
         category        = COALESCE($3, category),
         supplier_name   = COALESCE($4, supplier_name),
         due_date        = COALESCE($5::DATE, due_date),
         notes           = COALESCE($6, notes),
         status          = $7,
         approved_by     = CASE WHEN $7 IN ('approved','paid') AND approved_by IS NULL THEN $8 ELSE approved_by END,
         paid_by         = CASE WHEN $7 = 'paid' AND paid_by IS NULL THEN $8 ELSE paid_by END,
         bank_account_id = COALESCE($9, bank_account_id),
         updated_at      = NOW()
       WHERE id = $10 RETURNING *`,
      [description||null, amount?parseFloat(amount):null, category||null, supplier_name||null, due_date||null, notes||null, newStatus, req.user.id, bank_account_id?parseInt(bank_account_id):null, req.params.id]
    );

    // If transitioning to paid — debit the bank account
    const updatedAmount = parseFloat(amount || prev.amount);
    const accountId     = parseInt(bank_account_id || prev.bank_account_id);
    if (status === "paid" && prev.status !== "paid" && accountId) {
      await postTransaction(client, { bankAccountId: accountId, type: "debit", sourceType: "expense", sourceId: parseInt(req.params.id), amount: updatedAmount, description: description || prev.description, paymentMethod: prev.payment_method, date: prev.date, userId: req.user.id });
    }

    await client.query("COMMIT");
    res.json({ expense: result.rows[0] });
  } catch (err) {
    await client.query("ROLLBACK");
    res.status(500).json({ message: err.message });
  } finally {
    client.release();
  }
});

router.delete("/expenses/:id", requireRole("superadmin"), async (req, res) => {
  try {
    await pool.query("UPDATE expenses SET status='rejected', updated_at=NOW() WHERE id=$1", [req.params.id]);
    res.json({ message: "Expense rejected" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// TRANSACTIONS  ──  GET /api/admin/accounts/transactions
// ════════════════════════════════════════════════════════════════════════════
router.get("/transactions", async (req, res) => {
  try {
    const { page = 1, limit = 20, type = "", bank_account_id = "", from = "", to = "" } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const params = [];
    const where  = [];

    if (type)            { params.push(type);                 where.push(`t.type = $${params.length}`);             }
    if (bank_account_id) { params.push(parseInt(bank_account_id)); where.push(`t.bank_account_id = $${params.length}`); }
    if (from)            { params.push(from);                 where.push(`t.date >= $${params.length}`);            }
    if (to)              { params.push(to);                   where.push(`t.date <= $${params.length}`);            }

    const whereClause = where.length ? "WHERE " + where.join(" AND ") : "";
    const countRes    = await pool.query(`SELECT COUNT(*) FROM transactions t ${whereClause}`, params);

    params.push(parseInt(limit));
    params.push(offset);

    const rows = await pool.query(`
      SELECT
        t.*,
        ba.bank_name, ba.account_name AS bank_account,
        u.name AS created_by_name
      FROM transactions t
      LEFT JOIN bank_accounts ba ON t.bank_account_id = ba.id
      LEFT JOIN users u ON t.created_by = u.id
      ${whereClause}
      ORDER BY t.created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `, params);

    res.json({
      transactions: rows.rows,
      total: parseInt(countRes.rows[0].count),
      page: parseInt(page),
      pages: Math.ceil(parseInt(countRes.rows[0].count) / parseInt(limit)),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// MONEY TRANSFER  ──  GET + POST /api/admin/accounts/transfers
// ════════════════════════════════════════════════════════════════════════════
router.get("/transfers", accountsController.getMoneyTransfers);
router.post("/transfers", requireRole("superadmin", "manager"), accountsController.createMoneyTransfer);

// ════════════════════════════════════════════════════════════════════════════
// DRIVER COMMISSIONS  ──  GET /api/admin/accounts/commissions
// ════════════════════════════════════════════════════════════════════════════
router.get("/commissions", async (req, res) => {
  try {
    const { page = 1, limit = 20, status = "", driver_id = "" } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const params = [];
    const where  = [];

    if (status)    { params.push(status);              where.push(`dc.status = $${params.length}`);    }
    if (driver_id) { params.push(parseInt(driver_id)); where.push(`dc.driver_id = $${params.length}`); }

    const whereClause = where.length ? "WHERE " + where.join(" AND ") : "";
    const countRes    = await pool.query(`SELECT COUNT(*) FROM driver_commissions dc ${whereClause}`, params);

    params.push(parseInt(limit));
    params.push(offset);

    const rows = await pool.query(`
      SELECT
        dc.*,
        d.name AS driver_name, d.phone AS driver_phone,
        d.vehicle_plate, d.vehicle_type
      FROM driver_commissions dc
      LEFT JOIN drivers d ON dc.driver_id = d.id
      ${whereClause}
      ORDER BY dc.created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `, params);

    res.json({
      commissions: rows.rows,
      total: parseInt(countRes.rows[0].count),
      page: parseInt(page),
      pages: Math.ceil(parseInt(countRes.rows[0].count) / parseInt(limit)),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GENERATE COMMISSIONS  ──  POST /api/admin/accounts/commissions/generate
router.post("/commissions/generate", requireRole("superadmin", "manager"), async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { period_from, period_to, rate_per_delivery = 500 } = req.body;
    if (!period_from || !period_to) return res.status(400).json({ message: "period_from and period_to required" });

    // Count delivered orders per driver in the period
    const driverStats = await client.query(`
      SELECT
        d.id AS driver_id,
        COUNT(o.id) AS deliveries,
        $3::DECIMAL * COUNT(o.id) AS base_amount
      FROM drivers d
      LEFT JOIN orders o ON o.driver_id = d.id
        AND o.status = 'delivered'
        AND o.created_at::DATE BETWEEN $1 AND $2
      WHERE d.status = 'active'
      GROUP BY d.id
    `, [period_from, period_to, parseFloat(rate_per_delivery)]);

    let generated = 0;
    for (const ds of driverStats.rows) {
      const netPayout = parseFloat(ds.base_amount);
      await client.query(
        `INSERT INTO driver_commissions
           (driver_id, period_from, period_to, deliveries, base_amount, bonus, deductions, net_payout, status, created_by, created_at)
         VALUES ($1,$2,$3,$4,$5,0,0,$6,'pending',$7,NOW())
         ON CONFLICT DO NOTHING`,
        [ds.driver_id, period_from, period_to, parseInt(ds.deliveries), parseFloat(ds.base_amount), netPayout, req.user.id]
      );
      generated++;
    }

    await client.query("COMMIT");
    res.json({ message: `Commission records generated for ${generated} drivers`, period_from, period_to });
  } catch (err) {
    await client.query("ROLLBACK");
    res.status(500).json({ message: err.message });
  } finally {
    client.release();
  }
});

// APPROVE / PAY COMMISSION  ──  PATCH /api/admin/accounts/commissions/:id
router.patch("/commissions/:id", requireRole("superadmin", "manager"), async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { status, bonus, deductions, payment_ref, bank_account_id } = req.body;
    const allowed = ["pending", "approved", "paid"];
    if (status && !allowed.includes(status)) return res.status(400).json({ message: `status must be: ${allowed.join(", ")}` });

    const cur = await client.query("SELECT * FROM driver_commissions WHERE id=$1", [req.params.id]);
    if (!cur.rows.length) { await client.query("ROLLBACK"); return res.status(404).json({ message: "Commission not found" }); }

    const prev     = cur.rows[0];
    const newBonus = bonus       !== undefined ? parseFloat(bonus)      : parseFloat(prev.bonus);
    const newDeduc = deductions  !== undefined ? parseFloat(deductions) : parseFloat(prev.deductions);
    const newNet   = parseFloat(prev.base_amount) + newBonus - newDeduc;

    const result = await client.query(
      `UPDATE driver_commissions SET
         status      = COALESCE($1, status),
         bonus       = $2,
         deductions  = $3,
         net_payout  = $4,
         payment_ref = COALESCE($5, payment_ref),
         paid_at     = CASE WHEN $1 = 'paid' THEN NOW() ELSE paid_at END
       WHERE id = $6 RETURNING *`,
      [status||null, newBonus, newDeduc, newNet, payment_ref||null, req.params.id]
    );

    // If marking as paid, record the debit
    if (status === "paid" && prev.status !== "paid" && bank_account_id) {
      await postTransaction(client, { bankAccountId: parseInt(bank_account_id), type: "debit", sourceType: "commission", sourceId: parseInt(req.params.id), amount: newNet, description: `Driver commission payout`, userId: req.user.id });
    }

    await client.query("COMMIT");
    res.json({ commission: result.rows[0] });
  } catch (err) {
    await client.query("ROLLBACK");
    res.status(500).json({ message: err.message });
  } finally {
    client.release();
  }
});

module.exports = router;
