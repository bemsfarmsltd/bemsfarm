const { z } = require("zod");

const reconcileManual = z.object({
  payment_ref: z.string({ error: "payment_ref and order_id are required" }).min(1, "payment_ref and order_id are required"),
  order_id: z.union([z.number(), z.string()], { error: "payment_ref and order_id are required" }),
});

module.exports = { reconcileManual };