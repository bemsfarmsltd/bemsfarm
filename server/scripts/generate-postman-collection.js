#!/usr/bin/env node
/*
 * Generates an importable Postman v2.1 collection from the Express routers.
 * Run from server/: node scripts/generate-postman-collection.js
 *
 * It deliberately emits no credentials. Set {{token}} in Postman after login.
 */
const fs = require("fs");
const path = require("path");

const routesDir = path.join(__dirname, "..", "src", "routes");
const outputDir = path.join(__dirname, "..", "..", "postman");
const routes = {
  auth: ["Authentication", "/api/auth"], orders: ["Customer Orders", "/api/orders"],
  issues: ["Customer Issues", "/api/issues"], products: ["Products", "/api/products"],
  categories: ["Categories", "/api/categories"], ai: ["Customer AI", "/api/ai"],
  dashboard: ["Admin Dashboard", "/api/dashboard"], products_admin: ["Admin Products", "/api/admin/products"],
  orders_admin: ["Admin Orders", "/api/admin/orders"], customers_admin: ["Admin Customers", "/api/admin/customers"],
  deliveries_admin: ["Admin Deliveries", "/api/admin/deliveries"], inventory_admin: ["Admin Inventory", "/api/admin/inventory"],
  config_admin: ["Admin Configuration", "/api/admin/config"], staff_admin: ["Admin Staff & HR", "/api/admin/staff"],
  accounts_admin: ["Admin Accounts", "/api/admin/accounts"], suppliers_admin: ["Admin Suppliers", "/api/admin/suppliers"],
  purchases_admin: ["Admin Purchases", "/api/admin/purchases"], reports_admin: ["Admin Reports", "/api/admin/reports"],
  stores_admin: ["Admin Stores", "/api/admin/stores"], settings_admin: ["Admin Settings", "/api/admin/settings"],
  coupons_admin: ["Admin Coupons", "/api/admin/coupons"], pos_admin: ["Admin POS", "/api/admin/pos"],
  chef_bems_admin: ["Admin Chef Bems", "/api/admin/chef-bems"], payments_admin: ["Admin Payments", "/api/admin/payments"],
  admin: ["Legacy Admin", "/api/admin"], ai_context: ["AI Context", "/api/ai/context"],
  cart: ["Cart", "/api/cart"], addresses: ["Addresses", "/api/addresses"],
  misc: ["Public & Webhooks", "/api"], "advanced-ai": ["Advanced AI", "/api/advanced-ai"],
};

const publicPrefixes = ["/api/auth/register", "/api/auth/login", "/api/auth/refresh", "/api/auth/forgot-password", "/api/auth/reset-password", "/api/auth/google", "/api/products", "/api/categories", "/api/ai", "/api/cart", "/api/contact", "/api/subscribe", "/api/webhooks/monnify", "/api/advanced-ai/semantic-search"];
const isPublic = (url) => publicPrefixes.some((prefix) => url === prefix || url.startsWith(`${prefix}/`));
const endpointName = (method, endpoint) => `${method} ${endpoint}`;

function makeRequest(method, endpoint, source) {
  const url = `{{baseUrl}}${endpoint}`;
  const request = {
    name: endpointName(method, endpoint),
    request: {
      method,
      header: [{ key: "Content-Type", value: "application/json" }],
      url: { raw: url, host: ["{{baseUrl}}"], path: endpoint.replace(/^\//, "").split("/") },
      description: `Generated from server/src/routes/${source}.js.\\n\\nAuthentication: ${isPublic(endpoint) ? "none required by this route (some handlers may validate a webhook signature)" : "Bearer token required; staff routes also enforce role-based access"}.`,
    },
    response: [],
  };
  if (isPublic(endpoint)) request.request.auth = { type: "noauth" };
  if (["POST", "PUT", "PATCH"].includes(method)) request.request.body = { mode: "raw", raw: "{}", options: { raw: { language: "json" } } };
  return request;
}

const folders = Object.entries(routes).map(([file, [name, prefix]]) => {
  const source = fs.readFileSync(path.join(routesDir, `${file}.js`), "utf8");
  const matcher = /router\.(get|post|put|patch|delete)\(\s*["']([^"']+)/g;
  const seen = new Set();
  const item = [];
  let match;
  while ((match = matcher.exec(source))) {
    const method = match[1].toUpperCase();
    const endpoint = `${prefix}${match[2] === "/" ? "" : match[2]}`;
    const key = `${method} ${endpoint}`;
    if (!seen.has(key)) { seen.add(key); item.push(makeRequest(method, endpoint, file)); }
  }
  return { name, description: `Routes mounted at ${prefix}.`, item };
});

const collection = {
  info: {
    _postman_id: "c9567982-6e18-4a47-9923-f60e96e90e92",
    name: "Bems Farms API",
    description: "Generated from the mounted Express route files. Set the `baseUrl` and `token` collection variables before sending protected requests. Request bodies are empty templates; use the Zod schemas in `server/src/schemas/` for required fields.",
    schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
  },
  variable: [
    { key: "baseUrl", value: "http://127.0.0.1:5000", type: "string" },
    { key: "token", value: "", type: "string" },
  ],
  auth: { type: "bearer", bearer: [{ key: "token", value: "{{token}}", type: "string" }] },
  item: [
    { name: "Health", item: [makeRequest("GET", "/health", "index"), makeRequest("GET", "/api", "index")] },
    ...folders,
  ],
};

const environment = {
  id: "115eeaaa-84b6-4aaf-8c3d-6b1df01db927",
  name: "Bems Farms — Local",
  values: [
    { key: "baseUrl", value: "http://127.0.0.1:5000", enabled: true },
    { key: "token", value: "", enabled: true },
  ],
  _postman_variable_scope: "environment",
  _postman_exported_at: new Date().toISOString(),
  _postman_exported_using: "Bems Farms collection generator",
};

fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(path.join(outputDir, "Bems_Farms_API.postman_collection.json"), `${JSON.stringify(collection, null, 2)}\n`);
fs.writeFileSync(path.join(outputDir, "Bems_Farms_Local.postman_environment.json"), `${JSON.stringify(environment, null, 2)}\n`);
const total = folders.reduce((sum, folder) => sum + folder.item.length, 2);
console.log(`Generated ${total} requests in ${outputDir}`);
