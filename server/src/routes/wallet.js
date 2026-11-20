const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const { getOrCreateCustomerWallet, setCustomerWalletPin } = require("../services/customerWalletService");

router.use(protect);

// GET /api/wallet — get customer's wallet balance, dedicated Monnify account(s), and transactions
router.get("/", async (req, res, next) => {
  try {
    const data = await getOrCreateCustomerWallet(req.user.id);
    res.json({ success: true, ...data });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message });
    next(err);
  }
});

// POST /api/wallet/provision — manually trigger or retry Monnify reserved account creation (with optional BVN/NIN & phone)
router.post("/provision", async (req, res, next) => {
  try {
    const { bvn, nin, phone } = req.body || {};
    const pool = require("../db/pool");

    if (phone && String(phone).trim()) {
      const cleanPhone = String(phone).trim();
      await pool.query(
        "UPDATE users SET phone = $1 WHERE id = $2",
        [cleanPhone, req.user.id]
      );
    }

    const cleanBvn = bvn ? String(bvn).replace(/\D/g, "").trim() : "";
    const cleanNin = nin ? String(nin).replace(/\D/g, "").trim() : "";

    const data = await getOrCreateCustomerWallet(req.user.id, {
      forceProvision: Boolean(cleanBvn || cleanNin),
      bvn: cleanBvn || undefined,
      nin: cleanNin || undefined,
    });
    res.json({ success: true, ...data });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({
        message: err.message,
        ...(err.code ? { code: err.code } : {}),
      });
    }
    next(err);
  }
});

// POST /api/wallet/pin — set or update the customer's 4-digit wallet payment PIN
router.post("/pin", async (req, res, next) => {
  try {
    const { pin, current_pin, account_password } = req.body || {};
    const result = await setCustomerWalletPin(req.user.id, {
      pin,
      current_pin,
      account_password,
    });
    res.json({
      success: true,
      message: "Your 4-digit wallet Payment PIN has been saved.",
      ...result,
    });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message });
    next(err);
  }
});

module.exports = router;
