const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:bemsfarms11223355!@db.helhpaybcjrxljizblve.supabase.co:5432/postgres'
});

async function runDeepClean() {
  const client = await pool.connect();
  console.log('🚀 Starting Database Deep Clean...');

  try {
    await client.query('BEGIN');

    // 1. Clean Orders, Invoices, Deliveries, Payments, and Coupons
    console.log('🧹 1. Cleaning Orders, Payments, Deliveries, and Coupons...');
    await client.query(`
      DELETE FROM order_tracking_events;
      DELETE FROM order_status_history;
      DELETE FROM order_items;
      DELETE FROM return_items;
      DELETE FROM returns;
      DELETE FROM invoices;
      DELETE FROM checkout_intents;
      DELETE FROM payment_webhook_logs;
      DELETE FROM payments;
      DELETE FROM delivery_assignments;
      DELETE FROM deliveries;
      DELETE FROM driver_feedback;
      DELETE FROM pos_held_orders;
      DELETE FROM pos_transactions;
      DELETE FROM pos_sessions;
      DELETE FROM income;
      DELETE FROM expenses;
      DELETE FROM money_transfers;
      DELETE FROM coupon_usages;
      DELETE FROM coupons;
      DELETE FROM orders;
      DELETE FROM issue_activities;
      DELETE FROM issues;
      DELETE FROM warranties;
    `);

    // 2. Clean Customer Data, Carts, and Customer Messages
    console.log('🧹 2. Cleaning Customer Data, Carts, and Messages...');
    await client.query(`
      DELETE FROM cart_events;
      DELETE FROM cart_items;
      DELETE FROM cart_state;
      DELETE FROM customer_cart_items;
      DELETE FROM customer_carts;
      DELETE FROM customer_saved_items;
      DELETE FROM customer_addresses;
      DELETE FROM user_addresses;
      DELETE FROM customer_broadcast_reads;
      DELETE FROM customer_broadcasts;
      DELETE FROM customer_messages;
      DELETE FROM customer_conversations;
      DELETE FROM customer_preferences;
      DELETE FROM customer_activity_log;
      DELETE FROM customer_auth;
      DELETE FROM customer_devices;
      DELETE FROM customer_dietary_profiles;
      DELETE FROM customer_loyalty;
      DELETE FROM customer_notifications;
      DELETE FROM customer_wallets;
      DELETE FROM loyalty_transactions;
      DELETE FROM contact_messages;
      DELETE FROM email_subscriptions;
      DELETE FROM customers;
    `);

    // 3. Delete non-admin, non-staff users (regular customer users)
    console.log('🧹 3. Cleaning customer user accounts (preserving admin and staff logins)...');
    const deletedUsers = await client.query(`
      DELETE FROM users 
      WHERE role = 'user' OR (role IS NULL AND email NOT LIKE '%@bemsfarms.com%')
      RETURNING id, name, email, role;
    `);
    console.log(`   Deleted ${deletedUsers.rowCount} customer user records.`);

    // 4. Clean Products, Catalogue, Inventory, and Meal items (Option 2)
    console.log('🧹 4. Cleaning Products, Catalogue, and Inventory items...');
    await client.query(`
      DELETE FROM product_associations;
      DELETE FROM product_reviews;
      DELETE FROM product_images;
      DELETE FROM product_variants;
      DELETE FROM promotions_bundles;
      DELETE FROM substitutions;
      DELETE FROM meal_ingredients;
      DELETE FROM meal_associations;
      DELETE FROM meal_dietary_flags;
      DELETE FROM meal_ai_pairings;
      DELETE FROM meals;
      DELETE FROM ingredients;
      DELETE FROM stock_movements;
      DELETE FROM stock_adjustment_items;
      DELETE FROM stock_adjustments;
      DELETE FROM stock_alerts;
      DELETE FROM stock_in_items;
      DELETE FROM stock_in;
      DELETE FROM stock_out_items;
      DELETE FROM stock_out;
      DELETE FROM stock_transfer_items;
      DELETE FROM stock_transfers;
      DELETE FROM lost_items;
      DELETE FROM inventory;
      DELETE FROM catalogue;
      DELETE FROM products;
    `);

    // 5. Clean AI conversation histories and system audit logs
    console.log('🧹 5. Cleaning AI logs, conversation histories, and telemetry...');
    await client.query(`
      DELETE FROM admin_ai_conversations;
      DELETE FROM ai_conversation_messages;
      DELETE FROM ai_conversations;
      DELETE FROM ai_onboarding_data;
      DELETE FROM ai_user_activity;
      DELETE FROM ai_user_context;
      DELETE FROM chef_bems_memory;
      DELETE FROM n8n_chat_histories;
      DELETE FROM nancy_cart_sessions;
      DELETE FROM nancy_conversations;
      DELETE FROM notifications;
      DELETE FROM notification_logs;
      DELETE FROM system_audit_events;
    `);

    await client.query('COMMIT');
    console.log('✅ Deep Clean Transaction COMMITTED successfully.');

    // Verify Remaining Data
    console.log('\n--- VERIFICATION OF PRESERVED DATA ---');
    const remainingUsers = await client.query(`SELECT id, name, email, role, phone FROM users ORDER BY id ASC`);
    console.log('Preserved Admin & Staff Accounts:');
    console.table(remainingUsers.rows);

    const checkTables = [
      'users', 'staff', 'roles', 'staff_roles', 'delivery_zones', 'warehouses', 'categories', 'settings', 'system_settings', 'drivers',
      'products', 'orders', 'order_items', 'inventory', 'customers'
    ];
    console.log('\nFinal Table Row Counts:');
    for (const t of checkTables) {
      try {
        const c = await client.query(`SELECT count(*) FROM "${t}"`);
        console.log(` - ${t}: ${c.rows[0].count} rows`);
      } catch (e) {
        console.log(` - ${t}: table not found / skipped (${e.message})`);
      }
    }

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error during Deep Clean (Transaction ROLLED BACK):', err);
  } finally {
    client.release();
    pool.end();
  }
}

runDeepClean();
