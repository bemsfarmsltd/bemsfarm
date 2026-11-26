// server/src/utils/driverWalletHistory.js
// Pure reconciliation, formatting, filtering, and pagination helpers for Driver Wallet History.
// Combines driver_wallet_ledger (per-delivery drops, bonuses, penalties, disbursed payouts, refunds),
// driver_payouts (pending/approved/paid/rejected/failed withdrawals), and legacy driver_commissions
// without double-counting or omitting any incoming/outgoing movement.

const CATEGORY_TITLES = {
  delivery_commission: "Delivery Drop Commission",
  delivery_drop: "Delivery Drop Commission",
  bonus: "Performance Bonus",
  fuel_allowance: "Fuel & Maintenance Stipend",
  tip_reimbursement: "Tip Reimbursement",
  manual_credit: "Wallet Credit Adjustment",
  adjustment: "Wallet Adjustment",
  penalty: "Shortage / Damage Penalty",
  cash_discrepancy: "Cash Collection Discrepancy",
  administrative_fee: "Administrative Fee",
  charge: "Wallet Charge",
  transfer_fee: "Transfer Fee",
  deduction: "Wallet Deduction",
  manual_debit: "Wallet Debit Deduction",
  withdrawal: "Bank Withdrawal",
  refund: "Payout Reversal / Refund",
  refund_payout: "Payout Reversal / Refund",
};

const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function parseDateBound(rawValue, isEnd = false) {
  if (rawValue === undefined || rawValue === null || String(rawValue).trim() === "") {
    return { valid: true, date: null };
  }
  const str = String(rawValue).trim();
  let parsed;
  if (DATE_ONLY_REGEX.test(str)) {
    parsed = new Date(`${str}T${isEnd ? "23:59:59.999" : "00:00:00.000"}Z`);
  } else {
    parsed = new Date(str);
  }
  if (Number.isNaN(parsed.getTime())) {
    return { valid: false, date: null };
  }
  return { valid: true, date: parsed };
}

function sanitizeDescription(rawDescription) {
  if (!rawDescription) return "";
  return String(rawDescription)
    .replace(/\s*\([^)]*Customer Fee[^)]*\)/gi, "")
    .trim();
}

function getCategoryTitle(category, isCredit) {
  const key = String(category || "").toLowerCase().trim();
  if (CATEGORY_TITLES[key]) return CATEGORY_TITLES[key];
  return isCredit ? "Wallet Credit" : "Wallet Debit";
}

function toIsoOrNull(val) {
  if (!val) return null;
  const d = val instanceof Date ? val : new Date(val);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function toWeekKey(val) {
  if (!val) return null;
  const d = val instanceof Date ? new Date(val.getTime()) : new Date(val);
  if (Number.isNaN(d.getTime())) return null;
  // ISO Monday-based week start (matches PostgreSQL date_trunc('week', ...))
  const utcDay = d.getUTCDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
  const diffToMonday = utcDay === 0 ? -6 : 1 - utcDay;
  d.setUTCDate(d.getUTCDate() + diffToMonday);
  return d.toISOString().slice(0, 10);
}

function normalizeTypeFilter(rawType) {
  const t = String(rawType || "all").toLowerCase().trim();
  if (!t || t === "all") return "all";
  if (["income", "incoming", "incomings", "credit", "credits", "in"].includes(t)) return "in";
  if (["payout", "payouts", "outgoing", "outgoings", "debit", "debits", "out"].includes(t)) return "out";
  if (["withdrawal", "withdrawals"].includes(t)) return "withdrawal";
  return "all";
}

function formatPayoutDescription(payout) {
  const bank = payout.bank_name || "Bank";
  const acc = payout.account_number ? ` (${payout.account_number})` : "";
  return `Bank Withdrawal to ${bank}${acc}`;
}

/**
 * Reconciles and formats all wallet movements for a driver.
 *
 * @param {object} params
 * @param {object} params.driver - Driver record from `drivers`
 * @param {object} params.payoutTotals - `{ total_paid, pending_payouts }` from all-time `driver_payouts`
 * @param {Array}  params.ledgerRows - Rows from `driver_wallet_ledger` (optionally joined with `deliveries`/`orders`)
 * @param {Array}  params.payoutRows - Rows from `driver_payouts`
 * @param {Array}  params.commissionRows - Optional legacy rows from `driver_commissions`
 * @param {Array<string>} params.coveredCommissionWeeks - Optional ISO week keys (`YYYY-MM-DD`) already present in `driver_wallet_ledger`
 * @param {object} params.query - `{ page, limit, type, category, startDate, endDate }`
 */
function buildDriverWalletHistory({
  driver = {},
  payoutTotals = {},
  ledgerRows = [],
  payoutRows = [],
  commissionRows = [],
  coveredCommissionWeeks = null,
  query = {},
}) {
  const totalEarned = parseFloat(driver.total_earnings) || 0;
  const totalPaid = parseFloat(payoutTotals.total_paid) || 0;
  const pendingPayouts = parseFloat(payoutTotals.pending_payouts) || 0;
  const availableBalance = Math.max(0, Math.round((totalEarned - totalPaid - pendingPayouts) * 100) / 100);

  // Index payouts by payout_ref and gateway_reference for clean deduplication & metadata enrichment
  const payoutByRef = new Map();
  const matchedPayoutIds = new Set();

  for (const p of payoutRows) {
    if (p.payout_ref) payoutByRef.set(String(p.payout_ref).trim(), p);
    if (p.gateway_reference) payoutByRef.set(String(p.gateway_reference).trim(), p);
  }

  // Track weeks that already have itemized delivery_commission rows in driver_wallet_ledger
  const ledgerDeliveryWeeks = new Set(Array.isArray(coveredCommissionWeeks) ? coveredCommissionWeeks : []);
  const transactions = [];

  // 1. Process driver_wallet_ledger (authoritative itemized entries)
  for (const row of ledgerRows) {
    const ledgerType = String(row.type || "credit").toLowerCase().trim() === "debit" ? "debit" : "credit";
    const isCredit = ledgerType === "credit";
    const category = String(row.category || (isCredit ? "manual_credit" : "manual_debit")).toLowerCase().trim();
    const amount = Math.abs(parseFloat(row.amount) || 0);
    const ref = row.reference ? String(row.reference).trim() : null;
    const dateIso = toIsoOrNull(row.created_at) || new Date().toISOString();

    if (isCredit && (category === "delivery_commission" || category === "delivery_drop")) {
      const wk = toWeekKey(row.created_at);
      if (wk) ledgerDeliveryWeeks.add(wk);
    }

    // Check if this withdrawal ledger row corresponds to a driver_payouts row
    let matchedPayout = null;
    if (!isCredit && category === "withdrawal" && ref && payoutByRef.has(ref)) {
      matchedPayout = payoutByRef.get(ref);
      matchedPayoutIds.add(matchedPayout.id);
    }

    // Check if this is a rejection refund ledger row (REJ-<payout_ref>)
    let refundLinkedPayout = null;
    if (isCredit && (category === "refund" || category === "refund_payout") && ref && ref.startsWith("REJ-")) {
      const origRef = ref.slice(4);
      if (payoutByRef.has(origRef)) {
        refundLinkedPayout = payoutByRef.get(origRef);
      }
    }

    const cleanDesc = sanitizeDescription(row.description);
    const title = getCategoryTitle(category, isCredit);
    const fallbackDesc = matchedPayout
      ? formatPayoutDescription(matchedPayout)
      : cleanDesc || title;

    const status = matchedPayout
      ? String(matchedPayout.status || "paid").toLowerCase()
      : category === "withdrawal"
        ? "paid"
        : "completed";

    const numericId = parseInt(row.id, 10) || 0;
    const balanceBefore =
      row.balance_before !== null && row.balance_before !== undefined
        ? parseFloat(row.balance_before)
        : null;
    const balanceAfter =
      row.balance_after !== null && row.balance_after !== undefined
        ? parseFloat(row.balance_after)
        : null;

    transactions.push({
      id: numericId,
      transaction_key: `ledger_${numericId}`,
      source: "ledger",
      direction: isCredit ? "in" : "out",
      type: isCredit ? "income" : "payout",
      ledger_type: ledgerType,
      category,
      title,
      description: cleanDesc || fallbackDesc,
      amount,
      signed_amount: isCredit ? amount : -amount,
      currency: "NGN",
      status,
      reference: ref || (matchedPayout?.payout_ref ?? null),
      date: dateIso,
      created_at: dateIso,
      balance_before: Number.isFinite(balanceBefore) ? balanceBefore : null,
      balance_after: Number.isFinite(balanceAfter) ? balanceAfter : null,
      order_id: row.order_id ? String(row.order_id) : null,
      order_ref: row.order_ref ? String(row.order_ref) : (row.order_id ? String(row.order_id) : null),
      delivery_id: row.delivery_id ? parseInt(row.delivery_id, 10) : null,
      delivery_address: row.delivery_address || null,
      payout_id: matchedPayout ? (parseInt(matchedPayout.id, 10) || null) : (refundLinkedPayout ? (parseInt(refundLinkedPayout.id, 10) || null) : null),
      payout_ref: matchedPayout?.payout_ref || refundLinkedPayout?.payout_ref || null,
      gateway_reference: matchedPayout?.gateway_reference || (category === "withdrawal" ? ref : null),
      bank_name: matchedPayout?.bank_name || refundLinkedPayout?.bank_name || null,
      account_number: matchedPayout?.account_number || refundLinkedPayout?.account_number || null,
      account_name: matchedPayout?.account_name || refundLinkedPayout?.account_name || null,
      disbursement_method: matchedPayout?.disbursement_method || null,
      requested_at: toIsoOrNull(matchedPayout?.requested_at),
      processed_at: toIsoOrNull(matchedPayout?.processed_at),
      rejection_reason: matchedPayout?.rejection_reason || refundLinkedPayout?.rejection_reason || null,
      is_reversal: isCredit && (category === "refund" || category === "refund_payout"),
    });
  }

  // 2. Process driver_payouts that are not yet represented in driver_wallet_ledger
  //    (e.g., pending requests, approved requests, legacy deliveries_admin paid rows, rejected/failed rows)
  for (const p of payoutRows) {
    if (matchedPayoutIds.has(p.id)) continue;

    const amount = Math.abs(parseFloat(p.amount) || 0);
    const payoutStatus = String(p.status || "pending").toLowerCase().trim();
    const dateIso = toIsoOrNull(p.requested_at || p.created_at) || new Date().toISOString();
    const numericId = parseInt(p.id, 10) || 0;

    transactions.push({
      id: numericId,
      transaction_key: `payout_${numericId}`,
      source: "payout",
      direction: "out",
      type: "payout",
      ledger_type: "debit",
      category: "withdrawal",
      title: CATEGORY_TITLES.withdrawal,
      description: formatPayoutDescription(p),
      amount,
      signed_amount: -amount,
      currency: "NGN",
      status: payoutStatus,
      reference: p.payout_ref || p.gateway_reference || `PAY-${numericId}`,
      date: dateIso,
      created_at: dateIso,
      balance_before: null,
      balance_after: null,
      order_id: null,
      order_ref: null,
      delivery_id: null,
      delivery_address: null,
      payout_id: numericId,
      payout_ref: p.payout_ref || null,
      gateway_reference: p.gateway_reference || null,
      bank_name: p.bank_name || null,
      account_number: p.account_number || null,
      account_name: p.account_name || null,
      disbursement_method: p.disbursement_method || null,
      requested_at: dateIso,
      processed_at: toIsoOrNull(p.processed_at),
      rejection_reason: p.rejection_reason || null,
      is_reversal: false,
    });
  }

  // 3. Legacy fallback: include driver_commissions rows ONLY for weeks that have no itemized
  //    delivery_commission rows in driver_wallet_ledger (prevents double-counting while preserving history)
  for (const c of commissionRows) {
    const wk = toWeekKey(c.week_start || c.created_at);
    if (wk && ledgerDeliveryWeeks.has(wk)) continue;

    const amount = Math.abs(parseFloat(c.total_earned) || 0);
    if (amount <= 0) continue;

    const deliveries = parseInt(c.deliveries, 10) || 0;
    const dateIso = toIsoOrNull(c.created_at || c.week_start) || new Date().toISOString();
    const numericId = parseInt(c.id, 10) || 0;

    transactions.push({
      id: numericId,
      transaction_key: `commission_${numericId}`,
      source: "commission_legacy",
      direction: "in",
      type: "income",
      ledger_type: "credit",
      category: "delivery_commission",
      title: CATEGORY_TITLES.delivery_commission,
      description: `Delivery Earning (${deliveries || 1} drop${(deliveries || 1) === 1 ? "" : "s"})`,
      amount,
      signed_amount: amount,
      currency: "NGN",
      status: String(c.status || "completed").toLowerCase(),
      reference: `COM-${numericId}`,
      date: dateIso,
      created_at: dateIso,
      balance_before: null,
      balance_after: null,
      order_id: null,
      order_ref: null,
      delivery_id: null,
      delivery_address: null,
      payout_id: null,
      payout_ref: null,
      gateway_reference: null,
      bank_name: null,
      account_number: null,
      account_name: null,
      disbursement_method: null,
      requested_at: null,
      processed_at: null,
      rejection_reason: null,
      deliveries,
      is_reversal: false,
    });
  }

  // Sort newest first (tie-break deterministically by transaction_key desc)
  transactions.sort((a, b) => {
    const diff = new Date(b.date).getTime() - new Date(a.date).getTime();
    if (diff !== 0) return diff;
    return b.transaction_key.localeCompare(a.transaction_key);
  });

  // Apply date-range filter uniformly after reconciliation
  const startDate = query.startDate || null;
  const endDate = query.endDate || null;
  const dateFiltered = transactions.filter((tx) => {
    const ts = new Date(tx.date).getTime();
    if (startDate && ts < startDate.getTime()) return false;
    if (endDate && ts > endDate.getTime()) return false;
    return true;
  });

  // Apply optional category filter
  const categoryFilter = query.category ? String(query.category).toLowerCase().trim() : null;
  const categoryFiltered = categoryFilter
    ? dateFiltered.filter((tx) => tx.category === categoryFilter)
    : dateFiltered;

  // Split into incoming & outgoing arrays
  const allIncomings = categoryFiltered.filter((tx) => tx.direction === "in");
  const allOutgoings = categoryFiltered.filter((tx) => tx.direction === "out");

  // Compute period totals (excluding rejected/failed payouts and payout-rejection unhold reversals
  // so real incoming/outgoing totals are never inflated)
  const validIncomings = allIncomings.filter((tx) => !tx.is_reversal);
  const validOutgoings = allOutgoings.filter((tx) => !["rejected", "failed"].includes(tx.status));

  const totalIncoming = Math.round(
    validIncomings.reduce((sum, tx) => sum + tx.amount, 0) * 100
  ) / 100;

  const totalOutgoing = Math.round(
    validOutgoings.reduce((sum, tx) => sum + tx.amount, 0) * 100
  ) / 100;

  // Breakdown of outgoings (Approved Withdrawals vs Pending Withdrawals vs Rejected Withdrawals vs Penalties/Deductions)
  const approvedWithdrawalTxs = allOutgoings.filter(
    (tx) => tx.category === "withdrawal" && ["paid", "approved", "completed"].includes(tx.status)
  );
  const pendingWithdrawalTxs = allOutgoings.filter(
    (tx) => tx.category === "withdrawal" && tx.status === "pending"
  );
  const rejectedWithdrawalTxs = allOutgoings.filter(
    (tx) => tx.category === "withdrawal" && ["rejected", "failed"].includes(tx.status)
  );
  const penaltyDeductionTxs = validOutgoings.filter((tx) => tx.category !== "withdrawal");

  const periodApprovedWithdrawals = Math.round(
    approvedWithdrawalTxs.reduce((sum, tx) => sum + tx.amount, 0) * 100
  ) / 100;
  const periodPendingWithdrawals = Math.round(
    pendingWithdrawalTxs.reduce((sum, tx) => sum + tx.amount, 0) * 100
  ) / 100;
  const periodRejectedWithdrawals = Math.round(
    rejectedWithdrawalTxs.reduce((sum, tx) => sum + tx.amount, 0) * 100
  ) / 100;
  const periodPenaltiesAndDeductions = Math.round(
    penaltyDeductionTxs.reduce((sum, tx) => sum + tx.amount, 0) * 100
  ) / 100;

  // All-time approved withdrawals from payoutTotals (fallback to periodApprovedWithdrawals if no date filter)
  const hasDateOrCatFilter = Boolean(startDate || endDate || categoryFilter);
  const totalApprovedWithdrawals =
    payoutTotals.total_paid !== undefined && payoutTotals.total_paid !== null
      ? totalPaid
      : periodApprovedWithdrawals;

  // Build Statistical Analysis breakdown for Expenses (Outgoings) and Income (Incomings)
  function buildCategoryBreakdown(txList, totalAmount) {
    const map = new Map();
    for (const tx of txList) {
      const cat = tx.category || "other";
      const existing = map.get(cat) || {
        category: cat,
        title: tx.title || getCategoryTitle(cat, tx.direction === "in"),
        amount: 0,
        count: 0,
      };
      existing.amount = Math.round((existing.amount + tx.amount) * 100) / 100;
      existing.count += 1;
      map.set(cat, existing);
    }
    return Array.from(map.values())
      .sort((a, b) => b.amount - a.amount)
      .map((item) => ({
        ...item,
        formatted_amount: `₦${item.amount.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        percentage: totalAmount > 0 ? Math.round((item.amount / totalAmount) * 10000) / 100 : 0,
      }));
  }

  function buildMonthlyBreakdown(inTxs, outTxs) {
    const monthMap = new Map();
    const ensureMonth = (isoDate) => {
      const key = String(isoDate || "").slice(0, 7); // YYYY-MM
      if (!key || key.length < 7) return null;
      if (!monthMap.has(key)) {
        monthMap.set(key, {
          month: key,
          income: 0,
          expenses: 0,
          approved_withdrawals: 0,
          penalties_and_deductions: 0,
          income_count: 0,
          expenses_count: 0,
        });
      }
      return monthMap.get(key);
    };

    for (const tx of inTxs) {
      const m = ensureMonth(tx.date);
      if (!m) continue;
      m.income = Math.round((m.income + tx.amount) * 100) / 100;
      m.income_count += 1;
    }

    for (const tx of outTxs) {
      const m = ensureMonth(tx.date);
      if (!m) continue;
      m.expenses = Math.round((m.expenses + tx.amount) * 100) / 100;
      m.expenses_count += 1;
      if (tx.category === "withdrawal" && ["paid", "approved", "completed"].includes(tx.status)) {
        m.approved_withdrawals = Math.round((m.approved_withdrawals + tx.amount) * 100) / 100;
      } else if (tx.category !== "withdrawal") {
        m.penalties_and_deductions = Math.round((m.penalties_and_deductions + tx.amount) * 100) / 100;
      }
    }

    return Array.from(monthMap.values()).sort((a, b) => b.month.localeCompare(a.month));
  }

  // Confirmed expenses = approved withdrawals + penalties/deductions (excludes pending requests)
  const confirmedExpenseTxs = [...approvedWithdrawalTxs, ...penaltyDeductionTxs].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  const totalConfirmedExpenses = Math.round((periodApprovedWithdrawals + periodPenaltiesAndDeductions) * 100) / 100;

  const incomeCategories = buildCategoryBreakdown(validIncomings, totalIncoming);
  const expenseCategories = buildCategoryBreakdown(confirmedExpenseTxs, totalConfirmedExpenses);
  const monthlyBreakdown = buildMonthlyBreakdown(validIncomings, confirmedExpenseTxs);

  const statisticalAnalysis = {
    currency: "NGN",
    period: {
      start_date: startDate ? startDate.toISOString() : null,
      end_date: endDate ? endDate.toISOString() : null,
      is_filtered: hasDateOrCatFilter,
    },
    totals: {
      total_income: totalIncoming,
      total_expenses: totalConfirmedExpenses,
      total_outgoing_including_pending: totalOutgoing,
      total_approved_withdrawals: hasDateOrCatFilter ? periodApprovedWithdrawals : totalApprovedWithdrawals,
      all_time_approved_withdrawals: totalApprovedWithdrawals,
      pending_withdrawals: hasDateOrCatFilter ? periodPendingWithdrawals : pendingPayouts,
      rejected_withdrawals: periodRejectedWithdrawals,
      total_penalties_and_deductions: periodPenaltiesAndDeductions,
      net_flow: Math.round((totalIncoming - totalConfirmedExpenses) * 100) / 100,
      available_balance: availableBalance,
      current_balance: availableBalance,
    },
    expenses: {
      total: totalConfirmedExpenses,
      formatted_total: `₦${totalConfirmedExpenses.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      total_including_pending: totalOutgoing,
      total_approved_withdrawals: hasDateOrCatFilter ? periodApprovedWithdrawals : totalApprovedWithdrawals,
      formatted_approved_withdrawals: `₦${(hasDateOrCatFilter ? periodApprovedWithdrawals : totalApprovedWithdrawals).toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      approved_withdrawals_count: approvedWithdrawalTxs.length,
      pending_withdrawals: hasDateOrCatFilter ? periodPendingWithdrawals : pendingPayouts,
      pending_withdrawals_count: pendingWithdrawalTxs.length,
      rejected_withdrawals: periodRejectedWithdrawals,
      rejected_withdrawals_count: rejectedWithdrawalTxs.length,
      total_penalties_and_deductions: periodPenaltiesAndDeductions,
      penalties_and_deductions_count: penaltyDeductionTxs.length,
      count: confirmedExpenseTxs.length,
      categories: expenseCategories,
      transactions: confirmedExpenseTxs,
      all_outgoing_transactions: allOutgoings,
    },
    income: {
      total: totalIncoming,
      formatted_total: `₦${totalIncoming.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      count: validIncomings.length,
      categories: incomeCategories,
      transactions: validIncomings,
    },
    monthly_breakdown: monthlyBreakdown,
  };

  // Apply type filter for the unified `transactions` feed
  const normalizedType = normalizeTypeFilter(query.type);
  let filteredTransactions = categoryFiltered;
  if (normalizedType === "in") {
    filteredTransactions = allIncomings;
  } else if (normalizedType === "out") {
    filteredTransactions = allOutgoings;
  } else if (normalizedType === "withdrawal") {
    filteredTransactions = allOutgoings.filter((tx) => tx.category === "withdrawal");
  }

  // Paginate cleanly
  const lim = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 50));
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const offset = (page - 1) * lim;
  const totalFiltered = filteredTransactions.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / lim));

  const pagedTransactions = filteredTransactions.slice(offset, offset + lim);
  const pagedIncome = allIncomings.slice(offset, offset + lim);
  const pagedPayouts = allOutgoings.slice(offset, offset + lim);

  const walletAccountNumber =
    driver.wallet_account_number || (driver.id ? `855${String(driver.id).padStart(7, "0")}` : null);

  return {
    success: true,
    summary: {
      available_balance: availableBalance,
      current_balance: availableBalance,
      total_earned: totalEarned,
      total_gross: totalEarned,
      total_paid: totalPaid,
      total_approved_withdrawals: totalApprovedWithdrawals,
      period_approved_withdrawals: periodApprovedWithdrawals,
      approved_withdrawals_count: approvedWithdrawalTxs.length,
      pending_payouts: pendingPayouts,
      pending_withdrawals: pendingPayouts,
      rejected_withdrawals: periodRejectedWithdrawals,
      total_penalties_and_deductions: periodPenaltiesAndDeductions,
      total_incoming: totalIncoming,
      total_income: totalIncoming,
      total_outgoing: totalOutgoing,
      total_expenses: totalConfirmedExpenses,
      currency: "NGN",
      wallet_is_frozen: Boolean(driver.wallet_is_frozen),
      wallet_frozen_reason: driver.wallet_frozen_reason || null,
      payout_locked: Boolean(driver.payout_locked),
      payout_locked_reason: driver.payout_locked_reason || null,
      wallet_account: {
        account_number: walletAccountNumber,
        bank_name: driver.wallet_bank_name || "Bems Farms Internal Wallet",
        account_name: driver.wallet_account_name || (driver.name ? `BEMS - ${String(driver.name).toUpperCase()}` : null),
      },
    },
    statistical_analysis: statisticalAnalysis,
    statistics: statisticalAnalysis,
    pagination: {
      page,
      limit: lim,
      total: totalFiltered,
      total_pages: totalPages,
      has_more: offset + pagedTransactions.length < totalFiltered,
    },
    filters: {
      type: normalizedType,
      category: categoryFilter,
      start_date: startDate ? startDate.toISOString() : null,
      end_date: endDate ? endDate.toISOString() : null,
    },
    // Backwards-compatible + clear aliases
    income: pagedIncome,
    payouts: pagedPayouts,
    incomings: pagedIncome,
    outgoings: pagedPayouts,
    transactions: pagedTransactions,
    total_count: totalFiltered,
    total_income_count: allIncomings.length,
    total_payouts_count: allOutgoings.length,
    total_incoming_count: allIncomings.length,
    total_outgoing_count: allOutgoings.length,
  };
}

module.exports = {
  CATEGORY_TITLES,
  parseDateBound,
  sanitizeDescription,
  normalizeTypeFilter,
  toWeekKey,
  buildDriverWalletHistory,
};
