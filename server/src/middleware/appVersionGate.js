// server/src/middleware/appVersionGate.js
'use strict';

const { getAppVersionConfig, isVersionLower } = require('../config/appVersion');

/**
 * Enforces minimum version requirements for mobile apps (Customer App and Driver App).
 * Inspects incoming requests:
 * - If request originates from mobile apps (X-App-Platform header or mobile User-Agent / X-Channel)
 * - Checks X-App-Version against minimum_version in appVersion config
 * - If header is missing or lower than minimum_version, returns:
 *   HTTP 426 Upgrade Required
 *   {
 *     "status": false,
 *     "message": "Your app version is outdated. Please download the latest update from https://bemsfarms.com/download"
 *   }
 *
 * Excludes web browsers, admin portal, CORS OPTIONS, webhooks, and app-version/download endpoints.
 */
function appVersionGate(req, res, next) {
  // 1. Skip non-blocking methods & preflight OPTIONS
  if (req.method === 'OPTIONS') return next();

  // 2. Bypass safe public routes (version checks, downloads, health, webhooks)
  const path = (req.originalUrl || req.path || '').toLowerCase();
  if (
    path.includes('/app-version') ||
    path.includes('/app-releases') ||
    path.includes('/downloads') ||
    path.includes('/download') ||
    path.includes('/health') ||
    path.includes('/webhook') ||
    path.includes('/paystack')
  ) {
    return next();
  }

  // 3. Determine if this request is from a mobile app
  const appPlatform = (req.headers['x-app-platform'] || '').toString().toLowerCase().trim();
  const appVersion = (req.headers['x-app-version'] || '').toString().trim();
  const xChannel = (req.headers['x-channel'] || req.headers['x-client-platform'] || '').toString().toLowerCase().trim();
  const ua = (req.headers['user-agent'] || '').toLowerCase();

  const isMobileApp =
    Boolean(appPlatform) ||
    Boolean(appVersion) ||
    xChannel === 'app' ||
    xChannel === 'mobile' ||
    xChannel === 'mobile_app' ||
    xChannel === 'android' ||
    xChannel === 'ios' ||
    ua.includes('okhttp') ||
    ua.includes('dart') ||
    ua.includes('expo') ||
    ua.includes('react-native') ||
    ua.includes('bemsapp') ||
    ua.includes('bemsfarmsapp') ||
    ua.includes('bemsdriver') ||
    ua.includes('bemscustomer');

  // If request is from regular browser storefront or admin dashboard, pass through safely
  if (!isMobileApp) {
    return next();
  }

  // 4. Identify whether it's the customer app or driver app
  const isDriver =
    appPlatform === 'android_driver' ||
    appPlatform === 'driver' ||
    ua.includes('driver') ||
    path.startsWith('/api/driver');

  const config = getAppVersionConfig();
  const targetConfig = isDriver ? config.driver : config.customer;
  const minVersion = targetConfig?.minimum_version || '1.0.1';

  // 5. If X-App-Version is missing or lower than minimum required version
  if (!appVersion || isVersionLower(appVersion, minVersion)) {
    return res.status(426).json({
      status: false,
      message: 'Your app version is outdated. Please download the latest update from https://bemsfarms.com/download'
    });
  }

  next();
}

module.exports = appVersionGate;
