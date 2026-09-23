const pool = require("../db/pool");

// Bootstrap dispatch_alerts table (auto-created on first server start)
async function ensureDispatchAlertsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS dispatch_alerts (
      id            SERIAL PRIMARY KEY,
      order_id      TEXT NOT NULL,
      order_ref     TEXT,
      delivery_id   INTEGER,
      last_driver_id INTEGER,
      last_driver_name TEXT,
      alert_type    TEXT NOT NULL DEFAULT 'no_driver_available',
      message       TEXT,
      resolved      BOOLEAN NOT NULL DEFAULT FALSE,
      resolution    TEXT,   -- 'keep_driver' | 'unassign_driver'
      resolved_by   INTEGER,
      resolved_at   TIMESTAMPTZ,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}
ensureDispatchAlertsTable().catch(err => console.warn('[dispatch-alerts] Table bootstrap warning:', err.message));

/**
 * Insert a dispatch alert for the admin to action.
 * Called when auto-reassignment fails (no available drivers).
 */
async function insertDispatchAlert({ order_id, order_ref, delivery_id, last_driver_id, last_driver_name, message }) {
  // Avoid duplicate unresolved alerts for same order
  const existing = await pool.query(
    `SELECT id FROM dispatch_alerts WHERE order_id=$1 AND resolved=FALSE AND alert_type='no_driver_available'`,
    [order_id]
  );
  if (existing.rows.length > 0) return; // Already has an active alert

  await pool.query(
    `INSERT INTO dispatch_alerts (order_id, order_ref, delivery_id, last_driver_id, last_driver_name, message)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [order_id, order_ref || null, delivery_id || null, last_driver_id || null, last_driver_name || null, message || null]
  );
  console.log(`🔔 Dispatch alert created for order ${order_ref || order_id} — admin action required.`);
}

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
      LEFT JOIN deliveries d ON (d.order_id = o.id::text OR d.order_id = o.order_ref)
      WHERE UPPER(REPLACE(o.id::text, '#', '')) = UPPER(REPLACE($1, '#', ''))
         OR UPPER(REPLACE(COALESCE(o.order_ref, ''), '#', '')) = UPPER(REPLACE($1, '#', ''))
         OR d.id::text = $1
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
      // Sections 26 & 27: No driver available / No driver accepts -> Status AWAITING_DRIVER_CONFIRMATION
      if (['packed', 'packed_ready', 'awaiting_driver_confirmation'].includes(order.status)) {
        await client.query(
          `UPDATE orders
           SET status = 'awaiting_driver_confirmation',
               tracking_status = 'awaiting_driver_confirmation',
               driver_id = NULL,
               updated_at = NOW()
           WHERE id = $1`,
          [order.id]
        );

        await insertDispatchAlert({
          order_id: order.id,
          order_ref: order.order_ref,
          delivery_id: order.delivery_id,
          message: `No available driver found for order #${order.order_ref || order.id}. Action required in Driver Availability Modal.`,
        }).catch((e) => console.warn('[dispatch-alert] Notice:', e.message));
      }

      await client.query("COMMIT");
      return {
        success: false,
        status: "awaiting_driver_confirmation",
        message: "No available online drivers found at this moment. Order placed in AWAITING_DRIVER_CONFIRMATION.",
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

    // Auto-resolve any unresolved dispatch alert for this order
    await client.query(
      `UPDATE dispatch_alerts 
       SET resolved = TRUE, resolution = 'keep_driver', resolved_at = NOW()
       WHERE (order_id = $1::text OR order_id = $2::text) AND resolved = FALSE`,
      [order.id, order.order_ref || order.id]
    ).catch(() => {});

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
    // Find active orders/deliveries:
    // 1. Where a driver was assigned but never accepted within timeoutMinutes
    // 2. Where order has been awaiting courier (driver_id IS NULL) for over timeoutMinutes
    const timedOutRes = await pool.query(
      `
      SELECT DISTINCT ON (order_id) * FROM (
        -- Category 1: Driver assigned but never accepted within threshold
        SELECT 
          d.id AS delivery_id,
          d.delivery_ref,
          COALESCE(o.driver_id, d.driver_id) AS driver_id,
          o.id AS order_id,
          COALESCE(d.assigned_at, o.updated_at, o.created_at) AS assigned_at,
          da.id AS assignment_id,
          COALESCE(da.created_at, d.assigned_at, o.updated_at) AS assignment_created_at,
          o.order_ref,
          o.customer_name,
          drv.name AS driver_name,
          'driver_unresponsive' AS alert_case
        FROM orders o
        LEFT JOIN deliveries d ON (d.order_id = o.id::text OR d.order_id = o.order_ref)
        LEFT JOIN delivery_assignments da ON da.delivery_id = d.id AND da.driver_id = COALESCE(o.driver_id, d.driver_id) AND da.driver_response = 'pending'
        LEFT JOIN drivers drv ON drv.id = COALESCE(o.driver_id, d.driver_id)
        WHERE COALESCE(o.driver_id, d.driver_id) IS NOT NULL
          AND o.status NOT IN ('cancelled', 'refunded', 'delivered', 'completed')
          AND (d.accepted_at IS NULL OR d.id IS NULL)
          AND COALESCE(da.created_at, d.assigned_at, o.updated_at, o.created_at) <= NOW() - ($1 * INTERVAL '1 minute')

        UNION ALL

        -- Category 2: Awaiting Courier (no driver assigned) for orders that are PACKED & READY
        SELECT
          d.id AS delivery_id,
          d.delivery_ref,
          NULL AS driver_id,
          o.id AS order_id,
          o.created_at AS assigned_at,
          NULL AS assignment_id,
          o.created_at AS assignment_created_at,
          o.order_ref,
          o.customer_name,
          NULL AS driver_name,
          'no_driver_assigned' AS alert_case
        FROM orders o
        LEFT JOIN deliveries d ON (d.order_id = o.id::text OR d.order_id = o.order_ref)
        WHERE o.driver_id IS NULL
          AND o.status = 'packed_ready'
          AND (o.source NOT ILIKE '%pos%' AND o.source NOT ILIKE '%physical%')
          AND COALESCE(o.updated_at, o.created_at) <= NOW() - ($1 * INTERVAL '1 minute')
      ) sub
      WHERE NOT EXISTS (
        SELECT 1 FROM dispatch_alerts al 
        WHERE (al.order_id = sub.order_id::text OR al.order_id = sub.order_ref)
          AND al.resolved = FALSE
      )
      ORDER BY order_id, assignment_created_at ASC
      `,
      [timeoutMinutes]
    );

    if (timedOutRes.rows.length === 0) {
      return { processedCount: 0, reassignments: [] };
    }

    const reassignments = [];

    for (const item of timedOutRes.rows) {
      if (item.alert_case === 'no_driver_assigned') {
        console.log(
          `⏱️ Order #${item.order_ref || item.order_id} has been awaiting courier for over ${timeoutMinutes} mins. Attempting dispatch...`
        );
        const autoResult = await autoAssignClosestDriver(item.order_id, storeCoords);
        if (autoResult.success) {
          console.log(`✅ Assigned order #${item.order_ref || item.order_id} to ${autoResult.driver?.name}`);
          reassignments.push({ order_id: item.order_id, new_driver: autoResult.driver, status: 'reassigned' });
        } else {
          console.warn(`⚠️ No available drivers for order #${item.order_ref || item.order_id} — triggering admin popup alert.`);
          await insertDispatchAlert({
            order_id: item.order_id,
            order_ref: item.order_ref,
            delivery_id: item.delivery_id,
            last_driver_id: null,
            last_driver_name: null,
            message: `Order #${item.order_ref || item.order_id} has been awaiting courier for over ${timeoutMinutes} minutes and no drivers are available. Please assign a driver manually or contact available riders.`,
          });
          reassignments.push({ order_id: item.order_id, status: 'unassigned_no_drivers', message: autoResult.message });
        }
        continue;
      }

      console.log(
        `⏱️ Driver ${item.driver_name || item.driver_id} did not respond to order #${item.order_ref || item.order_id} within ${timeoutMinutes} mins. Reassigning to next closest driver...`
      );

      // 1. Mark the timed out assignment as 'timed_out' if record exists
      if (item.assignment_id) {
        await pool.query(
          `
          UPDATE delivery_assignments
          SET 
            driver_response = 'timed_out',
            rejection_reason = $1,
            response_at = NOW()
          WHERE id = $2
          `,
          [
            `Auto-timeout: Driver did not respond within ${timeoutMinutes} minutes`,
            item.assignment_id,
          ]
        );
      }

      // 2. Notify the timed-out driver if driver_id is present
      if (item.driver_id) {
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
            item.delivery_id || item.order_id,
          ]
        ).catch(() => {});
      }

      // 3. Collect all drivers who have already rejected or timed out for this delivery
      let excludedDriverIds = [];
      if (item.delivery_id) {
        const previousAssignmentsRes = await pool.query(
          `SELECT DISTINCT driver_id FROM delivery_assignments WHERE delivery_id = $1`,
          [item.delivery_id]
        );
        excludedDriverIds = previousAssignmentsRes.rows.map((r) => r.driver_id);
      }
      if (item.driver_id && !excludedDriverIds.includes(item.driver_id)) {
        excludedDriverIds.push(item.driver_id);
      }

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
          `⚠️ No available driver for order #${item.order_ref || item.order_id} — moving to AWAITING_DRIVER_CONFIRMATION.`
        );
        await pool.query(
          `UPDATE orders
           SET status = 'awaiting_driver_confirmation',
               tracking_status = 'awaiting_driver_confirmation',
               driver_id = NULL,
               updated_at = NOW()
           WHERE id = $1`,
          [item.order_id]
        );
        // Create a DB alert so the admin gets the Driver Availability Modal popup
        await insertDispatchAlert({
          order_id: item.order_id,
          order_ref: item.order_ref,
          delivery_id: item.delivery_id,
          last_driver_id: item.driver_id,
          last_driver_name: item.driver_name,
          message: `No available driver found for order #${item.order_ref || item.order_id} after ${timeoutMinutes} minutes. Order placed in Awaiting Driver Confirmation. Action required in Driver Availability Modal.`,
        });
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

  // Run an immediate check on startup after short delay
  setTimeout(() => {
    processUnresponsiveAssignments(timeoutMinutes).catch((e) => {
      console.error("[dispatch-worker] Startup check error:", e.message);
    });
  }, 3000);

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
  insertDispatchAlert,
};

