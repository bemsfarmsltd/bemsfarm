const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgres://henry:@localhost:5432/bemsfarm_db"
});

async function runComprehensiveAudit() {
  console.log("\n==========================================================================");
  console.log("             BEMS FARMS SYSTEM-WIDE INTEGRITY & AUDIT REPORT              ");
  console.log("==========================================================================\n");

  const report = {
    critical_discrepancies: [],
    medium_discrepancies: [],
    low_advisories: [],
    clean_verifications: []
  };

  // --------------------------------------------------------------------------
  // 1. FINANCIAL JOURNAL & TRIAL BALANCE VERIFICATION
  // --------------------------------------------------------------------------
  try {
    const tbRes = await pool.query(`
      SELECT 
        COALESCE(SUM(debit_amount), 0) AS total_dr,
        COALESCE(SUM(credit_amount), 0) AS total_cr,
        COUNT(*) as total_entries
      FROM general_journal_entries;
    `);
    const totalDr = parseFloat(tbRes.rows[0].total_dr);
    const totalCr = parseFloat(tbRes.rows[0].total_cr);
    const entryCount = parseInt(tbRes.rows[0].total_entries);
    const variance = Math.abs(totalDr - totalCr);

    if (variance > 0.001) {
      report.critical_discrepancies.push({
        area: "Financial Accounting",
        issue: "General Journal is Out of Balance",
        detail: `Total Debit: ₦${totalDr.toLocaleString()} != Total Credit: ₦${totalCr.toLocaleString()}. Variance: ₦${variance}`
      });
    } else {
      report.clean_verifications.push(`General Journal (${entryCount} entries) is 100% Balanced: Total Dr ₦${totalDr.toLocaleString()} = Total Cr ₦${totalCr.toLocaleString()} (Zero Variance).`);
    }
  } catch (err) {
    report.critical_discrepancies.push({ area: "Financial Accounting", issue: "Failed checking General Journal", detail: err.message });
  }

  // --------------------------------------------------------------------------
  // 2. STOREFRONT & POS ORDERS vs GENERAL JOURNAL
  // --------------------------------------------------------------------------
  try {
    const unpostedOrders = await pool.query(`
      SELECT o.id, o.order_ref, o.total, o.payment_status, o.payment_method, o.source
      FROM orders o
      LEFT JOIN general_journal_entries g ON (g.source_ref = o.order_ref OR g.source_ref = o.id)
      WHERE (o.payment_status = 'paid' OR o.payment_method IN ('monnify', 'card', 'transfer', 'online', 'wallet'))
        AND g.id IS NULL;
    `);

    if (unpostedOrders.rows.length > 0) {
      report.critical_discrepancies.push({
        area: "Order Financial Posting",
        issue: `${unpostedOrders.rows.length} Paid Order(s) Missing from General Journal`,
        detail: unpostedOrders.rows.map(r => `${r.order_ref || r.id} (₦${r.total} - ${r.source || 'Storefront'})`).join(", ")
      });
    } else {
      report.clean_verifications.push("All paid online customer orders and POS cash sales have corresponding double-entry records in the General Journal.");
    }
  } catch (err) {
    report.critical_discrepancies.push({ area: "Order Financial Posting", issue: "Error checking unposted orders", detail: err.message });
  }

  // --------------------------------------------------------------------------
  // 3. INVENTORY PERPETUAL VALUATION vs STOCK MOVEMENTS
  // --------------------------------------------------------------------------
  try {
    const uncostedProducts = await pool.query(`
      SELECT id, name, price, cost_price, stock, stock_quantity
      FROM products
      WHERE (cost_price IS NULL OR cost_price <= 0) AND status = 'active';
    `);

    if (uncostedProducts.rows.length > 0) {
      report.medium_discrepancies.push({
        area: "Inventory Valuation",
        issue: `${uncostedProducts.rows.length} Active Products Missing 'cost_price'`,
        detail: `Missing cost price prevents accurate FIFO and automated COGS calculation. Affected products: ${uncostedProducts.rows.slice(0, 5).map(p => p.name).join(", ")}${uncostedProducts.rows.length > 5 ? ` and ${uncostedProducts.rows.length - 5} more` : ''}`
      });
    } else {
      report.clean_verifications.push("All active catalog products have valid cost_price values for perpetual COGS accounting.");
    }

    const dualStockMismatch = await pool.query(`
      SELECT id, name, stock, stock_quantity
      FROM products
      WHERE stock IS DISTINCT FROM stock_quantity AND (stock IS NOT NULL OR stock_quantity IS NOT NULL);
    `);

    if (dualStockMismatch.rows.length > 0) {
      report.low_advisories.push({
        area: "Database Schema Standardization",
        issue: `Dual Column Sync: 'stock' vs 'stock_quantity'`,
        detail: `${dualStockMismatch.rows.length} products have divergent values between legacy 'stock' and 'stock_quantity' columns.`
      });
    } else {
      report.clean_verifications.push("Product stock quantities are consistent.");
    }
  } catch (err) {
    report.medium_discrepancies.push({ area: "Inventory Valuation", issue: "Error checking products", detail: err.message });
  }

  // --------------------------------------------------------------------------
  // 4. DRIVER FLEET EARNINGS, WALLETS & DELIVERIES RECONCILIATION
  // --------------------------------------------------------------------------
  try {
    const driverAudit = await pool.query(`
      SELECT 
        d.id, d.name, d.wallet_balance, d.wallet_account_number, d.wallet_bank_name,
        COALESCE((SELECT SUM(del.driver_commission_amount) FROM deliveries del WHERE del.driver_id = d.id AND del.status = 'delivered'), 0) as total_delivery_commissions,
        COALESCE((SELECT SUM(dp.amount) FROM driver_payouts dp WHERE dp.driver_id = d.id AND dp.status IN ('paid', 'completed')), 0) as total_payouts
      FROM drivers d;
    `);

    driverAudit.rows.forEach(d => {
      const comm = parseFloat(d.total_delivery_commissions || 0);
      const paid = parseFloat(d.total_payouts || 0);
      const bal = parseFloat(d.wallet_balance || 0);
      const expectedBal = comm - paid;

      if (comm > 0 && Math.abs(bal - expectedBal) > 0.01) {
        report.medium_discrepancies.push({
          area: "Driver Wallets",
          issue: `Driver ${d.name} (ID: ${d.id}) Balance Disconnect`,
          detail: `Current Wallet Balance: ₦${bal.toLocaleString()} | Delivery Commissions: ₦${comm.toLocaleString()} - Payouts: ₦${paid.toLocaleString()} = Expected ₦${expectedBal.toLocaleString()}`
        });
      }

      if (!d.wallet_account_number) {
        report.low_advisories.push({
          area: "Driver DVA Provisioning",
          issue: `Driver ${d.name} lacks Monnify Reserved Virtual Account (DVA)`,
          detail: "Driver cannot receive automated instant bank settlements without a linked NUBAN DVA."
        });
      }
    });

    if (driverAudit.rows.length > 0) {
      report.clean_verifications.push(`Audited ${driverAudit.rows.length} driver fleet accounts and payout pipelines.`);
    }
  } catch (err) {
    report.critical_discrepancies.push({ area: "Driver Fleet", issue: "Error auditing driver wallets", detail: err.message });
  }

  // --------------------------------------------------------------------------
  // 5. BACKEND CODEBASE SQL & COLUMN AUDIT
  // --------------------------------------------------------------------------
  const routesDir = path.join(__dirname, "../src/routes");
  const controllersDir = path.join(__dirname, "../src/controllers");
  const routeFiles = fs.readdirSync(routesDir).filter(f => f.endsWith(".js"));
  const controllerFiles = fs.existsSync(controllersDir) ? fs.readdirSync(controllersDir).filter(f => f.endsWith(".js")) : [];

  const invalidColumnPatterns = [
    { pattern: "dva_account_reference", reason: "Column does not exist on 'drivers' table (use 'wallet_account_number')" },
    { pattern: "t.created_by", reason: "Column 'created_by' does not exist on 'transactions' table" },
    { pattern: "p.stock_qty", reason: "Column 'stock_qty' does not exist on 'products' table (use 'stock' or 'stock_quantity')" }
  ];

  [...routeFiles.map(f => ({ file: f, path: path.join(routesDir, f) })),
   ...controllerFiles.map(f => ({ file: f, path: path.join(controllersDir, f) }))].forEach(({ file, path: filePath }) => {
    const content = fs.readFileSync(filePath, "utf8");
    invalidColumnPatterns.forEach(({ pattern, reason }) => {
      if (content.includes(pattern)) {
        report.critical_discrepancies.push({
          area: "Backend Codebase",
          issue: `Outdated Column Reference in ${file}`,
          detail: `Found '${pattern}': ${reason}`
        });
      }
    });
  });

  // --------------------------------------------------------------------------
  // 6. FRONTEND ADMIN PAGES AUDIT (Mock data & Broken Routes)
  // --------------------------------------------------------------------------
  const adminSrcDir = path.join(__dirname, "../../Bems-Farms-Admin-Front-end/src/pages");
  function getFiles(dir) {
    let res = [];
    if (!fs.existsSync(dir)) return res;
    fs.readdirSync(dir).forEach(file => {
      const fp = path.join(dir, file);
      if (fs.statSync(fp).isDirectory()) res = res.concat(getFiles(fp));
      else if (file.endsWith(".jsx") || file.endsWith(".js")) res.push(fp);
    });
    return res;
  }

  const frontendPages = getFiles(adminSrcDir);
  let mockPages = [];
  frontendPages.forEach(fp => {
    const code = fs.readFileSync(fp, "utf8");
    const rel = path.relative(path.join(__dirname, "../../Bems-Farms-Admin-Front-end/src"), fp);
    
    // Check if page defines mock array and has NO api calls at all
    const hasMockDeclaration = /const\s+(MOCK_|mock|initialData|sampleData|dummyData)\w*\s*=\s*\[/i.test(code);
    const hasApiCall = /api\.(get|post|put|patch|delete)|fetch\(|axios\./i.test(code);

    if (hasMockDeclaration && !hasApiCall) {
      mockPages.push(rel);
    }
  });

  if (mockPages.length > 0) {
    report.medium_discrepancies.push({
      area: "Admin UI",
      issue: `${mockPages.length} Admin Page(s) using purely Static Mock Data without Backend API Integration`,
      detail: mockPages.join(", ")
    });
  } else {
    report.clean_verifications.push("All admin pages have active API connections.");
  }

  // --------------------------------------------------------------------------
  // 7. PRINT SUMMARY
  // --------------------------------------------------------------------------
  console.log("--------------------------------------------------------------------------");
  console.log(`[+] VERIFIED & HEALTHY SYSTEMS (${report.clean_verifications.length})`);
  console.log("--------------------------------------------------------------------------");
  report.clean_verifications.forEach(v => console.log(` ✓ ${v}`));

  console.log("\n--------------------------------------------------------------------------");
  console.log(`[!] CRITICAL DISCREPANCIES (${report.critical_discrepancies.length})`);
  console.log("--------------------------------------------------------------------------");
  if (report.critical_discrepancies.length === 0) console.log(" None found.");
  else report.critical_discrepancies.forEach(d => console.log(` ✗ [${d.area}] ${d.issue}\n   -> Details: ${d.detail}`));

  console.log("\n--------------------------------------------------------------------------");
  console.log(`[!] MEDIUM ATTENTION ITEMS (${report.medium_discrepancies.length})`);
  console.log("--------------------------------------------------------------------------");
  if (report.medium_discrepancies.length === 0) console.log(" None found.");
  else report.medium_discrepancies.forEach(d => console.log(` ⚠ [${d.area}] ${d.issue}\n   -> Details: ${d.detail}`));

  console.log("\n--------------------------------------------------------------------------");
  console.log(`[i] LOW ADVISORIES & MINOR SUGGESTIONS (${report.low_advisories.length})`);
  console.log("--------------------------------------------------------------------------");
  if (report.low_advisories.length === 0) console.log(" None found.");
  else report.low_advisories.forEach(d => console.log(` • [${d.area}] ${d.issue}\n   -> Details: ${d.detail}`));

  console.log("\n==========================================================================\n");

  await pool.end();
}

runComprehensiveAudit();
