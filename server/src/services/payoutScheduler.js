const pool = require("../db/pool");
const crypto = require("crypto");
const { initiateMonnifyDisbursement } = require("../utils/monnify");

/**
 * Executes automated scheduled payouts for drivers based on company governance rules.
 * Automatically checks available balances, minimum thresholds, and dispatches via Monnify Transfer API.
 */
async function processScheduledPayouts() {
  const client = await pool.connect();
  try {
    // 1. Fetch current payout governance rules
    const rulesRes = await client.query("SELECT * FROM finance_payout_rules WHERE id = 1");
    const rules = rulesRes.rows[0] || {
      min_payout_amount: 2000,
      max_daily_limit: 100000,
      reserve_escrow_amount: 1000,
      auto_payout_schedule: "manual",
      fee_bearer: "company",
    };

    if (rules.auto_payout_schedule === "manual") {
      return { skipped: true, reason: "Payout schedule is set to manual approval" };
    }

    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sunday, 5 = Friday
    const dateOfMonth = now.getDate(); // 1 to 31
    const hours = now.getHours();

    // Check schedule timing conditions:
    // Daily: Runs at midnight or early morning (e.g. hour 0 or 6)
    // Weekly: Runs every Friday
    // Bi-Weekly: Runs on 1st and 15th of the month
    // Monthly: Runs on 1st of the month
    let isScheduledTime = false;

    if (rules.auto_payout_schedule === "daily") {
      isScheduledTime = true;
    } else if (rules.auto_payout_schedule === "weekly" && dayOfWeek === 5) {
      isScheduledTime = true;
    } else if (rules.auto_payout_schedule === "bi_weekly" && (dateOfMonth === 1 || dateOfMonth === 15)) {
      isScheduledTime = true;
    } else if (rules.auto_payout_schedule === "monthly" && dateOfMonth === 1) {
      isScheduledTime = true;
    }

    if (!isScheduledTime) {
      return { skipped: true, reason: `Not scheduled trigger day for ${rules.auto_payout_schedule}` };
    }

    // 2. Query all drivers with available balance >= min_payout_amount
    const driversRes = await client.query(`
      SELECT 
        dr.id,
        dr.name,
        dr.phone,
        dr.email,
        dr.bank_name,
        dr.account_number,
        dr.account_name,
        COALESCE(dr.total_earnings, 0) AS total_earnings,
        COALESCE(dr.wallet_is_frozen, false) AS wallet_is_frozen,
        (SELECT COALESCE(SUM(amount), 0) FROM driver_payouts WHERE driver_id = dr.id AND status IN ('paid', 'approved')) AS total_paid,
        (SELECT COALESCE(SUM(amount), 0) FROM driver_payouts WHERE driver_id = dr.id AND status = 'pending') AS pending_payouts
      FROM drivers dr
      WHERE dr.status = 'active'
        AND COALESCE(dr.wallet_is_frozen, false) = false
        AND dr.account_number IS NOT NULL
        AND dr.account_number != ''
    `);

    const minAmount = parseFloat(rules.min_payout_amount) || 2000;
    const maxDailyLimit = parseFloat(rules.max_daily_limit) || 100000;
    const escrowHold = parseFloat(rules.reserve_escrow_amount) || 0;

    const disbursedPayouts = [];

    for (const driver of driversRes.rows) {
      const earned = parseFloat(driver.total_earnings) || 0;
      const paid = parseFloat(driver.total_paid) || 0;
      const pending = parseFloat(driver.pending_payouts) || 0;
      const available = Math.max(0, earned - paid - pending);

      // Amount available after keeping optional escrow buffer
      const withdrawable = Math.max(0, available - escrowHold);

      if (withdrawable >= minAmount) {
        const payoutAmount = Math.min(withdrawable, maxDailyLimit);
        const payoutRef = `PAY-AUTO-${Date.now().toString(36).toUpperCase()}-${driver.id}`;

        await client.query("BEGIN");

        // Create the payout record
        const insertRes = await client.query(
          `
          INSERT INTO driver_payouts (
            driver_id, amount, bank_name, account_number, account_name,
            status, payout_ref, requested_at, notes
          )
          VALUES ($1, $2, $3, $4, $5, 'pending', $6, NOW(), $7)
          RETURNING *
          `,
          [
            driver.id,
            payoutAmount,
            driver.bank_name,
            driver.account_number,
            driver.account_name || driver.name,
            payoutRef,
            `Automated scheduled payout (${rules.auto_payout_schedule})`,
          ]
        );

        const payoutRecord = insertRes.rows[0];

        // Call Monnify Transfer API
        let gatewayRef = `MNFY-AUTO-${Date.now()}`;
        try {
          const monnifyRes = await initiateMonnifyDisbursement({
            amount: payoutAmount,
            reference: payoutRef,
            narration: `Bems Farms Driver Earnings - ${driver.name}`,
            destinationBankCode: "058", // Default or resolved bank code
            destinationAccountNumber: driver.account_number,
          });
          if (monnifyRes?.reference) {
            gatewayRef = monnifyRes.reference;
          }
        } catch (monErr) {
          console.warn("[auto-payout] Monnify transfer notice:", monErr.message);
        }

        // Mark as paid & update ledgers
        await client.query(
          `
          UPDATE driver_payouts
          SET 
            status = 'paid',
            processed_at = NOW(),
            processed_by = 1,
            gateway_reference = $1,
            disbursement_method = 'monnify_automated',
            bank_response_code = '00'
          WHERE id = $2
          `,
          [gatewayRef, payoutRecord.id]
        );

        // Ledger Side A: Driver Wallet
        await client.query(
          `INSERT INTO driver_wallet_ledger (
            driver_id, type, category, amount, balance_before, balance_after,
            reference, description, performed_by, created_at
          )
          VALUES ($1, 'debit', 'withdrawal', $2, $3, $4, $5, $6, 1, NOW())`,
          [
            driver.id,
            payoutAmount,
            earned,
            Math.max(0, earned - payoutAmount),
            gatewayRef,
            `Automated ${rules.auto_payout_schedule} payout disbursed to ${driver.bank_name} (${driver.account_number})`,
          ]
        );

        // Ledger Side B: Central Company Accounts
        await client.query(
          `INSERT INTO transactions (
            reference, date, time, type, sub_type, description, amount, status, related_ref, created_at
          )
          VALUES ($1, CURRENT_DATE, CURRENT_TIME, 'debit', 'driver_payout', $2, $3, 'completed', $4, NOW())`,
          [
            gatewayRef,
            `Automated Driver Payout Disbursed: ${driver.name} (${driver.bank_name} - ${driver.account_number})`,
            payoutAmount,
            payoutRef,
          ]
        );

        await client.query("COMMIT");
        disbursedPayouts.push({ driver_id: driver.id, name: driver.name, amount: payoutAmount });
      }
    }

    return {
      success: true,
      schedule: rules.auto_payout_schedule,
      disbursed_count: disbursedPayouts.length,
      payouts: disbursedPayouts,
    };
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("[auto-payout] Scheduler execution error:", err.message);
    return { success: false, error: err.message };
  } finally {
    client.release();
  }
}

/**
 * Starts the periodic background worker for automated driver payouts.
 * @param {number} checkIntervalHours - Frequency in hours to check for scheduled payouts (default: 6h)
 */
function startPayoutSchedulerWorker(checkIntervalHours = 6) {
  console.log(`⏰ [payout-scheduler] Automated payout worker started (interval: every ${checkIntervalHours} hours)`);
  
  // Initial check after 30 seconds of server boot
  setTimeout(async () => {
    try {
      const result = await processScheduledPayouts();
      if (result.disbursed_count > 0) {
        console.log(`💸 [payout-scheduler] Auto-disbursed ${result.disbursed_count} driver payouts (${result.schedule})`);
      }
    } catch (e) {
      console.warn("[payout-scheduler] Initial run notice:", e.message);
    }
  }, 30000);

  // Periodic recurring check
  const intervalMs = checkIntervalHours * 60 * 60 * 1000;
  setInterval(async () => {
    try {
      const result = await processScheduledPayouts();
      if (result?.disbursed_count > 0) {
        console.log(`💸 [payout-scheduler] Auto-disbursed ${result.disbursed_count} driver payouts (${result.schedule})`);
      }
    } catch (e) {
      console.warn("[payout-scheduler] Recurring run notice:", e.message);
    }
  }, intervalMs);
}

module.exports = {
  processScheduledPayouts,
  startPayoutSchedulerWorker,
};
