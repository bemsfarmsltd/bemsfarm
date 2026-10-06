const { Pool } = require("pg");
require("dotenv").config({ path: "server/.env" });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function runMigration() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    console.log("Starting Product Consolidation Migration...");

    // 1. Ensure columns exist
    await client.query(`
      ALTER TABLE products
      ADD COLUMN IF NOT EXISTS pcs_per_carton INTEGER DEFAULT 1,
      ADD COLUMN IF NOT EXISTS carton_price NUMERIC DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS carton_barcode VARCHAR DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS carton_unit_name VARCHAR DEFAULT 'Carton',
      ADD COLUMN IF NOT EXISTS piece_unit_name VARCHAR DEFAULT 'Piece';
    `);

    // 2. Fetch all products
    const res = await client.query("SELECT * FROM products ORDER BY id ASC");
    const prods = res.rows;

    const bulkRegex = /\s*\((Carton|Bag|Pack|Box|Bundle|Crate)\s*(?:of\s*(\d+))?\)\s*(?:#\d+)?$/i;
    const pieceRegex = /\s*\((Piece|Tin|Unit|Sachet|Bottle|Cup)\)\s*(?:#\d+)?$/i;

    const bulkItems = [];
    const pieceItems = [];

    for (const p of prods) {
      const bulkMatch = p.name.match(bulkRegex);
      const pieceMatch = p.name.match(pieceRegex);

      if (bulkMatch) {
        const baseName = p.name.replace(bulkRegex, "").trim();
        const unitName = bulkMatch[1] || "Carton";
        const pcsPer = bulkMatch[2] ? parseInt(bulkMatch[2]) : 12;
        bulkItems.push({ ...p, baseName, unitName, pcsPer });
      } else if (pieceMatch) {
        const baseName = p.name.replace(pieceRegex, "").trim();
        const unitName = pieceMatch[1] || "Piece";
        pieceItems.push({ ...p, baseName, unitName });
      }
    }

    console.log(`Identified ${bulkItems.length} bulk items and ${pieceItems.length} piece items.`);

    let mergedCount = 0;
    const mergedPieceIds = new Set();
    const mergedBulkIds = new Set();

    for (const b of bulkItems) {
      // Find matching piece item
      const piece = pieceItems.find(
        (p) => p.baseName.toLowerCase() === b.baseName.toLowerCase() && !mergedPieceIds.has(p.id)
      );

      if (piece) {
        mergedPieceIds.add(piece.id);
        mergedBulkIds.add(b.id);
        mergedCount++;

        const totalPieces = (parseInt(b.stock || 0) * b.pcsPer) + parseInt(piece.stock || 0);
        const cleanName = b.baseName; // e.g. "Crown Premium Spaghetti 500g"

        // Update the primary piece product to be the unified product
        await client.query(
          `UPDATE products
           SET name = $1,
               pcs_per_carton = $2,
               carton_price = $3,
               carton_barcode = $4,
               carton_unit_name = $5,
               piece_unit_name = $6,
               stock = $7,
               stock_quantity = $7,
               unit = $8,
               available_for_sale = true,
               status = 'active',
               updated_at = NOW()
           WHERE id = $9`,
          [
            cleanName,
            b.pcsPer,
            b.price,
            b.barcode,
            b.unitName,
            piece.unitName,
            totalPieces,
            piece.unitName.toLowerCase(),
            piece.id
          ]
        );

        // Mark bulk product row as merged / inactive in sales catalog
        await client.query(
          `UPDATE products
           SET status = 'merged',
               available_for_sale = false,
               description = COALESCE(description, '') || ' [Merged into unified product #' || $1 || ']',
               updated_at = NOW()
           WHERE id = $2`,
          [piece.id, b.id]
        );

        // Upsert into product_packaging_units for complete system compatibility
        await client.query(
          `INSERT INTO product_packaging_units
             (product_id, unit_name, multiplier, price, cost_price, barcode, sku, is_default, is_active, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, false, true, NOW(), NOW())
           ON CONFLICT DO NOTHING`,
          [
            piece.id,
            b.unitName,
            b.pcsPer,
            b.price,
            b.cost_price || null,
            b.barcode || null,
            b.sku || null
          ]
        );

        console.log(`Merged: "${cleanName}" (ID #${piece.id}) | ${b.pcsPer} pcs/${b.unitName} | Total Stock: ${totalPieces} pcs (= ${Math.floor(totalPieces / b.pcsPer)} ${b.unitName}s, ${totalPieces % b.pcsPer} ${piece.unitName}s)`);
      }
    }

    // Special standalone pairs:
    // Checkers Custard Powder 45g (ID 47 bulk, ID 46 piece)
    // Checkers Milk Custard 45g (ID 49 bulk, ID 48 piece)
    // Curry Masala A (ID 134 bulk, ID 133 piece)
    const specialPairs = [
      { bulkId: 47, pieceId: 46, pcsPer: 40, unitName: 'Carton' },
      { bulkId: 49, pieceId: 48, pcsPer: 40, unitName: 'Carton' },
      { bulkId: 134, pieceId: 133, pcsPer: 12, unitName: 'Carton' },
    ];

    for (const sp of specialPairs) {
      if (!mergedPieceIds.has(sp.pieceId)) {
        const bulkRes = await client.query("SELECT * FROM products WHERE id = $1", [sp.bulkId]);
        const pieceRes = await client.query("SELECT * FROM products WHERE id = $1", [sp.pieceId]);
        if (bulkRes.rows.length && pieceRes.rows.length) {
          const b = bulkRes.rows[0];
          const p = pieceRes.rows[0];
          const cleanName = p.name.replace(pieceRegex, "").trim();
          const totalPieces = (parseInt(b.stock || 0) * sp.pcsPer) + parseInt(p.stock || 0);

          await client.query(
            `UPDATE products
             SET name = $1,
                 pcs_per_carton = $2,
                 carton_price = $3,
                 carton_barcode = $4,
                 carton_unit_name = $5,
                 piece_unit_name = 'Piece',
                 stock = $6,
                 stock_quantity = $6,
                 available_for_sale = true,
                 status = 'active',
                 updated_at = NOW()
             WHERE id = $7`,
            [cleanName, sp.pcsPer, b.price, b.barcode, sp.unitName, totalPieces, p.id]
          );

          await client.query(
            `UPDATE products
             SET status = 'merged',
                 available_for_sale = false,
                 updated_at = NOW()
             WHERE id = $1`,
            [b.id]
          );

          await client.query(
            `INSERT INTO product_packaging_units
               (product_id, unit_name, multiplier, price, cost_price, barcode, sku, is_default, is_active, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, false, true, NOW(), NOW())
             ON CONFLICT DO NOTHING`,
            [p.id, sp.unitName, sp.pcsPer, b.price, b.cost_price || null, b.barcode || null, b.sku || null]
          );

          mergedPieceIds.add(p.id);
          mergedBulkIds.add(b.id);
          mergedCount++;
          console.log(`Merged Special: "${cleanName}" (ID #${p.id})`);
        }
      }
    }

    // Clean names of remaining solo piece products (strip `(Piece)` or `(Tin)`)
    for (const p of prods) {
      if (!mergedPieceIds.has(p.id) && !mergedBulkIds.has(p.id)) {
        if (pieceRegex.test(p.name)) {
          const clean = p.name.replace(pieceRegex, "").trim();
          await client.query("UPDATE products SET name = $1 WHERE id = $2", [clean, p.id]);
          console.log(`Cleaned name: "${p.name}" -> "${clean}" (ID #${p.id})`);
        }
      }
    }

    await client.query("COMMIT");
    console.log(`\nMigration completed successfully! Total merged products: ${mergedCount}`);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Migration failed, rolled back:", err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
