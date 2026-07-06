const { Pool } = require("pg");
require("dotenv").config({ path: "C:/Users/USER/OneDrive/Documents/frutella/server/.env" });

async function migrate() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: false
  });

  try {
    console.log("🚀 Starting database schema updates and seed cleanup...");

    // 1. Add description to categories
    await pool.query(`
      ALTER TABLE categories 
      ADD COLUMN IF NOT EXISTS description TEXT;
    `);
    console.log("✅ Column 'description' added to 'categories' table.");

    // 2. Add / ensure 'source' column exists on 'orders' table
    await pool.query(`
      ALTER TABLE orders 
      ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'Web App';
    `);
    console.log("✅ Column 'source' checked/added to 'orders' table.");

    // 3. Backfill order sources
    const backfillWeb = await pool.query(`
      UPDATE orders 
      SET source = 'Web App' 
      WHERE source = 'online' OR source IS NULL;
    `);
    console.log(`✅ Backfilled ${backfillWeb.rowCount} orders with source 'Web App'.`);

    const backfillPos = await pool.query(`
      UPDATE orders 
      SET source = 'Physical Store (POS)' 
      WHERE source = 'pos';
    `);
    console.log(`✅ Backfilled ${backfillPos.rowCount} orders with source 'Physical Store (POS)'.`);

    // 4. Remove seeded/mock products
    const sampleProducts = [
      'Ofada Rice',
      'Palm Oil',
      'Black-eyed Beans',
      'Garri (Ijebu)',
      'Fresh Tomatoes',
      'Ugu Leaves',
      'Groundnut Oil',
      'Dried Crayfish',
      'White Yam',
      'Fresh Pepper (Tatashe)'
    ];
    const deleteRes = await pool.query(`
      DELETE FROM products 
      WHERE name = ANY($1)
    `, [sampleProducts]);
    console.log(`✅ Deleted ${deleteRes.rowCount} hardcoded/sample products from database.`);

  } catch (err) {
    console.error("❌ Migration failed:", err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();
