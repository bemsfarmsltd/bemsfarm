// utils/monnify.js
// Official Monnify API Client for Dedicated Virtual Accounts (Reserved Accounts),
// Wallet Balances, Bank Disbursements (Payouts), Account Validation, and Webhooks.
const axios = require("axios");
const crypto = require("crypto");

const MONNIFY_BASE_URL =
  process.env.MONNIFY_ENV === "live"
    ? "https://api.monnify.com"
    : "https://sandbox.monnify.com";

let cachedToken = null;
let tokenExpiresAt = 0;

/**
 * 1. Monnify Authentication API
 * POST /api/v1/auth/login
 */
async function getMonnifyToken() {
  if (cachedToken && Date.now() < tokenExpiresAt - 60000) {
    return cachedToken;
  }

  const apiKey = process.env.MONNIFY_API_KEY || "MK_TEST_CG14E4X8S6";
  const secretKey = process.env.MONNIFY_SECRET_KEY || "HGK0PJ30V49T5QA1JHX5M09CE74VGC22";
  if (!apiKey || !secretKey) {
    throw new Error("Monnify credentials are not configured (MONNIFY_API_KEY / MONNIFY_SECRET_KEY)");
  }

  const basic = Buffer.from(`${apiKey}:${secretKey}`).toString("base64");
  const { data } = await axios.post(
    `${MONNIFY_BASE_URL}/api/v1/auth/login`,
    {},
    { headers: { Authorization: `Basic ${basic}` } }
  );

  if (!data?.requestSuccessful || !data?.responseBody?.accessToken) {
    throw new Error("Monnify authentication failed: " + (data?.responseMessage || "unknown error"));
  }

  cachedToken = data.responseBody.accessToken;
  tokenExpiresAt = Date.now() + (data.responseBody.expiresIn || 3300) * 1000;
  return cachedToken;
}

/**
 * 2. Create Dedicated Virtual Account (Reserved Account) API
 * POST /api/v2/bank-transfer/reserved-accounts
 * Creates a unique permanent virtual account number (e.g. Wema Bank) on Monnify
 */
async function createMonnifyReservedAccount({
  accountReference,
  accountName,
  customerEmail,
  customerName,
  bvn,
  nin,
}) {
  const contractCode = process.env.MONNIFY_CONTRACT_CODE || "4711340709";
  const token = await getMonnifyToken();

  const payload = {
    accountReference: accountReference || `DRV_${Date.now()}`,
    accountName: accountName || `BEMS - ${customerName.toUpperCase()}`,
    currencyCode: "NGN",
    contractCode: contractCode,
    customerEmail: customerEmail || `driver_${Date.now()}@bemsfarms.com`,
    customerName: customerName || "Bems Driver",
    getAllAvailableBanks: true,
  };

  if (bvn) payload.bvn = bvn;
  if (nin) payload.nin = nin;

  const { data } = await axios.post(
    `${MONNIFY_BASE_URL}/api/v2/bank-transfer/reserved-accounts`,
    payload,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (!data?.requestSuccessful || !data?.responseBody) {
    throw new Error(data?.responseMessage || "Failed to create Monnify Reserved Account");
  }

  return data.responseBody;
}

/**
 * 3. Fetch Master Merchant Wallet Balance API
 * GET /api/v2/disbursements/wallet-balance?accountNumber=8559127267
 */
async function getMonnifyWalletBalance(accountNumber) {
  const acct = accountNumber || process.env.MONNIFY_WALLET_ACCOUNT_NUMBER || process.env.MONNIFY_WALLET_ACCOUNT || "8559127267";
  const token = await getMonnifyToken();

  const { data } = await axios.get(
    `${MONNIFY_BASE_URL}/api/v2/disbursements/wallet-balance?accountNumber=${encodeURIComponent(acct)}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (!data?.requestSuccessful || !data?.responseBody) {
    throw new Error(data?.responseMessage || "Failed to fetch Monnify wallet balance");
  }

  return data.responseBody;
}

/**
 * 4. Payout / Disbursement API (Single Bank Transfer)
 * POST /api/v2/disbursements/single
 * Transfers money from Bems Farms Monnify wallet to driver personal bank account
 */
async function initiateMonnifyDisbursement({
  amount,
  reference,
  narration,
  destinationBankCode,
  destinationAccountNumber,
  sourceAccountNumber,
}) {
  const token = await getMonnifyToken();
  const sourceAcct = sourceAccountNumber || process.env.MONNIFY_WALLET_ACCOUNT_NUMBER || process.env.MONNIFY_WALLET_ACCOUNT || "8559127267";

  const payload = {
    amount: parseFloat(amount),
    reference: reference || `MNFY_PAY_${Date.now()}`,
    narration: narration || "Bems Farms Driver Earnings Payout",
    destinationBankCode: destinationBankCode || "058",
    destinationAccountNumber: destinationAccountNumber,
    currency: "NGN",
    sourceAccountNumber: sourceAcct,
    async: false,
  };

  const { data } = await axios.post(
    `${MONNIFY_BASE_URL}/api/v2/disbursements/single`,
    payload,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (!data?.requestSuccessful || !data?.responseBody) {
    throw new Error(data?.responseMessage || "Monnify payout disbursement failed");
  }

  return data.responseBody;
}

/**
 * 5. Bank Account Name Resolution / Validation API
 * GET /api/v2/disbursements/account/validate
 */
async function validateMonnifyBankAccount(accountNumber, bankCode) {
  const token = await getMonnifyToken();

  const { data } = await axios.get(
    `${MONNIFY_BASE_URL}/api/v2/disbursements/account/validate?accountNumber=${encodeURIComponent(accountNumber)}&bankCode=${encodeURIComponent(bankCode || "058")}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (!data?.requestSuccessful || !data?.responseBody) {
    throw new Error(data?.responseMessage || "Bank account validation failed");
  }

  return data.responseBody;
}

/**
 * 6. Verify Transaction API
 * GET /api/v2/transactions/{transactionReference}
 */
async function verifyMonnifyTransaction(transactionReference) {
  const token = await getMonnifyToken();
  const { data } = await axios.get(
    `${MONNIFY_BASE_URL}/api/v2/transactions/${encodeURIComponent(transactionReference)}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (!data?.requestSuccessful || !data?.responseBody) {
    throw new Error("Monnify verification failed: " + (data?.responseMessage || "unknown error"));
  }

  return data.responseBody;
}

/**
 * 7. Webhook Signature Verification
 * HMAC-SHA512 with Client Secret Key
 */
function verifyMonnifyWebhookSignature(rawBody, signature) {
  const secretKey = process.env.MONNIFY_SECRET_KEY;
  if (!secretKey) return false;
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

module.exports = {
  MONNIFY_BASE_URL,
  getMonnifyToken,
  createMonnifyReservedAccount,
  getMonnifyWalletBalance,
  initiateMonnifyDisbursement,
  validateMonnifyBankAccount,
  verifyMonnifyTransaction,
  verifyMonnifyWebhookSignature,
};