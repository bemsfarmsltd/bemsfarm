const express = require("express");
const router = express.Router();
const pool = require("../db/pool");
const { sendSubscriptionWelcomeEmail, sendReferralUpgradeEmail } = require("../services/emailService");
const crypto = require("crypto");

function generateReferralCode() {
  return "BF-" + crypto.randomBytes(3).toString("hex").toUpperCase();
}

// ── SUBSCRIBE ─────────────────────────────────────────────────
router.post("/subscribe", async (req, res) => {
  console.log("📧 Subscribe hit. Body:", req.body);

  const { email, referred_by } = req.body;

  // Validate
  if (!email) {
    console.log("❌ No email provided");
    return res.status(400).json({ message: "Email is required" });
  }
  if (
    typeof email !== "string" ||
    !email.includes("@") ||
    !email.includes(".")
  ) {
    console.log("❌ Invalid email:", email);
    return res
      .status(400)
      .json({ message: "Please enter a valid email address" });
  }

  const cleanEmail = email.toLowerCase().trim();
  const cleanReferredBy = referred_by ? referred_by.trim() : null;

  try {
    // 1. Check if email already exists
    const checkRes = await pool.query(
      "SELECT id, email, referral_code, referral_count, discount_code FROM email_subscriptions WHERE email = $1",
      [cleanEmail]
    );

    if (checkRes.rows.length > 0) {
      const existing = checkRes.rows[0];
      console.log("ℹ️ Email already subscribed:", existing.email);
      return res.json({
        success: true,
        message: `Welcome back! You are already subscribed. Your discount code is ${existing.discount_code}.`,
        code: existing.discount_code,
        referral_code: existing.referral_code,
        referral_count: existing.referral_count,
      });
    }

    // 2. Generate a unique referral code
    let referralCode = generateReferralCode();
    let isUnique = false;
    let attempts = 0;

    // Safety loop to ensure uniqueness
    while (!isUnique && attempts < 5) {
      const codeCheck = await pool.query(
        "SELECT id FROM email_subscriptions WHERE referral_code = $1",
        [referralCode]
      );
      if (codeCheck.rows.length === 0) {
        isUnique = true;
      } else {
        referralCode = generateReferralCode();
        attempts++;
      }
    }

    // 3. Check if referred by someone valid
    let finalReferredBy = null;
    if (cleanReferredBy) {
      const referrerCheck = await pool.query(
        "SELECT referral_code FROM email_subscriptions WHERE referral_code = $1",
        [cleanReferredBy]
      );
      if (referrerCheck.rows.length > 0) {
        finalReferredBy = referrerCheck.rows[0].referral_code;
      }
    }

    // 4. Insert new subscription
    const insertRes = await pool.query(
      `INSERT INTO email_subscriptions (email, referral_code, referred_by, discount_code, is_active, subscribed_at)
       VALUES ($1, $2, $3, 'BEMS10', true, NOW())
       RETURNING id, email, referral_code, discount_code`,
      [cleanEmail, referralCode, finalReferredBy]
    );

    const newSub = insertRes.rows[0];
    console.log("✅ New subscriber registered:", newSub);

    // 5. Update referrer count & check threshold rewards
    if (finalReferredBy) {
      try {
        const referrerUpdate = await pool.query(
          `UPDATE email_subscriptions 
           SET referral_count = referral_count + 1 
           WHERE referral_code = $1 
           RETURNING email, referral_count`,
          [finalReferredBy]
        );

        if (referrerUpdate.rows.length > 0) {
          const referrer = referrerUpdate.rows[0];
          console.log(`📈 Referrer ${referrer.email} count updated to ${referrer.referral_count}`);

          // Trigger rewards upgrade
          let upgradeCode = null;
          if (referrer.referral_count === 3) {
            upgradeCode = "BEMS20";
          } else if (referrer.referral_count === 5) {
            upgradeCode = "BEMS30";
          }

          if (upgradeCode) {
            await pool.query(
              "UPDATE email_subscriptions SET discount_code = $1 WHERE referral_code = $2",
              [upgradeCode, finalReferredBy]
            );
            await sendReferralUpgradeEmail(referrer.email, referrer.referral_count, upgradeCode);
          }
        }
      } catch (refErr) {
        console.warn("⚠️ Referrer update failed:", refErr.message);
      }
    }

    // 6. Send welcome email to joiner
    try {
      await sendSubscriptionWelcomeEmail(cleanEmail, referralCode, "BEMS10");
    } catch (emailErr) {
      console.warn("⚠️ Welcome email sending failed:", emailErr.message);
    }

    res.json({
      success: true,
      message: "Subscribed! Use code BEMS10 for 10% off your next order.",
      code: "BEMS10",
      referral_code: referralCode,
      referral_count: 0
    });

  } catch (err) {
    console.error("❌ Subscribe DB error:", err.message);
    res.status(500).json({ message: "Database error: " + err.message });
  }
});

// ── PAYSTACK WEBHOOK ──────────────────────────────────────────
router.post(
  "/webhooks/paystack",
  async (req, res) => {
    console.log("🔔 Paystack webhook received");
    const crypto = require("crypto");
    const secret = process.env.PAYSTACK_SECRET || "MOCK_SECRET";
    const signature = req.headers["x-paystack-signature"];
    
    let event;
    let rawPayload;
    
    try {
      rawPayload = req.rawBody || Buffer.from(typeof req.body === "string" ? req.body : JSON.stringify(req.body));
      event = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
      if (req.rawBody) {
        event = JSON.parse(req.rawBody.toString("utf8"));
      }
    } catch (parseErr) {
      console.error("❌ Failed to parse Paystack webhook body:", parseErr.message);
      return res.status(400).json({ message: "Invalid JSON body" });
    }

    const hash = crypto
      .createHmac("sha512", secret)
      .update(rawPayload)
      .digest("hex");

    const isVerified = (hash === signature);
    const reference = event?.data?.reference || null;
    const eventType = event?.event || null;

    if (!isVerified) {
      console.warn("⚠️ Webhook signature mismatch!");
      // Save unverified audit log for safety
      try {
        await pool.query(
          `INSERT INTO payment_webhook_logs (event_type, payment_ref, payload, signature_verified, status, error_message)
           VALUES ($1, $2, $3, false, 'error', 'Signature verification failed')`,
          [eventType, reference, event]
        );
      } catch (dbErr) {
        console.error("Failed to write audit log:", dbErr.message);
      }
      return res.status(401).json({ message: "Signature verification failed" });
    }

    try {
      // 1. Idempotency Check: Do we already have this payment reconciled?
      const existingPay = await pool.query(
        "SELECT id, status FROM payments WHERE payment_ref = $1",
        [reference]
      );

      if (existingPay.rows.length > 0) {
        const payRecord = existingPay.rows[0];
        console.log(`ℹ️ Payment reference ${reference} already exists in DB with status: ${payRecord.status}`);
        
        // Log the duplicate event
        await pool.query(
          `INSERT INTO payment_webhook_logs (event_type, payment_ref, payload, signature_verified, status, error_message)
           VALUES ($1, $2, $3, true, 'ignored', 'Duplicate event received')`,
          [eventType, reference, event]
        );
        
        return res.status(200).json({ message: "Duplicate payment reference ignored" });
      }

      // 2. Process Successful, Failed, or Reversed transaction
      let status = "pending";
      if (eventType === "charge.success") {
        status = "successful";
      } else if (eventType === "charge.failed") {
        status = "failed";
      } else if (eventType?.includes("reversed") || eventType?.includes("refund")) {
        status = "reversed";
      }

      const amount = event?.data?.amount ? parseFloat(event.data.amount) / 100 : 0; // Paystack is in kobo
      const email = event?.data?.customer?.email || null;
      const metadata = event?.data?.metadata || null;
      const terminalId = event?.data?.pos_terminal_id || metadata?.pos_terminal_id || null;
      const paidAt = event?.data?.paid_at ? new Date(event.data.paid_at) : null;
      const paymentMethod = event?.data?.channel || event?.data?.payment_method || null;

      // 3. Find matching order in Bems Farms database
      const orderSearch = await pool.query(
        "SELECT id, total FROM orders WHERE payment_ref = $1 OR id::text = $2",
        [reference, String(metadata?.order_id || "")]
      );
      
      const linkedOrder = orderSearch.rows[0];
      const orderId = linkedOrder ? linkedOrder.id : null;

      // 4. Save validated payment details in DB
      await pool.query(
        `INSERT INTO payments (payment_ref, order_id, amount, status, payment_method, customer_email, pos_terminal_id, metadata, paid_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
         ON CONFLICT (payment_ref) 
         DO UPDATE SET status = EXCLUDED.status, updated_at = NOW()`,
        [reference, orderId, amount, status, paymentMethod, email, terminalId, event, paidAt]
      );

      // 5. Automatic Reconciliation actions
      if (status === "successful") {
        if (orderId) {
          // Reconcile order as 'confirmed'
          await pool.query(
            "UPDATE orders SET status = 'confirmed', payment_method = $1, payment_ref = $2, updated_at = NOW() WHERE id = $3",
            [paymentMethod || "transfer", reference, orderId]
          );
          console.log(`✅ Order ${orderId} successfully reconciled automatically with payment ref ${reference}`);

          // Fetch system user for ledger attribution
          let systemUserId = null;
          const systemUserRes = await pool.query(
            "SELECT id FROM users ORDER BY (CASE WHEN role='superadmin' THEN 1 WHEN role='manager' THEN 2 WHEN role='admin' THEN 3 ELSE 4 END) LIMIT 1"
          );
          if (systemUserRes.rows.length > 0) {
            systemUserId = systemUserRes.rows[0].id;
          }

          // Register in general accounting ledger (income table)
          await pool.query(
            `INSERT INTO income (reference, source, source_type, category, description, amount, payment_method, order_id, status, date, created_by)
             VALUES ($1, 'sales', 'online_order', 'POS/Online Sale', $2, $3, $4, $5, 'completed', CURRENT_DATE, $6)
             ON CONFLICT (reference) DO NOTHING`,
            [`INC-${reference}`, `Automated payment reconciliation for Order #${orderId}`, amount, paymentMethod || "transfer", String(orderId), systemUserId]
          );
        } else {
          console.log(`⚠️ Payment ref ${reference} received but no matching order ID was found in DB metadata.`);
        }
      } else if (status === "reversed") {
        if (orderId) {
          // Update order to cancelled/refunded
          await pool.query(
            "UPDATE orders SET status = 'cancelled', updated_at = NOW() WHERE id = $1",
            [orderId]
          );
          // Reverse corresponding ledger income entry
          await pool.query(
            "UPDATE income SET status = 'reversed' WHERE order_id = $1",
            [String(orderId)]
          );
          console.log(`🔄 Order ${orderId} reversed/cancelled following webhook refund notification.`);
        }
      }

      // 6. Audit Log: Log processed webhook event
      await pool.query(
        `INSERT INTO payment_webhook_logs (event_type, payment_ref, payload, signature_verified, status)
         VALUES ($1, $2, $3, true, 'processed')`,
        [eventType, reference, event]
      );

      res.status(200).json({ success: true, message: "Webhook processed successfully" });
    } catch (err) {
      console.error("❌ Webhook db processor failed:", err.message);
      // Log the crash audit event
      try {
        await pool.query(
          `INSERT INTO payment_webhook_logs (event_type, payment_ref, payload, signature_verified, status, error_message)
           VALUES ($1, $2, $3, $4, 'error', $5)`,
          [eventType, reference, event, true, err.message]
        );
      } catch (dbErr) {
        console.error("Failed to write audit log:", dbErr.message);
      }
      res.status(500).json({ message: "Webhook processing error: " + err.message });
    }
  }
);

module.exports = router;
