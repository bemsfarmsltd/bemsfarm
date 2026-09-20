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
 * Automatically assign the closest online & available driver to an order/delivery
 * @param {string} orderId - Order ID or Delivery ID
 * @param {object} storeCoords - { lat, lng } (Default: Bems Farms Store Hub, Aba, Abia State: 5.1065, 7.3667)
 */
async function autoAssignClosestDriver(orderId, storeCoords = { lat: 5.1065, lng: 7.3667 }) {
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

    // Find all online, unsuspended drivers with their latest GPS location
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
      WHERE d.status != 'suspended'
        AND COALESCE(da.is_available, d.is_available, true) = true
        AND COALESCE(da.is_on_delivery, false) = false
      `
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
        SET driver_id = $1, status = 'assigned', assigned_at = NOW(), updated_at = NOW()
        WHERE id = $2
        `,
        [bestDriver.id, deliveryId]
      );
    }

    // Update order status
    await client.query(
      `
      UPDATE orders
      SET driver_id = $1, status = 'driver_assigned', tracking_status = 'driver_assigned', updated_at = NOW()
      WHERE id = $2
      `,
      [bestDriver.id, order.id]
    );

    // Record delivery assignment
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
        `You have been assigned order #${order.id}. Please proceed to store for packaging pickup.`,
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

module.exports = {
  calculateDistanceKm,
  autoAssignClosestDriver,
};
