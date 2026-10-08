// utils/monnify.js
// Official Monnify API Client for Dedicated Virtual Accounts (Reserved Accounts),
// Wallet Balances, Bank Disbursements (Payouts), Account Validation, and Webhooks.
const axios = require("axios");
const crypto = require("crypto");

function getMonnifyBaseUrl() {
  if (process.env.MONNIFY_BASE_URL) {
    return process.env.MONNIFY_BASE_URL.replace(/\/+$/, "");
  }
  const env = (process.env.MONNIFY_ENV || "").toLowerCase();
  const apiKey = (process.env.MONNIFY_API_KEY || "").trim();
  if (
    env === "live" ||
    env === "production" ||
    env === "prod" ||
    apiKey.startsWith("MK_PROD_") ||
    (process.env.NODE_ENV === "production" && env !== "sandbox" && env !== "test")
  ) {
    return "https://api.monnify.com";
  }
  return "https://sandbox.monnify.com";
}

const MONNIFY_BASE_URL = getMonnifyBaseUrl();

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

  const apiKey = process.env.MONNIFY_API_KEY;
  const secretKey = process.env.MONNIFY_SECRET_KEY;
  if (!apiKey || !secretKey) {
    throw new Error("Monnify credentials are not configured (MONNIFY_API_KEY / MONNIFY_SECRET_KEY)");
  }

  const baseUrl = getMonnifyBaseUrl();
  const basic = Buffer.from(`${apiKey}:${secretKey}`).toString("base64");
  const { data } = await axios.post(
    `${baseUrl}/api/v1/auth/login`,
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
  const contractCode = process.env.MONNIFY_CONTRACT_CODE;
  if (!contractCode) {
    throw new Error("Monnify contract code is not configured (MONNIFY_CONTRACT_CODE)");
  }
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

  const baseUrl = getMonnifyBaseUrl();
  const { data } = await axios.post(
    `${baseUrl}/api/v2/bank-transfer/reserved-accounts`,
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
 */
async function getMonnifyWalletBalance(accountNumber) {
  const acct = accountNumber || process.env.MONNIFY_WALLET_ACCOUNT_NUMBER || process.env.MONNIFY_WALLET_ACCOUNT || "8066038256";
  if (!acct) {
    throw new Error("Monnify wallet account number is not configured");
  }
  const token = await getMonnifyToken();
  const baseUrl = getMonnifyBaseUrl();

  const { data } = await axios.get(
    `${baseUrl}/api/v2/disbursements/wallet-balance?accountNumber=${encodeURIComponent(acct)}`,
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
  const sourceAcct = sourceAccountNumber || process.env.MONNIFY_WALLET_ACCOUNT_NUMBER || process.env.MONNIFY_WALLET_ACCOUNT;
  if (!sourceAcct) {
    throw new Error("Source wallet account number is not configured");
  }
  if (!destinationBankCode) {
    throw new Error("Destination bank code is required for disbursement");
  }
  if (!destinationAccountNumber) {
    throw new Error("Destination account number is required for disbursement");
  }

  const payload = {
    amount: parseFloat(amount),
    reference: reference || `MNFY_PAY_${Date.now()}`,
    narration: narration || "Bems Farms Driver Earnings Payout",
    destinationBankCode: destinationBankCode,
    destinationAccountNumber: destinationAccountNumber,
    currency: "NGN",
    sourceAccountNumber: sourceAcct,
    async: false,
  };

  const baseUrl = getMonnifyBaseUrl();
  const { data } = await axios.post(
    `${baseUrl}/api/v2/disbursements/single`,
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
  if (!accountNumber) {
    throw new Error("Account number is required for bank account validation");
  }
  if (!bankCode) {
    throw new Error("Bank code is required for bank account validation");
  }
  const token = await getMonnifyToken();
  const baseUrl = getMonnifyBaseUrl();

  const { data } = await axios.get(
    `${baseUrl}/api/v2/disbursements/account/validate?accountNumber=${encodeURIComponent(accountNumber)}&bankCode=${encodeURIComponent(bankCode)}`,
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
async function verifyMonnifyTransaction(reference) {
  const token = await getMonnifyToken();
  const baseUrl = getMonnifyBaseUrl();
  const cleanRef = String(reference || "").trim();

  // If reference looks like Monnify transaction reference (starts with MNFY or contains |)
  if (cleanRef.startsWith("MNFY") || cleanRef.includes("|")) {
    try {
      const { data } = await axios.get(
        `${baseUrl}/api/v2/transactions/${encodeURIComponent(cleanRef)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (data?.requestSuccessful && data?.responseBody) {
        return data.responseBody;
      }
    } catch (err) {
      if (err.response?.status !== 404) throw err;
    }
  }

  // Otherwise (or as fallback), query by merchant paymentReference (e.g. BF-...)
  try {
    const { data } = await axios.get(
      `${baseUrl}/api/v1/merchant/transactions/query?paymentReference=${encodeURIComponent(cleanRef)}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (data?.requestSuccessful && data?.responseBody) {
      return data.responseBody;
    }
  } catch (err) {
    // If querying by paymentReference also 404s, try v2 transactions endpoint before giving up
    if (!cleanRef.startsWith("MNFY") && !cleanRef.includes("|")) {
      const { data } = await axios.get(
        `${baseUrl}/api/v2/transactions/${encodeURIComponent(cleanRef)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (data?.requestSuccessful && data?.responseBody) {
        return data.responseBody;
      }
    }
    throw err;
  }

  throw new Error("Monnify verification failed: transaction not found");
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
  getMonnifyBaseUrl,
  MONNIFY_BASE_URL,
  getMonnifyToken,
  createMonnifyReservedAccount,
  getMonnifyWalletBalance,
  initiateMonnifyDisbursement,
  validateMonnifyBankAccount,
  verifyMonnifyTransaction,
  verifyMonnifyWebhookSignature,
};