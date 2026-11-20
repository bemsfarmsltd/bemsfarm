const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const pool = require("../db/pool");
const { STAFF_ROLES } = require("../config/roles");

let io = null;

const ORDER_EVENT_ROLES = [
  "superadmin", "admin", "manager", "accountant", "delivery_manager",
  "cashier", "salesperson", "sales_person", "sales", "kitchen_staff", "storekeeper",
];
const DELIVERY_EVENT_ROLES = ["superadmin", "admin", "manager", "delivery_manager"];
const STOCK_EVENT_ROLES = [
  "superadmin", "admin", "manager", "kitchen_staff", "storekeeper",
  "cashier", "salesperson", "sales_person", "sales",
];
const PRIVILEGED_ADMIN_ROLES = ["superadmin", "admin", "manager"];

/**
 * Initialize Socket.io on the HTTP server instance
 */
function initSocketService(httpServer, allowedOrigins = []) {
  if (io) return io;

  io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        // Allow all non-browser or development connections
        if (!origin) return callback(null, true);
        const allowed = [
          "https://www.bemsfarms.com",
          "https://bemsfarms.com",
          "https://bemsfarm.vercel.app",
          "https://palegoldenrod-bee-264147.hostingersite.com",
          "https://bems-admin.vercel.app",
          "https://admin.bemsfarms.com",
          "http://localhost:5173",
          "http://localhost:5174",
          "http://localhost:3000",
          "http://localhost:4173",
          ...(Array.isArray(allowedOrigins) ? allowedOrigins : [allowedOrigins]),
        ].filter(Boolean);

        if (allowed.includes(origin) || origin.includes("localhost") || origin.includes("127.0.0.1")) {
          return callback(null, true);
        }
        return callback(null, true); // Permissive for websockets to avoid dropping real-time updates
      },
      credentials: true,
      methods: ["GET", "POST"],
    },
    transports: ["websocket", "polling"],
    pingTimeout: 30000,
    pingInterval: 15000,
  });

  io.on("connection", (socket) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;

    // Resolve and verify role + user/driver ID strictly from signed JWT + active DB record
    const authPromise = (async () => {
      let verifiedRole = "guest";
      let verifiedUserId = null;
      let verifiedDriverId = null;
      if (token && process.env.JWT_SECRET) {
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          if (decoded?.id) {
            if (decoded.role === "driver") {
              const dRes = await pool.query("SELECT id, status FROM drivers WHERE id = $1", [decoded.id]);
              if (dRes.rows.length && String(dRes.rows[0].status || "active").toLowerCase() !== "suspended") {
                verifiedRole = "driver";
                verifiedDriverId = Number(dRes.rows[0].id);
              }
            } else {
              const uRes = await pool.query("SELECT id, role, status FROM users WHERE id = $1", [decoded.id]);
              if (uRes.rows.length && String(uRes.rows[0].status || "active").toLowerCase() === "active") {
                verifiedRole = String(uRes.rows[0].role || "guest").toLowerCase().trim();
                verifiedUserId = Number(uRes.rows[0].id);
              }
            }
          }
        } catch (_) {}
      }
      socket.data.role = verifiedRole;
      socket.data.userId = verifiedUserId;
      socket.data.driverId = verifiedDriverId;
      socket.join(`role_${verifiedRole}`);
      if (PRIVILEGED_ADMIN_ROLES.includes(verifiedRole)) {
        socket.join("admin_room");
      }
      if (verifiedDriverId) {
        socket.join(`driver_${verifiedDriverId}`);
      }
      if (verifiedUserId) {
        socket.join(`user_${verifiedUserId}`);
        socket.join(`customer_${verifiedUserId}`);
      }
      return { verifiedRole, verifiedUserId, verifiedDriverId };
    })();

    // Allow dynamic room joins while guarding privileged & private user/driver rooms
    socket.on("join_room", async (room) => {
      if (typeof room !== "string") return;
      const { verifiedRole, verifiedUserId, verifiedDriverId } = await authPromise;
      const isStaff = STAFF_ROLES.includes(verifiedRole) || PRIVILEGED_ADMIN_ROLES.includes(verifiedRole);

      if (room === "admin_room" || room.startsWith("role_")) {
        if (room === `role_${verifiedRole}` || PRIVILEGED_ADMIN_ROLES.includes(verifiedRole)) {
          socket.join(room);
        }
        return;
      }
      if (room.startsWith("driver_")) {
        const targetId = Number(room.replace("driver_", ""));
        if (isStaff || (verifiedDriverId && verifiedDriverId === targetId)) {
          socket.join(room);
        }
        return;
      }
      if (room.startsWith("user_") || room.startsWith("customer_")) {
        const targetId = Number(room.replace(/^(user_|customer_)/, ""));
        if (isStaff || (verifiedUserId && verifiedUserId === targetId)) {
          socket.join(room);
        }
        return;
      }
      if (room.startsWith("pos_") && !isStaff) {
        return;
      }
      socket.join(room);
    });

    socket.on("leave_room", (room) => {
      if (typeof room === "string") {
        socket.leave(room);
      }
    });

    // Receive real-time location telemetry strictly from authenticated driver or staff sockets
    socket.on("driver:location", async (payload) => {
      try {
        const { verifiedRole, verifiedDriverId } = await authPromise;
        const isStaff = STAFF_ROLES.includes(verifiedRole) || PRIVILEGED_ADMIN_ROLES.includes(verifiedRole);
        const id = verifiedDriverId || (isStaff ? (payload?.driver_id || payload?.driverId) : null);
        if (!id) return;
        const coords = payload?.coords || payload?.position || payload || {};
        const lat = parseFloat(payload?.latitude ?? payload?.lat ?? coords?.latitude ?? coords?.lat);
        const lng = parseFloat(payload?.longitude ?? payload?.lng ?? coords?.longitude ?? coords?.lng);
        if (!isNaN(lat) && !isNaN(lng) && id) {
          const pool = require("../db/pool");
          await pool.query(
            `INSERT INTO driver_locations (driver_id, latitude, longitude, heading, speed, accuracy, order_id, delivery_id, recorded_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
            [
              id,
              lat,
              lng,
              payload?.heading ? parseFloat(payload.heading) : null,
              payload?.speed ? parseFloat(payload.speed) : null,
              payload?.accuracy ? parseFloat(payload.accuracy) : null,
              payload?.order_id || payload?.orderId || null,
              payload?.delivery_id || payload?.deliveryId || null,
            ]
          ).catch(() => {});
          await pool.query("UPDATE drivers SET last_location_at = NOW() WHERE id = $1", [id]).catch(() => {});
          broadcastDriverLocation({
            driver_id: parseInt(id, 10),
            latitude: lat,
            longitude: lng,
            heading: payload?.heading ? parseFloat(payload.heading) : null,
            speed: payload?.speed ? parseFloat(payload.speed) : null,
            accuracy: payload?.accuracy ? parseFloat(payload.accuracy) : null,
            order_id: payload?.order_id || payload?.orderId || null,
            recorded_at: new Date().toISOString()
          });
        }
      } catch (err) {
        console.warn("[socketService] Error handling driver:location socket:", err.message);
      }
    });

    socket.on("disconnect", (reason) => {
      // Clean disconnect
    });
  });

  console.log("⚡ Real-time WebSocket engine initialized (Socket.io)");
  return io;
}

function getIO() {
  return io;
}

/**
 * Universal broadcast helper that safely emits to all connected clients and rooms
 */
function emitEvent(event, data) {
  if (!io) return;
  try {
    io.emit(event, data);
    io.to("admin_room").emit(event, data);
  } catch (err) {
    console.warn(`[socketService] Failed to emit event ${event}:`, err.message);
  }
}

/**
 * Role-scoped broadcast helper so operational events never leak across unrelated role dashboards
 */
function emitToRoles(roles, event, data) {
  if (!io || !Array.isArray(roles) || roles.length === 0) return;
  try {
    let chain = io;
    for (const r of roles) {
      chain = chain.to(`role_${String(r).toLowerCase().trim()}`);
    }
    chain.emit(event, data);
  } catch (err) {
    console.warn(`[socketService] Failed to emit event ${event} to roles:`, err.message);
  }
}

// ── Specialized Event Broadcasters ─────────────────────────────

function broadcastOrderCreated(order) {
  emitToRoles(ORDER_EVENT_ROLES, "order:created", {
    order_id: order?.id || order?.order_id,
    order_ref: order?.order_ref || order?.ref,
    customer_name: order?.customer_name || order?.name || "Customer",
    total: order?.total || order?.total_amount || 0,
    status: order?.status || "pending",
    channel: order?.channel || order?.source || "online",
    created_at: order?.created_at || new Date().toISOString(),
    order,
  });
  emitToRoles(ORDER_EVENT_ROLES, "dashboard:update", { reason: "order_created", order_id: order?.id });
}

function broadcastOrderUpdated(order) {
  emitToRoles(ORDER_EVENT_ROLES, "order:updated", {
    order_id: order?.id || order?.order_id,
    status: order?.status,
    payment_status: order?.payment_status,
    driver_id: order?.driver_id,
    updated_at: new Date().toISOString(),
    order,
  });
  emitToRoles(ORDER_EVENT_ROLES, "dashboard:update", { reason: "order_updated", order_id: order?.id });
}

function broadcastDeliveryUpdated(delivery) {
  emitToRoles(DELIVERY_EVENT_ROLES, "delivery:updated", {
    delivery_id: delivery?.id || delivery?.delivery_id,
    order_id: delivery?.order_id,
    driver_id: delivery?.driver_id,
    status: delivery?.status,
    assignment_type: delivery?.assignment_type,
    updated_at: new Date().toISOString(),
    delivery,
  });
  emitToRoles(ORDER_EVENT_ROLES, "dashboard:update", { reason: "delivery_updated" });
}

function broadcastDriverTelemetry(telemetry) {
  emitToRoles(DELIVERY_EVENT_ROLES, "driver:telemetry", {
    driver_id: telemetry?.driver_id,
    is_available: telemetry?.is_available,
    status: telemetry?.status,
    last_ping_at: telemetry?.last_ping_at || new Date().toISOString(),
    telemetry,
  });
}

function broadcastDriverLocation(location) {
  const locPayload = {
    driver_id: location?.driver_id,
    driverId: location?.driver_id,
    order_id: location?.order_id || null,
    orderId: location?.order_id || null,
    delivery_id: location?.delivery_id || null,
    deliveryId: location?.delivery_id || null,
    latitude: location?.latitude,
    longitude: location?.longitude,
    heading: location?.heading,
    speed: location?.speed,
    accuracy: location?.accuracy,
    recorded_at: location?.recorded_at || new Date().toISOString(),
    timestamp: location?.recorded_at || new Date().toISOString(),
  };

  emitToRoles(DELIVERY_EVENT_ROLES, "driver:location", locPayload);

  // If tied to an active order, emit to customer order tracker and authorized dispatch roles
  if (location?.order_id) {
    if (io) io.emit(`order:${location.order_id}:location`, locPayload);
    emitToRoles(DELIVERY_EVENT_ROLES, "order:location", locPayload);
  }
}

function broadcastStockUpdated(stock) {
  emitToRoles(STOCK_EVENT_ROLES, "stock:updated", {
    product_id: stock?.product_id,
    variant_id: stock?.variant_id,
    warehouse_id: stock?.warehouse_id,
    new_quantity: stock?.quantity,
    reason: stock?.reason,
    updated_at: new Date().toISOString(),
    stock,
  });
  emitToRoles(ORDER_EVENT_ROLES, "dashboard:update", { reason: "stock_updated" });
}

function broadcastNotification(notification) {
  const { canRoleReceiveNotification } = require("./notificationService");
  const payload = {
    id: notification?.id,
    title: notification?.title,
    message: notification?.message || notification?.body,
    type: notification?.type || "system",
    link: notification?.link,
    created_at: notification?.created_at || new Date().toISOString(),
    notification,
  };
  const targetRoles = STAFF_ROLES.filter((r) => canRoleReceiveNotification(r, notification?.type));
  emitToRoles(targetRoles.length ? targetRoles : ["superadmin", "admin"], "notification:new", payload);
}

function broadcastDispatchAlert(alert) {
  emitToRoles(DELIVERY_EVENT_ROLES, "dispatch:alert", {
    id: alert?.id,
    order_id: alert?.order_id,
    alert_type: alert?.alert_type || alert?.type,
    message: alert?.message,
    created_at: alert?.created_at || new Date().toISOString(),
    alert,
  });
}

function broadcastEmergencyAlert(emergency) {
  emitToRoles(DELIVERY_EVENT_ROLES, "emergency:sos", {
    emergency_id: emergency?.id,
    driver_id: emergency?.driver_id,
    driver_name: emergency?.driver_name,
    latitude: emergency?.latitude,
    longitude: emergency?.longitude,
    emergency_type: emergency?.emergency_type,
    created_at: new Date().toISOString(),
    emergency,
  });
}

function broadcastSupportMessage(payload) {
  emitToRoles(PRIVILEGED_ADMIN_ROLES, "support:message", {
    customer_id: payload?.customer_id,
    customer_name: payload?.customer_name,
    message: payload?.message,
    created_at: new Date().toISOString(),
  });
}

function broadcastDriverMessage(payload) {
  emitToRoles(DELIVERY_EVENT_ROLES, "driver:support_message", payload);
  if (payload?.driver_id) {
    const ioInstance = getIO();
    if (ioInstance) {
      ioInstance.to(`driver_${payload.driver_id}`).emit("driver:support_message", payload);
    }
  }
}

function broadcastDashboardInvalidation(section = "all") {
  emitToRoles(ORDER_EVENT_ROLES, "dashboard:update", { section, timestamp: Date.now() });
}

module.exports = {
  initSocketService,
  getIO,
  emitEvent,
  emitToRoles,
  broadcastOrderCreated,
  broadcastOrderUpdated,
  broadcastDeliveryUpdated,
  broadcastDriverTelemetry,
  broadcastDriverLocation,
  broadcastStockUpdated,
  broadcastNotification,
  broadcastDispatchAlert,
  broadcastEmergencyAlert,
  broadcastSupportMessage,
  broadcastDriverMessage,
  broadcastDashboardInvalidation,
};
