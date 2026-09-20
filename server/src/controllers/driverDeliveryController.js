const pool = require("../db/pool");

// Normalize driver status string input
function normalizeStatus(status) {
  const s = String(status || "").toLowerCase().trim().replace(/[\s-]+/g, "_");
  if (s === "accepted") return "assigned";
  if (s === "out_for_delivery" || s === "en_route" || s === "on_the_way" || s === "picked_up") return "en_route";
  if (s === "arrived" || s === "driver_arrived" || s === "at_location") return "arrived";
  if (s === "delivered" || s === "completed") return "delivered";
  if (s === "failed" || s === "undelivered" || s === "delivery_attempted" || s === "customer_unavailable") return "delivery_attempted";
  if (s === "awaiting_pickup" || s === "pickup") return "awaiting_pickup";
  return s;
}

// ── GET /api/driver/deliveries ───────────────────────────────────────
// List all active deliveries assigned to the logged-in driver
const getActiveDeliveries = async (req, res, next) => {
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
        o.id AS order_id,
        o.order_ref,
        o.status AS order_status,
        o.tracking_status,
        o.total AS order_total,
        o.subtotal,
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
              'unit_price', oi.unit_price,
              'total_price', oi.total_price,
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
        AND d.status NOT IN ('delivered', 'cancelled')
      ORDER BY 
        CASE 
          WHEN d.status = 'en_route' THEN 1
          WHEN d.status = 'awaiting_pickup' THEN 2
          WHEN d.status = 'assigned' THEN 3
          ELSE 4
        END,
        d.assigned_at ASC
      `,
      [driverId]
    );

    res.json({
      count: result.rows.length,
      deliveries: result.rows,
    });
  } catch (err) {
    console.error("Driver getActiveDeliveries error:", err.message);
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

    res.json({
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      stats: statsResult.rows[0],
      deliveries: historyResult.rows,
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
        o.id AS order_id,
        o.order_ref,
        o.status AS order_status,
        o.tracking_status,
        o.total AS order_total,
        o.subtotal,
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
              'unit_price', oi.unit_price,
              'total_price', oi.total_price,
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

    res.json({
      delivery: result.rows[0],
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
    const finalProofPhoto = proof_photo || photo || (Array.isArray(req.body.proof_photos) ? req.body.proof_photos[0] : null);
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

    if (rawStatus === "accepted" || deliveryStatus === "assigned") {
      acceptedAt = new Date();
      orderStatus = "driver_assigned";
      trackingStatus = "driver_assigned";
    } else if (deliveryStatus === "awaiting_pickup") {
      orderStatus = "packed_ready";
      trackingStatus = "packed_ready";
    } else if (deliveryStatus === "en_route") {
      dispatchedAt = dispatchedAt || new Date();
      orderStatus = "shipped";
      trackingStatus = "out_for_delivery";
      // Mark driver as currently on active delivery
      await client.query(
        "UPDATE driver_availability SET is_on_delivery = true, last_toggled_at = NOW() WHERE driver_id = $1",
        [driverId]
      );
      await client.query(
        "UPDATE drivers SET status = 'on_delivery' WHERE id = $1 AND status != 'suspended'",
        [driverId]
      );
    } else if (deliveryStatus === "arrived") {
      arrivedAt = new Date();
      orderStatus = "shipped";
      trackingStatus = "driver_arrived";
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
      await client.query(
        `
        INSERT INTO driver_commissions (
          driver_id, commission_per_delivery, total_earned, unpaid_balance, 
          status, deliveries, base_amount, net_payout, created_at
        )
        VALUES ($1, $2, $2, $2, 'pending', 1, $2, $2, NOW())
        `,
        [driverId, commission]
      );

      // Record in driver_wallet_ledger
      const delRef = delivery.delivery_ref || `DEL-${delivery.id}`;
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
    } else if (deliveryStatus === "delivery_attempted") {
      orderStatus = "delivery_attempted";
      trackingStatus = "failed_attempt";
      await client.query(
        "UPDATE driver_availability SET is_on_delivery = false, last_toggled_at = NOW() WHERE driver_id = $1",
        [driverId]
      );
    }

    // Update deliveries table
    const dbDeliveryStatus = deliveryStatus === "arrived" ? "en_route" : deliveryStatus;
    const updateDeliveryQuery = `
      UPDATE deliveries 
      SET 
        status = $1,
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
        attempts = CASE WHEN $1 = 'delivery_attempted' THEN attempts + 1 ELSE attempts END,
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
        status = $1,
        tracking_status = $2,
        updated_at = NOW()
      WHERE id = $3
      `,
      [orderStatus, trackingStatus, actualOrderId]
    );

    // Sync delivery_assignments table
    await client.query(
      `
      UPDATE delivery_assignments 
      SET 
        driver_response = CASE 
          WHEN $1 = 'assigned' OR $1 = 'awaiting_pickup' OR $1 = 'en_route' OR $1 = 'delivered' THEN 'accepted'
          WHEN $1 = 'cancelled' THEN 'rejected'
          ELSE driver_response
        END,
        response_at = NOW(),
        rejection_reason = COALESCE($2, rejection_reason)
      WHERE delivery_id = $3 AND driver_id = $4
      `,
      [deliveryStatus, finalFailureReason, delivery.id, driverId]
    );

    await client.query("COMMIT");

    // Asynchronously notify customer of milestone status update (In Transit, Arrived, Delivered)
    (async () => {
      try {
        const orderUserRes = await pool.query(
          `SELECT o.id, o.order_ref, o.address, o.total, u.name, u.email, drv.name as driver_name, drv.vehicle_type
           FROM orders o
           LEFT JOIN users u ON o.customer_id = u.id OR o.user_id = u.id
           LEFT JOIN drivers drv ON drv.id = $1
           WHERE o.id = $2`,
          [driverId, actualOrderId]
        );
        if (orderUserRes.rows.length > 0 && orderUserRes.rows[0].email) {
          const row = orderUserRes.rows[0];
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
        }
      } catch (emailErr) {
        console.warn("Milestone email notification failed:", emailErr.message);
      }
    })();

    res.json({
      message: `Delivery status updated to ${rawStatus}`,
      delivery: updatedDeliveryResult.rows[0],
      order_id: actualOrderId,
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

module.exports = {
  getActiveDeliveries,
  getDeliveryHistory,
  getDeliveryDetails,
  updateDeliveryStatus,
};
