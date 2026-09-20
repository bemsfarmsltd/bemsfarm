'use strict';
/**
 * Admin Notifications API Routes
 * ─────────────────────────────────────────────────────────────
 * GET  /api/admin/notifications           — list recent notifications + unread count
 * PATCH /api/admin/notifications/:id/read — mark single notification as read
 * POST /api/admin/notifications/mark-all-read — mark all notifications as read
 * POST /api/admin/notifications/test      — trigger a test push/email notification
 */

const express = require('express');
const router  = express.Router();
const { protect, requireRole } = require('../middleware/authMiddleware');
const {
  getRecentNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  notifyAdmin,
} = require('../services/notificationService');

router.use(protect);

router.get('/', async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 30, 100);
    const data = await getRecentNotifications(limit);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.patch('/:id/read', async (req, res, next) => {
  try {
    await markNotificationRead(req.params.id);
    res.json({ success: true, message: 'Notification marked as read' });
  } catch (err) {
    next(err);
  }
});

router.post('/mark-all-read', async (req, res, next) => {
  try {
    await markAllNotificationsRead();
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (err) {
    next(err);
  }
});

router.post('/test', requireRole('superadmin', 'manager'), async (req, res, next) => {
  try {
    const { type = 'order_placed' } = req.body;
    const testPayloads = {
      customer_register: {
        title: '🎉 New Customer Registered',
        message: 'Amara Kalu created a new account in Umuahia with verified GPS coordinates.',
        link: '/customers',
        data: { customer_name: 'Amara Kalu', email: 'amara@example.com', location: 'Umuahia, Abia' },
      },
      order_placed: {
        title: '🛍️ New Online Order #ORD-8821',
        message: 'Order #ORD-8821 placed by Chinedu Okafor totaling ₦28,500 with 4 items.',
        link: '/orders',
        data: { order_id: 8821, total: '₦28,500', items: 4, customer: 'Chinedu Okafor' },
      },
      pos_sale: {
        title: '💳 Walk-in POS Sale Completed',
        message: 'Walk-in sale of ₦14,200 completed by Cashier on POS Terminal 1.',
        link: '/pos',
        data: { terminal: 'POS-01', amount: '₦14,200', payment_method: 'Card / POS' },
      },
      order_delivery: {
        title: '🛵 Driver Dispatched for Order #ORD-8821',
        message: 'Courier Emeka has picked up the package and is en route to customer location.',
        link: '/deliveries/map',
        data: { order_id: 8821, driver_name: 'Emeka Driver', eta: '25 mins' },
      },
      support_message: {
        title: '💬 Live Customer Support Message',
        message: 'Ngozi sent a message: "Hello, please is fresh catfish available today?"',
        link: '/god-eye',
        data: { customer_name: 'Ngozi', message: 'Hello, please is fresh catfish available today?' },
      },
      ai_chat: {
        title: '🤖 Chef Bems AI Recommendation',
        message: 'Customer asked Chef Bems for a 4-person goat meat peppersoup recipe.',
        link: '/chef-bems/conversations',
        data: { query: 'Goat meat peppersoup recipe for 4 persons' },
      },
      low_stock: {
        title: '⚠️ Low Stock Alert: Fresh Farm Eggs',
        message: 'Fresh Farm Eggs inventory has dropped to 4 crates (threshold: 10 crates).',
        link: '/inventory/alerts',
        data: { product: 'Fresh Farm Eggs (Large)', current_stock: '4 crates', threshold: '10' },
      },
      batch_expiry: {
        title: '⏰ Produce Lot Expiring: Batch #LOT-2026-081',
        message: 'Batch #LOT-2026-081 (Organic Bell Peppers) will expire in 4 days.',
        link: '/inventory/batches',
        data: { batch_no: 'LOT-2026-081', product: 'Organic Bell Peppers', days_left: 4 },
      },
      refund_request: {
        title: '↩️ Return Request Submitted',
        message: 'Refund request of ₦6,500 submitted for Order #ORD-8750.',
        link: '/orders/refunds',
        data: { order_id: 8750, amount: '₦6,500', reason: 'Damaged packaging on transit' },
      },
      system_error: {
        title: '🔴 Critical System Error Captured',
        message: 'Payment gateway timeout during webhook verification [HTTP 504]. Auto-recovered.',
        link: '/god-eye',
        severity: 'critical',
        data: { error: 'Gateway timeout', service: 'Paystack Webhook' },
      },
    };

    const payload = testPayloads[type] || testPayloads.order_placed;

    const result = await notifyAdmin({
      type,
      title: `[TEST] ${payload.title}`,
      message: payload.message,
      link: payload.link,
      severity: payload.severity || 'info',
      data: payload.data,
      actor: { id: req.user.id, name: req.user.name, role: req.user.role },
    });

    res.json({
      success: true,
      message: `Test notification sent for event [${type}]!`,
      result,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
