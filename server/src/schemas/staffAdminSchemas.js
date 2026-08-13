const { z } = require("zod");

// shift/system_role/status enums mirror the real CHECK constraints on the
// staff table (staff_shift_check, staff_system_role_check, staff_status_check)
// — the route's old manual checks didn't match these exactly (e.g. allowed
// a "suspended" status the DB itself rejects).
const SHIFTS = ["morning", "afternoon", "evening"];
const SYSTEM_ROLES = ["superadmin", "manager", "accountant", "delivery_manager", "cashier", "kitchen_staff"];
const STAFF_STATUSES = ["active", "inactive", "on_leave"];

const createStaff = z.object({
  name: z.string().trim().min(1, "Name is required").max(255),
  email: z.email({ error: "Valid email required" }),
  phone: z.string().trim().max(20).optional(),
  password: z.string().min(6).optional(),
  department: z.string().trim().min(1, "Department is required").max(100),
  role: z.string().trim().min(1, "Role/position is required").max(100),
  shift: z.enum(SHIFTS, { error: `shift must be one of: ${SHIFTS.join(", ")}` }).default("morning"),
  basic_salary: z.coerce.number().min(0).optional(),
  hire_date: z.string().optional(),
  bank_name: z.string().trim().max(100).optional(),
  account_number: z.string().trim().max(30).optional(),
  account_name: z.string().trim().max(255).optional(),
  emergency_contact: z.string().trim().max(255).optional(),
  emergency_phone: z.string().trim().max(20).optional(),
  address: z.string().trim().max(1000).optional(),
  notes: z.string().trim().max(2000).optional(),
  system_role: z.enum(SYSTEM_ROLES, { error: `system_role must be one of: ${SYSTEM_ROLES.join(", ")}` }).default("cashier"),
});

const updateStaff = z.object({
  name: z.string().trim().min(1).max(255).optional(),
  phone: z.string().trim().max(20).optional(),
  department: z.string().trim().max(100).optional(),
  role: z.string().trim().max(100).optional(),
  shift: z.enum(SHIFTS, { error: `shift must be one of: ${SHIFTS.join(", ")}` }).optional(),
  basic_salary: z.coerce.number().min(0).optional(),
  hire_date: z.string().optional(),
  bank_name: z.string().trim().max(100).optional(),
  account_number: z.string().trim().max(30).optional(),
  account_name: z.string().trim().max(255).optional(),
  emergency_contact: z.string().trim().max(255).optional(),
  emergency_phone: z.string().trim().max(20).optional(),
  address: z.string().trim().max(1000).optional(),
  notes: z.string().trim().max(2000).optional(),
});

const staffStatus = z.object({
  status: z.enum(STAFF_STATUSES, {
    error: `status must be one of: ${STAFF_STATUSES.join(", ")}`,
  }),
});

module.exports = { createStaff, updateStaff, staffStatus };