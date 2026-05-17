require('dotenv').config();
const pool = require('../db/pool');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// ─── Helper: generate JWT token ───────────────────────────────
const generateToken = (user) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('FATAL: JWT_SECRET environment variable is not set!');
  }
  return jwt.sign(
    { id: user.id, email: user.email },
    secret,
    { expiresIn: '7d' }
  );
};

// ─── REGISTER ─────────────────────────────────────────────────
// POST /api/auth/register
const register = async (req, res, next) => {
  try {
    const { name, email, password, phone } = req.body;

    // 2. Check if email already exists
    const existing = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ 
        message: 'Email already registered' 
      });
    }

    // 3. Hash the password (never store plain text!)
    const hashedPassword = await bcrypt.hash(password, 10);

    // 4. Save user to database
    const result = await pool.query(
      `INSERT INTO users (name, email, password, phone) 
       VALUES ($1, $2, $3, $4) 
       RETURNING id, name, email, phone, created_at`,
      [name, email, hashedPassword, phone || null]
    );

    const user = result.rows[0];

    // 5. Generate token
    const token = generateToken(user);

    // 6. Send response
    res.status(201).json({
      message: 'Account created successfully!',
      token,
      user: {
        id:    user.id,
        name:  user.name,
        email: user.email,
        phone: user.phone,
      }
    });

  } catch (error) {
    next(error);
  }
};

// ─── LOGIN ────────────────────────────────────────────────────
// POST /api/auth/login
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // 2. Find user by email
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    console.log('👤 User found:', result.rows.length);

    if (result.rows.length === 0) {
      return res.status(401).json({ 
        message: 'Invalid email or password' 
      });
    }

    const user = result.rows[0];

    // 3. Compare password with hashed version
    console.log('🔐 Comparing passwords...');
    const isMatch = await bcrypt.compare(password, user.password);
    console.log('✅ Password match:', isMatch);
    if (!isMatch) {
      return res.status(401).json({ 
        message: 'Invalid email or password' 
      });
    }

    // 4. Generate token
    const token = generateToken(user);

    // 5. Send response
    res.json({
      message: 'Login successful!',
      token,
      user: {
        id:      user.id,
        name:    user.name,
        email:   user.email,
        phone:   user.phone,
        address: user.address,
      }
    });

  } catch (error) {
    next(error);
  }
};

// ─── GET ME (protected) ───────────────────────────────────────
// GET /api/auth/me
const getMe = async (req, res, next) => {
  try {
    // req.user comes from our auth middleware
    const result = await pool.query(
      'SELECT id, name, email, phone, address, created_at FROM users WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ user: result.rows[0] });

  } catch (error) {
    next(error);
  }
};

module.exports = { register, login, getMe };