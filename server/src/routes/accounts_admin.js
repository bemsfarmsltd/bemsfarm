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
const validate = require("../middleware/validate");
const accountsAdminSchemas = require("../schemas/accountsAdminSchemas");
const { clampLimit } = require("../utils/pagination");
const { ensureDoubleEntryTables, COA } = require("../utils/doubleEntryLedger");

router.use(protect);

// ── HELPERS ─────────────────────────────────────────────────────────────────
// pg_advisory_xact_lock serializes concurrent callers using the same prefix
// (auto-released at COMMIT/ROLLBACK) — same fix as accountsRepository.js's
// generateReference, which has the identical race.
async function nextRef(client, prefix, table, refCol = "reference") {
  await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`ref_${prefix}`]);
  // MAX of the existing numeric suffix, not COUNT(*) — COUNT undercounts
  // (and risks a duplicate reference) if any row was ever deleted.
  const row = await client.query(
    `SELECT MAX(CAST(SPLIT_PART(${refCol}, '-', 2) AS INTEGER)) AS max_n
     FROM ${table} WHERE ${refCol} LIKE $1`,
    [`${prefix}-%`]
  );
  const n = (row.rows[0].max_n || 0) + 1;
  return `${prefix}-${String(n).padStart(4, "0")}`;
}

// `transactions` only has columns (reference, date, type, sub_type, description,
// bank_account_id, amount, status, related_ref, created_at) — no source_type,
// source_id, balance_after, payment_method or created_by, and `type` is
// constrained to income|expense|commission|transfer|refund (not credit/debit).
// Verified directly against the live schema — a prior version of this
// function assumed columns that don't exist, so every call with a real
// bankAccountId (income marked completed, an expense/commission marked
// paid) was throwing and rolling back the whole parent operation.
async function postTransaction(client, { bankAccountId, direction, type, subType, reference, amount, description, date }) {
  if (!bankAccountId) return;

  const sign = direction === "credit" ? 1 : -1;
  const signedAmount = sign * parseFloat(amount);

  await client.query(
    "UPDATE bank_accounts SET balance = balance + $1, last_transaction_at = NOW(), updated_at = NOW() WHERE id = $2",
    [signedAmount, bankAccountId]
  );

  await client.query(
    `INSERT INTO transactions
       (reference, date, type, sub_type, description, bank_account_id, amount, status, related_ref, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,'completed',$8,NOW())`,
    [
      `TXN-${Date.now()}`,
      date || new Date().toISOString().slice(0, 10),
      type,
      subType || null,
      description || null,
      bankAccountId,
      signedAmount,
      reference || null,
    ]
  );
}

// ════════════════════════════════════════════════════════════════════════════
// FINANCIAL OVERVIEW  ──  GET /api/admin/accounts/overview
// ════════════════════════════════════════════════════════════════════════════
router.get("/overview", requireRole("superadmin", "manager", "accountant"), async (req, res, next) => {
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
    next(err);
  }
});

// ════════════════════════════════════════════════════════════════════════════
// BANK ACCOUNTS
// ════════════════════════════════════════════════════════════════════════════
router.get("/bank-accounts", requireRole("superadmin", "manager", "accountant"), accountsController.getBankAccounts);
router.post("/bank-accounts", requireRole("superadmin", "manager"), accountsController.createBankAccount);
router.patch("/bank-accounts/:id", requireRole("superadmin", "manager"), accountsController.updateBankAccount);
router.delete("/bank-accounts/:id", requireRole("superadmin"), accountsController.deactivateBankAccount);

// ════════════════════════════════════════════════════════════════════════════
// INCOME
// ════════════════════════════════════════════════════════════════════════════
router.get("/income", requireRole("superadmin", "manager", "accountant"), async (req, res, next) => {
  try {
    const { page = 1, limit: limitRaw = 20, search = "", source = "", status = "", from = "", to = "" } = req.query;
    const limit = clampLimit(limitRaw, 20);
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
    next(err);
  }
});

router.post("/income", requireRole("superadmin", "manager"), validate(accountsAdminSchemas.createIncome), async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { source, source_type, category, description, amount, date, payment_method, bank_account_id, order_id, notes, status } = req.body;

    const ref    = await nextRef(client, "INC", "income");
    const result = await client.query(
      `INSERT INTO income (reference, source, source_type, category, description, amount, date, payment_method, bank_account_id, order_id, notes, status, created_by, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,NOW()) RETURNING *`,
      [ref, source, source_type, category||null, description||null, parseFloat(amount), date||new Date().toISOString().slice(0,10), payment_method||null, bank_account_id?parseInt(bank_account_id):null, order_id||null, notes||null, status, req.user.id]
    );

    if (status === "completed" && bank_account_id) {
      await postTransaction(client, { bankAccountId: parseInt(bank_account_id), direction: "credit", type: "income", subType: source_type, reference: ref, amount, description: description || source, date });
    }

    await client.query("COMMIT");
    res.status(201).json({ income: result.rows[0] });
  } catch (err) {
    await client.query("ROLLBACK");
    next(err);
  } finally {
    client.release();
  }
});

router.patch("/income/:id", requireRole("superadmin", "manager"), validate(accountsAdminSchemas.updateIncome), async (req, res, next) => {
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
    next(err);
  }
});

router.delete("/income/:id", requireRole("superadmin"), async (req, res, next) => {
  try {
    await pool.query("UPDATE income SET status='reversed' WHERE id=$1", [req.params.id]);
    res.json({ message: "Income reversed" });
  } catch (err) {
    next(err);
  }
});

// ════════════════════════════════════════════════════════════════════════════
// EXPENSES
// ════════════════════════════════════════════════════════════════════════════
router.get("/expenses", requireRole("superadmin", "manager", "accountant"), async (req, res, next) => {
  try {
    const { page = 1, limit: limitRaw = 20, search = "", category = "", status = "", from = "", to = "" } = req.query;
    const limit = clampLimit(limitRaw, 20);
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
    next(err);
  }
});

router.post("/expenses", requireRole("superadmin", "manager"), validate(accountsAdminSchemas.createExpense), async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { category, description, supplier_name, amount, date, due_date, payment_method, bank_account_id, receipt_url, notes } = req.body;

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
    next(err);
  } finally {
    client.release();
  }
});

router.patch("/expenses/:id", requireRole("superadmin", "manager"), validate(accountsAdminSchemas.updateExpense), async (req, res, next) => {
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
      await postTransaction(client, { bankAccountId: accountId, direction: "debit", type: "expense", subType: category || prev.category, reference: prev.reference, amount: updatedAmount, description: description || prev.description, date: prev.date });
    }

    await client.query("COMMIT");
    res.json({ expense: result.rows[0] });
  } catch (err) {
    await client.query("ROLLBACK");
    next(err);
  } finally {
    client.release();
  }
});

router.delete("/expenses/:id", requireRole("superadmin"), async (req, res, next) => {
  try {
    await pool.query("UPDATE expenses SET status='rejected', updated_at=NOW() WHERE id=$1", [req.params.id]);
    res.json({ message: "Expense rejected" });
  } catch (err) {
    next(err);
  }
});

// ════════════════════════════════════════════════════════════════════════════
// TRANSACTIONS  ──  GET /api/admin/accounts/transactions
// ════════════════════════════════════════════════════════════════════════════
router.get("/transactions", requireRole("superadmin", "manager", "admin", "accountant"), async (req, res, next) => {
  try {
    const { page = 1, limit: limitRaw = 100, type = "", bank_account_id = "", from = "", to = "" } = req.query;
    const limit = clampLimit(limitRaw, 100);
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const params = [];
    const where  = [];

    if (type && type !== "all") {
      params.push(type);
      where.push(`u.type = $${params.length}`);
    }
    if (from) {
      params.push(from);
      where.push(`u.date >= $${params.length}`);
    }
    if (to) {
      params.push(to);
      where.push(`u.date <= $${params.length}`);
    }

    const whereClause = where.length ? "WHERE " + where.join(" AND ") : "";

    const countRes = await pool.query(
      `
      WITH unified_transactions AS (
        -- 1. Direct transactions in transactions table
        SELECT
          t.id::text AS id,
          t.reference,
          t.date::text AS date,
          t.time::text AS time,
          t.type,
          t.sub_type,
          t.description,
          t.amount::numeric AS amount,
          t.status,
          ba.bank_name,
          ba.account_name AS bank_account,
          t.created_at
        FROM transactions t
        LEFT JOIN bank_accounts ba ON t.bank_account_id = ba.id

        UNION ALL

        -- 2. Customer Storefront & POS Orders
        SELECT
          CONCAT('ORD-', o.id) AS id,
          COALESCE(o.order_ref, o.id) AS reference,
          o.created_at::date::text AS date,
          o.created_at::time::text AS time,
          'income' AS type,
          CASE WHEN o.source LIKE '%POS%' THEN 'pos_sale' ELSE 'customer_checkout' END AS sub_type,
          CONCAT(
            CASE WHEN o.source LIKE '%POS%' THEN 'POS Retail Sale: ' ELSE 'Online Order: ' END,
            COALESCE(o.customer_name, 'Customer'),
            ' (', COALESCE(o.payment_method, 'Monnify'), ')'
          ) AS description,
          o.total::numeric AS amount,
          CASE WHEN o.payment_status = 'paid' THEN 'completed' ELSE 'pending' END AS status,
          CASE WHEN o.source LIKE '%POS%' THEN 'POS Cash Drawer' ELSE 'Monnify Settlement Vault' END AS bank_name,
          CASE WHEN o.source LIKE '%POS%' THEN 'Register #1' ELSE 'DVA Master (8559127267)' END AS bank_account,
          o.created_at
        FROM orders o
        WHERE (o.payment_status = 'paid' OR o.payment_method IN ('monnify', 'card', 'transfer', 'online', 'wallet') OR o.payment_ref IS NOT NULL)

        UNION ALL

        -- 3. Completed Driver Payouts / Disbursements
        SELECT
          CONCAT('PAY-', p.id) AS id,
          COALESCE(p.payout_ref, CONCAT('PAY-', p.id)) AS reference,
          p.requested_at::date::text AS date,
          p.requested_at::time::text AS time,
          'expense' AS type,
          'driver_payout' AS sub_type,
          CONCAT('Driver Bank Payout to ', dr.name, ' (', COALESCE(p.bank_name, 'Bank'), ' - ', p.account_number, ')') AS description,
          -p.amount::numeric AS amount,
          p.status,
          'Monnify Vault' AS bank_name,
          'Disbursement Channel' AS bank_account,
          p.requested_at AS created_at
        FROM driver_payouts p
        JOIN drivers dr ON p.driver_id = dr.id
        WHERE p.status = 'paid' OR p.status = 'completed'
      )
      SELECT COUNT(*) FROM unified_transactions u ${whereClause}
      `,
      params
    );

    params.push(parseInt(limit));
    params.push(offset);

    const rows = await pool.query(
      `
      WITH unified_transactions AS (
        -- 1. Direct transactions in transactions table
        SELECT
          t.id::text AS id,
          t.reference,
          t.date::text AS date,
          t.time::text AS time,
          t.type,
          t.sub_type,
          t.description,
          t.amount::numeric AS amount,
          t.status,
          ba.bank_name,
          ba.account_name AS bank_account,
          t.created_at
        FROM transactions t
        LEFT JOIN bank_accounts ba ON t.bank_account_id = ba.id

        UNION ALL

        -- 2. Customer Storefront & POS Orders
        SELECT
          CONCAT('ORD-', o.id) AS id,
          COALESCE(o.order_ref, o.id) AS reference,
          o.created_at::date::text AS date,
          o.created_at::time::text AS time,
          'income' AS type,
          CASE WHEN o.source LIKE '%POS%' THEN 'pos_sale' ELSE 'customer_checkout' END AS sub_type,
          CONCAT(
            CASE WHEN o.source LIKE '%POS%' THEN 'POS Retail Sale: ' ELSE 'Online Order: ' END,
            COALESCE(o.customer_name, 'Customer'),
            ' (', COALESCE(o.payment_method, 'Monnify'), ')'
          ) AS description,
          o.total::numeric AS amount,
          CASE WHEN o.payment_status = 'paid' THEN 'completed' ELSE 'pending' END AS status,
          CASE WHEN o.source LIKE '%POS%' THEN 'POS Cash Drawer' ELSE 'Monnify Settlement Vault' END AS bank_name,
          CASE WHEN o.source LIKE '%POS%' THEN 'Register #1' ELSE 'DVA Master (8559127267)' END AS bank_account,
          o.created_at
        FROM orders o
        WHERE (o.payment_status = 'paid' OR o.payment_method IN ('monnify', 'card', 'transfer', 'online', 'wallet') OR o.payment_ref IS NOT NULL)

        UNION ALL

        -- 3. Completed Driver Payouts / Disbursements
        SELECT
          CONCAT('PAY-', p.id) AS id,
          COALESCE(p.payout_ref, CONCAT('PAY-', p.id)) AS reference,
          p.requested_at::date::text AS date,
          p.requested_at::time::text AS time,
          'expense' AS type,
          'driver_payout' AS sub_type,
          CONCAT('Driver Bank Payout to ', dr.name, ' (', COALESCE(p.bank_name, 'Bank'), ' - ', p.account_number, ')') AS description,
          -p.amount::numeric AS amount,
          p.status,
          'Monnify Vault' AS bank_name,
          'Disbursement Channel' AS bank_account,
          p.requested_at AS created_at
        FROM driver_payouts p
        JOIN drivers dr ON p.driver_id = dr.id
        WHERE p.status = 'paid' OR p.status = 'completed'
      )
      SELECT * FROM unified_transactions u
      ${whereClause}
      ORDER BY u.created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
      `,
      params
    );

    res.json({
      transactions: rows.rows,
      total: parseInt(countRes.rows[0].count),
      page: parseInt(page),
      pages: Math.ceil(parseInt(countRes.rows[0].count) / parseInt(limit)),
    });
  } catch (err) {
    next(err);
  }
});

// ════════════════════════════════════════════════════════════════════════════
// MONEY TRANSFER  ──  GET + POST /api/admin/accounts/transfers
// ════════════════════════════════════════════════════════════════════════════
router.get("/transfers", requireRole("superadmin", "manager", "accountant"), accountsController.getMoneyTransfers);
router.post("/transfers", requireRole("superadmin", "manager"), accountsController.createMoneyTransfer);

// ════════════════════════════════════════════════════════════════════════════
// DRIVER COMMISSIONS  ──  GET /api/admin/accounts/commissions
// ════════════════════════════════════════════════════════════════════════════
router.get("/commissions", requireRole("superadmin", "manager", "accountant"), async (req, res, next) => {
  try {
    const { page = 1, limit: limitRaw = 20, status = "", driver_id = "", search = "" } = req.query;
    const limit = clampLimit(limitRaw, 20);
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const params = [];
    const where  = [];

    if (status)    { params.push(status);              where.push(`dc.status = $${params.length}`);    }
    if (driver_id) { params.push(parseInt(driver_id)); where.push(`dc.driver_id = $${params.length}`); }
    if (search)    { params.push(`%${search}%`);       where.push(`d.name ILIKE $${params.length}`);   }

    const whereClause = where.length ? "WHERE " + where.join(" AND ") : "";

    // Aggregate totals over every matching row, not just the current page —
    // the KPI cards on the page are meant to summarize the whole filtered
    // set, not whatever 20 rows happen to be visible.
    const [countRes, statsRes] = await Promise.all([
      pool.query(`SELECT COUNT(*) FROM driver_commissions dc LEFT JOIN drivers d ON dc.driver_id = d.id ${whereClause}`, params),
      pool.query(`
        SELECT
          COALESCE(SUM(dc.net_payout) FILTER (WHERE dc.status != 'paid'), 0) AS total_unpaid,
          COALESCE(SUM(dc.net_payout) FILTER (WHERE dc.status = 'paid'), 0)  AS total_paid,
          COALESCE(SUM(dc.deliveries), 0)                                    AS total_deliveries,
          COUNT(*) FILTER (WHERE dc.status = 'pending')                      AS pending_count
        FROM driver_commissions dc
        LEFT JOIN drivers d ON dc.driver_id = d.id
        ${whereClause}
      `, params),
    ]);

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
      stats: {
        total_unpaid: parseFloat(statsRes.rows[0].total_unpaid),
        total_paid: parseFloat(statsRes.rows[0].total_paid),
        total_deliveries: parseInt(statsRes.rows[0].total_deliveries),
        pending_count: parseInt(statsRes.rows[0].pending_count),
      },
    });
  } catch (err) {
    next(err);
  }
});

// GENERATE COMMISSIONS  ──  POST /api/admin/accounts/commissions/generate
router.post("/commissions/generate", requireRole("superadmin", "manager"), async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { period_from, period_to, rate_per_delivery = 500 } = req.body;
    if (!period_from || !period_to) { await client.query("ROLLBACK"); return res.status(400).json({ message: "period_from and period_to required" }); }

    // Count delivered orders per driver in the period and calculate zone-based earnings
    const driverStats = await client.query(`
      SELECT
        d.id AS driver_id,
        COUNT(DISTINCT del.id) AS deliveries,
        COALESCE(
          SUM(
            CASE 
              WHEN del.driver_commission_amount IS NOT NULL AND del.driver_commission_amount > 0 THEN del.driver_commission_amount
              WHEN dz.driver_earning_fee IS NOT NULL AND dz.driver_earning_fee > 0 THEN dz.driver_earning_fee
              WHEN dz.delivery_fee IS NOT NULL AND dz.delivery_fee > 0 THEN ROUND(dz.delivery_fee * 0.70, 2)
              ELSE COALESCE(d.commission_per_delivery, 700)
            END
          ), 
          0
        ) AS base_amount
      FROM drivers d
      LEFT JOIN deliveries del ON del.driver_id = d.id 
        AND del.status = 'delivered' 
        AND del.created_at::DATE BETWEEN $1 AND $2
      LEFT JOIN orders o ON del.order_id = o.id
      LEFT JOIN delivery_zones dz ON (del.zone_id = dz.zone_id OR o.zone_id = dz.zone_id)
      WHERE d.status = 'active'
      GROUP BY d.id
    `, [period_from, period_to]);

    let generated = 0;
    for (const ds of driverStats.rows) {
      const netPayout = parseFloat(ds.base_amount);
      if (parseInt(ds.deliveries) > 0 || netPayout > 0) {
        const tripsCount = parseInt(ds.deliveries) || 0;
        const commPerDrop = tripsCount > 0 ? (netPayout / tripsCount) : 700;
        await client.query(
          `INSERT INTO driver_commissions
             (driver_id, period_from, period_to, week_start, week_end, deliveries, trips, base_amount, bonus, deductions, net_payout, total_earned, unpaid_balance, commission_per_delivery, status, created_by, created_at)
           VALUES ($1,$2,$3,COALESCE($2, DATE_TRUNC('week', NOW())),COALESCE($3, DATE_TRUNC('week', NOW()) + INTERVAL '6 days 23 hours 59 minutes'),$4,$4,$5,0,0,$6,$6,$6,$7,'pending',$8,NOW())
           ON CONFLICT DO NOTHING`,
          [ds.driver_id, period_from, period_to, tripsCount, parseFloat(ds.base_amount), netPayout, commPerDrop, req.user.id]
        );
        generated++;
      }
    }

    await client.query("COMMIT");
    res.json({ message: `Commission records generated for ${generated} drivers`, period_from, period_to });
  } catch (err) {
    await client.query("ROLLBACK");
    next(err);
  } finally {
    client.release();
  }
});

// APPROVE / PAY COMMISSION  ──  PATCH /api/admin/accounts/commissions/:id
router.patch("/commissions/:id", requireRole("superadmin", "manager"), async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { status, bonus, deductions, payment_ref, bank_account_id } = req.body;
    const allowed = ["pending", "approved", "paid"];
    if (status && !allowed.includes(status)) { await client.query("ROLLBACK"); return res.status(400).json({ message: `status must be: ${allowed.join(", ")}` }); }

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
      await postTransaction(client, { bankAccountId: parseInt(bank_account_id), direction: "debit", type: "commission", subType: "driver_commission", reference: payment_ref || prev.payment_ref || `COM-${req.params.id}`, amount: newNet, description: "Driver commission payout" });
    }

    await client.query("COMMIT");
    res.json({ commission: result.rows[0] });
  } catch (err) {
    await client.query("ROLLBACK");
    next(err);
  } finally {
    client.release();
  }
});

// ════════════════════════════════════════════════════════════════════════════
// GENERAL JOURNAL (DOUBLE-ENTRY)  ──  GET /api/admin/accounts/general-journal
// ════════════════════════════════════════════════════════════════════════════
router.get("/general-journal", requireRole("superadmin", "manager", "admin", "accountant"), async (req, res, next) => {
  try {
    await ensureDoubleEntryTables(pool);
    const { module, limit = 100, date_from, date_to } = req.query;

    let query = `
      SELECT 
        g.*,
        u.name AS created_by_name
      FROM general_journal_entries g
      LEFT JOIN users u ON g.created_by = u.id
      WHERE 1=1
    `;
    const params = [];

    if (module) {
      params.push(module);
      query += ` AND g.source_module = $${params.length}`;
    }
    if (date_from) {
      params.push(date_from);
      query += ` AND g.entry_date >= $${params.length}`;
    }
    if (date_to) {
      params.push(date_to);
      query += ` AND g.entry_date <= $${params.length}`;
    }

    query += ` ORDER BY g.entry_date DESC, g.id DESC LIMIT $${params.length + 1}`;
    params.push(parseInt(limit) || 100);

    const result = await pool.query(query, params);

    const totalsRes = await pool.query(`
      SELECT 
        COALESCE(SUM(debit_amount), 0) AS total_debits,
        COALESCE(SUM(credit_amount), 0) AS total_credits,
        COUNT(*) AS total_entries
      FROM general_journal_entries
    `);

    const totals = totalsRes.rows[0] || {};
    const totalDebits = parseFloat(totals.total_debits || 0);
    const totalCredits = parseFloat(totals.total_credits || 0);

    res.json({
      entries: result.rows,
      summary: {
        total_debits: totalDebits,
        total_credits: totalCredits,
        variance: Math.abs(totalDebits - totalCredits),
        is_balanced: Math.abs(totalDebits - totalCredits) < 0.01,
        total_entries: parseInt(totals.total_entries || 0),
      },
    });
  } catch (err) {
    next(err);
  }
});

// ════════════════════════════════════════════════════════════════════════════
// TRIAL BALANCE (STATUTORY GAAP/IFRS)  ──  GET /api/admin/accounts/trial-balance
// ════════════════════════════════════════════════════════════════════════════
router.get("/trial-balance", requireRole("superadmin", "manager", "admin", "accountant"), async (req, res, next) => {
  try {
    await ensureDoubleEntryTables(pool);

    // Aggregate debits and credits per account code from general_journal_entries
    const rawRes = await pool.query(`
      WITH debits AS (
        SELECT debit_account_code AS code, debit_account_name AS name, SUM(debit_amount) AS total_dr
        FROM general_journal_entries
        GROUP BY debit_account_code, debit_account_name
      ),
      credits AS (
        SELECT credit_account_code AS code, credit_account_name AS name, SUM(credit_amount) AS total_cr
        FROM general_journal_entries
        GROUP BY credit_account_code, credit_account_name
      ),
      all_accounts AS (
        SELECT code, name FROM debits
        UNION
        SELECT code, name FROM credits
      )
      SELECT 
        a.code,
        a.name,
        COALESCE(d.total_dr, 0) AS total_debit,
        COALESCE(c.total_cr, 0) AS total_credit
      FROM all_accounts a
      LEFT JOIN debits d ON a.code = d.code
      LEFT JOIN credits c ON a.code = c.code
      ORDER BY a.code ASC
    `);

    // Standard COA defaults to always present a comprehensive balance sheet & P&L trial balance
    const accounts = rawRes.rows.map((row) => {
      const code = row.code;
      const dr = parseFloat(row.total_debit || 0);
      const cr = parseFloat(row.total_credit || 0);
      let accountType = "asset";

      if (code.startsWith("1")) accountType = "asset";
      else if (code.startsWith("2")) accountType = "liability";
      else if (code.startsWith("3")) accountType = "equity";
      else if (code.startsWith("4")) accountType = "revenue";
      else if (code.startsWith("5")) accountType = "expense";

      return {
        code,
        name: row.name,
        account_type: accountType,
        total_debit: dr,
        total_credit: cr,
        net_balance: accountType === "asset" || accountType === "expense" ? dr - cr : cr - dr,
      };
    });

    const sumDebits = accounts.reduce((acc, a) => acc + a.total_debit, 0);
    const sumCredits = accounts.reduce((acc, a) => acc + a.total_credit, 0);
    const variance = Math.abs(sumDebits - sumCredits);

    res.json({
      trial_balance: accounts,
      summary: {
        total_debits: sumDebits,
        total_credits: sumCredits,
        variance: variance,
        is_balanced: variance < 0.01,
        as_of_date: new Date().toISOString(),
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
