// server/src/services/driverSupportService.js
const pool = require("../db/pool");
const { fetchOrderReferenceContext, generateDriverSupportReply } = require("./chatSupportEngine");
const { notifyAdmin } = require("./notificationService");
const { broadcastDriverMessage } = require("./socketService");

async function resolveDriver(target) {
  const r = await pool.query(
    `SELECT id, name, phone, email, status, vehicle_type, vehicle_plate FROM drivers WHERE id::text=$1 OR phone=$1 OR LOWER(email)=LOWER($1)`,
    [String(target)]
  );
  if (!r.rows.length) throw Object.assign(new Error("Driver not found"), { status: 404 });
  return r.rows[0];
}

async function getDriverMessages(driverId) {
  const r = await pool.query(
    `
    SELECT 
      m.*,
      u.name AS admin_name,
      m.order_id,
      m.delivery_id,
      m.metadata
    FROM driver_messages m
    LEFT JOIN users u ON u.id = m.admin_id
    WHERE m.driver_id = $1
    ORDER BY m.created_at DESC, m.id DESC
    LIMIT 200
    `,
    [driverId]
  );
  return { messages: r.rows.reverse() };
}

async function getDriverReferenceOptions(driverId) {
  try {
    const deliveriesRes = await pool.query(
      `
      SELECT 
        d.id AS delivery_id,
        d.delivery_ref,
        d.status AS delivery_status,
        d.eta_minutes,
        d.assigned_at,
        o.id AS order_id,
        o.order_ref,
        o.total,
        o.payment_method,
        o.address,
        COALESCE(o.customer_name, u.name, 'Customer') AS customer_name,
        COALESCE(o.customer_phone, u.phone, '') AS customer_phone,
        (
          SELECT p.image_url 
          FROM order_items oi
          LEFT JOIN products p ON oi.product_id = p.id
          WHERE oi.order_id = o.id
          LIMIT 1
        ) AS thumbnail
      FROM deliveries d
      JOIN orders o ON d.order_id = o.id
      LEFT JOIN users u ON (o.user_id = u.id OR o.customer_id = u.id)
      WHERE d.driver_id = $1
      ORDER BY 
        CASE 
          WHEN d.status IN ('assigned', 'awaiting_pickup', 'accepted', 'picked_up', 'en_route', 'arrived') THEN 1
          ELSE 2
        END,
        d.assigned_at DESC,
        d.id DESC
      LIMIT 15
      `,
      [driverId]
    );

    return {
      deliveries: deliveriesRes.rows.map(d => ({
        delivery_id: d.delivery_id,
        delivery_ref: d.delivery_ref || `DEL-${d.delivery_id}`,
        delivery_status: d.delivery_status,
        eta_minutes: d.eta_minutes,
        order_id: d.order_id,
        order_ref: d.order_ref || d.order_id,
        total: parseFloat(d.total) || 0,
        payment_method: d.payment_method,
        address: d.address,
        customer_name: d.customer_name,
        customer_phone: d.customer_phone,
        thumbnail: d.thumbnail,
      })),
    };
  } catch (err) {
    console.error("getDriverReferenceOptions error:", err.message);
    return { deliveries: [] };
  }
}

async function sendDriverMessage(driverId, message, actor, options = {}) {
  if (typeof message !== "string" || !message.trim() || message.length > 4000) {
    throw Object.assign(new Error("Message must contain 1–4,000 characters"), { status: 400 });
  }

  const { order_id, delivery_id, enable_ai = true } = options;
  let orderContext = null;

  // Detect explicit or text-embedded order/delivery references
  let resolvedId = order_id || delivery_id || null;
  if (!resolvedId) {
    const match = message.match(/(?:@|\/delivery\s+|\/order\s+|#)(DEL-[A-Z0-9-]+|BF-[A-Z0-9-]+|[0-9]{4,})/i);
    if (match) {
      resolvedId = match[1];
    }
  }

  if (resolvedId) {
    orderContext = await fetchOrderReferenceContext(resolvedId);
  }

  const db = await pool.connect();
  try {
    await db.query("BEGIN");
    const conv = await db.query(
      `
      INSERT INTO driver_conversations(driver_id, last_message, status, active_order_id, active_delivery_id)
      VALUES($1, $2, 'open', $3, $4)
      ON CONFLICT(driver_id) DO UPDATE SET
        last_message = EXCLUDED.last_message,
        last_message_at = NOW(),
        active_order_id = COALESCE(EXCLUDED.active_order_id, driver_conversations.active_order_id),
        active_delivery_id = COALESCE(EXCLUDED.active_delivery_id, driver_conversations.active_delivery_id),
        updated_at = NOW(),
        status = 'open'
      RETURNING id
      `,
      [
        driverId,
        message.trim().slice(0, 100),
        orderContext?.order_id || null,
        orderContext?.delivery_id || null,
      ]
    );

    const convId = conv.rows[0].id;
    const senderType = actor ? "admin" : "driver";

    const r = await db.query(
      `
      INSERT INTO driver_messages(
        conversation_id, driver_id, sender_type, admin_id, message, order_id, delivery_id, metadata
      )
      VALUES($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
      `,
      [
        convId,
        driverId,
        senderType,
        actor?.id || null,
        message.trim(),
        orderContext?.order_id || null,
        orderContext?.delivery_id || null,
        orderContext ? JSON.stringify(orderContext) : null,
      ]
    );

    const createdMsg = {
      ...r.rows[0],
      admin_name: actor?.name || (senderType === "admin" ? "Dispatch Manager" : null),
    };

    if (!actor) {
      // Driver sent message -> Notify Logistics Admin Console
      const drvRes = await db.query("SELECT id, name, phone, vehicle_type, vehicle_plate FROM drivers WHERE id=$1", [driverId]);
      const drvObj = drvRes.rows[0] || { id: driverId, name: `Driver #${driverId}` };
      const driverName = drvObj.name || `Driver #${driverId}`;

      try {
        notifyAdmin({
          type: "driver_support_message",
          title: `🛵 Dispatch Message from Rider ${driverName}${orderContext ? ` (Task #${orderContext.order_ref})` : ""}`,
          message: `${driverName}: "${message.trim().slice(0, 150)}${message.trim().length > 150 ? "…" : ""}"`,
          link: `/customers/messages?driver=${driverId}&tab=drivers`,
          severity: "warning",
          data: {
            driver_id: driverId,
            driver_name: driverName,
            order_id: orderContext?.order_id,
            message: message.trim(),
          },
          actor: { id: driverId, name: driverName, role: "driver" },
        });

        if (typeof broadcastDriverMessage === "function") {
          broadcastDriverMessage({
            driver_id: driverId,
            driver_name: driverName,
            order_id: orderContext?.order_id,
            order_context: orderContext,
            message: message.trim(),
            message_id: createdMsg.id,
          });
        }
      } catch (notifErr) {
        console.warn("Driver message admin notification notice:", notifErr?.message);
      }

      // Check if AI Bot reply should assist rider immediately
      if (enable_ai) {
        try {
          const aiText = await generateDriverSupportReply(drvObj, message.trim(), orderContext);
          if (aiText) {
            const botRes = await db.query(
              `
              INSERT INTO driver_messages(
                conversation_id, driver_id, sender_type, admin_id, message, order_id, delivery_id, metadata, is_read
              )
              VALUES($1, $2, 'bot', NULL, $3, $4, $5, $6, TRUE)
              RETURNING *
              `,
              [
                convId,
                driverId,
                aiText,
                orderContext?.order_id || null,
                orderContext?.delivery_id || null,
                orderContext ? JSON.stringify(orderContext) : null,
              ]
            );

            await db.query(
              `UPDATE driver_conversations SET last_message = $1, last_message_at = NOW() WHERE id = $2`,
              [aiText.slice(0, 100), convId]
            );

            createdMsg.bot_reply = {
              ...botRes.rows[0],
              admin_name: "Dispatch AI Assistant",
            };
          }
        } catch (botErr) {
          console.warn("Driver AI Bot generation notice:", botErr.message);
        }
      }
    }

    await db.query("COMMIT");
    return { message: createdMsg };
  } catch (err) {
    await db.query("ROLLBACK");
    throw err;
  } finally {
    db.release();
  }
}

async function markDriverRead(driverId, sender) {
  await pool.query(
    "UPDATE driver_messages SET is_read=true WHERE driver_id=$1 AND sender_type=$2 AND is_read=false",
    [driverId, sender]
  );
}

module.exports = {
  resolveDriver,
  getDriverMessages,
  getDriverReferenceOptions,
  sendDriverMessage,
  markDriverRead,
};
