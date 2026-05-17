const express = require('express');
const router = express.Router();
const { register, login, getMe } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const { validate, registerSchema, loginSchema } = require('../middleware/validate');

// Public routes (no token needed)
router.post('/register', validate(registerSchema), register);
router.post('/login',    validate(loginSchema), login);

// Protected route (token required)
router.get('/me', protect, getMe);

module.exports = router;