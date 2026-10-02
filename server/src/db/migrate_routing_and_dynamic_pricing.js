const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const pool = require('./pool');

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    console.log('🚀 Running Routing and Dynamic Pricing Migration...');

    // 1. Add Dynamic Pricing and Route Bundling columns to delivery_zones
    await client.query(`
      ALTER TABLE delivery_zones 
        ADD COLUMN IF NOT EXISTS base_fee NUMERIC DEFAULT NULL,
        ADD COLUMN IF NOT EXISTS base_distance_km NUMERIC DEFAULT 3,
        ADD COLUMN IF NOT EXISTS per_km_rate NUMERIC DEFAULT NULL,
        ADD COLUMN IF NOT EXISTS pricing_type VARCHAR(20) DEFAULT 'hybrid',
        ADD COLUMN IF NOT EXISTS min_fee NUMERIC DEFAULT NULL,
        ADD COLUMN IF NOT EXISTS max_fee NUMERIC DEFAULT NULL,
        ADD COLUMN IF NOT EXISTS surge_multiplier NUMERIC DEFAULT 1.0,
        ADD COLUMN IF NOT EXISTS free_delivery_threshold NUMERIC DEFAULT NULL,
        ADD COLUMN IF NOT EXISTS weight_surcharge_per_5kg NUMERIC DEFAULT 0,
        ADD COLUMN IF NOT EXISTS max_batch_orders INT DEFAULT 3,
        ADD COLUMN IF NOT EXISTS batch_radius_km NUMERIC DEFAULT 3.5;
    `);

    // 2. Set default values for existing zones
    await client.query(`
      UPDATE delivery_zones SET
        base_fee = 600,
        base_distance_km = 3,
        per_km_rate = 80,
        pricing_type = 'hybrid'
      WHERE zone_id = 'ZONE001';

      UPDATE delivery_zones SET
        base_fee = 1800,
        base_distance_km = 5,
        per_km_rate = 90,
        pricing_type = 'hybrid'
      WHERE zone_id = 'ZONE002';

      UPDATE delivery_zones SET
        base_fee = 2500,
        base_distance_km = 15,
        per_km_rate = 60,
        pricing_type = 'hybrid'
      WHERE zone_id = 'ZONE003';

      UPDATE delivery_zones SET
        base_fee = 3500,
        base_distance_km = 40,
        per_km_rate = 40,
        pricing_type = 'hybrid'
      WHERE zone_id = 'ZONE004';

      UPDATE delivery_zones SET
        base_fee = 6000,
        base_distance_km = 150,
        per_km_rate = 15,
        pricing_type = 'hybrid'
      WHERE zone_id = 'ZONE005';

      UPDATE delivery_zones SET
        base_fee = 35000,
        base_distance_km = NULL,
        per_km_rate = 0,
        pricing_type = 'flat'
      WHERE zone_id = 'ZONE006';
    `);

    // 3. Add routing details to deliveries table
    await client.query(`
      ALTER TABLE deliveries
        ADD COLUMN IF NOT EXISTS route_geometry JSONB DEFAULT '[]'::jsonb,
        ADD COLUMN IF NOT EXISTS route_duration_mins NUMERIC DEFAULT NULL,
        ADD COLUMN IF NOT EXISTS waypoints JSONB DEFAULT '[]'::jsonb;
    `);

    await client.query('COMMIT');
    console.log('✅ Routing & Dynamic Pricing schema migration complete!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', err);
    process.exit(1);
  } finally {
    client.release();
    process.exit(0);
  }
}

migrate();
