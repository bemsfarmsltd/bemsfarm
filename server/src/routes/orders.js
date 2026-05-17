const express = require('express')
const router  = express.Router()
const pool    = require('../db/pool')
const { protect } = require('../middleware/authMiddleware')

// Create order
router.post('/', protect, async (req, res) => {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const { items, total, payment_method, payment_ref, address } = req.body

    // Generate order ID
    const orderId = 'BF-' + Math.random().toString(36).substring(2, 10).toUpperCase()

    // Insert order
    const orderResult = await client.query(
      `INSERT INTO orders (id, user_id, total, status, payment_method, payment_ref, address)
       VALUES ($1, $2, $3, 'pending', $4, $5, $6) RETURNING *`,
      [orderId, req.user.id, total, payment_method, payment_ref || null, address || '']
    )

    // Insert order items and deduct stock safely
    for (const item of items) {
      // 1. Lock the product row
      const productRes = await client.query(
        `SELECT name, stock FROM products WHERE id = $1 FOR UPDATE`,
        [item.product_id]
      )

      if (productRes.rows.length === 0) {
        throw new Error(`Product not found`)
      }

      const product = productRes.rows[0]

      // 2. Check stock
      if (product.stock < item.quantity) {
        throw new Error(`Insufficient stock for ${product.name}. Only ${product.stock} left.`)
      }

      // 3. Deduct stock
      await client.query(
        `UPDATE products SET stock = stock - $1 WHERE id = $2`,
        [item.quantity, item.product_id]
      )

      // 4. Insert order item
      await client.query(
        `INSERT INTO order_items (order_id, product_id, quantity, price)
         VALUES ($1, $2, $3, $4)`,
        [orderId, item.product_id, item.quantity, item.price]
      )
    }

    await client.query('COMMIT')
    res.status(201).json({ message: 'Order placed successfully', order: orderResult.rows[0] })
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('Order creation error:', err.message)
    
    // Check if it's an inventory error we explicitly threw
    if (err.message.includes('Insufficient stock') || err.message === 'Product not found') {
      return res.status(400).json({ message: err.message })
    }
    
    res.status(500).json({ message: 'Error creating order' })
  } finally {
    client.release()
  }
})

// Get user orders
router.get('/', protect, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT o.*, 
        json_agg(json_build_object(
          'name', p.name, 'quantity', oi.quantity, 'price', oi.price
        )) as items
       FROM orders o
       JOIN order_items oi ON oi.order_id = o.id
       JOIN products p ON p.id = oi.product_id
       WHERE o.user_id = $1
       GROUP BY o.id
       ORDER BY o.created_at DESC`,
      [req.user.id]
    )
    res.json({ orders: result.rows })
  } catch (err) {
    res.status(500).json({ message: 'Error fetching orders' })
  }
})

module.exports = router