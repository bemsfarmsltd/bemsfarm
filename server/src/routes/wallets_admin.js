const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const pool = require("../db/pool");
const { protect, requireRole } = require("../middleware/authMiddleware");

// Staff authorization
router.use(protect);
router.use(requireRole("superadmin", "manager", "admin", "delivery_manager", "accountant"));

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
        dr.status AS driver_status,
        dr.commission_per_delivery,
        COALESCE(dr.total_earnings, 0) AS total_earnings,
        dr.wallet_account_number,
        COALESCE(dr.wallet_bank_name, 'Monnify / Wema Bank') AS wallet_bank_name,
        COALESCE(dr.wallet_account_name, CONCAT('BEMS - ', UPPER(dr.name))) AS wallet_account_name,
        COALESCE(dr.wallet_is_frozen, false) AS wallet_is_frozen,
        dr.wallet_frozen_reason,
        dr.bank_name,
        dr.account_number,
        dr.account_name,
        (SELECT COUNT(*) FROM deliveries WHERE driver_id = dr.id AND status = 'delivered') AS total_delivered,
        (SELECT COALESCE(SUM(amount), 0) FROM driver_payouts WHERE driver_id = dr.id AND status IN ('paid', 'approved')) AS total_paid,
        (SELECT COALESCE(SUM(amount), 0) FROM driver_payouts WHERE driver_id = dr.id AND status = 'pending') AS pending_payouts,
        (SELECT COUNT(*) FROM driver_payouts WHERE driver_id = dr.id AND status = 'pending') AS pending_payout_count
      FROM drivers dr
      ORDER BY dr.status ASC, dr.name ASC
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

    res.json({
      metrics: {
        total_fleet_liability: totalFleetLiability,
        total_gross_earned: totalGrossEarned,
        total_disbursed: totalDisbursed,
        total_pending_payouts: totalPendingPayouts,
        total_pending_count: totalPendingCount,
        total_virtual_accounts: totalVirtualAccounts,
        total_drivers: list.length,
      },
      drivers: list,
    });
  } catch (err) {
    console.error("GET /api/admin/wallets/summary error:", err.message);
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
    if (!["credit", "debit"].includes(type)) {
      return res.status(400).json({ message: "Type must be either 'credit' or 'debit'" });
    }
    if (!description?.trim()) {
      return res.status(400).json({ message: "A mandatory audit reason / description is required" });
    }

    await client.query("BEGIN");

    const driverRes = await client.query("SELECT * FROM drivers WHERE id = $1 FOR UPDATE", [id]);
    if (driverRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Driver not found" });
    }

    const driver = driverRes.rows[0];
    const currentEarned = parseFloat(driver.total_earnings) || 0;

    // Fetch existing payouts
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

    // Update driver total_earnings
    await client.query(
      "UPDATE drivers SET total_earnings = $1, updated_at = NOW() WHERE id = $2",
      [newEarned, id]
    );

    const adjRef = reference || `ADJ-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(2).toString("hex").toUpperCase()}`;

    // Record in driver_wallet_ledger
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
        category,
        numAmount,
        balanceBefore,
        balanceAfter,
        adjRef,
        description.trim(),
        req.user.id,
      ]
    );

    await client.query("COMMIT");

    res.status(201).json({
      message: `Driver wallet successfully ${type === "credit" ? "credited" : "debited"} with ₦${numAmount.toLocaleString()}`,
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

    const result = await pool.query(
      `
      UPDATE drivers
      SET 
        wallet_is_frozen = $1,
        wallet_frozen_reason = CASE WHEN $1 = true THEN COALESCE($2, 'Frozen by administration') ELSE NULL END,
        updated_at = NOW()
      WHERE id = $3
      RETURNING id, name, wallet_is_frozen, wallet_frozen_reason
      `,
      [!!is_frozen, reason || null, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Driver not found" });
    }

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
// Chronological statement of all credits, debits, delivery commissions & payouts
router.get("/drivers/:id/statement", async (req, res, next) => {
  try {
    const { id } = req.params;

    const driverRes = await pool.query(
      `
      SELECT 
        id, name, phone, email, vehicle_type, vehicle_plate,
        wallet_account_number, wallet_bank_name, wallet_account_name,
        total_earnings, bank_name, account_number, account_name,
        wallet_is_frozen, wallet_frozen_reason
      FROM drivers
      WHERE id = $1
      `,
      [id]
    );

    if (driverRes.rows.length === 0) {
      return res.status(404).json({ message: "Driver not found" });
    }

    const driver = driverRes.rows[0];

    // 1. Fetch manual ledger adjustments
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
        u.name AS performed_by_name
      FROM driver_wallet_ledger l
      LEFT JOIN users u ON l.performed_by = u.id
      WHERE l.driver_id = $1
      ORDER BY l.created_at DESC
      LIMIT 100
      `,
      [id]
    );

    // 2. Fetch completed delivery commissions
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
        'Delivery Commission Drop' AS description
      FROM driver_commissions c
      WHERE c.driver_id = $1
      ORDER BY c.created_at DESC
      LIMIT 100
      `,
      [id]
    );

    // 3. Fetch payouts / withdrawals
    const payoutsRes = await pool.query(
      `
      SELECT 
        p.id,
        p.requested_at AS date,
        'debit' AS type,
        'withdrawal' AS category,
        p.amount,
        p.payout_ref AS reference,
        CONCAT('Bank Withdrawal to ', COALESCE(p.bank_name, 'Bank'), ' (', p.account_number, ')') AS description,
        p.status,
        p.rejection_reason,
        p.notes,
        p.processed_at,
        u.name AS processed_by_name
      FROM driver_payouts p
      LEFT JOIN users u ON p.processed_by = u.id
      WHERE p.driver_id = $1
      ORDER BY p.requested_at DESC
      LIMIT 100
      `,
      [id]
    );

    // Merge and sort chronologically
    const allEvents = [
      ...ledgerRes.rows,
      ...commissionsRes.rows,
      ...payoutsRes.rows,
    ].sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json({
      driver,
      statement: allEvents,
    });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/admin/wallets/payouts/bulk-approve ───────────────────
// Batch approve & mark multiple payouts as paid simultaneously
router.post("/payouts/bulk-approve", requireRole("superadmin", "manager", "admin", "accountant"), async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { payout_ids = [], batch_reference, notes } = req.body;

    if (!Array.isArray(payout_ids) || payout_ids.length === 0) {
      return res.status(400).json({ message: "An array of payout_ids is required" });
    }

    await client.query("BEGIN");

    const batchRef = batch_reference || `BATCH-PAY-${Date.now().toString(36).toUpperCase()}`;

    const updateRes = await client.query(
      `
      UPDATE driver_payouts
      SET 
        status = 'paid',
        processed_at = NOW(),
        processed_by = $1,
        notes = CONCAT(COALESCE(notes, ''), ' | Batch: ', $2::text, CASE WHEN $3::text != '' THEN CONCAT(' - ', $3::text) ELSE '' END)
      WHERE id = ANY($4::int[]) AND status IN ('pending', 'approved')
      RETURNING *
      `,
      [req.user.id, batchRef, notes || "", payout_ids]
    );

    // Reconcile pending commissions for all affected drivers
    const affectedDriverIds = [...new Set(updateRes.rows.map((p) => p.driver_id))];
    if (affectedDriverIds.length > 0) {
      await client.query(
        `UPDATE driver_commissions SET status = 'paid', updated_at = NOW() WHERE driver_id = ANY($1::int[]) AND status = 'pending'`,
        [affectedDriverIds]
      );
    }

    await client.query("COMMIT");

    res.json({
      message: `Successfully approved & marked ${updateRes.rows.length} payout(s) as Paid!`,
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

module.exports = router;
