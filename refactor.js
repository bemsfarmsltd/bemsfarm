const fs = require('fs');

const files = [
  'server/src/routes/customers_admin.js',
  'server/src/routes/dashboard.js',
  'server/src/routes/deliveries_admin.js',
  'server/src/routes/orders_admin.js',
  'server/src/routes/pos_admin.js',
  'server/src/routes/reports_admin.js',
  'server/test_all_orders.js',
  'server/test_deliveries.js',
  'server/test_orders_query.js',
  'server/test_returns_query.js'
];

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  let content = fs.readFileSync(file, 'utf8');

  // We want to replace JOIN customers with JOIN users
  content = content.replace(/JOIN customers /g, 'JOIN users ');
  content = content.replace(/FROM customers /g, 'FROM users ');
  content = content.replace(/INTO customers\b/g, 'INTO users');
  content = content.replace(/UPDATE customers\b/g, 'UPDATE users');
  content = content.replace(/FROM customers\b/g, 'FROM users');
  content = content.replace(/JOIN customers\b/g, 'JOIN users');

  // Replace area to address
  content = content.replace(/c\.area/g, 'c.address');
  content = content.replace(/u\.area/g, 'u.address');
  content = content.replace(/area AS zone/g, 'address AS zone');
  content = content.replace(/zone \|\| area/g, 'zone || address');
  
  // Specific where clauses
  content = content.replace(/const where = \[\];/g, 'const where = ["c.role = \'user\'"];');
  content = content.replace(/WHERE 1=1/g, "WHERE u.role = 'user'");
  
  // For total count stats
  content = content.replace(/FROM customers\n/g, "FROM users WHERE role = 'user'\n");
  content = content.replace(/FROM customers\r\n/g, "FROM users WHERE role = 'user'\r\n");

  fs.writeFileSync(file, content);
  console.log('Refactored ' + file);
}
