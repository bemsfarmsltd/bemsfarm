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

const invoiceItem = z.object({
  name: z.string().trim().min(1, "Item name is required"),
  qty: z.coerce.number().optional(),
  quantity: z.coerce.number().optional(),
  unit: z.string().trim().optional(),
  price: z.coerce.number().optional(),
  unit_price: z.coerce.number().optional(),
}).refine((item) => {
  const qty = item.qty ?? item.quantity;
  return typeof qty === "number" && !Number.isNaN(qty) && qty > 0;
}, { message: "Item quantity must be a number greater than 0" }).refine((item) => {
  const price = item.price ?? item.unit_price;
  return price === undefined || (typeof price === "number" && !Number.isNaN(price) && price >= 0);
}, { message: "Item price must be a number >= 0" });

const createInvoice = z.object({
  customer_id: z.union([z.string(), z.number()]).optional(),
  customer_name: z.string().trim().min(1, "Customer name is required").max(200),
  customer_phone: z.string().trim().max(30).optional(),
  customer_email: z.string().trim().email("Invalid email").optional().or(z.literal("")),
  customer_address: z.string().trim().max(500).optional(),
  due_date: z.string().optional(),
  payment_method: z.string().trim().max(60).optional(),
  notes: z.string().trim().max(2000).optional(),
  items: z.array(invoiceItem).min(1, "At least one item is required"),
  delivery_fee: z.coerce.number().min(0).default(0),
  discount_amount: z.coerce.number().min(0).default(0),
  status: z.enum(["draft", "sent", "paid", "overdue", "cancelled"]).default("draft"),
});

const createReturn = z.object({
  ordRef: z.string().trim().optional(),
  customer: z.string().trim().optional(),
  customer_id: z.union([z.string(), z.number()]).optional(),
  product: z.string().trim().optional(),
  product_id: z.union([z.string(), z.number()]).optional(),
  qty: z.coerce.number({ error: "Quantity is required" }).positive("Quantity must be greater than 0"),
  unitPrice: z.coerce.number().min(0).optional(),
  reason: z.string().trim().max(500).optional(),
  notes: z.string().trim().max(2000).optional(),
  refundMethod: z.string().trim().max(60).default("Bank Transfer"),
}).refine((data) => data.customer_id || data.customer, { message: "Customer is required", path: ["customer"] })
  .refine((data) => data.product_id || data.product, { message: "Product is required", path: ["product"] });

module.exports = { invoiceStatus, returnStatus, resolveDispute, assignDriver, createInvoice, createReturn };