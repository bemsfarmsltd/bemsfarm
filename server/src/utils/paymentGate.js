const { ensureDriverPosSchema, checkDriverCodPayment } = require("../services/moniepointPosService");

const COD_METHODS = new Set(["cod", "cash", "cash_on_delivery", "payondelivery"]);

/**
 * Verify an order has real confirmed payment (or confirmed COD cash/POS collection)
 * before allowing completion (`delivered`).
 */
async function assertOrderPaidForCompletion(client, orderId, body = {}, driverId = null) {
  await ensureDriverPosSchema();
  const res = await client.query(
    `SELECT id, order_ref, total, payment_method, payment_status, cod_awaiting_terminal_sn
     FROM orders
     WHERE id::text = $1 OR order_ref = $1
     LIMIT 1
     FOR UPDATE`,
    [String(orderId)]
  );
  const order = res.rows[0];
  if (!order) {
    return { ok: false, status: 404, body: { message: "Order not found" } };
  }

  if (order.payment_status === "paid") {
    return { ok: true, order, paidByCash: false };
  }

  const isCod = COD_METHODS.has(String(order.payment_method || "").toLowerCase());
  if (!isCod) {
    return {
      ok: false,
      status: 402,
      body: {
        message: "Order cannot be completed without confirmed payment.",
        requires_payment: true,
        payment_status: order.payment_status || "pending",
      },
    };
  }

  const collectionMode = String(body?.cod_collection_mode || "").toLowerCase();
  const cashConfirmed =
    body?.cash_collected === true ||
    body?.cash_collected === "true" ||
    collectionMode === "cash";

  if (cashConfirmed) {
    return { ok: true, order, paidByCash: true };
  }

  const posCheck = await checkDriverCodPayment(
    order.id,
    body?.terminal_sn || order.cod_awaiting_terminal_sn || "",
    driverId,
    client
  );
  if (posCheck.paid) {
    return { ok: true, order, paidByCash: false };
  }

  return {
    ok: false,
    status: 402,
    body: {
      message:
        "Payment required: confirm cash collected or complete payment on Moniepoint POS before marking delivered.",
      requires_payment: true,
      awaiting_pos: Boolean(order.cod_awaiting_terminal_sn || collectionMode === "pos"),
      terminal_sn: posCheck.terminal_sn || order.cod_awaiting_terminal_sn || null,
      amount: parseFloat(order.total),
    },
  };
}

module.exports = { assertOrderPaidForCompletion, COD_METHODS };
