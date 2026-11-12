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
      order_completed: {
        title: '✅ Order #ORD-8821 Delivered & Completed',
        message: 'Order #ORD-8821 confirmed delivered by driver Emeka. Total: ₦28,500.',
        link: '/orders',
        data: { order_id: 8821, status: 'delivered', total: '₦28,500', courier: 'Emeka Driver' },
      },
      driver_assigned: {
        title: '🛵 Driver Auto-Mapped: Order #ORD-8821',
        message: 'Order #ORD-8821 automatically assigned to closest driver: Emeka Okoli (1.2 km away).',
        link: '/dispatch',
        data: { order_id: 8821, driver_name: 'Emeka Okoli', distance_km: 1.2 },
      },
      customer_login: {
        title: '👤 Customer Signed In: Amara Kalu',
        message: 'Amara Kalu (amara@example.com) signed in via web storefront.',
        link: '/customers',
        data: { customer_name: 'Amara Kalu', email: 'amara@example.com', channel: 'web storefront' },
      },
      out_of_stock: {
        title: '🚨 OUT OF STOCK: Fresh Organic Catfish',
        message: 'Fresh Organic Catfish is completely OUT OF STOCK (0 units remaining).',
        link: '/inventory/products',
        severity: 'critical',
        data: { product_name: 'Fresh Organic Catfish', stock_remaining: 0 },
      },
      product_created: {
        title: '📦 New Stock Uploaded: Bell Peppers',
        message: 'Staff uploaded new product "Bell Peppers" (SKU: VEG-04-1290, Stock: 80, Price: ₦1,200).',
        link: '/inventory/products',
        data: { product_name: 'Bell Peppers', sku: 'VEG-04-1290', stock: 80, price: '₦1,200' },
      },
      stock_adjustment: {
        title: '📊 Stock Adjustment: Fresh Tomatoes (-3 units)',
        message: 'Stock adjusted for "Fresh Tomatoes". Reason: Damaged during sorting. Stock: 45 → 42.',
        link: '/inventory/adjustment',
        data: { product_name: 'Fresh Tomatoes', before_qty: 45, after_qty: 42, reason: 'Damaged' },
      },
      stock_restock: {
        title: '🔄 Stock Received / Restocked: Cassava Flour (+50 units)',
        message: 'Intake completed: +50 units of "Cassava Flour" stocked into main warehouse.',
        link: '/inventory/stock-in',
        data: { product_name: 'Cassava Flour', quantity_received: 50, warehouse: 'Main Hub' },
      },
      product_price_updated: {
        title: '💰 Price Updated: Red Palm Oil (5L)',
        message: 'Henry Adeleke (superadmin) updated price for "Red Palm Oil (5L)" from ₦12,500 to ₦13,000.',
        link: '/inventory/products',
        severity: 'warning',
        data: { product_name: 'Red Palm Oil (5L)', old_price: 12500, new_price: 13000, changed_by: 'Henry Adeleke', role: 'superadmin' },
      },
      security_event: {
        title: '🔑 Staff Security: Password Changed',
        message: 'Staff account password was updated from IP 102.89.34.12.',
        link: '/settings/staff',
        severity: 'warning',
        data: { user: 'Cashier Umuahia', ip: '102.89.34.12' },
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
