const { z } = require("zod");

// status matches stores_status_check (open | closed | inactive).
const STORE_STATUSES = ["open", "closed", "inactive"];

const createStore = z.object({
  name: z.string().trim().min(1, "Store name is required").max(255),
  code: z.string().trim().min(1, "Store code is required").max(50),
  address: z.string().trim().max(500).optional(),
  city: z.string().trim().max(100).optional(),
  state: z.string().trim().max(100).optional(),
  country: z.string().trim().max(100).default("Nigeria"),
  phone: z.string().trim().max(20).optional(),
  email: z.email().optional().or(z.literal("")),
  manager_id: z.coerce.number().int().optional(),
  opening_hours: z.string().trim().max(255).optional(),
  notes: z.string().trim().max(2000).optional(),
  status: z.enum(STORE_STATUSES, { error: `status must be one of: ${STORE_STATUSES.join(", ")}` }).default("open"),
});

const updateStore = z.object({
  name: z.string().trim().min(1).max(255).optional(),
  code: z.string().trim().min(1).max(50).optional(),
  address: z.string().trim().max(500).optional(),
  city: z.string().trim().max(100).optional(),
  state: z.string().trim().max(100).optional(),
  country: z.string().trim().max(100).optional(),
  phone: z.string().trim().max(20).optional(),
  email: z.email().optional().or(z.literal("")),
  manager_id: z.coerce.number().int().optional(),
  opening_hours: z.string().trim().max(255).optional(),
  notes: z.string().trim().max(2000).optional(),
  status: z.enum(STORE_STATUSES, { error: `status must be one of: ${STORE_STATUSES.join(", ")}` }).optional(),
});

const assignManager = z.object({
  manager_id: z.coerce.number().int({ error: "manager_id required" }),
});

module.exports = { createStore, updateStore, assignManager };