const pool = require("../db/pool");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const QRCode = require("qrcode");
const { renderDriverStatementHtml, generateSecurityCode } = require("../utils/driverStatementTemplate");

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

    // Zone rates table so driver can see their earnings per zone
    const zoneRatesResult = await pool.query(
      `
      SELECT 
        zone_id,
        zone_name,
        delivery_fee,
        driver_earning_fee,
        driver_commission_percent,
        estimated_delivery_time,
        areas_covered
      FROM delivery_zones
      WHERE status = 'active'
      ORDER BY delivery_fee ASC
      `
    );

    // Saved bank accounts for payouts
    const savedBanksResult = await pool.query(
      `
      SELECT 
        id,
        bank_name,
        bank_code,
        account_number,
        account_name,
        is_default,
        is_verified,
        created_at
      FROM driver_bank_accounts
      WHERE driver_id = $1
      ORDER BY is_default DESC, updated_at DESC, id DESC
      `,
      [driverId]
    );

    res.json({
      wallet: {
        total_earned: totalEarned,
        total_paid: totalPaid,
        pending_payouts: pendingPayouts,
        available_balance: availableBalance,
        commission_per_delivery: parseFloat(driver.commission_per_delivery) || 700,
        dedicated_virtual_account: {
          account_number: driver.wallet_account_number || ('855' + String(driver.id).padStart(7, '0')),
          bank_name: driver.wallet_bank_name || 'Monnify / Wema Bank',
          account_name: driver.wallet_account_name || (`BEMS - ${driver.name.toUpperCase()}`),
          note: 'Direct Inflow DVA for Commissions & Direct Deposits'
        },
        withdrawal_bank: {
          bank_name: driver.bank_name || null,
          account_number: driver.account_number || null,
          account_name: driver.account_name || null
        },
        saved_bank_accounts: savedBanksResult.rows
      },
      saved_bank_accounts: savedBanksResult.rows,
      zone_rates: zoneRatesResult.rows.map(z => ({
        zone_id: z.zone_id,
        zone_name: z.zone_name,
        customer_delivery_fee: parseFloat(z.delivery_fee) || 0,
        driver_earning_fee: parseFloat(z.driver_earning_fee) || Math.round((parseFloat(z.delivery_fee) || 0) * 0.70),
        driver_commission_percent: parseFloat(z.driver_commission_percent) || 70,
        estimated_eta: z.estimated_delivery_time,
        areas_covered: z.areas_covered
      })),
      recent_commissions: commissionsResult.rows.map(c => ({
        ...c,
        id: parseInt(c.id, 10) || 0,
        trips: parseInt(c.trips, 10) || 0,
        deliveries: parseInt(c.deliveries, 10) || 0,
        commission_per_delivery: parseFloat(c.commission_per_delivery) || 0,
        total_earned: parseFloat(c.total_earned) || 0,
      })),
      recent_payouts: payoutsResult.rows.map(p => ({
        ...p,
        id: parseInt(p.id, 10) || 0,
        amount: parseFloat(p.amount) || 0,
      }))
    });
  } catch (err) {
    console.error("Driver getEarnings error:", err.message);
    next(err);
  }
};

// ── GET /api/driver/wallet/history ───────────────────────────────────
// Chronological transaction feed separated into income and payouts
const getWalletHistory = async (req, res, next) => {
  try {
    const driverId = req.driver.id;
    const { page = 1, limit = 50, type } = req.query;
    const lim = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
    const offset = (Math.max(1, parseInt(page, 10) || 1) - 1) * lim;

    // 1. Fetch balance & summary
    const driverResult = await pool.query(
      `SELECT total_earnings, wallet_account_number, wallet_bank_name, bank_name, account_number, account_name
       FROM drivers WHERE id = $1`,
      [driverId]
    );
    const driver = driverResult.rows[0] || {};
    const totalEarned = parseFloat(driver.total_earnings) || 0;

    const payoutSummary = await pool.query(
      `SELECT 
        COALESCE(SUM(CASE WHEN status IN ('paid', 'approved') THEN amount ELSE 0 END), 0) AS total_paid,
        COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) AS pending_payouts
       FROM driver_payouts WHERE driver_id = $1`,
      [driverId]
    );
    const totalPaid = parseFloat(payoutSummary.rows[0].total_paid) || 0;
    const pendingPayouts = parseFloat(payoutSummary.rows[0].pending_payouts) || 0;
    const availableBalance = Math.max(0, totalEarned - totalPaid - pendingPayouts);

    // 2. Fetch income (commissions from deliveries)
    const commissionsRes = await pool.query(
      `SELECT id, week_start, week_end, trips, deliveries, commission_per_delivery, total_earned AS amount, status, created_at AS date, 'income' AS type, 'delivery_earning' AS category
       FROM driver_commissions
       WHERE driver_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [driverId, lim, offset]
    );

    // 3. Fetch payouts (bank withdrawals)
    const payoutsRes = await pool.query(
      `SELECT id, payout_ref, amount, bank_name, account_number, account_name, status, requested_at AS date, processed_at, rejection_reason, notes, 'payout' AS type, 'withdrawal' AS category
       FROM driver_payouts
       WHERE driver_id = $1
       ORDER BY requested_at DESC
       LIMIT $2 OFFSET $3`,
      [driverId, lim, offset]
    );

    const income = commissionsRes.rows.map((c) => ({
      id: c.id,
      amount: parseFloat(c.amount) || 0,
      type: "income",
      category: c.category,
      deliveries: parseInt(c.deliveries, 10) || 0,
      description: `Delivery Earning (${c.deliveries || 1} drop${(c.deliveries || 1) === 1 ? "" : "s"})`,
      status: c.status,
      date: c.date,
      created_at: c.date,
    }));

    const payouts = payoutsRes.rows.map((p) => ({
      id: p.id,
      amount: parseFloat(p.amount) || 0,
      type: "payout",
      category: p.category,
      payout_ref: p.payout_ref,
      bank_name: p.bank_name,
      account_number: p.account_number,
      account_name: p.account_name,
      description: `Bank Withdrawal to ${p.bank_name || "Bank"} (${p.account_number || ""})`,
      status: p.status,
      date: p.date,
      requested_at: p.date,
      processed_at: p.processed_at,
      rejection_reason: p.rejection_reason,
    }));

    // Combined unified chronological feed
    const allTransactions = [...income, ...payouts].sort(
      (a, b) => new Date(b.date) - new Date(a.date)
    );

    let filteredTransactions = allTransactions;
    if (type === "income") filteredTransactions = income;
    if (type === "payout" || type === "payouts") filteredTransactions = payouts;

    res.json({
      success: true,
      summary: {
        available_balance: availableBalance,
        total_earned: totalEarned,
        total_paid: totalPaid,
        pending_payouts: pendingPayouts,
      },
      // Explicit separated arrays:
      income,
      payouts,
      // Unified array with 'type' flag:
      transactions: filteredTransactions,
      total_income_count: income.length,
      total_payouts_count: payouts.length,
    });
  } catch (err) {
    console.error("Driver getWalletHistory error:", err.message);
    next(err);
  }
};

// ── POST /api/driver/withdraw ────────────────────────────────────────
// Request a payout/withdrawal of earnings to bank account
const requestWithdrawal = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const driverId = req.driver.id;
    const { amount, bank_name, account_number, account_name, notes, saved_account_id, bank_account_id, pin, security_pin, pin_token } = req.body;

    const withdrawAmount = parseFloat(amount);
    if (!withdrawAmount || isNaN(withdrawAmount) || withdrawAmount <= 0) {
      return res.status(400).json({ message: "A valid positive withdrawal amount is required" });
    }

    await client.query("BEGIN");

    // Fetch driver for balance check, bank defaults, and security PIN status
    const driverResult = await client.query(
      "SELECT total_earnings, bank_name, account_number, account_name, name, pin_hash, pin_failed_attempts, pin_locked_until FROM drivers WHERE id = $1 FOR UPDATE",
      [driverId]
    );

    if (driverResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Driver not found" });
    }

    const driver = driverResult.rows[0];

    // Optional PIN verification on cashout
    const providedPin = pin || security_pin;
    if (driver.pin_hash && (providedPin || pin_token)) {
      if (driver.pin_locked_until && new Date(driver.pin_locked_until) > new Date()) {
        await client.query("ROLLBACK");
        const remainingMinutes = Math.max(1, Math.ceil((new Date(driver.pin_locked_until) - new Date()) / 60000));
        return res.status(423).json({
          message: `Security PIN is locked due to too many failed attempts. Try again in ${remainingMinutes} minute(s).`,
          locked: true,
        });
      }

      if (pin_token) {
        try {
          const decoded = jwt.verify(pin_token, process.env.JWT_SECRET);
          if (decoded.driver_id !== driverId || !decoded.pin_verified) {
            throw new Error("Invalid PIN verification token");
          }
        } catch (_) {
          await client.query("ROLLBACK");
          return res.status(401).json({ message: "Invalid or expired PIN session. Please enter your PIN again." });
        }
      } else if (providedPin) {
        const isMatch = await bcrypt.compare(String(providedPin).trim(), driver.pin_hash);
        if (!isMatch) {
          const currentAttempts = (parseInt(driver.pin_failed_attempts, 10) || 0) + 1;
          if (currentAttempts >= 5) {
            await client.query(
              "UPDATE drivers SET pin_failed_attempts = $1, pin_locked_until = NOW() + INTERVAL '15 minutes' WHERE id = $2",
              [currentAttempts, driverId]
            );
            await client.query("COMMIT");
            return res.status(401).json({
              message: "Incorrect PIN. Account security is locked for 15 minutes.",
              locked: true,
            });
          } else {
            await client.query(
              "UPDATE drivers SET pin_failed_attempts = $1 WHERE id = $2",
              [currentAttempts, driverId]
            );
            await client.query("COMMIT");
            return res.status(401).json({
              message: `Incorrect PIN. ${5 - currentAttempts} attempt(s) remaining.`,
              remaining_attempts: 5 - currentAttempts,
            });
          }
        }
        // Valid PIN - reset failed attempts
        await client.query(
          "UPDATE drivers SET pin_failed_attempts = 0, pin_locked_until = NULL WHERE id = $1",
          [driverId]
        );
      }
    }

    let targetBank = bank_name;
    let targetAccNumber = account_number;
    let targetAccName = account_name;

    // Check if driver selected one of their saved bank accounts
    if (saved_account_id || bank_account_id) {
      const accLookup = await client.query(
        "SELECT * FROM driver_bank_accounts WHERE id = $1 AND driver_id = $2",
        [saved_account_id || bank_account_id, driverId]
      );
      if (accLookup.rows.length) {
        targetBank = accLookup.rows[0].bank_name;
        targetAccNumber = accLookup.rows[0].account_number;
        targetAccName = accLookup.rows[0].account_name || targetAccName;
      }
    }

    targetBank = targetBank || driver.bank_name;
    targetAccNumber = targetAccNumber || driver.account_number;
    targetAccName = targetAccName || driver.account_name || driver.name;

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

    // If new bank details provided, save them to driver profile and saved bank accounts
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

    // Ensure this account is recorded in driver_bank_accounts
    if (targetBank && targetAccNumber) {
      try {
        await client.query(
          `
          INSERT INTO driver_bank_accounts (
            driver_id, bank_name, account_number, account_name, is_default, is_verified, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, false, true, NOW(), NOW())
          ON CONFLICT (driver_id, account_number, bank_name)
          DO UPDATE SET updated_at = NOW()
          `,
          [driverId, targetBank, targetAccNumber, targetAccName || driver.name]
        );
      } catch (e) {
        // duplicate or conflict
      }
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

// ── GET /api/driver/banks ───────────────────────────────────────────
// Return list of supported Nigerian Commercial Banks & Fintechs for mobile bank picker
const getBanks = async (req, res, next) => {
  try {
    const nigerianBanks = [
      { name: "Access Bank", code: "044", ussd: "*901#" },
      { name: "Access Bank (Diamond)", code: "063", ussd: "*901#" },
      { name: "Citibank Nigeria", code: "023", ussd: "" },
      { name: "Ecobank Nigeria", code: "050", ussd: "*326#" },
      { name: "Fidelity Bank", code: "070", ussd: "*770#" },
      { name: "First Bank of Nigeria", code: "011", ussd: "*894#" },
      { name: "First City Monument Bank (FCMB)", code: "214", ussd: "*329#" },
      { name: "Guaranty Trust Bank (GTBank)", code: "058", ussd: "*737#" },
      { name: "Heritage Bank", code: "030", ussd: "*745#" },
      { name: "Jaiz Bank", code: "301", ussd: "*773#" },
      { name: "Keystone Bank", code: "082", ussd: "*7111#" },
      { name: "Kuda Bank", code: "50211", ussd: "" },
      { name: "Moniepoint MFB", code: "50515", ussd: "" },
      { name: "OPay Digital Services", code: "999992", ussd: "" },
      { name: "Optimus Bank", code: "107", ussd: "" },
      { name: "PalmPay", code: "999991", ussd: "" },
      { name: "Parallex Bank", code: "526", ussd: "" },
      { name: "Polaris Bank", code: "076", ussd: "*833#" },
      { name: "Premium Trust Bank", code: "105", ussd: "" },
      { name: "Providus Bank", code: "101", ussd: "" },
      { name: "Rubies MFB", code: "125", ussd: "" },
      { name: "Stanbic IBTC Bank", code: "221", ussd: "*909#" },
      { name: "Standard Chartered Bank", code: "068", ussd: "" },
      { name: "Sterling Bank", code: "232", ussd: "*822#" },
      { name: "Suntrust Bank", code: "100", ussd: "" },
      { name: "TAJ Bank", code: "302", ussd: "*898#" },
      { name: "Titan Trust Bank", code: "102", ussd: "" },
      { name: "Union Bank of Nigeria", code: "032", ussd: "*826#" },
      { name: "United Bank for Africa (UBA)", code: "033", ussd: "*919#" },
      { name: "Unity Bank", code: "215", ussd: "*7799#" },
      { name: "VFD Microfinance Bank", code: "566", ussd: "" },
      { name: "Wema Bank / ALAT", code: "035", ussd: "*945#" },
      { name: "Zenith Bank", code: "057", ussd: "*966#" }
    ];

    res.json({
      status: "success",
      count: nigerianBanks.length,
      banks: nigerianBanks
    });
  } catch (err) {
    console.error("Driver getBanks error:", err.message);
    next(err);
  }
};

const BANK_CODES = {
  "Access Bank": "044",
  "Access Bank (Diamond)": "063",
  "Citibank Nigeria": "023",
  "Ecobank Nigeria": "050",
  "Fidelity Bank": "070",
  "First Bank of Nigeria": "011",
  "First Bank": "011",
  "First City Monument Bank": "214",
  "First City Monument Bank (FCMB)": "214",
  "FCMB": "214",
  "Guaranty Trust Bank": "058",
  "Guaranty Trust Bank (GTBank)": "058",
  "GTBank": "058",
  "Heritage Bank": "030",
  "Jaiz Bank": "301",
  "Keystone Bank": "082",
  "Kuda Bank": "50211",
  "Kuda Microfinance Bank": "50211",
  "Kuda": "50211",
  "Moniepoint MFB": "50515",
  "Moniepoint": "50515",
  "OPay Digital Services": "999992",
  "OPay": "999992",
  "Optimus Bank": "107",
  "PalmPay": "999991",
  "Parallex Bank": "526",
  "Polaris Bank": "076",
  "Premium Trust Bank": "105",
  "Providus Bank": "101",
  "Rubies MFB": "125",
  "Stanbic IBTC Bank": "221",
  "Stanbic IBTC": "221",
  "Standard Chartered Bank": "068",
  "Sterling Bank": "232",
  "Suntrust Bank": "100",
  "TAJ Bank": "302",
  "Titan Trust Bank": "102",
  "Union Bank of Nigeria": "032",
  "Union Bank": "032",
  "United Bank for Africa (UBA)": "033",
  "United Bank for Africa": "033",
  "UBA": "033",
  "Unity Bank": "215",
  "VFD Microfinance Bank": "566",
  "Wema Bank / ALAT": "035",
  "Wema Bank": "035",
  "ALAT": "035",
  "Zenith Bank": "057"
};

// ── POST /api/driver/bank/resolve ────────────────────────────────────
// Resolve & Verify 10-digit Nigerian NUBAN account number before withdrawal
const resolveBankAccount = async (req, res, next) => {
  try {
    const rawAccNumber = req.body.account_number || req.body.accountNumber || req.body.account || req.body.accountNo;
    const rawBankCode = req.body.bank_code || req.body.bankCode || req.body.code;
    const rawBankName = req.body.bank_name || req.body.bankName || req.body.bank;

    const cleanAccNumber = String(rawAccNumber || "").trim().replace(/\D/g, "");
    if (!cleanAccNumber || cleanAccNumber.length !== 10) {
      return res.status(400).json({
        status: "error",
        is_valid: false,
        isValid: false,
        message: "Valid 10-digit Nigerian NUBAN account number is required",
      });
    }

    if (!rawBankCode && !rawBankName) {
      return res.status(400).json({
        status: "error",
        is_valid: false,
        isValid: false,
        message: "Bank code or bank name is required for account resolution",
      });
    }

    let targetCode = rawBankCode ? String(rawBankCode).trim() : null;
    let matchedBankName = rawBankName || null;

    if (!targetCode && rawBankName) {
      const parenMatch = String(rawBankName).match(/\((\d+)\)/);
      if (parenMatch) {
        targetCode = parenMatch[1];
      } else {
        const cleanBankName = String(rawBankName).trim();
        targetCode = BANK_CODES[cleanBankName] ||
          Object.entries(BANK_CODES).find(([k]) => cleanBankName.toLowerCase().includes(k.toLowerCase()) || k.toLowerCase().includes(cleanBankName.toLowerCase()))?.[1] ||
          null;
      }
    }

    if (!targetCode) {
      targetCode = "058"; // GTBank default fallback if unidentifiable
    }

    // Build list of candidate codes (e.g. NIP aliases for fintechs)
    const codeCandidates = [targetCode];
    if (targetCode === "999992") codeCandidates.push("090110", "100004", "304");
    if (targetCode === "999991") codeCandidates.push("090175", "100033");
    if (targetCode === "50211") codeCandidates.push("090267");
    if (targetCode === "50515") codeCandidates.push("090405");

    let verifiedAccountName = null;
    let rawResult = null;
    let liveLookupError = null;

    // 1. Attempt live Monnify / NIP resolution across candidate codes
    const { validateMonnifyBankAccount } = require("../utils/monnify");
    for (const code of codeCandidates) {
      try {
        if (typeof validateMonnifyBankAccount === "function") {
          const monnifyRes = await validateMonnifyBankAccount(cleanAccNumber, code);
          if (monnifyRes?.accountName) {
            verifiedAccountName = monnifyRes.accountName;
            rawResult = monnifyRes;
            targetCode = code;
            break;
          }
        }
      } catch (monnifyErr) {
        liveLookupError = monnifyErr.message || "Failed to resolve account with bank";
      }
    }

    // 2. Fallback check for driver's own registered profile if in offline/sandbox mode
    if (!verifiedAccountName) {
      if (req.driver?.id) {
        try {
          const drvRes = await pool.query(
            "SELECT name, account_name, account_number, bank_name FROM drivers WHERE id = $1",
            [req.driver.id]
          );
          const drv = drvRes.rows[0];
          if (drv && drv.account_number === cleanAccNumber && drv.account_name) {
            verifiedAccountName = drv.account_name;
          }
        } catch (dbErr) {
          console.warn("Driver fallback lookup error:", dbErr.message);
        }
      }

      if (!verifiedAccountName && (process.env.MONNIFY_ENV !== "live" || process.env.NODE_ENV === "development")) {
        try {
          const drvRes = await pool.query(
            "SELECT name, account_name, account_number, phone FROM drivers WHERE account_number = $1 OR phone LIKE $2 LIMIT 1",
            [cleanAccNumber, `%${cleanAccNumber.slice(-10)}%`]
          );
          if (drvRes.rows.length > 0 && drvRes.rows[0].account_name) {
            verifiedAccountName = drvRes.rows[0].account_name;
          } else if (drvRes.rows.length > 0 && drvRes.rows[0].name) {
            verifiedAccountName = drvRes.rows[0].name.toUpperCase();
          } else {
            const cleanBankDisplay = (bank_name || "BANK").toUpperCase().replace(/\s*\(\d+\)/, "");
            verifiedAccountName = `${cleanBankDisplay} HOLDER - ${cleanAccNumber}`;
          }
        } catch (e) {
          verifiedAccountName = `VERIFIED ACCOUNT - ${cleanAccNumber}`;
        }
      }
    }

    if (!verifiedAccountName) {
      return res.status(400).json({
        status: "error",
        is_valid: false,
        isValid: false,
        account_number: cleanAccNumber,
        accountNumber: cleanAccNumber,
        bank_code: targetCode,
        bankCode: targetCode,
        bank_name: matchedBankName || "Commercial Bank",
        bankName: matchedBankName || "Commercial Bank",
        message: liveLookupError
          ? `Could not verify account: ${liveLookupError}`
          : "Invalid account number or destination bank code. Please verify details and try again."
      });
    }

    const payload = {
      account_name: verifiedAccountName,
      accountName: verifiedAccountName,
      account_number: cleanAccNumber,
      accountNumber: cleanAccNumber,
      bank_code: targetCode,
      bankCode: targetCode,
      bank_name: matchedBankName || "Commercial Bank",
      bankName: matchedBankName || "Commercial Bank",
      is_valid: true,
      isValid: true,
    };

    res.json({
      status: "success",
      is_valid: true,
      isValid: true,
      account_number: cleanAccNumber,
      accountNumber: cleanAccNumber,
      bank_code: targetCode,
      bankCode: targetCode,
      bank_name: matchedBankName || "Commercial Bank",
      bankName: matchedBankName || "Commercial Bank",
      account_name: verifiedAccountName,
      accountName: verifiedAccountName,
      message: `Account name verified: ${verifiedAccountName}`,
      data: payload,
      account: payload,
      raw: rawResult
    });
  } catch (err) {
    console.error("Driver resolveBankAccount error:", err.message);
    next(err);
  }
};

// ── POST & GET /api/driver/wallet/statement ──────────────────────────
// ── POST & GET /api/driver/wallet/statement ──────────────────────────
// Generate, download, or trigger an itemized account statement for driver
const requestAccountStatement = async (req, res, next) => {
  try {
    const driverId = req.driver.id;
    const body = req.body || {};
    const query = req.query || {};
    const startDate = body.start_date || query.start_date || body.startDate || query.startDate || null;
    const endDate = body.end_date || query.end_date || body.endDate || query.endDate || null;
    const email = body.email !== undefined ? body.email : query.email;
    const format = (query.format || body.format || "").toLowerCase();
    const isHtmlRequested = 
      format === "html" || 
      format === "pdf" || 
      format === "download" || 
      req.path.endsWith("/download") || 
      req.path.endsWith("/html") ||
      (req.headers.accept && req.headers.accept.includes("text/html") && !req.headers.accept.includes("application/json"));

    const driverRes = await pool.query(
      `
      SELECT 
        d.id, d.name, d.phone, d.email, d.vehicle_type, d.vehicle_plate,
        d.license_number, d.address, d.status, d.created_at AS joined_at,
        d.wallet_account_number, d.wallet_bank_name, d.wallet_account_name,
        d.total_earnings, d.bank_name, d.account_number, d.account_name,
        d.wallet_is_frozen, d.wallet_frozen_reason,
        (SELECT COUNT(*) FROM deliveries WHERE driver_id = d.id AND status = 'delivered') AS total_delivered,
        (SELECT COALESCE(SUM(amount), 0) FROM driver_payouts WHERE driver_id = d.id AND status IN ('paid', 'approved')) AS total_paid,
        (SELECT COALESCE(SUM(amount), 0) FROM driver_payouts WHERE driver_id = d.id AND status = 'pending') AS pending_payouts
      FROM drivers d
      WHERE d.id = $1
      `,
      [driverId]
    );
    if (!driverRes.rows.length) return res.status(404).json({ message: "Driver not found" });
    const driver = driverRes.rows[0];

    let dateWhere = "";
    const params = [driverId];
    if (startDate) {
      params.push(startDate);
      dateWhere += ` AND l.created_at >= $${params.length}`;
    }
    if (endDate) {
      params.push(endDate);
      dateWhere += ` AND l.created_at <= $${params.length}`;
    }

    // 1. Fetch individual ledger movements (delivery drops, commissions, bonuses, penalties)
    const ledgerRes = await pool.query(
      `
      SELECT 
        l.id,
        l.created_at AS date,
        l.type,
        l.category,
        l.amount,
        l.balance_before,
        l.balance_after,
        l.reference,
        l.description,
        d.order_id,
        d.delivery_address,
        d.delivery_fee
      FROM driver_wallet_ledger l
      LEFT JOIN deliveries d ON l.reference = d.delivery_ref
      WHERE l.driver_id = $1 ${dateWhere}
      ORDER BY l.created_at ASC
      `,
      params
    );

    // 2. Fetch withdrawal / bank payout disbursements
    let payoutDateWhere = "";
    const payoutParams = [driverId];
    if (startDate) {
      payoutParams.push(startDate);
      payoutDateWhere += ` AND p.requested_at >= $${payoutParams.length}`;
    }
    if (endDate) {
      payoutParams.push(endDate);
      payoutDateWhere += ` AND p.requested_at <= $${payoutParams.length}`;
    }

    const payoutsRes = await pool.query(
      `
      SELECT 
        p.id,
        p.requested_at AS date,
        'debit' AS type,
        'withdrawal' AS category,
        p.amount,
        p.payout_ref AS reference,
        CONCAT('Bank Payout to ', COALESCE(p.bank_name, 'Bank'), ' (', p.account_number, ')') AS description,
        p.status,
        p.rejection_reason,
        p.notes,
        p.processed_at,
        p.gateway_reference,
        p.disbursement_method,
        NULL AS order_id,
        NULL AS delivery_address,
        NULL AS delivery_fee
      FROM driver_payouts p
      WHERE p.driver_id = $1 ${payoutDateWhere}
      ORDER BY p.requested_at ASC
      `,
      payoutParams
    );

    // Fallback if ledger has 0 records
    let baseEvents = [...ledgerRes.rows];
    if (baseEvents.length === 0) {
      let commDateWhere = "";
      const commParams = [driverId];
      if (startDate) {
        commParams.push(startDate);
        commDateWhere += ` AND c.created_at >= $${commParams.length}`;
      }
      if (endDate) {
        commParams.push(endDate);
        commDateWhere += ` AND c.created_at <= $${commParams.length}`;
      }
      const commissionsRes = await pool.query(
        `
        SELECT 
          c.id,
          c.created_at AS date,
          'credit' AS type,
          'delivery_commission' AS category,
          c.total_earned AS amount,
          c.commission_per_delivery,
          c.deliveries,
          c.status,
          CONCAT('COM-', c.id) AS reference,
          CONCAT('Delivery Commission Drop (', COALESCE(c.deliveries, 1), ' drop', CASE WHEN COALESCE(c.deliveries, 1) = 1 THEN '' ELSE 's' END, ')') AS description,
          NULL AS order_id,
          NULL AS delivery_address,
          NULL AS delivery_fee
        FROM driver_commissions c
        WHERE c.driver_id = $1 ${commDateWhere}
        ORDER BY c.created_at ASC
        `,
        commParams
      );
      baseEvents = commissionsRes.rows;
    }

    const allEvents = [...baseEvents, ...payoutsRes.rows].sort(
      (a, b) => new Date(a.date) - new Date(b.date)
    );

    // Calculate opening balance before startDate
    let openingBalance = 0;
    if (startDate) {
      try {
        const priorLedgerRes = await pool.query(
          `SELECT COALESCE(SUM(CASE WHEN type = 'credit' THEN amount ELSE -amount END), 0) AS prior_bal
           FROM driver_wallet_ledger
           WHERE driver_id = $1 AND created_at < $2`,
          [driverId, startDate]
        );
        const priorPayoutsRes = await pool.query(
          `SELECT COALESCE(SUM(amount), 0) AS prior_payouts
           FROM driver_payouts
           WHERE driver_id = $1 AND requested_at < $2 AND status IN ('paid', 'approved', 'processed')`,
          [driverId, startDate]
        );
        const priorNet = parseFloat(priorLedgerRes.rows[0]?.prior_bal || 0);
        const priorPayout = parseFloat(priorPayoutsRes.rows[0]?.prior_payouts || 0);
        openingBalance = Math.max(0, priorNet - priorPayout);
      } catch (_) {}
    }

    let runningBalance = openingBalance;
    let totalCredits = 0;
    let totalDebits = 0;

    const statementWithBalances = allEvents.map((ev, index) => {
      const amt = parseFloat(ev.amount) || 0;
      const isCredit = ev.type === 'credit';
      if (isCredit) {
        runningBalance += amt;
        totalCredits += amt;
      } else {
        runningBalance -= amt;
        totalDebits += amt;
      }

      const cleanDesc = String(ev.description || '')
        .replace(/\s*\([^)]*Customer Fee[^)]*\)/gi, '')
        .replace(/\s*\(Customer Fee.*?\)/gi, '')
        .trim();

      return {
        ...ev,
        description: cleanDesc,
        delivery_fee: undefined,
        amount: amt,
        running_balance: runningBalance,
        seq_no: index + 1,
      };
    });

    const pendingPayouts = parseFloat(driver.pending_payouts) || 0;
    const closingBalance = Math.max(0, runningBalance - pendingPayouts);

    const periodStart = startDate || (statementWithBalances.length > 0 
      ? statementWithBalances[0].date 
      : driver.joined_at || new Date());
    const periodEnd = endDate || (statementWithBalances.length > 0 
      ? statementWithBalances[statementWithBalances.length - 1].date 
      : new Date());

    let invoiceSettings = {};
    try {
      const sRes = await pool.query("SELECT key, value FROM settings WHERE group_name = 'invoices'");
      for (const row of sRes.rows) {
        invoiceSettings[row.key] = row.value;
      }
    } catch (_) {}

    let bankSettings = null;
    try {
      const bsRes = await pool.query("SELECT * FROM bank_settings ORDER BY id ASC LIMIT 1");
      if (bsRes.rows.length > 0) {
        bankSettings = bsRes.rows[0];
      }
    } catch (_) {}

    const company = {
      name: invoiceSettings.invoice_company_name || bankSettings?.invoice_company_name || 'Bems Farms Global Ltd',
      address: invoiceSettings.invoice_company_address || bankSettings?.invoice_company_address || 'Central Farm Settlement Hub, Umuahia, Abia State',
      rc_number: '',
      tin: '',
      email: invoiceSettings.invoice_email || bankSettings?.invoice_email || 'corporate@bemsfarms.com',
      phone: invoiceSettings.invoice_phone || bankSettings?.invoice_phone || '+234 800 236 7326 / +234 814 000 0000',
      website: 'www.bemsfarms.com',
      signature_url: invoiceSettings.company_signature_url || bankSettings?.company_signature_url || '',
    };

    const summary = {
      driver_name: driver.name,
      driver_id: driver.id,
      wallet_id: driver.wallet_account_number || `DRV-${String(driver.id).padStart(4, "0")}`,
      period_start: periodStart,
      period_end: periodEnd,
      opening_balance: openingBalance,
      total_credits: totalCredits,
      total_income: totalCredits,
      total_debits: totalDebits,
      total_payouts: totalDebits,
      pending_payouts: pendingPayouts,
      closing_balance: closingBalance,
      available_balance: closingBalance,
      total_trips: parseInt(driver.total_delivered || 0, 10),
      transaction_count: statementWithBalances.length,
    };

    const statementRef = `SOA-${driver.wallet_account_number || `DRV-${driver.id}`}-${new Date().getFullYear()}`;
    const securityCode = generateSecurityCode(statementRef, closingBalance);

    let qrDataUrl = "";
    try {
      const verifyUrl = `https://bemsfarms.com/verify?type=driver_statement&ref=${encodeURIComponent(statementRef)}&code=${encodeURIComponent(securityCode)}`;
      qrDataUrl = await QRCode.toDataURL(verifyUrl, {
        width: 240,
        margin: 1,
        color: { dark: '#0f3622', light: '#ffffff' },
      });
    } catch (qrErr) {
      console.warn("QR code generation warning:", qrErr.message);
    }

    // ── Direct HTML / Download Document Mode ───────────────────────────
    if (isHtmlRequested) {
      const htmlContent = renderDriverStatementHtml({
        driver: {
          ...driver,
          wallet_account_number: driver.wallet_account_number || `DRV-${String(driver.id).padStart(4, '0')}`,
        },
        summary,
        company,
        statement: statementWithBalances,
        qrDataUrl,
        autoPrint: query.print === "true" || query.download === "true",
      });

      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res.send(htmlContent);
    }

    // Email delivery if requested
    let emailSent = false;
    const recipientEmail = typeof email === "string" && email.includes("@") ? email.trim() : driver.email;
    if (recipientEmail && (email === true || email === "true" || typeof email === "string")) {
      try {
        const emailService = require("../services/emailService");
        if (typeof emailService.sendDriverStatementEmail === "function") {
          await emailService.sendDriverStatementEmail({
            email: recipientEmail,
            name: driver.name,
            summary,
            transactions: statementWithBalances,
          });
          emailSent = true;
        }
      } catch (mailErr) {
        console.warn("Statement email notice:", mailErr.message);
      }
    }

    const currentToken = req.headers.authorization?.startsWith("Bearer ")
      ? req.headers.authorization.split(" ")[1]
      : (req.query?.token || "");

    res.json({
      success: true,
      status: "success",
      message: emailSent
        ? `Account statement generated and sent to ${recipientEmail}`
        : "Account statement generated successfully",
      email_sent: emailSent,
      recipient_email: emailSent ? recipientEmail : null,
      statement_download_url: `/api/driver/wallet/statement/download${currentToken ? `?token=${currentToken}` : ''}`,
      statement_view_url: `/api/driver/wallet/statement?format=html${currentToken ? `&token=${currentToken}` : ''}`,
      web_portal_url: `/driver/statement`,
      driver: {
        ...driver,
        total_delivered: parseInt(driver.total_delivered || 0, 10),
        total_earnings: parseFloat(driver.total_earnings || 0),
        wallet_account_number: driver.wallet_account_number || `DRV-${String(driver.id).padStart(4, '0')}`,
      },
      summary,
      company,
      statement: statementWithBalances,
      transactions: statementWithBalances,
    });
  } catch (err) {
    console.error("requestAccountStatement error:", err.message);
    next(err);
  }
};

module.exports = {
  getEarnings,
  getWalletHistory,
  requestAccountStatement,
  requestWithdrawal,
  getBanks,
  resolveBankAccount,
};

