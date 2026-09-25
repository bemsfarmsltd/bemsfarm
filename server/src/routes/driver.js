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

// ── 1. Driver Authentication & Availability ─────────────────────────
router.post("/auth/login", driverAuthController.login);
router.post("/auth/forgot-password", driverAuthController.forgotPassword);
router.post("/auth/reset-password", driverAuthController.resetPassword);
router.get("/auth/me", driverProtect, driverAuthController.getMe);
router.patch("/auth/profile", driverProtect, driverAuthController.updateProfile);
router.patch("/availability", driverProtect, driverAuthController.toggleAvailability);

// ── 2. KYC & Document Uploads (Public or Authenticated) ─────────────
router.post("/upload/kyc", driverUploadController.uploadDoc.single("document"), driverUploadController.uploadKYCDocument);
router.post("/upload/document", driverUploadController.uploadDoc.single("document"), driverUploadController.uploadKYCDocument);

// ── 2. Deliveries / Orders (Automated Mapping & Dispatch) ───────────
router.get("/deliveries/available", driverProtect, driverDeliveryController.getAvailableDeliveries);
router.get("/deliveries/new", driverProtect, driverDeliveryController.getAvailableDeliveries);
router.get("/deliveries/active", driverProtect, driverDeliveryController.getActiveDeliveries);
router.get("/deliveries/history", driverProtect, driverDeliveryController.getDeliveryHistory);
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
router.post("/deliveries/:orderId/request-return", driverProtect, driverDeliveryController.requestReturnByDriver);
router.post("/deliveries/:orderId/report-issue", driverProtect, driverIncidentController.reportIncident);

// ── 3. Proof of Delivery (POD) Image Upload (accepts 'photo', 'image', 'file', etc.) ──
router.post("/upload/proof", driverProtect, driverUploadController.upload.any(), driverUploadController.uploadProofPhoto);

// ── 4. Location Telemetry & Heartbeat Ping ────────────────────────────
router.post("/location", driverProtect, driverLocationController.updateLocation);
router.post("/heartbeat", driverProtect, driverLocationController.recordHeartbeat);

// ── 5. Wallet, Earnings & Withdrawals ─────────────────────────────────
router.get("/earnings", driverProtect, driverEarningsController.getEarnings);
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

module.exports = router;
