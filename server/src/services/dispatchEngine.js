const pool = require("../db/pool");

// Haversine formula: calculate distance between two coordinates in km
function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Automatically assign the closest online & available driver to an order/delivery.
 * Drivers who are currently in transit, on an active delivery, or in the excludedDriverIds list are bypassed.
 * 
 * @param {string|number} orderId - Order ID or Delivery ID
 * @param {object} storeCoords - { lat, lng } (Default: Bems Farms Store Hub, Aba, Abia State: 5.1065, 7.3667)
 * @param {Array<number>} excludedDriverIds - List of driver IDs to bypass (e.g. timed-out or rejected drivers)
 */
async function autoAssignClosestDriver(
  orderId,
  storeCoords = { lat: 5.1065, lng: 7.3667 },
  excludedDriverIds = []
) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Fetch the order and delivery record
    const orderRes = await client.query(
      `
      SELECT o.*, d.id AS delivery_id, d.status AS delivery_status
      FROM orders o
      LEFT JOIN deliveries d ON d.order_id = o.id
      WHERE o.id = $1 OR d.id::text = $1
      FOR UPDATE OF o
      `,
      [orderId]
    );

    if (orderRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return { success: false, message: "Order not found" };
    }

    const order = orderRes.rows[0];
    const originLat = parseFloat(order.latitude) || storeCoords.lat;
    const originLng = parseFloat(order.longitude) || storeCoords.lng;

    // Filter available drivers:
    // 1. Status not suspended, inactive, off_duty, on_delivery, in_transit
    // 2. driver_availability.is_available = true and is_on_delivery = false
    // 3. No open deliveries currently in progress (assigned, awaiting_pickup, en_route, arrived)
    // 4. Not in excludedDriverIds (e.g. drivers who timed out for this specific order)
    const params = [];
    let excludedCondition = "";
    if (Array.isArray(excludedDriverIds) && excludedDriverIds.length > 0) {
      const validIds = excludedDriverIds.map((id) => parseInt(id)).filter((id) => !isNaN(id));
      if (validIds.length > 0) {
        params.push(validIds);
        excludedCondition = `AND d.id != ALL($${params.length}::bigint[])`;
      }
    }

    const driversRes = await client.query(
      `
      SELECT 
        d.id, d.name, d.phone, d.vehicle_type, d.vehicle_plate, d.rating,
        COALESCE(da.is_available, d.is_available, true) AS is_available,
        COALESCE(da.is_on_delivery, false) AS is_on_delivery,
        dl.latitude, dl.longitude, dl.recorded_at
      FROM drivers d
      LEFT JOIN driver_availability da ON d.id = da.driver_id
      LEFT JOIN LATERAL (
        SELECT latitude, longitude, recorded_at
        FROM driver_locations
        WHERE driver_id = d.id
        ORDER BY recorded_at DESC
        LIMIT 1
      ) dl ON true
      WHERE d.status NOT IN ('suspended', 'inactive', 'off_duty', 'on_delivery', 'in_transit', 'busy')
        AND COALESCE(da.is_available, d.is_available, true) = true
        AND COALESCE(da.is_on_delivery, false) = false
        AND NOT EXISTS (
          SELECT 1 FROM deliveries del 
          WHERE del.driver_id = d.id 
            AND del.status IN ('assigned', 'awaiting_pickup', 'en_route', 'arrived')
        )
        ${excludedCondition}
      `,
      params
    );

    if (driversRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return {
        success: false,
        message: "No available online drivers found at this moment",
      };
    }

    // Rank drivers by distance to origin/store
    const driversWithDistance = driversRes.rows.map((drv) => {
      const driverLat = drv.latitude ? parseFloat(drv.latitude) : storeCoords.lat;
      const driverLng = drv.longitude ? parseFloat(drv.longitude) : storeCoords.lng;
      const distanceKm = calculateDistanceKm(originLat, originLng, driverLat, driverLng);
      return {
        ...drv,
        distanceKm,
      };
    });

    driversWithDistance.sort((a, b) => a.distanceKm - b.distanceKm);
    const bestDriver = driversWithDistance[0];

    // Ensure delivery record exists
    let deliveryId = order.delivery_id;
    if (!deliveryId) {
      const deliveryRef = `DEL-${Date.now().toString(36).toUpperCase()}`;
      const newDelRes = await client.query(
        `
        INSERT INTO deliveries (
          delivery_ref, order_id, driver_id, status, assigned_at, 
          delivery_address, eta_minutes, created_at
        )
        VALUES ($1, $2, $3, 'assigned', NOW(), $4, $5, NOW())
        RETURNING id
        `,
        [
          deliveryRef,
          order.id,
          bestDriver.id,
          order.address || "Customer Delivery Address",
          Math.max(15, Math.round(bestDriver.distanceKm * 4)),
        ]
      );
      deliveryId = newDelRes.rows[0].id;
    } else {
      await client.query(
        `
        UPDATE deliveries
        SET driver_id = $1, status = 'assigned', assigned_at = NOW(), accepted_at = NULL, updated_at = NOW()
        WHERE id = $2
        `,
        [bestDriver.id, deliveryId]
      );
    }

    // Update order with assigned driver_id but keep status as 'processing' (or current status).
    // The status will only advance to 'driver_assigned' when the driver accepts in the driver app.
    // This prevents showing a false 'Driver Assigned' status to the customer before acceptance.
    await client.query(
      `
      UPDATE orders
      SET driver_id = $1, updated_at = NOW()
      WHERE id = $2
      `,
      [bestDriver.id, order.id]
    );

    // Record delivery assignment with 'pending' status
    await client.query(
      `
      INSERT INTO delivery_assignments (
        delivery_id, driver_id, assignment_type, driver_response, created_at
      )
      VALUES ($1, $2, 'auto', 'pending', NOW())
      `,
      [deliveryId, bestDriver.id]
    );

    // Create notification for driver in driver_notifications
    await client.query(
      `
      INSERT INTO driver_notifications (
        driver_id, title, body, type, reference_type, reference_id, created_at
      )
      VALUES ($1, 'New Delivery Assigned', $2, 'new_order', 'order', $3, NOW())
      `,
      [
        bestDriver.id,
        `You have been assigned order #${order.order_ref || order.id}. Please accept and proceed to store for packaging pickup.`,
        deliveryId,
      ]
    );

    await client.query("COMMIT");

    return {
      success: true,
      order_id: order.id,
      delivery_id: deliveryId,
      driver: {
        id: bestDriver.id,
        name: bestDriver.name,
        phone: bestDriver.phone,
        vehicle_type: bestDriver.vehicle_type,
        distanceKm: Math.round(bestDriver.distanceKm * 10) / 10,
      },
    };
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("autoAssignClosestDriver error:", err.message);
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Scan for any assigned deliveries where the assigned driver did not respond/accept within `timeoutMinutes` (default 10 mins).
 * Automatically times out the non-responsive assignment and re-maps to the next closest available driver.
 * 
 * @param {number} timeoutMinutes - Threshold in minutes before auto-reassignment (Default: 10)
 * @param {object} storeCoords - Default store coordinates for distance ranking
 */
async function processUnresponsiveAssignments(
  timeoutMinutes = 5,
  storeCoords = { lat: 5.1065, lng: 7.3667 }
) {
  try {
    // Find active deliveries assigned over timeout threshold where driver never responded
    const timedOutRes = await pool.query(
      `
      SELECT 
        d.id AS delivery_id,
        d.delivery_ref,
        d.driver_id,
        d.order_id,
        d.assigned_at,
        da.id AS assignment_id,
        da.created_at AS assignment_created_at,
        o.order_ref,
        o.customer_name,
        drv.name AS driver_name
      FROM deliveries d
      JOIN orders o ON d.order_id = o.id
      JOIN delivery_assignments da ON da.delivery_id = d.id AND da.driver_id = d.driver_id
      LEFT JOIN drivers drv ON d.driver_id = drv.id
      WHERE d.status = 'assigned'
        AND d.accepted_at IS NULL
        AND da.driver_response = 'pending'
        AND da.created_at <= NOW() - ($1 * INTERVAL '1 minute')
      ORDER BY da.created_at ASC
      `,
      [timeoutMinutes]
    );

    if (timedOutRes.rows.length === 0) {
      return { processedCount: 0, reassignments: [] };
    }

    const reassignments = [];

    for (const item of timedOutRes.rows) {
      console.log(
        `⏱️ Driver ${item.driver_name || item.driver_id} did not respond to delivery ${item.delivery_ref} within ${timeoutMinutes} mins. Reassigning to next closest driver...`
      );

      // 1. Mark the timed out assignment as 'timeout'
      await pool.query(
        `
        UPDATE delivery_assignments
        SET 
          driver_response = 'timeout',
          rejection_reason = $1,
          response_at = NOW()
        WHERE id = $2
        `,
        [
          `Auto-timeout: Driver did not respond within ${timeoutMinutes} minutes`,
          item.assignment_id,
        ]
      );

      // 2. Notify the timed-out driver
      await pool.query(
        `
        INSERT INTO driver_notifications (
          driver_id, title, body, type, reference_type, reference_id, created_at
        )
        VALUES ($1, 'Delivery Assignment Timed Out', $2, 'order_cancelled', 'order', $3, NOW())
        `,
        [
          item.driver_id,
          `Delivery order #${item.order_ref || item.order_id} timed out after ${timeoutMinutes} minutes without response and has been re-assigned.`,
          item.delivery_id,
        ]
      );

      // 3. Collect all drivers who have already rejected or timed out for this delivery
      const previousAssignmentsRes = await pool.query(
        `SELECT DISTINCT driver_id FROM delivery_assignments WHERE delivery_id = $1`,
        [item.delivery_id]
      );
      const excludedDriverIds = previousAssignmentsRes.rows.map((r) => r.driver_id);

      // 4. Map to next closest available driver
      const reassignResult = await autoAssignClosestDriver(
        item.order_id,
        storeCoords,
        excludedDriverIds
      );

      if (reassignResult.success) {
        console.log(
          `✅ Successfully re-mapped order #${item.order_ref || item.order_id} to next closest driver: ${reassignResult.driver?.name} (${reassignResult.driver?.distanceKm} km)`
        );
        reassignments.push({
          order_id: item.order_id,
          delivery_id: item.delivery_id,
          previous_driver_id: item.driver_id,
          new_driver: reassignResult.driver,
          status: "reassigned",
        });
      } else {
        console.warn(
          `⚠️ Could not find next available driver for order #${item.order_ref || item.order_id}: ${reassignResult.message}`
        );
        reassignments.push({
          order_id: item.order_id,
          delivery_id: item.delivery_id,
          previous_driver_id: item.driver_id,
          status: "unassigned_no_drivers",
          message: reassignResult.message,
        });
      }
    }

    return {
      processedCount: timedOutRes.rows.length,
      reassignments,
    };
  } catch (err) {
    console.error("processUnresponsiveAssignments error:", err.message);
    return { error: err.message };
  }
}

/**
 * Start the background worker that checks every 30s for timed-out driver assignments (5 mins limit)
 */
let timeoutWorkerInterval = null;
function startAutoDispatchTimeoutWorker(intervalSeconds = 30, timeoutMinutes = 5) {
  if (timeoutWorkerInterval) {
    clearInterval(timeoutWorkerInterval);
  }

  timeoutWorkerInterval = setInterval(async () => {
    try {
      await processUnresponsiveAssignments(timeoutMinutes);
    } catch (e) {
      console.error("[dispatch-worker] Auto-reassignment tick error:", e.message);
    }
  }, intervalSeconds * 1000);

  console.log(
    `🚚 Auto-dispatch timeout worker active (Checks every ${intervalSeconds}s for ${timeoutMinutes}min unresponsive drivers)`
  );
}

module.exports = {
  calculateDistanceKm,
  autoAssignClosestDriver,
  processUnresponsiveAssignments,
  startAutoDispatchTimeoutWorker,
};

