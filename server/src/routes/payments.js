// server/src/routes/payments.js
// Customer & Mobile Payment API for Monnify Hosted Checkout & Transaction Verification

const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const pool = require("../db/pool");
const { initiateMonnifyTransaction, verifyMonnifyTransaction } = require("../utils/monnify");

const JWT_SECRET = process.env.JWT_SECRET;

// Optional authentication middleware: attaches req.user if valid token present
async function optionalAuth(req, res, next) {
  try {
    let token = null;
    if (req.headers.authorization?.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    } else if (req.cookies?.token) {
      token = req.cookies.token;
    }

    if (token && JWT_SECRET) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const { rows } = await pool.query(
          "SELECT id, full_name as name, email, phone, role FROM users WHERE id = $1 AND is_active = true",
          [decoded.id]
        );
        if (rows[0]) {
          req.user = rows[0];
        }
      } catch (jwtErr) {
        // Token invalid or expired — continue without user
      }
    }
  } catch (err) {
    // ignore
  }
  next();
}

/**
 * POST /api/payments/initialize
 * 
 * Server-side payment initialization for Monnify hosted checkout.
 * Called by Mobile App (React Native, Flutter, Swift, Kotlin) or Web Frontend.
 * 
 * Supports two calling conventions:
 * 1. Passing checkout_intent_id (recommended if items were already pre-validated):
 *    { "checkout_intent_id": "...", "redirect_url": "..." }
 * 
 * 2. Passing direct parameters:
 *    { 
 *      "amount": 5000, 
 *      "customerEmail": "user@example.com", 
 *      "customerName": "Jane Doe", 
 *      "customerPhone": "08012345678", 
 *      "paymentReference": "BF_...", 
 *      "redirect_url": "..."
 *    }
 */
router.post("/initialize", optionalAuth, async (req, res, next) => {
  try {
    let {
      checkout_intent_id,
      amount,
      customerEmail,
      customerName,
      customerPhoneNumber,
      customerPhone,
      paymentReference,
      payment_ref,
      paymentDescription,
      redirect_url,
      redirectUrl,
      paymentMethods,
      metadata,
    } = req.body;

    let targetAmount = amount ? parseFloat(amount) : null;
    let targetEmail = customerEmail || req.user?.email || null;
    let targetName = customerName || req.user?.name || "Bems Customer";
    let targetPhone = customerPhoneNumber || customerPhone || req.user?.phone || "";
    let targetRef = paymentReference || payment_ref || null;
    let targetMeta = { ...(metadata || {}) };

    // Mode 1: Resolve from existing checkout intent
    if (checkout_intent_id) {
      const intentRes = await pool.query(
        "SELECT * FROM checkout_intents WHERE id = $1",
        [checkout_intent_id]
      );

      if (!intentRes.rows.length) {
        return res.status(404).json({ message: "Checkout intent not found" });
      }

      const intent = intentRes.rows[0];
      if (intent.status !== "pending" || new Date(intent.expires_at) <= new Date()) {
        return res.status(400).json({ message: "Checkout intent has expired or has already been used" });
      }

      targetAmount = parseFloat(intent.total);
      targetRef = targetRef || intent.payment_ref;
      targetMeta.checkout_intent_id = intent.id;
      targetMeta.user_id = intent.user_id;

      if (!targetEmail) {
        const userRes = await pool.query(
          "SELECT email, full_name, phone FROM users WHERE id = $1",
          [intent.user_id]
        );
        if (userRes.rows[0]) {
          targetEmail = userRes.rows[0].email;
          targetName = targetName === "Bems Customer" ? userRes.rows[0].full_name || targetName : targetName;
          targetPhone = targetPhone || userRes.rows[0].phone || "";
        }
      }
    }

    if (!targetAmount || isNaN(targetAmount) || targetAmount <= 0) {
      return res.status(400).json({
        message: "Invalid or missing amount. Please provide a positive amount or a valid checkout_intent_id.",
      });
    }

    if (!targetEmail) {
      return res.status(400).json({
        message: "Customer email is required to initialize payment.",
      });
    }

    if (!targetRef) {
      targetRef = `BF_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
    }

    // Call Monnify Server-to-Server Init-Transaction API
    const monnifyRes = await initiateMonnifyTransaction({
      amount: targetAmount,
      customerEmail: targetEmail,
      customerName: targetName,
      customerPhoneNumber: targetPhone,
      paymentReference: targetRef,
      paymentDescription: paymentDescription || "Bems Farms Order Payment",
      redirectUrl: redirect_url || redirectUrl,
      paymentMethods: paymentMethods || ["CARD", "ACCOUNT_TRANSFER", "USSD"],
      metadata: targetMeta,
    });

    // If intent exists and reference was updated, sync it
    if (checkout_intent_id) {
      await pool.query(
        "UPDATE checkout_intents SET payment_ref = $1, updated_at = NOW() WHERE id = $2",
        [targetRef, checkout_intent_id]
      ).catch((e) => console.warn("Failed to sync payment_ref on intent:", e.message));
    }

    return res.status(200).json({
      requestSuccessful: true,
      responseMessage: "Payment initialized successfully",
      responseCode: "0",
      responseBody: {
        checkoutUrl: monnifyRes.checkoutUrl,
        transactionReference: monnifyRes.transactionReference,
        paymentReference: monnifyRes.paymentReference || targetRef,
        amount: targetAmount,
        apiKey: monnifyRes.apiKey,
        redirectUrl: monnifyRes.redirectUrl,
        enabledPaymentMethods: monnifyRes.enabledPaymentMethod || ["CARD", "ACCOUNT_TRANSFER", "USSD"],
      },
      // Convenience top-level fields for easy consumption in React Native / Flutter
      checkoutUrl: monnifyRes.checkoutUrl,
      transactionReference: monnifyRes.transactionReference,
      paymentReference: monnifyRes.paymentReference || targetRef,
      amount: targetAmount,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/payments/verify/:reference
 * 
 * Verifies any payment reference or transaction reference against Monnify.
 * Can be called by Mobile or Frontend before/after finalizing orders.
 */
router.get("/verify/:reference", async (req, res, next) => {
  try {
    const { reference } = req.params;
    if (!reference || !reference.trim()) {
      return res.status(400).json({ message: "Payment reference is required" });
    }

    const verification = await verifyMonnifyTransaction(reference.trim());
    const isPaid = verification?.paymentStatus === "PAID";

    return res.status(200).json({
      success: true,
      isPaid,
      paymentStatus: verification?.paymentStatus || "UNKNOWN",
      amount: verification?.amount,
      amountPaid: verification?.amountPaid,
      transactionReference: verification?.transactionReference,
      paymentReference: verification?.paymentReference,
      paymentMethod: verification?.paymentMethod,
      paidOn: verification?.paidOn,
      customer: verification?.customer,
      responseBody: verification,
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      isPaid: false,
      message: err.message || "Payment verification failed",
    });
  }
});

module.exports = router;

