const fs = require('fs');
const path = require('path');

const file = 'c:\\Users\\Dell\\Desktop\\Bemsfarm\\bemsfarm\\server\\src\\routes\\orders_admin.js';
let content = fs.readFileSync(file, 'utf8');

// The blocks we want to extract and move up:
// 1. /form-data/drivers
// 2. /invoices and /invoices/:id/status
// 3. /returns and /returns/:id/status

// They all start from line 539 to the end of the file.
// Let's find the exact string "router.get("/form-data/drivers""
const markerIndex = content.indexOf('// ── GET /api/admin/orders/form-data/drivers');
if (markerIndex !== -1) {
  const blocksToMove = content.slice(markerIndex);
  const topPart = content.slice(0, markerIndex);
  
  // We want to insert blocksToMove right before router.get("/:id"
  const targetIndex = topPart.indexOf('// ── GET /api/admin/orders/:id');
  if (targetIndex !== -1) {
    const newContent = topPart.slice(0, targetIndex) + blocksToMove + '\n\n' + topPart.slice(targetIndex);
    fs.writeFileSync(file, newContent, 'utf8');
    console.log("Successfully moved routes up.");
  } else {
    console.log("Could not find /:id marker.");
  }
} else {
  console.log("Could not find form-data marker.");
}
