#!/usr/bin/env node
// server/scripts/driver-wallet-history-test.js
// Pure unit tests for driver wallet transaction reconciliation, deduplication,
// balance computation, filtering, privacy sanitization, and pagination.
// Runs with zero DB or external dependencies.

const assert = require("assert");
const {
  parseDateBound,
  sanitizeDescription,
  normalizeTypeFilter,
  toWeekKey,
  buildDriverWalletHistory,
} = require("../src/utils/driverWalletHistory");

// 1. Date parsing checks
assert.strictEqual(parseDateBound(undefined, false).valid, true);
assert.strictEqual(parseDateBound("", true).date, null);
assert.strictEqual(parseDateBound("not-a-date", false).valid, false);
assert.strictEqual(
  parseDateBound("2026-11-24", false).date.toISOString(),
  "2026-11-24T00:00:00.000Z"
);
assert.strictEqual(
  parseDateBound("2026-11-24", true).date.toISOString(),
  "2026-11-24T23:59:59.999Z"
);

// 2. Description sanitization (must strip customer fee leakage)
assert.strictEqual(
  sanitizeDescription("Zone Delivery Drop: Umuahia Central (Customer Fee: ₦1,500)"),
  "Zone Delivery Drop: Umuahia Central"
);

// 3. Type filter normalization
assert.strictEqual(normalizeTypeFilter(undefined), "all");
assert.strictEqual(normalizeTypeFilter("credit"), "in");
assert.strictEqual(normalizeTypeFilter("incoming"), "in");
assert.strictEqual(normalizeTypeFilter("income"), "in");
assert.strictEqual(normalizeTypeFilter("debit"), "out");
assert.strictEqual(normalizeTypeFilter("outgoing"), "out");
assert.strictEqual(normalizeTypeFilter("payouts"), "out");
assert.strictEqual(normalizeTypeFilter("withdrawal"), "withdrawal");

// 4. Week key helper (Monday-based ISO week matching Postgres date_trunc('week', ...))
assert.strictEqual(toWeekKey("2026-11-20T12:00:00.000Z"), "2026-11-16"); // Fri -> Mon
assert.strictEqual(toWeekKey("2026-11-22T12:00:00.000Z"), "2026-11-16"); // Sun -> Mon

// 5. End-to-end reconciliation test:
//    - Per-delivery commission in driver_wallet_ledger (with customer fee text to sanitize)
//    - Bonus credit & penalty debit in driver_wallet_ledger
//    - Paid withdrawal appearing in BOTH driver_wallet_ledger (gateway_reference) AND driver_payouts -> MUST NOT duplicate
//    - Pending withdrawal in driver_payouts only -> MUST appear as outgoing pending
//    - Legacy paid withdrawal via deliveries_admin (only in driver_payouts, no ledger row) -> MUST appear as outgoing paid
//    - Rejected withdrawal in driver_payouts + matching REJ- refund in driver_wallet_ledger -> MUST NOT inflate total_incoming or total_outgoing
//    - driver_commissions row for SAME week as ledger delivery -> MUST be skipped (no double count!)
//    - driver_commissions row for OLDER week with no ledger delivery -> MUST be included as legacy fallback
const driver = {
  id: 12,
  name: "Ifeanyi Nwachukwu",
  total_earnings: 12400, // e.g., 2 drops (1400) + bonus (2000) - penalty (500) + legacy (9500)
  commission_per_delivery: 700,
  wallet_account_number: null, // should auto-fallback to 8550000012
  wallet_bank_name: "Bems Farms Internal Wallet",
  wallet_account_name: "BEMS - IFEANYI NWACHUKWU",
  wallet_is_frozen: false,
  wallet_frozen_reason: null,
  payout_locked: false,
  payout_locked_reason: null,
};

const payoutTotals = {
  total_paid: 6000, // 4000 via wallets_admin + 2000 legacy via deliveries_admin
  pending_payouts: 1500,
};

const ledgerRows = [
  {
    id: 101,
    type: "credit",
    category: "delivery_commission",
    amount: "700.00",
    balance_before: "0",
    balance_after: "0",
    reference: "DEL-101",
    description: "Zone Delivery Drop: Umuahia Central (Customer Fee: ₦1,000)",
    created_at: "2026-11-18T10:00:00.000Z",
    delivery_id: 41,
    order_id: "BF-101",
    order_ref: "ORD-101",
    delivery_address: "14 Bank Road, Umuahia",
  },
  {
    id: 102,
    type: "credit",
    category: "delivery_commission",
    amount: "700.00",
    balance_before: null,
    balance_after: null,
    reference: "DEL-102",
    description: "Zone Delivery Drop: World Bank Estate",
    created_at: "2026-11-18T14:00:00.000Z",
    delivery_id: 42,
    order_id: "BF-102",
    order_ref: "ORD-102",
    delivery_address: "World Bank Estate, Umuahia",
  },
  {
    id: 103,
    type: "credit",
    category: "bonus",
    amount: "2000.00",
    balance_before: "10900",
    balance_after: "12900",
    reference: "ADJ-BON1",
    description: "Top rider weekly incentive",
    created_at: "2026-11-19T09:00:00.000Z",
  },
  {
    id: 104,
    type: "debit",
    category: "penalty",
    amount: "500.00",
    balance_before: "12900",
    balance_after: "12400",
    reference: "ADJ-PEN1",
    description: "Damaged egg crate deduction",
    created_at: "2026-11-19T12:00:00.000Z",
  },
  {
    id: 105,
    type: "debit",
    category: "withdrawal",
    amount: "4000.00",
    balance_before: "12400",
    balance_after: "8400",
    reference: "MNFY-DISB-XYZ",
    description: "Bank Payout Disbursed to GTBank (0123456789)",
    created_at: "2026-11-19T16:00:00.000Z",
  },
  {
    id: 106,
    type: "credit",
    category: "refund",
    amount: "1000.00",
    balance_before: null,
    balance_after: null,
    reference: "REJ-PAY-REJ1",
    description: "Payout Rejected & Balance Unheld: Invalid bank details",
    created_at: "2026-11-20T09:00:00.000Z",
  },
];

const payoutRows = [
  // Matched to ledger #105 via gateway_reference -> must NOT duplicate
  {
    id: 1,
    payout_ref: "PAY-PAID1",
    gateway_reference: "MNFY-DISB-XYZ",
    amount: "4000.00",
    bank_name: "GTBank",
    account_number: "0123456789",
    account_name: "Ifeanyi Nwachukwu",
    status: "paid",
    disbursement_method: "monnify_transfer",
    requested_at: "2026-11-19T15:00:00.000Z",
    processed_at: "2026-11-19T16:00:00.000Z",
  },
  // Legacy paid via deliveries_admin (not in ledger) -> MUST appear
  {
    id: 2,
    payout_ref: "PAY-LEG1",
    gateway_reference: null,
    amount: "2000.00",
    bank_name: "Access Bank",
    account_number: "0011223344",
    account_name: "Ifeanyi Nwachukwu",
    status: "paid",
    requested_at: "2026-11-10T10:00:00.000Z",
    processed_at: "2026-11-10T12:00:00.000Z",
  },
  // Pending withdrawal -> MUST appear as outgoing pending
  {
    id: 3,
    payout_ref: "PAY-PEND1",
    gateway_reference: null,
    amount: "1500.00",
    bank_name: "GTBank",
    account_number: "0123456789",
    account_name: "Ifeanyi Nwachukwu",
    status: "pending",
    requested_at: "2026-11-20T11:00:00.000Z",
    processed_at: null,
  },
  // Rejected withdrawal -> appears with status 'rejected', excluded from total_outgoing
  {
    id: 4,
    payout_ref: "PAY-REJ1",
    gateway_reference: null,
    amount: "1000.00",
    bank_name: "UBA",
    account_number: "9988776655",
    account_name: "Ifeanyi Nwachukwu",
    status: "rejected",
    rejection_reason: "Invalid bank details",
    requested_at: "2026-11-20T08:00:00.000Z",
    processed_at: "2026-11-20T09:00:00.000Z",
  },
];

const commissionRows = [
  // Same week as DEL-101/DEL-102 (week starting 2026-11-16) -> MUST be skipped
  {
    id: 50,
    week_start: "2026-11-16",
    week_end: "2026-11-22",
    deliveries: 2,
    total_earned: "1400.00",
    status: "pending",
    created_at: "2026-11-18T10:00:00.000Z",
  },
  // Legacy week (2026-11-02) with no ledger entries -> MUST be included
  {
    id: 49,
    week_start: "2026-11-02",
    week_end: "2026-11-08",
    deliveries: 10,
    total_earned: "9500.00",
    status: "paid",
    created_at: "2026-11-08T18:00:00.000Z",
  },
];

const full = buildDriverWalletHistory({
  driver,
  payoutTotals,
  ledgerRows,
  payoutRows,
  commissionRows,
  query: { page: 1, limit: 50 },
});

// Verify authoritative balance: 12400 - 6000 - 1500 = 4900
assert.strictEqual(full.success, true);
assert.strictEqual(full.summary.available_balance, 4900);
assert.strictEqual(full.summary.current_balance, 4900);
assert.strictEqual(full.summary.total_earned, 12400);
assert.strictEqual(full.summary.total_paid, 6000);
assert.strictEqual(full.summary.pending_payouts, 1500);
assert.strictEqual(full.summary.wallet_account.account_number, "8550000012");

// Expected merged count:
// Ledger (6) + unmatched payouts (3: #2 legacy paid, #3 pending, #4 rejected) + unmatched legacy commission (1: #49) = 10
assert.strictEqual(full.transactions.length, 10);
assert.strictEqual(full.total_count, 10);

// Verify paid withdrawal #1 was deduplicated & enriched with bank metadata
const paidWithdrawals = full.transactions.filter((t) => t.payout_ref === "PAY-PAID1");
assert.strictEqual(paidWithdrawals.length, 1);
assert.strictEqual(paidWithdrawals[0].source, "ledger");
assert.strictEqual(paidWithdrawals[0].bank_name, "GTBank");
assert.strictEqual(paidWithdrawals[0].disbursement_method, "monnify_transfer");
assert.strictEqual(paidWithdrawals[0].status, "paid");
assert.strictEqual(paidWithdrawals[0].direction, "out");
assert.strictEqual(paidWithdrawals[0].signed_amount, -4000);

// Verify commission #50 was NOT double-counted, while legacy #49 WAS included
assert.strictEqual(full.transactions.some((t) => t.reference === "COM-50"), false);
assert.strictEqual(full.transactions.some((t) => t.reference === "COM-49"), true);

// Verify Customer Fee was stripped from DEL-101 description
const del101 = full.transactions.find((t) => t.reference === "DEL-101");
assert.strictEqual(del101.description, "Zone Delivery Drop: Umuahia Central");
assert.strictEqual(del101.order_ref, "ORD-101");
assert.strictEqual(del101.delivery_id, 41);

// Verify period totals exclude rejected payout & its unhold refund
// Real incoming: 700 + 700 + 2000 + 9500 = 12900
// Real outgoing: 500 (penalty) + 4000 (paid) + 2000 (legacy paid) + 1500 (pending) = 8000
assert.strictEqual(full.summary.total_incoming, 12900);
assert.strictEqual(full.summary.total_outgoing, 8000);

// Verify descending chronological sort
for (let i = 1; i < full.transactions.length; i++) {
  assert(
    new Date(full.transactions[i - 1].date).getTime() >=
      new Date(full.transactions[i].date).getTime(),
    "transactions must be sorted newest-first"
  );
}

// Verify integer `id` preserved for Dart/Flutter compatibility
for (const tx of full.transactions) {
  assert.strictEqual(typeof tx.id, "number");
  assert.strictEqual(typeof tx.transaction_key, "string");
}

// 6. Test type filter + pagination
const onlyIn = buildDriverWalletHistory({
  driver,
  payoutTotals,
  ledgerRows,
  payoutRows,
  commissionRows,
  query: { type: "credit", page: 1, limit: 2 },
});
assert.strictEqual(onlyIn.transactions.length, 2);
assert(onlyIn.transactions.every((t) => t.direction === "in"));
assert.strictEqual(onlyIn.pagination.total, 5); // 2 drops + bonus + refund + legacy comm
assert.strictEqual(onlyIn.pagination.total_pages, 3);
assert.strictEqual(onlyIn.pagination.has_more, true);

const onlyOut = buildDriverWalletHistory({
  driver,
  payoutTotals,
  ledgerRows,
  payoutRows,
  commissionRows,
  query: { type: "out", page: 1, limit: 10 },
});
assert.strictEqual(onlyOut.transactions.length, 5); // penalty + paid + legacy paid + pending + rejected
assert(onlyOut.transactions.every((t) => t.direction === "out"));

const onlyWithdrawals = buildDriverWalletHistory({
  driver,
  payoutTotals,
  ledgerRows,
  payoutRows,
  commissionRows,
  query: { type: "withdrawal", page: 1, limit: 10 },
});
assert.strictEqual(onlyWithdrawals.transactions.length, 4);
assert(onlyWithdrawals.transactions.every((t) => t.category === "withdrawal"));

// 7. Test date-range filtering
const nov19Only = buildDriverWalletHistory({
  driver,
  payoutTotals,
  ledgerRows,
  payoutRows,
  commissionRows,
  query: {
    startDate: parseDateBound("2026-11-19", false).date,
    endDate: parseDateBound("2026-11-19", true).date,
  },
});
assert.strictEqual(nov19Only.transactions.length, 3); // bonus, penalty, paid withdrawal #105
assert.strictEqual(nov19Only.summary.total_incoming, 2000);
assert.strictEqual(nov19Only.summary.total_outgoing, 4500);
// Authoritative balance stays all-time live balance regardless of date range
assert.strictEqual(nov19Only.summary.available_balance, 4900);

// 8. Test empty wallet (brand new driver)
const empty = buildDriverWalletHistory({
  driver: { id: 99, name: "New Driver", total_earnings: 0 },
  payoutTotals: { total_paid: 0, pending_payouts: 0 },
  ledgerRows: [],
  payoutRows: [],
  commissionRows: [],
  query: {},
});
assert.strictEqual(empty.summary.available_balance, 0);
assert.strictEqual(empty.transactions.length, 0);
assert.strictEqual(empty.pagination.total, 0);
assert.strictEqual(empty.pagination.total_pages, 1);
assert.strictEqual(empty.pagination.has_more, false);

console.log("✅ Driver wallet history unit tests passed (all reconciliation, dedup, filter & pagination cases)");
