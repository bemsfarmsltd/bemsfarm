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

function getAppVersionConfig() {
  try {
    if (fs.existsSync(VERSION_FILE)) {
      const data = fs.readFileSync(VERSION_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.warn('[appVersion] Failed to read app_version.json, using defaults:', err.message);
  }
  return DEFAULT_APP_VERSION;
}

function updateAppVersionConfig(newConfig) {
  try {
    fs.writeFileSync(VERSION_FILE, JSON.stringify(newConfig, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('[appVersion] Failed to write app_version.json:', err);
    return false;
  }
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
  isVersionLower,
  DEFAULT_APP_VERSION
};
