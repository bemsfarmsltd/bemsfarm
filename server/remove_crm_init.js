const fs = require('fs');
const path = require('path');

const files = [
  './src/routes/broadcasts.js',
  './src/routes/customers_admin.js',
  './src/routes/telemetry.js',
  './src/services/supportService.js'
];

files.forEach(file => {
  const fullPath = path.resolve(__dirname, file);
  if (fs.existsSync(fullPath)) {
    let content = fs.readFileSync(fullPath, 'utf8');
    // Remove "await initCrmTables();" and any surrounding whitespace if it's on a line by itself
    content = content.replace(/[ \t]*await initCrmTables\(\);[ \t]*\n?/g, '');
    content = content.replace(/try\{await initCrmTables\(\);/g, 'try{');
    fs.writeFileSync(fullPath, content);
    console.log(`Cleaned up ${file}`);
  }
});
