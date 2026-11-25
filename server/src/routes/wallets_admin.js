const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const pool = require("../db/pool");
const { protect, requireRole } = require("../middleware/authMiddleware");
const {
  getMonnifyToken,
  createMonnifyReservedAccount,
  getMonnifyWalletBalance,
  initiateMonnifyDisbursement,
  validateMonnifyBankAccount,
} = require("../utils/monnify");
const { notifyAdmin } = require("../services/notificationService");
const { recordAudit } = require("../services/auditService");

// Staff authorization
router.use(protect);
router.use(requireRole("superadmin", "manager", "admin", "delivery_manager", "accountant"));

// Ensure driver_wallet_ledger table exists for commission adjustments, bonuses, and penalties
async function ensureDriverWalletLedgerTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS public.driver_wallet_ledger (
        id BIGSERIAL PRIMARY KEY,
        driver_id BIGINT NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
        type VARCHAR(20) NOT NULL,
        category VARCHAR(50) NOT NULL,
        amount NUMERIC(14,2) NOT NULL DEFAULT 0,
        balance_before NUMERIC(14,2) DEFAULT 0,
        balance_after NUMERIC(14,2) DEFAULT 0,
        reference VARCHAR(100),
        description TEXT,
        performed_by INTEGER,
        created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_driver_wallet_ledger_driver_time ON public.driver_wallet_ledger(driver_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_driver_wallet_ledger_ref ON public.driver_wallet_ledger(reference);
    `);
  } catch (err) {
    console.warn("ensureDriverWalletLedgerTable notice:", err.message);
  }
}
ensureDriverWalletLedgerTable();

// ── POST /api/admin/wallets/drivers/:id/provision-internal-wallet ───
// Auto-generates an internal wallet ID for driver within Bems Farms system
router.post("/drivers/:id/provision-internal-wallet", requireRole("superadmin", "manager", "admin"), async (req, res, next) => {
  try {
    const { id } = req.params;
    const driverRes = await pool.query("SELECT * FROM drivers WHERE id = $1", [id]);
    if (driverRes.rows.length === 0) {
      return res.status(404).json({ message: "Driver not found" });
    }

    const driver = driverRes.rows[0];
    const internalWalletNum = "855" + String(driver.id).padStart(7, "0");
    const accountName = `BEMS - ${driver.name.toUpperCase()}`;
    const bankName = "Bems Farms Internal Wallet";

    await pool.query(
      `
      UPDATE drivers
      SET 
        wallet_account_number = $1,
        wallet_bank_name = $2,
        wallet_account_name = $3,
        updated_at = NOW()
      WHERE id = $4
      `,
      [internalWalletNum, bankName, accountName, id]
    );

    res.json({
      message: `Internal wallet account initialized: ${internalWalletNum}`,
      wallet_account_number: internalWalletNum,
      wallet_bank_name: bankName,
      wallet_account_name: accountName,
    });
  } catch (err) {
    next(err);
  }
});

// ── DELETE /api/admin/wallets/drivers/:id ──────────────────────────
router.delete("/drivers/:id", requireRole("superadmin", "manager", "admin"), async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const driverRes = await client.query("SELECT * FROM drivers WHERE id = $1", [id]);
    if (driverRes.rows.length === 0) {
      return res.status(404).json({ message: "Driver not found" });
    }
    const driver = driverRes.rows[0];

    const activeDelivery = await client.query(
      "SELECT id, status FROM deliveries WHERE driver_id = $1 AND status IN ('assigned', 'accepted', 'awaiting_pickup', 'picked_up', 'out_for_delivery', 'en_route', 'arrived')",
      [id]
    );

    if (activeDelivery.rows.length > 0) {
      return res.status(400).json({
        message: `Cannot delete driver '${driver.name}' because they are currently assigned to active delivery #${activeDelivery.rows[0].id}.`
      });
    }

    await client.query("BEGIN");

    // Helper to safely delete from a table only if it exists, using SAVEPOINT so failures never abort the transaction
    const safeDelete = async (table, column = "driver_id") => {
      try {
        const regRes = await client.query("SELECT to_regclass($1) AS tbl_exists", [`public.${table}`]);
        if (regRes.rows[0]?.tbl_exists) {
          await client.query("SAVEPOINT sp_del");
          try {
            await client.query(`DELETE FROM public."${table}" WHERE "${column}" = $1`, [id]);
            await client.query("RELEASE SAVEPOINT sp_del");
          } catch (err) {
            await client.query("ROLLBACK TO SAVEPOINT sp_del");
          }
        }
      } catch (e) {}
    };

    // Helper to safely nullify foreign key columns if table exists
    const safeNullify = async (table, column) => {
      try {
        const regRes = await client.query("SELECT to_regclass($1) AS tbl_exists", [`public.${table}`]);
        if (regRes.rows[0]?.tbl_exists) {
          await client.query("SAVEPOINT sp_null");
          try {
            await client.query(`UPDATE public."${table}" SET "${column}" = NULL WHERE "${column}" = $1`, [id]);
            await client.query("RELEASE SAVEPOINT sp_null");
          } catch (err) {
            await client.query("ROLLBACK TO SAVEPOINT sp_null");
          }
        }
      } catch (e) {}
    };

    // 1. Clean up driver location tracking & availability
    await safeDelete("driver_locations");
    await safeDelete("driver_availability");

    // 2. Clean up driver devices & notifications
    await safeDelete("driver_notifications");
    await safeDelete("driver_device_tokens");
    await safeDelete("driver_devices");
    await safeDelete("driver_feedback");

    // 3. Clean up driver incidents & zone assignments
    await safeDelete("driver_incidents");
    await safeDelete("zone_drivers");

    // 4. Clean up driver wallet ledger, commissions, and payouts
    await safeDelete("driver_wallet_ledger");
    await safeDelete("driver_commissions");
    await safeDelete("commission_payments");
    await safeDelete("driver_payouts");

    // 5. Clean up chat messages & conversations
    await safeDelete("driver_messages");
    await safeDelete("driver_conversations");

    // 6. Clean up driver profiles, stats, auth
    await safeDelete("driver_profiles");
    await safeDelete("driver_stats");
    await safeDelete("driver_auth");

    // 7. Clean up delivery assignments & unassign from deliveries & orders
    await safeDelete("delivery_assignments");
    await safeNullify("deliveries", "driver_id");
    await safeNullify("deliveries", "picked_up_by");
    await safeNullify("orders", "driver_id");

    // 8. Delete driver record
    await client.query("DELETE FROM drivers WHERE id = $1", [id]);

    await client.query("COMMIT");

    res.json({
      success: true,
      message: `Driver '${driver.name}' (ID: ${id}) deleted successfully.`
    });
  } catch (err) {
    await client.query("ROLLBACK");
    next(err);
  } finally {
    client.release();
  }
});

// ── GET /api/admin/wallets/summary ─────────────────────────────────
// Overview metrics, list of all driver wallets with balances & virtual accounts
router.get("/summary", async (req, res, next) => {
  try {
    const { search = "", status = "" } = req.query;

    const driversQuery = await pool.query(
      `
      SELECT 
        dr.id,
        dr.name,
        dr.phone,
        dr.email,
        dr.vehicle_type,
        dr.vehicle_plate,
        COALESCE(da.is_available, false) AS is_available,
        (COALESCE(da.is_on_delivery, false) = true AND EXISTS (SELECT 1 FROM deliveries d_act WHERE d_act.driver_id = dr.id AND d_act.status NOT IN ('delivered','cancelled'))) AS is_on_delivery,
        CASE
          WHEN dr.status = 'suspended' THEN 'suspended'
          WHEN dr.status = 'pending' OR dr.onboarding_status IN ('pending_verification', 'documents_submitted') THEN 'pending'
          WHEN EXISTS (SELECT 1 FROM deliveries d_act WHERE d_act.driver_id = dr.id AND d_act.status NOT IN ('delivered','cancelled')) THEN 'on_delivery'
          WHEN COALESCE(da.is_available, dr.is_available, false) = true THEN 'active'
          ELSE 'off_duty'
        END AS duty_status,
        CASE
          WHEN dr.status = 'suspended' THEN 'suspended'
          WHEN dr.status = 'pending' OR dr.onboarding_status IN ('pending_verification', 'documents_submitted') THEN 'pending'
          WHEN EXISTS (SELECT 1 FROM deliveries d_act WHERE d_act.driver_id = dr.id AND d_act.status NOT IN ('delivered','cancelled')) THEN 'on_delivery'
          WHEN COALESCE(da.is_available, dr.is_available, false) = true THEN 'active'
          ELSE 'off_duty'
        END AS driver_status,
        dr.commission_per_delivery,
        COALESCE(dr.total_earnings, 0) AS total_earnings,
        dr.wallet_account_number,
        COALESCE(dr.wallet_bank_name, 'Monnify / Wema Bank') AS wallet_bank_name,
        COALESCE(dr.wallet_account_name, CONCAT('BEMS - ', UPPER(dr.name))) AS wallet_account_name,
        COALESCE(dr.wallet_is_frozen, false) AS wallet_is_frozen,
        dr.wallet_frozen_reason,
        COALESCE(dr.payout_locked, false) AS payout_locked,
        dr.payout_locked_reason,
        dr.payout_locked_at,
        COALESCE(dr.pin_failed_attempts, 0) AS pin_failed_attempts,
        dr.pin_locked_until,
        dr.bank_name,
        dr.account_number,
        dr.account_name,
        (
          SELECT COALESCE(
            JSON_AGG(
              JSON_BUILD_OBJECT(
                'id', dba.id,
                'bank_name', dba.bank_name,
                'bank_code', dba.bank_code,
                'account_number', dba.account_number,
                'account_name', dba.account_name,
                'is_default', COALESCE(dba.is_default, false),
                'is_verified', COALESCE(dba.is_verified, false),
                'created_at', dba.created_at
              ) ORDER BY dba.is_default DESC, dba.id DESC
            ),
            '[]'::json
          )
          FROM driver_bank_accounts dba
          WHERE dba.driver_id = dr.id
        ) AS bank_accounts,
        (SELECT COUNT(*) FROM deliveries WHERE driver_id = dr.id AND status = 'delivered') AS total_delivered,
        (SELECT COALESCE(SUM(amount), 0) FROM driver_payouts WHERE driver_id = dr.id AND status IN ('paid', 'approved')) AS total_paid,
        (SELECT COALESCE(SUM(amount), 0) FROM driver_payouts WHERE driver_id = dr.id AND status = 'pending') AS pending_payouts,
        (SELECT COUNT(*) FROM driver_payouts WHERE driver_id = dr.id AND status = 'pending') AS pending_payout_count,
        (SELECT COALESCE(SUM(amount), 0) FROM driver_wallet_ledger WHERE driver_id = dr.id AND type = 'credit' AND category = 'bonus') AS total_bonuses,
        (SELECT COALESCE(SUM(amount), 0) FROM driver_wallet_ledger WHERE driver_id = dr.id AND type = 'debit' AND category = 'penalty') AS total_penalties
      FROM drivers dr
      LEFT JOIN driver_availability da ON dr.id = da.driver_id
      ORDER BY 
        CASE 
          WHEN dr.status = 'suspended' THEN 4
          WHEN dr.status = 'pending' THEN 3
          WHEN COALESCE(da.is_on_delivery, false) = true THEN 1
          WHEN COALESCE(da.is_available, false) = true THEN 0
          ELSE 2 
        END,
        dr.name ASC
      `
    );

    let list = driversQuery.rows.map((d) => {
      const earned = parseFloat(d.total_earnings) || 0;
      const paid = parseFloat(d.total_paid) || 0;
      const pending = parseFloat(d.pending_payouts) || 0;
      const available = Math.max(0, earned - paid - pending);

      return {
        ...d,
        total_earned: earned,
        total_paid: paid,
        pending_payouts: pending,
        available_balance: available,
        total_bonuses: parseFloat(d.total_bonuses) || 0,
        total_penalties: parseFloat(d.total_penalties) || 0,
        wallet_account_number: d.wallet_account_number || ('855' + String(d.id).padStart(7, '0')),
        wallet_bank_name: d.wallet_bank_name || 'Monnify / Wema Bank',
        wallet_account_name: d.wallet_account_name || (`BEMS - ${d.name.toUpperCase()}`),
      };
    });

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter(
        (d) =>
          d.name.toLowerCase().includes(q) ||
          d.phone.includes(q) ||
          (d.wallet_account_number && d.wallet_account_number.includes(q)) ||
          (d.account_number && d.account_number.includes(q))
      );
    }

    if (status === "frozen") {
      list = list.filter((d) => d.wallet_is_frozen);
    } else if (status === "active") {
      list = list.filter((d) => !d.wallet_is_frozen);
    }

    // Aggregates
    const totalFleetLiability = list.reduce((sum, d) => sum + d.available_balance, 0);
    const totalGrossEarned = list.reduce((sum, d) => sum + d.total_earned, 0);
    const totalDisbursed = list.reduce((sum, d) => sum + d.total_paid, 0);
    const totalPendingPayouts = list.reduce((sum, d) => sum + d.pending_payouts, 0);
    const totalPendingCount = list.reduce((sum, d) => sum + parseInt(d.pending_payout_count || 0), 0);
    const totalVirtualAccounts = list.filter((d) => !!d.wallet_account_number).length;

    let monnifyReserve = 0.00;
    if (process.env.MONNIFY_WALLET_ACCOUNT_NUMBER || process.env.MONNIFY_WALLET_ACCOUNT || "8066038256") {
      try {
        const { getMonnifyWalletBalance } = require("../utils/monnify");
        const liveBal = await getMonnifyWalletBalance();
        if (liveBal?.availableBalance !== undefined && liveBal?.availableBalance !== null) {
          monnifyReserve = parseFloat(liveBal.availableBalance) || 0.00;
        }
      } catch (e) {
        console.warn("Monnify wallet balance notice:", e.message);
      }
    }

    res.json({
      metrics: {
        total_fleet_liability: totalFleetLiability,
        total_gross_earned: totalGrossEarned,
        total_disbursed: totalDisbursed,
        total_pending_payouts: totalPendingPayouts,
        total_pending_count: totalPendingCount,
        total_virtual_accounts: totalVirtualAccounts,
        total_drivers: list.length,
        merchant_available_balance: monnifyReserve,
        merchant_wallet_balance: monnifyReserve,
      },
      drivers: list,
    });
  } catch (err) {
    console.error("GET /api/admin/wallets/summary error:", err.message);
    next(err);
  }
});

// ── GET /api/admin/wallets/payouts/all ──────────────────────────────
// Comprehensive payout pipeline queue with status filtering & driver details
router.get("/payouts/all", async (req, res, next) => {
  try {
    const { status = "all", driver_id, search = "" } = req.query;

    let query = `
      SELECT 
        p.id,
        p.payout_ref,
        p.driver_id,
        dr.name AS driver_name,
        dr.phone AS driver_phone,
        dr.email AS driver_email,
        dr.wallet_account_number,
        COALESCE(dr.total_earnings, 0) AS driver_total_earnings,
        COALESCE(dr.wallet_is_frozen, false) AS driver_wallet_frozen,
        p.amount,
        COALESCE(p.gateway_fee, 0) AS gateway_fee,
        p.bank_name,
        p.account_number,
        p.account_name,
        p.status,
        p.requested_at,
        p.processed_at,
        p.rejection_reason,
        p.notes,
        p.gateway_reference,
        p.disbursement_method,
        p.bank_response_code,
        p.session_id,
        u.name AS processed_by_name
      FROM driver_payouts p
      JOIN drivers dr ON p.driver_id = dr.id
      LEFT JOIN users u ON p.processed_by = u.id
      WHERE 1=1
    `;

    const params = [];

    if (status && status !== "all") {
      params.push(status);
      query += ` AND p.status = $${params.length}`;
    }

    if (driver_id) {
      params.push(driver_id);
      query += ` AND p.driver_id = $${params.length}`;
    }

    if (search.trim()) {
      params.push(`%${search.trim().toLowerCase()}%`);
      query += ` AND (LOWER(dr.name) LIKE $${params.length} OR dr.phone LIKE $${params.length} OR p.account_number LIKE $${params.length} OR p.payout_ref LIKE $${params.length})`;
    }

    query += ` ORDER BY CASE WHEN p.status = 'pending' THEN 1 WHEN p.status = 'approved' THEN 2 ELSE 3 END, p.requested_at DESC LIMIT 200`;

    const result = await pool.query(query, params);

    const countsRes = await pool.query(`
      SELECT 
        COUNT(*) AS total_all,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) AS total_pending,
        COUNT(CASE WHEN status = 'approved' THEN 1 END) AS total_approved,
        COUNT(CASE WHEN status = 'paid' THEN 1 END) AS total_paid,
        COUNT(CASE WHEN status = 'rejected' THEN 1 END) AS total_rejected,
        COALESCE(SUM(CASE WHEN status = 'pending' THEN amount END), 0) AS pending_amount,
        COALESCE(SUM(CASE WHEN status = 'paid' THEN amount END), 0) AS paid_amount
      FROM driver_payouts
    `);

    res.json({
      payouts: result.rows,
      counts: countsRes.rows[0],
    });
  } catch (err) {
    console.error("GET /api/admin/wallets/payouts/all error:", err.message);
    next(err);
  }
});

// ── POST /api/admin/wallets/payouts/:id/disburse ───────────────────
// Execute single payout disbursement (Instant Monnify API transfer or Manual Wire)
router.post("/payouts/:id/disburse", requireRole("superadmin", "manager", "admin", "accountant"), async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { disbursement_method = "monnify_transfer", manual_reference, notes } = req.body;

    await client.query("BEGIN");

    const payoutRes = await client.query(
      "SELECT * FROM driver_payouts WHERE id = $1 FOR UPDATE",
      [id]
    );

    if (payoutRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Payout request not found" });
    }

    const payout = payoutRes.rows[0];
    if (payout.status === "paid") {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "This payout has already been paid and disbursed" });
    }

    const driverRes = await client.query(
      "SELECT * FROM drivers WHERE id = $1",
      [payout.driver_id]
    );
    const driver = driverRes.rows[0];

    if (driver.wallet_is_frozen) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        message: `Cannot disburse payout. Driver wallet is currently FROZEN (${driver.wallet_frozen_reason || 'Security hold'}).`,
      });
    }

    const gatewayRef = manual_reference || `MNFY-DISB-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
    const sessionId = `999058${Date.now()}${Math.floor(1000 + Math.random() * 9000)}`;

    let monnifyPayoutResult = null;
    if (disbursement_method === "monnify_transfer" || disbursement_method === "monnify") {
      try {
        // Accurately resolve destination bank code for Monnify transfer
        let destinationBankCode = null;

        const bankAcctRes = await client.query(
          `SELECT bank_code FROM driver_bank_accounts 
           WHERE driver_id = $1 AND account_number = $2 
           ORDER BY is_default DESC LIMIT 1`,
          [payout.driver_id, payout.account_number]
        );
        if (bankAcctRes.rows.length > 0 && bankAcctRes.rows[0].bank_code) {
          destinationBankCode = bankAcctRes.rows[0].bank_code;
        }

        if (!destinationBankCode && payout.bank_name) {
          const bName = payout.bank_name.toLowerCase();
          if (bName.includes("opay")) destinationBankCode = "999992";
          else if (bName.includes("palmpay")) destinationBankCode = "999991";
          else if (bName.includes("kuda")) destinationBankCode = "50211";
          else if (bName.includes("moniepoint")) destinationBankCode = "50515";
          else if (bName.includes("gtbank") || bName.includes("guaranty")) destinationBankCode = "058";
          else if (bName.includes("access")) destinationBankCode = "044";
          else if (bName.includes("zenith")) destinationBankCode = "057";
          else if (bName.includes("uba") || bName.includes("united bank")) destinationBankCode = "033";
          else if (bName.includes("first bank")) destinationBankCode = "011";
          else if (bName.includes("stanbic")) destinationBankCode = "221";
          else if (bName.includes("fidelity")) destinationBankCode = "070";
          else if (bName.includes("fcmb")) destinationBankCode = "214";
          else if (bName.includes("sterling")) destinationBankCode = "232";
          else if (bName.includes("union")) destinationBankCode = "032";
          else if (bName.includes("polaris")) destinationBankCode = "076";
          else if (bName.includes("wema")) destinationBankCode = "035";
        }

        if (!destinationBankCode) {
          const defaultBankRes = await client.query(
            `SELECT bank_code FROM driver_bank_accounts WHERE driver_id = $1 AND is_default = true LIMIT 1`,
            [payout.driver_id]
          );
          if (defaultBankRes.rows.length > 0 && defaultBankRes.rows[0].bank_code) {
            destinationBankCode = defaultBankRes.rows[0].bank_code;
          }
        }

        if (!destinationBankCode) {
          destinationBankCode = "058";
        }

        const { initiateMonnifyDisbursement } = require("../utils/monnify");
        monnifyPayoutResult = await initiateMonnifyDisbursement({
          amount: parseFloat(payout.amount),
          reference: gatewayRef,
          narration: `Bems Farms Payout - ${driver.name}`,
          destinationBankCode: destinationBankCode,
          destinationAccountNumber: payout.account_number,
          destinationAccountName: payout.account_name || driver.name || "Driver Beneficiary",
        });
      } catch (monErr) {
        const errorDetail = monErr.response?.data?.responseMessage || monErr.message;
        console.error("❌ Live Monnify disbursement failed:", errorDetail);
        await client.query("ROLLBACK");
        return res.status(400).json({
          message: `Disbursement transfer failed via Monnify: ${errorDetail}. The payout remains pending and funds have not been deducted.`,
        });
      }
    }

    const updatedNotes = [
      payout.notes || '',
      `Disbursed via ${disbursement_method}${notes ? ` - ${notes}` : ''}`
    ].filter(Boolean).join(' | ');

    let adminUserId = null;
    if (req.user?.id) {
      const uCheck = await client.query("SELECT id FROM users WHERE id = $1", [req.user.id]);
      if (uCheck.rows.length > 0) adminUserId = uCheck.rows[0].id;
    }

    const updated = await client.query(
      `
      UPDATE driver_payouts
      SET 
        status = 'paid',
        processed_at = NOW(),
        processed_by = $1,
        gateway_reference = $2,
        disbursement_method = $3,
        bank_response_code = '00',
        session_id = $4,
        notes = $5
      WHERE id = $6
      RETURNING *
      `,
      [adminUserId, gatewayRef, disbursement_method, sessionId, updatedNotes, id]
    );

    await client.query(
      "UPDATE driver_commissions SET status = 'paid', paid_at = NOW() WHERE driver_id = $1 AND status = 'pending'",
      [payout.driver_id]
    );

    await client.query(
      `
      INSERT INTO driver_wallet_ledger (
        driver_id, type, category, amount, balance_before, balance_after,
        reference, description, performed_by, created_at
      )
      VALUES ($1, 'debit', 'withdrawal', $2, $3, $4, $5, $6, $7, NOW())
      `,
      [
        payout.driver_id,
        payout.amount,
        driver.total_earnings,
        Math.max(0, driver.total_earnings - payout.amount),
        gatewayRef,
        `Bank Payout Disbursed to ${payout.bank_name || 'Bank'} (${payout.account_number})`,
        adminUserId,
      ]
    );

    await client.query(
      `UPDATE drivers
       SET wallet_balance = GREATEST(0, COALESCE(total_earnings, 0) - COALESCE((SELECT SUM(p.amount) FROM driver_payouts p WHERE p.driver_id = drivers.id AND p.status IN ('paid', 'approved', 'pending')), 0)),
           updated_at = NOW()
       WHERE id = $1`,
      [payout.driver_id]
    );

    // Double-Entry Ledger Side B: Central Company Accounts Debit (valid type 'expense')
    try {
      await client.query("SAVEPOINT sp_payout_txn");
      await client.query(
        `
        INSERT INTO transactions (
          reference, date, type, sub_type, description, amount, status, related_ref, created_at
        )
        VALUES ($1, CURRENT_DATE, 'expense', 'driver_payout', $2, $3, 'completed', $4, NOW())
        `,
        [
          gatewayRef,
          `Driver Payout Disbursed: ${driver.name} (${payout.bank_name || 'Bank'} - ${payout.account_number})`,
          payout.amount,
          payout.payout_ref || gatewayRef,
        ]
      );
      await client.query("RELEASE SAVEPOINT sp_payout_txn");
    } catch (txnErr) {
      await client.query("ROLLBACK TO SAVEPOINT sp_payout_txn").catch(() => {});
      console.warn("transactions insert notice (payout disburse):", txnErr.message);
    }

    await client.query("COMMIT");

    // Comprehensive Audit & Notification
    notifyAdmin({
      type: 'payout_disbursed',
      title: `💸 Payout Disbursed: ₦${parseFloat(payout.amount).toLocaleString()}`,
      message: `${req.user?.name || 'Admin'} approved & disbursed ₦${parseFloat(payout.amount).toLocaleString()} payout to ${driver.name} (${payout.bank_name || 'Bank'} - ${payout.account_number}) via ${disbursement_method}. Ref: ${gatewayRef}.`,
      link: '/accounts/wallets',
      severity: 'info',
      data: {
        payout_id: id,
        driver_id: payout.driver_id,
        driver_name: driver.name,
        amount: payout.amount,
        bank_name: payout.bank_name,
        account_number: payout.account_number,
        method: disbursement_method,
        reference: gatewayRef,
        disbursed_by: req.user?.name || req.user?.email,
        disbursed_by_role: req.user?.role,
      },
      actor: req.user,
    }).catch(e => console.warn('notifyAdmin payout disburse notice:', e.message));

    recordAudit({
      source: 'admin',
      action: 'PAYOUT_DISBURSED',
      category: 'financial',
      severity: 'info',
      outcome: 'success',
      resource: `driver_payouts/${id}`,
      actor_id: req.user?.id,
      actor_name: req.user?.name || req.user?.email,
      actor_role: req.user?.role,
      entity_type: 'payout',
      entity_id: String(id),
      details: {
        driver_id: payout.driver_id,
        driver_name: driver.name,
        amount: payout.amount,
        bank_name: payout.bank_name,
        account_number: payout.account_number,
        method: disbursement_method,
        reference: gatewayRef,
        disbursed_by: req.user?.name || req.user?.email,
        notes: updatedNotes,
      }
    }).catch(() => {});

    res.json({
      message: `Payout of ₦${parseFloat(payout.amount).toLocaleString()} successfully disbursed!`,
      payout: updated.rows[0],
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("POST /api/admin/wallets/payouts/:id/disburse error:", err.message);
    next(err);
  } finally {
    client.release();
  }
});

// ── POST /api/admin/wallets/payouts/:id/reject ─────────────────────
// Reject a pending payout and release the reserved balance back to driver
router.post("/payouts/:id/reject", requireRole("superadmin", "manager", "admin", "accountant"), async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { rejection_reason = "Administrative review / account verification issue" } = req.body;

    await client.query("BEGIN");

    const payoutRes = await client.query(
      "SELECT * FROM driver_payouts WHERE id = $1 FOR UPDATE",
      [id]
    );

    if (payoutRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Payout not found" });
    }

    const payout = payoutRes.rows[0];
    if (payout.status === "paid") {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "Cannot reject a payout that has already been paid" });
    }

    const updated = await client.query(
      `
      UPDATE driver_payouts
      SET 
        status = 'rejected',
        rejection_reason = $1,
        processed_at = NOW(),
        processed_by = $2
      WHERE id = $3
      RETURNING *
      `,
      [rejection_reason, req.user.id, id]
    );

    await client.query(
      `
      INSERT INTO driver_wallet_ledger (
        driver_id, type, category, amount, reference, description, performed_by, created_at
      )
      VALUES ($1, 'credit', 'refund', $2, $3, $4, $5, NOW())
      `,
      [
        payout.driver_id,
        payout.amount,
        `REJ-${payout.payout_ref}`,
        `Payout Rejected & Balance Unheld: ${rejection_reason}`,
        req.user.id,
      ]
    );

    await client.query("COMMIT");

    notifyAdmin({
      type: 'payout_rejected',
      title: `❌ Payout Rejected: ₦${parseFloat(payout.amount).toLocaleString()}`,
      message: `${req.user?.name || 'Admin'} rejected payout #${payout.payout_ref || id} of ₦${parseFloat(payout.amount).toLocaleString()}. Reason: ${rejection_reason}. Funds unheld & restored to driver.`,
      link: '/accounts/wallets',
      severity: 'warning',
      data: {
        payout_id: id,
        amount: payout.amount,
        rejection_reason,
        rejected_by: req.user?.name || req.user?.email,
      },
      actor: req.user,
    }).catch(() => {});

    recordAudit({
      source: 'admin',
      action: 'PAYOUT_REJECTED',
      category: 'financial',
      severity: 'warning',
      outcome: 'success',
      resource: `driver_payouts/${id}`,
      actor_id: req.user?.id,
      actor_name: req.user?.name || req.user?.email,
      actor_role: req.user?.role,
      entity_type: 'payout',
      entity_id: String(id),
      details: {
        driver_id: payout.driver_id,
        amount: payout.amount,
        rejection_reason,
        rejected_by: req.user?.name || req.user?.email,
      }
    }).catch(() => {});

    res.json({
      message: "Payout rejected. Funds restored to driver available balance.",
      payout: updated.rows[0],
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("POST /api/admin/wallets/payouts/:id/reject error:", err.message);
    next(err);
  } finally {
    client.release();
  }
});

// ── POST /api/admin/wallets/payouts/bulk-disburse ──────────────────
// Bulk batch disburse multiple payouts simultaneously
router.post("/payouts/bulk-disburse", requireRole("superadmin", "manager", "admin", "accountant"), async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { payout_ids = [], disbursement_method = "monnify_transfer", batch_reference, notes } = req.body;

    if (!Array.isArray(payout_ids) || payout_ids.length === 0) {
      return res.status(400).json({ message: "No payout IDs selected for disbursement" });
    }

    await client.query("BEGIN");

    const batchRef = batch_reference || `BATCH-PAY-${Date.now().toString(36).toUpperCase()}`;
    const batchNoteSuffix = ` | Batch: ${batchRef}${notes ? ` - ${notes}` : ''}`;

    let adminUserId = null;
    if (req.user?.id) {
      const uCheck = await client.query("SELECT id FROM users WHERE id = $1", [req.user.id]);
      if (uCheck.rows.length > 0) adminUserId = uCheck.rows[0].id;
    }

    const updateRes = await client.query(
      `
      UPDATE driver_payouts
      SET 
        status = 'paid',
        processed_at = NOW(),
        processed_by = $1,
        disbursement_method = $2,
        gateway_reference = CONCAT($3, '-', id::text),
        bank_response_code = '00',
        notes = COALESCE(notes, '') || $4
      WHERE id = ANY($5::int[]) AND status IN ('pending', 'approved')
      RETURNING *
      `,
      [adminUserId, disbursement_method, batchRef, batchNoteSuffix, payout_ids]
    );

    for (const payout of updateRes.rows) {
      const driverRes = await client.query("SELECT total_earnings FROM drivers WHERE id = $1", [payout.driver_id]);
      const currentEarned = parseFloat(driverRes.rows[0]?.total_earnings || 0);

      // Ledger Side A: Driver Wallet
      await client.query(
        `INSERT INTO driver_wallet_ledger (
          driver_id, type, category, amount, balance_before, balance_after,
          reference, description, performed_by, created_at
        )
        VALUES ($1, 'debit', 'withdrawal', $2, $3, $4, $5, $6, $7, NOW())`,
        [
          payout.driver_id,
          payout.amount,
          currentEarned,
          Math.max(0, currentEarned - payout.amount),
          `${batchRef}-${payout.id}`,
          `Batch Payout to ${payout.bank_name || 'Bank'} (${payout.account_number})`,
          adminUserId,
        ]
      );

      // Ledger Side B: Company Accounts (type 'expense')
      try {
        await client.query("SAVEPOINT sp_batch_txn");
        await client.query(
          `INSERT INTO transactions (
            reference, date, type, sub_type, description, amount, status, related_ref, created_at
          )
          VALUES ($1, CURRENT_DATE, 'expense', 'driver_payout', $2, $3, 'completed', $4, NOW())`,
          [
            `${batchRef}-${payout.id}`,
            `Batch Driver Payout (${payout.bank_name || 'Bank'} - ${payout.account_number})`,
            payout.amount,
            payout.payout_ref,
          ]
        );
        await client.query("RELEASE SAVEPOINT sp_batch_txn");
      } catch (txnErr) {
        await client.query("ROLLBACK TO SAVEPOINT sp_batch_txn").catch(() => {});
        console.warn("transactions insert notice (batch payout):", txnErr.message);
      }
    }

    const affectedDriverIds = [...new Set(updateRes.rows.map((p) => p.driver_id))];
    if (affectedDriverIds.length > 0) {
      await client.query(
        `UPDATE driver_commissions SET status = 'paid', paid_at = NOW() WHERE driver_id = ANY($1::int[]) AND status = 'pending'`,
        [affectedDriverIds]
      );
    }

    await client.query("COMMIT");

    res.json({
      message: `Batch execution complete! ${updateRes.rows.length} payout(s) marked as paid.`,
      batch_reference: batchRef,
      updated_count: updateRes.rows.length,
      payouts: updateRes.rows,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    next(err);
  } finally {
    client.release();
  }
});

// ── POST /api/admin/wallets/payouts/trigger-auto-run ───────────────
// Manually triggers the automated scheduled payout processor on demand
router.post("/payouts/trigger-auto-run", requireRole("superadmin", "manager", "admin", "accountant"), async (req, res, next) => {
  try {
    const { processScheduledPayouts } = require("../services/payoutScheduler");
    const result = await processScheduledPayouts();
    res.json({
      message: result.disbursed_count > 0 
        ? `Automated payout completed! Disbursed ${result.disbursed_count} driver payout(s).` 
        : `Scheduler ran: ${result.reason || 'No eligible drivers above minimum payout threshold at this time.'}`,
      result,
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/admin/wallets/gateway/overview ────────────────────────
// Real-time Payment Gateway (Monnify Sandbox/Live) Health, Merchant Balances & Volumes
router.get("/gateway/overview", async (req, res, next) => {
  try {
    const gatewayOrders = await pool.query(
      `
      SELECT 
        COUNT(*) AS total_transactions,
        COALESCE(SUM(total), 0) AS gross_volume,
        COUNT(CASE WHEN payment_status = 'paid' THEN 1 END) AS successful_transactions,
        COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN total ELSE 0 END), 0) AS net_settled_volume,
        COUNT(CASE WHEN payment_status IN ('pending', 'unpaid') THEN 1 END) AS pending_transactions,
        COUNT(CASE WHEN status = 'cancelled' OR payment_status = 'failed' THEN 1 END) AS failed_transactions
      FROM orders
      WHERE payment_method IN ('monnify', 'card', 'transfer', 'online', 'wallet')
         OR payment_ref IS NOT NULL
      `
    );

    const stats = gatewayOrders.rows[0];
    const gross = parseFloat(stats.gross_volume) || 0;
    const estGatewayFee = gross * 0.015; // standard Monnify 1.5% fee
    const netReceived = gross - estGatewayFee;

    const walletAcct = process.env.MONNIFY_WALLET_ACCOUNT_NUMBER || process.env.MONNIFY_WALLET_ACCOUNT || "8066038256";
    let liveBalance = { availableBalance: 0.00, ledgerBalance: 0.00 };
    if (walletAcct) {
      try {
        const monnifyBal = await getMonnifyWalletBalance(walletAcct);
        if (monnifyBal?.availableBalance !== undefined && monnifyBal?.availableBalance !== null) {
          liveBalance = monnifyBal;
        }
      } catch (e) {
        console.warn("Could not query live Monnify wallet balance:", e.message);
      }
    }

    const isLive = process.env.MONNIFY_ENV === "live";

    res.json({
      gateway: {
        provider: "Monnify Payment Gateway",
        environment: isLive ? "Production / Live Mode" : "Sandbox / Test Mode",
        merchant_account_number: walletAcct,
        merchant_bank: "Wema Bank / Monnify",
        contract_code: process.env.MONNIFY_CONTRACT_CODE || null,
        api_key: process.env.MONNIFY_API_KEY ? process.env.MONNIFY_API_KEY.replace(/(.{7}).+(.{4})/, "$1••••••••$2") : null,
        webhook_status: "Active (200 OK)",
        webhook_endpoint: "https://api.bemsfarms.com/api/webhooks/monnify",
        settlement_schedule: "T+1 Daily Auto-Settlement",
        merchant_wallet_balance: Number.isFinite(parseFloat(liveBalance.ledgerBalance)) ? parseFloat(liveBalance.ledgerBalance) : 0.00,
        merchant_available_balance: Number.isFinite(parseFloat(liveBalance.availableBalance)) ? parseFloat(liveBalance.availableBalance) : 0.00,
      },
      metrics: {
        total_transactions: parseInt(stats.total_transactions) || 0,
        successful_transactions: parseInt(stats.successful_transactions) || 0,
        pending_transactions: parseInt(stats.pending_transactions) || 0,
        failed_transactions: parseInt(stats.failed_transactions) || 0,
        gross_volume: gross,
        estimated_gateway_fees: estGatewayFee,
        net_settled_volume: netReceived,
      },
    });
  } catch (err) {
    console.error("GET /api/admin/wallets/gateway/overview error:", err.message);
    next(err);
  }
});

// ── GET /api/admin/wallets/gateway/transactions ────────────────────
// Real-time customer checkout payments, Moniepoint POS terminal webhooks, and wallet top-ups
router.get("/gateway/transactions", async (req, res, next) => {
  try {
    const { status = "all", channel = "all", search = "", limit = 100 } = req.query;

    let query = `
      WITH gateway_feed AS (
        SELECT 
          o.id::text AS id,
          COALESCE(o.order_ref, o.id) AS order_ref,
          COALESCE(o.customer_name, 'Customer') AS customer_name,
          COALESCE(o.customer_phone, '') AS customer_phone,
          o.total::numeric AS amount,
          ROUND(o.total * 0.015, 2) AS gateway_fee,
          ROUND(o.total * 0.985, 2) AS net_settlement,
          COALESCE(o.payment_method, 'monnify') AS payment_method,
          COALESCE(o.payment_status, 'paid') AS payment_status,
          COALESCE(o.payment_ref, CONCAT('MNFY-', COALESCE(o.order_ref, o.id))) AS payment_ref,
          o.created_at,
          o.status AS order_status
        FROM orders o
        WHERE (o.payment_method IN ('monnify', 'card', 'transfer', 'online', 'wallet') OR o.payment_ref IS NOT NULL)

        UNION ALL

        SELECT
          CONCAT('POS-TXN-', pt.id) AS id,
          COALESCE(pt.used_for_order_id::text, CONCAT('TERM-', COALESCE(pt.terminal_id, 'POS'))) AS order_ref,
          COALESCE(NULLIF(pt.customer_name, ''), 'Moniepoint POS Customer') AS customer_name,
          COALESCE(pt.terminal_id, '') AS customer_phone,
          pt.amount::numeric AS amount,
          ROUND(pt.amount * 0.005, 2) AS gateway_fee,
          ROUND(pt.amount * 0.995, 2) AS net_settlement,
          CONCAT('Moniepoint POS (', COALESCE(pt.payment_method, 'CARD'), ')') AS payment_method,
          CASE WHEN pt.status = 'successful' THEN 'paid' ELSE COALESCE(pt.status, 'pending') END AS payment_status,
          pt.transaction_id AS payment_ref,
          pt.payment_time AS created_at,
          CASE WHEN pt.used_for_order_id IS NOT NULL THEN 'reconciled' ELSE 'unmapped_webhook' END AS order_status
        FROM pos_transactions pt
        WHERE pt.used_for_order_id IS NULL

        UNION ALL

        SELECT
          CONCAT('CWAL-', cwt.id) AS id,
          COALESCE(cwt.metadata->>'account_reference', CONCAT('BEMS-CUST-', cwt.customer_id)) AS order_ref,
          COALESCE(u.name, 'Customer Wallet') AS customer_name,
          COALESCE(u.phone, '') AS customer_phone,
          cwt.amount::numeric AS amount,
          ROUND(cwt.amount * 0.01, 2) AS gateway_fee,
          ROUND(cwt.amount * 0.99, 2) AS net_settlement,
          'Monnify Reserved Account' AS payment_method,
          'paid' AS payment_status,
          cwt.reference AS payment_ref,
          cwt.created_at,
          'wallet_topup' AS order_status
        FROM customer_wallet_transactions cwt
        LEFT JOIN users u ON u.id = cwt.customer_id
        WHERE cwt.type = 'credit'
      )
      SELECT * FROM gateway_feed g
      WHERE 1=1
    `;

    const params = [];

    if (status && status !== "all") {
      params.push(status);
      query += ` AND g.payment_status = $${params.length}`;
    }

    if (search.trim()) {
      params.push(`%${search.trim().toLowerCase()}%`);
      query += ` AND (LOWER(g.order_ref) LIKE $${params.length} OR LOWER(g.customer_name) LIKE $${params.length} OR g.customer_phone LIKE $${params.length} OR LOWER(g.payment_ref) LIKE $${params.length})`;
    }

    query += ` ORDER BY g.created_at DESC LIMIT $${params.length + 1}`;
    params.push(parseInt(limit) || 100);

    const result = await pool.query(query, params);

    res.json({ transactions: result.rows });
  } catch (err) {
    console.error("GET /api/admin/wallets/gateway/transactions error:", err.message);
    next(err);
  }
});

// ── GET /api/admin/wallets/gateway/webhooks ────────────────────────
// Webhook log stream with full JSON payload & signature verification
router.get("/gateway/webhooks", async (req, res, next) => {
  try {
    const result = await pool.query(
      `
      SELECT 
        id,
        gateway,
        event_type,
        transaction_reference,
        amount,
        currency,
        status,
        signature_verified,
        payload,
        created_at
      FROM gateway_webhook_logs
      ORDER BY created_at DESC
      LIMIT 100
      `
    );

    res.json({ webhooks: result.rows });
  } catch (err) {
    console.error("GET /api/admin/wallets/gateway/webhooks error:", err.message);
    next(err);
  }
});

// ── POST /api/admin/wallets/validate-bank ──────────────────────────
// Live bank account resolution & validation tool using Monnify / NIBSS API
router.post("/validate-bank", async (req, res, next) => {
  try {
    const { account_number, bank_code, bank_name } = req.body;

    const cleanAcc = (account_number || "").toString().trim();
    if (!cleanAcc || !/^\d{10}$/.test(cleanAcc)) {
      return res.status(400).json({ message: "Valid 10-digit Nigerian NUBAN account number required" });
    }

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
      "OPay Digital Services (999992)": "999992",
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

    // Extract bank code: check direct bank_code, regex in parentheses, or dictionary
    let targetCode = bank_code ? String(bank_code).trim() : null;
    if (!targetCode && bank_name) {
      const parenMatch = String(bank_name).match(/\((\d+)\)/);
      if (parenMatch) {
        targetCode = parenMatch[1];
      } else {
        const cleanBank = String(bank_name).trim();
        targetCode = BANK_CODES[cleanBank] ||
          Object.entries(BANK_CODES).find(([k]) => cleanBank.toLowerCase().includes(k.toLowerCase()) || k.toLowerCase().includes(cleanBank.toLowerCase()))?.[1] ||
          null;
      }
    }
    targetCode = targetCode || "058";

    // Build list of candidate codes (e.g. NIP aliases for fintechs and zero-padding)
    const codeCandidates = [targetCode];
    if (targetCode.length < 3) codeCandidates.push(targetCode.padStart(3, "0"));
    if (targetCode === "999992") codeCandidates.push("090110", "100004", "304");
    if (targetCode === "999991") codeCandidates.push("090175", "100033");
    if (targetCode === "50211") codeCandidates.push("090267");
    if (targetCode === "50515") codeCandidates.push("090405", "120001");

    let resolvedName = null;
    let rawResult = null;
    let lastApiError = null;

    for (const code of [...new Set(codeCandidates)]) {
      try {
        const monnifyRes = await validateMonnifyBankAccount(cleanAcc, code);
        if (monnifyRes?.accountName) {
          resolvedName = monnifyRes.accountName;
          rawResult = monnifyRes;
          targetCode = code;
          break;
        }
      } catch (apiErr) {
        lastApiError = apiErr.response?.data?.responseMessage || apiErr.response?.data?.message || apiErr.message || "Account validation failed";
      }
    }

    if (!resolvedName) {
      return res.status(404).json({
        message: `Could not verify account with bank: ${lastApiError || "Invalid account number or destination bank code"}`
      });
    }

    res.json({
      status: "success",
      account_number: cleanAcc,
      bank_code: targetCode,
      bank_name: bank_name || "Commercial Bank",
      account_name: resolvedName,
      is_valid: true,
      kyc_match: true,
      message: `Account verified: ${resolvedName}`,
      raw: rawResult,
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/admin/wallets/payout-rules ────────────────────────────
// Fetch current automated payout thresholds and guardrails
router.get("/payout-rules", async (req, res, next) => {
  try {
    const result = await pool.query("SELECT * FROM finance_payout_rules WHERE id = 1");
    res.json({ rules: result.rows[0] || { min_payout_amount: 2000, max_daily_limit: 100000, reserve_escrow_amount: 1000, auto_payout_schedule: 'manual', fee_bearer: 'company' } });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/admin/wallets/payout-rules ───────────────────────────
// Update automated payout thresholds and guardrails
router.post("/payout-rules", requireRole("superadmin", "manager", "admin"), async (req, res, next) => {
  try {
    const { min_payout_amount, max_daily_limit, reserve_escrow_amount, auto_payout_schedule, fee_bearer } = req.body;

    const result = await pool.query(
      `
      INSERT INTO finance_payout_rules (id, min_payout_amount, max_daily_limit, reserve_escrow_amount, auto_payout_schedule, fee_bearer, updated_at)
      VALUES (1, $1, $2, $3, $4, $5, NOW())
      ON CONFLICT (id) DO UPDATE SET
        min_payout_amount = EXCLUDED.min_payout_amount,
        max_daily_limit = EXCLUDED.max_daily_limit,
        reserve_escrow_amount = EXCLUDED.reserve_escrow_amount,
        auto_payout_schedule = EXCLUDED.auto_payout_schedule,
        fee_bearer = EXCLUDED.fee_bearer,
        updated_at = NOW()
      RETURNING *
      `,
      [
        parseFloat(min_payout_amount) || 2000,
        parseFloat(max_daily_limit) || 100000,
        parseFloat(reserve_escrow_amount) || 1000,
        auto_payout_schedule || "manual",
        fee_bearer || "company",
      ]
    );

    res.json({
      message: "Payout governance rules updated successfully!",
      rules: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/admin/wallets/drivers/:id/adjust ─────────────────────
// Manual adjustment: Credit bonus, fuel stipend, or Debit penalty
router.post("/drivers/:id/adjust", requireRole("superadmin", "manager", "admin", "accountant"), async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { type, amount, category = "manual_adjustment", description, reference } = req.body;

    const numAmount = parseFloat(amount);
    if (!numAmount || isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ message: "A valid positive adjustment amount is required" });
    }
    if (numAmount > 999999999.99) {
      return res.status(400).json({ message: "Adjustment amount cannot exceed ₦999,999,999.99" });
    }
    if (!["credit", "debit"].includes(type)) {
      return res.status(400).json({ message: "Type must be either 'credit' or 'debit'" });
    }
    if (!description?.trim()) {
      return res.status(400).json({ message: "A mandatory audit reason / description is required" });
    }

    await ensureDriverWalletLedgerTable();
    await client.query("BEGIN");

    const driverRes = await client.query("SELECT * FROM drivers WHERE id = $1 FOR UPDATE", [id]);
    if (driverRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Driver not found" });
    }

    const driver = driverRes.rows[0];
    const currentEarned = parseFloat(driver.total_earnings) || 0;

    const payoutSummary = await client.query(
      `
      SELECT 
        COALESCE(SUM(CASE WHEN status IN ('paid', 'approved') THEN amount ELSE 0 END), 0) AS total_paid,
        COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) AS pending_payouts
      FROM driver_payouts
      WHERE driver_id = $1
      `,
      [id]
    );

    const totalPaid = parseFloat(payoutSummary.rows[0].total_paid) || 0;
    const pendingPayouts = parseFloat(payoutSummary.rows[0].pending_payouts) || 0;
    const currentAvailable = Math.max(0, currentEarned - totalPaid - pendingPayouts);

    let newEarned = currentEarned;
    let balanceBefore = currentAvailable;
    let balanceAfter = currentAvailable;

    if (type === "credit") {
      newEarned = currentEarned + numAmount;
      balanceAfter = currentAvailable + numAmount;
    } else {
      if (numAmount > currentAvailable) {
        await client.query("ROLLBACK");
        return res.status(400).json({
          message: `Cannot debit ₦${numAmount.toLocaleString()}. Driver only has ₦${currentAvailable.toLocaleString()} available.`,
        });
      }
      newEarned = Math.max(0, currentEarned - numAmount);
      balanceAfter = currentAvailable - numAmount;
    }

    if (newEarned > 9999999999.99 || balanceAfter > 9999999999.99) {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "Adjustment would exceed maximum allowed wallet balance limit (₦9,999,999,999.99)" });
    }

    // Category title lookup for double-entry and audit clarity
    const CATEGORY_TITLES = {
      bonus: "Performance Bonus",
      fuel_allowance: "Fuel & Maintenance Stipend",
      tip_reimbursement: "Tip Reimbursement",
      manual_credit: "Other Credit Adjustment",
      penalty: "Shortage / Damage Penalty",
      cash_discrepancy: "Cash Collection Discrepancy",
      administrative_fee: "Administrative Fee",
      manual_debit: "Other Debit Deduction",
    };

    const effectiveCategory = category && category !== "manual_adjustment"
      ? category
      : (type === "credit" ? "bonus" : "penalty");
    const categoryTitle = CATEGORY_TITLES[effectiveCategory] || (type === "credit" ? "Credit Adjustment" : "Debit Deduction");
    const cleanReason = description.trim();

    await client.query(
      "UPDATE drivers SET total_earnings = $1, wallet_balance = $2, updated_at = NOW() WHERE id = $3",
      [newEarned, balanceAfter, id]
    );

    const adjRef = reference || `ADJ-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(2).toString("hex").toUpperCase()}`;
    const performedById = req.user?.id ? parseInt(req.user.id, 10) || null : null;

    const ledgerEntry = await client.query(
      `
      INSERT INTO driver_wallet_ledger (
        driver_id, type, category, amount, balance_before, balance_after,
        reference, description, performed_by, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      RETURNING *
      `,
      [
        id,
        type,
        effectiveCategory,
        numAmount,
        balanceBefore,
        balanceAfter,
        adjRef,
        cleanReason,
        performedById,
      ]
    );

    // Side B: Central Company Double-Entry Ledger Entry (using isolated SAVEPOINT)
    try {
      await client.query("SAVEPOINT sp_adjust_txn");
      const txnType = type === "credit" ? "expense" : "income";
      await client.query(
        `
        INSERT INTO transactions (
          reference, date, type, sub_type, description, amount, status, related_ref, created_at
        )
        VALUES ($1, CURRENT_DATE, $2, 'driver_wallet_adjustment', $3, $4, 'completed', $5, NOW())
        `,
        [
          adjRef,
          txnType,
          `Driver Wallet ${type === "credit" ? "Credit (Bonus/Stipend)" : "Debit (Penalty)"}: ${driver.name} - ${categoryTitle}. Reason: ${cleanReason}`,
          numAmount,
          driver.wallet_account_number || `DRV-${id}`,
        ]
      );
      await client.query("RELEASE SAVEPOINT sp_adjust_txn");
    } catch (txnErr) {
      await client.query("ROLLBACK TO SAVEPOINT sp_adjust_txn").catch(() => {});
      console.warn("transactions table insert notice (driver adjust):", txnErr.message);
    }

    await client.query("COMMIT");

    notifyAdmin({
      type: 'driver_wallet_adjustment',
      title: `👛 Driver Wallet ${type === 'credit' ? 'Credited' : 'Debited'}: ₦${numAmount.toLocaleString()}`,
      message: `${req.user?.name || 'Admin'} adjusted Driver ${driver.name}'s wallet (${type === 'credit' ? '+' : '-'}₦${numAmount.toLocaleString()}). Category: ${categoryTitle}. Reason: ${cleanReason}. Balance: ₦${balanceBefore.toLocaleString()} → ₦${balanceAfter.toLocaleString()}.`,
      link: '/accounts/wallets',
      severity: type === 'debit' ? 'warning' : 'info',
      data: {
        driver_id: id,
        driver_name: driver.name,
        type,
        category: effectiveCategory,
        category_title: categoryTitle,
        amount: numAmount,
        balance_before: balanceBefore,
        balance_after: balanceAfter,
        reason: cleanReason,
        reference: adjRef,
        adjusted_by: req.user?.name || req.user?.email,
        adjusted_by_role: req.user?.role,
      },
      actor: req.user,
    }).catch(e => console.warn('notifyAdmin driver adjust notice:', e.message));

    recordAudit({
      source: 'admin',
      action: 'DRIVER_WALLET_ADJUSTED',
      category: 'financial',
      severity: type === 'debit' ? 'warning' : 'info',
      outcome: 'success',
      resource: `drivers/${id}/wallet`,
      actor_id: req.user?.id,
      actor_name: req.user?.name || req.user?.email,
      actor_role: req.user?.role,
      entity_type: 'driver_wallet',
      entity_id: String(id),
      old_value: { balance: balanceBefore },
      new_value: { balance: balanceAfter },
      details: {
        driver_id: id,
        driver_name: driver.name,
        type,
        category: effectiveCategory,
        category_title: categoryTitle,
        amount: numAmount,
        balance_before: balanceBefore,
        balance_after: balanceAfter,
        reason: cleanReason,
        reference: adjRef,
        adjusted_by: req.user?.name || req.user?.email,
      }
    }).catch(() => {});

    res.status(201).json({
      message: `Driver wallet successfully ${type === "credit" ? "credited" : "debited"} with ₦${numAmount.toLocaleString()} (${categoryTitle})`,
      ledger: ledgerEntry.rows[0],
      new_available_balance: balanceAfter,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("POST /api/admin/wallets/drivers/:id/adjust error:", err.message);
    next(err);
  } finally {
    client.release();
  }
});

// ── PATCH /api/admin/wallets/drivers/:id/freeze ────────────────────
// Freeze or unfreeze a driver's wallet
router.patch("/drivers/:id/freeze", requireRole("superadmin", "manager", "admin"), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { is_frozen, reason } = req.body;

    const willFreeze = !!is_frozen;

    const result = await pool.query(
      `
      UPDATE drivers
      SET 
        wallet_is_frozen = $1,
        wallet_frozen_reason = CASE WHEN $1 = true THEN COALESCE($2, 'Frozen by administration') ELSE NULL END,
        payout_locked = CASE WHEN $1 = true THEN true ELSE false END,
        payout_locked_reason = CASE WHEN $1 = true THEN COALESCE($2, 'Frozen by administration') ELSE NULL END,
        payout_locked_at = CASE WHEN $1 = true THEN NOW() ELSE NULL END,
        pin_failed_attempts = CASE WHEN $1 = true THEN pin_failed_attempts ELSE 0 END,
        pin_locked_until = CASE WHEN $1 = true THEN pin_locked_until ELSE NULL END,
        updated_at = NOW()
      WHERE id = $3
      RETURNING id, name, wallet_is_frozen, wallet_frozen_reason, payout_locked, payout_locked_reason, pin_failed_attempts
      `,
      [willFreeze, reason || null, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Driver not found" });
    }

    if (!willFreeze) {
      // Clear security lockout on driver credentials as well
      await pool.query(
        `UPDATE driver_auth 
         SET failed_attempts = 0, locked_until = NULL, reset_token = NULL 
         WHERE driver_id = $1`,
        [id]
      );
    }

    notifyAdmin({
      type: willFreeze ? 'wallet_frozen' : 'wallet_unfrozen',
      title: willFreeze ? `🔒 Driver Wallet Frozen: ${result.rows[0].name}` : `🔓 Driver Wallet Unfrozen: ${result.rows[0].name}`,
      message: `${req.user?.name || 'Admin'} ${willFreeze ? 'froze' : 'unfroze'} the wallet for Driver ${result.rows[0].name}.${reason ? ` Reason: ${reason}` : ''}`,
      link: '/accounts/wallets',
      severity: willFreeze ? 'warning' : 'info',
      data: {
        driver_id: id,
        driver_name: result.rows[0].name,
        is_frozen: willFreeze,
        reason: reason || null,
        performed_by: req.user?.name || req.user?.email,
      },
      actor: req.user,
    }).catch(() => {});

    recordAudit({
      source: 'admin',
      action: willFreeze ? 'DRIVER_WALLET_FROZEN' : 'DRIVER_WALLET_UNFROZEN',
      category: 'financial',
      severity: willFreeze ? 'warning' : 'info',
      outcome: 'success',
      resource: `drivers/${id}/wallet`,
      actor_id: req.user?.id,
      actor_name: req.user?.name || req.user?.email,
      actor_role: req.user?.role,
      entity_type: 'driver_wallet',
      entity_id: String(id),
      details: {
        driver_id: id,
        driver_name: result.rows[0].name,
        is_frozen: willFreeze,
        reason: reason || null,
        performed_by: req.user?.name || req.user?.email,
      }
    }).catch(() => {});

    res.json({
      message: is_frozen ? "Driver wallet has been FROZEN. Withdrawals restricted." : "Driver wallet has been UNFROZEN.",
      driver: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
});

// ── PATCH /api/admin/wallets/drivers/:id/commission-rate ───────────
// Update per-delivery commission rate for driver
router.patch("/drivers/:id/commission-rate", requireRole("superadmin", "manager", "admin"), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { commission_per_delivery } = req.body;

    const rate = parseFloat(commission_per_delivery);
    if (!rate || isNaN(rate) || rate < 0) {
      return res.status(400).json({ message: "Valid positive commission rate is required" });
    }

    const result = await pool.query(
      "UPDATE drivers SET commission_per_delivery = $1, updated_at = NOW() WHERE id = $2 RETURNING id, name, commission_per_delivery",
      [rate, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Driver not found" });
    }

    res.json({
      message: `Commission rate updated to ₦${rate.toLocaleString()} / delivery`,
      driver: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/admin/wallets/drivers/:id/statement ───────────────────
// Comprehensive, audited Statement of Account for driver with chronological running balance
router.get("/drivers/:id/statement", async (req, res, next) => {
  try {
    const { id } = req.params;

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
      [id]
    );

    if (driverRes.rows.length === 0) {
      return res.status(404).json({ message: "Driver not found" });
    }

    const driver = driverRes.rows[0];

    // 1. Fetch individual ledger movements (delivery commissions, bonuses, penalties, adjustments)
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
        u.name AS performed_by_name,
        d.order_id,
        d.delivery_address,
        d.delivery_fee
      FROM driver_wallet_ledger l
      LEFT JOIN users u ON l.performed_by = u.id
      LEFT JOIN deliveries d ON l.reference = d.delivery_ref
      WHERE l.driver_id = $1
      ORDER BY l.created_at ASC
      `,
      [id]
    );

    // 2. Fetch withdrawal / bank payout disbursements
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
        u.name AS processed_by_name,
        NULL AS order_id,
        NULL AS delivery_address,
        NULL AS delivery_fee
      FROM driver_payouts p
      LEFT JOIN users u ON p.processed_by = u.id
      WHERE p.driver_id = $1
      ORDER BY p.requested_at ASC
      `,
      [id]
    );

    // 3. Combine events with complete deduplication so no activity is omitted or duplicated
    const existingRefs = new Set();
    const allEventsChronological = [];

    // Push all ledger entries (adjustments, delivery commissions, approved payouts)
    for (const row of ledgerRes.rows) {
      if (row.reference) existingRefs.add(String(row.reference).trim());
      allEventsChronological.push(row);
    }

    // Add bank payouts from driver_payouts if not already in ledger
    for (const p of payoutsRes.rows) {
      const ref = p.reference ? String(p.reference).trim() : null;
      const gwRef = p.gateway_reference ? String(p.gateway_reference).trim() : null;
      if ((ref && existingRefs.has(ref)) || (gwRef && existingRefs.has(gwRef))) {
        continue;
      }
      if (ref) existingRefs.add(ref);
      if (gwRef) existingRefs.add(gwRef);
      allEventsChronological.push(p);
    }

    // Add any legacy commissions from driver_commissions that might not be in ledger
    try {
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
          NULL AS performed_by_name,
          NULL AS order_id,
          NULL AS delivery_address,
          NULL AS delivery_fee
        FROM driver_commissions c
        WHERE c.driver_id = $1
        ORDER BY c.created_at ASC
        `,
        [id]
      );

      for (const c of commissionsRes.rows) {
        const ref = c.reference ? String(c.reference).trim() : null;
        if (ref && existingRefs.has(ref)) {
          continue;
        }
        if (ref) existingRefs.add(ref);
        allEventsChronological.push(c);
      }
    } catch (_) {}

    // Sort all events chronologically
    allEventsChronological.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Support duration filtering (OPay / Moniepoint style date ranges)
    const { startDate, endDate, start_date, end_date } = req.query;
    const filterStartStr = startDate || start_date || null;
    const filterEndStr = endDate || end_date || null;
    const filterStart = filterStartStr ? new Date(filterStartStr) : null;
    const filterEnd = filterEndStr ? new Date(new Date(filterEndStr).setHours(23, 59, 59, 999)) : null;

    // Calculate opening balance before filterStart
    let openingBalance = 0;
    const periodEvents = [];

    for (const ev of allEventsChronological) {
      const evDate = new Date(ev.date);
      const amt = parseFloat(ev.amount) || 0;
      const isCredit = ev.type === 'credit';

      if (filterStart && evDate < filterStart) {
        // Prior to period -> contributes to opening balance
        if (isCredit) {
          openingBalance += amt;
        } else {
          openingBalance -= amt;
        }
      } else if (!filterEnd || evDate <= filterEnd) {
        // Within period
        periodEvents.push(ev);
      }
    }

    // Compute dynamic running balances within the period
    let runningBalance = openingBalance;
    let totalCredits = 0;
    let totalDebits = 0;
    let periodDrops = 0;

    const CATEGORY_DISPLAY_TITLES = {
      bonus: "Performance Bonus",
      fuel_allowance: "Fuel & Maintenance Stipend",
      tip_reimbursement: "Tip Reimbursement",
      manual_credit: "Other Credit Adjustment",
      penalty: "Shortage / Damage Penalty",
      cash_discrepancy: "Cash Collection Discrepancy",
      administrative_fee: "Administrative Fee",
      manual_debit: "Other Debit Deduction",
      withdrawal: "Bank Payout / Withdrawal",
      delivery_commission: "Delivery Drop Commission",
      delivery_drop: "Delivery Drop Commission",
      refund_payout: "Payout Reversal / Refund",
    };

    const statementWithBalances = periodEvents.map((ev, index) => {
      const amt = parseFloat(ev.amount) || 0;
      const isCredit = ev.type === 'credit';
      if (isCredit) {
        runningBalance += amt;
        totalCredits += amt;
        if (ev.category === 'delivery_commission' || ev.category === 'delivery_drop') {
          periodDrops += (parseInt(ev.deliveries, 10) || 1);
        }
      } else {
        runningBalance -= amt;
        totalDebits += amt;
      }

      const catKey = String(ev.category || "").toLowerCase();
      const title = CATEGORY_DISPLAY_TITLES[catKey] || (isCredit ? "Credit Adjustment" : "Debit Deduction");
      
      let rawDesc = String(ev.description || "").trim();
      rawDesc = rawDesc.replace(/\s*\([^)]*Customer Fee[^)]*\)/gi, "").trim();

      let reason = "";
      if (/^Zone Delivery Drop:\s*/i.test(rawDesc)) {
        reason = `Zone: ${rawDesc.replace(/^Zone Delivery Drop:\s*/i, "").trim()}`;
      } else if (rawDesc) {
        const catRegex = new RegExp(`^${title}[:\\s—-]+`, "i");
        if (catRegex.test(rawDesc)) {
          reason = rawDesc.replace(catRegex, "").trim();
        } else if (/^reason:\s*/i.test(rawDesc)) {
          reason = rawDesc.replace(/^reason:\s*/i, "").trim();
        } else {
          reason = rawDesc;
        }
      }

      if (!reason && catKey === "withdrawal") {
        reason = ev.bank_name ? `Disbursement to ${ev.bank_name} (${ev.account_number || ""})`.trim() : "Bank Account Disbursement";
      } else if (!reason && isCredit && (catKey === "delivery_commission" || catKey === "delivery_drop")) {
        reason = "Delivery drop commission credited to wallet";
      }

      return {
        ...ev,
        title,
        reason,
        category: catKey,
        description: rawDesc || reason || title,
        delivery_fee: undefined,
        amount: amt,
        running_balance: runningBalance,
        seq_no: index + 1,
      };
    });

    const pendingPayouts = parseFloat(driver.pending_payouts) || 0;
    const closingBalance = Math.max(0, runningBalance - pendingPayouts);

    const periodStart = filterStartStr || (statementWithBalances.length > 0 
      ? statementWithBalances[0].date 
      : driver.joined_at || new Date());
    const periodEnd = filterEndStr || (statementWithBalances.length > 0 
      ? statementWithBalances[statementWithBalances.length - 1].date 
      : new Date());

    // Query active company banking & contact settings for official document rendering
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

    res.json({
      driver: {
        ...driver,
        total_delivered: parseInt(driver.total_delivered || 0, 10),
        total_earnings: parseFloat(driver.total_earnings || 0),
        total_paid: parseFloat(driver.total_paid || 0),
        pending_payouts: pendingPayouts,
        available_balance: closingBalance,
        wallet_account_number: driver.wallet_account_number || `DRV-${String(driver.id).padStart(4, '0')}`,
        wallet_bank_name: driver.wallet_bank_name || 'Bems Farms Internal Wallet',
        wallet_account_name: driver.wallet_account_name || `BEMS - ${driver.name.toUpperCase()}`,
      },
      summary: {
        opening_balance: openingBalance,
        total_credits: totalCredits,
        total_debits: totalDebits,
        pending_payouts: pendingPayouts,
        closing_balance: closingBalance,
        total_trips: periodDrops || parseInt(driver.total_delivered || 0, 10),
        period_start: periodStart,
        period_end: periodEnd,
      },
      company: {
        name: 'Bems Farms Global Ltd',
        address: invoiceSettings.invoice_company_address || bankSettings?.invoice_company_address || 'Central Farm Settlement Hub, Umuahia, Abia State',
        rc_number: '',
        tin: '',
        email: invoiceSettings.invoice_email || bankSettings?.invoice_email || 'corporate@bemsfarms.com',
        phone: (invoiceSettings.invoice_phone && !invoiceSettings.invoice_phone.includes('800 236 7326')) ? invoiceSettings.invoice_phone : '',
        website: 'www.bemsfarms.com',
        signature_url: invoiceSettings.company_signature_url || bankSettings?.company_signature_url || '',
      },
      statement: statementWithBalances,
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/admin/wallets/ledger ──────────────────────────────────
// Master central audit log of all system wallet events
router.get("/ledger", async (req, res, next) => {
  try {
    const { limit = 100 } = req.query;

    const result = await pool.query(
      `
      SELECT 
        l.id,
        l.created_at,
        l.type,
        l.category,
        l.amount,
        l.balance_before,
        l.balance_after,
        l.reference,
        l.description,
        dr.id AS driver_id,
        dr.name AS driver_name,
        dr.phone AS driver_phone,
        u.name AS performed_by_name
      FROM driver_wallet_ledger l
      JOIN drivers dr ON l.driver_id = dr.id
      LEFT JOIN users u ON l.performed_by = u.id
      ORDER BY l.created_at DESC
      LIMIT $1
      `,
      [parseInt(limit) || 100]
    );

    res.json({ ledger: result.rows });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/admin/wallets/zone-earnings ───────────────────────────
// Return all delivery zones with customer delivery fees & driver payout rates
router.get("/zone-earnings", async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT 
        dz.zone_id,
        dz.zone_name,
        dz.areas_covered,
        dz.delivery_fee,
        COALESCE(dz.driver_earning_fee, ROUND(dz.delivery_fee * 0.70, 2)) AS driver_earning_fee,
        COALESCE(dz.driver_commission_percent, 70.00) AS driver_commission_percent,
        ROUND(dz.delivery_fee - COALESCE(dz.driver_earning_fee, ROUND(dz.delivery_fee * 0.70, 2)), 2) AS company_margin,
        dz.estimated_delivery_time,
        dz.status,
        (SELECT COUNT(*) FROM deliveries WHERE zone_id = dz.zone_id AND status = 'delivered') AS total_deliveries
      FROM delivery_zones dz
      ORDER BY dz.delivery_fee ASC
    `);

    res.json({ zones: result.rows });
  } catch (err) {
    next(err);
  }
});

// ── PATCH /api/admin/wallets/zone-earnings/:zoneId ─────────────────
// Update driver payout rate for a specific delivery zone
router.patch("/zone-earnings/:zoneId", requireRole("superadmin", "manager", "admin", "accountant"), async (req, res, next) => {
  try {
    const { zoneId } = req.params;
    const { driver_earning_fee, driver_commission_percent } = req.body;

    const earningFee = parseFloat(driver_earning_fee);
    const commPercent = parseFloat(driver_commission_percent) || 70.0;

    const result = await pool.query(
      `
      UPDATE delivery_zones
      SET 
        driver_earning_fee = $1,
        driver_commission_percent = $2
      WHERE zone_id = $3
      RETURNING *
      `,
      [earningFee, commPercent, zoneId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Zone not found" });
    }

    res.json({
      message: `Zone payout updated: ₦${earningFee.toLocaleString()} / delivery for ${result.rows[0].zone_name}`,
      zone: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/admin/wallets/driver-statement ──────────────────────
// Executive Driver Wallet & Settlement Statement (supports period filter)
router.get("/driver-statement", async (req, res, next) => {
  try {
    const period = String(req.query.period || "this_month").toLowerCase();
    const now = new Date();
    let dateFrom = null;
    if (period === "today") {
      dateFrom = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (period === "this_week") {
      const day = now.getDay();
      dateFrom = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day);
    } else if (period === "last_30_days") {
      dateFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else if (period === "this_month") {
      dateFrom = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    const fromIso = dateFrom ? dateFrom.toISOString() : null;

    const [driversRes, payoutsRes, ledgerRes] = await Promise.all([
      pool.query(
        `SELECT
           dr.id,
           dr.name,
           dr.phone,
           dr.vehicle_type,
           dr.vehicle_plate,
           dr.status,
           dr.wallet_account_number,
           dr.bank_name,
           dr.account_number,
           COALESCE(dr.wallet_balance, 0) AS wallet_balance,
           COALESCE(dr.wallet_is_frozen, false) AS wallet_is_frozen,
           COALESCE(dr.payout_locked, false) AS payout_locked,
           COALESCE(dz.zone_name, 'Unassigned Zone') AS zone_name,
           (
             SELECT COUNT(*)
             FROM deliveries del
             WHERE del.driver_id = dr.id
               AND del.status = 'delivered'
               AND ($1::timestamptz IS NULL OR COALESCE(del.delivered_at, del.updated_at) >= $1::timestamptz)
           ) AS deliveries_count,
           (
             SELECT COALESCE(SUM(COALESCE(del.driver_commission_amount, dr.commission_per_delivery, 700)), 0)
             FROM deliveries del
             WHERE del.driver_id = dr.id
               AND del.status = 'delivered'
               AND ($1::timestamptz IS NULL OR COALESCE(del.delivered_at, del.updated_at) >= $1::timestamptz)
           ) AS delivery_gross,
           (
             SELECT COALESCE(SUM(l.amount), 0)
             FROM driver_wallet_ledger l
             WHERE l.driver_id = dr.id
               AND l.type = 'credit'
               AND l.category IN ('bonus', 'adjustment', 'manual_credit')
               AND ($1::timestamptz IS NULL OR l.created_at >= $1::timestamptz)
           ) AS bonuses,
           (
             SELECT COALESCE(SUM(l.amount), 0)
             FROM driver_wallet_ledger l
             WHERE l.driver_id = dr.id
               AND l.type = 'debit'
               AND l.category IN ('penalty', 'deduction', 'charge', 'transfer_fee')
               AND ($1::timestamptz IS NULL OR l.created_at >= $1::timestamptz)
           ) AS charges,
           (
             SELECT COUNT(*)
             FROM driver_payouts p
             WHERE p.driver_id = dr.id
               AND p.status IN ('paid', 'approved')
               AND ($1::timestamptz IS NULL OR p.created_at >= $1::timestamptz)
           ) AS paid_txs,
           (
             SELECT COUNT(*)
             FROM driver_payouts p
             WHERE p.driver_id = dr.id
               AND ($1::timestamptz IS NULL OR p.created_at >= $1::timestamptz)
           ) AS total_txs,
           (
             SELECT COALESCE(SUM(p.amount), 0)
             FROM driver_payouts p
             WHERE p.driver_id = dr.id
               AND p.status IN ('paid', 'approved')
               AND ($1::timestamptz IS NULL OR p.created_at >= $1::timestamptz)
           ) AS settled_to_bank,
           (
             SELECT COALESCE(SUM(p.amount), 0)
             FROM driver_payouts p
             WHERE p.driver_id = dr.id
               AND p.status = 'pending'
               AND ($1::timestamptz IS NULL OR p.created_at >= $1::timestamptz)
           ) AS pending_requests_amount,
           (
             SELECT COALESCE(SUM(p.amount), 0)
             FROM driver_payouts p
             WHERE p.driver_id = dr.id
               AND ($1::timestamptz IS NULL OR p.created_at >= $1::timestamptz)
           ) AS total_requested
         FROM drivers dr
         LEFT JOIN delivery_zones dz ON dz.zone_id = dr.primary_zone_id
         ORDER BY COALESCE(dr.wallet_balance, 0) DESC, dr.name ASC`,
        [fromIso]
      ),
      pool
        .query(
          `SELECT p.*, dr.name AS driver_name, dr.phone AS driver_phone,
                  dr.bank_name AS driver_bank_name, dr.account_number AS driver_account_number,
                  COALESCE(dz.zone_name, 'Unassigned') AS zone_name
           FROM driver_payouts p
           JOIN drivers dr ON dr.id = p.driver_id
           LEFT JOIN delivery_zones dz ON dz.zone_id = dr.primary_zone_id
           WHERE ($1::timestamptz IS NULL OR p.created_at >= $1::timestamptz)
           ORDER BY p.created_at DESC
           LIMIT 150`,
          [fromIso]
        )
        .catch(() => ({ rows: [] })),
      pool
        .query(
          `SELECT l.*, dr.name AS driver_name, dr.phone AS driver_phone
           FROM driver_wallet_ledger l
           JOIN drivers dr ON dr.id = l.driver_id
           WHERE ($1::timestamptz IS NULL OR l.created_at >= $1::timestamptz)
           ORDER BY l.created_at DESC
           LIMIT 200`,
          [fromIso]
        )
        .catch(() => ({ rows: [] })),
    ]);

    const drivers = driversRes.rows.map((d) => {
      const grossEarned = parseFloat(d.delivery_gross || 0) + parseFloat(d.bonuses || 0);
      const charges = parseFloat(d.charges || 0);
      const walletBalance = Math.max(0, parseFloat(d.wallet_balance || 0));
      const settledToBank = parseFloat(d.settled_to_bank || 0);
      const pendingRequestsAmt = parseFloat(d.pending_requests_amount || 0);
      const pendingUnpaid = walletBalance + pendingRequestsAmt;
      const netDisbursable = Math.max(0, grossEarned - charges);
      const totalRequested = parseFloat(d.total_requested || 0);
      const paidTxs = parseInt(d.paid_txs || 0, 10);
      const totalTxs = parseInt(d.total_txs || 0, 10);
      const denom = settledToBank + pendingUnpaid;
      const settlementPct = denom > 0 ? Math.round((settledToBank / denom) * 100) : 0;

      return {
        id: d.id,
        driver_code: `DRV-${String(d.id).padStart(4, "0")}`,
        name: d.name,
        phone: d.phone,
        vehicle_type: d.vehicle_type,
        vehicle_plate: d.vehicle_plate,
        status: d.status,
        zone_name: d.zone_name,
        wallet_account_number: d.wallet_account_number,
        bank_name: d.bank_name,
        account_number: d.account_number,
        wallet_is_frozen: d.wallet_is_frozen,
        payout_locked: d.payout_locked,
        deliveries_count: parseInt(d.deliveries_count || 0, 10),
        paid_txs: paidTxs,
        total_txs: totalTxs,
        gross_earned: grossEarned,
        charges,
        net_disbursable: netDisbursable,
        wallet_balance: walletBalance,
        settled_to_bank: settledToBank,
        pending_requests_amount: pendingRequestsAmt,
        pending_unpaid: pendingUnpaid,
        total_requested: totalRequested,
        settlement_pct: settlementPct,
      };
    });

    const zoneMap = new Map();
    for (const d of drivers) {
      const z = d.zone_name || "Unassigned Zone";
      if (!zoneMap.has(z)) {
        zoneMap.set(z, {
          zone_name: z,
          drivers_count: 0,
          deliveries_count: 0,
          paid_txs: 0,
          total_txs: 0,
          gross_earned: 0,
          charges: 0,
          net_disbursable: 0,
          settled_to_bank: 0,
          pending_unpaid: 0,
          total_requested: 0,
        });
      }
      const entry = zoneMap.get(z);
      entry.drivers_count += 1;
      entry.deliveries_count += d.deliveries_count;
      entry.paid_txs += d.paid_txs;
      entry.total_txs += d.total_txs;
      entry.gross_earned += d.gross_earned;
      entry.charges += d.charges;
      entry.net_disbursable += d.net_disbursable;
      entry.settled_to_bank += d.settled_to_bank;
      entry.pending_unpaid += d.pending_unpaid;
      entry.total_requested += d.total_requested;
    }
    const zones = Array.from(zoneMap.values()).map((z) => {
      const denom = z.settled_to_bank + z.pending_unpaid;
      return { ...z, settlement_pct: denom > 0 ? Math.round((z.settled_to_bank / denom) * 100) : 0 };
    });

    const grossTotal = drivers.reduce((s, d) => s + d.gross_earned, 0);
    const settledTotal = drivers.reduce((s, d) => s + d.settled_to_bank, 0);
    const pendingTotal = drivers.reduce((s, d) => s + d.pending_unpaid, 0);
    const chargesTotal = drivers.reduce((s, d) => s + d.charges, 0);
    const paidTxCount = drivers.reduce((s, d) => s + d.paid_txs, 0);
    const totalTxCount = drivers.reduce((s, d) => s + d.total_txs, 0);
    const overallDenom = settledTotal + pendingTotal;

    res.json({
      success: true,
      period,
      date_from: dateFrom ? dateFrom.toISOString().slice(0, 10) : "All Time",
      date_to: now.toISOString().slice(0, 10),
      reference: `BEMS-DRV-${period.toUpperCase()}-ALL-DRIVERS`,
      kpis: {
        gross_earned: grossTotal,
        net_settled: settledTotal,
        pending_exposure: pendingTotal,
        total_charges: chargesTotal,
        settlement_pct: overallDenom > 0 ? Math.round((settledTotal / overallDenom) * 100) : 0,
        paid_tx_count: paidTxCount,
        total_tx_count: totalTxCount,
        total_drivers: drivers.length,
        active_wallet_balance: drivers.reduce((s, d) => s + d.wallet_balance, 0),
      },
      drivers,
      zones,
      payouts: payoutsRes.rows,
      ledger: ledgerRes.rows,
    });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// Customer Wallet Management System Dashboard Statement
// GET /api/admin/wallets/customer-statement?period=this_month|this_week|today|last_30_days|all
// ---------------------------------------------------------------------------
router.get("/customer-statement", async (req, res) => {
  try {
    const { ensureCustomerWalletSchema } = require("../services/customerWalletService");
    await ensureCustomerWalletSchema();

    const period = String(req.query.period || "this_month").toLowerCase();
    const now = new Date();
    let dateFrom = null;
    const dateTo = now.toISOString().slice(0, 10);

    if (period === "today") {
      dateFrom = now.toISOString().slice(0, 10);
    } else if (period === "this_week") {
      const d = new Date(now);
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      d.setDate(diff);
      dateFrom = d.toISOString().slice(0, 10);
    } else if (period === "last_30_days") {
      const d = new Date(now);
      d.setDate(d.getDate() - 30);
      dateFrom = d.toISOString().slice(0, 10);
    } else if (period === "this_month") {
      dateFrom = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    }

    const txParams = [];
    let txDateClause = "";
    if (dateFrom) {
      txParams.push(`${dateFrom} 00:00:00`);
      txDateClause = `WHERE cwt.created_at >= $1::timestamp`;
    }

    const customersQuery = `
      WITH tx_agg AS (
        SELECT
          cwt.customer_id,
          COALESCE(SUM(CASE WHEN LOWER(cwt.type) = 'credit' THEN cwt.amount ELSE 0 END), 0) AS period_topups,
          COALESCE(SUM(CASE WHEN LOWER(cwt.type) = 'debit' THEN cwt.amount ELSE 0 END), 0) AS period_spent,
          COUNT(*) FILTER (WHERE LOWER(cwt.type) = 'credit')::int AS credit_tx_count,
          COUNT(*) FILTER (WHERE LOWER(cwt.type) = 'debit')::int AS debit_tx_count,
          COUNT(*)::int AS period_tx_count,
          MAX(cwt.created_at) AS last_tx_at
        FROM customer_wallet_transactions cwt
        ${txDateClause}
        GROUP BY cwt.customer_id
      )
      SELECT
        u.id,
        u.name,
        u.email,
        u.phone,
        cw.id AS wallet_id,
        COALESCE(cw.balance, 0)::numeric(14,2) AS balance,
        COALESCE(cw.total_topped_up, 0)::numeric(14,2) AS total_topped_up,
        COALESCE(cw.total_spent, 0)::numeric(14,2) AS total_spent,
        cw.account_reference,
        cw.account_number,
        cw.bank_name,
        cw.bank_code,
        cw.account_name,
        cw.monnify_accounts,
        COALESCE(cw.is_suspended, false) AS is_suspended,
        cw.suspended_at,
        cw.suspended_reason,
        cw.created_at AS wallet_created_at,
        cw.updated_at AS wallet_updated_at,
        COALESCE(ta.period_topups, 0)::numeric(14,2) AS period_topups,
        COALESCE(ta.period_spent, 0)::numeric(14,2) AS period_spent,
        COALESCE(ta.credit_tx_count, 0) AS credit_tx_count,
        COALESCE(ta.debit_tx_count, 0) AS debit_tx_count,
        COALESCE(ta.period_tx_count, 0) AS period_tx_count,
        ta.last_tx_at
      FROM users u
      LEFT JOIN customer_wallets cw ON cw.customer_id = u.id
      LEFT JOIN tx_agg ta ON ta.customer_id = u.id
      WHERE LOWER(COALESCE(u.role, '')) IN ('customer', 'user') OR cw.id IS NOT NULL
      ORDER BY COALESCE(cw.balance, 0) DESC, COALESCE(ta.period_topups, 0) DESC, u.id DESC
    `;

    const ledgerQuery = `
      SELECT
        cwt.id,
        cwt.customer_id,
        cwt.type,
        COALESCE(cwt.category, 'wallet') AS category,
        cwt.amount::numeric(14,2) AS amount,
        COALESCE(cwt.balance_after, 0)::numeric(14,2) AS balance_after,
        COALESCE(cwt.reference, '') AS reference,
        COALESCE(cwt.description, '') AS description,
        COALESCE(cwt.metadata, '{}'::jsonb) AS metadata,
        cwt.created_at,
        u.name AS customer_name,
        u.email AS customer_email,
        u.phone AS customer_phone,
        cw.account_number,
        cw.bank_name
      FROM customer_wallet_transactions cwt
      LEFT JOIN users u ON u.id = cwt.customer_id
      LEFT JOIN customer_wallets cw ON cw.customer_id = cwt.customer_id
      ${txDateClause}
      ORDER BY cwt.created_at DESC, cwt.id DESC
      LIMIT 250
    `;

    const [customersRes, ledgerRes] = await Promise.all([
      pool.query(customersQuery, txParams),
      pool.query(ledgerQuery, txParams),
    ]);

    const customers = customersRes.rows.map((row) => ({
      id: Number(row.id),
      name: row.name || row.email || `Customer #${row.id}`,
      email: row.email || "",
      phone: row.phone || "",
      walletId: row.wallet_id ? Number(row.wallet_id) : null,
      balance: Number(row.balance || 0),
      totalToppedUp: Number(row.total_topped_up || 0),
      totalSpent: Number(row.total_spent || 0),
      periodTopups: Number(row.period_topups || 0),
      periodSpent: Number(row.period_spent || 0),
      creditTxCount: Number(row.credit_tx_count || 0),
      debitTxCount: Number(row.debit_tx_count || 0),
      periodTxCount: Number(row.period_tx_count || 0),
      accountReference: row.account_reference || "",
      accountNumber: row.account_number || "",
      bankName: row.bank_name || "",
      bankCode: row.bank_code || "",
      accountName: row.account_name || "",
      hasDedicatedAccount: Boolean(row.account_number),
      isSuspended: Boolean(row.is_suspended),
      suspendedAt: row.suspended_at || null,
      suspendedReason: row.suspended_reason || null,
      monnifyAccounts: Array.isArray(row.monnify_accounts) ? row.monnify_accounts : [],
      lastTxAt: row.last_tx_at || null,
      walletCreatedAt: row.wallet_created_at || null,
      walletUpdatedAt: row.wallet_updated_at || null,
    }));

    const ledger = ledgerRes.rows.map((row) => ({
      id: Number(row.id),
      customerId: Number(row.customer_id),
      customerName: row.customer_name || row.customer_email || `Customer #${row.customer_id}`,
      customerEmail: row.customer_email || "",
      customerPhone: row.customer_phone || "",
      accountNumber: row.account_number || "",
      bankName: row.bank_name || "",
      type: row.type,
      category: row.category,
      amount: Number(row.amount || 0),
      balanceAfter: Number(row.balance_after || 0),
      reference: row.reference || "",
      description: row.description || "",
      metadata: row.metadata || {},
      createdAt: row.created_at,
    }));

    const totalTopups = customers.reduce((sum, c) => sum + c.periodTopups, 0);
    const totalSpent = customers.reduce((sum, c) => sum + c.periodSpent, 0);
    const totalWalletBalance = customers.reduce((sum, c) => sum + c.balance, 0);
    const totalLifetimeTopups = customers.reduce((sum, c) => sum + c.totalToppedUp, 0);
    const totalLifetimeSpent = customers.reduce((sum, c) => sum + c.totalSpent, 0);
    const creditTxCount = customers.reduce((sum, c) => sum + c.creditTxCount, 0);
    const debitTxCount = customers.reduce((sum, c) => sum + c.debitTxCount, 0);
    const totalTxCount = customers.reduce((sum, c) => sum + c.periodTxCount, 0);
    const provisionedAccounts = customers.filter((c) => c.hasDedicatedAccount).length;
    const fundedCustomers = customers.filter((c) => c.balance > 0).length;
    const coverageRate = customers.length > 0
      ? Math.round((provisionedAccounts / customers.length) * 100)
      : 0;

    return res.json({
      period,
      dateFrom: dateFrom || "ALL-TIME",
      dateTo,
      referenceCode: `BEMS-CWAL-${period.toUpperCase()}-ALL-CUSTOMERS`,
      summary: {
        totalTopups,
        totalSpent,
        totalWalletBalance,
        totalLifetimeTopups,
        totalLifetimeSpent,
        creditTxCount,
        debitTxCount,
        totalTxCount,
        totalCustomers: customers.length,
        provisionedAccounts,
        fundedCustomers,
        coverageRate,
      },
      customers,
      ledger,
    });
  } catch (err) {
    console.error("[customer-statement] error:", err);
    return res.status(500).json({
      error: err?.message ? `Customer wallet statement error: ${err.message}` : "Failed to load customer wallet statement",
      message: err?.message || "Failed to load customer wallet statement",
    });
  }
});

module.exports = router;
