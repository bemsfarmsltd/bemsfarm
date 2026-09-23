const express = require('express')
const router = express.Router()
const pool = require('../db/pool')
const { protect, requireRole } = require('../middleware/authMiddleware')

// All dispatch routes require authentication
router.use(protect)

// POST /api/admin/dispatch/unassign/:ref — manually unassign driver from an order
// Works with order_ref (e.g. BF-MUCTRIAL) or order id
router.post('/unassign/:ref', requireRole('superadmin', 'admin', 'manager', 'cashier'), async (req, res) => {
  const { ref } = req.params
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    // Find the order by ref or id (case-insensitive)
    const orderRes = await client.query(
      `SELECT id, order_ref, driver_id, status FROM orders WHERE UPPER(order_ref) = UPPER($1) OR UPPER(id::text) = UPPER($1) LIMIT 1`,
      [ref]
    )
    if (orderRes.rows.length === 0) {
      await client.query('ROLLBACK')
      return res.status(404).json({ error: `Order ${ref} not found` })
    }

    const order = orderRes.rows[0]

    // Unassign driver from order — revert status to processing
    await client.query(
      `UPDATE orders SET driver_id = NULL, status = 'processing', tracking_status = 'processing', updated_at = NOW() WHERE id = $1`,
      [order.id]
    )

    // Cancel active delivery for this order (deliveries check constraint requires 'cancelled')
    await client.query(
      `UPDATE deliveries SET driver_id = NULL, status = 'cancelled', updated_at = NOW() 
       WHERE (order_id = $1::text OR order_id = $2::text) AND status IN ('assigned','pending','awaiting_pickup')`,
      [order.id, order.order_ref || order.id]
    )

    // Cancel any pending driver assignments
    await client.query(
      `UPDATE delivery_assignments da
       SET driver_response = 'cancelled', response_at = NOW()
       FROM deliveries d
       WHERE da.delivery_id = d.id AND (d.order_id = $1::text OR d.order_id = $2::text) AND da.driver_response = 'pending'`,
      [order.id, order.order_ref || order.id]
    )

    // Resolve any open dispatch alert for this order
    await client.query(
      `UPDATE dispatch_alerts SET resolved = TRUE, resolution = 'unassign_driver', resolved_at = NOW()
       WHERE (order_id = $1::text OR order_id = $2::text) AND resolved = FALSE`,
      [order.id, order.order_ref || order.id]
    ).catch(() => {})

    await client.query('COMMIT')

    res.json({
      message: `Driver unassigned from order #${order.order_ref || order.id}. Order status reset to 'processing'.`,
      order_id: order.id,
      order_ref: order.order_ref || order.id,
    })
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('POST /dispatch/unassign error:', err.message)
    res.status(500).json({ error: err.message })
  } finally {
    client.release()
  }
})

// GET /api/admin/dispatch/alerts — fetch all unresolved dispatch alerts
router.get('/alerts', requireRole('superadmin', 'admin', 'manager', 'cashier'), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        da.*,
        o.order_ref,
        o.customer_name,
        o.address,
        o.total,
        drv.name AS driver_name,
        drv.phone AS driver_phone,
        drv.vehicle_type,
        drv.vehicle_plate
      FROM dispatch_alerts da
      LEFT JOIN orders o ON (o.id::text = da.order_id OR o.order_ref = da.order_id)
      LEFT JOIN drivers drv ON drv.id = da.last_driver_id
      WHERE da.resolved = FALSE
      ORDER BY da.created_at DESC
    `)
    res.json({ alerts: result.rows })
  } catch (err) {
    console.error('GET /dispatch/alerts error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// POST /api/admin/dispatch/alerts/:id/resolve — admin resolves an alert
// body: { resolution: 'keep_driver' | 'unassign_driver' }
router.post('/alerts/:id/resolve', requireRole('superadmin', 'admin', 'manager', 'cashier'), async (req, res) => {
  const { id } = req.params
  const { resolution } = req.body
  const adminId = req.user?.id

  if (!['keep_driver', 'unassign_driver'].includes(resolution)) {
    return res.status(400).json({ error: "resolution must be 'keep_driver' or 'unassign_driver'" })
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    // Fetch the alert
    const alertRes = await client.query(
      `SELECT * FROM dispatch_alerts WHERE id = $1 AND resolved = FALSE`,
      [id]
    )
    if (alertRes.rows.length === 0) {
      await client.query('ROLLBACK')
      return res.status(404).json({ error: 'Alert not found or already resolved' })
    }

    const alert = alertRes.rows[0]

    if (resolution === 'unassign_driver') {
      // Remove driver from order and reset status to processing
      await client.query(
        `UPDATE orders SET driver_id = NULL, status = 'processing', tracking_status = 'processing', updated_at = NOW() 
         WHERE id::text = $1 OR order_ref = $1`,
        [alert.order_id]
      )
      // Cancel active delivery record (status 'cancelled' satisfies check constraint)
      if (alert.delivery_id) {
        await client.query(
          `UPDATE deliveries SET driver_id = NULL, status = 'cancelled', updated_at = NOW() WHERE id = $1`,
          [alert.delivery_id]
        )
        // Mark pending assignment as cancelled
        await client.query(
          `UPDATE delivery_assignments SET driver_response = 'cancelled', response_at = NOW()
           WHERE delivery_id = $1 AND driver_response = 'pending'`,
          [alert.delivery_id]
        )
      } else {
        await client.query(
          `UPDATE deliveries SET driver_id = NULL, status = 'cancelled', updated_at = NOW() 
           WHERE (order_id = $1 OR order_id = $2) AND status IN ('assigned','pending','awaiting_pickup')`,
          [alert.order_id, alert.order_ref || alert.order_id]
        )
      }
    }
    // If 'keep_driver', keep driver assigned and alert is resolved

    // Mark alert as resolved
    await client.query(
      `UPDATE dispatch_alerts
       SET resolved = TRUE, resolution = $1, resolved_by = $2, resolved_at = NOW()
       WHERE id = $3`,
      [resolution, adminId, id]
    )

    await client.query('COMMIT')

    res.json({
      message: resolution === 'keep_driver'
        ? 'Driver kept on order. They will be notified again to accept.'
        : 'Driver unassigned. Order is back in queue for manual or auto-dispatch.',
      resolution,
      order_id: alert.order_id
    })
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('POST /dispatch/alerts/:id/resolve error:', err.message)
    res.status(500).json({ error: err.message })
  } finally {
    client.release()
  }
})

module.exports = router
