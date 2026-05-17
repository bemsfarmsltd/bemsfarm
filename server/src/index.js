const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();
const pool = require('./db/pool');
const authRoutes      = require('./routes/auth');
const productRoutes   = require('./routes/products');
const categoryRoutes  = require('./routes/categories');
const adminRoutes = require('./routes/admin');
const ordersRouter = require('./routes/orders');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Middleware ────────────────────────────────────────────────
// Set security HTTP headers
app.use(helmet());

// Basic rate-limiting: max 100 requests per 15 minutes per IP
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 100, 
  message: 'Too many requests from this IP, please try again after 15 minutes'
});
// Apply rate limiter to all API routes
app.use('/api/', apiLimiter);

app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
// ─── Routes ───────────────────────────────────────────────────
app.use('/api/auth',       authRoutes);
app.use('/api/products',   productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/orders', ordersRouter);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Frutella API is running 🥬' });
});

// Centralized error handler MUST be the last middleware
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
