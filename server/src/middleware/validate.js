const { z } = require('zod');

// Middleware to validate incoming request body against a Zod schema
const validate = (schema) => (req, res, next) => {
  try {
    // Attempt to parse and validate the request body
    schema.parse(req.body);
    next();
  } catch (err) {
    if (err instanceof z.ZodError) {
      // Format Zod errors nicely
      const errors = err.errors.map(e => ({
        field: e.path.join('.'),
        message: e.message
      }));
      
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
    }
    
    next(err);
  }
};

// --- Define Authentication Schemas ---

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  phone: z.string().optional()
});

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required")
});

module.exports = { validate, registerSchema, loginSchema };
