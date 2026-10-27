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
  let appVersion = (req.headers['x-app-version'] || '').toString().trim();
  const xChannel = (req.headers['x-channel'] || req.headers['x-client-platform'] || '').toString().toLowerCase().trim();
  const rawUa = (req.headers['user-agent'] || '').toString();
  const ua = rawUa.toLowerCase();

  // Bems Mobile User Agents include:
  // "BemsFarmsMobile/1.0", "BemsFarmsDriver/1.0", "BemsFarmsMobileApp/1.0", "BemsCustomer/1.0", "BemsDriver/1.0", etc.
  const isBemsMobileUa =
    ua.includes('bems') &&
    (ua.includes('mobile') || ua.includes('driver') || ua.includes('customer') || ua.includes('app'));

  const isMobileApp =
    Boolean(appPlatform) ||
    Boolean(appVersion) ||
    xChannel === 'app' ||
    xChannel === 'mobile' ||
    xChannel === 'mobile_app' ||
    xChannel === 'android' ||
    xChannel === 'ios' ||
    isBemsMobileUa ||
    ua.includes('okhttp') ||
    ua.includes('dart') ||
    ua.includes('expo') ||
    ua.includes('react-native') ||
    ua.includes('flutter') ||
    ua.includes('capacitor') ||
    ua.includes('cordova') ||
    ua.includes('bemsapp') ||
    ua.includes('bemsfarmsapp') ||
    ua.includes('bemsdriver') ||
    ua.includes('bemscustomer');

  // If request is from regular browser storefront or admin dashboard, pass through safely
  if (!isMobileApp) {
    return next();
  }

  // 4. If X-App-Version header was not sent, extract version from User-Agent if available
  if (!appVersion) {
    const uaVersionMatch = rawUa.match(/(?:bems[a-z0-9_-]*(?:mobile|driver|app|customer)|okhttp|dart)[\/\s-]?([0-9]+(?:\.[0-9]+)*)/i);
    if (uaVersionMatch && uaVersionMatch[1]) {
      appVersion = uaVersionMatch[1];
    }
  }

  // 5. Identify whether it's the customer app or driver app
  const isDriver =
    appPlatform === 'android_driver' ||
    appPlatform === 'driver' ||
    ua.includes('driver') ||
    path.startsWith('/api/driver');

  const config = getAppVersionConfig();
  const targetConfig = isDriver ? config.driver : config.customer;
  const minVersion = targetConfig?.minimum_version || '1.0.1';
  const latestVersion = targetConfig?.latest_version || minVersion;
  const downloadUrl =
    targetConfig?.download_url ||
    (isDriver ? 'https://bemsfarms.com/download/driver-app.apk' : 'https://bemsfarms.com/download/customer-app.apk');
  const releaseNotes =
    targetConfig?.release_notes || 'Please download the latest update to continue using the application.';

  // 6. If version is missing or lower than minimum required version -> HTTP 426 Upgrade Required
  if (!appVersion || isVersionLower(appVersion, minVersion)) {
    return res.status(426).json({
      status: false,
      success: false,
      upgrade_required: true,
      force_update: true,
      app_type: isDriver ? 'driver' : 'customer',
      detected_version: appVersion || 'legacy',
      minimum_version: minVersion,
      latest_version: latestVersion,
      download_url: downloadUrl,
      release_notes: releaseNotes,
      message: `Your ${isDriver ? 'Driver' : 'Customer'} app is outdated (version ${appVersion || 'legacy'} detected). Please download update v${latestVersion} from ${downloadUrl} to continue.`
    });
  }

  next();
}

module.exports = appVersionGate;
