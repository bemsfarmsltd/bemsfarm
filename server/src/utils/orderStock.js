// Order creation decrements both products.stock and products.stock_quantity
// in lockstep (see routes/orders.js order-creation handler). Every path that
// cancels/reverses an order must restore both the same way, or the two
// columns permanently desync from what other admin screens (inventory list,
// POS product lookup) expect to always be equal.
async function restoreOrderStock(client, orderId) {
  const items = await client.query(
    "SELECT product_id, quantity FROM order_items WHERE order_id=$1",
    [orderId],
  );
  for (const item of items.rows) {
    await client.query(
      `UPDATE products
       SET stock = COALESCE(stock, 0) + $1,
           stock_quantity = COALESCE(stock_quantity, 0) + $1
       WHERE id = $2`,
      [item.quantity, item.product_id],
    );
  }
}

module.exports = { restoreOrderStock };