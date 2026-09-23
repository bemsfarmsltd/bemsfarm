// BEMS Farms Order-to-Delivery Spec: Sections 18 & 19
// Stock is only deducted when scanned and processed through POS during packing.
// If an order is cancelled BEFORE POS processing, no stock was deducted, so no stock should be reversed.
// If an order is cancelled AFTER POS processing, only the actually scanned/deducted quantity is restored,
// and the reversal is strictly logged in inventory_transactions.

async function restoreOrderStock(client, orderId) {
  try {
    // Check if any POS stock-out or sale occurred for this order
    const posScans = await client.query(
      `SELECT product_id, SUM(quantity) as total_scanned
       FROM inventory_transactions
       WHERE order_id = $1 AND transaction_type IN ('pos_packaging_stockout', 'pos_sale')
       GROUP BY product_id`,
      [String(orderId)]
    );

    let deductions = posScans.rows;
    if (!deductions.length) {
      // Check if order is a POS order
      const orderRes = await client.query(
        "SELECT id, source FROM orders WHERE id = $1",
        [String(orderId)]
      );
      const isPos = orderRes.rows.length && (
        String(orderRes.rows[0].source || '').toLowerCase().includes('pos') ||
        String(orderRes.rows[0].id).startsWith('POS-')
      );

      if (isPos) {
        // POS sales deduct stock immediately at creation -> restore full item quantities
        const items = await client.query(
          "SELECT product_id, quantity as total_scanned FROM order_items WHERE order_id=$1",
          [String(orderId)]
        );
        deductions = items.rows.filter(r => parseInt(r.total_scanned, 10) > 0);
      } else {
        // For online delivery orders, check scanned_quantity
        const items = await client.query(
          "SELECT product_id, COALESCE(scanned_quantity, 0) as total_scanned FROM order_items WHERE order_id=$1",
          [String(orderId)]
        );
        deductions = items.rows.filter(r => parseInt(r.total_scanned, 10) > 0);
      }
    }

    if (!deductions.length) {
      // Zero stock was deducted at POS -> no reversal needed
      return;
    }

    for (const item of deductions) {
      const pid = parseInt(item.product_id, 10);
      const qty = parseInt(item.total_scanned, 10);
      if (Number.isInteger(pid) && pid > 0 && qty > 0) {
        const prodRes = await client.query(
          "SELECT stock, stock_quantity FROM products WHERE id = $1 FOR UPDATE",
          [pid]
        );
        if (prodRes.rows.length) {
          const prevStock = prodRes.rows[0].stock ?? 0;
          const newStock = prevStock + qty;

          await client.query(
            `UPDATE products
             SET stock = COALESCE(stock, 0) + $1,
                 stock_quantity = COALESCE(stock_quantity, 0) + $1
             WHERE id = $2`,
            [qty, pid]
          );

          await client.query(
            `INSERT INTO inventory_transactions
             (order_id, product_id, quantity, previous_quantity, new_quantity, transaction_type, source_reference, notes, created_at)
             VALUES ($1, $2, $3, $4, $5, 'order_cancellation_restock', $6, 'Order cancelled after POS processing', NOW())`,
            [String(orderId), pid, qty, prevStock, newStock, `CANCEL-${orderId}`]
          );
        }
      }
    }
  } catch (err) {
    console.error("restoreOrderStock warning:", err);
  }
}

async function deductOrderStock(client, orderId, userId = null, terminalId = 'POS-MAIN') {
  try {
    // Check if stock was already deducted for this order to prevent double-deduction
    const check = await client.query(
      "SELECT id FROM inventory_transactions WHERE order_id = $1 AND transaction_type = 'pos_packaging_stockout' LIMIT 1",
      [String(orderId)]
    );
    if (check.rows.length > 0) return { alreadyDeducted: true };

    const items = await client.query(
      `SELECT oi.id, oi.product_id, oi.quantity, p.name as product_name, p.stock, p.stock_quantity 
       FROM order_items oi
       JOIN products p ON p.id = oi.product_id
       WHERE oi.order_id = $1
       FOR UPDATE OF p`,
      [String(orderId)]
    );

    for (const item of items.rows) {
      const orderedQty = parseInt(item.quantity, 10);
      if (orderedQty > 0) {
        const currentStock = parseInt(item.stock ?? item.stock_quantity ?? 0, 10);
        const newStock = Math.max(0, currentStock - orderedQty);

        await client.query(
          `UPDATE products
           SET stock = $1, stock_quantity = $1, updated_at = NOW()
           WHERE id = $2`,
          [newStock, item.product_id]
        );

        await client.query(
          `INSERT INTO inventory_transactions
           (order_id, product_id, quantity, previous_quantity, new_quantity, transaction_type, source_reference, notes, created_at)
           VALUES ($1, $2, $3, $4, $5, 'pos_packaging_stockout', $6, 'Inspected & deducted at POS packing counter', NOW())`,
          [String(orderId), item.product_id, orderedQty, currentStock, newStock, `PACK-${orderId}`]
        );

        await client.query(
          "UPDATE order_items SET scanned_quantity = quantity WHERE id = $1",
          [item.id]
        );
      }
    }
    return { success: true };
  } catch (err) {
    console.error("deductOrderStock warning:", err);
    throw err;
  }
}

module.exports = { restoreOrderStock, deductOrderStock };