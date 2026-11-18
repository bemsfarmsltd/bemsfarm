// server/src/routes/customer_chat.js
const express = require('express');
const router = express.Router();
const { protect, requireRole } = require('../middleware/authMiddleware');
const { getMessages, sendMessage, markRead, getCustomerReferenceOptions } = require('../services/supportService');

router.use(protect, requireRole('user'));

// GET customer chat messages
router.get('/messages', async (req, res, next) => {
  try {
    const data = await getMessages(req.user.id);
    await markRead(req.user.id, 'admin').catch(() => {});
    res.json(data);
  } catch (e) {
    next(e);
  }
});

// GET recent customer orders for @ / / autocomplete in chat
router.get('/reference-options', async (req, res, next) => {
  try {
    const data = await getCustomerReferenceOptions(req.user.id);
    res.json(data);
  } catch (e) {
    next(e);
  }
});

// POST send customer message (supports order_id and delivery_id reference)
router.post('/messages', async (req, res, next) => {
  try {
    const { message, order_id, delivery_id, enable_ai = true } = req.body;
    const result = await sendMessage(req.user.id, message, null, { order_id, delivery_id, enable_ai });
    res.status(201).json(result);
  } catch (e) {
    if (e.status) return res.status(e.status).json({ message: e.message });
    next(e);
  }
});

// POST mark as read
router.post('/read', async (req, res, next) => {
  try {
    await markRead(req.user.id, 'admin');
    res.json({ success: true });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
