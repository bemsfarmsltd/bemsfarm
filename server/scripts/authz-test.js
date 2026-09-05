#!/usr/bin/env node

const assert = require("assert");

// The middleware validates required configuration at import time. These
// placeholders keep this pure authorization test independent of .env and DB.
process.env.JWT_SECRET ||= "authz-test-jwt-secret";
process.env.DATABASE_URL ||= "postgresql://authz:test@localhost:5432/authz_test";

const { requireRole, adminOnly } = require("../src/middleware/authMiddleware");
const { ALL_ROLES, ADMIN_ROLES, CUSTOMER_ROLE } = require("../src/config/roles");

function run(middleware, user) {
  const response = { statusCode: null, body: null };
  const result = {
    status(code) {
      response.statusCode = code;
      return { json(body) { response.body = body; } };
    },
  };
  let nextCalled = false;
  middleware({ user }, result, () => { nextCalled = true; });
  return { ...response, nextCalled };
}

assert(ALL_ROLES.includes(CUSTOMER_ROLE));
assert(ADMIN_ROLES.every((role) => ALL_ROLES.includes(role)));

assert.strictEqual(run(requireRole("manager"), { role: "manager" }).nextCalled, true);
assert.strictEqual(run(requireRole("manager"), { role: "cashier" }).statusCode, 403);
assert.strictEqual(run(requireRole("manager"), null).statusCode, 401);
assert.strictEqual(run(adminOnly, { role: "admin" }).nextCalled, true);
assert.strictEqual(run(adminOnly, { role: "cashier" }).statusCode, 403);

console.log("✅ Authorization middleware checks passed");