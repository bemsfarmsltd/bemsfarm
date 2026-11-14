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
  const paymentMethod = String(
    data.paymentMethod ||
    body.paymentMethod ||
    (data.sourceAccountName || data.senderName ? "TRANSFER" : "CARD")
  ).toUpperCase();

  // Extract transfer sender information if available
  const senderBank = String(
    data.sourceBankName ||
    data.senderBank ||
    data.originatorBank ||
    data.bankName ||
    body.sourceBankName ||
    body.senderBank ||
    ""
  ).trim();

  const senderAccount = String(
    data.sourceAccountNumber ||
    data.senderAccountNumber ||
    data.originatorAccountNumber ||
    body.sourceAccountNumber ||
    ""
  ).trim();

  const rawSenderName = String(
    data.sourceAccountName ||
    data.senderName ||
    data.originatorAccountName ||
    data.payerName ||
    customer.name ||
    data.customerName ||
    body.customerName ||
    body.sourceAccountName ||
    body.senderName ||
    ""
  ).trim();

  const customerName = rawSenderName
    ? senderBank
      ? `${rawSenderName} (${senderBank})`
      : rawSenderName
    : "POS Customer";

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
    senderBank: senderBank || null,
    senderAccount: senderAccount || null,
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
        customer_name: row.customer_name,
      };

      io.emit("pos:moniepoint_payment", eventPayload);
      if (row.terminal_id) {
        io.to(`terminal_${row.terminal_id}`).emit("terminal_payment", eventPayload);
      }
    }
  } catch (sockErr) {
    console.warn("[Moniepoint POS] Socket broadcast notice:", sockErr.message);
  }

  // Auto-complete any matching held POS order in the database
  // Even if the cashier's PC was shut down, sleeping, or offline when payment lands!
  try {
    if (norm.status === "successful") {
      await autoCompleteHeldOrderIfMatched(row, norm);
    }
  } catch (autoErr) {
    console.error("[Moniepoint POS] Auto-complete held order error:", autoErr.message);
  }

  return row;
}

/**
 * Automatically creates the order and deducts stock on the server when payment arrives for a held order,
 * ensuring complete persistence even if the cashier's computer is shut down or offline.
 */
async function autoCompleteHeldOrderIfMatched(txnRow, norm) {
  const terminalSn = norm.terminalId || process.env.MONIEPOINT_DEFAULT_TERMINAL_SN || "C66P008D08368495";
  const amount = parseFloat(norm.amount);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const findQuery = `
      SELECT * FROM pos_terminal_held_orders
      WHERE status = 'awaiting_payment'
        AND (terminal_sn = $1 OR terminal_sn IS NULL OR $1 = '')
        AND ABS(amount - $2) < 0.5
        AND created_at >= NOW() - INTERVAL '24 hours'
      ORDER BY created_at DESC
      LIMIT 1
      FOR UPDATE SKIP LOCKED;
    `;

    const heldRes = await client.query(findQuery, [terminalSn, amount]);
    if (heldRes.rows.length === 0) {
      await client.query("COMMIT");
      return null;
    }

    const held = heldRes.rows[0];
    const payload = held.order_payload || {};
    const cart = Array.isArray(payload.cart) ? payload.cart : [];
    const customer = payload.customer || null;
    const discountAmt = parseFloat(payload.discountAmt || 0);
    const vat = parseFloat(payload.vat || 0);
    const subtotal = parseFloat(payload.subtotal || amount);
    const total = parseFloat(payload.total || amount);
    const orderNote = payload.orderNote || "";

    // Generate atomic next POS-XXXX ref
    await client.query("SELECT pg_advisory_xact_lock(hashtext('pos_order_ref'))");
    const refRes = await client.query(
      `SELECT COALESCE(MAX(CAST(REGEXP_REPLACE(order_ref,'POS-','') AS INTEGER)),1000)+1 AS next
       FROM orders WHERE order_ref LIKE 'POS-%'`
    );
    const posRef = `POS-${refRes.rows[0].next}`;

    const custName = customer?.name || held.customer_name || norm.customerName || "Walk-in Customer";
    const custPhone = customer?.phone || null;

    // Create the order on server
    await client.query(
      `INSERT INTO orders
         (id, order_ref, payment_ref, customer_name, customer_phone, subtotal, discount_amount, tax_amount,
          total, payment_method, payment_status, status, source, notes, created_at, updated_at)
       VALUES ($1, $1, $2, $3, $4, $5, $6, $7, $8, 'Card / POS', 'paid', 'completed', 'Physical Store (POS - Moniepoint Auto)', $9, NOW(), NOW())`,
      [
        posRef,
        held.order_ref,
        custName,
        custPhone,
        subtotal,
        discountAmt,
        vat,
        total,
        orderNote ? `${orderNote} [Auto-confirmed Moniepoint POS]` : "[Auto-confirmed Moniepoint POS]",
      ]
    );

    // Insert order items & deduct inventory stock
    for (const item of cart) {
      const rawPid = item.id || item.product_id;
      const pId = rawPid && !isNaN(rawPid) && Number(rawPid) > 0 ? Number(rawPid) : null;
      const qty = Math.max(1, parseInt(item.qty || item.quantity) || 1);
      const price = parseFloat(item.price || item.unit_price) || 0;
      const multiplier = parseFloat(item.multiplier) || 1;
      const lineTotal = price * qty;
      const effectiveDeduction = qty * multiplier;
      const displayName = item.name || "Item";

      await client.query(
        `INSERT INTO order_items (order_id, product_id, product_name, quantity, price, unit_price, subtotal)
         VALUES ($1, $2, $3, $4, $5, $5, $6)`,
        [posRef, pId, displayName, qty, price, lineTotal]
      );

      if (pId) {
        await client.query(
          `UPDATE products
           SET stock = GREATEST(0, COALESCE(stock, 0) - $1),
               stock_quantity = GREATEST(0, COALESCE(stock_quantity, 0) - $1),
               updated_at = NOW()
           WHERE id = $2`,
          [effectiveDeduction, pId]
        );
      }
    }

    // Insert payments ledger record
    try {
      await client.query(
        `INSERT INTO payments (payment_ref, order_id, amount, status, payment_method, metadata, paid_at, created_at, updated_at)
         VALUES ($1, $2, $3, 'paid', 'Card / POS', $4, NOW(), NOW(), NOW())`,
        [
          `PAY-${posRef}`,
          posRef,
          total,
          JSON.stringify({
            pos_terminal: terminalSn,
            transaction_id: norm.transactionId,
            rrn: norm.rrn,
            sender_name: norm.customerName,
            sender_bank: norm.senderBank,
          }),
        ]
      );
    } catch (pmtErr) {
      console.warn("[Moniepoint POS Auto] Payment record notice:", pmtErr.message);
    }

    // Link pos_transactions row to this order
    await client.query(
      `UPDATE pos_transactions SET used_for_order_id = $1 WHERE id = $2`,
      [posRef, txnRow.id]
    );

    // Build complete receipt payload
    const receiptData = {
      orderId: posRef,
      heldRef: held.order_ref,
      customer: customer || { name: custName, phone: custPhone },
      cart,
      subtotal,
      discountAmt,
      vat,
      total,
      method: "Card / POS",
      cashReceived: total,
      change: 0,
      orderNote,
      paymentDetails: {
        transactionId: norm.transactionId,
        rrn: norm.rrn,
        cardType: norm.cardType,
        lastFour: norm.lastFour,
        paymentMethod: norm.paymentMethod,
        customerName: norm.customerName,
        senderBank: norm.senderBank,
      },
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      date: new Date().toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" }),
    };

    // Update pos_terminal_held_orders to paid_completed
    await client.query(
      `UPDATE pos_terminal_held_orders
       SET status = 'paid_completed',
           completed_order_id = $1,
           receipt_data = $2,
           completed_at = NOW(),
           acknowledged = FALSE
       WHERE id = $3`,
      [posRef, JSON.stringify(receiptData), held.id]
    );

    await client.query("COMMIT");
    console.log(`[Moniepoint POS Auto] Held order #${held.order_ref} automatically completed as ${posRef}!`);

    // Notify any active clients via Socket.io
    try {
      const io = getIO();
      if (io) {
        io.emit("pos:order_completed_offline", {
          order_ref: held.order_ref,
          completed_order_id: posRef,
          receipt_data: receiptData,
          transaction: {
            amount: norm.amount,
            customer_name: norm.customerName,
            sender_bank: norm.senderBank,
            payment_method: norm.paymentMethod,
            card_type: norm.cardType,
            last_four: norm.lastFour,
            transaction_id: norm.transactionId,
          },
        });
      }
    } catch (_) {}

    return { posRef, receiptData };
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("[Moniepoint POS Auto] Error completing held order on server:", err);
    return null;
  } finally {
    client.release();
  }
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

