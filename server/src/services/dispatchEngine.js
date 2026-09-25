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
  // Do not create dispatch alerts for cancelled, refunded, completed, or unpacked orders
  try {
    const ordRes = await pool.query(
      `SELECT status FROM orders WHERE UPPER(REPLACE(id, '#', '')) = UPPER(REPLACE($1, '#', '')) OR UPPER(REPLACE(COALESCE(order_ref, ''), '#', '')) = UPPER(REPLACE($1, '#', ''))`,
      [order_id]
    );
    if (ordRes.rows.length > 0 && ['cancelled', 'refunded', 'delivered', 'completed', 'packaging', 'confirmed', 'pending', 'pending_payment'].includes(ordRes.rows[0].status)) {
      return;
    }
  } catch (_) {}

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

  try {
    const { broadcastDispatchAlert } = require("./socketService");
    broadcastDispatchAlert({ order_id, order_ref, delivery_id, message });
  } catch (_) {}
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

    // Only orders that are actually packed (ready for pickup) can be dispatched to couriers.
    // Packaging must first be completed on the POS terminal.
    if (['pending', 'pending_payment', 'confirmed', 'packaging', 'processing', 'new_order', 'cancelled', 'refunded', 'delivered'].includes(order.status)) {
      await client.query("ROLLBACK");
      return {
        success: false,
        message: `Order #${order.order_ref || order.id} is in status '${order.status}' and has not been packed yet.`,
      };
    }

    const originLat = parseFloat(order.latitude) || storeCoords.lat;
    const originLng = parseFloat(order.longitude) || storeCoords.lng;

    // Filter available drivers:
    // 1. Status not suspended, inactive, off_duty, on_delivery, in_transit
    // 2. driver_availability.is_available = true and is_on_delivery = false
    // 3. No open deliveries currently in progress (assigned, awaiting_pickup, en_route, arrived)
    // 4. Not in excludedDriverIds (e.g. drivers who timed out for this specific order)
    const params = [order.id];
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
        -- 10-MINUTE TELEMETRY FRESHNESS RULE:
        -- Driver must have an active GPS ping, heartbeat, or status toggle within the last 10 minutes.
        AND GREATEST(
          dl.recorded_at,
          d.last_location_at,
          da.last_ping_at,
          d.last_toggled_at,
          da.last_toggled_at
        ) >= NOW() - INTERVAL '10 minutes'
        AND NOT EXISTS (
          SELECT 1 FROM deliveries del 
          WHERE del.driver_id = d.id 
            AND del.order_id != $1
            AND (
              del.status IN ('accepted', 'picked_up', 'en_route', 'arrived')
              OR (
                del.status IN ('assigned', 'awaiting_pickup')
                AND del.assigned_at >= NOW() - INTERVAL '5 minutes'
              )
            )
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
        VALUES ($1, $2, $3, 'awaiting_pickup', NOW(), $4, $5, NOW())
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
        SET driver_id = $1, status = 'awaiting_pickup', assigned_at = NOW(), accepted_at = NULL, updated_at = NOW()
        WHERE id = $2
        `,
        [bestDriver.id, deliveryId]
      );
    }

    // Do NOT assign orders.driver_id or set tracking_status to 'driver_assigned' yet!
    // The order is only mapped to the candidate driver as a dispatch invitation.
    // orders.driver_id will be officially assigned ONLY when the driver clicks Accept.
    await client.query(
      `
      UPDATE orders
      SET driver_id = NULL, status = 'awaiting_driver_confirmation', tracking_status = 'awaiting_driver_confirmation', delivery_status = 'awaiting_pickup', updated_at = NOW()
      WHERE id = $1
      `,
      [order.id]
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

    try {
      const { broadcastDeliveryUpdated, broadcastOrderUpdated } = require("./socketService");
      broadcastDeliveryUpdated({
        delivery_id: deliveryId,
        order_id: order.id,
        driver_id: bestDriver.id,
        driver_name: bestDriver.name,
        status: "awaiting_pickup",
        accepted: false,
      });
      broadcastOrderUpdated({
        id: order.id,
        order_ref: order.order_ref,
        status: "awaiting_driver_confirmation",
        tracking_status: "awaiting_driver_confirmation",
        driver_id: null,
      });
    } catch (_) {}

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
        JOIN deliveries d ON (d.order_id = o.id::text OR d.order_id = o.order_ref)
        LEFT JOIN delivery_assignments da ON da.delivery_id = d.id AND da.driver_id = COALESCE(o.driver_id, d.driver_id) AND da.driver_response = 'pending'
        LEFT JOIN drivers drv ON drv.id = COALESCE(o.driver_id, d.driver_id)
        WHERE COALESCE(o.driver_id, d.driver_id) IS NOT NULL
          AND o.status IN ('packed', 'packed_ready', 'driver_assigned', 'awaiting_pickup', 'awaiting_driver_confirmation')
          AND o.delivered_at IS NULL
          AND COALESCE(o.customer_confirmed, false) = false
          AND d.status IN ('assigned', 'awaiting_pickup')
          AND d.accepted_at IS NULL
          AND COALESCE(da.created_at, d.assigned_at, o.updated_at, o.created_at) <= NOW() - ($1 * INTERVAL '1 minute')

        UNION ALL

        -- Category 2: Awaiting Courier (no driver assigned) for orders that are PACKED & READY or awaiting driver
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
        WHERE (
          (o.driver_id IS NULL AND o.status IN ('packed', 'packed_ready', 'awaiting_driver_confirmation'))
          OR (d.id IS NOT NULL AND d.driver_id IS NULL AND d.status IN ('pending', 'awaiting_pickup', 'assigned'))
        )
          AND o.status NOT IN ('cancelled', 'refunded', 'delivered', 'picked_up', 'out_for_delivery')
          AND o.delivered_at IS NULL
          AND COALESCE(o.customer_confirmed, false) = false
          AND (o.source NOT ILIKE '%pos%' AND o.source NOT ILIKE '%physical%' OR o.delivery_status = 'pending')
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
        // Clear driver from delivery record so it waits for next courier assignment
        await pool.query(
          `UPDATE deliveries
           SET driver_id = NULL,
               status = 'awaiting_pickup',
               updated_at = NOW()
           WHERE order_id = $1 OR id = $2`,
          [item.order_id, item.delivery_id || -1]
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
 * Automatically sweeps stale driver availability:
 * If a driver has is_available = true, but no heartbeat, GPS ping, or toggle in > 15 minutes,
 * they are automatically transitioned to 'off_duty' so the fleet ledger stays accurate.
 */
async function sweepStaleDriverAvailability(staleMinutes = 15) {
  try {
    const sweepResult = await pool.query(
      `
      UPDATE drivers d
      SET status = 'off_duty', is_available = false, updated_at = NOW()
      FROM driver_availability da
      WHERE d.id = da.driver_id
        AND d.status = 'active'
        AND da.is_available = true
        AND da.is_on_delivery = false
        AND GREATEST(
          d.last_location_at,
          da.last_ping_at,
          da.last_toggled_at,
          d.last_toggled_at,
          (SELECT MAX(recorded_at) FROM driver_locations WHERE driver_id = d.id)
        ) < NOW() - ($1 || ' minutes')::interval
      RETURNING d.id, d.name
      `,
      [staleMinutes]
    );

    if (sweepResult.rows.length > 0) {
      await pool.query(
        `
        UPDATE driver_availability da
        SET is_available = false
        FROM drivers d
        WHERE d.id = da.driver_id
          AND d.status = 'off_duty'
          AND da.is_available = true
          AND da.is_on_delivery = false
        `
      ).catch(() => {});
      console.log(`📡 Stale driver telemetry sweep: marked ${sweepResult.rows.length} unreachable driver(s) as off_duty.`);
    }
  } catch (err) {
    console.error("[dispatch-worker] sweepStaleDriverAvailability error:", err.message);
  }
}

/**
 * Restarts the auto-assign engine for all orders awaiting couriers.
 * Automatically triggered whenever a driver comes back online, sends a live heartbeat,
 * or is activated/approved by admin, as well as periodically by the background worker.
 */
let isAutoAssignRunning = false;
async function restartAutoAssignEngine(options = {}) {
  const { triggerDriverId = null, reason = "driver_online" } = options;

  if (isAutoAssignRunning) {
    return { status: "busy", running: true };
  }

  isAutoAssignRunning = true;
  try {
    // 1. Release any stale/abandoned assignments where a driver was assigned but never accepted
    // and the driver went off-duty or hasn't pinged in > 5 minutes.
    await pool.query(`
      UPDATE deliveries d
      SET driver_id = NULL, status = 'awaiting_pickup', updated_at = NOW()
      FROM drivers dr
      LEFT JOIN driver_availability da ON dr.id = da.driver_id
      WHERE d.driver_id = dr.id
        AND d.accepted_at IS NULL
        AND d.status IN ('assigned', 'awaiting_pickup')
        AND (
          dr.status IN ('off_duty', 'suspended', 'inactive')
          OR COALESCE(da.is_available, dr.is_available, true) = false
          OR GREATEST(dr.last_location_at, da.last_ping_at, dr.last_toggled_at, da.last_toggled_at) < NOW() - INTERVAL '5 minutes'
        )
    `).catch((err) => console.warn("[dispatchEngine] Stale assignment release notice:", err.message));

    // Also update order status if driver went offline without accepting
    await pool.query(`
      UPDATE orders o
      SET driver_id = NULL, status = 'awaiting_driver_confirmation', tracking_status = 'awaiting_driver_confirmation', updated_at = NOW()
      FROM drivers dr
      LEFT JOIN driver_availability da ON dr.id = da.driver_id
      WHERE o.driver_id = dr.id
        AND o.status IN ('awaiting_pickup', 'driver_assigned')
        AND o.delivered_at IS NULL
        AND COALESCE(o.customer_confirmed, false) = false
        AND (
          dr.status IN ('off_duty', 'suspended', 'inactive')
          OR COALESCE(da.is_available, dr.is_available, true) = false
          OR GREATEST(dr.last_location_at, da.last_ping_at, dr.last_toggled_at, da.last_toggled_at) < NOW() - INTERVAL '5 minutes'
        )
    `).catch((err) => console.warn("[dispatchEngine] Stale order driver release notice:", err.message));

    // 2. Check if there are active online drivers currently available
    const onlineDriversRes = await pool.query(`
      SELECT d.id, d.name, d.phone
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
        AND GREATEST(
          dl.recorded_at,
          d.last_location_at,
          da.last_ping_at,
          d.last_toggled_at,
          da.last_toggled_at
        ) >= NOW() - INTERVAL '10 minutes'
        AND NOT EXISTS (
          SELECT 1 FROM deliveries del 
          WHERE del.driver_id = d.id 
            AND (
              del.status IN ('accepted', 'picked_up', 'en_route', 'arrived')
              OR (
                del.status IN ('assigned', 'awaiting_pickup')
                AND del.assigned_at >= NOW() - INTERVAL '5 minutes'
              )
            )
        )
    `);

    if (onlineDriversRes.rows.length === 0) {
      return { success: false, processed: 0, reason: "No available online drivers" };
    }

    // 3. Find all orders waiting for a courier.
    // CRITICAL: Exclude orders that already have an active pending (unaccepted) offer
    // sent to a driver. These orders are correctly in 'awaiting_driver_confirmation'
    // with orders.driver_id = NULL by design — but deliveries.driver_id IS NOT NULL,
    // meaning a driver has already been offered the order and hasn't responded yet.
    // Without this exclusion the engine re-offers the same order on every 30s tick.
    const pendingOrdersRes = await pool.query(`
      SELECT DISTINCT 
        o.id,
        o.order_ref,
        o.status,
        o.created_at,
        d.id AS delivery_id
      FROM orders o
      LEFT JOIN deliveries d ON (d.order_id = o.id::text OR d.order_id = o.order_ref)
      WHERE (
        (o.driver_id IS NULL AND d.driver_id IS NULL AND o.status IN ('awaiting_driver_confirmation', 'packed_ready', 'packed'))
        OR (d.id IS NOT NULL AND d.driver_id IS NULL AND d.status IN ('pending', 'awaiting_pickup', 'assigned'))
      )
      AND o.status NOT IN ('cancelled', 'refunded', 'delivered', 'picked_up', 'out_for_delivery')
      AND o.delivered_at IS NULL
      AND COALESCE(o.customer_confirmed, false) = false
      AND (o.source IS NULL OR o.source NOT ILIKE '%pos%' AND o.source NOT ILIKE '%physical%' OR o.delivery_status = 'pending' OR o.delivery_status = 'awaiting_pickup')
      -- Skip orders that already have a pending (unaccepted) offer extended to a driver
      AND NOT EXISTS (
        SELECT 1 FROM deliveries pending_del
        WHERE (pending_del.order_id = o.id::text OR pending_del.order_id = o.order_ref)
          AND pending_del.driver_id IS NOT NULL
          AND pending_del.accepted_at IS NULL
          AND pending_del.status IN ('assigned', 'awaiting_pickup')
          AND pending_del.assigned_at >= NOW() - INTERVAL '10 minutes'
      )
      ORDER BY o.created_at ASC
      LIMIT 15
    `);

    if (pendingOrdersRes.rows.length === 0) {
      return { success: true, processed: 0, message: "No pending orders awaiting drivers" };
    }

    console.log(
      `🚀 [dispatchEngine] Driver online event detected (${reason})! Auto-assigning ${pendingOrdersRes.rows.length} pending order(s) across ${onlineDriversRes.rows.length} available driver(s)...`
    );

    const assignedResults = [];
    for (const order of pendingOrdersRes.rows) {
      try {
        const assignResult = await autoAssignClosestDriver(order.id);
        if (assignResult.success) {
          console.log(
            `✅ [dispatchEngine] Auto-assigned order #${order.order_ref || order.id} to driver ${assignResult.driver?.name} (${assignResult.driver?.distanceKm} km away)`
          );
          assignedResults.push({
            order_id: order.id,
            order_ref: order.order_ref,
            driver: assignResult.driver,
          });
        } else {
          console.log(`ℹ️ [dispatchEngine] Order #${order.order_ref || order.id} auto-assign notice: ${assignResult.message}`);
          if (assignResult.message && assignResult.message.includes("No available online drivers")) {
            break;
          }
        }
      } catch (err) {
        console.error(`[dispatchEngine] Error auto-assigning order #${order.id}:`, err.message);
      }
    }

    return {
      success: true,
      processed: assignedResults.length,
      assigned: assignedResults,
    };
  } catch (err) {
    console.error("[dispatchEngine] restartAutoAssignEngine error:", err.message);
    return { success: false, error: err.message };
  } finally {
    isAutoAssignRunning = false;
  }
}

/**
 * Start the background worker that checks every 30s for timed-out driver assignments (5 mins limit)
 * and sweeps disconnected/stale drivers every 60s.
 */
let timeoutWorkerInterval = null;
let sweepCounter = 0;
function startAutoDispatchTimeoutWorker(intervalSeconds = 30, timeoutMinutes = 5) {
  if (timeoutWorkerInterval) {
    clearInterval(timeoutWorkerInterval);
  }

  // Run an immediate check on startup after short delay
  setTimeout(() => {
    processUnresponsiveAssignments(timeoutMinutes).catch((e) => {
      console.error("[dispatch-worker] Startup check error:", e.message);
    });
    restartAutoAssignEngine({ reason: "startup_worker_tick" }).catch(() => {});
    sweepStaleDriverAvailability(15).catch(() => {});
  }, 3000);

  timeoutWorkerInterval = setInterval(async () => {
    try {
      await processUnresponsiveAssignments(timeoutMinutes);
      // Run auto-assignment check for any awaiting orders
      await restartAutoAssignEngine({ reason: "periodic_worker_tick" });
      sweepCounter++;
      // Sweep for stale/disconnected drivers every 2 ticks (~60s)
      if (sweepCounter >= 2) {
        sweepCounter = 0;
        await sweepStaleDriverAvailability(15);
      }
    } catch (e) {
      console.error("[dispatch-worker] Auto-reassignment tick error:", e.message);
    }
  }, intervalSeconds * 1000);

  console.log(
    `🚚 Auto-dispatch timeout worker active (Checks every ${intervalSeconds}s for ${timeoutMinutes}min unresponsive drivers, sweeps telemetry every 60s)`
  );
}

module.exports = {
  calculateDistanceKm,
  autoAssignClosestDriver,
  restartAutoAssignEngine,
  processUnresponsiveAssignments,
  sweepStaleDriverAvailability,
  startAutoDispatchTimeoutWorker,
  insertDispatchAlert,
};

