const { z } = require("zod");

const numLike = z.coerce.number();

const sessionOpen = z.object({
  opening_cash: numLike.optional(),
  store_id: numLike.optional(),
  terminal_id: z.string().optional(),
});

const sessionClose = z.object({
  closing_cash: numLike.optional(),
  notes: z.string().optional(),
});

// Light structural gate only — the route's own item/stock/discount/split-
// payment logic (DB-backed, role-aware) stays exactly as written below.
const sale = z.object({
  items: z.array(z.record(z.string(), z.any())).min(1, "Items required"),
  customer_id: numLike.optional(),
  customer_name: z.string().optional(),
  payment_method: z.string().optional(),
  amount_tendered: numLike.optional(),
  discount_amount: numLike.optional(),
  coupon_code: z.string().optional(),
  notes: z.string().optional(),
  session_id: numLike.optional(),
  split_payments: z.array(z.record(z.string(), z.any())).optional(),
});

const heldOrder = z.object({
  label: z.string().optional(),
  items: z.array(z.record(z.string(), z.any())).min(1, "Items required"),
  session_id: numLike.optional(),
});

const verifyPayment = z.object({
  last_four: z.coerce.string({ error: "Please provide exactly 4 digits" }).length(4, "Please provide exactly 4 digits"),
  amount: numLike.optional(),
});

const markTransactionUsed = z.object({
  order_id: numLike.optional(),
});

const recordTransaction = z.object({
  transaction_id: z.string({ error: "transaction_id and amount are required" }).min(1, "transaction_id and amount are required"),
  amount: numLike,
  payment_method: z.string().optional(),
  payment_time: z.string().optional(),
  customer_name: z.string().optional(),
  terminal_id: z.string().optional(),
  session_id: numLike.optional(),
});

module.exports = {
  sessionOpen,
  sessionClose,
  sale,
  heldOrder,
  verifyPayment,
  markTransactionUsed,
  recordTransaction,
};