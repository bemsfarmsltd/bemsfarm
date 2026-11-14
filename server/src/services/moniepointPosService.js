// server/src/services/moniepointPosService.js
// Moniepoint POS Terminal Integration Service for Bems Farms

const crypto = require("crypto");
const pool = require("../db/pool");
const { getIO } = require("./socketService");

/**
 * Verify incoming webhook signature from Moniepoint
 */
function verifyWebhookSignature(rawPayload, signatureHeader) {
  const secretKey =
    process.env.MONIEPOINT_WEBHOOK_SECRET?.trim() ||
    process.env.MONIEPOINT_POS_API_KEY?.trim();

  if (!secretKey) {
    console.warn("⚠️ MONIEPOINT_WEBHOOK_SECRET not configured. Webhook verification skipped in dev.");
    return true;
  }

  if (!signatureHeader) {
    console.warn("⚠️ Missing signature header on Moniepoint webhook.");
    return process.env.NODE_ENV !== "production";
  }

  const candidateKeys = [
    process.env.MONIEPOINT_WEBHOOK_SECRET?.trim(),
    process.env.MONIEPOINT_POS_API_KEY?.trim(),
  ].filter(Boolean);

  const rawString = Buffer.isBuffer(rawPayload) ? rawPayload.toString("utf8") : String(rawPayload);

  for (const key of candidateKeys) {
    try {
      // 1. Try SHA512
      const hmac512 = crypto.createHmac("sha512", key).update(rawString).digest("hex");
      if (
        Buffer.from(hmac512).length === Buffer.from(signatureHeader).length &&
        crypto.timingSafeEqual(Buffer.from(hmac512), Buffer.from(signatureHeader))
      ) {
        return true;
      }

      // 2. Try SHA256
      const hmac256 = crypto.createHmac("sha256", key).update(rawString).digest("hex");
      if (
        Buffer.from(hmac256).length === Buffer.from(signatureHeader).length &&
        crypto.timingSafeEqual(Buffer.from(hmac256), Buffer.from(signatureHeader))
      ) {
        return true;
      }
    } catch (err) {
      // Continue to next candidate key
    }
  }

  return false;
}

/**
 * Normalize and extract essential fields from incoming Moniepoint POS webhook payload
 */
function normalizePayload(body) {
  const data = body.data || body.eventData || body;
  const terminalInfo = data.terminalInformation || body.terminalInformation || {};
  const cardDetails = data.cardDetails || body.cardDetails || {};
  const customer = data.customer || body.customer || {};

  const terminalId = String(
    terminalInfo.serialNumber ||
    terminalInfo.terminalId ||
    data.terminalId ||
    data.terminalSerialNumber ||
    data.serialNumber ||
    body.terminalId ||
    body.terminalSerialNumber ||
    body.serialNumber ||
    process.env.MONIEPOINT_DEFAULT_TERMINAL_SN ||
    ""
  ).trim();

  const amount = parseFloat(
    data.amountPaid ||
    data.amount ||
    body.amountPaid ||
    body.amount ||
    0
  );

  const transactionId = String(
    data.transactionReference ||
    data.reference ||
    data.paymentReference ||
    body.transactionReference ||
    body.reference ||
    `MP-POS-${Date.now()}`
  ).trim();

  const rrn = String(data.rrn || data.retrievalReferenceNumber || body.rrn || "").trim();

  const lastFour = String(
    cardDetails.last4Digits ||
    cardDetails.last4 ||
    data.lastFour ||
    data.last4 ||
    (transactionId.length >= 4 ? transactionId.slice(-4) : "0000")
  ).slice(-4);

  const cardType = String(cardDetails.cardType || data.cardType || "CARD").toUpperCase();
  const paymentMethod = String(data.paymentMethod || body.paymentMethod || "CARD").toUpperCase();
  const customerName = String(customer.name || data.customerName || body.customerName || "POS Customer").trim();
  const status = String(data.status || body.status || body.eventType || "successful").toLowerCase();

  return {
    terminalId,
    amount,
    transactionId,
    rrn: rrn || null,
    lastFour,
    cardType,
    paymentMethod,
    customerName,
    status: status.includes("success") || status.includes("paid") ? "successful" : status,
    rawPayload: body,
  };
}

/**
 * Ingest and record Moniepoint POS transaction, then emit real-time Socket.io event
 */
async function recordMoniepointTransaction(payload) {
  const norm = normalizePayload(payload);

  const query = `
    INSERT INTO pos_transactions (
      transaction_id,
      last_four,
      amount,
      payment_method,
      payment_time,
      customer_name,
      terminal_id,
      rrn,
      card_type,
      raw_payload,
      status
    )
    VALUES ($1, $2, $3, $4, NOW(), $5, $6, $7, $8, $9, $10)
    ON CONFLICT (transaction_id) DO UPDATE SET
      status = EXCLUDED.status,
      raw_payload = EXCLUDED.raw_payload
    RETURNING *;
  `;

  const values = [
    norm.transactionId,
    norm.lastFour,
    norm.amount,
    norm.paymentMethod,
    norm.customerName,
    norm.terminalId,
    norm.rrn,
    norm.cardType,
    JSON.stringify(norm.rawPayload),
    norm.status,
  ];

  const result = await pool.query(query, values);
  const row = result.rows[0];

  console.log(`[Moniepoint POS] Recorded payment ₦${norm.amount} on terminal ${norm.terminalId} (Ref: ${norm.transactionId})`);

  // Broadcast to all connected POS screens via Socket.io
  try {
    const io = getIO();
    if (io) {
      const eventPayload = {
        transaction_id: row.transaction_id,
        terminal_id: row.terminal_id,
        amount: parseFloat(row.amount),
        last_four: row.last_four,
        card_type: row.card_type,
        payment_method: row.payment_method,
        status: row.status,
        payment_time: row.payment_time,
      };

      io.emit("pos:moniepoint_payment", eventPayload);
      if (row.terminal_id) {
        io.to(`terminal_${row.terminal_id}`).emit("terminal_payment", eventPayload);
      }
    }
  } catch (sockErr) {
    console.warn("[Moniepoint POS] Socket broadcast notice:", sockErr.message);
  }

  return row;
}

/**
 * Check if a payment for given terminal and amount arrived recently (last 3 minutes)
 */
async function checkPendingTerminalPayment(terminalId, amount) {
  const query = `
    SELECT * FROM pos_transactions
    WHERE (terminal_id = $1 OR terminal_id IS NULL OR $1 = '')
      AND used_for_order_id IS NULL
      AND status = 'successful'
      AND ABS(amount - $2) < 0.5
      AND payment_time >= NOW() - INTERVAL '3 minutes'
    ORDER BY payment_time DESC
    LIMIT 1;
  `;

  const result = await pool.query(query, [terminalId || "", parseFloat(amount)]);
  return result.rows[0] || null;
}

module.exports = {
  verifyWebhookSignature,
  normalizePayload,
  recordMoniepointTransaction,
  checkPendingTerminalPayment,
};

