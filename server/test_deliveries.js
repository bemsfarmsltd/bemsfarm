require('dotenv').config({path: './.env'});
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function test() {
  try {
    const q1 = `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'deliveries'`;
    const res1 = await pool.query(q1);
    console.log("Deliveries columns:", res1.rows.map(r => r.column_name + ':' + r.data_type).join(", "));
    
    // Let's test the /active query just to see if it breaks
    const activeQuery = `
      SELECT
        d.id, d.delivery_ref, d.status, d.attempts,
        d.eta_minutes, d.assigned_at, d.dispatched_at,
        d.delivery_address,
        o.id AS order_id, o.total AS order_total, o.notes,
        COALESCE(o.customer_name, c.name, 'Walk-in') AS customer_name,
        COALESCE(o.customer_phone, c.phone, '')       AS customer_phone,
        dr.id AS driver_id, dr.name AS driver_name,
        dr.phone AS driver_phone, dr.vehicle_plate AS driver_plate,
        dr.vehicle_type,
        dz.zone_name AS zone
      FROM deliveries d
      JOIN orders o ON d.order_id = o.id
      LEFT JOIN customers c ON o.customer_id = c.id
      LEFT JOIN drivers dr ON d.driver_id = dr.id
      LEFT JOIN delivery_zones dz ON d.zone_id = dz.zone_id
      LIMIT 1
    `;
    await pool.query(activeQuery);
    console.log("Active Query works.");
  } catch(e) {
    console.error("Error:", e.message);
  }
  pool.end();
}
test();
