// services/smsService.js
// ─────────────────────────────────────────────────────────────────────────────
// Termii SMS integration for Nigeria
// Sign up at: https://termii.com  → get API key → add to .env
// ─────────────────────────────────────────────────────────────────────────────

const axios = require("axios");

const TERMII_API_KEY = process.env.TERMII_API_KEY || "TEST_KEY";
const TERMII_SENDER = process.env.TERMII_SENDER_ID || "BemsFarms";
const TERMII_BASE_URL =
  process.env.TERMII_BASE_URL || "https://v3.api.termii.com";
const IS_TEST =
  !process.env.TERMII_API_KEY || process.env.TERMII_API_KEY === "TEST_KEY";

// ─── Core send function ───────────────────────────────────────────────────────
async function sendSMS(phoneNumber, message) {
  // Normalize Nigerian phone numbers: 08012345678 → 2348012345678
  const normalized = normalizePhone(phoneNumber);

  if (IS_TEST) {
    // In test mode, just log — no real SMS sent
    console.log(`[SMS TEST MODE] To: ${normalized}`);
    console.log(`[SMS TEST MODE] Message: ${message}`);
    return { status: "test", phone: normalized, message };
  }

  try {
    const response = await axios.post(`${TERMII_BASE_URL}/api/sms/send`, {
      to: normalized,
      from: TERMII_SENDER,
      sms: message,
      type: "plain",
      channel: "generic",
      api_key: TERMII_API_KEY,
    });
    console.log(`[SMS] Sent to ${normalized}:`, response.data);
    return { status: "sent", data: response.data };
  } catch (err) {
    console.error("[SMS] Failed:", err.response?.data || err.message);
    return { status: "failed", error: err.message };
  }
}

function normalizePhone(phone) {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("234")) return digits;
  if (digits.startsWith("0")) return "234" + digits.slice(1);
  return "234" + digits;
}

// ─── Pre-built message templates ─────────────────────────────────────────────

const SMS = {
  // Customer: order confirmed
  orderConfirmed: (phone, name, orderId, amount) =>
    sendSMS(
      phone,
      `Hi ${name}, your BemsFarms order #${orderId} worth ₦${Number(amount).toLocaleString()} has been confirmed. We'll notify you when it's on the way. Thank you!`,
    ),

  // Customer: order out for delivery
  outForDelivery: (phone, name, orderId) =>
    sendSMS(
      phone,
      `Hi ${name}, your BemsFarms order #${orderId} is out for delivery! Please be available to receive it. Reply HELP for support.`,
    ),

  // Customer: delivery attempted, you were unavailable
  customerUnavailable: (phone, name, orderId) =>
    sendSMS(
      phone,
      `Hi ${name}, our driver attempted delivery of order #${orderId} but couldn't reach you. Please call us back or visit bemsfarm.vercel.app to reschedule. We'll try again!`,
    ),

  // Customer: order delivered
  orderDelivered: (phone, name, orderId) =>
    sendSMS(
      phone,
      `Hi ${name}, your BemsFarms order #${orderId} has been delivered! We hope you enjoy it. Rate your experience on our app. Thank you for choosing BemsFarms!`,
    ),

  // Customer: order cancelled
  orderCancelled: (phone, name, orderId, reason) =>
    sendSMS(
      phone,
      `Hi ${name}, your BemsFarms order #${orderId} has been cancelled. Reason: ${reason}. Any payment will be refunded in 3-5 business days. Questions? Visit bemsfarm.vercel.app`,
    ),

  // Customer: refund processed
  refundProcessed: (phone, name, amount) =>
    sendSMS(
      phone,
      `Hi ${name}, your BemsFarms refund of ₦${Number(amount).toLocaleString()} has been processed via Monnify. It will reflect in your account within 3-5 business days.`,
    ),

  // Customer: issue resolved
  issueResolved: (phone, name, resolution) =>
    sendSMS(
      phone,
      `Hi ${name}, your BemsFarms complaint has been resolved. Decision: ${resolution}. Thank you for your patience. We're committed to serving you better!`,
    ),

  // Customer: replacement coming
  replacementScheduled: (phone, name, orderId) =>
    sendSMS(
      phone,
      `Hi ${name}, we're sorry about your order #${orderId}. A replacement delivery has been scheduled for you. Our team will contact you shortly to confirm the time.`,
    ),

  // Customer: 2nd delivery attempt reminder
  deliveryReminder: (phone, name, date) =>
    sendSMS(
      phone,
      `Hi ${name}, BemsFarms will attempt to redeliver your order on ${date}. Please ensure someone is available to receive it. Reply HELP to reach us.`,
    ),

  // Admin: low stock alert (send to admin phone)
  lowStockAlert: (adminPhone, productName, quantity) =>
    sendSMS(
      adminPhone,
      `[BemsFarms Alert] Low stock: "${productName}" has only ${quantity} units remaining. Please restock soon via the admin dashboard.`,
    ),
};

module.exports = { sendSMS, SMS, normalizePhone };
