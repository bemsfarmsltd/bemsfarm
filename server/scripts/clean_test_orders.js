require("dotenv").config({ path: __dirname + "/../.env" });
const pool = require("../src/db/pool");

async function cleanTestOrders() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    
    // Find all test order ids
    const testOrdersRes = await client.query(
      "SELECT id FROM orders WHERE id LIKE 'TEST%' OR id LIKE 'SIM%' OR order_ref LIKE 'TEST%' OR order_ref LIKE 'SIM%'"
    );
    const testIds = testOrdersRes.rows.map((r) => r.id);
    console.log("Found test order IDs to clean:", testIds);

    if (testIds.length > 0) {
      try {
        await client.query(
          "DELETE FROM delivery_assignments WHERE delivery_id IN (SELECT id FROM deliveries WHERE order_id = ANY($1::varchar[]))",
          [testIds]
        );
        await client.query("DELETE FROM deliveries WHERE order_id = ANY($1::varchar[])", [testIds]);
      } catch (e) {
        console.log("Deliveries clean note:", e.message);
      }

      try {
        await client.query("DELETE FROM order_tracking_events WHERE order_id = ANY($1::varchar[])", [testIds]);
      } catch (e) {
        console.log("Tracking clean note:", e.message);
      }

      try {
        await client.query("DELETE FROM order_status_history WHERE order_id = ANY($1::varchar[])", [testIds]);
      } catch (e) {
        console.log("Status history clean note:", e.message);
      }

      await client.query("DELETE FROM order_items WHERE order_id = ANY($1::varchar[])", [testIds]);
      const delOrders = await client.query("DELETE FROM orders WHERE id = ANY($1::varchar[]) RETURNING id", [testIds]);
      console.log("Successfully removed orders:", delOrders.rows.map((r) => r.id));
    }

    await client.query("COMMIT");
    console.log("✅ Cleanup completed successfully!");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Cleanup failed:", err);
  } finally {
    client.release();
    pool.end();
  }
}

cleanTestOrders();
