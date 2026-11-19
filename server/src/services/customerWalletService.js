const pool = require("../db/pool");
const bcrypt = require("bcryptjs");
const { createMonnifyReservedAccount } = require("../utils/monnify");
const { getIO } = require("./socketService");

let schemaEnsured = false;

async function ensureCustomerWalletSchema() {
  if (schemaEnsured) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS customer_wallets (
      id SERIAL PRIMARY KEY,
      customer_id INTEGER UNIQUE NOT NULL,
      balance NUMERIC(12,2) NOT NULL DEFAULT 0,
      total_topped_up NUMERIC(12,2) NOT NULL DEFAULT 0,
      total_spent NUMERIC(12,2) NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  await pool.query(`ALTER TABLE customer_wallets ADD COLUMN IF NOT EXISTS total_topped_up NUMERIC(12,2) NOT NULL DEFAULT 0`);
  await pool.query(`ALTER TABLE customer_wallets ADD COLUMN IF NOT EXISTS total_spent NUMERIC(12,2) NOT NULL DEFAULT 0`);
  await pool.query(`ALTER TABLE customer_wallets ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW()`);
  await pool.query(`ALTER TABLE customer_wallets ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()`);
  await pool.query(`ALTER TABLE customer_wallets ADD COLUMN IF NOT EXISTS account_reference VARCHAR(120)`);
  await pool.query(`ALTER TABLE customer_wallets ADD COLUMN IF NOT EXISTS account_number VARCHAR(30)`);
  await pool.query(`ALTER TABLE customer_wallets ADD COLUMN IF NOT EXISTS bank_name VARCHAR(120)`);
  await pool.query(`ALTER TABLE customer_wallets ADD COLUMN IF NOT EXISTS bank_code VARCHAR(30)`);
  await pool.query(`ALTER TABLE customer_wallets ADD COLUMN IF NOT EXISTS account_name VARCHAR(160)`);
  await pool.query(`ALTER TABLE customer_wallets ADD COLUMN IF NOT EXISTS monnify_accounts JSONB DEFAULT '[]'::jsonb`);
  await pool.query(`ALTER TABLE customer_wallets ADD COLUMN IF NOT EXISTS payment_pin_hash VARCHAR(255)`);
  await pool.query(`ALTER TABLE customer_wallets ADD COLUMN IF NOT EXISTS payment_pin_set_at TIMESTAMPTZ`);
  await pool.query(`ALTER TABLE customer_wallets ADD COLUMN IF NOT EXISTS pin_failed_attempts INTEGER NOT NULL DEFAULT 0`);
  await pool.query(`ALTER TABLE customer_wallets ADD COLUMN IF NOT EXISTS pin_locked_until TIMESTAMPTZ`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS customer_wallet_transactions (
      id SERIAL PRIMARY KEY,
      customer_id INTEGER NOT NULL,
      type VARCHAR(20) NOT NULL,
      category VARCHAR(50) NOT NULL DEFAULT 'wallet',
      amount NUMERIC(12,2) NOT NULL,
      balance_after NUMERIC(12,2) NOT NULL DEFAULT 0,
      reference VARCHAR(120),
      description TEXT,
      metadata JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  await pool.query(`ALTER TABLE customer_wallet_transactions ADD COLUMN IF NOT EXISTS category VARCHAR(50) NOT NULL DEFAULT 'wallet'`);
  await pool.query(`ALTER TABLE customer_wallet_transactions ADD COLUMN IF NOT EXISTS balance_after NUMERIC(12,2) NOT NULL DEFAULT 0`);
  await pool.query(`ALTER TABLE customer_wallet_transactions ADD COLUMN IF NOT EXISTS reference VARCHAR(120)`);
  await pool.query(`ALTER TABLE customer_wallet_transactions ADD COLUMN IF NOT EXISTS description TEXT`);
  await pool.query(`ALTER TABLE customer_wallet_transactions ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb`);
  await pool.query(`ALTER TABLE customer_wallet_transactions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW()`);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_cust_wallet_tx_customer_time
    ON customer_wallet_transactions(customer_id, created_at DESC);
  `);
  schemaEnsured = true;
}

/**
 * Fetch or provision a customer's wallet + Monnify dedicated virtual account.
 */
async function getOrCreateCustomerWallet(customerId, options = {}) {
  await ensureCustomerWalletSchema();
  const userRes = await pool.query(
    "SELECT id, name, email, phone FROM users WHERE id = $1 LIMIT 1",
    [customerId]
  );
  const user = userRes.rows[0];
  if (!user) {
    throw Object.assign(new Error("Customer not found"), { status: 404 });
  }

  await pool.query(
    `INSERT INTO customer_wallets (customer_id, balance, total_topped_up, total_spent, created_at, updated_at)
     VALUES ($1, 0, 0, 0, NOW(), NOW())
     ON CONFLICT (customer_id) DO NOTHING`,
    [customerId]
  );

  let walletRes = await pool.query(
    "SELECT * FROM customer_wallets WHERE customer_id = $1 LIMIT 1",
    [customerId]
  );
  let wallet = walletRes.rows[0];

  const shouldProvision = !wallet.account_number || options.forceProvision;
  let provisionError = null;

  if (shouldProvision && process.env.MONNIFY_API_KEY && process.env.MONNIFY_SECRET_KEY && process.env.MONNIFY_CONTRACT_CODE) {
    const accountRef = wallet.account_reference || `BEMS-CUST-${customerId}`;
    const displayName = `BEMS - ${String(user.name || "CUSTOMER").trim().toUpperCase()}`.slice(0, 80);
    try {
      const reserved = await createMonnifyReservedAccount({
        accountReference: accountRef,
        accountName: displayName,
        customerEmail: user.email || `customer_${customerId}@bemsfarms.com`,
        customerName: user.name || "Bems Customer",
        bvn: options.bvn,
        nin: options.nin,
      });

      const accounts = Array.isArray(reserved.accounts) ? reserved.accounts : [];
      const primary = accounts[0] || {};
      const updRes = await pool.query(
        `UPDATE customer_wallets
         SET account_reference = $1,
             account_number = COALESCE(NULLIF($2, ''), account_number),
             bank_name = COALESCE(NULLIF($3, ''), bank_name),
             bank_code = COALESCE(NULLIF($4, ''), bank_code),
             account_name = COALESCE(NULLIF($5, ''), account_name),
             monnify_accounts = $6::jsonb,
             updated_at = NOW()
         WHERE customer_id = $7
         RETURNING *`,
        [
          reserved.accountReference || accountRef,
          primary.accountNumber || reserved.accountNumber || "",
          primary.bankName || reserved.bankName || "",
          primary.bankCode || reserved.bankCode || "",
          reserved.accountName || displayName,
          JSON.stringify(accounts),
          customerId,
        ]
      );
      wallet = updRes.rows[0] || wallet;
    } catch (err) {
      provisionError = err?.response?.data?.responseMessage || err.message;
      console.warn(`[CustomerWallet] Monnify reserved account notice for user ${customerId}:`, provisionError);
    }
  }

  const txRes = await pool.query(
    `SELECT id, type, category, amount, balance_after, reference, description, created_at
     FROM customer_wallet_transactions
     WHERE customer_id = $1
     ORDER BY created_at DESC
     LIMIT 50`,
    [customerId]
  );

  return {
    wallet: {
      customer_id: wallet.customer_id,
      balance: parseFloat(wallet.balance || 0),
      total_topped_up: parseFloat(wallet.total_topped_up || 0),
      total_spent: parseFloat(wallet.total_spent || 0),
      account_reference: wallet.account_reference || `BEMS-CUST-${customerId}`,
      account_number: wallet.account_number || null,
      bank_name: wallet.bank_name || null,
      bank_code: wallet.bank_code || null,
      account_name: wallet.account_name || null,
      accounts: Array.isArray(wallet.monnify_accounts) ? wallet.monnify_accounts : [],
      provision_error: provisionError,
      has_payment_pin: Boolean(wallet.payment_pin_hash),
      payment_pin_set_at: wallet.payment_pin_set_at || null,
      pin_locked_until: wallet.pin_locked_until || null,
    },
    transactions: txRes.rows.map((t) => ({
      ...t,
      amount: parseFloat(t.amount || 0),
      balance_after: parseFloat(t.balance_after || 0),
    })),
  };
}

/**
 * Credit a customer's wallet when a Monnify Reserved Account transfer webhook arrives.
 */
async function creditCustomerWalletFromMonnifyWebhook(eventData) {
  await ensureCustomerWalletSchema();
  const productType = String(eventData?.product?.type || "").toUpperCase();
  const productRef = String(eventData?.product?.reference || "").trim();
  const destAcct = String(
    eventData?.destinationAccountInformation?.accountNumber ||
      eventData?.accountNumber ||
      ""
  ).trim();

  if (productType !== "RESERVED_ACCOUNT" && !productRef.startsWith("BEMS-CUST-") && !destAcct) {
    return null;
  }

  const txRef = String(
    eventData?.transactionReference || eventData?.paymentReference || ""
  ).trim();
  const amount = parseFloat(eventData?.amountPaid || eventData?.amount || 0);
  if (!txRef || !Number.isFinite(amount) || amount <= 0) return null;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    let walletRes = await client.query(
      `SELECT * FROM customer_wallets
       WHERE ($1 <> '' AND account_reference = $1)
          OR ($2 <> '' AND account_number = $2)
       LIMIT 1
       FOR UPDATE`,
      [productRef, destAcct]
    );

    // Fallback: parse BEMS-CUST-<id> if wallet row wasn't created yet
    if (walletRes.rows.length === 0 && productRef.startsWith("BEMS-CUST-")) {
      const parsedId = parseInt(productRef.replace("BEMS-CUST-", ""), 10);
      if (Number.isInteger(parsedId) && parsedId > 0) {
        await client.query(
          `INSERT INTO customer_wallets (customer_id, balance, total_topped_up, total_spent, account_reference, account_number)
           VALUES ($1, 0, 0, 0, $2, NULLIF($3, ''))
           ON CONFLICT (customer_id) DO NOTHING`,
          [parsedId, productRef, destAcct]
        );
        walletRes = await client.query(
          `SELECT * FROM customer_wallets WHERE customer_id = $1 FOR UPDATE`,
          [parsedId]
        );
      }
    }

    if (walletRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return null;
    }

    const wallet = walletRes.rows[0];
    const dupRes = await client.query(
      "SELECT id FROM customer_wallet_transactions WHERE reference = $1 LIMIT 1",
      [txRef]
    );
    if (dupRes.rows.length > 0) {
      await client.query("COMMIT");
      return { duplicate: true, customer_id: wallet.customer_id, reference: txRef };
    }

    const newBalance = parseFloat(wallet.balance || 0) + amount;
    await client.query(
      `UPDATE customer_wallets
       SET balance = $1,
           total_topped_up = COALESCE(total_topped_up, 0) + $2,
           updated_at = NOW()
       WHERE customer_id = $3`,
      [newBalance, amount, wallet.customer_id]
    );

    const senderName =
      eventData?.paymentSourceInformation?.[0]?.accountName ||
      eventData?.customer?.name ||
      "Bank Transfer";

    await client.query(
      `INSERT INTO customer_wallet_transactions
       (customer_id, type, category, amount, balance_after, reference, description, metadata, created_at)
       VALUES ($1, 'credit', 'monnify_topup', $2, $3, $4, $5, $6::jsonb, NOW())`,
      [
        wallet.customer_id,
        amount,
        newBalance,
        txRef,
        `Wallet Top-up via Monnify (${senderName})`,
        JSON.stringify({
          account_reference: productRef,
          destination_account: destAcct,
          payment_method: eventData?.paymentMethod || "ACCOUNT_TRANSFER",
        }),
      ]
    );

    await client.query("COMMIT");

    try {
      const io = getIO();
      if (io) {
        io.emit("customer:wallet_credited", {
          customer_id: wallet.customer_id,
          amount,
          balance: newBalance,
          reference: txRef,
        });
      }
    } catch (_) {}

    // Notify customer via email (non-blocking)
    pool
      .query("SELECT name, email FROM users WHERE id = $1 LIMIT 1", [wallet.customer_id])
      .then((uRes) => {
        const cust = uRes.rows[0];
        if (!cust?.email) return;
        const { sendCustomerWalletFundedEmail } = require("./emailService");
        return sendCustomerWalletFundedEmail({
          email: cust.email,
          name: cust.name,
          amount,
          balance: newBalance,
          reference: txRef,
          senderName,
        });
      })
      .catch((mailErr) => {
        console.warn("[CustomerWallet] Wallet funded email notice:", mailErr.message);
      });

    return { credited: true, customer_id: wallet.customer_id, amount, balance: newBalance, reference: txRef };
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Set or update a customer's 4-digit wallet payment PIN.
 */
async function setCustomerWalletPin(customerId, { pin, current_pin, account_password } = {}) {
  await ensureCustomerWalletSchema();
  const cleanPin = String(pin || "").trim();
  if (!/^\d{4}$/.test(cleanPin)) {
    throw Object.assign(new Error("Payment PIN must be exactly 4 digits."), { status: 400 });
  }

  await pool.query(
    `INSERT INTO customer_wallets (customer_id, balance, total_topped_up, total_spent, created_at, updated_at)
     VALUES ($1, 0, 0, 0, NOW(), NOW())
     ON CONFLICT (customer_id) DO NOTHING`,
    [customerId]
  );

  const walletRes = await pool.query(
    "SELECT payment_pin_hash FROM customer_wallets WHERE customer_id = $1 LIMIT 1",
    [customerId]
  );
  const existingHash = walletRes.rows[0]?.payment_pin_hash;

  if (existingHash) {
    let verified = false;
    if (current_pin !== undefined && current_pin !== null && String(current_pin).trim() !== "") {
      verified = await bcrypt.compare(String(current_pin).trim(), existingHash);
      if (!verified) {
        throw Object.assign(new Error("Current Payment PIN is incorrect."), { status: 401 });
      }
    } else if (account_password !== undefined && account_password !== null && String(account_password) !== "") {
      const userRes = await pool.query("SELECT password FROM users WHERE id = $1 LIMIT 1", [customerId]);
      const pwHash = userRes.rows[0]?.password;
      if (!pwHash) {
        throw Object.assign(new Error("Unable to verify account password."), { status: 400 });
      }
      verified = await bcrypt.compare(String(account_password), pwHash);
      if (!verified) {
        throw Object.assign(new Error("Account password is incorrect."), { status: 401 });
      }
    } else {
      throw Object.assign(
        new Error("Please provide your current Payment PIN or account password to update your PIN."),
        { status: 400 }
      );
    }
  }

  const newHash = await bcrypt.hash(cleanPin, 10);
  const updRes = await pool.query(
    `UPDATE customer_wallets
     SET payment_pin_hash = $1,
         payment_pin_set_at = NOW(),
         pin_failed_attempts = 0,
         pin_locked_until = NULL,
         updated_at = NOW()
     WHERE customer_id = $2
     RETURNING payment_pin_set_at`,
    [newHash, customerId]
  );

  return {
    has_payment_pin: true,
    payment_pin_set_at: updRes.rows[0]?.payment_pin_set_at || new Date().toISOString(),
  };
}

/**
 * Debit a customer's wallet inside an order creation transaction.
 */
async function debitCustomerWalletForOrder(client, customerId, amount, orderId, paymentPin) {
  await ensureCustomerWalletSchema();
  const amt = parseFloat(amount || 0);
  if (!Number.isFinite(amt) || amt <= 0) {
    return { ok: false, status: 400, message: "Invalid wallet debit amount" };
  }

  await client.query(
    `INSERT INTO customer_wallets (customer_id, balance, total_topped_up, total_spent, created_at, updated_at)
     VALUES ($1, 0, 0, 0, NOW(), NOW())
     ON CONFLICT (customer_id) DO NOTHING`,
    [customerId]
  );

  const res = await client.query(
    "SELECT id, balance, payment_pin_hash, pin_failed_attempts, pin_locked_until FROM customer_wallets WHERE customer_id = $1 FOR UPDATE",
    [customerId]
  );
  const wallet = res.rows[0];

  if (!wallet?.payment_pin_hash) {
    return {
      ok: false,
      status: 400,
      code: "PAYMENT_PIN_NOT_SET",
      message: "Please set a 4-digit Payment PIN in your Profile → My Wallet before paying with your Bems Wallet.",
    };
  }

  if (wallet.pin_locked_until && new Date(wallet.pin_locked_until) > new Date()) {
    return {
      ok: false,
      status: 429,
      code: "PAYMENT_PIN_LOCKED",
      message: "Too many incorrect Payment PIN attempts. Please wait 15 minutes or reset your PIN in Profile → My Wallet.",
    };
  }

  const cleanPin = String(paymentPin || "").trim();
  if (!/^\d{4}$/.test(cleanPin)) {
    return {
      ok: false,
      status: 400,
      code: "PAYMENT_PIN_REQUIRED",
      message: "Please enter your 4-digit Wallet Payment PIN to complete checkout.",
    };
  }

  const pinValid = await bcrypt.compare(cleanPin, wallet.payment_pin_hash);
  if (!pinValid) {
    const nextAttempts = Number(wallet.pin_failed_attempts || 0) + 1;
    if (nextAttempts >= 5) {
      await pool.query(
        `UPDATE customer_wallets
         SET pin_failed_attempts = 0,
             pin_locked_until = NOW() + INTERVAL '15 minutes',
             updated_at = NOW()
         WHERE customer_id = $1`,
        [customerId]
      );
      return {
        ok: false,
        status: 429,
        code: "PAYMENT_PIN_LOCKED",
        message: "Too many incorrect Payment PIN attempts. Wallet PIN is locked for 15 minutes (you can reset it in Profile → My Wallet).",
      };
    }
    await pool.query(
      `UPDATE customer_wallets
       SET pin_failed_attempts = $1,
           updated_at = NOW()
       WHERE customer_id = $2`,
      [nextAttempts, customerId]
    );
    const remaining = 5 - nextAttempts;
    return {
      ok: false,
      status: 401,
      code: "INVALID_PAYMENT_PIN",
      message: `Incorrect Wallet Payment PIN (${remaining} attempt${remaining === 1 ? "" : "s"} remaining).`,
    };
  }

  const currentBalance = parseFloat(wallet?.balance || 0);
  if (currentBalance + 0.001 < amt) {
    return {
      ok: false,
      status: 402,
      message: `Insufficient wallet balance (Available: ₦${currentBalance.toLocaleString()}, Required: ₦${amt.toLocaleString()}). Please transfer to your dedicated Monnify account or use online payment.`,
    };
  }

  const newBalance = Math.max(0, currentBalance - amt);
  await client.query(
    `UPDATE customer_wallets
     SET balance = $1,
         total_spent = COALESCE(total_spent, 0) + $2,
         pin_failed_attempts = 0,
         pin_locked_until = NULL,
         updated_at = NOW()
     WHERE customer_id = $3`,
    [newBalance, amt, customerId]
  );

  await client.query(
    `INSERT INTO customer_wallet_transactions
     (customer_id, type, category, amount, balance_after, reference, description, metadata, created_at)
     VALUES ($1, 'debit', 'order_payment', $2, $3, $4, $5, $6::jsonb, NOW())`,
    [
      customerId,
      amt,
      newBalance,
      `WAL-ORD-${orderId}`,
      `Payment for Order #${orderId}`,
      JSON.stringify({ order_id: orderId }),
    ]
  );

  return { ok: true, balance_after: newBalance };
}

module.exports = {
  ensureCustomerWalletSchema,
  getOrCreateCustomerWallet,
  setCustomerWalletPin,
  creditCustomerWalletFromMonnifyWebhook,
  debitCustomerWalletForOrder,
};
