require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function run() {
  try {
    const { rows } = await pool.query('SELECT sku, name, image_url FROM products ORDER BY id ASC');
    
    let md = '# Product Image Audit Report\n\n';
    md += 'Please review the images below. Let me know the SKU of any product where the image is incorrect or missing.\n\n';
    md += '| SKU | Product Name | Image |\n';
    md += '| --- | --- | --- |\n';
    
    for (const p of rows) {
      const img = p.image_url ? `![${p.name}](${p.image_url})` : '❌ Missing';
      md += `| ${p.sku} | ${p.name} | ${img} |\n`;
    }
    
    fs.writeFileSync('C:\\Users\\Dell\\.gemini\\antigravity\\brain\\5c73cc60-0d6d-41b3-a57f-d21577275af1\\image_audit.md', md);
    console.log('Report generated at image_audit.md');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    pool.end();
  }
}
run();
