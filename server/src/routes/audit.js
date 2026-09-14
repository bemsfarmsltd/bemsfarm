'use strict';
/**
 * God Eye Audit Routes v2
 * GET  /api/audit             — paginated event list (50/page) with advanced filters
 * GET  /api/audit/stats       — live stats for dashboard header
 * GET  /api/audit/timeline    — 24h event timeline by hour
 * GET  /api/audit/:id         — single event deep-dive
 * GET  /api/audit/export      — CSV download (superadmin only)
 * POST /api/audit/events      — signed external webhook (developer/deployment)
 */
const express = require('express');
const router  = express.Router();
const pool    = require('../db/pool');
const { protect, requireRole } = require('../middleware/authMiddleware');
const { recordAudit, verifyEventSignature, getAuditFailure } = require('../services/auditService');

// ── External webhook — no auth required, uses HMAC signature ──────────────────
router.post('/events', async (req, res, next) => {
  if (!process.env.AUDIT_INGEST_SECRET)
    return res.status(503).json({ message: 'External audit integration is not configured' });
  if (!verifyEventSignature(
    req.rawBody || Buffer.alloc(0),
    req.headers['x-audit-timestamp'],
    req.headers['x-audit-signature'],
    process.env.AUDIT_INGEST_SECRET
  )) return res.status(401).json({ message: 'Invalid audit signature' });

  const e = req.body;
  if (!['developer','deployment'].includes(e.source) ||
      !['push','build','deploy','rollback','test','pr_merged','pr_opened'].includes(e.action) ||
      !['success','failure','pending'].includes(e.outcome) ||
      typeof e.event_id !== 'string' || e.event_id.length > 200 || !e.event_id ||
      (e.commit && !/^[a-f0-9]{40}$/.test(e.commit)) ||
      e.repository !== process.env.AUDIT_REPOSITORY)
    return res.status(400).json({ message: 'Invalid audit event or repository' });

  try {
    await recordAudit({
      source:      e.source,
      action:      e.action,
      outcome:     e.outcome,
      resource:    e.repository,
      category:    'developer',
      severity:    e.outcome === 'failure' ? 'critical' : e.action === 'deploy' ? 'warning' : 'info',
      external_id: `external:${e.event_id}`,
      details: {
        commit:   e.commit,
        branch:   String(e.branch  || '').slice(0, 200),
        actor:    String(e.actor   || '').slice(0, 100),
        provider: String(e.provider|| '').slice(0, 100),
        message:  String(e.message || '').slice(0, 500),
      },
    });
    res.status(201).json({ recorded: true });
  } catch (err) { next(err); }
});

// ── Native GitHub Webhook Handler (No complex custom HMAC needed) ────────────
router.post(['/github-webhook', '/github'], async (req, res, next) => {
  try {
    const eventType = req.headers['x-github-event'] || 'push';
    if (eventType === 'ping') {
      return res.json({ ok: true, message: 'GitHub Webhook successfully received by Bems Farms God Eye!' });
    }

    const payload = req.body || {};
    const repo = payload.repository?.full_name || 'bemsfarmsltd/bemsfarm';
    const branch = (payload.ref || '').replace('refs/heads/', '') || 'main';
    const headCommit = payload.head_commit || (payload.commits && payload.commits[payload.commits.length - 1]) || {};
    const actor = payload.pusher?.name || headCommit.author?.name || payload.sender?.login || 'Developer';
    const commitMsg = headCommit.message || `Git ${eventType} event on ${branch}`;

    await recordAudit({
      source: 'developer',
      action: eventType === 'push' ? 'push' : eventType,
      outcome: 'success',
      resource: repo,
      category: 'developer',
      severity: 'info',
      actor_name: actor,
      actor_role: 'developer',
      external_id: headCommit.id ? `gh:${headCommit.id}` : `gh:${Date.now()}:${Math.random().toString(36).slice(2, 7)}`,
      details: {
        commit: headCommit.id || null,
        message: commitMsg,
        branch,
        author: headCommit.author?.name || actor,
        author_email: headCommit.author?.email || payload.pusher?.email || null,
        commit_url: headCommit.url || null,
        commits_count: payload.commits?.length || 1,
        event_type: eventType,
      },
    });

    res.json({ recorded: true, event: eventType });
  } catch (err) {
    next(err);
  }
});

let auditTableReady = false;
async function ensureAuditTable() {
  if (auditTableReady) return;
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS system_audit_events (
        id BIGSERIAL PRIMARY KEY,
        occurred_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
        source TEXT NOT NULL,
        action TEXT NOT NULL,
        actor_id INTEGER,
        actor_name TEXT,
        actor_role TEXT,
        request_id TEXT,
        resource TEXT,
        category TEXT NOT NULL DEFAULT 'system',
        severity TEXT NOT NULL DEFAULT 'info',
        entity_type TEXT,
        entity_id TEXT,
        outcome TEXT NOT NULL,
        old_value JSONB,
        new_value JSONB,
        ip_address TEXT,
        user_agent TEXT,
        session_id TEXT,
        details JSONB NOT NULL DEFAULT '{}'::jsonb,
        external_id TEXT UNIQUE
      );

      ALTER TABLE system_audit_events
        ADD COLUMN IF NOT EXISTS category    TEXT NOT NULL DEFAULT 'system',
        ADD COLUMN IF NOT EXISTS severity    TEXT NOT NULL DEFAULT 'info',
        ADD COLUMN IF NOT EXISTS entity_type TEXT,
        ADD COLUMN IF NOT EXISTS entity_id   TEXT,
        ADD COLUMN IF NOT EXISTS old_value   JSONB,
        ADD COLUMN IF NOT EXISTS new_value   JSONB,
        ADD COLUMN IF NOT EXISTS ip_address  TEXT,
        ADD COLUMN IF NOT EXISTS user_agent  TEXT,
        ADD COLUMN IF NOT EXISTS session_id  TEXT,
        ADD COLUMN IF NOT EXISTS actor_name  TEXT,
        ADD COLUMN IF NOT EXISTS location    TEXT;

      CREATE INDEX IF NOT EXISTS system_audit_time ON system_audit_events(occurred_at DESC, id DESC);
      CREATE INDEX IF NOT EXISTS system_audit_actor ON system_audit_events(actor_id, occurred_at DESC);
      CREATE INDEX IF NOT EXISTS system_audit_source ON system_audit_events(source, occurred_at DESC);
      CREATE INDEX IF NOT EXISTS audit_category ON system_audit_events(category, occurred_at DESC);
      CREATE INDEX IF NOT EXISTS audit_severity ON system_audit_events(severity, occurred_at DESC);
      CREATE INDEX IF NOT EXISTS audit_location ON system_audit_events(location, occurred_at DESC);
    `);
    auditTableReady = true;
  } catch (err) {
    console.warn("Could not ensure system_audit_events table:", err.message);
  }
}

// ── All routes below require admin / superadmin ───────────────────────────────
router.use(protect, requireRole('superadmin', 'admin'));

// God Eye exposes raw request payloads, IPs, and every staff account's
// activity — several staff accounts share the superadmin role (including
// test accounts), so role alone isn't tight enough. Restrict to the one
// designated owner account.
const GOD_EYE_ALLOWED_EMAILS = ['admin@bemsfarms.com'];
router.use((req, res, next) => {
  if (!GOD_EYE_ALLOWED_EMAILS.includes((req.user?.email || '').toLowerCase())) {
    return res.status(403).json({ message: 'Access denied. God Eye is restricted to designated system owners.' });
  }
  next();
});

router.use(async (req, res, next) => {
  await ensureAuditTable();
  next();
});

// ── Build WHERE clause from query params ───────────────────────────────────────
function buildWhere(query) {
  const args = [], where = [];

  // Exact filters
  for (const key of ['source', 'outcome', 'actor_id', 'request_id', 'category', 'severity', 'entity_type', 'ip_address', 'session_id']) {
    if (query[key]) {
      args.push(String(query[key]));
      where.push(`${key}::text = $${args.length}`);
    }
  }

  // entity_id
  if (query.entity_id) {
    args.push(String(query.entity_id));
    where.push(`entity_id = $${args.length}`);
  }

  // actor_name search
  if (query.actor_name) {
    args.push(`%${String(query.actor_name).slice(0, 100)}%`);
    where.push(`actor_name ILIKE $${args.length}`);
  }

  // location search
  if (query.location) {
    args.push(`%${String(query.location).slice(0, 100)}%`);
    where.push(`(location ILIKE $${args.length} OR details->'location'->>'city' ILIKE $${args.length} OR details->'location'->>'country' ILIKE $${args.length})`);
  }

  // Full text search on action, resource, actor_name, location
  if (query.search) {
    const s = String(query.search).slice(0, 200);
    args.push(`%${s}%`);
    const idx = args.length;
    where.push(`(action ILIKE $${idx} OR resource ILIKE $${idx} OR actor_name ILIKE $${idx} OR entity_type ILIKE $${idx} OR entity_id ILIKE $${idx} OR location ILIKE $${idx})`);
  }

  // Date range
  for (const [key, op] of [['from', '>='], ['to', '<=']]) {
    if (query[key]) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(query[key]) || !Number.isFinite(Date.parse(query[key])))
        return { error: 'Invalid date' };
      args.push(query[key]);
      where.push(`occurred_at::date ${op} $${args.length}::date`);
    }
  }

  return { args, clause: where.length ? 'WHERE ' + where.join(' AND ') : '' };
}

// ── GET /api/audit — paginated list ───────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const built = buildWhere(req.query);
    if (built.error) return res.status(400).json({ message: built.error });
    const { args, clause } = built;
    const page  = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = 50;

    const [rows, total, coverage] = await Promise.all([
      pool.query(
        `SELECT * FROM system_audit_events ${clause} ORDER BY occurred_at DESC, id DESC LIMIT 50 OFFSET $${args.length + 1}`,
        [...args, (page - 1) * limit]
      ).catch(() => ({ rows: [] })),
      pool.query(`SELECT COUNT(*) FROM system_audit_events ${clause}`, args).catch(() => ({ rows: [{ count: 0 }] })),
      pool.query(`SELECT source, category, COUNT(*) AS count, MAX(occurred_at) AS last_event FROM system_audit_events GROUP BY source, category ORDER BY source`).catch(() => ({ rows: [] })),
    ]);

    res.json({
      events:              rows.rows,
      total:               Number(total.rows[0]?.count || 0),
      page,
      coverage:            coverage.rows,
      last_write_failure:  getAuditFailure(),
      external_configured: !!process.env.AUDIT_INGEST_SECRET,
    });
  } catch (err) {
    console.error('GET /api/audit error:', err.message);
    res.json({
      events: [],
      total: 0,
      page: 1,
      coverage: [],
      last_write_failure: err.message,
      external_configured: !!process.env.AUDIT_INGEST_SECRET,
    });
  }
});

// ── GET /api/audit/stats — live dashboard header stats ────────────────────────
router.get('/stats', async (req, res, next) => {
  try {
    const [today, week, month, bySeverity, byCategory, activeActors, lastDev] = await Promise.all([
      pool.query(`SELECT COUNT(*) FROM system_audit_events WHERE occurred_at >= NOW() - INTERVAL '1 day'`).catch(() => ({ rows: [{ count: 0 }] })),
      pool.query(`SELECT COUNT(*) FROM system_audit_events WHERE occurred_at >= NOW() - INTERVAL '7 days'`).catch(() => ({ rows: [{ count: 0 }] })),
      pool.query(`SELECT COUNT(*) FROM system_audit_events WHERE occurred_at >= NOW() - INTERVAL '30 days'`).catch(() => ({ rows: [{ count: 0 }] })),
      pool.query(`SELECT severity, COUNT(*) AS count FROM system_audit_events WHERE occurred_at >= NOW() - INTERVAL '7 days' GROUP BY severity`).catch(() => ({ rows: [] })),
      pool.query(`SELECT category, COUNT(*) AS count FROM system_audit_events WHERE occurred_at >= NOW() - INTERVAL '7 days' GROUP BY category ORDER BY count DESC`).catch(() => ({ rows: [] })),
      pool.query(`SELECT COUNT(DISTINCT actor_id) AS count FROM system_audit_events WHERE occurred_at >= NOW() - INTERVAL '5 minutes' AND actor_id IS NOT NULL`).catch(() => ({ rows: [{ count: 0 }] })),
      pool.query(`SELECT occurred_at, details FROM system_audit_events WHERE category = 'developer' ORDER BY occurred_at DESC LIMIT 1`).catch(() => ({ rows: [] })),
    ]);

    res.json({
      today:         Number(today.rows[0]?.count || 0),
      week:          Number(week.rows[0]?.count || 0),
      month:         Number(month.rows[0]?.count || 0),
      by_severity:   bySeverity.rows,
      by_category:   byCategory.rows,
      active_actors: Number(activeActors.rows[0]?.count || 0),
      last_developer_event: lastDev.rows[0] || null,
    });
  } catch (err) {
    console.error('GET /api/audit/stats error:', err.message);
    res.json({
      today: 0,
      week: 0,
      month: 0,
      by_severity: [],
      by_category: [],
      active_actors: 0,
      last_developer_event: null,
    });
  }
});

// ── GET /api/audit/timeline — 24h event timeline for chart ────────────────────
router.get('/timeline', async (req, res, next) => {
  try {
    const rows = await pool.query(`
      SELECT
        date_trunc('hour', occurred_at) AS hour,
        severity,
        COUNT(*) AS count
      FROM system_audit_events
      WHERE occurred_at >= NOW() - INTERVAL '24 hours'
      GROUP BY 1, 2
      ORDER BY 1 ASC, 2
    `).catch(() => ({ rows: [] }));
    res.json({ timeline: rows.rows });
  } catch (err) {
    console.error('GET /api/audit/timeline error:', err.message);
    res.json({ timeline: [] });
  }
});

// ── GET /api/audit/:id — single event deep-dive ───────────────────────────────
router.get('/:id', async (req, res, next) => {
  if (!/^\d+$/.test(req.params.id)) return next();
  try {
    const row = await pool.query(`SELECT * FROM system_audit_events WHERE id = $1`, [req.params.id]);
    if (!row.rows.length) return res.status(404).json({ message: 'Event not found' });
    res.json(row.rows[0]);
  } catch (err) { next(err); }
});

// ── GET /api/audit/export — CSV download (superadmin only) ───────────────────
router.get('/export', requireRole('superadmin'), async (req, res, next) => {
  try {
    const built = buildWhere(req.query);
    if (built.error) return res.status(400).json({ message: built.error });
    const { args, clause } = built;

    const rows = await pool.query(
      `SELECT id, occurred_at, category, severity, source, action, actor_id, actor_name, actor_role,
              entity_type, entity_id, resource, outcome, ip_address, session_id, request_id, details
       FROM system_audit_events ${clause} ORDER BY occurred_at DESC LIMIT 10000`,
      args
    );

    const headers = ['id','occurred_at','category','severity','source','action','actor_id','actor_name','actor_role','entity_type','entity_id','resource','outcome','ip_address','session_id','request_id','details'];
    const escape  = v => `"${String(v == null ? '' : typeof v === 'object' ? JSON.stringify(v) : v).replace(/"/g, '""')}"`;
    const csv     = [headers.join(','), ...rows.rows.map(r => headers.map(h => escape(r[h])).join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="bems-god-eye-audit-${new Date().toISOString().slice(0,10)}.csv"`);
    res.send(csv);
  } catch (err) { next(err); }
});

// ── POST /api/audit/simulate-developer — superadmin test developer audit event ──
router.post('/simulate-developer', requireRole('superadmin', 'admin'), async (req, res, next) => {
  try {
    const sampleCommits = [
      { msg: 'feat(storefront): optimize checkout payment gateway & instant order receipt dispatch', author: req.user?.name || 'Lead DevOps Engineer' },
      { msg: 'fix(inventory): synchronize real-time low-stock threshold with warehouse dispatch', author: req.user?.name || 'Backend Engineer' },
      { msg: 'perf(db): add composite indices on customer product demand telemetry & God Eye audit logs', author: req.user?.name || 'Infrastructure Team' },
    ];
    const pick = sampleCommits[Math.floor(Math.random() * sampleCommits.length)];
    const fakeCommit = Math.random().toString(16).slice(2, 10) + Math.random().toString(16).slice(2, 10);

    await recordAudit({
      source: 'developer',
      action: 'push',
      outcome: 'success',
      resource: 'bemsfarmsltd/bemsfarm',
      category: 'developer',
      severity: 'info',
      actor_name: pick.author,
      actor_role: 'developer',
      external_id: `test:${fakeCommit}`,
      location: 'Abia State, Nigeria',
      details: {
        commit: fakeCommit,
        branch: 'main',
        message: pick.msg,
        environment: 'production',
        author: pick.author,
        simulated: true,
        location: {
          city: 'Abia State',
          country: 'Nigeria',
          country_code: 'NG',
          flag: '🇳🇬',
          display: 'Abia State, Nigeria'
        }
      },
    });

    res.json({ recorded: true, message: 'Developer audit event recorded successfully' });
  } catch (err) { next(err); }
});

module.exports = router;
