#!/usr/bin/env node
/**
 * generate-master-postman.js
 * Generates an end-to-end, fully populated Postman Collection v2.1 and Environments
 * covering all 500+ endpoints in Bems Farms from swagger-output.json and router specs.
 */

const fs = require('fs');
const path = require('path');

const swaggerPath = path.join(__dirname, '../swagger-output.json');
const postmanDir = path.join(__dirname, '../../postman');
const docOutputDir = path.join(__dirname, '../../../Documentation/API_Specifications');

if (!fs.existsSync(swaggerPath)) {
  console.error('swagger-output.json not found!');
  process.exit(1);
}

const swagger = JSON.parse(fs.readFileSync(swaggerPath, 'utf8'));

// Categorization rules
function getCategory(p) {
  if (p.startsWith('/health') || p === '/api' || p === '/test') return '00. System Health & Probes';
  if (p.startsWith('/api/auth')) return '01. Authentication & Security';
  if (p.startsWith('/api/driver')) return '02. Driver & Logistics App';
  if (p.startsWith('/api/orders') || p.startsWith('/api/cart') || p.startsWith('/api/payments/initialize')) return '03. Customer Orders & Checkout';
  if (p.startsWith('/api/products') || p.startsWith('/api/categories') || p.startsWith('/api/wishlist')) return '04. Customer Products & Catalog';
  if (p.startsWith('/api/issues') || p.startsWith('/api/customer-chat') || p.startsWith('/api/support')) return '05. Customer Support & Issues';
  if (p.startsWith('/api/addresses')) return '06. Customer Delivery Addresses';
  if (p.startsWith('/api/ai') || p.startsWith('/api/advanced-ai')) return '07. Artificial Intelligence & Smart Search';
  if (p.startsWith('/api/dashboard') || p.startsWith('/api/admin/reports') || p === '/api/admin/stats') return '08. Admin Analytics & Reporting';
  if (p.startsWith('/api/admin/products') || p.startsWith('/api/admin/categories')) return '09. Admin Products & Catalog Management';
  if (p.startsWith('/api/admin/orders') || p.startsWith('/api/admin/deliveries') || p.startsWith('/api/admin/dispatch') || p.startsWith('/api/admin/returns')) return '10. Admin Orders, Dispatch & Returns';
  if (p.startsWith('/api/admin/inventory')) return '11. Admin Inventory, Batches & Warehousing';
  if (p.startsWith('/api/admin/customers') || p.startsWith('/api/broadcasts') || p === '/api/admin/subscribers') return '12. Admin Customers, CRM & Broadcasts';
  if (p.startsWith('/api/admin/wallets')) return '13. Admin Wallets & Ledger Management';
  if (p.startsWith('/api/admin/accounts') || p.startsWith('/api/admin/payments')) return '14. Admin Finance, Accounts & Payouts';
  if (p.startsWith('/api/admin/staff')) return '15. Admin Staff & HR Access Control';
  if (p.startsWith('/api/admin/suppliers') || p.startsWith('/api/admin/purchases')) return '16. Admin Suppliers & Purchase Invoicing';
  if (p.startsWith('/api/admin/pos')) return '17. Admin POS & Cashier Desk';
  if (p.startsWith('/api/admin/chef-bems')) return '18. Admin Chef Bems Food Kitchen';
  if (p.startsWith('/api/admin/stores') || p.startsWith('/api/admin/settings') || p.startsWith('/api/admin/config') || p.startsWith('/api/admin/coupons') || p === '/api/admin/search') return '19. Admin Stores, Settings & Coupons';
  if (p.startsWith('/api/audit') || p.startsWith('/api/telemetry') || p.startsWith('/api/notifications') || p.startsWith('/api/admin/notifications')) return '20. Telemetry, God Eye Audit & Notifications';
  if (p.startsWith('/api/verify') || p.startsWith('/api/locations') || p.startsWith('/api/contact') || p.startsWith('/api/subscribe') || p.includes('webhook')) return '21. Public Verification, Geo Locations & Webhooks';
  return '22. Miscellaneous Endpoints';
}

// Generate realistic dummy value for property
function getSampleValueForProp(name) {
  const n = name.toLowerCase();
  if (n.includes('email')) return 'user@bemsfarms.com';
  if (n.includes('password')) return 'SecurePass123!';
  if (n.includes('phone')) return '+2348012345678';
  if (n === 'token' || n.includes('jwt')) return 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
  if (n.includes('price') || n.includes('amount') || n.includes('fee')) return 5000;
  if (n.includes('qty') || n.includes('quantity') || n.includes('count')) return 2;
  if (n.includes('id')) return 1;
  if (n.includes('url')) return 'https://api.bemsfarms.com/uploads/documents/sample.jpg';
  if (n.includes('name')) return 'Standard Item';
  if (n.includes('date')) return new Date().toISOString();
  if (n.includes('status')) return 'active';
  if (n.includes('address')) return '14 Farm Crescent, Abuja, Nigeria';
  if (n.includes('notes') || n.includes('reason') || n.includes('description')) return 'Standard transaction operation';
  if (n.includes('is_') || n.includes('has_')) return true;
  return 'example_value';
}

// Check public endpoints
const publicPrefixes = [
  '/health', '/api', '/test',
  '/api/auth/register', '/api/auth/login', '/api/auth/refresh', '/api/auth/forgot-password', '/api/auth/reset-password', '/api/auth/google',
  '/api/driver/auth/login', '/api/driver/auth/register', '/api/driver/onboarding/submit', '/api/driver/upload/kyc', '/api/driver/upload/document',
  '/api/products', '/api/categories', '/api/contact', '/api/subscribe', '/api/verify', '/api/webhooks'
];

function isPublic(endpoint) {
  return publicPrefixes.some(prefix => endpoint === prefix || endpoint.startsWith(`${prefix}/`) || endpoint.startsWith(`${prefix}?`));
}

// Test scripts for auto-saving auth tokens
function getPostmanTestScript(endpoint, method) {
  if (method === 'POST' && (endpoint.includes('/login') || endpoint.includes('/register') || endpoint.includes('/auth/login'))) {
    return [
      'var jsonData = pm.response.json();',
      'if (jsonData && (jsonData.token || jsonData.access_token || (jsonData.data && jsonData.data.token))) {',
      '    var token = jsonData.token || jsonData.access_token || jsonData.data.token;',
      '    pm.environment.set("token", token);',
      '    pm.collectionVariables.set("token", token);',
      '    console.log("Auto-saved Bearer Token:", token.substring(0, 15) + "...");',
      '}'
    ];
  }
  return null;
}

const foldersMap = {};

for (const [rawPath, methodsObj] of Object.entries(swagger.paths)) {
  const category = getCategory(rawPath);
  if (!foldersMap[category]) {
    foldersMap[category] = [];
  }

  for (const [httpMethod, opObj] of Object.entries(methodsObj)) {
    const method = httpMethod.toUpperCase();
    if (!['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'].includes(method)) continue;

    // Convert swagger {param} to Postman :param
    const postmanPath = rawPath.replace(/\{([^}]+)\}/g, ':$1');
    const pathSegments = postmanPath.replace(/^\//, '').split('/');
    const urlRaw = `{{baseUrl}}${postmanPath}`;

    // Extract path variables
    const pathVars = [];
    const varMatches = rawPath.match(/\{([^}]+)\}/g);
    if (varMatches) {
      for (const vm of varMatches) {
        const varName = vm.replace(/[{}]/g, '');
        pathVars.push({
          key: varName,
          value: '1',
          description: `Path parameter ${varName}`
        });
      }
    }

    // Extract query parameters
    const queryParams = [];
    if (Array.isArray(opObj.parameters)) {
      for (const p of opObj.parameters) {
        if (p.in === 'query') {
          queryParams.push({
            key: p.name,
            value: p.example || p.default || '',
            description: p.description || ''
          });
        }
      }
    }

    // Build Request
    const request = {
      name: `${method} ${rawPath}`,
      request: {
        method,
        header: [],
        url: {
          raw: urlRaw,
          host: ['{{baseUrl}}'],
          path: pathSegments
        },
        description: opObj.description || `${method} request to ${rawPath}`
      },
      response: []
    };

    if (pathVars.length > 0) {
      request.request.url.variable = pathVars;
    }
    if (queryParams.length > 0) {
      request.request.url.query = queryParams;
    }

    // Auth configuration
    if (isPublic(rawPath)) {
      request.request.auth = { type: 'noauth' };
    } else {
      // Inherit Bearer token from collection
      request.request.auth = {
        type: 'bearer',
        bearer: [{ key: 'token', value: '{{token}}', type: 'string' }]
      };
    }

    // Body handling
    const isUploadEndpoint = rawPath.includes('/upload/') || rawPath.endsWith('/upload');
    if (isUploadEndpoint && ['POST', 'PUT', 'PATCH'].includes(method)) {
      // Configure multipart form-data
      const fileKey = rawPath.includes('avatar') ? 'avatar' : (rawPath.includes('proof') ? 'proof' : 'document');
      request.request.body = {
        mode: 'formdata',
        formdata: [
          {
            key: fileKey,
            type: 'file',
            src: '',
            description: `File upload (${rawPath.includes('kyc') ? 'JPG, PNG, PDF' : 'Image'})`
          },
          {
            key: 'doc_type',
            value: rawPath.includes('kyc') ? 'license' : 'proof',
            type: 'text',
            description: 'Document or upload classification type'
          }
        ]
      };
    } else if (['POST', 'PUT', 'PATCH'].includes(method)) {
      // Find body schema
      let sampleBody = {};
      if (rawPath === '/api/driver/auth/register' || rawPath === '/api/driver/register') {
        sampleBody = {
          name: "Chidi Okafor",
          phone: "+2348031234567",
          email: "chidi.driver@example.com",
          password: "DriverPassword123!",
          vehicle_type: "motorcycle",
          vehicle_plate: "ABA-456-XY",
          license_number: "DL-98765432",
          nin_number: "12345678901",
          address: "24 Faulks Road, Aba, Abia State",
          primary_zone_id: "ZONE001"
        };
      } else if (rawPath === '/api/driver/auth/login') {
        sampleBody = {
          phone: "+2348031234567",
          password: "DriverPassword123!"
        };
      } else {
        const bodyParam = (opObj.parameters || []).find(p => p.in === 'body');
        if (bodyParam && bodyParam.schema && bodyParam.schema.properties) {
          for (const [propName, propDef] of Object.entries(bodyParam.schema.properties)) {
            sampleBody[propName] = getSampleValueForProp(propName);
          }
        }
      }

      request.request.header.push({ key: 'Content-Type', value: 'application/json' });
      request.request.body = {
        mode: 'raw',
        raw: JSON.stringify(sampleBody, null, 2),
        options: { raw: { language: 'json' } }
      };
    }

    // Add tests if applicable
    const testScript = getPostmanTestScript(rawPath, method);
    if (testScript) {
      request.event = [
        {
          listen: 'test',
          script: {
            exec: testScript,
            type: 'text/javascript'
          }
        }
      ];
    }

    foldersMap[category].push(request);
  }
}

// Sort folders alphabetically
const sortedCategories = Object.keys(foldersMap).sort();
const collectionFolders = sortedCategories.map(cat => ({
  name: cat,
  description: `Endpoints related to ${cat.replace(/^[0-9]+\.\s*/, '')}`,
  item: foldersMap[cat]
}));

const totalEndpoints = collectionFolders.reduce((sum, f) => sum + f.item.length, 0);

const masterCollection = {
  info: {
    _postman_id: 'bems-farms-master-api-collection-2026',
    name: 'Bems Farms Platform Master API Collection',
    description: `Comprehensive Postman Collection for Bems Farms backend encompassing ${totalEndpoints} endpoints across Customer E-commerce, Driver Mobile & Logistics, Admin Operations, ERP, Finance, POS, AI, and Telemetry.\n\n### Authentication\n- Authenticate via 'POST /api/auth/login' (Customer/Admin) or 'POST /api/driver/auth/login' (Driver).\n- The collection script automatically extracts and persists the Bearer token into the {{token}} environment variable.\n- All authenticated requests inherit Bearer authentication automatically.`,
    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
  },
  variable: [
    { key: 'baseUrl', value: 'https://api.bemsfarms.com', type: 'string' },
    { key: 'token', value: '', type: 'string' },
    { key: 'driverToken', value: '', type: 'string' },
    { key: 'adminToken', value: '', type: 'string' }
  ],
  auth: {
    type: 'bearer',
    bearer: [{ key: 'token', value: '{{token}}', type: 'string' }]
  },
  item: collectionFolders
};

// Production Environment
const prodEnvironment = {
  id: 'bems-farms-env-production',
  name: 'Bems Farms — Production',
  values: [
    { key: 'baseUrl', value: 'https://api.bemsfarms.com', enabled: true },
    { key: 'token', value: '', enabled: true },
    { key: 'driverToken', value: '', enabled: true },
    { key: 'adminToken', value: '', enabled: true }
  ],
  _postman_variable_scope: 'environment',
  _postman_exported_at: new Date().toISOString(),
  _postman_exported_using: 'Bems Farms Postman Architect'
};

// Local Environment
const localEnvironment = {
  id: 'bems-farms-env-local',
  name: 'Bems Farms — Local Development',
  values: [
    { key: 'baseUrl', value: 'http://localhost:5000', enabled: true },
    { key: 'token', value: '', enabled: true },
    { key: 'driverToken', value: '', enabled: true },
    { key: 'adminToken', value: '', enabled: true }
  ],
  _postman_variable_scope: 'environment',
  _postman_exported_at: new Date().toISOString(),
  _postman_exported_using: 'Bems Farms Postman Architect'
};

// Write files
fs.mkdirSync(postmanDir, { recursive: true });
fs.writeFileSync(path.join(postmanDir, 'Bems_Farms_Master_API.postman_collection.json'), JSON.stringify(masterCollection, null, 2));
fs.writeFileSync(path.join(postmanDir, 'Bems_Farms_API.postman_collection.json'), JSON.stringify(masterCollection, null, 2));
fs.writeFileSync(path.join(postmanDir, 'Bems_Farms_Production.postman_environment.json'), JSON.stringify(prodEnvironment, null, 2));
fs.writeFileSync(path.join(postmanDir, 'Bems_Farms_Local.postman_environment.json'), JSON.stringify(localEnvironment, null, 2));

console.log(`✅ Successfully generated Postman Collection with ${totalEndpoints} endpoints across ${collectionFolders.length} folders!`);
console.log(`📁 Files written to: ${postmanDir}`);
