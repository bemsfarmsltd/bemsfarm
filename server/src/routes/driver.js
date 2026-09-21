// server/src/routes/driver.js
// Mounted at /api/driver

const express = require("express");
const router = express.Router();
const { driverProtect } = require("../middleware/driverAuthMiddleware");

const driverAuthController = require("../controllers/driverAuthController");
const driverDeliveryController = require("../controllers/driverDeliveryController");
const driverLocationController = require("../controllers/driverLocationController");
const driverEarningsController = require("../controllers/driverEarningsController");
const driverOnboardingController = require("../controllers/driverOnboardingController");

// ── Root Driver API Info / Health ──────────────────────────────────
router.get("/", (req, res) => {
  res.json({
    service: "Bems Farms Driver API",
    status: "online",
    version: "1.0.0",
    description: "Backend endpoints for Bems Farms Driver Mobile Application & Dispatch",
    endpoints: {
      onboarding_verify: "GET /api/driver/onboarding/verify?token=...",
      onboarding_submit: "POST /api/driver/onboarding/submit",
      auth_login: "POST /api/driver/auth/login",
      auth_me: "GET /api/driver/auth/me",
      update_profile: "PATCH /api/driver/auth/profile",
      toggle_availability: "PATCH /api/driver/availability",
      active_deliveries: "GET /api/driver/deliveries",
      delivery_details: "GET /api/driver/deliveries/:orderId",
      update_delivery_status: "PATCH /api/driver/deliveries/:orderId/status",
      delivery_history: "GET /api/driver/deliveries/history",
      location_ping: "POST /api/driver/location",
      earnings: "GET /api/driver/earnings",
      withdraw: "POST /api/driver/withdraw"
    },
    timestamp: new Date().toISOString()
  });
});

// ── 0. Driver Onboarding & Compliance (Public with Token) ─────────
router.get("/onboarding/verify", driverOnboardingController.verifyToken);
router.post("/onboarding/submit", driverOnboardingController.submitOnboarding);

// ── 1. Driver Authentication & Availability ─────────────────────────
router.post("/auth/login", driverAuthController.login);
router.post("/auth/forgot-password", driverAuthController.forgotPassword);
router.post("/auth/reset-password", driverAuthController.resetPassword);
router.get("/auth/me", driverProtect, driverAuthController.getMe);
router.patch("/auth/profile", driverProtect, driverAuthController.updateProfile);
router.patch("/availability", driverProtect, driverAuthController.toggleAvailability);

// ── 2. Deliveries / Orders (Automated Mapping) ──────────────────────
router.get("/deliveries", driverProtect, driverDeliveryController.getActiveDeliveries);
router.get("/deliveries/history", driverProtect, driverDeliveryController.getDeliveryHistory);
router.get("/deliveries/:orderId", driverProtect, driverDeliveryController.getDeliveryDetails);
router.patch("/deliveries/:orderId/status", driverProtect, driverDeliveryController.updateDeliveryStatus);

// ── 3. Location Tracking ─────────────────────────────────────────────
router.post("/location", driverProtect, driverLocationController.updateLocation);

// ── 4. Wallet, Earnings & Withdrawals ─────────────────────────────────
router.get("/earnings", driverProtect, driverEarningsController.getEarnings);
router.get("/banks", driverProtect, driverEarningsController.getBanks);
router.post("/bank/resolve", driverProtect, driverEarningsController.resolveBankAccount);
router.post("/withdraw", driverProtect, driverEarningsController.requestWithdrawal);

module.exports = router;

