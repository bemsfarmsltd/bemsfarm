// server/src/routes/driver.js
// Mounted at /api/driver

const express = require("express");
const router = express.Router();
const { driverProtect, optionalDriverProtect } = require("../middleware/driverAuthMiddleware");

const driverAuthController = require("../controllers/driverAuthController");
const driverDeliveryController = require("../controllers/driverDeliveryController");
const driverLocationController = require("../controllers/driverLocationController");
const driverEarningsController = require("../controllers/driverEarningsController");
const driverOnboardingController = require("../controllers/driverOnboardingController");
const driverNotificationController = require("../controllers/driverNotificationController");
const driverUploadController = require("../controllers/driverUploadController");
const driverIncidentController = require("../controllers/driverIncidentController");
const driverEmergencyController = require("../controllers/driverEmergencyController");
const driverStatsController = require("../controllers/driverStatsController");
const driverBankAccountController = require("../controllers/driverBankAccountController");
const driverChatController = require("../controllers/driverChatController");
const driverPinController = require("../controllers/driverPinController");

// ── Root Driver API Info / Health ──────────────────────────────────
router.get("/", (req, res) => {
  res.json({
    service: "Bems Farms Driver API",
    status: "online",
    version: "2.0.0",
    description: "Backend endpoints for Bems Farms Driver Mobile Application & Dispatch Operations",
    endpoints: {
      onboarding: "GET /api/driver/onboarding/verify | POST /api/driver/onboarding/submit",
      auth: "POST /api/driver/auth/login | POST /api/driver/auth/forgot-password | POST /api/driver/auth/reset-password",
      profile: "GET /api/driver/auth/me | PATCH /api/driver/auth/profile | PATCH /api/driver/availability",
      deliveries: "GET /api/driver/deliveries | GET /api/driver/deliveries/:orderId | PATCH /api/driver/deliveries/:orderId/status | GET /api/driver/deliveries/history",
      actions: "POST /api/driver/deliveries/:orderId/accept | POST /api/driver/deliveries/:orderId/decline | POST /api/driver/deliveries/:orderId/report-issue",
      proof_upload: "POST /api/driver/upload/proof",
      telemetry: "POST /api/driver/location",
      wallet: "GET /api/driver/earnings | GET /api/driver/banks | POST /api/driver/bank/resolve | POST /api/driver/withdraw",
      pin_security: "POST /api/driver/pin/setup | POST /api/driver/pin/verify | GET /api/driver/pin/status | POST /api/driver/pin/reset",
      notifications: "POST /api/driver/device-token | GET /api/driver/notifications | PATCH /api/driver/notifications/:id/read | PATCH /api/driver/notifications/read-all",
      performance: "GET /api/driver/stats | GET /api/driver/performance",
      emergency_sos: "POST /api/driver/emergency | POST /api/driver/emergency/:id/cancel"
    },
    timestamp: new Date().toISOString()
  });
});

// ── 0. Driver Onboarding & Self-Service Registration ───────────────
router.post("/auth/register", driverAuthController.register);
router.post("/register", driverAuthController.register);
router.get("/auth/status", driverProtect, driverAuthController.getVerificationStatus);
router.get("/auth/verification", driverProtect, driverAuthController.getVerificationStatus);
router.get("/onboarding/verify", driverOnboardingController.verifyToken);
router.post("/onboarding/submit", driverOnboardingController.submitOnboarding);

// ── 0b. Available Delivery Zones for Driver Registration & Shift Coverage ──
router.get("/zones", async (req, res, next) => {
  try {
    const pool = require("../db/pool");
    const result = await pool.query(
      `SELECT zone_id, zone_name, delivery_fee, estimated_delivery_time, coverage_areas, areas_covered, center_lat, center_lng, radius_km, color_hex 
       FROM delivery_zones 
       WHERE status = 'active' 
       ORDER BY zone_name ASC`
    );
    res.json({ success: true, zones: result.rows });
  } catch (err) {
    next(err);
  }
});
router.get("/onboarding/zones", async (req, res, next) => {
  try {
    const pool = require("../db/pool");
    const result = await pool.query(
      `SELECT zone_id, zone_name, delivery_fee, estimated_delivery_time, coverage_areas, areas_covered, center_lat, center_lng, radius_km, color_hex 
       FROM delivery_zones 
       WHERE status = 'active' 
       ORDER BY zone_name ASC`
    );
    res.json({ success: true, zones: result.rows });
  } catch (err) {
    next(err);
  }
});

// ── 1. Driver Authentication & Availability ─────────────────────────
router.post("/auth/login", driverAuthController.login);
router.post("/auth/forgot-password", driverAuthController.forgotPassword);
router.post("/auth/reset-password", driverAuthController.resetPassword);
router.get("/auth/me", driverProtect, driverAuthController.getMe);
router.patch("/auth/profile", driverProtect, driverAuthController.updateProfile);
router.patch("/profile", driverProtect, driverAuthController.updateProfile);
router.put("/profile", driverProtect, driverAuthController.updateProfile);
router.patch("/availability", driverProtect, driverAuthController.toggleAvailability);

// ── 2. Profile Photo / Avatar Upload ─────────────────────────────────
router.post("/upload/avatar", driverProtect, driverUploadController.uploadAvatar.any(), driverUploadController.uploadProfilePhoto);
router.post("/upload/photo", driverProtect, driverUploadController.uploadAvatar.any(), driverUploadController.uploadProfilePhoto);
router.post("/upload/profile-photo", driverProtect, driverUploadController.uploadAvatar.any(), driverUploadController.uploadProfilePhoto);

// ── 2b. KYC & Document Uploads (Public or Authenticated) ─────────────
router.post("/upload/kyc", driverUploadController.uploadDoc.single("document"), driverUploadController.uploadKYCDocument);
router.post("/upload/document", driverUploadController.uploadDoc.single("document"), driverUploadController.uploadKYCDocument);

// ── 2. Deliveries / Orders (Automated Mapping & Dispatch) ───────────
router.get("/deliveries/available", driverProtect, driverDeliveryController.getAvailableDeliveries);
router.get("/deliveries/new", driverProtect, driverDeliveryController.getAvailableDeliveries);
router.get("/deliveries/active", driverProtect, driverDeliveryController.getActiveDeliveries);
router.get("/deliveries/history", driverProtect, driverDeliveryController.getDeliveryHistory);
router.get("/deliveries/summary", driverProtect, driverDeliveryController.getDeliveriesPayoutSummary);
router.get("/deliveries/payouts", driverProtect, driverDeliveryController.getDeliveriesPayoutSummary);
router.get("/deliveries/earned-payouts", driverProtect, driverDeliveryController.getDeliveriesPayoutSummary);
router.get("/deliveries", driverProtect, driverDeliveryController.getActiveDeliveries);
router.get("/deliveries/:orderId", driverProtect, driverDeliveryController.getDeliveryDetails);
router.post("/deliveries/:orderId/accept", driverProtect, driverDeliveryController.acceptDelivery);
router.patch("/deliveries/:orderId/accept", driverProtect, driverDeliveryController.acceptDelivery);
router.put("/deliveries/:orderId/accept", driverProtect, driverDeliveryController.acceptDelivery);
router.post("/deliveries/:orderId/decline", driverProtect, driverDeliveryController.declineDelivery);
router.patch("/deliveries/:orderId/decline", driverProtect, driverDeliveryController.declineDelivery);
router.put("/deliveries/:orderId/decline", driverProtect, driverDeliveryController.declineDelivery);
router.post("/deliveries/:orderId/confirm-pickup", driverProtect, driverDeliveryController.confirmPickup);
router.patch("/deliveries/:orderId/confirm-pickup", driverProtect, driverDeliveryController.confirmPickup);
router.post("/deliveries/:orderId/confirm-delivery", driverProtect, driverDeliveryController.confirmDelivery);
router.patch("/deliveries/:orderId/confirm-delivery", driverProtect, driverDeliveryController.confirmDelivery);
router.post("/deliveries/:orderId/confirm", driverProtect, driverDeliveryController.confirmDelivery);
router.patch("/deliveries/:orderId/status", driverProtect, driverDeliveryController.updateDeliveryStatus);
router.post("/deliveries/:orderId/status", driverProtect, driverDeliveryController.updateDeliveryStatus);
router.put("/deliveries/:orderId/status", driverProtect, driverDeliveryController.updateDeliveryStatus);
router.patch("/deliveries/:orderId", driverProtect, driverDeliveryController.updateDeliveryStatus);
router.put("/deliveries/:orderId", driverProtect, driverDeliveryController.updateDeliveryStatus);
router.post("/deliveries/:orderId/request-return", driverProtect, driverDeliveryController.requestReturnByDriver);
router.post("/deliveries/:orderId/report-issue", driverProtect, driverIncidentController.reportIncident);

// ── 3. Proof of Delivery (POD) Image Upload (accepts 'photo', 'image', 'file', etc.) ──
router.post("/upload/proof", driverProtect, driverUploadController.upload.any(), driverUploadController.uploadProofPhoto);

// ── 4. Location Telemetry & Heartbeat Ping ────────────────────────────
router.post("/location", driverProtect, driverLocationController.updateLocation);
router.post("/heartbeat", driverProtect, driverLocationController.recordHeartbeat);

// ── 5. Wallet, Earnings & Withdrawals ─────────────────────────────────
router.get("/earnings", driverProtect, driverEarningsController.getEarnings);
router.get("/earnings/payouts", driverProtect, driverDeliveryController.getDeliveriesPayoutSummary);
router.get("/earnings/summary", driverProtect, driverDeliveryController.getDeliveriesPayoutSummary);
router.get("/wallet", driverProtect, driverEarningsController.getEarnings);
router.get("/wallet/history", driverProtect, driverEarningsController.getWalletHistory);
router.get("/wallet/statement", driverProtect, driverEarningsController.requestAccountStatement);
router.post("/wallet/statement", driverProtect, driverEarningsController.requestAccountStatement);
router.get("/wallet/statement/download", driverProtect, driverEarningsController.requestAccountStatement);
router.get("/wallet/statement/html", driverProtect, driverEarningsController.requestAccountStatement);
router.get("/banks", optionalDriverProtect, driverEarningsController.getBanks);
router.post("/withdraw", driverProtect, driverEarningsController.requestWithdrawal);

// Bank Verification & Account Resolution Endpoints
router.post("/bank/resolve", optionalDriverProtect, driverEarningsController.resolveBankAccount);
router.post("/bank/verify", optionalDriverProtect, driverEarningsController.resolveBankAccount);
router.post("/banks/resolve", optionalDriverProtect, driverEarningsController.resolveBankAccount);
router.post("/banks/verify", optionalDriverProtect, driverEarningsController.resolveBankAccount);
router.post("/bank-accounts/resolve", optionalDriverProtect, driverEarningsController.resolveBankAccount);
router.post("/bank-accounts/verify", optionalDriverProtect, driverEarningsController.resolveBankAccount);
router.post("/saved-banks/resolve", optionalDriverProtect, driverEarningsController.resolveBankAccount);
router.post("/saved-banks/verify", optionalDriverProtect, driverEarningsController.resolveBankAccount);
router.post("/verify-bank", optionalDriverProtect, driverEarningsController.resolveBankAccount);
router.post("/resolve-bank", optionalDriverProtect, driverEarningsController.resolveBankAccount);

// ── 5b. Saved Bank Accounts for Payouts ───────────────────────────────
router.get("/bank-accounts", driverProtect, driverBankAccountController.getSavedBankAccounts);
router.post("/bank-accounts", driverProtect, driverBankAccountController.addSavedBankAccount);
router.post("/bank-accounts/sync", driverProtect, driverBankAccountController.syncSavedBankAccounts);
router.patch("/bank-accounts/:id/default", driverProtect, driverBankAccountController.setDefaultBankAccount);
router.post("/bank-accounts/:id/default", driverProtect, driverBankAccountController.setDefaultBankAccount);
router.patch("/bank-accounts/:id", driverProtect, driverBankAccountController.updateSavedBankAccount);
router.put("/bank-accounts/:id", driverProtect, driverBankAccountController.updateSavedBankAccount);
router.delete("/bank-accounts/:id", driverProtect, driverBankAccountController.deleteSavedBankAccount);

// Mobile Client Aliases
router.get("/saved-banks", driverProtect, driverBankAccountController.getSavedBankAccounts);
router.post("/saved-banks", driverProtect, driverBankAccountController.addSavedBankAccount);
router.post("/saved-banks/sync", driverProtect, driverBankAccountController.syncSavedBankAccounts);
router.patch("/saved-banks/:id/default", driverProtect, driverBankAccountController.setDefaultBankAccount);
router.post("/saved-banks/:id/default", driverProtect, driverBankAccountController.setDefaultBankAccount);
router.delete("/saved-banks/:id", driverProtect, driverBankAccountController.deleteSavedBankAccount);

// ── 5c. Driver Security PIN (App Unlock & Cashout Protection) ───────────
router.get("/pin/status", driverProtect, driverPinController.getPinStatus);
router.get("/pin", driverProtect, driverPinController.getPinStatus);
router.post("/pin/setup", driverProtect, driverPinController.setupPin);
router.post("/pin/create", driverProtect, driverPinController.setupPin);
router.post("/pin/change", driverProtect, driverPinController.setupPin);
router.put("/pin/setup", driverProtect, driverPinController.setupPin);
router.post("/pin/verify", driverProtect, driverPinController.verifyPin);
router.post("/pin/validate", driverProtect, driverPinController.verifyPin);
router.post("/pin/check", driverProtect, driverPinController.verifyPin);
router.post("/pin/reset", driverProtect, driverPinController.resetPinWithPassword);

// ── 6. Push Tokens & In-App Notification Feed ────────────────────────
router.post("/device-token", driverProtect, driverNotificationController.registerDeviceToken);
router.get("/notifications", driverProtect, driverNotificationController.getNotifications);
router.patch("/notifications/read-all", driverProtect, driverNotificationController.markAllNotificationsRead);
router.patch("/notifications/:id/read", driverProtect, driverNotificationController.markNotificationRead);

// ── 7. Performance Scorecard & Customer Ratings ──────────────────────
router.get("/stats", driverProtect, driverStatsController.getDriverStats);
router.get("/performance", driverProtect, driverStatsController.getDriverStats);

// ── 8. Incidents & Problem Reports ───────────────────────────────────
router.get("/incidents", driverProtect, driverIncidentController.getDriverIncidents);

// ── 9. Emergency SOS / Panic Alerts ──────────────────────────────────
router.post("/emergency", driverProtect, driverEmergencyController.triggerEmergency);
router.post("/emergency/:id/cancel", driverProtect, driverEmergencyController.cancelEmergency);

// ── 10. Driver Dispatch Support Live Chat & AI Assistant ─────────────
router.get("/support/messages", driverProtect, driverChatController.getMessages);
router.post("/support/messages", driverProtect, driverChatController.sendMessage);
router.get("/support/reference-options", driverProtect, driverChatController.getReferenceOptions);
router.post("/support/read", driverProtect, driverChatController.markAsRead);

// Aliases for mobile app compatibility
router.get("/chat/messages", driverProtect, driverChatController.getMessages);
router.post("/chat/messages", driverProtect, driverChatController.sendMessage);
router.get("/chat/reference-options", driverProtect, driverChatController.getReferenceOptions);

module.exports = router;
