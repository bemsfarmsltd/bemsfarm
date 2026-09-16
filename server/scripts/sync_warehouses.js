const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:bemsfarms11223355!@db.helhpaybcjrxljizblve.supabase.co:5432/postgres'
});

async function run() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Reassign any movements from 19, 20
    await client.query('UPDATE stock_movements SET warehouse_id = 1 WHERE warehouse_id = 19');
    await client.query('UPDATE stock_movements SET warehouse_id = 2 WHERE warehouse_id = 20');

    // 2. Remove duplicate warehouses
    await client.query('DELETE FROM warehouses WHERE id IN (19, 20)');

    // 3. Update main warehouses with rich data
    await client.query(`
      UPDATE warehouses SET 
        name = 'Main Central Store',
        code = 'WH-MAIN',
        location = '14 Farm Road, Epe, Lagos',
        manager = 'Henry Adeleke',
        capacity = 3500,
        status = 'active',
        updated_at = NOW()
      WHERE id = 1
    `);

    await client.query(`
      UPDATE warehouses SET 
        name = 'Cold Storage Hub',
        code = 'WH-COLD',
        location = 'Cold Chain Section, Block C, Epe, Lagos',
        manager = 'Bems Farms Admin',
        capacity = 1500,
        status = 'active',
        updated_at = NOW()
      WHERE id = 2
    `);

    await client.query(`
      UPDATE warehouses SET 
        name = 'Dry Goods & Grains Depot',
        code = 'WH-DRY',
        location = 'Central Logistics Warehouse, Epe, Lagos',
        manager = 'Kalu victor',
        capacity = 2500,
        status = 'active',
        updated_at = NOW()
      WHERE id = 3
    `);

    await client.query(`
      UPDATE warehouses SET 
        name = 'Fresh Harvest & Farm Store',
        code = 'WH-FARM',
        location = 'Farm Gate & Processing Facility, Epe, Lagos',
        manager = 'Henry Adeleke',
        capacity = 2000,
        status = 'active',
        updated_at = NOW()
      WHERE id = 4
    `);

    // 4. Distribute product inventory across warehouses
    // Cold storage
    await client.query(`
      UPDATE products SET warehouse_id = 2 
      WHERE category_id IN (
        SELECT id FROM categories WHERE name ILIKE '%cold%' OR name ILIKE '%meat%' OR name ILIKE '%poultry%' OR name ILIKE '%fish%' OR name ILIKE '%frozen%' OR name ILIKE '%dairy%'
      ) OR name ILIKE '%chicken%' OR name ILIKE '%beef%' OR name ILIKE '%fish%' OR name ILIKE '%egg%' OR name ILIKE '%turkey%'
    `);

    // Dry goods
    await client.query(`
      UPDATE products SET warehouse_id = 3 
      WHERE warehouse_id IS NULL AND (
        category_id IN (
          SELECT id FROM categories WHERE name ILIKE '%dry%' OR name ILIKE '%grain%' OR name ILIKE '%spice%' OR name ILIKE '%oil%' OR name ILIKE '%pasta%' OR name ILIKE '%pack%'
        ) OR name ILIKE '%rice%' OR name ILIKE '%oil%' OR name ILIKE '%flour%' OR name ILIKE '%maggi%' OR name ILIKE '%semovita%' OR name ILIKE '%noodle%' OR name ILIKE '%detergent%' OR name ILIKE '%sachet%' OR name ILIKE '%curry%' OR name ILIKE '%milo%'
      )
    `);

    // Fresh produce & farm
    await client.query(`
      UPDATE products SET warehouse_id = 4 
      WHERE warehouse_id IS NULL AND (
        category_id IN (
          SELECT id FROM categories WHERE name ILIKE '%veg%' OR name ILIKE '%fruit%' OR name ILIKE '%tuber%' OR name ILIKE '%root%' OR name ILIKE '%fresh%'
        ) OR name ILIKE '%tomato%' OR name ILIKE '%yam%' OR name ILIKE '%pepper%' OR name ILIKE '%onion%' OR name ILIKE '%plantain%' OR name ILIKE '%potato%'
      )
    `);

    // Default remaining to Main Central Store (warehouse 1)
    await client.query('UPDATE products SET warehouse_id = 1 WHERE warehouse_id IS NULL');

    await client.query('COMMIT');
    console.log('Migration committed successfully!');

    const summary = await client.query(`
      SELECT
        w.id, w.name, w.code, w.location, w.manager, w.capacity, w.status,
        COUNT(DISTINCT p.id) AS product_count,
        COALESCE(SUM(p.stock), 0) AS total_units
      FROM warehouses w
      LEFT JOIN products p ON p.warehouse_id = w.id AND p.status != 'archived'
      GROUP BY w.id
      ORDER BY w.id
    `);
    console.log('Summary:', JSON.stringify(summary.rows, null, 2));

  } catch(e) {
    await client.query('ROLLBACK');
    console.error('Error running migration:', e);
  } finally {
    client.release();
    pool.end();
  }
}

run();
