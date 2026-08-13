const { z } = require("zod");

// Matches income_source_type_check / income_status_check / expenses_category_check / expenses_status_check.
const INCOME_SOURCE_TYPES = ["online_order", "pos_sale", "corporate_supply", "wallet_topup", "delivery_fee", "other"];
const INCOME_STATUSES = ["pending", "completed", "failed"];
const EXPENSE_CATEGORIES = ["produce_purchase", "staff_salary", "fuel_transport", "packaging", "utilities_rent", "maintenance", "marketing", "other"];
const EXPENSE_STATUSES = ["pending", "approved", "rejected", "paid"];

const createIncome = z.object({
  source: z.string().trim().min(1, "source required").max(255),
  // NOT NULL on the DB with no default — this manual-entry route has no
  // natural online_order/pos_sale/etc. to tie it to, so it defaults to the
  // enum's own catch-all rather than leaving the column unset.
  source_type: z.enum(INCOME_SOURCE_TYPES, { error: `source_type must be one of: ${INCOME_SOURCE_TYPES.join(", ")}` }).default("other"),
  category: z.string().trim().max(100).optional(),
  description: z.string().trim().max(1000).optional(),
  amount: z.coerce.number({ error: "amount must be > 0" }).positive("amount must be > 0"),
  date: z.string().optional(),
  payment_method: z.string().trim().max(50).optional(),
  bank_account_id: z.coerce.number().int().optional(),
  order_id: z.string().trim().max(100).optional(),
  notes: z.string().trim().max(2000).optional(),
  status: z.enum(INCOME_STATUSES, { error: `status must be one of: ${INCOME_STATUSES.join(", ")}` }).default("completed"),
});

const updateIncome = z.object({
  description: z.string().trim().max(1000).optional(),
  amount: z.coerce.number().positive().optional(),
  status: z.enum(INCOME_STATUSES, { error: `status must be one of: ${INCOME_STATUSES.join(", ")}` }).optional(),
  notes: z.string().trim().max(2000).optional(),
});

const createExpense = z.object({
  category: z.enum(EXPENSE_CATEGORIES, { error: `category must be one of: ${EXPENSE_CATEGORIES.join(", ")}` }),
  description: z.string().trim().min(1, "description required").max(1000),
  supplier_name: z.string().trim().max(255).optional(),
  amount: z.coerce.number({ error: "amount must be > 0" }).positive("amount must be > 0"),
  date: z.string().optional(),
  due_date: z.string().optional(),
  payment_method: z.string().trim().max(50).optional(),
  bank_account_id: z.coerce.number().int().optional(),
  receipt_url: z.string().trim().max(2000).optional(),
  notes: z.string().trim().max(2000).optional(),
});

const updateExpense = z.object({
  description: z.string().trim().max(1000).optional(),
  amount: z.coerce.number().positive().optional(),
  category: z.enum(EXPENSE_CATEGORIES, { error: `category must be one of: ${EXPENSE_CATEGORIES.join(", ")}` }).optional(),
  supplier_name: z.string().trim().max(255).optional(),
  due_date: z.string().optional(),
  notes: z.string().trim().max(2000).optional(),
  status: z.enum(EXPENSE_STATUSES, { error: `status must be one of: ${EXPENSE_STATUSES.join(", ")}` }).optional(),
  bank_account_id: z.coerce.number().int().optional(),
});

module.exports = { createIncome, updateIncome, createExpense, updateExpense };