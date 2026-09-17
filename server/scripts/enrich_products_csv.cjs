const fs = require('fs');
const path = require('path');

// Curated image dictionary for specific products and categories
function getImageUrl(name, brand, category) {
  const n = (name || '').toLowerCase();
  const b = (brand || '').toLowerCase();
  const c = (category || '').toLowerCase();

  // 1. Specific product matchers
  if (n.includes('egg')) {
    return 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=600&auto=format&fit=crop&q=80';
  }
  if (n.includes('milo')) {
    return 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=600&auto=format&fit=crop&q=80';
  }
  if (n.includes('peak') || n.includes('three crown') || n.includes('cowbell') || n.includes('loyal milk') || n.includes('milk')) {
    return 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=600&auto=format&fit=crop&q=80';
  }
  if (n.includes('ovaltine') || n.includes('chocolate')) {
    return 'https://images.unsplash.com/photo-1517578239113-b03992dcdd25?w=600&auto=format&fit=crop&q=80';
  }
  if (n.includes('sugar')) {
    return 'https://images.unsplash.com/photo-1581441363689-1f3c3c414635?w=600&auto=format&fit=crop&q=80';
  }
  if (n.includes('sardine') || n.includes('titus') || n.includes('geisha')) {
    return 'https://images.unsplash.com/photo-1534483509719-3feaee7c30da?w=600&auto=format&fit=crop&q=80';
  }
  if (n.includes('mayonnaise') || n.includes('bama') || n.includes('whippy')) {
    return 'https://images.unsplash.com/photo-1589135233689-d49fc3b25933?w=600&auto=format&fit=crop&q=80';
  }
  if (n.includes('salt')) {
    return 'https://images.unsplash.com/photo-1518110925495-5fe2fda0442c?w=600&auto=format&fit=crop&q=80';
  }
  if (n.includes('oil') || c.includes('cooking oil')) {
    return 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=600&auto=format&fit=crop&q=80';
  }
  if (n.includes('tomato') || n.includes('pepper') || n.includes('de rica') || n.includes('sonia') || n.includes('tasty tom') || c.includes('tomato')) {
    return 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=600&auto=format&fit=crop&q=80';
  }
  if (n.includes('noodle') || n.includes('indomie') || n.includes('belleful') || n.includes('hungry man') || n.includes('minimie') || n.includes('superpack')) {
    return 'https://images.unsplash.com/photo-1612927601601-6638404737ce?w=600&auto=format&fit=crop&q=80';
  }
  if (n.includes('spaghetti') || n.includes('twist') || n.includes('pasta')) {
    return 'https://images.unsplash.com/photo-1551462147-ff29053bfc14?w=600&auto=format&fit=crop&q=80';
  }
  if (n.includes('semovita') || n.includes('wheat') || n.includes('poundo') || n.includes('flour') || n.includes('oat')) {
    return 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=600&auto=format&fit=crop&q=80';
  }
  if (n.includes('custard') || c.includes('custard')) {
    return 'https://images.unsplash.com/photo-1587314168485-3236d6710814?w=600&auto=format&fit=crop&q=80';
  }
  if (n.includes('maggi') || n.includes('knorr') || n.includes('royco') || n.includes('terra') || n.includes('thyme') || n.includes('curry') || n.includes('bay leaves') || n.includes('seasoning') || c.includes('seasoning')) {
    return 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=600&auto=format&fit=crop&q=80';
  }
  if (n.includes('hypo') || n.includes('bleach') || n.includes('liquid')) {
    return 'https://images.unsplash.com/photo-1585670270677-43ce90520613?w=600&auto=format&fit=crop&q=80';
  }
  if (n.includes('viva') || n.includes('good mama') || n.includes('so klin') || n.includes('detergent') || n.includes('washing soap') || c.includes('home care') || c.includes('detergent')) {
    return 'https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=600&auto=format&fit=crop&q=80';
  }
  if (n.includes('morning fresh')) {
    return 'https://images.unsplash.com/photo-1585670270677-43ce90520613?w=600&auto=format&fit=crop&q=80';
  }
  if (n.includes('tooth paste') || n.includes('tissue') || n.includes('handkerchief') || n.includes('pampers') || n.includes('sanitary') || c.includes('personal care') || c.includes('toiletries')) {
    return 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=600&auto=format&fit=crop&q=80';
  }

  // Fallback for general groceries
  return 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=600&auto=format&fit=crop&q=80';
}

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

function formatCSVCell(val) {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

const csvPath = path.resolve(__dirname, '../../bems_products_upload.csv');
let rawContent = fs.readFileSync(csvPath, 'utf8');
if (rawContent.charCodeAt(0) === 0xFEFF) {
  rawContent = rawContent.slice(1);
}

// Parse rows
const lines = rawContent.split(/\r?\n/).filter(line => line.trim().length > 0);
const headers = parseCSVLine(lines[0]).map(h => h.trim().replace(/^\uFEFF/, ''));

const imgColIdx = headers.indexOf('main_image_url');
const nameColIdx = headers.indexOf('name');
const catColIdx = headers.indexOf('category');
const brandColIdx = headers.indexOf('brand');

let updatedCount = 0;
const outputLines = [lines[0]];

for (let i = 1; i < lines.length; i++) {
  const cells = parseCSVLine(lines[i]);
  if (cells.length < 2) continue;

  const name = cells[nameColIdx] || '';
  const cat = cells[catColIdx] || '';
  const brand = cells[brandColIdx] || '';
  
  const newImg = getImageUrl(name, brand, cat);
  cells[imgColIdx] = newImg;
  updatedCount++;

  outputLines.push(cells.map(formatCSVCell).join(','));
}

fs.writeFileSync(csvPath, outputLines.join('\n') + '\n', 'utf8');
console.log(`Successfully updated ${updatedCount} products with high-resolution image URLs in ${csvPath}`);
