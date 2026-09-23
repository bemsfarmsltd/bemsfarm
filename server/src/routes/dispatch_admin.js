const express = require('express')
const router = express.Router()
const pool = require('../db/pool')
const { requireAuth } = require('../middleware/auth')

// GET /api/admin/dispatch/alerts — fetch all unresolved dispatch alerts
router.get('/alerts', requireAuth, async (req, res) => {
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
      LEFT JOIN orders o ON o.id::text = da.order_id
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
router.post('/alerts/:id/resolve', requireAuth, async (req, res) => {
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
      // Remove driver from order and delivery — order goes back to processing
      await client.query(
        `UPDATE orders SET driver_id = NULL, updated_at = NOW() WHERE id::text = $1`,
        [alert.order_id]
      )
      // Also unassign from deliveries table
      if (alert.delivery_id) {
        await client.query(
          `UPDATE deliveries SET driver_id = NULL, status = 'unassigned', updated_at = NOW() WHERE id = $1`,
          [alert.delivery_id]
        )
        // Mark the pending assignment as cancelled
        await client.query(
          `UPDATE delivery_assignments SET driver_response = 'cancelled', response_at = NOW()
           WHERE delivery_id = $1 AND driver_response = 'pending'`,
          [alert.delivery_id]
        )
      }
    }
    // If 'keep_driver', no order/delivery changes — just resolve the alert

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
