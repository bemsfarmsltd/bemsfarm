require("dotenv").config();
require("dns").setDefaultResultOrder("ipv4first");
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const rateLimit = require("express-rate-limit");
const app = express();

app.set("trust proxy", 1);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const allowed = [
        "https://www.bemsfarms.com",
        "https://bemsfarms.com",
        "https://bemsfarm.vercel.app",
        // Henry's admin frontend — update these to match his actual deployment URL
        "https://bems-admin.vercel.app",
        "https://admin.bemsfarms.com",
        // Local dev
        "http://localhost:5173",
        "http://localhost:5174", // Henry's local dev (Vite uses next port if 5173 is taken)
        "http://localhost:3000",
        "http://localhost:4173",
        process.env.FRONTEND_URL,
        process.env.ADMIN_URL, // add ADMIN_URL to Render env vars once Henry deploys
      ].filter(Boolean);
      if (allowed.includes(origin)) return callback(null, true);
      console.warn(`🚫 CORS blocked origin: ${origin}`);
      callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use(
  express.json({
    limit: "10mb",
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  }),
);
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again after 15 minutes." },
  skip: (req) => req.path === "/health" || req.path === "/test",
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many auth attempts, please try again in 15 minutes." },
});

const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "AI request limit reached. Please try again in an hour." },
});

const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many payment requests. Please slow down." },
});

app.use(generalLimiter);

const authRoutes = require("./routes/auth");
const ordersRoutes = require("./routes/orders");
const productsRoutes = require("./routes/products");
const categoriesRoutes = require("./routes/categories");
const adminRoutes = require("./routes/admin");
const aiRoutes = require("./routes/ai");
const miscRoutes = require("./routes/misc");
const advancedAiRoutes = require("./routes/advanced-ai");
const zohoRoutes = require("./routes/zoho");
const dashboardRoutes = require("./routes/dashboard");
const productsAdminRoutes = require("./routes/products_admin");
const ordersAdminRoutes = require("./routes/orders_admin");
const customersAdminRoutes = require("./routes/customers_admin");
const deliveriesAdminRoutes = require("./routes/deliveries_admin");
const inventoryAdminRoutes  = require("./routes/inventory_admin");
const staffAdminRoutes      = require("./routes/staff_admin");
const accountsAdminRoutes   = require("./routes/accounts_admin");
const suppliersAdminRoutes  = require("./routes/suppliers_admin");
const purchasesAdminRoutes  = require("./routes/purchases_admin");
const reportsAdminRoutes    = require("./routes/reports_admin");
const aiContextRoutes       = require("./routes/ai_context");
const storesAdminRoutes     = require("./routes/stores_admin");
const cartRoutes            = require("./routes/cart");
const settingsAdminRoutes   = require("./routes/settings_admin");
const couponsAdminRoutes    = require("./routes/coupons_admin");
const posAdminRoutes        = require("./routes/pos_admin");
const chefBemsAdminRoutes   = require("./routes/chef_bems_admin");
const paymentsAdminRoutes   = require("./routes/payments_admin");
const configAdminRoutes     = require("./routes/config_admin");

app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/orders", paymentLimiter, ordersRoutes);
app.use("/api/products", productsRoutes);
app.use("/api/categories", categoriesRoutes);
app.use("/api/ai", aiLimiter, aiRoutes);
app.use("/api/dashboard", dashboardRoutes);

// Specific admin routes MUST come before the generic /api/admin route
app.use("/api/admin/products", productsAdminRoutes);
app.use("/api/admin/orders", ordersAdminRoutes);
app.use("/api/admin/customers", customersAdminRoutes);
app.use("/api/admin/deliveries", deliveriesAdminRoutes);
app.use("/api/admin/delivery-zones", deliveriesAdminRoutes);
app.use("/api/admin/inventory", inventoryAdminRoutes);
app.use("/api/admin/config", configAdminRoutes);
app.use("/api/admin/staff",     staffAdminRoutes);
app.use("/api/admin/accounts",  accountsAdminRoutes);
app.use("/api/admin/suppliers", suppliersAdminRoutes);
app.use("/api/admin/purchases", purchasesAdminRoutes);
app.use("/api/admin/reports",   reportsAdminRoutes);
app.use("/api/admin/stores",    storesAdminRoutes);
app.use("/api/admin/settings",  settingsAdminRoutes);
app.use("/api/admin/coupons",   couponsAdminRoutes);
app.use("/api/admin/pos",       posAdminRoutes);
app.use("/api/admin/chef-bems", chefBemsAdminRoutes);
app.use("/api/admin/payments",  paymentsAdminRoutes);

// Legacy fallback admin route
app.use("/api/admin", adminRoutes);
app.use("/api/ai/context",      aiContextRoutes);
app.use("/api/cart",            cartRoutes);
app.use("/api", miscRoutes);
app.use("/api/advanced-ai", aiLimiter, advancedAiRoutes);
app.use("/api/zoho", zohoRoutes);

const errorHandler = require("./middleware/errorHandler");
app.use(errorHandler);

app.get("/api", (req, res) => res.json({ status: "OK", name: "Bems Farms API", version: "1.0", time: new Date() }));
app.get("/health", (req, res) => res.json({ status: "OK", time: new Date() }));
app.get("/test", (req, res) => res.json({ message: "server works" }));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

module.exports = app;
