const { Pool } = require("pg");
const path = require("path");
const crypto = require("crypto");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgres://henry:@localhost:5432/bemsfarm_db"
});

const { COA, postGeneralJournal, postInventoryDoubleEntry } = require("../src/utils/doubleEntryLedger");

async function simulateEnterpriseLifecycles() {
  console.log("================================================================================");
  console.log("         BEMS FARMS FULL-LIFECYCLE SIMULATION & DISCONNECTION TEST SUITE        ");
  console.log("================================================================================\n");

  const results = {
    passed: [],
    failed: []
  };

  const client = await pool.connect();

  try {
    // ──────────────────────────────────────────────────────────────────────────
    // FLOW 1: Customer Storefront Online Order & Monnify Webhook
    // ──────────────────────────────────────────────────────────────────────────
    console.log("[FLOW 1/4] Simulating Online Checkout, Monnify Webhook & Ledger Postings...");
    await client.query("BEGIN");

    const testOrderRef = `SIM-ORD-${Date.now().toString(36).toUpperCase()}`;
    const testTotal = 15500.00;
    const testDeliveryFee = 1500.00;
    const testSubtotal = 14000.00;

    // 1. Insert order
    await client.query(
      `
      INSERT INTO orders (
        id, order_ref, total, subtotal, delivery_fee, payment_method, payment_status, status,
        customer_name, customer_phone, delivery_city, source, created_at
      )
      VALUES ($1, $2, $3, $4, $5, 'monnify', 'paid', 'processing', 'Test Customer', '08012345678', 'Lekki Phase 1', 'Online Storefront', NOW())
      `,
      [testOrderRef, testOrderRef, testTotal, testSubtotal, testDeliveryFee]
    );

    // 2. Post Double Entry
    await postGeneralJournal(client, {
      source_module: "storefront_checkout",
      source_ref: testOrderRef,
      journal_ref: `JRN-${testOrderRef}`,
      debit_account: COA.ASSET_MONNIFY_VAULT,
      credit_account: COA.REVENUE_SALES,
      amount: testTotal,
      narration: `Simulated Online Order Checkout Payment: ${testOrderRef}`,
      created_by: 1
    });

    // 3. Post Inventory COGS
    const simCogs = 9500.00;
    await postInventoryDoubleEntry(client, {
      reference: testOrderRef,
      event_type: "online_sale",
      product_id: 1,
      product_name: "Fresh Farm Goods",
      quantity: 5,
      unit_cost: 1900.00,
      total_value: simCogs,
      debit_account: COA.EXPENSE_COGS,
      credit_account: COA.ASSET_INVENTORY_RAW,
      narration: `Simulated COGS deduction for ${testOrderRef}`,
      performed_by: 1
    });

    results.passed.push("FLOW 1: Online Checkout & Monnify Ledger Posting");
    await client.query("COMMIT");

    // ──────────────────────────────────────────────────────────────────────────
    // FLOW 2: Driver Delivery Dispatch, Completion & Wallet Earning
    // ──────────────────────────────────────────────────────────────────────────
    console.log("\n[FLOW 2/4] Simulating Driver Dispatch, Delivery Completion & Commission...");
    await client.query("BEGIN");

    // Fetch driver
    const drvRes = await client.query("SELECT id, name, wallet_balance, total_earnings FROM drivers LIMIT 1");
    if (drvRes.rows.length === 0) {
      throw new Error("No driver available in database for test");
    }
    const drv = drvRes.rows[0];
    const initialBal = parseFloat(drv.wallet_balance || 0);
    const commAmt = 1200.00;
    const testDelRef = `SIM-DEL-${Date.now().toString(36).toUpperCase()}`;

    // Insert delivery
    await client.query(
      `
      INSERT INTO deliveries (
        delivery_ref, order_id, driver_id, status, driver_commission_amount, delivered_at, created_at
      )
      VALUES ($1, $2, $3, 'delivered', $4, NOW(), NOW())
      `,
      [testDelRef, testOrderRef, drv.id, commAmt]
    );

    // Update driver wallet balance & total earnings atomically
    await client.query(
      `
      UPDATE drivers
      SET 
        total_deliveries = total_deliveries + 1,
        total_earnings = total_earnings + $1,
        wallet_balance = wallet_balance + $1,
        updated_at = NOW()
      WHERE id = $2
      `,
      [commAmt, drv.id]
    );

    // Post double entry delivery expense
    await postGeneralJournal(client, {
      source_module: "driver_wallet",
      source_ref: testDelRef,
      journal_ref: `JRN-COMM-${testDelRef}`,
      debit_account: COA.EXPENSE_DELIVERY_COMMISSION,
      credit_account: COA.DRIVER_WALLET_PAYABLE,
      amount: commAmt,
      narration: `Simulated Delivery Commission: ${testDelRef}`,
      created_by: 1
    });

    // Check driver balance
    const updatedDrvRes = await client.query("SELECT wallet_balance FROM drivers WHERE id = $1", [drv.id]);
    const finalBal = parseFloat(updatedDrvRes.rows[0].wallet_balance);
    if (Math.abs(finalBal - (initialBal + commAmt)) > 0.01) {
      throw new Error(`Driver balance mismatch: Expected ${initialBal + commAmt}, got ${finalBal}`);
    }

    results.passed.push("FLOW 2: Driver Delivery Completion & Atomic Wallet Sync");
    await client.query("COMMIT");

    // ──────────────────────────────────────────────────────────────────────────
    // FLOW 3: Driver Withdrawal Request & Admin Monnify Disbursement
    // ──────────────────────────────────────────────────────────────────────────
    console.log("\n[FLOW 3/4] Simulating Driver Payout Request & Monnify Vault Disbursement...");
    await client.query("BEGIN");

    const payoutRef = `SIM-PAY-${Date.now().toString(36).toUpperCase()}`;
    const withdrawAmt = 1200.00;

    // 1. Insert payout
    const payRes = await client.query(
      `
      INSERT INTO driver_payouts (
        driver_id, payout_ref, amount, bank_name, account_number, account_name, status, requested_at, created_at
      )
      VALUES ($1, $2, $3, 'GTBank', '0123456789', 'Driver Name', 'pending', NOW(), NOW())
      RETURNING id
      `,
      [drv.id, payoutRef, withdrawAmt]
    );

    // 2. Disburse payout
    await client.query(
      `
      UPDATE driver_payouts
      SET status = 'paid', processed_at = NOW(), gateway_reference = $1
      WHERE id = $2
      `,
      [`MNFY-DISB-${payoutRef}`, payRes.rows[0].id]
    );

    // 3. Deduct driver wallet balance
    await client.query(
      `
      UPDATE drivers
      SET wallet_balance = wallet_balance - $1, updated_at = NOW()
      WHERE id = $2
      `,
      [withdrawAmt, drv.id]
    );

    // 4. Double entry disbursement: Dr Driver Payable (2120), Cr Monnify Vault (1120)
    await postGeneralJournal(client, {
      source_module: "driver_disbursement",
      source_ref: payoutRef,
      journal_ref: `JRN-PAY-${payoutRef}`,
      debit_account: COA.DRIVER_WALLET_PAYABLE,
      credit_account: COA.ASSET_MONNIFY_VAULT,
      amount: withdrawAmt,
      narration: `Simulated Driver Bank Disbursement: ${payoutRef}`,
      created_by: 1
    });

    results.passed.push("FLOW 3: Driver Withdrawal & Monnify Vault Double-Entry Disbursement");
    await client.query("COMMIT");

    // ──────────────────────────────────────────────────────────────────────────
    // FLOW 4: Trial Balance Zero-Variance Verification Post-Simulation
    // ──────────────────────────────────────────────────────────────────────────
    console.log("\n[FLOW 4/4] Verifying Statutory Trial Balance Zero-Variance Integrity...");
    const tbRes = await client.query(`
      SELECT 
        COALESCE(SUM(debit_amount), 0) AS total_dr,
        COALESCE(SUM(credit_amount), 0) AS total_cr
      FROM general_journal_entries;
    `);

    const totalDr = parseFloat(tbRes.rows[0].total_dr);
    const totalCr = parseFloat(tbRes.rows[0].total_cr);
    const variance = Math.abs(totalDr - totalCr);

    if (variance > 0.001) {
      throw new Error(`Trial balance variance detected! Dr: ₦${totalDr}, Cr: ₦${totalCr}, Variance: ₦${variance}`);
    } else {
      results.passed.push(`FLOW 4: Statutory Trial Balance Reconciled (Total Dr: ₦${totalDr.toLocaleString()} = Total Cr: ₦${totalCr.toLocaleString()}, Variance: ₦0.00)`);
    }

  } catch (err) {
    await client.query("ROLLBACK");
    results.failed.push(`Simulation failed: ${err.message}`);
    console.error("Simulation error:", err);
  } finally {
    client.release();
  }

  console.log("\n================================================================================");
  console.log(`                     LIFECYCLE TEST RESULTS SUMMARY                             `);
  console.log("================================================================================\n");

  results.passed.forEach(p => console.log(` ✓ [PASS] ${p}`));
  results.failed.forEach(f => console.log(` ✗ [FAIL] ${f}`));

  console.log("\n================================================================================\n");

  await pool.end();
}

simulateEnterpriseLifecycles();
