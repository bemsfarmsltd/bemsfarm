// server/src/utils/doubleEntryLedger.js
// Enterprise Double-Entry Accounting Core Engine for Bems Farms
// Enforces GAAP/IFRS compliance across Inventory, Sales, COGS, Purchases, Kitchen & Wallets.

const pool = require("../db/pool");

// Standard Chart of Accounts (COA) Mapping
const COA = {
  // 1000 - ASSETS
  CASH_MAIN_BANK: { code: "1110", name: "Main Bank Account (Zenith)", type: "asset" },
  CASH_MONNIFY_VAULT: { code: "1120", name: "Monnify Settlement Vault", type: "asset" },
  CASH_POS_DRAWER: { code: "1130", name: "POS Cash Drawer", type: "asset" },
  ACCOUNTS_RECEIVABLE: { code: "1140", name: "Accounts Receivable", type: "asset" },
  INVENTORY_FINISHED_GOODS: { code: "1210", name: "Finished Goods & Produce Inventory", type: "asset" },
  INVENTORY_RAW_INGREDIENTS: { code: "1220", name: "Chef Bems Raw Ingredients Inventory", type: "asset" },

  // 2000 - LIABILITIES
  ACCOUNTS_PAYABLE_SUPPLIERS: { code: "2110", name: "Accounts Payable (Suppliers)", type: "liability" },
  DRIVER_WALLET_PAYABLE: { code: "2120", name: "Driver Wallet Balance Payable", type: "liability" },
  VAT_TAX_PAYABLE: { code: "2130", name: "VAT / Sales Tax Payable", type: "liability" },

  // 3000 - EQUITY
  OWNERS_EQUITY: { code: "3100", name: "Owner Capital & Retained Earnings", type: "equity" },

  // 4000 - REVENUE
  REVENUE_PRODUCT_SALES: { code: "4110", name: "Produce & Food Sales Revenue", type: "revenue" },
  REVENUE_DELIVERY_FEES: { code: "4120", name: "Logistics & Delivery Service Revenue", type: "revenue" },
  REVENUE_INVENTORY_ADJ_GAIN: { code: "4210", name: "Inventory Stocktake Gain (Surplus)", type: "revenue" },
  REVENUE_FARM_PRODUCTION_YIELD: { code: "4310", name: "Farm Harvest Agricultural Yield", type: "revenue" },

  // 5000 - EXPENSES & COGS
  COGS_PRODUCE: { code: "5110", name: "Cost of Goods Sold - Produce", type: "expense" },
  COGS_KITCHEN_MEALS: { code: "5120", name: "Cost of Goods Sold - Chef Bems Kitchen", type: "expense" },
  EXPENSE_DELIVERY_COMMISSION: { code: "5210", name: "Driver Delivery Commission Expense", type: "expense" },
  EXPENSE_DRIVER_BONUS: { code: "5220", name: "Driver Performance Bonus Expense", type: "expense" },
  EXPENSE_INVENTORY_SPOILAGE: { code: "5310", name: "Inventory Spoilage & Damaged Produce Write-off", type: "expense" },
  EXPENSE_INVENTORY_ADJ_LOSS: { code: "5320", name: "Inventory Stocktake Loss (Deficit)", type: "expense" },
  EXPENSE_KITCHEN_RAW_USAGE: { code: "5330", name: "Kitchen Raw Ingredients Consumption", type: "expense" },
};

// Common Aliases for COA
COA.ASSET_MAIN_BANK = COA.CASH_MAIN_BANK;
COA.ASSET_MONNIFY_VAULT = COA.CASH_MONNIFY_VAULT;
COA.ASSET_POS_DRAWER = COA.CASH_POS_DRAWER;
COA.ASSET_INVENTORY_FINISHED = COA.INVENTORY_FINISHED_GOODS;
COA.ASSET_INVENTORY_RAW = COA.INVENTORY_RAW_INGREDIENTS;
COA.REVENUE_SALES = COA.REVENUE_PRODUCT_SALES;
COA.EXPENSE_COGS = COA.COGS_PRODUCE;

function resolveAccount(acc) {
  if (!acc) return { code: "9999", name: "Suspense Account", type: "other" };
  if (typeof acc === "object" && acc.code && acc.name) return acc;
  if (typeof acc === "string") {
    // Check if matching code in COA
    const found = Object.values(COA).find((c) => c.code === acc);
    if (found) return found;
    return { code: acc, name: `Account ${acc}`, type: "other" };
  }
  return { code: "9999", name: "Suspense Account", type: "other" };
}

let ledgerTablesReady = false;

/**
 * Initializes the unified Double-Entry Financial Ledger & General Journal tables.
 */
async function ensureDoubleEntryTables(clientOrPool = pool) {
  if (ledgerTablesReady) return;
  try {
    await clientOrPool.query(`
      -- 1. Inventory Financial Valuation Ledger (Perpetual Inventory Tracking)
      CREATE TABLE IF NOT EXISTS inventory_financial_ledger (
        id                   SERIAL PRIMARY KEY,
        entry_date           TIMESTAMP DEFAULT NOW(),
        reference            VARCHAR(100) NOT NULL,
        event_type           VARCHAR(50) NOT NULL, -- stock_in, cogs, spoilage, adjustment, po_receipt, kitchen_issue, harvest_inflow
        product_id           INT,
        product_name         VARCHAR(255),
        warehouse_id         INT,
        quantity             INT NOT NULL,
        unit_cost            DECIMAL(12,2) DEFAULT 0,
        total_value          DECIMAL(12,2) NOT NULL,
        debit_account_code   VARCHAR(20) NOT NULL,
        debit_account_name   VARCHAR(150) NOT NULL,
        credit_account_code  VARCHAR(20) NOT NULL,
        credit_account_name  VARCHAR(150) NOT NULL,
        narration            TEXT,
        balance_after_qty    INT,
        balance_after_value  DECIMAL(12,2),
        performed_by         INT,
        created_at           TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_inv_fin_ledger_date ON inventory_financial_ledger(entry_date DESC);
      CREATE INDEX IF NOT EXISTS idx_inv_fin_ledger_ref ON inventory_financial_ledger(reference);

      -- 2. Central General Journal Entries (Unified T-Account balancing across the whole company)
      CREATE TABLE IF NOT EXISTS general_journal_entries (
        id                   SERIAL PRIMARY KEY,
        journal_ref          VARCHAR(100) NOT NULL,
        entry_date           DATE NOT NULL DEFAULT CURRENT_DATE,
        source_module        VARCHAR(50) NOT NULL, -- inventory, orders, pos, purchases, chef_bems, driver_wallet, banking
        source_ref           VARCHAR(100),
        debit_account_code   VARCHAR(20) NOT NULL,
        debit_account_name   VARCHAR(150) NOT NULL,
        debit_amount         DECIMAL(14,2) NOT NULL DEFAULT 0,
        credit_account_code  VARCHAR(20) NOT NULL,
        credit_account_name  VARCHAR(150) NOT NULL,
        credit_amount        DECIMAL(14,2) NOT NULL DEFAULT 0,
        narration            TEXT,
        status               VARCHAR(20) DEFAULT 'posted',
        created_by           INT,
        created_at           TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_general_journal_date ON general_journal_entries(entry_date DESC);
      CREATE INDEX IF NOT EXISTS idx_general_journal_module ON general_journal_entries(source_module);
    `);
    ledgerTablesReady = true;
  } catch (err) {
    console.error("ensureDoubleEntryTables error:", err.message);
  }
}

/**
 * Record a standard Double-Entry General Journal Entry (Dr & Cr Balanced)
 */
async function postGeneralJournal(client, {
  source_module,
  source_ref,
  journal_ref,
  debit_account,   // { code, name } or string code
  credit_account,  // { code, name } or string code
  amount,
  narration,
  user_id = null,
}) {
  await ensureDoubleEntryTables(client);
  const numAmount = parseFloat(amount) || 0;
  if (numAmount <= 0) return null;

  const dr = resolveAccount(debit_account);
  const cr = resolveAccount(credit_account);
  const jRef = journal_ref || `JRN-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  const res = await client.query(
    `
    INSERT INTO general_journal_entries (
      journal_ref, entry_date, source_module, source_ref,
      debit_account_code, debit_account_name, debit_amount,
      credit_account_code, credit_account_name, credit_amount,
      narration, status, created_by, created_at
    )
    VALUES ($1, CURRENT_DATE, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'posted', $11, NOW())
    RETURNING *
    `,
    [
      jRef,
      source_module,
      source_ref,
      dr.code,
      dr.name,
      numAmount,
      cr.code,
      cr.name,
      numAmount,
      narration,
      user_id,
    ]
  );

  return res.rows[0];
}

/**
 * Record a Perpetual Inventory Double-Entry Movement & Journal
 */
async function postInventoryDoubleEntry(client, {
  event_type,
  product_id,
  product_name,
  warehouse_id,
  quantity,
  unit_cost,
  debit_account,
  credit_account,
  reference,
  narration,
  user_id = null,
  balance_after_qty = null,
  balance_after_value = null,
}) {
  await ensureDoubleEntryTables(client);
  const qty = parseInt(quantity) || 0;
  const cost = parseFloat(unit_cost) || 0;
  const totalValue = Math.abs(qty) * cost;

  if (totalValue > 0) {
    const dr = resolveAccount(debit_account);
    const cr = resolveAccount(credit_account);

    // 1. Post to Inventory Financial Sub-Ledger
    await client.query(
      `
      INSERT INTO inventory_financial_ledger (
        entry_date, reference, event_type, product_id, product_name, warehouse_id,
        quantity, unit_cost, total_value,
        debit_account_code, debit_account_name,
        credit_account_code, credit_account_name,
        narration, balance_after_qty, balance_after_value,
        performed_by, created_at
      )
      VALUES (NOW(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW())
      `,
      [
        reference,
        event_type,
        product_id,
        product_name,
        warehouse_id,
        qty,
        cost,
        totalValue,
        dr.code,
        dr.name,
        cr.code,
        cr.name,
        narration,
        balance_after_qty,
        balance_after_value,
        user_id,
      ]
    );

    // 2. Post to Central General Journal
    await postGeneralJournal(client, {
      source_module: "inventory",
      source_ref: reference,
      journal_ref: `JRN-INV-${reference}`,
      debit_account,
      credit_account,
      amount: totalValue,
      narration,
      user_id,
    });
  }
}

module.exports = {
  COA,
  ensureDoubleEntryTables,
  postGeneralJournal,
  postInventoryDoubleEntry,
};
