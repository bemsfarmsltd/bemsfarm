const { z } = require("zod");

// type matches coupons_type_check in the DB (percentage | fixed_amount) —
// the route's old manual check accepted "fixed", which the DB itself
// rejects with a raw constraint-violation error.
const createCoupon = z.object({
  code: z.string().trim().min(1, "Coupon code is required").max(50),
  description: z.string().trim().max(500).optional(),
  type: z.enum(["percentage", "fixed_amount"], {
    error: "type must be percentage or fixed_amount",
  }).default("percentage"),
  value: z.coerce.number({ error: "Discount value must be a number" }).positive("Discount value must be > 0"),
  min_order: z.coerce.number().min(0).default(0),
  max_discount: z.coerce.number().positive().optional(),
  usage_limit: z.coerce.number().int().positive().optional(),
  per_user_limit: z.coerce.number().int().positive().default(1),
  applicable_to: z.string().trim().max(50).default("all"),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  is_active: z.boolean().default(true),
}).refine(
  (data) => data.type !== "percentage" || data.value <= 100,
  { message: "Percentage cannot exceed 100", path: ["value"] },
);

const updateCoupon = z.object({
  description: z.string().trim().max(500).optional(),
  type: z.enum(["percentage", "fixed_amount"], {
    error: "type must be percentage or fixed_amount",
  }).optional(),
  value: z.coerce.number().positive().optional(),
  min_order: z.coerce.number().min(0).optional(),
  max_discount: z.coerce.number().positive().optional(),
  usage_limit: z.coerce.number().int().positive().optional(),
  per_user_limit: z.coerce.number().int().positive().optional(),
  applicable_to: z.string().trim().max(50).optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  is_active: z.boolean().optional(),
});

module.exports = { createCoupon, updateCoupon };