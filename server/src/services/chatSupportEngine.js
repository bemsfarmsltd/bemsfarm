// server/src/services/chatSupportEngine.js
// Intelligent AI Support & Live Dispatch Chatbot Engine for Customers & Drivers

const pool = require("../db/pool");
const { notifyAdmin } = require("./notificationService");
const { broadcastSupportMessage, broadcastDriverMessage } = require("./socketService");

/**
 * Fetch full order context by order_id or order_ref
 */
async function fetchOrderReferenceContext(orderIdentifier) {
  if (!orderIdentifier) return null;
  const cleanId = String(orderIdentifier).trim().replace(/^#/, "");

  try {
    const result = await pool.query(
      `
      SELECT 
        o.id AS order_id,
        o.order_ref,
        o.status AS order_status,
        o.tracking_status,
        o.total,
        o.subtotal,
        o.delivery_fee,
        o.discount_amount,
        o.payment_method,
        o.payment_status,
        o.payment_ref,
        o.address,
        o.delivery_city,
        o.latitude,
        o.longitude,
        o.created_at,
        o.notes,
        COALESCE(o.customer_name, u.name, 'Customer') AS customer_name,
        COALESCE(o.customer_phone, u.phone, '') AS customer_phone,
        u.email AS customer_email,
        d.id AS delivery_id,
        d.delivery_ref,
        d.status AS delivery_status,
        d.eta_minutes,
        d.attempts,
        d.proof_photo,
        drv.id AS driver_id,
        drv.name AS driver_name,
        drv.phone AS driver_phone,
        drv.vehicle_type,
        drv.vehicle_plate,
        dz.zone_name,
        (
          SELECT JSON_AGG(
            JSON_BUILD_OBJECT(
              'product_name', COALESCE(oi.product_name, p.name),
              'quantity', oi.quantity,
              'unit_price', oi.unit_price,
              'total_price', oi.total_price,
              'unit', oi.unit
            )
          )
          FROM order_items oi
          LEFT JOIN products p ON oi.product_id = p.id
          WHERE oi.order_id = o.id
        ) AS items
      FROM orders o
      LEFT JOIN users u ON (o.user_id = u.id OR o.customer_id = u.id)
      LEFT JOIN deliveries d ON (d.order_id = o.id::text OR d.order_id = o.order_ref)
      LEFT JOIN drivers drv ON (d.driver_id = drv.id OR o.driver_id = drv.id)
      LEFT JOIN delivery_zones dz ON (COALESCE(d.zone_id, o.zone_id) = dz.zone_id)
      WHERE UPPER(REPLACE(o.id::text, '#', '')) = UPPER($1)
         OR UPPER(REPLACE(COALESCE(o.order_ref, ''), '#', '')) = UPPER($1)
         OR d.id::text = $1
         OR d.delivery_ref = $1
      LIMIT 1
      `,
      [cleanId]
    );

    if (result.rows.length === 0) return null;
    const row = result.rows[0];

    return {
      order_id: row.order_id,
      order_ref: row.order_ref || row.order_id,
      status: row.order_status,
      tracking_status: row.tracking_status || row.order_status,
      total: parseFloat(row.total) || 0,
      subtotal: parseFloat(row.subtotal) || 0,
      delivery_fee: parseFloat(row.delivery_fee) || 0,
      payment_method: row.payment_method,
      payment_status: row.payment_status,
      address: row.address,
      city: row.delivery_city,
      customer_name: row.customer_name,
      customer_phone: row.customer_phone,
      customer_email: row.customer_email,
      delivery_id: row.delivery_id,
      delivery_ref: row.delivery_ref,
      delivery_status: row.delivery_status,
      eta_minutes: row.eta_minutes,
      driver_id: row.driver_id,
      driver_name: row.driver_name,
      driver_phone: row.driver_phone,
      vehicle: row.vehicle_type ? `${row.vehicle_type} (${row.vehicle_plate || 'Courier'})` : null,
      zone_name: row.zone_name || "Standard Delivery Zone",
      items_count: Array.isArray(row.items) ? row.items.length : 0,
      items: row.items || [],
      created_at: row.created_at,
    };
  } catch (err) {
    console.error("fetchOrderReferenceContext error:", err.message);
    return null;
  }
}

/**
 * AI logic for customer support with order intelligence
 */
async function generateCustomerSupportReply(user, messageText, orderContext) {
  const text = (messageText || "").toLowerCase().trim();

  // 1. If an order is referenced
  if (orderContext) {
    const formattedTotal = `₦${orderContext.total.toLocaleString()}`;
    const orderId = orderContext.order_ref || orderContext.order_id;
    const status = orderContext.status.replace(/_/g, " ").toUpperCase();

    if (text.includes("where") || text.includes("track") || text.includes("status") || text.includes("eta") || text.includes("arrive") || text.includes("when")) {
      let courierInfo = orderContext.driver_name
        ? `\n🚚 Assigned Courier: ${orderContext.driver_name} (${orderContext.driver_phone || 'Call via app'})\n⏱️ Estimated Arrival: ~${orderContext.eta_minutes || 30} mins`
        : `\n📦 Status: Your order is being packed fresh at the farm and will be assigned to the nearest courier shortly.`;

      return `📍 Order #${orderId} Update:\n\n• Status: ${status}\n• Total: ${formattedTotal} (${orderContext.payment_method?.toUpperCase()})\n• Destination: ${orderContext.address}${courierInfo}\n\nYou can also click the tracking link on your dashboard to see the live courier GPS location!`;
    }

    if (text.includes("cancel") || text.includes("refund") || text.includes("change")) {
      if (['delivered', 'in_transit', 'out_for_delivery'].includes(orderContext.status)) {
        return `⚠️ Order #${orderId} is currently ${status}.\n\nBecause this order is already dispatched, direct cancellation is closed. However, our human Customer Support manager has been notified and will assist you immediately with returns or address adjustments.`;
      }
      return `ℹ️ Order #${orderId} (${status}):\n\nIf you need to adjust or cancel this order, our support team has been flagged and will attend to your request right away.`;
    }

    if (text.includes("item") || text.includes("what") || text.includes("contain")) {
      const itemList = orderContext.items.map(it => `• ${it.quantity}x ${it.product_name}`).join("\n");
      return `📦 Items in Order #${orderId}:\n\n${itemList || 'Farm produce items'}\n\nTotal: ${formattedTotal}`;
    }
  }

  // 2. Generic inquiries
  if (text.includes("human") || text.includes("agent") || text.includes("admin") || text.includes("speak") || text.includes("call")) {
    return "👋 I've connected you to our live Customer Support team! An admin has been notified with your conversation thread and will reply right here shortly.";
  }

  if (text.includes("delivery") || text.includes("fee") || text.includes("cost") || text.includes("zone")) {
    return "🚚 Bems Farms delivers farm-fresh produce with dynamic zonal tariffs:\n\n• Umuahia Urban & Metro: ₦1,000\n• Aba Metro Hub: ₦2,500\n• Regional Abia: ₦3,500\n• South-South Corridor: ₦5,000\n• Nationwide Express: ₦8,000\n\nYour exact fee is automatically calculated based on your address pin at checkout!";
  }

  if (text.includes("payment") || text.includes("monnify") || text.includes("transfer") || text.includes("pay")) {
    return "💳 We accept instant Bank Transfer, Debit Cards, and USSD via Monnify, as well as Cash on Delivery (COD) for eligible doorstep deliveries in Abia State.";
  }

  return `Hello ${user?.name || "there"}! 👋 I'm the Bems Farms Support Assistant.\n\n${orderContext ? `I see you referenced Order #${orderContext.order_ref || orderContext.order_id}. ` : ""}How can I help you today? You can ask about order status, delivery tracking, payment queries, or type "agent" to speak with a human support staff.`;
}

/**
 * AI logic for driver dispatch support with order intelligence
 */
async function generateDriverSupportReply(driver, messageText, orderContext) {
  const text = (messageText || "").toLowerCase().trim();

  // 1. If an order/delivery is referenced
  if (orderContext) {
    const orderId = orderContext.order_ref || orderContext.order_id;
    const formattedTotal = `₦${orderContext.total.toLocaleString()}`;
    const isCod = ['cod', 'cash', 'cashondelivery', 'payondelivery'].includes(String(orderContext.payment_method).toLowerCase());

    if (text.includes("unreachable") || text.includes("not answering") || text.includes("not picking") || text.includes("absent") || text.includes("no show")) {
      return `📞 Customer Unreachable Protocol for Order #${orderId}:\n\n1. Call the recipient at ${orderContext.customer_phone || 'the customer phone'} at least 3 times.\n2. Send an SMS / WhatsApp message stating: "Hello, your Bems Farms courier is outside with Order #${orderId}."\n3. Wait at least 10 minutes at the destination.\n4. If still unreachable, tap "Report Issue -> Customer Unreachable" in your app. Do not leave the goods unattended!`;
    }

    if (text.includes("cod") || text.includes("cash") || text.includes("collect") || text.includes("money") || text.includes("pay")) {
      if (isCod) {
        return `💵 Cash on Delivery (COD) for Order #${orderId}:\n\n• Total to Collect: ${formattedTotal}\n• Payment Method: Cash on Delivery / POS\n• Once received, confirm the delivery in your app. Your wallet will be credited your drop earning immediately upon confirmation!`;
      } else {
        return `✅ Order #${orderId} is PRE-PAID (${orderContext.payment_method?.toUpperCase()}).\n\n• Amount to Collect: ₦0.00 (Do not collect money from the customer!).\n• Just verify items and get customer sign-off.`;
      }
    }

    if (text.includes("address") || text.includes("location") || text.includes("direction") || text.includes("landmark") || text.includes("house")) {
      return `📍 Destination for Order #${orderId}:\n\n• Address: ${orderContext.address}\n• Customer Name: ${orderContext.customer_name}\n• Customer Phone: ${orderContext.customer_phone}\n\nTap the Navigation / Map icon on your active delivery card for turn-by-turn directions!`;
    }

    if (text.includes("breakdown") || text.includes("accident") || text.includes("bike") || text.includes("vehicle") || text.includes("emergency")) {
      return `🚨 Dispatch Emergency Alert for Order #${orderId}:\n\n• Stay safe! We have notified the Central Dispatch Manager immediately.\n• If needed, tap the Emergency SOS button in your app.\n• A relief rider will be routed to your coordinates (${orderContext.address}) to take over the package.`;
    }
  }

  // 2. Generic driver inquiries
  if (text.includes("payout") || text.includes("earning") || text.includes("withdraw") || text.includes("balance") || text.includes("commission")) {
    return "💰 Driver Payout Info:\n\n• Delivery drop earnings are credited to your in-app wallet immediately upon delivery completion.\n• Weekly automated payouts to your verified Nigerian bank account run every Tuesday at 6:00 AM.\n• You can also request instant manual withdrawals from the Wallet tab!";
  }

  if (text.includes("human") || text.includes("admin") || text.includes("manager") || text.includes("dispatch") || text.includes("help")) {
    return "🚨 Dispatch Manager Notified: Your message has been routed with highest priority to the live Logistics Admin console. A dispatch officer will message or call you right away.";
  }

  return `Hello Rider ${driver?.name || ""}! 🛵 Bems Farms Driver Dispatch Support is active.\n\n${orderContext ? `Regarding Delivery #${orderContext.order_ref || orderContext.order_id}: ` : ""}You can ask about COD amounts, customer contact procedures, emergency roadside help, or weekly payouts. Type "dispatch" to page the central admin console.`;
}

module.exports = {
  fetchOrderReferenceContext,
  generateCustomerSupportReply,
  generateDriverSupportReply,
};
