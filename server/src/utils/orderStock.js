// Order creation decrements both products.stock and products.stock_quantity
// in lockstep (see routes/orders.js order-creation handler). Every path that
// cancels/reverses an order must restore both the same way, or the two
// columns permanently desync from what other admin screens (inventory list,
// POS product lookup) expect to always be equal.
async function restoreOrderStock(client, orderId) {
  try {
    const items = await client.query(
      "SELECT product_id, quantity FROM order_items WHERE order_id=$1",
      [orderId],
    );
    for (const item of items.rows) {
      const pid = parseInt(item.product_id, 10);
      const qty = parseInt(item.quantity, 10) || 1;
      if (Number.isInteger(pid) && pid > 0) {
        await client.query(
          `UPDATE products
           SET stock = COALESCE(stock, 0) + $1,
               stock_quantity = COALESCE(stock_quantity, 0) + $1
           WHERE id = $2`,
          [qty, pid],
        );
      }
    }
  } catch (err) {
    console.error("restoreOrderStock warning:", err);
  }
}

module.exports = { restoreOrderStock };