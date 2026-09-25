require("dotenv").config();
require("dns").setDefaultResultOrder("ipv4first");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const rateLimit = require("express-rate-limit");
const swaggerUi = require('swagger-ui-express');
const fs = require('fs');
const app = express();

app.set("trust proxy", 1);

// This is a JSON-only API (no HTML pages or static assets served here), so
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const allowed = [
        "https://www.bemsfarms.com",
        "https://bemsfarms.com",
        "https://bemsfarm.vercel.app",
        "https://palegoldenrod-bee-264147.hostingersite.com",
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
    allowedHeaders: ["Content-Type", "Authorization", "X-Channel", "X-Requested-With", "Accept", "Origin", "X-Audit-Actor", "X-Audit-Id"],
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
const path = require("path");
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));
app.use(require('./services/auditService').auditRequests);
app.use('/api/audit', require('./routes/audit'));


// Auto-run God Eye audit v2 & Driver tables schema migration on startup (idempotent)
(async () => {
  try {
    const fs   = require('fs');
    const path = require('path');
    const pool = require('./db/pool');
    
    // Audit v2 migration (run only if schema is not yet up to date)
    try {
      const colCheck = await pool.query(`
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'system_audit_events' AND column_name = 'external_id'
        LIMIT 1
      `);
      if (colCheck.rows.length === 0) {
        const sqlAudit = fs.readFileSync(path.join(__dirname, 'db/audit_v2_migration.sql'), 'utf8');
        await pool.query(sqlAudit);
        console.log('✅ God Eye Audit v2 schema ready.');
      } else {
        console.log('✅ God Eye Audit v2 schema verified.');
      }
    } catch (e) {
      console.warn('[god-eye] Audit v2 migration notice:', e.message?.slice(0,120));
    }

    // Driver tables migration (run only if tables not yet created)
    try {
      const driverCheck = await pool.query(`
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'driver_wallet_ledger'
        LIMIT 1
      `);
      if (driverCheck.rows.length === 0) {
        const sqlDriver = fs.readFileSync(path.join(__dirname, 'db/driver_tables_migration.sql'), 'utf8');
    // Chat Support & Order Referencing schema migration
    try {
      const { initChatSupportTables } = require('./db/migrate_chat_support');
      await initChatSupportTables();
    } catch (e) {
      console.warn('[chat-support] Schema init notice:', e.message?.slice(0, 120));
    }

    // Start automated driver assignment timeout worker (5 min threshold, checks every 30s)
    try {
      const { startAutoDispatchTimeoutWorker } = require('./services/dispatchEngine');
      startAutoDispatchTimeoutWorker(30, 5);
    } catch (e) {
      console.warn('[dispatch-worker] Failed to initialize timeout worker:', e.message);
    }

    // Start automated scheduled driver payout worker
    try {
      const { startPayoutSchedulerWorker } = require('./services/payoutScheduler');
      startPayoutSchedulerWorker(6);
    } catch (e) {
      console.warn('[payout-worker] Failed to initialize payout scheduler worker:', e.message);
    }

    // Auto-record deployment audit event for Developer Audit
    const { recordDeploymentEvent } = require('./services/auditService');
    await recordDeploymentEvent();
  } catch (e) {
    console.warn('Startup migration notice:', e.message?.slice(0,120));
  }
})();


const getClientIp = (req) => {
  return (
    req.headers["cf-connecting-ip"] ||
    req.headers["x-real-ip"] ||
    (req.headers["x-forwarded-for"]
      ? req.headers["x-forwarded-for"].split(",")[0].trim()
      : null) ||
    req.ip ||
    "127.0.0.1"
  );
};

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3000, // Generous ceiling for dynamic SPA browsing
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getClientIp,
  validate: false,
  message: { message: "Too many requests, please try again after a few minutes." },
  skip: (req) => {
    // Never rate limit internal probes
    if (req.path === "/health" || req.path === "/test" || req.path === "/api") return true;
    // Don't rate limit authenticated users or staff dashboard calls
    if (req.headers.authorization) return true;
    if (req.path.startsWith("/api/admin") || req.path.startsWith("/api/dashboard")) return true;
    // Auth login/register has its own dedicated authLimiter
    if (req.path.startsWith("/api/auth")) return true;
    return false;
  },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 120, // 120 attempts per 15 minutes per true client IP
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getClientIp,
  validate: false,
  message: { message: "Too many login attempts. Please try again in a few minutes." },
  // Do not rate-limit token verification or refresh calls
  skip: (req) => req.path === "/me" || req.path === "/refresh",
});

const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getClientIp,
  validate: false,
  message: { message: "AI request limit reached. Please try again in an hour." },
});

const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getClientIp,
  validate: false,
  message: { message: "Too many payment requests. Please slow down." },
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
const dashboardRoutes = require("./routes/dashboard");
const productsAdminRoutes = require("./routes/products_admin");
const ordersAdminRoutes = require("./routes/orders_admin");
const customersAdminRoutes = require("./routes/customers_admin");
const deliveriesAdminRoutes = require("./routes/deliveries_admin");
const inventoryAdminRoutes = require("./routes/inventory_admin");
const staffAdminRoutes = require("./routes/staff_admin");
const accountsAdminRoutes = require("./routes/accounts_admin");
const suppliersAdminRoutes = require("./routes/suppliers_admin");
const purchasesAdminRoutes = require("./routes/purchases_admin");
const reportsAdminRoutes = require("./routes/reports_admin");
const aiContextRoutes = require("./routes/ai_context");
const storesAdminRoutes = require("./routes/stores_admin");
const settingsAdminRoutes = require("./routes/settings_admin");
const notificationsAdminRoutes = require("./routes/notifications_admin");
const couponsAdminRoutes = require("./routes/coupons_admin");
const posAdminRoutes = require("./routes/pos_admin");
const chefBemsAdminRoutes = require("./routes/chef_bems_admin");
const paymentsAdminRoutes = require("./routes/payments_admin");
const walletsAdminRoutes = require("./routes/wallets_admin");
const configAdminRoutes = require("./routes/config_admin");
const issuesRoutes = require("./routes/issues");
const addressesRoutes = require("./routes/addresses");
const wishlistRoutes = require("./routes/wishlist");
const telemetryRoutes = require("./routes/telemetry");
const customerChatRoutes = require("./routes/customer_chat");
const broadcastsRoutes = require("./routes/broadcasts");
const driverRoutes = require("./routes/driver");
const locationRoutes = require("./routes/locations");
const dispatchAdminRoutes = require("./routes/dispatch_admin");
const notificationsRoutes = require("./routes/notifications");
const verifyRoutes = require("./routes/verify_public");

app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/verify", verifyRoutes);
app.use("/api/notifications", notificationsRoutes);
app.use("/api/driver", driverRoutes);
app.use("/api/locations", locationRoutes);
app.use("/api/orders", paymentLimiter, ordersRoutes);
app.use("/api/issues", issuesRoutes);
app.use("/api/products", productsRoutes);
app.use("/api/categories", categoriesRoutes);
app.use("/api/ai", aiLimiter, aiRoutes);
app.use("/api/dashboard", dashboardRoutes);

// Specific admin routes MUST come before the generic /api/admin route
app.use("/api/admin/products", productsAdminRoutes);
app.use("/api/admin/orders", ordersAdminRoutes);
app.use("/api/admin/customers", customersAdminRoutes);
app.use("/api/admin/deliveries", deliveriesAdminRoutes);
app.use("/api/admin/inventory", inventoryAdminRoutes);
app.use("/api/admin/config", configAdminRoutes);
app.use("/api/admin/staff", staffAdminRoutes);
app.use("/api/admin/accounts", accountsAdminRoutes);
app.use("/api/admin/wallets", walletsAdminRoutes);
app.use("/api/admin/suppliers", suppliersAdminRoutes);
app.use("/api/admin/purchases", purchasesAdminRoutes);
app.use("/api/admin/reports", reportsAdminRoutes);
app.use("/api/admin/stores", storesAdminRoutes);
app.use("/api/admin/settings", settingsAdminRoutes);
app.use("/api/admin/notifications", notificationsAdminRoutes);
app.use("/api/admin/coupons", couponsAdminRoutes);
app.use("/api/admin/pos", posAdminRoutes);
app.use("/api/admin/chef-bems", chefBemsAdminRoutes);
app.use("/api/admin/payments", paymentsAdminRoutes);
app.use("/api/admin/dispatch", dispatchAdminRoutes);

// Legacy fallback admin route
app.use("/api/admin", adminRoutes);
app.use("/api/ai/context", aiContextRoutes);
app.use("/api/addresses", addressesRoutes);
app.use("/api/wishlist", wishlistRoutes);
app.use("/api/telemetry", telemetryRoutes);
app.use("/api/support", customerChatRoutes);
app.use("/api/broadcasts", broadcastsRoutes);
app.use("/api", miscRoutes);
app.use("/api/advanced-ai", aiLimiter, advancedAiRoutes);

app.get("/api", (req, res) => res.json({ status: "OK", name: "Bems Farms API", version: "1.0", time: new Date() }));
app.get("/health", (req, res) => res.json({ status: "OK", time: new Date() }));
app.get("/test", (req, res) => res.json({ message: "server works" }));

try {
  const swaggerDocument = require('../swagger-output.json');
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
  console.log("Swagger UI available at /api/docs");
} catch (error) {
  console.log("Swagger UI not loaded: swagger-output.json not found. Run 'node swagger.js' to generate.");
}

const errorHandler = require("./middleware/errorHandler");
app.use(errorHandler);

const http = require("http");
const server = http.createServer(app);

const { initSocketService } = require("./services/socketService");
initSocketService(server, [process.env.FRONTEND_URL, process.env.ADMIN_URL].filter(Boolean));

const PORT = process.env.PORT || 5000;
const { initCrmTables } = require("./db/migrate_crm_chat_broadcast");

server.listen(PORT, () => console.log(`🚀 Server running with Realtime WebSockets on port ${PORT}`));

initCrmTables()
  .catch((err) => {
    console.warn("CRM tables startup notice (will retry on query):", err.message?.slice(0, 120));
  });

module.exports = { app, server };
