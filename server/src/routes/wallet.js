const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const { getOrCreateCustomerWallet } = require("../services/customerWalletService");

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

// POST /api/wallet/provision — manually trigger or retry Monnify reserved account creation (with optional BVN/NIN)
router.post("/provision", async (req, res, next) => {
  try {
    const { bvn, nin } = req.body || {};
    const data = await getOrCreateCustomerWallet(req.user.id, {
      forceProvision: true,
      bvn: bvn ? String(bvn).trim() : undefined,
      nin: nin ? String(nin).trim() : undefined,
    });
    res.json({ success: true, ...data });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message });
    next(err);
  }
});

module.exports = router;
