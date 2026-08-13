const { z } = require("zod");

// Matches deliveries_status_check on the DB — note the real "en route" value
// is en_route, not out_for_delivery (the frontend's status vocabulary
// doesn't fully match the DB yet; validating against DB truth here is
// strictly safer than the unvalidated status that existed before).
const DELIVERY_STATUSES = ["assigned", "awaiting_pickup", "en_route", "delivery_attempted", "delivered", "cancelled"];

const updateStatus = z.object({
  status: z.enum(DELIVERY_STATUSES, { error: `status must be one of: ${DELIVERY_STATUSES.join(", ")}` }),
  notes: z.string().trim().max(2000).optional(),
});

const reassign = z.object({
  driver_id: z.coerce.number({ error: "driver_id required" }).int(),
  note: z.string().trim().max(2000).optional(),
});

const attempt = z.object({
  notes: z.string().trim().max(2000).optional(),
});

module.exports = { updateStatus, reassign, attempt };