// server/src/routes/driver.js
// Mounted at /api/driver

const express = require("express");
const router = express.Router();
const { driverProtect } = require("../middleware/driverAuthMiddleware");

const driverAuthController = require("../controllers/driverAuthController");
const driverDeliveryController = require("../controllers/driverDeliveryController");
const driverLocationController = require("../controllers/driverLocationController");
const driverEarningsController = require("../controllers/driverEarningsController");

// ── 1. Driver Authentication & Availability ─────────────────────────
router.post("/auth/login", driverAuthController.login);
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

// ── 4. Wallet / Earnings ─────────────────────────────────────────────
router.get("/earnings", driverProtect, driverEarningsController.getEarnings);
router.post("/withdraw", driverProtect, driverEarningsController.requestWithdrawal);

module.exports = router;
