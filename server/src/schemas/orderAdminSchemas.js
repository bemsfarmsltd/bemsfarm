const { z } = require("zod");

// Matches invoices_status_check in the DB.
const invoiceStatus = z.object({
  status: z.enum(["draft", "sent", "paid", "overdue", "cancelled"], {
    error: "status must be one of: draft, sent, paid, overdue, cancelled",
  }),
  notes: z.string().optional(),
});

// No DB constraint on returns.status, but this is the fixed set the admin
// UI (Refunds.jsx) actually understands.
const returnStatus = z.object({
  status: z.enum(["pending", "inspecting", "approved", "rejected", "refunded"], {
    error: "status must be one of: pending, inspecting, approved, rejected, refunded",
  }),
  description: z.string().optional(),
});

const resolveDispute = z.object({
  decision: z.enum(["full_refund", "partial_refund", "replacement", "reject"], {
    error: "decision must be one of: full_refund, partial_refund, replacement, reject",
  }),
  notes: z.string().optional(),
  refund_amount: z.coerce.number().optional(),
});

const assignDriver = z.object({
  driver_id: z.coerce.number({ error: "driver_id required" }),
  reassign: z.boolean().optional(),
});

module.exports = { invoiceStatus, returnStatus, resolveDispute, assignDriver };