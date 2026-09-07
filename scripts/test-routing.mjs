import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const code = readFileSync(new URL('../shared/authRouting.js', import.meta.url), 'utf8');
const { isStaff, STAFF_HOME, customerHome, appUrl } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
for (const role of ['superadmin','admin','manager','accountant','delivery_manager','cashier','storekeeper','kitchen_staff']) {
  assert.equal(isStaff(role), true);
  assert.ok(STAFF_HOME[role].startsWith('/'));
}
for (const role of ['user', 'unknown', 'constructor', '__proto__', undefined]) assert.equal(isStaff(role), false);
for (const path of ['https://evil.example', '//evil.example', '/admin', '/login']) assert.equal(customerHome(path), '/home');
assert.equal(customerHome('/checkout'), '/checkout');
for (const origin of ['https://www.bemsfarms.com', 'http://localhost:5173']) {
  globalThis.window = { location: { origin } };
  assert.equal(appUrl('admin', '/login'), `${origin}/admin/login`);
  assert.equal(appUrl('client', '/login'), `${origin}/login`);
}
console.log('Role destinations and same-origin routing checks passed');
