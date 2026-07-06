const { Pool } = require("pg");
require("dotenv").config({ path: "C:/Users/USER/OneDrive/Documents/frutella/server/.env" });

async function migrate() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: false
  });

  try {
    console.log("🚀 Starting product table database migrations...");

    // 1. Add hsn_code
    await pool.query(`
      ALTER TABLE products 
      ADD COLUMN IF NOT EXISTS hsn_code VARCHAR(50);
    `);
    console.log("✅ Column 'hsn_code' added successfully.");

    // 2. Clean up empty string barcodes to prevent unique constraint conflicts
    const cleanup = await pool.query(`
      UPDATE products 
      SET barcode = NULL 
      WHERE barcode = '' OR TRIM(barcode) = '';
    `);
    console.log(`✅ Backfilled ${cleanup.rowCount} empty string barcodes to NULL.`);

    // 3. Add UNIQUE constraint on barcode
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint 
          WHERE conname = 'products_barcode_key'
        ) THEN
          ALTER TABLE products ADD CONSTRAINT products_barcode_key UNIQUE (barcode);
          RAISE NOTICE 'Unique constraint products_barcode_key created.';
        ELSE
          RAISE NOTICE 'Unique constraint products_barcode_key already exists.';
        END IF;
      END
      $$;
    `);
    console.log("✅ Unique constraint 'products_barcode_key' check completed.");

  } catch (err) {
    console.error("❌ Migration failed:", err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();
