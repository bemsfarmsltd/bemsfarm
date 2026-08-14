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

// Matches drivers_status_check / drivers_vehicle_type_check on the DB.
const DRIVER_STATUSES = ["on_delivery", "active", "off_duty", "suspended"];
const VEHICLE_TYPES = ["motorcycle", "bicycle", "car", "van"];

// delivery_zones.zone_id is a generated text code ("ZONE001"), not a number.
const createDriver = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  phone: z.string().trim().min(1, "Phone is required").max(30),
  email: z.string().trim().email("Invalid email").optional().or(z.literal("")),
  vehicle_type: z.enum(VEHICLE_TYPES, { error: `vehicle_type must be one of: ${VEHICLE_TYPES.join(", ")}` }).optional(),
  vehicle_plate: z.string().trim().max(30).optional(),
  zone_id: z.string().trim().min(1).optional().or(z.literal("")),
  notes: z.string().trim().max(2000).optional(),
  status: z.enum(DRIVER_STATUSES, { error: `status must be one of: ${DRIVER_STATUSES.join(", ")}` }).default("active"),
});

const updateDriver = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  phone: z.string().trim().min(1).max(30).optional(),
  email: z.string().trim().email("Invalid email").optional().or(z.literal("")),
  vehicle_type: z.enum(VEHICLE_TYPES, { error: `vehicle_type must be one of: ${VEHICLE_TYPES.join(", ")}` }).optional(),
  vehicle_plate: z.string().trim().max(30).optional(),
  zone_id: z.string().trim().min(1).optional().or(z.literal("")),
  notes: z.string().trim().max(2000).optional(),
});

const createZone = z.object({
  zone_name: z.string().trim().min(1, "Zone name is required").max(120),
  delivery_fee: z.coerce.number({ error: "Delivery fee must be a number" }).min(0, "Delivery fee must be >= 0"),
  min_order_amount: z.coerce.number().min(0).default(0),
  estimated_eta: z.string().trim().max(60).optional(),
  coverage_areas: z.array(z.string()).optional(),
  driver_ids: z.array(z.coerce.number().int().positive()).default([]),
  notes: z.string().trim().max(2000).optional(),
  is_active: z.boolean().default(true),
});

const updateZone = z.object({
  zone_name: z.string().trim().min(1).max(120).optional(),
  delivery_fee: z.coerce.number().min(0).optional(),
  min_order_amount: z.coerce.number().min(0).optional(),
  estimated_eta: z.string().trim().max(60).optional(),
  coverage_areas: z.array(z.string()).optional(),
  driver_ids: z.array(z.coerce.number().int().positive()).optional(),
  notes: z.string().trim().max(2000).optional(),
  is_active: z.boolean().optional(),
});

module.exports = { updateStatus, reassign, attempt, createDriver, updateDriver, createZone, updateZone };