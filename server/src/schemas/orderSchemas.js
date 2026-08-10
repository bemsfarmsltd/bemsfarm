const { z } = require("zod");

// Light structural gate only — per-item integer/stock/availability checks
// stay in the route itself, since those need DB lookups Zod can't do.
const createOrder = z.object({
  items: z
    .array(
      z.object({
        product_id: z.union([z.number(), z.string()]),
        quantity: z.union([z.number(), z.string()]),
      }),
    )
    .min(1, "No items in order"),
  payment_method: z.enum(["monnify", "cod"]).optional(),
  payment_ref: z.string().optional(),
  address: z.string().optional(),
  source: z.string().optional(),
  coupon_code: z.string().optional(),
});

const updateStatus = (validStatuses) =>
  z.object({
    status: z.enum(validStatuses, {
      error: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
    }),
  });

const cancelOrder = z.object({
  reason: z.string({ error: "Cancellation reason is required" }).trim().min(3, "Cancellation reason is required"),
});

module.exports = { createOrder, updateStatus, cancelOrder };