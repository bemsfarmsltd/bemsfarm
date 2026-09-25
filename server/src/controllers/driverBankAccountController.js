// server/src/controllers/driverBankAccountController.js
// Dedicated controller for managing Driver Saved Bank Accounts for Payouts
// Supports listing, adding, updating, deleting, setting default, and bulk syncing from mobile app.

const pool = require("../db/pool");

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
  "Zenith Bank": "057",
};

// Helper: Resolve Bank Code from name
function resolveBankCode(bankName) {
  if (!bankName) return null;
  const clean = String(bankName).trim();
  const parenMatch = clean.match(/\((\d+)\)/);
  if (parenMatch) return parenMatch[1];
  if (BANK_CODES[clean]) return BANK_CODES[clean];
  const found = Object.entries(BANK_CODES).find(
    ([k]) => clean.toLowerCase().includes(k.toLowerCase()) || k.toLowerCase().includes(clean.toLowerCase())
  );
  return found ? found[1] : null;
}

// ── GET /api/driver/bank-accounts ────────────────────────────────────
// Return all saved bank accounts for the authenticated driver
const getSavedBankAccounts = async (req, res, next) => {
  try {
    const driverId = req.driver.id;

    const result = await pool.query(
      `
      SELECT 
        id,
        driver_id,
        bank_name,
        bank_code,
        account_number,
        account_name,
        is_default,
        is_verified,
        created_at,
        updated_at
      FROM driver_bank_accounts
      WHERE driver_id = $1
      ORDER BY is_default DESC, updated_at DESC, id DESC
      `,
      [driverId]
    );

    // If driver has no row in driver_bank_accounts but has bank details on drivers table, auto-seed
    if (result.rows.length === 0 && req.driver.account_number && req.driver.bank_name) {
      const bCode = resolveBankCode(req.driver.bank_name);
      const seedRes = await pool.query(
        `
        INSERT INTO driver_bank_accounts (
          driver_id, bank_name, bank_code, account_number, account_name, is_default, is_verified, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, true, true, NOW(), NOW())
        ON CONFLICT (driver_id, account_number, bank_name) 
        DO UPDATE SET is_default = true
        RETURNING *
        `,
        [
          driverId,
          req.driver.bank_name.trim(),
          bCode,
          req.driver.account_number.trim(),
          req.driver.account_name || req.driver.name,
        ]
      );
      if (seedRes.rows.length) {
        return res.json({
          status: "success",
          count: 1,
          accounts: seedRes.rows,
        });
      }
    }

    res.json({
      status: "success",
      count: result.rows.length,
      accounts: result.rows,
    });
  } catch (err) {
    console.error("getSavedBankAccounts error:", err.message);
    next(err);
  }
};

// ── POST /api/driver/bank-accounts ───────────────────────────────────
// Add a single new bank account
const addSavedBankAccount = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const driverId = req.driver.id;
    const {
      bank_name,
      account_number,
      account_name,
      bank_code,
      is_default = false,
    } = req.body;

    const cleanBankName = String(bank_name || "").trim();
    const cleanAccNumber = String(account_number || "").trim().replace(/\D/g, "");

    if (!cleanBankName) {
      return res.status(400).json({ status: "error", message: "Bank Name is required" });
    }
    if (!cleanAccNumber || cleanAccNumber.length !== 10) {
      return res.status(400).json({ status: "error", message: "Valid 10-digit NUBAN account number is required" });
    }

    const resolvedCode = bank_code ? String(bank_code).trim() : resolveBankCode(cleanBankName);
    let resolvedAccName = String(account_name || "").trim();

    // Auto-resolve account name via Monnify if not provided
    if (!resolvedAccName && resolvedCode) {
      try {
        const { validateMonnifyBankAccount } = require("../utils/monnify");
        if (typeof validateMonnifyBankAccount === "function") {
          const monnifyRes = await validateMonnifyBankAccount(cleanAccNumber, resolvedCode);
          if (monnifyRes?.accountName) {
            resolvedAccName = monnifyRes.accountName;
          }
        }
      } catch (mErr) {
        // Fallback to driver's name
      }
    }
    if (!resolvedAccName) {
      resolvedAccName = req.driver.name || "BEMS DRIVER";
    }

    await client.query("BEGIN");

    // Check count of existing accounts
    const countCheck = await client.query(
      "SELECT COUNT(*) AS count FROM driver_bank_accounts WHERE driver_id = $1",
      [driverId]
    );
    const existingCount = parseInt(countCheck.rows[0].count, 10) || 0;
    const makeDefault = Boolean(is_default) || existingCount === 0;

    // If making default, unset other defaults
    if (makeDefault) {
      await client.query(
        "UPDATE driver_bank_accounts SET is_default = false WHERE driver_id = $1",
        [driverId]
      );
    }

    // Upsert the bank account
    const insertRes = await client.query(
      `
      INSERT INTO driver_bank_accounts (
        driver_id, bank_name, bank_code, account_number, account_name, is_default, is_verified, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, true, NOW(), NOW())
      ON CONFLICT (driver_id, account_number, bank_name)
      DO UPDATE SET
        account_name = EXCLUDED.account_name,
        bank_code = COALESCE(EXCLUDED.bank_code, driver_bank_accounts.bank_code),
        is_default = CASE WHEN $6 = true THEN true ELSE driver_bank_accounts.is_default END,
        updated_at = NOW()
      RETURNING *
      `,
      [driverId, cleanBankName, resolvedCode, cleanAccNumber, resolvedAccName, makeDefault]
    );

    const savedAccount = insertRes.rows[0];

    // Sync primary account to drivers table if default
    if (makeDefault) {
      await client.query(
        `
        UPDATE drivers 
        SET 
          bank_name = $1,
          account_number = $2,
          account_name = $3,
          updated_at = NOW()
        WHERE id = $4
        `,
        [cleanBankName, cleanAccNumber, resolvedAccName, driverId]
      );
    }

    await client.query("COMMIT");

    res.status(201).json({
      status: "success",
      message: "Bank account saved successfully",
      account: savedAccount,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("addSavedBankAccount error:", err.message);
    next(err);
  } finally {
    client.release();
  }
};

// ── POST /api/driver/bank-accounts/sync ──────────────────────────────
// Bulk sync local mobile bank accounts to the database
const syncSavedBankAccounts = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const driverId = req.driver.id;
    const rawList = Array.isArray(req.body)
      ? req.body
      : Array.isArray(req.body.accounts)
        ? req.body.accounts
        : Array.isArray(req.body.bank_accounts)
          ? req.body.bank_accounts
          : [];

    if (rawList.length === 0) {
      return res.status(400).json({
        status: "error",
        message: "No bank accounts provided to sync. Send an array under 'accounts' key.",
      });
    }

    await client.query("BEGIN");

    let defaultAccountToSync = null;

    for (let i = 0; i < rawList.length; i++) {
      const item = rawList[i];
      const bankName = String(item.bank_name || item.bankName || "").trim();
      const accNumber = String(item.account_number || item.accountNumber || "").trim().replace(/\D/g, "");
      let accName = String(item.account_name || item.accountName || "").trim() || req.driver.name;
      const bCode = item.bank_code || item.bankCode || resolveBankCode(bankName);
      const isDef = Boolean(item.is_default || item.isDefault) || (i === 0 && rawList.length === 1);

      if (!bankName || accNumber.length !== 10) {
        continue; // skip malformed entries
      }

      if (isDef) {
        // unset previous defaults
        await client.query(
          "UPDATE driver_bank_accounts SET is_default = false WHERE driver_id = $1",
          [driverId]
        );
      }

      const upRes = await client.query(
        `
        INSERT INTO driver_bank_accounts (
          driver_id, bank_name, bank_code, account_number, account_name, is_default, is_verified, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, true, NOW(), NOW())
        ON CONFLICT (driver_id, account_number, bank_name)
        DO UPDATE SET
          account_name = EXCLUDED.account_name,
          bank_code = COALESCE(EXCLUDED.bank_code, driver_bank_accounts.bank_code),
          is_default = CASE WHEN $6 = true THEN true ELSE driver_bank_accounts.is_default END,
          updated_at = NOW()
        RETURNING *
        `,
        [driverId, bankName, bCode, accNumber, accName, isDef]
      );

      if (isDef && upRes.rows.length) {
        defaultAccountToSync = upRes.rows[0];
      }
    }

    // Ensure at least one account is marked default if driver has accounts
    const defCheck = await client.query(
      "SELECT * FROM driver_bank_accounts WHERE driver_id = $1 AND is_default = true LIMIT 1",
      [driverId]
    );

    if (defCheck.rows.length === 0) {
      const firstAcc = await client.query(
        `UPDATE driver_bank_accounts 
         SET is_default = true 
         WHERE id = (SELECT id FROM driver_bank_accounts WHERE driver_id = $1 ORDER BY id ASC LIMIT 1)
         RETURNING *`,
        [driverId]
      );
      if (firstAcc.rows.length) {
        defaultAccountToSync = firstAcc.rows[0];
      }
    } else {
      defaultAccountToSync = defCheck.rows[0];
    }

    // Sync default account to drivers table
    if (defaultAccountToSync) {
      await client.query(
        `
        UPDATE drivers 
        SET 
          bank_name = $1,
          account_number = $2,
          account_name = $3,
          updated_at = NOW()
        WHERE id = $4
        `,
        [
          defaultAccountToSync.bank_name,
          defaultAccountToSync.account_number,
          defaultAccountToSync.account_name,
          driverId,
        ]
      );
    }

    await client.query("COMMIT");

    // Fetch full updated list to return to mobile
    const allAccounts = await pool.query(
      `SELECT * FROM driver_bank_accounts WHERE driver_id = $1 ORDER BY is_default DESC, updated_at DESC`,
      [driverId]
    );

    res.json({
      status: "success",
      message: "Saved bank accounts synced successfully",
      count: allAccounts.rows.length,
      accounts: allAccounts.rows,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("syncSavedBankAccounts error:", err.message);
    next(err);
  } finally {
    client.release();
  }
};

// ── PATCH /api/driver/bank-accounts/:id/default ──────────────────────
// Set an existing saved bank account as the default payout destination
const setDefaultBankAccount = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const driverId = req.driver.id;
    const accountId = parseInt(req.params.id, 10);

    if (isNaN(accountId) || accountId <= 0) {
      return res.status(400).json({ status: "error", message: "Invalid account ID" });
    }

    await client.query("BEGIN");

    // Check account ownership
    const checkRes = await client.query(
      "SELECT * FROM driver_bank_accounts WHERE id = $1 AND driver_id = $2",
      [accountId, driverId]
    );

    if (checkRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ status: "error", message: "Bank account not found" });
    }

    const targetAccount = checkRes.rows[0];

    // Unset other defaults
    await client.query(
      "UPDATE driver_bank_accounts SET is_default = false WHERE driver_id = $1",
      [driverId]
    );

    // Set this one as default
    const updateRes = await client.query(
      "UPDATE driver_bank_accounts SET is_default = true, updated_at = NOW() WHERE id = $1 RETURNING *",
      [accountId]
    );

    // Sync to drivers table
    await client.query(
      `
      UPDATE drivers 
      SET 
        bank_name = $1,
        account_number = $2,
        account_name = $3,
        updated_at = NOW()
      WHERE id = $4
      `,
      [targetAccount.bank_name, targetAccount.account_number, targetAccount.account_name, driverId]
    );

    await client.query("COMMIT");

    res.json({
      status: "success",
      message: "Default payout bank account updated",
      account: updateRes.rows[0],
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("setDefaultBankAccount error:", err.message);
    next(err);
  } finally {
    client.release();
  }
};

// ── PATCH /api/driver/bank-accounts/:id ──────────────────────────────
// Update an existing saved bank account
const updateSavedBankAccount = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const driverId = req.driver.id;
    const accountId = parseInt(req.params.id, 10);
    const { bank_name, account_number, account_name, bank_code, is_default } = req.body;

    if (isNaN(accountId) || accountId <= 0) {
      return res.status(400).json({ status: "error", message: "Invalid account ID" });
    }

    await client.query("BEGIN");

    const checkRes = await client.query(
      "SELECT * FROM driver_bank_accounts WHERE id = $1 AND driver_id = $2",
      [accountId, driverId]
    );

    if (checkRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ status: "error", message: "Bank account not found" });
    }

    const current = checkRes.rows[0];
    const newBankName = bank_name !== undefined ? String(bank_name).trim() : current.bank_name;
    const newAccNumber = account_number !== undefined ? String(account_number).trim().replace(/\D/g, "") : current.account_number;
    const newAccName = account_name !== undefined ? String(account_name).trim() : current.account_name;
    const newBankCode = bank_code !== undefined ? String(bank_code).trim() : resolveBankCode(newBankName) || current.bank_code;
    const newIsDefault = is_default !== undefined ? Boolean(is_default) : current.is_default;

    if (newIsDefault && !current.is_default) {
      await client.query("UPDATE driver_bank_accounts SET is_default = false WHERE driver_id = $1", [driverId]);
    }

    const upRes = await client.query(
      `
      UPDATE driver_bank_accounts 
      SET 
        bank_name = $1,
        account_number = $2,
        account_name = $3,
        bank_code = $4,
        is_default = $5,
        updated_at = NOW()
      WHERE id = $6 AND driver_id = $7
      RETURNING *
      `,
      [newBankName, newAccNumber, newAccName, newBankCode, newIsDefault, accountId, driverId]
    );

    if (newIsDefault) {
      await client.query(
        `
        UPDATE drivers 
        SET 
          bank_name = $1,
          account_number = $2,
          account_name = $3,
          updated_at = NOW()
        WHERE id = $4
        `,
        [newBankName, newAccNumber, newAccName, driverId]
      );
    }

    await client.query("COMMIT");

    res.json({
      status: "success",
      message: "Bank account updated successfully",
      account: upRes.rows[0],
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("updateSavedBankAccount error:", err.message);
    next(err);
  } finally {
    client.release();
  }
};

// ── DELETE /api/driver/bank-accounts/:id ─────────────────────────────
// Remove a saved bank account
const deleteSavedBankAccount = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const driverId = req.driver.id;
    const accountId = parseInt(req.params.id, 10);

    if (isNaN(accountId) || accountId <= 0) {
      return res.status(400).json({ status: "error", message: "Invalid account ID" });
    }

    await client.query("BEGIN");

    const checkRes = await client.query(
      "SELECT * FROM driver_bank_accounts WHERE id = $1 AND driver_id = $2",
      [accountId, driverId]
    );

    if (checkRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ status: "error", message: "Bank account not found" });
    }

    const wasDefault = checkRes.rows[0].is_default;

    await client.query(
      "DELETE FROM driver_bank_accounts WHERE id = $1 AND driver_id = $2",
      [accountId, driverId]
    );

    // If was default, elect the latest remaining account as default
    if (wasDefault) {
      const remaining = await client.query(
        "SELECT * FROM driver_bank_accounts WHERE driver_id = $1 ORDER BY updated_at DESC, id DESC LIMIT 1",
        [driverId]
      );

      if (remaining.rows.length > 0) {
        const newDef = remaining.rows[0];
        await client.query(
          "UPDATE driver_bank_accounts SET is_default = true WHERE id = $1",
          [newDef.id]
        );
        await client.query(
          `
          UPDATE drivers 
          SET 
            bank_name = $1,
            account_number = $2,
            account_name = $3,
            updated_at = NOW()
          WHERE id = $4
          `,
          [newDef.bank_name, newDef.account_number, newDef.account_name, driverId]
        );
      } else {
        // Driver deleted their last bank account
        await client.query(
          `
          UPDATE drivers 
          SET 
            bank_name = NULL,
            account_number = NULL,
            account_name = NULL,
            updated_at = NOW()
          WHERE id = $1
          `,
          [driverId]
        );
      }
    }

    await client.query("COMMIT");

    res.json({
      status: "success",
      message: "Bank account removed successfully",
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("deleteSavedBankAccount error:", err.message);
    next(err);
  } finally {
    client.release();
  }
};

module.exports = {
  getSavedBankAccounts,
  addSavedBankAccount,
  syncSavedBankAccounts,
  updateSavedBankAccount,
  setDefaultBankAccount,
  deleteSavedBankAccount,
};
