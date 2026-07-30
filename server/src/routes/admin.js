// Legacy admin route — only the paths not covered by a dedicated
// /api/admin/* router (products_admin.js, orders_admin.js, etc).
const express = require("express");
const router = express.Router();
const { protect, adminOnly } = require("../middleware/authMiddleware");
const { getStats, getSubscribers } = require("../controllers/adminController");
const {
  getAllReturns,
  updateReturn,
} = require("../controllers/returnsController");

router.get("/stats", protect, adminOnly, getStats);
router.get("/subscribers", protect, adminOnly, getSubscribers);
router.get("/returns", protect, adminOnly, getAllReturns);
router.patch("/returns/:id", protect, adminOnly, updateReturn);

module.exports = router;
