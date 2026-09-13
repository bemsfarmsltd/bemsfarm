#!/usr/bin/env node
/**
 * God Eye Audit v2 Migration Runner
 * Expands system_audit_events with category, severity, entity, IP, before/after columns.
 * Safe to re-run — all statements are idempotent.
 */
require('dotenv').config({ path: require('path').join(__dirname, '../../..', '.env') });
const fs   = require('fs');
const path = require('path');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false });

async function run() {
  const sql = fs.readFileSync(path.join(__dirname, 'audit_v2_migration.sql'), 'utf8');
  console.log('🔍 Running God Eye Audit v2 migration…');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    console.log('✅ God Eye Audit v2 migration complete.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
