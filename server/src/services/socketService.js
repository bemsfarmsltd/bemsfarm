const { Server } = require("socket.io");

let io = null;

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
    const role = socket.handshake.query?.role || "guest";
    const userId = socket.handshake.query?.userId || null;
    const driverId = socket.handshake.query?.driverId || null;

    // Join general admin channel if staff / admin
    if (role === "admin" || role === "staff" || role === "manager" || role === "superadmin") {
      socket.join("admin_room");
    }

    if (driverId) {
      socket.join(`driver_${driverId}`);
    }

    // Allow dynamic room joins
    socket.on("join_room", (room) => {
      if (typeof room === "string") {
        socket.join(room);
      }
    });

    socket.on("leave_room", (room) => {
      if (typeof room === "string") {
        socket.leave(room);
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
    // Also emit to explicit admin room
    io.to("admin_room").emit(event, data);
  } catch (err) {
    console.warn(`[socketService] Failed to emit event ${event}:`, err.message);
  }
}

// ── Specialized Event Broadcasters ─────────────────────────────

function broadcastOrderCreated(order) {
  emitEvent("order:created", {
    order_id: order?.id || order?.order_id,
    order_ref: order?.order_ref || order?.ref,
    customer_name: order?.customer_name || order?.name || "Customer",
    total: order?.total || order?.total_amount || 0,
    status: order?.status || "pending",
    channel: order?.channel || order?.source || "online",
    created_at: order?.created_at || new Date().toISOString(),
    order,
  });
  // Invalidate dashboard metrics
  emitEvent("dashboard:update", { reason: "order_created", order_id: order?.id });
}

function broadcastOrderUpdated(order) {
  emitEvent("order:updated", {
    order_id: order?.id || order?.order_id,
    status: order?.status,
    payment_status: order?.payment_status,
    driver_id: order?.driver_id,
    updated_at: new Date().toISOString(),
    order,
  });
  emitEvent("dashboard:update", { reason: "order_updated", order_id: order?.id });
}

function broadcastDeliveryUpdated(delivery) {
  emitEvent("delivery:updated", {
    delivery_id: delivery?.id || delivery?.delivery_id,
    order_id: delivery?.order_id,
    driver_id: delivery?.driver_id,
    status: delivery?.status,
    assignment_type: delivery?.assignment_type,
    updated_at: new Date().toISOString(),
    delivery,
  });
  emitEvent("dashboard:update", { reason: "delivery_updated" });
}

function broadcastDriverTelemetry(telemetry) {
  emitEvent("driver:telemetry", {
    driver_id: telemetry?.driver_id,
    is_available: telemetry?.is_available,
    status: telemetry?.status,
    last_ping_at: telemetry?.last_ping_at || new Date().toISOString(),
    telemetry,
  });
}

function broadcastDriverLocation(location) {
  emitEvent("driver:location", {
    driver_id: location?.driver_id,
    latitude: location?.latitude,
    longitude: location?.longitude,
    heading: location?.heading,
    speed: location?.speed,
    recorded_at: location?.recorded_at || new Date().toISOString(),
  });
}

function broadcastStockUpdated(stock) {
  emitEvent("stock:updated", {
    product_id: stock?.product_id,
    variant_id: stock?.variant_id,
    warehouse_id: stock?.warehouse_id,
    new_quantity: stock?.quantity,
    reason: stock?.reason,
    updated_at: new Date().toISOString(),
    stock,
  });
  emitEvent("dashboard:update", { reason: "stock_updated" });
}

function broadcastNotification(notification) {
  emitEvent("notification:new", {
    id: notification?.id,
    title: notification?.title,
    message: notification?.message || notification?.body,
    type: notification?.type || "system",
    link: notification?.link,
    created_at: notification?.created_at || new Date().toISOString(),
    notification,
  });
}

function broadcastDispatchAlert(alert) {
  emitEvent("dispatch:alert", {
    id: alert?.id,
    order_id: alert?.order_id,
    alert_type: alert?.alert_type || alert?.type,
    message: alert?.message,
    created_at: alert?.created_at || new Date().toISOString(),
    alert,
  });
}

function broadcastEmergencyAlert(emergency) {
  emitEvent("emergency:sos", {
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
  emitEvent("support:message", {
    customer_id: payload?.customer_id,
    customer_name: payload?.customer_name,
    message: payload?.message,
    created_at: new Date().toISOString(),
  });
}

function broadcastDashboardInvalidation(section = "all") {
  emitEvent("dashboard:update", { section, timestamp: Date.now() });
}

module.exports = {
  initSocketService,
  getIO,
  emitEvent,
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
  broadcastDashboardInvalidation,
};
