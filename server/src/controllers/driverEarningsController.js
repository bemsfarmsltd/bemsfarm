const pool = require("../db/pool");
const crypto = require("crypto");

// ── GET /api/driver/earnings ─────────────────────────────────────────
// Get current wallet balance, commission breakdown, and payout history
const getEarnings = async (req, res, next) => {
  try {
    const driverId = req.driver.id;

    // Fetch driver wallet stats
    const driverResult = await pool.query(
      `
      SELECT 
        id,
        name,
        commission_per_delivery,
        total_deliveries,
        COALESCE(total_earnings, 0) AS total_earnings,
        wallet_account_number,
        COALESCE(wallet_bank_name, 'Monnify / Wema Bank') AS wallet_bank_name,
        COALESCE(wallet_account_name, CONCAT('BEMS - ', UPPER(name))) AS wallet_account_name,
        bank_name,
        account_number,
        account_name
      FROM drivers
      WHERE id = $1
      `,
      [driverId]
    );

    const driver = driverResult.rows[0];

    // Compute total paid out and pending payouts
    const payoutSummary = await pool.query(
      `
      SELECT 
        COALESCE(SUM(CASE WHEN status = 'paid' OR status = 'approved' THEN amount ELSE 0 END), 0) AS total_paid,
        COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) AS pending_payouts
      FROM driver_payouts
      WHERE driver_id = $1
      `,
      [driverId]
    );

    const totalEarned = parseFloat(driver.total_earnings) || 0;
    const totalPaid = parseFloat(payoutSummary.rows[0].total_paid) || 0;
    const pendingPayouts = parseFloat(payoutSummary.rows[0].pending_payouts) || 0;
    const availableBalance = Math.max(0, totalEarned - totalPaid - pendingPayouts);

    // Recent commission entries
    const commissionsResult = await pool.query(
      `
      SELECT 
        id,
        week_start,
        week_end,
        trips,
        deliveries,
        commission_per_delivery,
        total_earned,
        status,
        created_at
      FROM driver_commissions
      WHERE driver_id = $1
      ORDER BY created_at DESC
      LIMIT 20
      `,
      [driverId]
    );

    // Recent payout requests
    const payoutsResult = await pool.query(
      `
      SELECT 
        id,
        payout_ref,
        amount,
        bank_name,
        account_number,
        account_name,
        status,
        requested_at,
        processed_at,
        rejection_reason,
        notes
      FROM driver_payouts
      WHERE driver_id = $1
      ORDER BY requested_at DESC
      LIMIT 20
      `,
      [driverId]
    );

    res.json({
      wallet: {
        total_earned: totalEarned,
        total_paid: totalPaid,
        pending_payouts: pendingPayouts,
        available_balance: availableBalance,
        commission_per_delivery: parseFloat(driver.commission_per_delivery) || 500,
        dedicated_virtual_account: {
          account_number: driver.wallet_account_number || ('855' + String(driverId).padStart(7, '0')),
          bank_name: driver.wallet_bank_name || 'Monnify / Wema Bank',
          account_name: driver.wallet_account_name || ('BEMS - ' + (driver.name || 'DRIVER').toUpperCase()),
        },
        withdrawal_bank: {
          bank_name: driver.bank_name || null,
          account_number: driver.account_number || null,
          account_name: driver.account_name || null,
        },
      },
      commissions: commissionsResult.rows,
      payouts: payoutsResult.rows,
    });
  } catch (err) {
    console.error("Driver getEarnings error:", err.message);
    next(err);
  }
};

// ── POST /api/driver/withdraw ────────────────────────────────────────
// Request a payout/withdrawal of earnings to bank account
const requestWithdrawal = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const driverId = req.driver.id;
    const { amount, bank_name, account_number, account_name, notes } = req.body;

    const withdrawAmount = parseFloat(amount);
    if (!withdrawAmount || isNaN(withdrawAmount) || withdrawAmount <= 0) {
      return res.status(400).json({ message: "A valid positive withdrawal amount is required" });
    }

    await client.query("BEGIN");

    // Fetch driver for balance check and bank defaults
    const driverResult = await client.query(
      "SELECT total_earnings, bank_name, account_number, account_name FROM drivers WHERE id = $1 FOR UPDATE",
      [driverId]
    );

    if (driverResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Driver not found" });
    }

    const driver = driverResult.rows[0];
    const targetBank = bank_name || driver.bank_name;
    const targetAccNumber = account_number || driver.account_number;
    const targetAccName = account_name || driver.account_name;

    if (!targetBank || !targetAccNumber) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        message: "Bank name and account number are required for withdrawal",
      });
    }

    // Check existing paid/pending payouts
    const payoutSummary = await client.query(
      `
      SELECT 
        COALESCE(SUM(CASE WHEN status = 'paid' OR status = 'approved' THEN amount ELSE 0 END), 0) AS total_paid,
        COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) AS pending_payouts
      FROM driver_payouts
      WHERE driver_id = $1
      `,
      [driverId]
    );

    const totalEarned = parseFloat(driver.total_earnings) || 0;
    const totalPaid = parseFloat(payoutSummary.rows[0].total_paid) || 0;
    const pendingPayouts = parseFloat(payoutSummary.rows[0].pending_payouts) || 0;
    const availableBalance = Math.max(0, totalEarned - totalPaid - pendingPayouts);

    if (withdrawAmount > availableBalance) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        message: `Insufficient available balance. Available: ₦${availableBalance.toLocaleString()}, Requested: ₦${withdrawAmount.toLocaleString()}`,
        available_balance: availableBalance,
      });
    }

    // Generate unique payout ref
    const payoutRef = `PAY-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;

    // Insert payout request
    const insertResult = await client.query(
      `
      INSERT INTO driver_payouts (
        driver_id, payout_ref, amount, bank_name, account_number, 
        account_name, status, notes, requested_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7, NOW())
      RETURNING *
      `,
      [
        driverId,
        payoutRef,
        withdrawAmount,
        targetBank,
        targetAccNumber,
        targetAccName || null,
        notes || null,
      ]
    );

    // If new bank details provided, save them to driver profile for future convenience
    if (bank_name || account_number || account_name) {
      await client.query(
        `
        UPDATE drivers 
        SET 
          bank_name = COALESCE($1, bank_name),
          account_number = COALESCE($2, account_number),
          account_name = COALESCE($3, account_name),
          updated_at = NOW()
        WHERE id = $4
        `,
        [bank_name || null, account_number || null, account_name || null, driverId]
      );
    }

    await client.query("COMMIT");

    res.status(201).json({
      message: "Withdrawal request submitted successfully. It will be reviewed and processed by admin.",
      payout: insertResult.rows[0],
      remaining_available_balance: availableBalance - withdrawAmount,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Driver requestWithdrawal error:", err.message);
    next(err);
  } finally {
    client.release();
  }
};

module.exports = {
  getEarnings,
  requestWithdrawal,
};
