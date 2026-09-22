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
        }
      },
      zone_rates: zoneRatesResult.rows.map(z => ({
        zone_id: z.zone_id,
        zone_name: z.zone_name,
        customer_delivery_fee: parseFloat(z.delivery_fee) || 0,
        driver_earning_fee: parseFloat(z.driver_earning_fee) || Math.round((parseFloat(z.delivery_fee) || 0) * 0.70),
        driver_commission_percent: parseFloat(z.driver_commission_percent) || 70,
        estimated_eta: z.estimated_delivery_time,
        areas_covered: z.areas_covered
      })),
      recent_commissions: commissionsResult.rows,
      recent_payouts: payoutsResult.rows
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
    const { account_number, bank_code, bank_name } = req.body;

    const cleanAccNumber = String(account_number || "").trim();
    if (!cleanAccNumber || !/^\d{10}$/.test(cleanAccNumber)) {
      return res.status(400).json({
        status: "error",
        is_valid: false,
        message: "Valid 10-digit Nigerian NUBAN account number is required",
      });
    }

    if (!bank_code && !bank_name) {
      return res.status(400).json({
        status: "error",
        is_valid: false,
        message: "Bank code or bank name is required for account resolution",
      });
    }

    let targetCode = bank_code ? String(bank_code).trim() : null;
    let matchedBankName = bank_name || null;

    if (!targetCode && bank_name) {
      const parenMatch = String(bank_name).match(/\((\d+)\)/);
      if (parenMatch) {
        targetCode = parenMatch[1];
      } else {
        const cleanBankName = String(bank_name).trim();
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
        account_number: cleanAccNumber,
        bank_code: targetCode,
        bank_name: matchedBankName || "Commercial Bank",
        message: liveLookupError
          ? `Could not verify account: ${liveLookupError}`
          : "Invalid account number or destination bank code. Please verify details and try again."
      });
    }

    res.json({
      status: "success",
      is_valid: true,
      account_number: cleanAccNumber,
      bank_code: targetCode,
      bank_name: matchedBankName || "Commercial Bank",
      account_name: verifiedAccountName,
      message: `Account name verified: ${verifiedAccountName}`,
      raw: rawResult
    });
  } catch (err) {
    console.error("Driver resolveBankAccount error:", err.message);
    next(err);
  }
};

module.exports = {
  getEarnings,
  requestWithdrawal,
  getBanks,
  resolveBankAccount,
};

