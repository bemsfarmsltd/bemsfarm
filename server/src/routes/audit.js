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

// ── All routes below require admin / superadmin ───────────────────────────────
router.use(protect, requireRole('superadmin', 'admin'));

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

  // Full text search on action, resource, actor_name
  if (query.search) {
    const s = String(query.search).slice(0, 200);
    args.push(`%${s}%`);
    const idx = args.length;
    where.push(`(action ILIKE $${idx} OR resource ILIKE $${idx} OR actor_name ILIKE $${idx} OR entity_type ILIKE $${idx} OR entity_id ILIKE $${idx})`);
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
      ),
      pool.query(`SELECT COUNT(*) FROM system_audit_events ${clause}`, args),
      pool.query(`SELECT source, category, COUNT(*) AS count, MAX(occurred_at) AS last_event FROM system_audit_events GROUP BY source, category ORDER BY source`),
    ]);

    res.json({
      events:              rows.rows,
      total:               Number(total.rows[0].count),
      page,
      coverage:            coverage.rows,
      last_write_failure:  getAuditFailure(),
      external_configured: !!process.env.AUDIT_INGEST_SECRET,
    });
  } catch (err) { next(err); }
});

// ── GET /api/audit/stats — live dashboard header stats ────────────────────────
router.get('/stats', async (req, res, next) => {
  try {
    const [today, week, month, bySeverity, byCategory, activeActors, lastDev] = await Promise.all([
      pool.query(`SELECT COUNT(*) FROM system_audit_events WHERE occurred_at >= NOW() - INTERVAL '1 day'`),
      pool.query(`SELECT COUNT(*) FROM system_audit_events WHERE occurred_at >= NOW() - INTERVAL '7 days'`),
      pool.query(`SELECT COUNT(*) FROM system_audit_events WHERE occurred_at >= NOW() - INTERVAL '30 days'`),
      pool.query(`SELECT severity, COUNT(*) AS count FROM system_audit_events WHERE occurred_at >= NOW() - INTERVAL '7 days' GROUP BY severity`),
      pool.query(`SELECT category, COUNT(*) AS count FROM system_audit_events WHERE occurred_at >= NOW() - INTERVAL '7 days' GROUP BY category ORDER BY count DESC`),
      pool.query(`SELECT COUNT(DISTINCT actor_id) AS count FROM system_audit_events WHERE occurred_at >= NOW() - INTERVAL '5 minutes' AND actor_id IS NOT NULL`),
      pool.query(`SELECT occurred_at, details FROM system_audit_events WHERE category = 'developer' ORDER BY occurred_at DESC LIMIT 1`),
    ]);

    res.json({
      today:         Number(today.rows[0].count),
      week:          Number(week.rows[0].count),
      month:         Number(month.rows[0].count),
      by_severity:   bySeverity.rows,
      by_category:   byCategory.rows,
      active_actors: Number(activeActors.rows[0].count),
      last_developer_event: lastDev.rows[0] || null,
    });
  } catch (err) { next(err); }
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
    `);
    res.json({ timeline: rows.rows });
  } catch (err) { next(err); }
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

module.exports = router;
