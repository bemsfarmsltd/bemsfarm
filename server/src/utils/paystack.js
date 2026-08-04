// utils/paystack.js
// Server-side Paystack transaction verification. Never trust a client-supplied
// "payment succeeded" callback alone — always confirm with Paystack directly
// using the secret key before treating an order as paid.
const axios = require("axios");

async function verifyPaystackTransaction(reference) {
  const secret = process.env.PAYSTACK_SECRET;
  if (!secret) {
    throw new Error("Payment verification is not configured (missing PAYSTACK_SECRET)");
  }

  const { data } = await axios.get(
    `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
    { headers: { Authorization: `Bearer ${secret}` } },
  );

  if (!data?.status || !data?.data) {
    throw new Error(data?.message || "Paystack verification failed");
  }

  return data.data; // { status, amount (kobo), currency, reference, ... }
}

module.exports = { verifyPaystackTransaction };
