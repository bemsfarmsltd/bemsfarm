const { z } = require("zod");

const register = z.object({
  name: z.string({ error: "Name is required" }).trim().min(1, "Name is required"),
  email: z.string({ error: "Valid email required" }).trim().email("Valid email required"),
  password: z.string({ error: "Password must be at least 6 characters" }).min(6, "Password must be at least 6 characters"),
  phone: z.string({ error: "Phone number is required" }).trim().min(1, "Phone number is required"),
  preferences: z.array(z.string().trim().max(50)).max(20).optional(),
});

const login = z.object({
  email: z.string({ error: "Email and password required" }).trim().min(1, "Email and password required"),
  password: z.string({ error: "Email and password required" }).min(1, "Email and password required"),
});

const updateProfile = z.object({
  name: z.string({ error: "Name is required" }).trim().min(1, "Name is required"),
  phone: z.string().trim().optional(),
  gender: z.string().trim().max(20).optional(),
  id_number: z.string().trim().max(100).optional(),
  tax_id: z.string().trim().max(100).optional(),
  tax_country: z.string().trim().max(100).optional(),
  address: z.string().trim().max(2000).optional(),
});

const updateAvatar = z.object({
  // A data: URI from FileReader.readAsDataURL — capped well above what a
  // reasonably-compressed profile photo needs, to keep the users row small.
  avatar_url: z.string({ error: "Image data is required" }).trim().min(1).max(2_000_000, "Image is too large"),
});

const changePassword = z.object({
  current_password: z.string({ error: "Current and new password are required" }).min(1, "Current and new password are required"),
  new_password: z.string({ error: "New password must be at least 6 characters" }).min(6, "New password must be at least 6 characters"),
});

const forgotPassword = z.object({
  email: z.string({ error: "Email required" }).trim().min(1, "Email required"),
});

const resetPassword = z.object({
  token: z.string({ error: "Token and password required" }).min(1, "Token and password required"),
  password: z.string({ error: "Password must be at least 6 characters" }).min(6, "Password must be at least 6 characters"),
});

const google = z.object({
  credential: z.string({ error: "Google credential required" }).min(1, "Google credential required"),
});

module.exports = {
  register,
  login,
  updateProfile,
  updateAvatar,
  changePassword,
  forgotPassword,
  resetPassword,
  google,
};