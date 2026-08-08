// utils/monnify.js
// Server-side Monnify integration — replaces Paystack as the payment
// gateway. Built against Monnify's publicly documented API shape
// (https://developers.monnify.com), but NOT yet exercised against a real
// sandbox — verify the exact field names/endpoints against the live
// Monnify dashboard once real MONNIFY_API_KEY/MONNIFY_SECRET_KEY are
// available, the same way utils/paystack.js was verified against Paystack.
//
// Key difference from Paystack worth remembering: Paystack amounts are in
// kobo (amount * 100). Monnify amounts are plain Naira decimals — do NOT
// multiply/divide by 100 anywhere in this file or its callers.
const axios = require("axios");
const crypto = require("crypto");

const MONNIFY_BASE_URL =
  process.env.MONNIFY_ENV === "live"
    ? "https://api.monnify.com"
    : "https://sandbox.monnify.com";

let cachedToken = null;
let tokenExpiresAt = 0;

async function getMonnifyToken() {
  if (cachedToken && Date.now() < tokenExpiresAt - 60000) {
    return cachedToken;
  }

  const apiKey = process.env.MONNIFY_API_KEY;
  const secretKey = process.env.MONNIFY_SECRET_KEY;
  if (!apiKey || !secretKey) {
    throw new Error(
      "Monnify credentials are not configured (MONNIFY_API_KEY / MONNIFY_SECRET_KEY)",
    );
  }

  const basic = Buffer.from(`${apiKey}:${secretKey}`).toString("base64");
  const { data } = await axios.post(
    `${MONNIFY_BASE_URL}/api/v1/auth/login`,
    {},
    { headers: { Authorization: `Basic ${basic}` } },
  );

  if (!data?.requestSuccessful || !data?.responseBody?.accessToken) {
    throw new Error(
      "Monnify authentication failed: " + (data?.responseMessage || "unknown error"),
    );
  }

  cachedToken = data.responseBody.accessToken;
  // Token is valid ~1hr; refresh a minute early to be safe.
  tokenExpiresAt = Date.now() + (data.responseBody.expiresIn || 3300) * 1000;
  return cachedToken;
}

// Verify a transaction directly with Monnify — never trust a client-supplied
// "payment succeeded" callback alone.
async function verifyMonnifyTransaction(transactionReference) {
  const token = await getMonnifyToken();
  const { data } = await axios.get(
    `${MONNIFY_BASE_URL}/api/v2/transactions/${encodeURIComponent(transactionReference)}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );

  if (!data?.requestSuccessful || !data?.responseBody) {
    throw new Error(
      "Monnify verification failed: " + (data?.responseMessage || "unknown error"),
    );
  }

  return data.responseBody; // { paymentStatus, amountPaid, transactionReference, paymentReference, currencyCode, ... }
}

// Monnify signs webhook payloads with HMAC-SHA512 over the raw request
// body, keyed with the Client Secret Key, sent in the `monnify-signature`
// header. Fails closed if the secret isn't configured — mirrors the
// Paystack webhook fix (no MOCK_SECRET fallback).
function verifyMonnifyWebhookSignature(rawBody, signature) {
  const secretKey = process.env.MONNIFY_SECRET_KEY;
  if (!secretKey || !signature) return false;
  try {
    const expected = crypto.createHmac("sha512", secretKey).update(rawBody).digest("hex");
    const expectedBuf = Buffer.from(expected, "hex");
    const signatureBuf = Buffer.from(signature, "hex");
    if (expectedBuf.length !== signatureBuf.length) return false;
    return crypto.timingSafeEqual(expectedBuf, signatureBuf);
  } catch {
    return false;
  }
}

// Initiate a refund for a completed transaction. Endpoint path is Monnify's
// commonly-documented refund route — verify against the live API Reference
// once real credentials are available (same caveat as the rest of this file).
async function initiateMonnifyRefund({ transactionReference, refundReference, refundAmount, refundReason, customerNote }) {
  const token = await getMonnifyToken();
  const { data } = await axios.post(
    `${MONNIFY_BASE_URL}/api/v1/refunds/initiate-refund`,
    {
      transactionReference,
      refundReference,
      refundAmount,
      refundReason: (refundReason || "Customer refund").slice(0, 64),
      customerNote: (customerNote || "BemsFarms refund").slice(0, 16),
    },
    { headers: { Authorization: `Bearer ${token}` } },
  );

  if (!data?.requestSuccessful || !data?.responseBody) {
    throw new Error("Monnify refund failed: " + (data?.responseMessage || "unknown error"));
  }

  return data.responseBody; // { refundReference, refundStatus, refundType, ... }
}

module.exports = {
  MONNIFY_BASE_URL,
  getMonnifyToken,
  verifyMonnifyTransaction,
  verifyMonnifyWebhookSignature,
  initiateMonnifyRefund,
};