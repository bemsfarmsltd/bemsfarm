/**
 * Migration: Add app_developer and salesperson to users and staff role check constraints
 */
require('dotenv').config();
const pool = require('../src/db/pool');

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    console.log('Updating users_role_check...');
    await client.query('ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check');
    await client.query(`
      ALTER TABLE users ADD CONSTRAINT users_role_check 
      CHECK (role::text = ANY (ARRAY[
        'superadmin', 'manager', 'accountant', 'delivery_manager', 
        'cashier', 'kitchen_staff', 'admin', 'user', 
        'salesperson', 'app_developer'
      ]::text[]))
    `);

    console.log('Updating staff_system_role_check...');
    await client.query('ALTER TABLE staff DROP CONSTRAINT IF EXISTS staff_system_role_check');
    await client.query(`
      ALTER TABLE staff ADD CONSTRAINT staff_system_role_check 
      CHECK (system_role::text = ANY (ARRAY[
        'superadmin', 'manager', 'accountant', 'delivery_manager', 
        'cashier', 'kitchen_staff', 'admin', 
        'salesperson', 'app_developer'
      ]::text[]))
    `);

    await client.query('COMMIT');
    console.log('Role check constraint migration completed successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    client.release();
    pool.end();
  }
}

migrate();
