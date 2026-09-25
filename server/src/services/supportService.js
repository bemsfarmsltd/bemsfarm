// server/src/services/supportService.js
const pool = require('../db/pool');
const { fetchOrderReferenceContext, generateCustomerSupportReply } = require('./chatSupportEngine');
const { notifyAdmin } = require('./notificationService');
const { broadcastSupportMessage } = require('./socketService');

async function resolveCustomer(target, { requireActive = false } = {}) {
  const statusFilter = requireActive ? "AND COALESCE(status,'active') <> 'deleted'" : "";
  const r = await pool.query(
    `SELECT id, name, email, phone, status FROM users WHERE role='user' ${statusFilter} AND (id::text=$1 OR customer_code=$1 OR LOWER(email)=LOWER($1))`,
    [String(target)]
  );
  if (!r.rows.length) throw Object.assign(new Error('Customer not found'), { status: 404 });
  return r.rows[0];
}

async function getMessages(customerId) {
  const r = await pool.query(
    `
    SELECT 
      m.*,
      u.name AS admin_name,
      m.order_id,
      m.delivery_id,
      m.metadata
    FROM customer_messages m 
    LEFT JOIN users u ON u.id = m.admin_id
    WHERE m.customer_id = $1 
    ORDER BY m.created_at DESC, m.id DESC 
    LIMIT 200
    `,
    [customerId]
  );
  return { messages: r.rows.reverse() };
}

async function getCustomerReferenceOptions(customerId) {
  try {
    const ordersRes = await pool.query(
      `
      SELECT 
        o.id AS order_id,
        o.order_ref,
        o.status,
        o.total,
        o.payment_method,
        o.created_at,
        o.delivery_fee,
        d.id AS delivery_id,
        d.delivery_ref,
        d.status AS delivery_status,
        d.eta_minutes,
        drv.name AS driver_name,
        (
          SELECT p.image_url 
          FROM order_items oi
          LEFT JOIN products p ON oi.product_id = p.id
          WHERE oi.order_id = o.id
          LIMIT 1
        ) AS thumbnail
      FROM orders o
      LEFT JOIN deliveries d ON (d.order_id = o.id::text OR d.order_id = o.order_ref)
      LEFT JOIN drivers drv ON d.driver_id = drv.id
      WHERE (o.user_id = $1 OR o.customer_id = $1)
      ORDER BY o.created_at DESC
      LIMIT 15
      `,
      [customerId]
    );

    return {
      orders: ordersRes.rows.map(o => ({
        id: o.order_id,
        order_id: o.order_id,
        order_ref: o.order_ref || o.order_id,
        status: o.status,
        total: parseFloat(o.total) || 0,
        payment_method: o.payment_method,
        created_at: o.created_at,
        delivery_id: o.delivery_id,
        delivery_ref: o.delivery_ref,
        delivery_status: o.delivery_status,
        eta_minutes: o.eta_minutes,
        driver_name: o.driver_name,
        thumbnail: o.thumbnail,
      })),
    };
  } catch (err) {
    console.error("getCustomerReferenceOptions error:", err.message);
    return { orders: [] };
  }
}

async function sendMessage(customerId, message, actor, options = {}) {
  if (typeof message !== 'string' || !message.trim() || message.length > 4000) {
    throw Object.assign(new Error('Message must contain 1–4,000 characters'), { status: 400 });
  }

  const { order_id, delivery_id, enable_ai = true } = options;
  let orderContext = null;

  // Detect explicit or text-embedded order references (e.g. @BF-XYZ or /order BF-XYZ)
  let resolvedOrderId = order_id || null;
  if (!resolvedOrderId) {
    const match = message.match(/(?:@|\/order\s+|#)(BF-[A-Z0-9-]+|[0-9]{4,})/i);
    if (match) {
      resolvedOrderId = match[1];
    }
  }

  if (resolvedOrderId) {
    orderContext = await fetchOrderReferenceContext(resolvedOrderId);
  }

  const db = await pool.connect();
  try {
    await db.query('BEGIN');
    const conv = await db.query(
      `
      INSERT INTO customer_conversations(customer_id, last_message, status) 
      VALUES($1, $2, 'open')
      ON CONFLICT(customer_id) DO UPDATE SET 
        last_message = EXCLUDED.last_message,
        last_message_at = NOW(),
        updated_at = NOW(),
        status = 'open' 
      RETURNING id
      `,
      [customerId, message.trim().slice(0, 100)]
    );

    const convId = conv.rows[0].id;
    const senderType = actor ? 'admin' : 'customer';

    const r = await db.query(
      `
      INSERT INTO customer_messages(
        conversation_id, customer_id, sender_type, admin_id, message, order_id, delivery_id, metadata
      )
      VALUES($1, $2, $3, $4, $5, $6, $7, $8) 
      RETURNING *
      `,
      [
        convId,
        customerId,
        senderType,
        actor?.id || null,
        message.trim(),
        resolvedOrderId || null,
        delivery_id || orderContext?.delivery_id || null,
        orderContext ? JSON.stringify(orderContext) : null,
      ]
    );

    const createdMsg = {
      ...r.rows[0],
      admin_name: actor?.name || (senderType === 'admin' ? 'Support Staff' : null),
    };

    if (!actor) {
      // Customer sent message -> Notify Admin
      const userRes = await db.query("SELECT id, name, email, phone FROM users WHERE id=$1", [customerId]);
      const userObj = userRes.rows[0] || { id: customerId, name: `Customer #${customerId}` };
      const senderName = userObj.name || userObj.email || `Customer #${customerId}`;

      try {
        notifyAdmin({
          type: 'support_message',
          title: `💬 Support Message from ${senderName}${orderContext ? ` (Order #${orderContext.order_ref})` : ''}`,
          message: `${senderName}: "${message.trim().slice(0, 150)}${message.trim().length > 150 ? '…' : ''}"`,
          link: `/customers/messages?customer=${customerId}`,
          severity: 'info',
          data: {
            customer_id: customerId,
            customer_name: senderName,
            order_id: resolvedOrderId,
            message: message.trim(),
          },
          actor: { id: customerId, name: senderName, role: 'customer' },
        });

        broadcastSupportMessage({
          customer_id: customerId,
          customer_name: senderName,
          order_id: resolvedOrderId,
          order_context: orderContext,
          message: message.trim(),
          message_id: createdMsg.id,
        });
      } catch (notifErr) {
        console.warn("Admin notification notice:", notifErr?.message);
      }

      // Check if AI Bot reply should be appended
      if (enable_ai) {
        try {
          const aiText = await generateCustomerSupportReply(userObj, message.trim(), orderContext);
          if (aiText) {
            const botRes = await db.query(
              `
              INSERT INTO customer_messages(
                conversation_id, customer_id, sender_type, admin_id, message, order_id, delivery_id, metadata, is_read
              )
              VALUES($1, $2, 'bot', NULL, $3, $4, $5, $6, TRUE)
              RETURNING *
              `,
              [
                convId,
                customerId,
                aiText,
                resolvedOrderId || null,
                delivery_id || orderContext?.delivery_id || null,
                orderContext ? JSON.stringify(orderContext) : null,
              ]
            );

            // Update conversation last_message
            await db.query(
              `UPDATE customer_conversations SET last_message = $1, last_message_at = NOW() WHERE id = $2`,
              [aiText.slice(0, 100), convId]
            );

            createdMsg.bot_reply = {
              ...botRes.rows[0],
              admin_name: "Bems AI Assistant",
            };
          }
        } catch (botErr) {
          console.warn("AI Bot response generation notice:", botErr.message);
        }
      }
    }

    await db.query('COMMIT');
    return { message: createdMsg };
  } catch (err) {
    await db.query('ROLLBACK');
    throw err;
  } finally {
    db.release();
  }
}

async function markRead(customerId, sender) {
  await pool.query(
    'UPDATE customer_messages SET is_read=true WHERE customer_id=$1 AND sender_type=$2 AND is_read=false',
    [customerId, sender]
  );
}

module.exports = {
  resolveCustomer,
  getMessages,
  getCustomerReferenceOptions,
  sendMessage,
  markRead,
};
