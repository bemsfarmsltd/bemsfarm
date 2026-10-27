// server/src/config/appVersion.js
'use strict';

const fs = require('fs');
const path = require('path');

const VERSION_FILE = path.join(__dirname, 'app_version.json');

const DEFAULT_APP_VERSION = {
  customer: {
    minimum_version: "1.0.1",
    latest_version: "1.0.1",
    download_url: "https://bemsfarms.com/download/customer-app.apk",
    force_update: true,
    release_notes: "Live driver tracking, verified electronic web receipts, and stability fixes."
  },
  driver: {
    minimum_version: "1.0.1",
    latest_version: "1.0.1",
    download_url: "https://bemsfarms.com/download/driver-app.apk",
    force_update: true,
    release_notes: "Live GPS exposure, accurate weekly payout sync, and real-time order alerts."
  }
};

let cachedConfig = null;

/**
 * Initializes and syncs app version configuration from database into memory.
 */
async function initAppVersionConfig(pool) {
  if (pool) {
    try {
      const res = await pool.query(
        "SELECT value FROM system_settings WHERE key = 'mobile_app_version_config' LIMIT 1"
      );
      if (res.rows.length > 0 && res.rows[0].value) {
        const parsed = typeof res.rows[0].value === 'string'
          ? JSON.parse(res.rows[0].value)
          : res.rows[0].value;
        cachedConfig = parsed;
        return cachedConfig;
      } else {
        // Seed initial config
        const jsonStr = JSON.stringify(DEFAULT_APP_VERSION, null, 2);
        await pool.query(
          `INSERT INTO system_settings (key, value, setting_group, description, updated_at)
           VALUES ('mobile_app_version_config', $1, 'mobile_apps', 'Mobile App Version Gate & Forced Upgrade Configuration', NOW())
           ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
          [jsonStr]
        );
        cachedConfig = DEFAULT_APP_VERSION;
        return cachedConfig;
      }
    } catch (err) {
      console.warn('[appVersion] Notice loading from DB:', err.message);
    }
  }

  // Fallback to local file
  try {
    if (fs.existsSync(VERSION_FILE)) {
      const data = fs.readFileSync(VERSION_FILE, 'utf8');
      cachedConfig = JSON.parse(data);
      return cachedConfig;
    }
  } catch (err) {
    console.warn('[appVersion] Failed to read app_version.json:', err.message);
  }

  cachedConfig = DEFAULT_APP_VERSION;
  return cachedConfig;
}

function getAppVersionConfig() {
  if (cachedConfig) {
    return cachedConfig;
  }

  try {
    if (fs.existsSync(VERSION_FILE)) {
      const data = fs.readFileSync(VERSION_FILE, 'utf8');
      cachedConfig = JSON.parse(data);
      return cachedConfig;
    }
  } catch (err) {
    console.warn('[appVersion] Failed to read app_version.json, using defaults:', err.message);
  }

  cachedConfig = DEFAULT_APP_VERSION;
  return cachedConfig;
}

async function updateAppVersionConfig(newConfig, pool) {
  cachedConfig = newConfig;

  // 1. Persist to local JSON file
  try {
    fs.writeFileSync(VERSION_FILE, JSON.stringify(newConfig, null, 2), 'utf8');
  } catch (err) {
    console.error('[appVersion] Failed to write app_version.json:', err.message);
  }

  // 2. Persist to public client JSON file if accessible
  try {
    const publicVersionFile = path.resolve(__dirname, '../../../client/public/app-version.json');
    if (fs.existsSync(path.dirname(publicVersionFile))) {
      fs.writeFileSync(publicVersionFile, JSON.stringify(newConfig, null, 2), 'utf8');
    }
  } catch (err) {
    // Non-critical
  }

  // 3. Persist to PostgreSQL database
  if (pool) {
    try {
      const jsonStr = JSON.stringify(newConfig, null, 2);
      await pool.query(
        `INSERT INTO system_settings (key, value, setting_group, description, updated_at)
         VALUES ('mobile_app_version_config', $1, 'mobile_apps', 'Mobile App Version Gate & Forced Upgrade Configuration', NOW())
         ON CONFLICT (key) DO UPDATE
         SET value = EXCLUDED.value, updated_at = NOW()`,
        [jsonStr]
      );
      return true;
    } catch (err) {
      console.error('[appVersion] Failed to write to system_settings in DB:', err.message);
    }
  }

  return true;
}

/**
 * Compares two semantic version strings (e.g., "1.0.0" and "1.0.1").
 * Returns true if currentVersion is strictly lower than minVersion.
 */
function isVersionLower(currentVersion, minVersion) {
  if (!currentVersion) return true;
  const parse = (v) => String(v).replace(/[^0-9.]/g, '').split('.').map(n => parseInt(n, 10) || 0);
  const cur = parse(currentVersion);
  const min = parse(minVersion);
  const maxLen = Math.max(cur.length, min.length);
  for (let i = 0; i < maxLen; i++) {
    const c = cur[i] !== undefined ? cur[i] : 0;
    const m = min[i] !== undefined ? min[i] : 0;
    if (c < m) return true;
    if (c > m) return false;
  }
  return false;
}

module.exports = {
  getAppVersionConfig,
  updateAppVersionConfig,
  initAppVersionConfig,
  isVersionLower,
  DEFAULT_APP_VERSION
};
