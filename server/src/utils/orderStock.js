// BEMS Farms Order-to-Delivery Spec: Sections 18 & 19
// Stock is only deducted when scanned and processed through POS during packing.
// If an order is cancelled BEFORE POS processing, no stock was deducted, so no stock should be reversed.
// If an order is cancelled AFTER POS processing, only the actually scanned/deducted quantity is restored,
// and the reversal is strictly logged in inventory_transactions.

async function restoreOrderStock(client, orderId) {
  try {
    // Check if any POS stock-out occurred for this order
    const posScans = await client.query(
      `SELECT product_id, SUM(quantity) as total_scanned
       FROM inventory_transactions
       WHERE order_id = $1 AND transaction_type = 'pos_packaging_stockout'
       GROUP BY product_id`,
      [String(orderId)]
    );

    // If no POS stock-outs were recorded in inventory_transactions, fallback to check order_items.scanned_quantity
    let deductions = posScans.rows;
    if (!deductions.length) {
      const items = await client.query(
        "SELECT product_id, COALESCE(scanned_quantity, 0) as total_scanned FROM order_items WHERE order_id=$1",
        [String(orderId)]
      );
      deductions = items.rows.filter(r => parseInt(r.total_scanned, 10) > 0);
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

module.exports = { restoreOrderStock };