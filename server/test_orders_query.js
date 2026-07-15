require('dotenv').config({path: './.env'});
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function test() {
  try {
    const q = `
      SELECT
        o.id, o.total, o.status, o.source AS channel, o.payment_method,
        o.delivery_fee, o.discount_amount, o.created_at, o.notes,
        o.address, o.delivery_address,
        COALESCE(o.customer_name, c.name, 'Walk-in') AS customer_name,
        COALESCE(o.customer_phone, c.phone, '')       AS customer_phone,
        c.email AS customer_email,
        dr.name AS driver_name, dr.phone AS driver_phone,
        dr.vehicle_plate AS driver_plate,
        d.id AS delivery_id, d.status AS delivery_status,
        d.attempts, d.eta_minutes,
        (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) AS item_count
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      LEFT JOIN drivers dr ON o.driver_id = dr.id
      LEFT JOIN deliveries d ON d.order_id = o.id
      LIMIT 1
    `;
    const rows = await pool.query(q);
    console.log("Query 1 success.");
    
    const countRes = await pool.query(`SELECT COUNT(*) FROM orders o LEFT JOIN customers c ON o.customer_id = c.id`);
    console.log("Query 2 success.");
    
    const stats = await pool.query(`
      SELECT
        COUNT(*)                                              AS total,
        COUNT(*) FILTER (WHERE status IN ('pending','new_order','paid')) AS new_orders,
        COUNT(*) FILTER (WHERE status IN ('processing','packed_ready','driver_assigned')) AS in_progress,
        COUNT(*) FILTER (WHERE status = 'out_for_delivery')  AS out_for_delivery,
        COUNT(*) FILTER (WHERE status = 'delivery_attempted') AS delivery_attempted,
        COUNT(*) FILTER (WHERE status = 'delivered')         AS delivered,
        COUNT(*) FILTER (WHERE status = 'dispute')           AS disputes,
        COALESCE(SUM(total) FILTER (WHERE status = 'delivered'), 0) AS revenue
      FROM orders
    `);
    console.log("Query 3 success.");
  } catch (e) {
    console.error("Error:", e.message);
  } finally {
    pool.end();
  }
}
test();
