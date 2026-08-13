const { z } = require("zod");

const createSupplier = z.object({
  name: z.string().trim().min(1, "Supplier name required").max(255),
  contact_person: z.string().trim().max(255).optional(),
  phone: z.string().trim().max(20).optional(),
  email: z.email().optional().or(z.literal("")),
  address: z.string().trim().max(500).optional(),
  category: z.string().trim().max(100).default("produce"),
  payment_terms: z.coerce.number().int().min(0).default(30),
  bank_name: z.string().trim().max(100).optional(),
  account_number: z.string().trim().max(30).optional(),
  account_name: z.string().trim().max(255).optional(),
  tax_id: z.string().trim().max(100).optional(),
  notes: z.string().trim().max(2000).optional(),
});

const updateSupplier = z.object({
  name: z.string().trim().min(1).max(255).optional(),
  contact_person: z.string().trim().max(255).optional(),
  phone: z.string().trim().max(20).optional(),
  email: z.email().optional().or(z.literal("")),
  address: z.string().trim().max(500).optional(),
  category: z.string().trim().max(100).optional(),
  payment_terms: z.coerce.number().int().min(0).optional(),
  bank_name: z.string().trim().max(100).optional(),
  account_number: z.string().trim().max(30).optional(),
  account_name: z.string().trim().max(255).optional(),
  tax_id: z.string().trim().max(100).optional(),
  notes: z.string().trim().max(2000).optional(),
  status: z.enum(["active", "inactive"]).optional(),
});

const recordPayment = z.object({
  amount: z.coerce.number({ error: "amount must be > 0" }).positive("amount must be > 0"),
  payment_method: z.string().trim().max(50).optional(),
  bank_account_id: z.coerce.number().int().optional(),
  purchase_order_id: z.coerce.number().int().optional(),
  payment_date: z.string().optional(),
  notes: z.string().trim().max(2000).optional(),
});

module.exports = { createSupplier, updateSupplier, recordPayment };