const fs = require('fs');
const path = require('path');
const swagger = require('./swagger-output.json');

const endpoints = Object.keys(swagger.paths);
const clientDir = path.join(__dirname, '../client/src');
const adminDir = path.join(__dirname, '../Bems-Farms-Admin-Front-end/src');

function getAllFiles(dirPath, arrayOfFiles) {
  const files = fs.readdirSync(dirPath);
  arrayOfFiles = arrayOfFiles || [];

  files.forEach((file) => {
    if (fs.statSync(dirPath + "/" + file).isDirectory()) {
      arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
    } else {
      if (file.endsWith('.js') || file.endsWith('.jsx')) {
        arrayOfFiles.push(path.join(dirPath, '/', file));
      }
    }
  });

  return arrayOfFiles;
}

const clientFiles = fs.existsSync(clientDir) ? getAllFiles(clientDir) : [];
const adminFiles = fs.existsSync(adminDir) ? getAllFiles(adminDir) : [];
const allFiles = [...clientFiles, ...adminFiles];

// Pre-read all file contents to save I/O
const fileContents = allFiles.map(f => fs.readFileSync(f, 'utf-8'));

const results = {
  connected: [],
  unconnected: []
};

// Normalize path to regex for searching
// e.g. /api/orders/{id} -> /api/orders/.* or /orders/.*
// But wait, the client usually uses relative paths since api base url is configured
// like api.get('/orders') or api.get(`/orders/${id}`)
// We will strip /api prefix because axios usually has baseURL = '/api'
endpoints.forEach(ep => {
  let searchPath = ep.replace('/api', '');
  if (searchPath === '') searchPath = '/';
  
  // Replace {id} with ${...} or generic regex, 
  // actually, let's just extract the static parts of the path.
  // /orders/{id}/status -> /orders/
  const staticParts = searchPath.split('{')[0].replace(/\/$/, '');
  
  if (staticParts.length < 2) {
    // If it's just '/' or empty, we need to be careful with false positives, but let's assume root endpoints are used.
    results.connected.push(ep);
    return;
  }

  let found = false;
  for (const content of fileContents) {
    if (content.includes(staticParts)) {
      found = true;
      break;
    }
  }

  if (found) {
    results.connected.push(ep);
  } else {
    results.unconnected.push(ep);
  }
});

console.log(`Total Endpoints: ${endpoints.length}`);
console.log(`Connected: ${results.connected.length}`);
console.log(`Unconnected (Potential Redundant/Fake): ${results.unconnected.length}`);
console.log('\n--- Unconnected Endpoints ---');
results.unconnected.forEach(ep => console.log(ep));
