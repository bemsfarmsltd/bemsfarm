const pool = require("../db/pool");
const { COA, postGeneralJournal, postInventoryDoubleEntry } = require("../utils/doubleEntryLedger");
const { logOrderAudit } = require("../utils/workflowAudit");
const { autoAssignClosestDriver } = require("../services/dispatchEngine");
const { deductOrderStock } = require("../utils/orderStock");

// Normalize driver status string input
function normalizeStatus(status) {
  const s = String(status || "").toLowerCase().trim().replace(/[\s-]+/g, "_");
  if (s === "accepted") return "accepted";
  if (s === "picked_up" || s === "picking_up" || s === "goods_collected" || s === "pickup_confirmed" || s === "at_store") return "picked_up";
  if (s === "out_for_delivery" || s === "en_route" || s === "on_the_way" || s === "in_transit") return "en_route";
  if (s === "arrived" || s === "driver_arrived" || s === "at_location") return "arrived";
  if (s === "delivered" || s === "completed") return "delivered";
  if (s === "failed" || s === "undelivered" || s === "delivery_attempted" || s === "customer_unavailable") return "delivery_attempted";
  if (s === "awaiting_pickup" || s === "pickup") return "awaiting_pickup";
  return s;
}

// Format delivery row to strictly match the mobile app's Dart/Flutter types
function formatDelivery(row) {
  if (!row) return null;
  const rawOrderId = String(row.order_id || '');
  const orderRef = String(row.order_ref || rawOrderId || '');
  const deliveryId = parseInt(row.delivery_id || row.id, 10) || 0;
  const deliveryRef = String(row.delivery_ref || ('DEL-' + deliveryId));

  const items = Array.isArray(row.items) ? row.items.map(it => ({
    id: parseInt(it.id, 10) || 0,
    product_id: parseInt(it.product_id, 10) || 0,
    product_name: String(it.product_name || 'Farm Produce Item'),
    quantity: parseInt(it.quantity, 10) || 1,
    unit: String(it.unit || 'item'),
    unit_price: it.unit_price !== null && it.unit_price !== undefined ? parseFloat(it.unit_price) : 0.0,
    total_price: it.total_price !== null && it.total_price !== undefined ? parseFloat(it.total_price) : 0.0,
    image_url: String(it.image_url || ''),
  })) : [];

  const customerLat = row.customer_lat !== null && row.customer_lat !== undefined ? parseFloat(row.customer_lat) : 0.0;
  const customerLng = row.customer_lng !== null && row.customer_lng !== undefined ? parseFloat(row.customer_lng) : 0.0;
  const etaMinutes = row.eta_minutes !== null && row.eta_minutes !== undefined ? parseInt(row.eta_minutes, 10) : 0;
  const assignedAt = row.assigned_at 
    ? new Date(row.assigned_at).toISOString() 
    : (row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString());

  const isPendingPickup = !row.goods_confirmed_by_driver && !row.picked_up_at && !row.driver_picked_up && ['assigned', 'accepted', 'awaiting_pickup'].includes(String(row.delivery_status || row.status || ''));
  const activeDeliveryStatus = isPendingPickup ? 'assigned' : String(row.delivery_status || row.status || 'assigned');
  const activeOrderStatus = isPendingPickup ? 'driver_assigned' : String(row.order_status || 'awaiting_driver_confirmation');

  return {
    ...row,
    id: deliveryId,
    delivery_id: deliveryId,
    deliveryId: deliveryId,
    delivery_ref: deliveryRef,
    deliveryRef: deliveryRef,
    delivery_status: activeDeliveryStatus,
    status: activeDeliveryStatus,
    order_id: rawOrderId,
    orderId: rawOrderId,
    order_ref: orderRef,
    orderRef: orderRef,
    order_number: orderRef || rawOrderId,
    orderNumber: orderRef || rawOrderId,
    order_status: activeOrderStatus,
    tracking_status: activeOrderStatus,
    delivery_address: String(row.delivery_address || 'Abia State, Nigeria'),
    delivery_city: String(row.delivery_city || 'Umuahia'),
    zone_name: String(row.zone_name || 'Umuahia Central'),
    customer_name: String(row.customer_name || 'Customer'),
    customer_phone: String(row.customer_phone || ''),
    customer_email: String(row.customer_email || ''),
    order_notes: String(row.order_notes || row.notes || ''),
    notes: String(row.notes || row.order_notes || ''),
    proof_note: String(row.proof_note || ''),
    proof_photo: String(row.proof_photo || ''),
    proof_photos: Array.isArray(row.proof_photos) ? row.proof_photos : [],
    item_proofs: Array.isArray(row.item_proofs) ? row.item_proofs : [],
    failure_reason: String(row.failure_reason || ''),
    payment_method: String(row.payment_method || 'cod'),
    payment_status: String(row.payment_status || 'pending'),
    assigned_at: assignedAt,
    assignedAt: assignedAt,
    accepted_at: row.accepted_at ? new Date(row.accepted_at).toISOString() : null,
    dispatched_at: row.dispatched_at ? new Date(row.dispatched_at).toISOString() : null,
    arrived_at: row.arrived_at ? new Date(row.arrived_at).toISOString() : null,
    delivered_at: row.delivered_at ? new Date(row.delivered_at).toISOString() : null,
    customer_confirmed_at: row.customer_confirmed_at ? new Date(row.customer_confirmed_at).toISOString() : null,
    customer_confirmed: Boolean(row.customer_confirmed),
    driver_confirmed_at: row.driver_confirmed_at ? new Date(row.driver_confirmed_at).toISOString() : null,
    driver_confirmed: Boolean(row.driver_confirmed),
    can_complete_delivery: Boolean(row.can_complete_delivery),
    eta_minutes: etaMinutes,
    estimated_duration_mins: etaMinutes,
    attempts: row.attempts !== null && row.attempts !== undefined ? parseInt(row.attempts, 10) : 0,
    order_total: row.order_total !== null && row.order_total !== undefined ? parseFloat(row.order_total) : 0.0,
    subtotal: row.subtotal !== null && row.subtotal !== undefined ? parseFloat(row.subtotal) : 0.0,
    delivery_fee: row.delivery_fee !== null && row.delivery_fee !== undefined ? parseFloat(row.delivery_fee) : 0.0,
    customer_lat: customerLat,
    customer_lng: customerLng,
    delivery_lat: customerLat,
    delivery_lng: customerLng,
    distance_km: row.distance_km !== null && row.distance_km !== undefined ? parseFloat(row.distance_km) : 0.0,
    items_count: items.length,
    items: items,
  };
}

// ── GET /api/driver/deliveries ───────────────────────────────────────
// List all active deliveries assigned to the logged-in driver
const getActiveDeliveries = async (req, res, next) => {
  try {
    const driverId = req.driver.id;
    const requestedStatus = (req.query.status || req.query.type || "").toLowerCase().trim();

    let statusFilter = "d.status NOT IN ('delivered', 'cancelled')";
    if (requestedStatus === "assigned" || requestedStatus === "new" || requestedStatus === "available") {
      statusFilter = "d.status = 'assigned'";
    } else if (requestedStatus === "active") {
      statusFilter = "d.status NOT IN ('delivered', 'cancelled', 'assigned')";
    }

    const result = await pool.query(
      `
      SELECT 
        d.id AS delivery_id,
        d.delivery_ref,
        d.status AS delivery_status,
        d.assigned_at,
        d.accepted_at,
        d.dispatched_at,
        d.eta_minutes,
        d.attempts,
        COALESCE(d.delivery_address, o.address) AS delivery_address,
        d.proof_note,
        d.proof_photo,
        d.proof_photos,
        d.item_proofs,
        d.arrived_at,
        d.failure_reason,
        COALESCE(d.customer_confirmed, o.customer_confirmed, false) AS customer_confirmed,
        COALESCE(d.customer_confirmed_at, o.customer_confirmed_at) AS customer_confirmed_at,
        COALESCE(o.driver_confirmed, false) AS driver_confirmed,
        o.driver_confirmed_at,
        (COALESCE(d.customer_confirmed, o.customer_confirmed, false) = true OR d.proof_photo IS NOT NULL OR d.status = 'delivered') AS can_complete_delivery,
        o.id AS order_id,
        o.order_ref,
        o.status AS order_status,
        o.tracking_status,
        o.total AS order_total,
        COALESCE(o.subtotal, o.total - COALESCE(o.delivery_fee, 0), o.total) AS subtotal,
        o.delivery_fee,
        o.payment_method,
        o.payment_status,
        o.notes AS order_notes,
        o.created_at AS order_created_at,
        COALESCE(o.customer_name, u.name, 'Customer') AS customer_name,
        COALESCE(o.customer_phone, u.phone, '') AS customer_phone,
        u.email AS customer_email,
        o.delivery_city,
        o.latitude AS customer_lat,
        o.longitude AS customer_lng,
        dz.zone_name,
        (
          SELECT JSON_AGG(
            JSON_BUILD_OBJECT(
              'id', oi.id,
              'product_id', oi.product_id,
              'product_name', COALESCE(oi.product_name, p.name),
              'quantity', oi.quantity,
              'unit_price', COALESCE(oi.unit_price, oi.price, 0),
              'total_price', COALESCE(oi.total_price, oi.subtotal, oi.quantity * COALESCE(oi.unit_price, oi.price, 0)),
              'unit', COALESCE(p.unit, 'item'),
              'image_url', p.image_url
            )
          )
          FROM order_items oi
          LEFT JOIN products p ON oi.product_id = p.id
          WHERE oi.order_id = o.id
        ) AS items
      FROM deliveries d
      JOIN orders o ON d.order_id = o.id
      LEFT JOIN users u ON o.customer_id = u.id OR o.user_id = u.id
      LEFT JOIN delivery_zones dz ON d.zone_id = dz.zone_id
      WHERE d.driver_id = $1
        AND ${statusFilter}
      ORDER BY 
        CASE 
          WHEN d.status = 'assigned' THEN 1
          WHEN d.status = 'arrived' THEN 2
          WHEN d.status = 'en_route' THEN 3
          WHEN d.status = 'picked_up' THEN 4
          WHEN d.status = 'awaiting_pickup' THEN 5
          WHEN d.status = 'accepted' THEN 6
          ELSE 7
        END,
        d.assigned_at DESC
      `,
      [driverId]
    );

    const deliveries = result.rows.map(formatDelivery);
    res.json({
      success: true,
      count: deliveries.length,
      deliveries,
      data: deliveries,
    });
  } catch (err) {
    console.error("Driver getActiveDeliveries error:", err.message);
    next(err);
  }
};

// ── GET /api/driver/deliveries/available (or /deliveries/new) ─────────
// List all new assigned or available deliveries for this driver
const getAvailableDeliveries = async (req, res, next) => {
  try {
    const driverId = req.driver.id;

    const result = await pool.query(
      `
      SELECT 
        d.id AS delivery_id,
        d.delivery_ref,
        d.status AS delivery_status,
        d.assigned_at,
        d.accepted_at,
        d.dispatched_at,
        d.eta_minutes,
        d.attempts,
        COALESCE(d.delivery_address, o.address) AS delivery_address,
        d.proof_note,
        d.proof_photo,
        d.proof_photos,
        d.item_proofs,
        d.arrived_at,
        d.failure_reason,
        COALESCE(d.customer_confirmed, o.customer_confirmed, false) AS customer_confirmed,
        COALESCE(d.customer_confirmed_at, o.customer_confirmed_at) AS customer_confirmed_at,
        COALESCE(o.driver_confirmed, false) AS driver_confirmed,
        o.driver_confirmed_at,
        (COALESCE(d.customer_confirmed, o.customer_confirmed, false) = true OR d.proof_photo IS NOT NULL OR d.status = 'delivered') AS can_complete_delivery,
        o.id AS order_id,
        o.order_ref,
        o.status AS order_status,
        o.tracking_status,
        o.total AS order_total,
        COALESCE(o.subtotal, o.total - COALESCE(o.delivery_fee, 0), o.total) AS subtotal,
        o.delivery_fee,
        o.payment_method,
        o.payment_status,
        o.notes AS order_notes,
        o.created_at AS order_created_at,
        COALESCE(o.customer_name, u.name, 'Customer') AS customer_name,
        COALESCE(o.customer_phone, u.phone, '') AS customer_phone,
        u.email AS customer_email,
        o.delivery_city,
        o.latitude AS customer_lat,
        o.longitude AS customer_lng,
        dz.zone_name,
        (
          SELECT JSON_AGG(
            JSON_BUILD_OBJECT(
              'id', oi.id,
              'product_id', oi.product_id,
              'product_name', COALESCE(oi.product_name, p.name),
              'quantity', oi.quantity,
              'unit_price', COALESCE(oi.unit_price, oi.price, 0),
              'total_price', COALESCE(oi.total_price, oi.subtotal, oi.quantity * COALESCE(oi.unit_price, oi.price, 0)),
              'unit', COALESCE(p.unit, 'item'),
              'image_url', p.image_url
            )
          )
          FROM order_items oi
          LEFT JOIN products p ON oi.product_id = p.id
          WHERE oi.order_id = o.id
        ) AS items
      FROM deliveries d
      JOIN orders o ON d.order_id = o.id
      LEFT JOIN users u ON o.customer_id = u.id OR o.user_id = u.id
      LEFT JOIN delivery_zones dz ON d.zone_id = dz.zone_id
      WHERE (
        (d.driver_id = $1 AND d.status = 'assigned')
        OR (d.driver_id IS NULL AND d.status IN ('assigned', 'awaiting_pickup', 'pending'))
      )
      AND d.status NOT IN ('delivered', 'cancelled', 'delivery_attempted', 'accepted', 'picked_up', 'en_route', 'arrived')
      ORDER BY 
        CASE 
          WHEN d.driver_id = $1 THEN 1
          ELSE 2
        END,
        d.assigned_at DESC, 
        d.id DESC
      `,
      [driverId]
    );

    const deliveries = result.rows.map(formatDelivery);
    res.json({
      success: true,
      count: deliveries.length,
      deliveries,
      data: deliveries,
    });
  } catch (err) {
    console.error("Driver getAvailableDeliveries error:", err.message);
    next(err);
  }
};

// ── GET /api/driver/deliveries/history ───────────────────────────────
// List completed & past deliveries for this driver
const getDeliveryHistory = async (req, res, next) => {
  try {
    const driverId = req.driver.id;
    const { page = 1, limit = 20, from_date, to_date } = req.query;
    const offset = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);

    const conditions = ["d.driver_id = $1", "d.status IN ('delivered', 'cancelled', 'delivery_attempted')"];
    const params = [driverId];

    if (from_date) {
      params.push(from_date);
      conditions.push(`d.delivered_at >= $${params.length}::timestamp OR d.created_at >= $${params.length}::timestamp`);
    }
    if (to_date) {
      params.push(to_date);
      conditions.push(`d.delivered_at <= $${params.length}::timestamp OR d.created_at <= $${params.length}::timestamp`);
    }

    const countResult = await pool.query(
      `SELECT COUNT(*) AS total FROM deliveries d WHERE ${conditions.join(" AND ")}`,
      params
    );
    const total = parseInt(countResult.rows[0].total) || 0;

    params.push(parseInt(limit), offset);
    const historyResult = await pool.query(
      `
      SELECT 
        d.id AS delivery_id,
        d.delivery_ref,
        d.status AS delivery_status,
        d.assigned_at,
        d.dispatched_at,
        d.delivered_at,
        COALESCE(d.delivery_address, o.address) AS delivery_address,
        d.proof_note,
        d.proof_photo,
        d.proof_photos,
        d.item_proofs,
        d.arrived_at,
        d.failure_reason,
        o.id AS order_id,
        o.order_ref,
        o.total AS order_total,
        o.payment_method,
        o.payment_status,
        COALESCE(o.customer_name, u.name, 'Customer') AS customer_name,
        COALESCE(o.customer_phone, u.phone, '') AS customer_phone,
        (
          SELECT JSON_AGG(
            JSON_BUILD_OBJECT(
              'product_name', COALESCE(oi.product_name, p.name),
              'quantity', oi.quantity,
              'unit', COALESCE(p.unit, 'item')
            )
          )
          FROM order_items oi
          LEFT JOIN products p ON oi.product_id = p.id
          WHERE oi.order_id = o.id
        ) AS items
      FROM deliveries d
      JOIN orders o ON d.order_id = o.id
      LEFT JOIN users u ON o.customer_id = u.id OR o.user_id = u.id
      WHERE ${conditions.join(" AND ")}
      ORDER BY COALESCE(d.delivered_at, d.updated_at, d.created_at) DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
      `,
      params
    );

    // Summary stats for driver
    const statsResult = await pool.query(
      `
      SELECT 
        COUNT(*) FILTER (WHERE status = 'delivered') AS total_delivered,
        COUNT(*) FILTER (WHERE status = 'delivery_attempted') AS total_failed,
        COUNT(*) AS total_history
      FROM deliveries
      WHERE driver_id = $1
      `,
      [driverId]
    );

    const stats = {
      total_delivered: parseInt(statsResult.rows[0]?.total_delivered, 10) || 0,
      total_failed: parseInt(statsResult.rows[0]?.total_failed, 10) || 0,
      total_history: parseInt(statsResult.rows[0]?.total_history, 10) || 0,
    };
    const deliveries = historyResult.rows.map(formatDelivery);

    res.json({
      success: true,
      page: parseInt(page, 10) || 1,
      limit: parseInt(limit, 10) || 20,
      total: parseInt(total, 10) || 0,
      stats,
      deliveries,
      data: deliveries,
    });
  } catch (err) {
    console.error("Driver getDeliveryHistory error:", err.message);
    next(err);
  }
};

// ── GET /api/driver/deliveries/:orderId ───────────────────────────────
// Get full details of a specific delivery
const getDeliveryDetails = async (req, res, next) => {
  try {
    const driverId = req.driver.id;
    const { orderId } = req.params;

    const result = await pool.query(
      `
      SELECT 
        d.id AS delivery_id,
        d.delivery_ref,
        d.status AS delivery_status,
        d.assigned_at,
        d.accepted_at,
        d.dispatched_at,
        d.delivered_at,
        d.eta_minutes,
        d.attempts,
        COALESCE(d.delivery_address, o.address) AS delivery_address,
        d.proof_note,
        d.proof_photo,
        d.proof_photos,
        d.item_proofs,
        d.arrived_at,
        d.failure_reason,
        COALESCE(d.customer_confirmed, o.customer_confirmed, false) AS customer_confirmed,
        COALESCE(d.customer_confirmed_at, o.customer_confirmed_at) AS customer_confirmed_at,
        COALESCE(o.driver_confirmed, false) AS driver_confirmed,
        o.driver_confirmed_at,
        (COALESCE(d.customer_confirmed, o.customer_confirmed, false) = true OR d.proof_photo IS NOT NULL OR d.status = 'delivered') AS can_complete_delivery,
        o.id AS order_id,
        o.order_ref,
        o.status AS order_status,
        o.tracking_status,
        o.total AS order_total,
        COALESCE(o.subtotal, o.total - COALESCE(o.delivery_fee, 0), o.total) AS subtotal,
        o.delivery_fee,
        o.payment_method,
        o.payment_status,
        o.notes AS order_notes,
        o.created_at AS order_created_at,
        COALESCE(o.customer_name, u.name, 'Customer') AS customer_name,
        COALESCE(o.customer_phone, u.phone, '') AS customer_phone,
        u.email AS customer_email,
        o.delivery_city,
        o.latitude AS customer_lat,
        o.longitude AS customer_lng,
        dz.zone_name,
        dz.delivery_fee AS zone_delivery_fee,
        (
          SELECT JSON_AGG(
            JSON_BUILD_OBJECT(
              'id', oi.id,
              'product_id', oi.product_id,
              'product_name', COALESCE(oi.product_name, p.name),
              'quantity', oi.quantity,
              'unit_price', COALESCE(oi.unit_price, oi.price, 0),
              'total_price', COALESCE(oi.total_price, oi.subtotal, oi.quantity * COALESCE(oi.unit_price, oi.price, 0)),
              'unit', COALESCE(p.unit, 'item'),
              'image_url', p.image_url
            )
          )
          FROM order_items oi
          LEFT JOIN products p ON oi.product_id = p.id
          WHERE oi.order_id = o.id
        ) AS items
      FROM deliveries d
      JOIN orders o ON d.order_id = o.id
      LEFT JOIN users u ON o.customer_id = u.id OR o.user_id = u.id
      LEFT JOIN delivery_zones dz ON d.zone_id = dz.zone_id
      WHERE (d.driver_id = $1 OR d.driver_id IS NULL)
        AND (d.order_id = $2 OR d.id::text = $2 OR d.delivery_ref = $2 OR o.order_ref = $2)
      LIMIT 1
      `,
      [driverId, orderId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Delivery not found or not assigned to you",
      });
    }

    const formatted = formatDelivery(result.rows[0]);
    res.json({
      success: true,
      delivery: formatted,
      data: formatted,
    });
  } catch (err) {
    console.error("Driver getDeliveryDetails error:", err.message);
    next(err);
  }
};

// ── PATCH /api/driver/deliveries/:orderId/status ──────────────────────
// Update delivery status (Accepted, Out for Delivery, Delivered, Failed)
const updateDeliveryStatus = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const driverId = req.driver.id;
    const { orderId } = req.params;
    const {
      status,
      proof_note,
      proof_photo,
      photo,
      note,
      failure_reason,
      reason,
      eta_minutes,
    } = req.body;

    if (!status) {
      return res.status(400).json({ message: "Delivery status is required" });
    }

    const rawStatus = String(status).toLowerCase().trim();
    const deliveryStatus = normalizeStatus(rawStatus);

    await client.query("BEGIN");

    // Fetch delivery record
    const deliveryCheck = await client.query(
      `
      SELECT d.*, o.id AS actual_order_id, o.status AS current_order_status
      FROM deliveries d
      JOIN orders o ON d.order_id = o.id
      WHERE d.driver_id = $1
        AND (d.order_id = $2 OR d.id::text = $2 OR d.delivery_ref = $2 OR o.order_ref = $2)
      FOR UPDATE OF d
      `,
      [driverId, orderId]
    );

    if (deliveryCheck.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Delivery not found or not mapped to you" });
    }

    const delivery = deliveryCheck.rows[0];
    const actualOrderId = delivery.actual_order_id;
    const finalProofNote = proof_note || note || null;
    let finalProofPhoto = proof_photo || photo || req.body.photo_url || req.body.photoUrl || req.body.image || req.body.imageUrl || req.body.image_url || req.body.url || (Array.isArray(req.body.proof_photos) ? req.body.proof_photos[0] : null);
    if (finalProofPhoto && typeof finalProofPhoto === 'string' && (finalProofPhoto.startsWith('data:image') || finalProofPhoto.length > 500)) {
      try {
        let base64Data = finalProofPhoto;
        let ext = ".jpg";
        if (finalProofPhoto.startsWith('data:image')) {
          const matches = finalProofPhoto.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
          if (matches && matches.length === 3) {
            ext = `.${matches[1].toLowerCase() === 'jpeg' ? 'jpg' : matches[1].toLowerCase()}`;
            base64Data = matches[2];
          }
        }
        const crypto = require("crypto");
        const fs = require("fs");
        const path = require("path");
        const filename = `POD_${Date.now()}_${crypto.randomBytes(4).toString("hex")}${ext}`;
        const proofUploadDir = path.join(__dirname, "../../uploads/proofs");
        if (!fs.existsSync(proofUploadDir)) fs.mkdirSync(proofUploadDir, { recursive: true });
        fs.writeFileSync(path.join(proofUploadDir, filename), Buffer.from(base64Data, "base64"));
        const baseUrl = process.env.SERVER_BASE_URL || `${req.protocol}://${req.get("host")}`;
        finalProofPhoto = `${baseUrl}/uploads/proofs/${filename}`;
      } catch (podErr) {
        console.warn("Could not save base64 proof photo to disk:", podErr.message);
      }
    }
    const finalProofPhotos = Array.isArray(req.body.proof_photos)
      ? JSON.stringify(req.body.proof_photos)
      : (finalProofPhoto ? JSON.stringify([finalProofPhoto]) : null);
    const finalItemProofs = Array.isArray(req.body.item_proofs)
      ? JSON.stringify(req.body.item_proofs)
      : null;
    const finalFailureReason = failure_reason || reason || null;

    let orderStatus = "processing";
    let trackingStatus = "in_transit";
    let dispatchedAt = delivery.dispatched_at;
    let deliveredAt = delivery.delivered_at;
    let acceptedAt = delivery.accepted_at;
    let arrivedAt = delivery.arrived_at;

    if (rawStatus === "accepted" || deliveryStatus === "accepted") {
      acceptedAt = new Date();
      orderStatus = "driver_assigned";
      trackingStatus = "driver_assigned";
    } else if (deliveryStatus === "awaiting_pickup") {
      orderStatus = "packed_ready";
      trackingStatus = "packed_ready";
    } else if (deliveryStatus === "picked_up") {
      // Driver confirms they have physically collected/picked up goods at the store
      const pickupTime = new Date();
      await client.query(
        `UPDATE deliveries 
         SET picked_up_at = $1, 
             goods_confirmed_by_driver = true,
             picked_up_by = $2,
             status = 'picked_up',
             updated_at = NOW()
         WHERE id = $3`,
        [pickupTime, driverId, delivery.id]
      );
      await client.query(
        `UPDATE orders
         SET driver_picked_up = true,
             picked_up_at = $1,
             status = 'picked_up',
             tracking_status = 'picked_up',
             updated_at = NOW()
         WHERE id = $2`,
        [pickupTime, actualOrderId]
      );
      await logOrderAudit(client, {
        order_id: actualOrderId,
        actor_id: driverId,
        actor_name: req.driver.name,
        actor_role: 'driver',
        action: 'driver_picked_up_goods',
        previous_state: delivery.status,
        new_state: 'picked_up',
        metadata: { delivery_id: delivery.id, confirmed_at: pickupTime }
      });
      orderStatus = "picked_up";
      trackingStatus = "picked_up";
    } else if (deliveryStatus === "en_route") {
      // Order moves to In Transit: ensure driver pickup of goods is recorded
      const pickupTime = delivery.picked_up_at || new Date();
      dispatchedAt = dispatchedAt || new Date();
      orderStatus = "shipped";
      trackingStatus = "out_for_delivery";

      await client.query(
        `UPDATE deliveries 
         SET picked_up_at = COALESCE(picked_up_at, $1), 
             goods_confirmed_by_driver = true,
             picked_up_by = COALESCE(picked_up_by, $2),
             dispatched_at = COALESCE(dispatched_at, $3),
             status = 'en_route',
             updated_at = NOW()
         WHERE id = $4`,
        [pickupTime, driverId, dispatchedAt, delivery.id]
      );
      await client.query(
        `UPDATE orders
         SET driver_picked_up = true,
             picked_up_at = COALESCE(picked_up_at, $1),
             status = 'shipped',
             tracking_status = 'out_for_delivery',
             updated_at = NOW()
         WHERE id = $2`,
        [pickupTime, actualOrderId]
      );

      // Mark driver as currently on active delivery
      await client.query(
        "UPDATE driver_availability SET is_on_delivery = true, last_toggled_at = NOW() WHERE driver_id = $1",
        [driverId]
      );
      await client.query(
        "UPDATE drivers SET status = 'on_delivery' WHERE id = $1 AND status != 'suspended'",
        [driverId]
      );
      await logOrderAudit(client, {
        order_id: actualOrderId,
        actor_id: driverId,
        actor_name: req.driver.name,
        actor_role: 'driver',
        action: 'driver_en_route',
        previous_state: delivery.status,
        new_state: 'en_route',
        metadata: { delivery_id: delivery.id, dispatched_at: dispatchedAt }
      });
    } else if (deliveryStatus === "arrived") {
      arrivedAt = new Date();
      orderStatus = "driver_arrived";
      trackingStatus = "driver_arrived";
      await logOrderAudit(client, {
        order_id: actualOrderId,
        actor_id: driverId,
        actor_name: req.driver.name,
        actor_role: 'driver',
        action: 'driver_arrived',
        previous_state: delivery.status,
        new_state: 'arrived',
        metadata: { delivery_id: delivery.id, arrived_at: arrivedAt }
      });
    } else if (deliveryStatus === "delivered") {
      deliveredAt = new Date();
      orderStatus = "delivered";
      trackingStatus = "delivered";

      // ── Calculate Driver Earnings According to Zone ──
      let zoneId = delivery.zone_id;
      if (!zoneId) {
        const ordZoneRes = await client.query("SELECT zone_id, delivery_fee FROM orders WHERE id = $1", [actualOrderId]);
        if (ordZoneRes.rows.length > 0) {
          zoneId = ordZoneRes.rows[0].zone_id;
        }
      }

      let commission = 0;
      let zoneName = "Standard Delivery Drop";
      let customerDeliveryFee = 1000;

      if (zoneId) {
        const zoneRes = await client.query(
          "SELECT zone_name, delivery_fee, driver_earning_fee, driver_commission_percent FROM delivery_zones WHERE zone_id = $1",
          [zoneId]
        );
        if (zoneRes.rows.length > 0) {
          const z = zoneRes.rows[0];
          zoneName = z.zone_name || zoneName;
          customerDeliveryFee = parseFloat(z.delivery_fee) || 1000;
          if (parseFloat(z.driver_earning_fee) > 0) {
            commission = parseFloat(z.driver_earning_fee);
          } else if (parseFloat(z.driver_commission_percent) > 0) {
            commission = Math.round(customerDeliveryFee * (parseFloat(z.driver_commission_percent) / 100));
          }
        }
      }

      // Fallback if zone not configured or 0
      if (!commission || commission <= 0) {
        commission = parseFloat(req.driver.commission_per_delivery) || 700;
      }

      // Increment driver stats & earnings
      await client.query(
        `
        UPDATE drivers 
        SET 
          total_deliveries = total_deliveries + 1,
          total_earnings = total_earnings + $1,
          status = 'active',
          updated_at = NOW()
        WHERE id = $2
        `,
        [commission, driverId]
      );

      // Record commission entry for this delivery drop
      try {
        await client.query("SAVEPOINT sp_commission");
        await client.query(
          `
          INSERT INTO driver_commissions (
            driver_id, week_start, week_end, commission_per_delivery, total_earned, unpaid_balance, 
            status, deliveries, trips, base_amount, net_payout, created_at
          )
          VALUES (
            $1, 
            date_trunc('week', NOW())::date, 
            (date_trunc('week', NOW()) + interval '6 days')::date,
            $2, $2, $2, 'pending', 1, 1, $2, $2, NOW()
          )
          ON CONFLICT (driver_id, week_start) DO UPDATE SET
            deliveries = COALESCE(driver_commissions.deliveries, 0) + 1,
            trips = COALESCE(driver_commissions.trips, 0) + 1,
            total_earned = COALESCE(driver_commissions.total_earned, 0) + EXCLUDED.total_earned,
            unpaid_balance = COALESCE(driver_commissions.unpaid_balance, 0) + EXCLUDED.unpaid_balance,
            base_amount = COALESCE(driver_commissions.base_amount, 0) + EXCLUDED.base_amount,
            net_payout = COALESCE(driver_commissions.net_payout, 0) + EXCLUDED.net_payout,
            commission_per_delivery = EXCLUDED.commission_per_delivery
          `,
          [driverId, commission]
        );
        await client.query("RELEASE SAVEPOINT sp_commission");
      } catch (commErr) {
        await client.query("ROLLBACK TO SAVEPOINT sp_commission").catch(() => {});
        console.warn("Driver commission drop record non-fatal warning:", commErr.message);
      }

      // Record in driver_wallet_ledger
      const delRef = delivery.delivery_ref || `DEL-${delivery.id}`;
      try {
        await client.query("SAVEPOINT sp_wallet_ledger");
        await client.query(
          `
          INSERT INTO driver_wallet_ledger (
            driver_id, type, category, amount, reference, description, performed_by, created_at
          )
          VALUES ($1, 'credit', 'delivery_commission', $2, $3, $4, $5, NOW())
          `,
          [
            driverId,
            commission,
            delRef,
            `Zone Delivery Drop: ${zoneName} (Customer Fee: ₦${customerDeliveryFee.toLocaleString()} → Driver Earning: ₦${commission.toLocaleString()})`,
            null,
          ]
        );
        await client.query("RELEASE SAVEPOINT sp_wallet_ledger");
      } catch (wErr) {
        await client.query("ROLLBACK TO SAVEPOINT sp_wallet_ledger").catch(() => {});
        console.warn("Driver wallet ledger record non-fatal warning:", wErr.message);
      }

      // ── DOUBLE-ENTRY POSTINGS FOR ORDER DELIVERY & COGS ───────────
      try {
        await client.query("SAVEPOINT sp_double_entry");
        // 1. Double-Entry Delivery Commission: Dr Delivery Expense (5210), Cr Driver Wallet Payable (2120)
        await postGeneralJournal(client, {
          source_module: "driver_wallet",
          source_ref: delRef,
          journal_ref: `JRN-COMM-${delRef}`,
          debit_account: COA.EXPENSE_DELIVERY_COMMISSION,
          credit_account: COA.DRIVER_WALLET_PAYABLE,
          amount: commission,
          narration: `Driver Commission Drop for ${req.driver.name || 'Driver'} - ${zoneName}`,
          user_id: null,
        });

        // 2. Compute COGS from order items
        const itemsRes = await client.query(
          `SELECT oi.product_id, oi.product_name, oi.quantity, COALESCE(p.cost_price, p.unit_price, 0) AS cost_price 
           FROM order_items oi 
           LEFT JOIN products p ON oi.product_id = p.id 
           WHERE oi.order_id = $1`,
          [actualOrderId]
        );

        for (const item of itemsRes.rows) {
          const qty = parseInt(item.quantity) || 1;
          const unitCost = parseFloat(item.cost_price) || 0;
          if (qty > 0 && unitCost > 0) {
            await postInventoryDoubleEntry(client, {
              event_type: "cogs",
              product_id: item.product_id,
              product_name: item.product_name,
              warehouse_id: null,
              quantity: qty,
              unit_cost: unitCost,
              debit_account: COA.COGS_PRODUCE,
              credit_account: COA.INVENTORY_FINISHED_GOODS,
              reference: `ORD-${actualOrderId}`,
              narration: `Delivered Order COGS: ${item.product_name} (Qty: ${qty})`,
              user_id: null,
            });
          }
        }
        await client.query("RELEASE SAVEPOINT sp_double_entry");
      } catch (finErr) {
        await client.query("ROLLBACK TO SAVEPOINT sp_double_entry").catch(() => {});
        console.warn("Delivery completion double-entry non-fatal warning:", finErr.message);
      }

      // 3. Ensure order stock is deducted if not already deducted at packing
      try {
        await client.query("SAVEPOINT sp_stock_deduct");
        await deductOrderStock(client, actualOrderId, driverId, 'DRIVER-DROP');
        await client.query("RELEASE SAVEPOINT sp_stock_deduct");
      } catch (stockErr) {
        await client.query("ROLLBACK TO SAVEPOINT sp_stock_deduct").catch(() => {});
        console.warn("Delivery completion stock deduction non-fatal warning:", stockErr.message);
      }

      // Store driver_commission_amount on delivery record
      await client.query(
        "UPDATE deliveries SET driver_commission_amount = $1 WHERE id = $2",
        [commission, delivery.id]
      );

      // Driver is free from active delivery
      await client.query(
        "UPDATE driver_availability SET is_on_delivery = false, last_toggled_at = NOW() WHERE driver_id = $1",
        [driverId]
      );
      await logOrderAudit(client, {
        order_id: actualOrderId,
        actor_id: driverId,
        actor_name: req.driver.name,
        actor_role: 'driver',
        action: 'driver_delivered',
        previous_state: delivery.status,
        new_state: 'delivered',
        metadata: { delivery_id: delivery.id, delivered_at: deliveredAt }
      });
    } else if (deliveryStatus === "delivery_attempted") {
      orderStatus = "delivery_attempted";
      trackingStatus = "failed_attempt";
      await client.query(
        "UPDATE driver_availability SET is_on_delivery = false, last_toggled_at = NOW() WHERE driver_id = $1",
        [driverId]
      );
      await logOrderAudit(client, {
        order_id: actualOrderId,
        actor_id: driverId,
        actor_name: req.driver.name,
        actor_role: 'driver',
        action: 'delivery_attempted',
        previous_state: delivery.status,
        new_state: 'delivery_attempted',
        metadata: { delivery_id: delivery.id, reason: finalFailureReason }
      });
    }

    // Update deliveries table
    const dbDeliveryStatus = deliveryStatus;
    const updateDeliveryQuery = `
      UPDATE deliveries 
      SET 
        status = $1::varchar,
        accepted_at = COALESCE($2, accepted_at),
        dispatched_at = COALESCE($3, dispatched_at),
        delivered_at = COALESCE($4, delivered_at),
        arrived_at = COALESCE($5, arrived_at),
        proof_note = COALESCE($6, proof_note),
        proof_photo = COALESCE($7, proof_photo),
        proof_photos = COALESCE($8::jsonb, proof_photos),
        item_proofs = COALESCE($9::jsonb, item_proofs),
        failure_reason = COALESCE($10, failure_reason),
        eta_minutes = COALESCE($11, eta_minutes),
        attempts = CASE WHEN $1::varchar = 'delivery_attempted' THEN attempts + 1 ELSE attempts END,
        updated_at = NOW()
      WHERE id = $12
      RETURNING *
    `;

    const updatedDeliveryResult = await client.query(updateDeliveryQuery, [
      dbDeliveryStatus,
      acceptedAt,
      dispatchedAt,
      deliveredAt,
      arrivedAt,
      finalProofNote,
      finalProofPhoto,
      finalProofPhotos,
      finalItemProofs,
      finalFailureReason,
      eta_minutes || null,
      delivery.id,
    ]);

    // Sync orders table
    await client.query(
      `
      UPDATE orders 
      SET 
        status = $1::varchar,
        tracking_status = $2::varchar,
        driver_confirmed = CASE WHEN $1::varchar = 'delivered' THEN true ELSE driver_confirmed END,
        driver_confirmed_at = CASE WHEN $1::varchar = 'delivered' THEN COALESCE(driver_confirmed_at, NOW()) ELSE driver_confirmed_at END,
        driver_arrived_at = CASE WHEN $1::varchar = 'arrived' OR $2::varchar = 'driver_arrived' THEN COALESCE(driver_arrived_at, NOW()) ELSE driver_arrived_at END,
        delivered_at = CASE WHEN $1::varchar = 'delivered' OR $2::varchar = 'delivered' THEN COALESCE(delivered_at, NOW()) ELSE delivered_at END,
        proof_photo = COALESCE($3, proof_photo),
        proof_photos = COALESCE($4::jsonb, proof_photos),
        item_proofs = COALESCE($5::jsonb, item_proofs),
        proof_note = COALESCE($6, proof_note),
        updated_at = NOW()
      WHERE id = $7
      `,
      [orderStatus, trackingStatus, finalProofPhoto, finalProofPhotos, finalItemProofs, finalProofNote, actualOrderId]
    );

    // Sync delivery_assignments table
    await client.query(
      `
      UPDATE delivery_assignments 
      SET 
        driver_response = CASE 
          WHEN $1::varchar = 'assigned' OR $1::varchar = 'awaiting_pickup' OR $1::varchar = 'en_route' OR $1::varchar = 'arrived' OR $1::varchar = 'delivered' THEN 'accepted'
          WHEN $1::varchar = 'cancelled' THEN 'rejected'
          ELSE driver_response
        END,
        response_at = NOW(),
        rejection_reason = COALESCE($2, rejection_reason)
      WHERE delivery_id = $3 AND driver_id = $4
      `,
      [deliveryStatus, finalFailureReason, delivery.id, driverId]
    );

    await client.query("COMMIT");

    // Asynchronously notify customer across all channels (In-App Notification, SMS, Email)
    (async () => {
      try {
        const orderUserRes = await pool.query(
          `SELECT o.id, o.order_ref, o.address, o.total, o.user_id, o.customer_id, u.name, u.email, u.phone, drv.name as driver_name, drv.vehicle_type
           FROM orders o
           LEFT JOIN users u ON o.customer_id = u.id OR o.user_id = u.id
           LEFT JOIN drivers drv ON drv.id = $1
           WHERE o.id = $2`,
          [driverId, actualOrderId]
        );
        if (orderUserRes.rows.length > 0) {
          const row = orderUserRes.rows[0];
          const customerUserId = row.user_id || row.customer_id;
          const displayOrderRef = row.order_ref || row.id;
          const driverDisplayName = row.driver_name || "Courier";

          // 1. In-App Customer Notification (persisted in notifications table)
          if (customerUserId) {
            let notifTitle = null;
            let notifBody = null;

            if (deliveryStatus === "arrived") {
              notifTitle = "Courier Has Arrived! 📍";
              notifBody = `Your delivery courier ${driverDisplayName} has arrived at your location with order #${displayOrderRef}. Please step out to receive and inspect your package.`;
            } else if (deliveryStatus === "en_route") {
              notifTitle = "Order Out for Delivery 🚚";
              notifBody = `Your courier ${driverDisplayName} is on the way with order #${displayOrderRef}.`;
            } else if (deliveryStatus === "delivered") {
              notifTitle = "Order Delivered 🎉";
              notifBody = `Order #${displayOrderRef} has been delivered successfully. Thank you for choosing Bems Farms!`;
            } else if (deliveryStatus === "delivery_attempted") {
              notifTitle = "Delivery Attempted ⚠️";
              notifBody = `Our courier reached your address for order #${displayOrderRef} but could not reach you. Please contact support to reschedule.`;
            }

            if (notifTitle && notifBody) {
              await pool.query(
                `INSERT INTO notifications (user_id, type, title, body, reference_type, reference_id, is_read, created_at)
                 VALUES ($1, 'delivery_update', $2, $3, 'order', $4, FALSE, NOW())`,
                [customerUserId, notifTitle, notifBody, delivery.id]
              ).catch((e) => console.warn("Customer in-app notification insert warning:", e.message));
            }
          }

          // 2. Customer SMS via Termii
          if (row.phone) {
            try {
              const { SMS } = require("../services/smsService");
              if (deliveryStatus === "arrived") {
                await SMS.courierArrived(row.phone, row.name || "Customer", displayOrderRef, driverDisplayName);
              } else if (deliveryStatus === "en_route") {
                await SMS.outForDelivery(row.phone, row.name || "Customer", displayOrderRef);
              } else if (deliveryStatus === "delivered") {
                await SMS.orderDelivered(row.phone, row.name || "Customer", displayOrderRef);
              } else if (deliveryStatus === "delivery_attempted") {
                await SMS.customerUnavailable(row.phone, row.name || "Customer", displayOrderRef);
              }
            } catch (smsErr) {
              console.warn("Milestone SMS notification failed:", smsErr.message);
            }
          }

          // 3. Customer Email Notification
          if (row.email) {
            try {
              const emailService = require("../services/emailService");
              await emailService.sendOrderStatusEmail(
                { id: row.id, order_ref: row.order_ref, address: row.address, total: row.total },
                { name: row.name, email: row.email },
                rawStatus,
                {
                  delivery_ref: delivery.delivery_ref,
                  driver_name: row.driver_name,
                  vehicle_type: row.vehicle_type,
                  eta_minutes,
                }
              );
            } catch (emailErr) {
              console.warn("Milestone email notification failed:", emailErr.message);
            }
          }
        }
      } catch (err) {
        console.warn("Milestone customer notification processing error:", err.message);
      }
    })();

    const formatted = formatDelivery(updatedDeliveryResult.rows[0]);
    res.json({
      success: true,
      message: `Delivery status updated to ${rawStatus}`,
      delivery: formatted,
      data: formatted,
      order_id: actualOrderId,
      orderId: actualOrderId,
      status: rawStatus,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Driver updateDeliveryStatus error:", err.message);
    next(err);
  } finally {
    client.release();
  }
};

// ── POST /api/driver/deliveries/:orderId/accept ──────────────────────
// Explicitly accept an assigned delivery drop
const acceptDelivery = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const driverId = req.driver.id;
    const { orderId } = req.params;

    await client.query("BEGIN");

    const deliveryRes = await client.query(
      `
      SELECT d.*, o.order_ref, o.id as actual_order_id
      FROM deliveries d
      JOIN orders o ON d.order_id = o.id
      WHERE (d.order_id = $1 OR o.order_ref = $1 OR d.id::text = $1 OR d.delivery_ref = $1)
        AND (d.driver_id = $2 OR d.driver_id IS NULL)
      FOR UPDATE
      `,
      [orderId, driverId]
    );

    if (deliveryRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ success: false, status: "error", message: "Assigned delivery not found for this driver" });
    }

    const delivery = deliveryRes.rows[0];

    await client.query(
      `
      UPDATE deliveries 
      SET 
        driver_id = $2,
        status = 'assigned',
        accepted_at = NOW(),
        goods_confirmed_by_driver = false,
        picked_up_at = NULL,
        updated_at = NOW()
      WHERE id = $1
      `,
      [delivery.id, driverId]
    );

    await client.query(
      `UPDATE orders 
       SET status = 'driver_assigned',
           tracking_status = 'driver_assigned',
           delivery_status = 'assigned',
           driver_id = $2,
           driver_accepted_at = NOW(),
           driver_response = 'accepted',
           driver_picked_up = false,
           picked_up_at = NULL,
           updated_at = NOW() 
       WHERE id = $1`,
      [delivery.actual_order_id, driverId]
    );

    // Update assignment record if exists or insert one
    await client.query(
      `
      INSERT INTO delivery_assignments (delivery_id, driver_id, assignment_type, driver_response, response_at, created_at)
      VALUES ($1, $2, 'manual', 'accepted', NOW(), NOW())
      ON CONFLICT DO NOTHING
      `,
      [delivery.id, driverId]
    ).catch(() => {});
    await client.query(
      `
      UPDATE delivery_assignments 
      SET driver_response = 'accepted', response_at = NOW()
      WHERE delivery_id = $1 AND driver_id = $2
      `,
      [delivery.id, driverId]
    );

    await logOrderAudit(client, {
      order_id: delivery.actual_order_id,
      actor_id: driverId,
      actor_name: req.driver.name,
      actor_role: 'driver',
      action: 'driver_accepted_delivery',
      previous_state: 'packed',
      new_state: 'driver_assigned',
      metadata: { delivery_id: delivery.id }
    });

    await client.query("COMMIT");

    const orderRef = delivery.order_ref || delivery.actual_order_id;
    const deliveryPayload = {
      id: parseInt(delivery.id, 10) || 0,
      delivery_id: parseInt(delivery.id, 10) || 0,
      deliveryId: parseInt(delivery.id, 10) || 0,
      order_id: delivery.actual_order_id,
      orderId: delivery.actual_order_id,
      order_ref: orderRef,
      orderRef: orderRef,
      order_number: orderRef,
      orderNumber: orderRef,
      status: "assigned",
      delivery_status: "assigned",
      order_status: "driver_assigned",
      tracking_status: "driver_assigned",
      goods_confirmed: false,
    };

    res.json({
      success: true,
      status: "assigned",
      delivery_status: "assigned",
      order_status: "driver_assigned",
      tracking_status: "driver_assigned",
      message: "Delivery accepted successfully. Please proceed to store to collect goods.",
      delivery_id: parseInt(delivery.id, 10) || 0,
      deliveryId: parseInt(delivery.id, 10) || 0,
      order_id: delivery.actual_order_id,
      orderId: delivery.actual_order_id,
      order_ref: orderRef,
      orderRef: orderRef,
      order_number: orderRef,
      orderNumber: orderRef,
      delivery: deliveryPayload,
      data: deliveryPayload,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("acceptDelivery error:", err.message);
    next(err);
  } finally {
    client.release();
  }
};

// ── POST /api/driver/deliveries/:orderId/decline ─────────────────────
// Decline an assigned delivery drop with reason
const declineDelivery = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const driverId = req.driver.id;
    const { orderId } = req.params;
    const { reason = "unavailable", notes } = req.body;

    await client.query("BEGIN");

    const deliveryRes = await client.query(
      `
      SELECT d.*, o.order_ref, o.id as actual_order_id
      FROM deliveries d
      JOIN orders o ON d.order_id = o.id
      WHERE (d.order_id = $1 OR o.order_ref = $1 OR d.id::text = $1 OR d.delivery_ref = $1)
        AND (d.driver_id = $2 OR d.driver_id IS NULL)
      FOR UPDATE
      `,
      [orderId, driverId]
    );

    if (deliveryRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ success: false, status: "error", message: "Assigned delivery not found for this driver" });
    }

    const delivery = deliveryRes.rows[0];

    // Remove driver so it returns to unassigned queue for other drivers
    await client.query(
      `
      UPDATE deliveries 
      SET 
        driver_id = NULL,
        status = 'awaiting_pickup',
        declined_at = NOW(),
        decline_reason = $1,
        declined_by = COALESCE(declined_by, '[]'::jsonb) || JSON_BUILD_OBJECT('driver_id', $2::int, 'reason', $1::text, 'declined_at', NOW())::jsonb,
        updated_at = NOW()
      WHERE id = $3
      `,
      [`${reason}${notes ? `: ${notes}` : ""}`, driverId, delivery.id]
    );

    // Update assignment record if exists
    await client.query(
      `
      UPDATE delivery_assignments 
      SET driver_response = 'rejected', rejection_reason = $1, response_at = NOW()
      WHERE delivery_id = $2 AND driver_id = $3
      `,
      [reason, delivery.id, driverId]
    );

    await client.query("COMMIT");

    // Section 23: Re-dispatch to next eligible driver immediately, excluding this driver
    try {
      autoAssignClosestDriver(delivery.actual_order_id, undefined, [driverId]).catch(e =>
        console.warn(`[declineDelivery] Immediate next-driver dispatch warning:`, e.message)
      );
    } catch (e) {}

    const orderRef = delivery.order_ref || delivery.actual_order_id;
    res.json({
      success: true,
      status: "success",
      message: "Delivery declined. Returned to dispatch pool for reassignment.",
      order_id: delivery.actual_order_id,
      orderId: delivery.actual_order_id,
      order_ref: orderRef,
      orderRef: orderRef,
      order_number: orderRef,
      orderNumber: orderRef,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("declineDelivery error:", err.message);
    next(err);
  } finally {
    client.release();
  }
};

// ── POST /api/driver/deliveries/:orderId/confirm-pickup ──────────────
// Driver confirms they have arrived at store and physically collected/picked up goods
const confirmPickup = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const driverId = req.driver.id;
    const { orderId } = req.params;
    const { note } = req.body;

    await client.query("BEGIN");

    const deliveryCheck = await client.query(
      `
      SELECT d.*, o.id AS actual_order_id, o.order_ref, o.status AS current_order_status
      FROM deliveries d
      JOIN orders o ON d.order_id = o.id
      WHERE d.driver_id = $1
        AND (d.order_id = $2 OR d.id::text = $2 OR d.delivery_ref = $2 OR o.order_ref = $2)
      FOR UPDATE OF d
      `,
      [driverId, orderId]
    );

    if (deliveryCheck.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Delivery not found or not assigned to you" });
    }

    const delivery = deliveryCheck.rows[0];
    const actualOrderId = delivery.actual_order_id;
    const pickupTime = new Date();

    // Update delivery record
    await client.query(
      `UPDATE deliveries
       SET status = 'picked_up',
           picked_up_at = $1,
           goods_confirmed_by_driver = true,
           picked_up_by = $2,
           proof_note = COALESCE($3, proof_note),
           updated_at = NOW()
       WHERE id = $4`,
      [pickupTime, driverId, note || null, delivery.id]
    );

    // Update order record
    await client.query(
      `UPDATE orders
       SET driver_picked_up = true,
           picked_up_at = $1,
           status = 'picked_up',
           tracking_status = 'picked_up',
           updated_at = NOW()
       WHERE id = $2`,
      [pickupTime, actualOrderId]
    );

    // Log workflow audit
    await logOrderAudit(client, {
      order_id: actualOrderId,
      actor_id: driverId,
      actor_name: req.driver.name,
      actor_role: 'driver',
      action: 'driver_confirmed_goods_pickup',
      previous_state: delivery.status,
      new_state: 'picked_up',
      metadata: { delivery_id: delivery.id, confirmed_at: pickupTime, note }
    });

    await client.query("COMMIT");

    const orderRef = delivery.order_ref || actualOrderId;
    const deliveryPayload = {
      id: delivery.id,
      delivery_id: delivery.id,
      deliveryId: delivery.id,
      order_id: actualOrderId,
      orderId: actualOrderId,
      order_ref: orderRef,
      orderRef: orderRef,
      order_number: orderRef,
      orderNumber: orderRef,
      status: "picked_up",
      delivery_status: "picked_up",
      order_status: "picked_up",
      picked_up_at: pickupTime,
      goods_confirmed: true,
    };

    res.json({
      success: true,
      status: "success",
      message: `Goods pickup confirmed for Order #${orderRef}. Ready to proceed with transit.`,
      delivery_id: delivery.id,
      deliveryId: delivery.id,
      order_id: actualOrderId,
      orderId: actualOrderId,
      order_ref: orderRef,
      orderRef: orderRef,
      order_number: orderRef,
      orderNumber: orderRef,
      delivery_status: "picked_up",
      order_status: "picked_up",
      picked_up_at: pickupTime,
      goods_confirmed: true,
      delivery: deliveryPayload,
      data: deliveryPayload,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Driver confirmPickup error:", err.message);
    next(err);
  } finally {
    client.release();
  }
};

// ── POST /api/driver/deliveries/:orderId/confirm-delivery ──────────────
// Explicitly confirm delivery completion by driver
const confirmDelivery = async (req, res, next) => {
  req.body.status = "delivered";
  return updateDeliveryStatus(req, res, next);
};

// ── POST /api/driver/deliveries/:orderId/request-return ────────────────
// Specification Section 14: Driver initiates return request from delivery workflow
const requestReturnByDriver = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const driverId = req.driver.id;
    const { orderId } = req.params;
    const { reason, description, items } = req.body;

    if (!reason?.trim()) {
      return res.status(400).json({ message: "Return reason is required" });
    }

    const delRes = await client.query(
      `SELECT d.*, o.id as order_primary_id, o.status as order_status, o.user_id as customer_user_id
       FROM deliveries d
       JOIN orders o ON (o.id = d.order_id OR o.order_ref = d.order_id)
       WHERE (UPPER(d.order_id) = UPPER($1) OR UPPER(o.id) = UPPER($1) OR UPPER(o.order_ref) = UPPER($1))
         AND d.driver_id = $2
       ORDER BY d.created_at DESC LIMIT 1`,
      [orderId, driverId]
    );

    if (!delRes.rows.length) {
      return res.status(404).json({ message: "Delivery not found or not assigned to you" });
    }

    const delivery = delRes.rows[0];

    await client.query("BEGIN");

    // 1. Create return record
    const retRes = await client.query(
      `INSERT INTO returns (order_id, user_id, reason, description, initiator_type, status)
       VALUES ($1, $2, $3, $4, 'driver', 'pending') RETURNING id`,
      [delivery.order_primary_id, delivery.customer_user_id, reason.trim(), description?.trim() || "Initiated by delivery courier at doorstep"]
    );
    const returnId = retRes.rows[0].id;

    // 2. Insert items if provided, or default to all items in order
    const realItems = await client.query(
      "SELECT product_id, quantity, product_name FROM order_items WHERE order_id = $1",
      [delivery.order_primary_id]
    );

    const itemsToInsert = Array.isArray(items) && items.length > 0 ? items : realItems.rows.map(r => ({
      product_id: r.product_id,
      product_name: r.product_name,
      returned_quantity: r.quantity,
      condition: 'damaged'
    }));

    for (const it of itemsToInsert) {
      await client.query(
        `INSERT INTO return_items (return_id, product_id, product_name, ordered_quantity, returned_quantity, condition, remarks)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          returnId,
          it.product_id,
          it.product_name || "Item",
          it.returned_quantity || 1,
          it.returned_quantity || 1,
          it.condition || "reusable",
          it.remarks || "Courier return request at doorstep"
        ]
      );
    }

    // 3. Update orders table to return_requested
    await client.query(
      `UPDATE orders 
       SET status = 'return_requested', 
           tracking_status = 'return_requested',
           updated_at = NOW()
       WHERE id = $1`,
      [delivery.order_primary_id]
    );

    // 4. Update deliveries table
    await client.query(
      `UPDATE deliveries 
       SET status = 'returned',
           updated_at = NOW()
       WHERE id = $1`,
      [delivery.id]
    );

    // 5. Audit log
    await logOrderAudit(client, {
      order_id: delivery.order_primary_id,
      actor_id: driverId,
      actor_name: req.driver.name,
      actor_role: 'driver',
      action: 'driver_return_requested',
      previous_state: delivery.order_status,
      new_state: 'return_requested',
      metadata: { return_id: returnId, reason, description }
    });

    await client.query("COMMIT");

    res.json({
      success: true,
      message: "Return request initiated. Please return goods to store counter.",
      return_id: returnId,
      status: "return_requested"
    });
  } catch (err) {
    await client.query("ROLLBACK");
    next(err);
  } finally {
    client.release();
  }
};

module.exports = {
  getActiveDeliveries,
  getAvailableDeliveries,
  getDeliveryHistory,
  getDeliveryDetails,
  updateDeliveryStatus,
  acceptDelivery,
  declineDelivery,
  confirmPickup,
  confirmDelivery,
  requestReturnByDriver,
};

