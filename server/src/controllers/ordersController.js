const pool = require("../db/pool");
const emailService = require("../services/emailService");

// ── CREATE ORDER ─────────────────────────────────────────
const createOrder = async (req, res) => {
  const client = await pool.connect();
  try {
    console.log("📦 Order creation started for user:", req.user.id);

    await client.query("BEGIN");

    const { items, total, payment_method, payment_ref, address } = req.body;

    // Validate
    if (!items || !Array.isArray(items) || items.length === 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "No items in order" });
    }

    // ✅ PRE-CHECK STOCK (fail fast like Doc 1)

    for (const item of items) {
      const stockCheck = await client.query(
        "SELECT stock, name FROM products WHERE id = $1",
        [item.product_id],
      );
      if (stockCheck.rows.length === 0) {
        await client.query("ROLLBACK");
        return res.status(400).json({ message: "Product not found" });
      }
      const currentStock = stockCheck.rows[0].stock || 100;
      if (currentStock < item.quantity) {
        await client.query("ROLLBACK");
        return res.status(400).json({
          message: `Insufficient stock for ${stockCheck.rows[0].name}. Only ${currentStock} available.`,
        });
      }
    }

    // ✅ BETTER ORDER ID (Doc 2's timestamp approach)
    const orderId = `BF${Date.now()}${Math.random().toString(36).substring(2, 5).toUpperCase()}`;
    console.log("Generated order ID:", orderId);

    // ✅ INSERT ORDER
    const orderResult = await client.query(
      `INSERT INTO orders (id, user_id, total, status, payment_method, payment_ref, address, tracking_status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
       RETURNING id, user_id, total, status, created_at`,
      [
        orderId,
        req.user.id,
        parseFloat(total) || 0,
        "pending",
        payment_method || "unknown",
        payment_ref || null,
        address || "",
        "order_placed",
      ],
    );
    console.log("✅ Order inserted:", orderResult.rows[0]);

    // ✅ INSERT ITEMS + DECREASE STOCK
    console.log("📦 Order items received:");
    console.log(JSON.stringify(items, null, 2));
    for (const item of items) {
      const productId = Number(item.product_id);
      const quantity = Number(item.quantity);

      if (!Number.isInteger(productId)) {
        throw new Error(`Invalid product_id: ${JSON.stringify(item)}`);
      }

      if (!Number.isInteger(quantity)) {
        throw new Error(`Invalid quantity: ${JSON.stringify(item)}`);
      }

      await client.query(
        `INSERT INTO order_items (order_id, product_id, quantity, price)
     VALUES ($1, $2, $3, $4)`,
        [orderId, productId, quantity, Number(item.price)],
      );

      const updateResult = await client.query(
        `UPDATE products SET stock = GREATEST(0, COALESCE(stock, 100) - $1) WHERE id = $2
         RETURNING id, name, stock`,
        [parseInt(item.quantity), parseInt(item.product_id)],
      );
      console.log(
        `✅ Stock updated for ${updateResult.rows[0].name}: now ${updateResult.rows[0].stock}`,
      );
    }

    await client.query("COMMIT");
    console.log("✅ Order transaction committed:", orderId);

    // ✅ SEND EMAIL (Doc 1's feature)
    try {
      const userResult = await pool.query(
        "SELECT name, email FROM users WHERE id = $1",
        [req.user.id],
      );
      const orderItems = await pool.query(
        `SELECT p.name, oi.quantity, oi.price FROM order_items oi
         JOIN products p ON p.id = oi.product_id WHERE oi.order_id = $1`,
        [orderId],
      );
      await emailService.sendOrderConfirmationEmail(
        { id: orderId, total, address },
        userResult.rows[0],
        orderItems.rows,
      );
      console.log("✅ Confirmation email sent to:", userResult.rows[0].email);
    } catch (emailErr) {
      console.error("⚠️ Email failed (order still created):", emailErr.message);
    }

    // ✅ CLEAR RESPONSE (success field for cart clearing)
    res.status(201).json({
      success: true,
      message: "Order created successfully",
      orderId: orderId,
      id: orderId,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Order creation error:", err.message, err.stack);
    res.status(500).json({ message: "Order failed: " + err.message });
  } finally {
    client.release();
  }
};

// ── GET USER ORDERS ──────────────────────────────────────
const getUserOrders = async (req, res) => {
  try {
    console.log("📋 Fetching orders for user:", req.user.id);

    const result = await pool.query(
      `SELECT
         o.id, o.user_id, o.total, o.status, o.payment_method, o.address, o.created_at,
         o.cancelled_at, o.cancel_reason, COALESCE(o.tracking_status, o.status) as tracking_status,
         json_agg(
           json_build_object(
             'name', p.name,
             'quantity', oi.quantity,
             'price', oi.price,
             'product_id', p.id
           ) ORDER BY p.name
         ) as items
       FROM orders o
       LEFT JOIN order_items oi ON oi.order_id = o.id
       LEFT JOIN products p ON p.id = oi.product_id
       WHERE o.user_id = $1
       GROUP BY o.id, o.user_id, o.total, o.status, o.payment_method,
                o.address, o.created_at, o.cancelled_at, o.cancel_reason,
                o.tracking_status
       ORDER BY o.created_at DESC`,
      [req.user.id],
    );

    console.log("✅ Found", result.rows.length, "orders");
    res.json({
      success: true,
      orders: result.rows,
      count: result.rows.length,
    });
  } catch (err) {
    console.error("❌ Get orders error:", err.message);
    res.status(500).json({ message: "Failed to fetch orders: " + err.message });
  }
};

// ── CANCEL ORDER ─────────────────────────────────────────
const cancelOrder = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason || reason.trim().length < 3)
      return res
        .status(400)
        .json({ message: "Please provide a cancellation reason" });

    console.log("❌ Cancelling order:", id);

    const order = await client.query(
      "SELECT status, total FROM orders WHERE id = $1 AND user_id = $2",
      [id, req.user.id],
    );

    if (order.rows.length === 0)
      return res.status(404).json({ message: "Order not found" });

    const o = order.rows[0];
    if (!["pending", "order_placed", "confirmed"].includes(o.status))
      return res.status(400).json({
        message: "This order cannot be cancelled — already processing",
      });

    await client.query("BEGIN");

    // Cancel order
    await client.query(
      `UPDATE orders SET status = 'cancelled', tracking_status = 'cancelled', cancel_reason = $1, cancelled_at = NOW() WHERE id = $2`,
      [reason.trim(), id],
    );

    // Restore stock
    const items = await client.query(
      "SELECT product_id, quantity FROM order_items WHERE order_id = $1",
      [id],
    );

    for (const item of items.rows) {
      await client.query(
        "UPDATE products SET stock = COALESCE(stock, 0) + $1 WHERE id = $2",
        [item.quantity, item.product_id],
      );
    }

    await client.query("COMMIT");
    console.log("✅ Order cancelled, stock restored");

    // Send cancellation email
    try {
      const userResult = await pool.query(
        "SELECT name, email FROM users WHERE id = $1",
        [req.user.id],
      );
      await emailService.sendOrderStatusEmail(
        { id, total: o.total },
        userResult.rows[0],
        "cancelled",
      );
    } catch (e) {
      console.error("⚠️ Cancel email failed:", e.message);
    }

    res.json({ message: "Order cancelled. Refund in 3-5 business days." });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Cancellation error:", err.message);
    res.status(500).json({ message: "Cancellation failed: " + err.message });
  } finally {
    client.release();
  }
};

// ── UPDATE ORDER STATUS (Admin) ──────────────────────────
const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, tracking_status, tracking_notes } = req.body;

    console.log("🔄 Updating order status:", id, "→", status);

    await pool.query(
      `UPDATE orders SET status = $1, tracking_status = $2, tracking_notes = $3 WHERE id = $4`,
      [status, tracking_status || status, tracking_notes || null, id],
    );

    // Send status update email
    try {
      const result = await pool.query(
        `SELECT o.id, o.total, u.name, u.email FROM orders o
         JOIN users u ON u.id = o.user_id WHERE o.id = $1`,
        [id],
      );
      if (result.rows.length) {
        const order = result.rows[0];
        await emailService.sendOrderStatusEmail(
          { id, total: order.total },
          { name: order.name, email: order.email },
          tracking_status || status,
        );
        console.log("✅ Status email sent");
      }
    } catch (e) {
      console.error("⚠️ Status email failed:", e.message);
    }

    res.json({ message: "Order status updated" });
  } catch (err) {
    console.error("❌ Update order status error:", err.message);
    res.status(500).json({ message: "Update failed: " + err.message });
  }
};

module.exports = { createOrder, getUserOrders, cancelOrder, updateOrderStatus };
