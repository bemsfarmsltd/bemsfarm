'use strict';
/**
 * System-Wide Notification Engine for Bems Farms
 * ─────────────────────────────────────────────────────────────
 * Dispatches Push / In-App topbar alerts, Email alerts, and God Eye records
 * based on the granular toggle matrix configured in System Settings.
 */

const pool = require('../db/pool');
const { sendAdminAlertEmail } = require('./emailService');
const { recordAudit } = require('./auditService');

let tableReady = false;

async function ensureNotificationTable() {
  if (tableReady) return;
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS system_notifications (
        id SERIAL PRIMARY KEY,
        type VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        severity VARCHAR(20) DEFAULT 'info',
        link VARCHAR(255),
        data JSONB DEFAULT '{}'::jsonb,
        actor_id INT,
        actor_name VARCHAR(150),
        is_read BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_sys_notif_created ON system_notifications(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_sys_notif_read ON system_notifications(is_read);
    `);

    // If completely empty, backfill with recent real store activity
    const countCheck = await pool.query('SELECT COUNT(*) FROM system_notifications');
    if (parseInt(countCheck.rows[0].count) === 0) {
      // 1. Recent Orders
      await pool.query(`
        INSERT INTO system_notifications (type, title, message, severity, link, data, actor_name, is_read, created_at)
        SELECT
          'order_placed',
          '🛍️ Order #' || o.id || ' Placed',
          'Order #' || o.id || ' placed by ' || COALESCE(u.name, 'Customer') || ' totaling ₦' || TO_CHAR(o.total, 'FM999,999,999') || '.',
          'info',
          '/orders',
          jsonb_build_object('order_id', o.id, 'total', o.total, 'status', o.status),
          COALESCE(u.name, 'Customer'),
          false,
          o.created_at
        FROM orders o
        LEFT JOIN users u ON o.user_id = u.id
        ORDER BY o.created_at DESC LIMIT 5
      `).catch(() => {});

      // 2. Low Stock Warnings
      await pool.query(`
        INSERT INTO system_notifications (type, title, message, severity, link, data, actor_name, is_read, created_at)
        SELECT
          'low_stock',
          '⚠️ Low Stock: ' || p.name,
          p.name || ' is low on stock (' || p.stock || ' left, threshold: ' || COALESCE(p.low_stock_threshold, 10) || ').',
          'warning',
          '/inventory/alerts',
          jsonb_build_object('product_id', p.id, 'stock', p.stock, 'threshold', p.low_stock_threshold),
          'System Engine',
          false,
          NOW()
        FROM products p
        WHERE p.stock > 0 AND p.stock <= COALESCE(p.low_stock_threshold, 10) AND p.status = 'active'
        ORDER BY p.stock ASC LIMIT 3
      `).catch(() => {});

      // 3. Recent Customers
      await pool.query(`
        INSERT INTO system_notifications (type, title, message, severity, link, data, actor_name, is_read, created_at)
        SELECT
          'customer_register',
          '🎉 Customer Registered: ' || u.name,
          u.name || ' (' || u.email || ') joined Bems Farms as a registered customer.',
          'info',
          '/customers/' || u.id,
          jsonb_build_object('user_id', u.id, 'email', u.email),
          u.name,
          false,
          u.created_at
        FROM users u
        WHERE u.role = 'customer' OR u.role = 'user'
        ORDER BY u.created_at DESC LIMIT 3
      `).catch(() => {});
    }

    tableReady = true;
  } catch (err) {
    console.error('Error ensuring system_notifications table:', err.message);
  }
}

async function getNotificationSettings() {
  try {
    const res = await pool.query("SELECT key, value FROM settings WHERE group_name='notifications' OR group_name='general'");
    const cfg = {};
    res.rows.forEach(r => { cfg[r.key] = r.value; });
    return cfg;
  } catch {
    return {};
  }
}

/**
 * Main Dispatcher: notifyAdmin
 * @param {Object} opts
 * @param {string} opts.type - e.g. 'customer_register', 'order_placed', 'pos_sale', 'order_delivery', 'support_message', 'ai_chat', 'low_stock', 'batch_expiry', 'refund_request', 'system_error', 'security_event'
 * @param {string} opts.title
 * @param {string} opts.message
 * @param {string} [opts.link] - URL to navigate in admin
 * @param {string} [opts.severity] - 'info' | 'warning' | 'critical'
 * @param {Object} [opts.data] - Contextual metadata
 * @param {Object} [opts.actor] - { id, name, role }
 */
async function notifyAdmin({ type, title, message, link = '', severity = 'info', data = {}, actor = null }) {
  try {
    await ensureNotificationTable();
    const settings = await getNotificationSettings();

    // 1. Check Push / In-App preference (defaults to true if not explicitly 'false')
    const pushGlobal = settings['notif_push_enabled'] !== 'false';
    const pushSpecific = settings[`push_notif_${type}`] !== 'false';
    const isPushAllowed = pushGlobal && pushSpecific;

    let savedNotif = null;
    if (isPushAllowed) {
      const insRes = await pool.query(
        `INSERT INTO system_notifications
           (type, title, message, severity, link, data, actor_id, actor_name, is_read, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, false, NOW())
         RETURNING *`,
        [
          type,
          title,
          message,
          severity,
          link,
          JSON.stringify(data || {}),
          actor?.id || null,
          actor?.name || actor?.email || null,
        ]
      );
      savedNotif = insRes.rows[0];

      // Broadcast live real-time notification to all admin screens
      try {
        const { broadcastNotification, broadcastOrderCreated } = require("./socketService");
        broadcastNotification(savedNotif);
        if (type === "order_placed" || type === "pos_sale") {
          broadcastOrderCreated({ id: data?.order_id, customer_name: actor?.name, total: data?.total_amount, ...data });
        }
      } catch (e) {
        // Socket broadcast optional
      }
    }

    // 2. Check Email alert preference (defaults to true if not explicitly 'false')
    const emailGlobal = settings['notif_email_enabled'] !== 'false';
    const emailSpecific = settings[`email_notif_${type}`] !== 'false';
    const isEmailAllowed = emailGlobal && emailSpecific;

    if (isEmailAllowed) {
      const recipientEmail = settings['store_email'] || process.env.ADMIN_NOTIF_EMAIL || 'info@bemsfarms.com';
      sendAdminAlertEmail({
        to: recipientEmail,
        type,
        title,
        message,
        link,
        data,
      }).catch(err => {
        console.error(`Failed to send alert email for [${type}]:`, err.message);
      });
    }

    // 3. Automatically record into God Eye Audit Trail
    const categoryMap = {
      customer_register: 'auth',
      order_placed:      'financial',
      pos_sale:          'financial',
      order_delivery:    'admin',
      support_message:   'comms',
      ai_chat:           'ai',
      low_stock:         'admin',
      batch_expiry:      'admin',
      refund_request:    'financial',
      system_error:      'system',
      security_event:    'security',
      staff_action:      'admin',
    };

    recordAudit({
      source:      'system',
      action:      `NOTIF_${type.toUpperCase()}`,
      category:    categoryMap[type] || 'system',
      severity:    severity || 'info',
      outcome:     'success',
      resource:    link || 'notifications',
      actor_id:    actor?.id || null,
      actor_name:  actor?.name || actor?.email || 'System Engine',
      actor_role:  actor?.role || 'system',
      details: {
        title,
        message,
        type,
        push_delivered: isPushAllowed,
        email_delivered: isEmailAllowed,
        ...data,
      },
    }).catch(() => {});

    return { success: true, notification: savedNotif };
  } catch (err) {
    console.error('Error in notifyAdmin:', err);
    return { success: false, error: err.message };
  }
}

async function getRecentNotifications(limit = 30) {
  await ensureNotificationTable();
  const res = await pool.query(
    `SELECT * FROM system_notifications ORDER BY created_at DESC LIMIT $1`,
    [limit]
  );
  const unreadRes = await pool.query(
    `SELECT COUNT(*) FROM system_notifications WHERE is_read = false`
  );
  return {
    notifications: res.rows,
    unread_count: parseInt(unreadRes.rows[0].count) || 0,
  };
}

async function markNotificationRead(id) {
  await ensureNotificationTable();
  await pool.query(
    `UPDATE system_notifications SET is_read = true WHERE id = $1`,
    [id]
  );
  return { success: true };
}

async function markAllNotificationsRead() {
  await ensureNotificationTable();
  await pool.query(`UPDATE system_notifications SET is_read = true WHERE is_read = false`);
  return { success: true };
}

module.exports = {
  notifyAdmin,
  ensureNotificationTable,
  getRecentNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  getNotificationSettings,
};
