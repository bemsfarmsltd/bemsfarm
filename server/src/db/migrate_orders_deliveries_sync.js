const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const pool = require('./pool');

async function runMigration() {
  const client = await pool.connect();
  try {
    console.log('🚀 Running Orders & Deliveries Synchronization Migration...');
    await client.query('BEGIN');

    // 1. Run SQL definitions
    const sqlPath = path.join(__dirname, 'orders_deliveries_sync_triggers.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    await client.query(sql);
    console.log('✅ Synchronization triggers installed successfully.');

    // 2. Data Reconciliation for existing records
    console.log('🔄 Reconciling existing orders & deliveries...');
    
    // Sync orders from existing deliveries
    const syncRes = await client.query(`
      UPDATE orders o
      SET 
        status = CASE d.status
          WHEN 'assigned' THEN 'awaiting_driver_confirmation'
          WHEN 'accepted' THEN 'driver_assigned'
          WHEN 'awaiting_pickup' THEN 'driver_assigned'
          WHEN 'picked_up' THEN 'picked_up'
          WHEN 'en_route' THEN 'shipped'
          WHEN 'arrived' THEN 'shipped'
          WHEN 'delivered' THEN 'delivered'
          WHEN 'delivery_attempted' THEN 'delivery_attempted'
          WHEN 'cancelled' THEN 'cancelled'
          ELSE o.status
        END,
        tracking_status = CASE d.status
          WHEN 'assigned' THEN 'awaiting_driver_confirmation'
          WHEN 'accepted' THEN 'driver_assigned'
          WHEN 'awaiting_pickup' THEN 'driver_assigned'
          WHEN 'picked_up' THEN 'picked_up'
          WHEN 'en_route' THEN 'out_for_delivery'
          WHEN 'arrived' THEN 'driver_arrived'
          WHEN 'delivered' THEN 'delivered'
          WHEN 'delivery_attempted' THEN 'failed_attempt'
          WHEN 'cancelled' THEN 'cancelled'
          ELSE o.tracking_status
        END,
        driver_id = COALESCE(d.driver_id, o.driver_id),
        updated_at = NOW()
      FROM deliveries d
      WHERE d.order_id = o.id
        AND (
          o.status IS DISTINCT FROM CASE d.status
            WHEN 'assigned' THEN 'awaiting_driver_confirmation'
            WHEN 'accepted' THEN 'driver_assigned'
            WHEN 'awaiting_pickup' THEN 'driver_assigned'
            WHEN 'picked_up' THEN 'picked_up'
            WHEN 'en_route' THEN 'shipped'
            WHEN 'arrived' THEN 'shipped'
            WHEN 'delivered' THEN 'delivered'
            WHEN 'delivery_attempted' THEN 'delivery_attempted'
            WHEN 'cancelled' THEN 'cancelled'
            ELSE o.status
          END
          OR o.tracking_status IS DISTINCT FROM CASE d.status
            WHEN 'assigned' THEN 'awaiting_driver_confirmation'
            WHEN 'accepted' THEN 'driver_assigned'
            WHEN 'awaiting_pickup' THEN 'driver_assigned'
            WHEN 'picked_up' THEN 'picked_up'
            WHEN 'en_route' THEN 'out_for_delivery'
            WHEN 'arrived' THEN 'driver_arrived'
            WHEN 'delivered' THEN 'delivered'
            WHEN 'delivery_attempted' THEN 'failed_attempt'
            WHEN 'cancelled' THEN 'cancelled'
            ELSE o.tracking_status
          END
        );
    `);

    console.log(`✅ Reconciled ${syncRes.rowCount} out-of-sync orders with their deliveries.`);

    // Align internal columns for any remaining orders without deliveries
    const alignRes = await client.query(`
      UPDATE orders
      SET tracking_status = CASE status
        WHEN 'pending' THEN 'order_placed'
        WHEN 'confirmed' THEN 'confirmed'
        WHEN 'packaging' THEN 'packaging'
        WHEN 'processing' THEN 'processing'
        WHEN 'packed' THEN 'packed_ready'
        WHEN 'packed_ready' THEN 'packed_ready'
        WHEN 'awaiting_driver_confirmation' THEN 'awaiting_driver_confirmation'
        WHEN 'driver_assigned' THEN 'driver_assigned'
        WHEN 'picked_up' THEN 'picked_up'
        WHEN 'shipped' THEN 'out_for_delivery'
        WHEN 'delivered' THEN 'delivered'
        WHEN 'cancelled' THEN 'cancelled'
        ELSE tracking_status
      END
      WHERE tracking_status IS NULL OR tracking_status = 'order_placed' AND status != 'pending';
    `);

    console.log(`✅ Aligned ${alignRes.rowCount} standalone orders.`);

    await client.query('COMMIT');
    console.log('🎉 Database synchronization fully active and verified!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', err);
    process.exit(1);
  } finally {
    client.release();
    process.exit(0);
  }
}

runMigration();
