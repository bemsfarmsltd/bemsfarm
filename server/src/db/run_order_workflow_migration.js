const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const pool = require('./pool');

async function runMigration() {
  const client = await pool.connect();
  try {
    console.log('🚀 Running Order-to-Delivery database migration...');
    const sql = fs.readFileSync(path.join(__dirname, 'order_workflow_migration.sql'), 'utf8');
    await client.query(sql);
    console.log('✅ Order-to-Delivery database migration completed successfully!');

    // Verify columns on orders
    const orderCols = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'orders' 
        AND column_name IN ('packed_at', 'packed_by', 'invoice_number', 'invoice_printed_by', 'driver_arrived_at', 'customer_confirmed', 'driver_confirmed', 'delivery_override_by');
    `);
    console.log('📋 Verified orders columns:', orderCols.rows.map(r => r.column_name));

    // Verify inventory_transactions table
    const invCheck = await client.query(`SELECT COUNT(*) FROM inventory_transactions`);
    console.log('📋 Verified inventory_transactions table ready (row count:', invCheck.rows[0].count, ')');

    // Verify order_item_scans table
    const scanCheck = await client.query(`SELECT COUNT(*) FROM order_item_scans`);
    console.log('📋 Verified order_item_scans table ready (row count:', scanCheck.rows[0].count, ')');

  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
