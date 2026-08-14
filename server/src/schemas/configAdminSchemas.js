const { z } = require("zod");

const statusEnum = z.enum(["active", "inactive"], {
  error: "status must be active or inactive",
});

const createCategory = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  code: z.string().trim().min(1, "Code is required").max(30),
  description: z.string().trim().max(500).optional(),
  status: statusEnum.default("active"),
});

const updateCategory = z.object({
  name: z.string().trim().min(1, "Name is required").max(120).optional(),
  code: z.string().trim().min(1, "Code is required").max(30).optional(),
  description: z.string().trim().max(500).optional(),
  status: statusEnum.optional(),
});

const createSubcategory = z.object({
  category_id: z.coerce.number().int().positive("category_id is required"),
  name: z.string().trim().min(1, "Name is required").max(120),
  code: z.string().trim().min(1, "Code is required").max(30),
  description: z.string().trim().max(500).optional(),
  status: statusEnum.default("active"),
});

const updateSubcategory = z.object({
  category_id: z.coerce.number().int().positive().optional(),
  name: z.string().trim().min(1, "Name is required").max(120).optional(),
  code: z.string().trim().min(1, "Code is required").max(30).optional(),
  description: z.string().trim().max(500).optional(),
  status: statusEnum.optional(),
});

const createUnit = z.object({
  name: z.string().trim().min(1, "Name is required").max(60),
  short: z.string().trim().min(1, "Short label is required").max(10),
  type: z.string().trim().min(1, "Type is required").max(30),
  step: z.coerce.number().positive("step must be > 0").default(1.0),
  status: statusEnum.default("active"),
});

const updateUnit = z.object({
  name: z.string().trim().min(1, "Name is required").max(60).optional(),
  short: z.string().trim().min(1, "Short label is required").max(10).optional(),
  type: z.string().trim().min(1, "Type is required").max(30).optional(),
  step: z.coerce.number().positive("step must be > 0").optional(),
  status: statusEnum.optional(),
});

const createWarranty = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  duration: z.coerce.number().int().positive("duration must be > 0"),
  type: z.string().trim().min(1, "Type is required").max(30),
  description: z.string().trim().max(500).optional(),
  status: statusEnum.default("active"),
});

const updateWarranty = z.object({
  name: z.string().trim().min(1, "Name is required").max(120).optional(),
  duration: z.coerce.number().int().positive("duration must be > 0").optional(),
  type: z.string().trim().min(1, "Type is required").max(30).optional(),
  description: z.string().trim().max(500).optional(),
  status: statusEnum.optional(),
});

module.exports = {
  createCategory,
  updateCategory,
  createSubcategory,
  updateSubcategory,
  createUnit,
  updateUnit,
  createWarranty,
  updateWarranty,
};
