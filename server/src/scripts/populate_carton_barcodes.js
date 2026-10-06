require('dotenv').config();
const pool = require('../db/pool');
const fs = require('fs');
const path = require('path');

function calculateEan13Checksum(code12) {
  const digits = String(code12).padStart(12, '0').split('').map(Number);
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += i % 2 === 0 ? digits[i] : digits[i] * 3;
  }
  const mod = sum % 10;
  return mod === 0 ? 0 : 10 - mod;
}

async function run() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const existing = await client.query('SELECT barcode, carton_barcode FROM products');
    const usedBarcodes = new Set();
    existing.rows.forEach(r => {
      if (r.barcode) usedBarcodes.add(r.barcode.trim());
      if (r.carton_barcode) usedBarcodes.add(r.carton_barcode.trim());
    });

    const bulkProds = await client.query(
      'SELECT id, name, pcs_per_carton, barcode, carton_barcode FROM products WHERE pcs_per_carton > 1 ORDER BY id'
    );
    console.log(`Found ${bulkProds.rows.length} bulk products`);

    const updatedMap = {}; // id -> carton_barcode

    for (const prod of bulkProds.rows) {
      let cartonCode = prod.carton_barcode;
      if (!cartonCode) {
        let attempts = 0;
        do {
          const pIdPad = String(prod.id).padStart(4, '0').slice(-4);
          const seed = String(Math.floor(10000 + Math.random() * 90000));
          const code12 = '6159' + pIdPad.slice(1, 4) + seed.slice(0, 5);
          const check = calculateEan13Checksum(code12);
          cartonCode = code12 + check;
          attempts++;
        } while (usedBarcodes.has(cartonCode) && attempts < 100);

        usedBarcodes.add(cartonCode);

        await client.query('UPDATE products SET carton_barcode = $1 WHERE id = $2', [cartonCode, prod.id]);
        await client.query('UPDATE product_packaging_units SET barcode = $1 WHERE product_id = $2 AND multiplier > 1', [cartonCode, prod.id]);
        console.log(`[ID ${prod.id}] ${prod.name} -> Piece: ${prod.barcode} | Carton: ${cartonCode}`);
      }
      updatedMap[prod.name.toLowerCase().trim()] = cartonCode;
    }

    await client.query('COMMIT');
    console.log('Database updated successfully with unique carton barcodes!');

    // Now update CSV files: bems_stock_upload_final_aligned.csv
    const csvPath = path.join(__dirname, '../../bems_stock_upload_final_aligned.csv');
    if (fs.existsSync(csvPath)) {
      const csvContent = fs.readFileSync(csvPath, 'utf8');
      const lines = csvContent.split('\n');
      const header = lines[0].split(',');
      const cartonBarcodeIdx = header.indexOf('carton_barcode');
      const nameIdx = header.indexOf('name');

      if (cartonBarcodeIdx !== -1 && nameIdx !== -1) {
        const newLines = [lines[0]];
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i];
          if (!line.trim()) continue;
          const cols = line.split(',');
          const pName = cols[nameIdx]?.toLowerCase().trim();
          if (updatedMap[pName] && (!cols[cartonBarcodeIdx] || cols[cartonBarcodeIdx].trim() === '')) {
            cols[cartonBarcodeIdx] = updatedMap[pName];
          }
          newLines.push(cols.join(','));
        }
        fs.writeFileSync(csvPath, newLines.join('\n'), 'utf8');
        console.log(`Updated CSV ${csvPath} with carton barcodes!`);
      }
    }

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error during execution:', err);
  } finally {
    client.release();
    process.exit();
  }
}

run();
