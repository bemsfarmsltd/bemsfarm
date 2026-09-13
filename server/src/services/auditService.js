'use strict';
/**
 * God Eye Audit Service v2
 * ─────────────────────────────────────────────────────────────
 * Provides:
 *   recordAudit(event)      — lightweight, backward-compatible
 *   recordAuditRich(event)  — full God Eye capture (category, severity, entity, before/after, IP, UA)
 *   auditRequests           — express middleware (auto-captures every API request)
 *   setAuditContext(db,req) — helper to propagate actor/request_id into PostgreSQL session vars
 *   verifyEventSignature    — for signed external webhook events (developer/deployment)
 *   getAuditFailure()       — last known persistence failure timestamp
 *
 * ALL writes are fire-and-forget (never block request path).
 * On failure, the error is logged and lastFailure is updated.
 */
const { randomUUID, createHmac, timingSafeEqual } = require('crypto');
const pool = require('../db/pool');

// ────────────────────────────────────────────────────────────
// Internal state
// ────────────────────────────────────────────────────────────
let lastFailure = null;

// ────────────────────────────────────────────────────────────
// Category auto-detection from route prefix
// ────────────────────────────────────────────────────────────
const CATEGORY_MAP = [
  ['/api/auth',              'auth'],
  ['/api/admin/customers',   'customer'],
  ['/api/admin/orders',      'admin'],
  ['/api/admin/inventory',   'admin'],
  ['/api/admin/products',    'admin'],
  ['/api/admin/staff',       'admin'],
  ['/api/admin/accounts',    'financial'],
  ['/api/admin/payments',    'financial'],
  ['/api/admin/purchases',   'financial'],
  ['/api/admin/reports',     'admin'],
  ['/api/admin/settings',    'system'],
  ['/api/admin/config',      'system'],
  ['/api/admin/deliveries',  'admin'],
  ['/api/admin/suppliers',   'admin'],
  ['/api/admin/stores',      'admin'],
  ['/api/admin/coupons',     'admin'],
  ['/api/admin/pos',         'admin'],
  ['/api/admin/chef-bems',   'ai'],
  ['/api/admin',             'admin'],
  ['/api/ai',                'ai'],
  ['/api/advanced-ai',       'ai'],
  ['/api/support',           'comms'],
  ['/api/broadcasts',        'comms'],
  ['/api/audit',             'system'],
  ['/api/telemetry',         'customer'],
  ['/api/orders',            'customer'],
  ['/api/cart',              'customer'],
  ['/api/wishlist',          'customer'],
  ['/api/addresses',         'customer'],
];

function detectCategory(path) {
  for (const [prefix, cat] of CATEGORY_MAP) {
    if (path.startsWith(prefix)) return cat;
  }
  return 'system';
}

// ────────────────────────────────────────────────────────────
// Severity from HTTP method + status code
// ────────────────────────────────────────────────────────────
function detectSeverity(method, statusCode, category) {
  if (statusCode >= 500) return 'critical';
  if (statusCode === 401 || statusCode === 403) return 'warning';
  if (method === 'DELETE') return 'critical';
  if (method === 'PATCH' || method === 'PUT') return 'warning';
  if (method === 'POST' && category === 'auth') return 'info';
  if (method === 'POST') return 'info';
  return 'info';
}

// ────────────────────────────────────────────────────────────
// IP extraction
// ────────────────────────────────────────────────────────────
function extractIp(req) {
  return (
    req.headers['cf-connecting-ip'] ||
    req.headers['x-real-ip'] ||
    (req.headers['x-forwarded-for'] ? req.headers['x-forwarded-for'].split(',')[0].trim() : null) ||
    req.ip ||
    null
  );
}

// ────────────────────────────────────────────────────────────
// Session fingerprint (first 8 chars of JWT token if present)
// ────────────────────────────────────────────────────────────
function extractSessionId(req) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  return (parts[2] || '').slice(0, 12);
}

// ────────────────────────────────────────────────────────────
// Core write — lightweight (original interface)
// ────────────────────────────────────────────────────────────
async function recordAudit(event, db = pool) {
  try {
    const q = `
      INSERT INTO system_audit_events
        (source,action,actor_id,actor_role,actor_name,request_id,resource,outcome,
         category,severity,entity_type,entity_id,old_value,new_value,
         ip_address,user_agent,session_id,details,external_id)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
      ON CONFLICT(external_id) DO NOTHING`;
    await db.query(q, [
      event.source,
      event.action,
      event.actor_id   || null,
      event.actor_role || null,
      event.actor_name || null,
      event.request_id || null,
      event.resource   || null,
      event.outcome,
      event.category   || 'system',
      event.severity   || 'info',
      event.entity_type || null,
      event.entity_id   || null,
      event.old_value   ? JSON.stringify(event.old_value) : null,
      event.new_value   ? JSON.stringify(event.new_value) : null,
      event.ip_address  || null,
      event.user_agent  || null,
      event.session_id  || null,
      JSON.stringify(event.details || {}),
      event.external_id || null,
    ]);
    lastFailure = null;
  } catch (err) {
    lastFailure = new Date().toISOString();
    throw err;
  }
}

// ────────────────────────────────────────────────────────────
// Rich write — full God Eye capture
// ────────────────────────────────────────────────────────────
function recordAuditRich(event, db = pool) {
  return recordAudit(event, db);
}

// ────────────────────────────────────────────────────────────
// Set PostgreSQL session variables so DB triggers can attribute writes
// ────────────────────────────────────────────────────────────
async function setAuditContext(client, req) {
  const actorId   = req?.user?.id  || '';
  const actorName = req?.user?.name || req?.user?.email || '';
  const requestId = req?.auditRequestId || '';
  await client.query(`SELECT
    set_config('app.actor_id',   $1, true),
    set_config('app.actor_name', $2, true),
    set_config('app.request_id', $3, true)`,
    [String(actorId), String(actorName), String(requestId)]);
}

// ────────────────────────────────────────────────────────────
// Express middleware — captures every API request automatically
// ────────────────────────────────────────────────────────────
function auditRequests(req, res, next) {
  if (!req.path.startsWith('/api/')) return next();
  // Skip health checks and audit read endpoints (too noisy)
  if (req.path === '/api' || req.path.startsWith('/api/audit') || req.path === '/health') return next();

  const requestId  = randomUUID();
  req.auditRequestId = requestId;
  res.setHeader('X-Request-ID', requestId);

  const started    = Date.now();
  const ip         = extractIp(req);
  const userAgent  = (req.headers['user-agent'] || '').slice(0, 300);
  const sessionId  = extractSessionId(req);
  const category   = detectCategory(req.path);

  res.once('finish', () => {
    const route    = req.route?.path;
    const resource = route ? `${req.baseUrl || ''}${route}` : 'unmatched-api-route';
    const severity = detectSeverity(req.method, res.statusCode, category);

    const user = req.user || req.auditActor;
    const actorName = user?.name
      ? (user.email && user.name !== user.email ? `${user.name} (${user.email})` : user.name)
      : (user?.email || (req.body?.email ? `Visitor (${req.body.email})` : null));

    recordAudit({
      source:      'api',
      action:      req.method,
      actor_id:    user?.id   || null,
      actor_role:  user?.role || null,
      actor_name:  actorName,
      request_id:  requestId,
      resource,
      outcome:     res.statusCode < 400 ? 'success' : 'failure',
      category,
      severity,
      entity_type: null,
      entity_id:   /^[a-zA-Z0-9_-]{1,80}$/.test(req.params?.id || '') ? req.params.id : null,
      ip_address:  ip,
      user_agent:  userAgent,
      session_id:  sessionId,
      details: {
        status:      res.statusCode,
        duration_ms: Date.now() - started,
        method:      req.method,
      },
    }).catch(() => {
      lastFailure = new Date().toISOString();
      console.error('[god-eye] Request event persistence failed; request ID:', requestId);
    });
  });

  next();
}

// ────────────────────────────────────────────────────────────
// Security event helper — failed login, unauthorized, etc.
// ────────────────────────────────────────────────────────────
function recordSecurityEvent(req, action, details = {}) {
  const ip        = extractIp(req);
  const userAgent = (req.headers['user-agent'] || '').slice(0, 300);
  return recordAudit({
    source:     'api',
    action,
    actor_id:   req.user?.id   || null,
    actor_role: req.user?.role || null,
    actor_name: req.user?.name || req.user?.email || null,
    request_id: req.auditRequestId || null,
    resource:   req.path,
    outcome:    'failure',
    category:   'security',
    severity:   'warning',
    ip_address: ip,
    user_agent: userAgent,
    details,
  }).catch(() => { lastFailure = new Date().toISOString(); });
}

// ────────────────────────────────────────────────────────────
// Automatic Deployment / Startup Event for Developer Audit
// ────────────────────────────────────────────────────────────
async function recordDeploymentEvent() {
  try {
    let commitHash = process.env.RENDER_GIT_COMMIT || '';
    let branch = process.env.RENDER_GIT_BRANCH || 'main';
    let author = 'CI/CD Pipeline';
    let message = 'Production release deployed';

    try {
      const { execSync } = require('child_process');
      const gitOut = execSync('git log -1 --pretty=format:"%H|%s|%an"', { timeout: 3000 }).toString().trim();
      if (gitOut && gitOut.includes('|')) {
        const parts = gitOut.split('|');
        commitHash = parts[0] || commitHash;
        message = parts[1] || message;
        author = parts[2] || author;
      }
    } catch (_) {}

    const externalId = commitHash ? `deploy:${commitHash.slice(0, 16)}` : `deploy:${Date.now()}`;

    await recordAudit({
      source: 'deployment',
      action: 'deploy',
      outcome: 'success',
      resource: process.env.AUDIT_REPOSITORY || 'bemsfarmsltd/bemsfarm',
      category: 'developer',
      severity: 'info',
      actor_name: author,
      actor_role: 'developer',
      external_id: externalId,
      details: {
        commit: commitHash,
        branch,
        message,
        environment: process.env.NODE_ENV || 'production',
        node_version: process.version,
        service: process.env.RENDER_SERVICE_NAME || 'bems-api',
      },
    });
    console.log('[god-eye] Recorded deployment audit event for commit:', commitHash.slice(0, 7));
  } catch (err) {
    console.warn('[god-eye] Could not record deployment event:', err.message);
  }
}

// ────────────────────────────────────────────────────────────
// Signed external webhook verification
// ────────────────────────────────────────────────────────────
function verifyEventSignature(raw, timestamp, signature, secret, now = Date.now()) {
  if (!secret) return false;
  if (!/^\d+$/.test(timestamp || '')) return false;
  if (Math.abs(now - Number(timestamp) * 1000) > 300000) return false;
  if (!/^[a-f0-9]{64}$/.test(signature || '')) return false;
  const expected = createHmac('sha256', secret).update(`${timestamp}.`).update(raw).digest();
  return timingSafeEqual(expected, Buffer.from(signature, 'hex'));
}

module.exports = {
  recordAudit,
  recordAuditRich,
  auditRequests,
  setAuditContext,
  recordSecurityEvent,
  recordDeploymentEvent,
  verifyEventSignature,
  getAuditFailure: () => lastFailure,
};
