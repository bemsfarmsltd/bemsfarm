// server/src/utils/channel.js
'use strict';

/**
 * Detects the client channel (web, app, pos, admin) from an incoming HTTP request.
 * Checks custom headers (X-Channel, X-Client-Platform), payload/query, and User-Agent heuristics.
 *
 * @param {import('express').Request} req
 * @returns {'web' | 'app' | 'pos' | 'admin'}
 */
function detectChannel(req) {
  if (!req) return 'web';

  // 1. Direct explicit header
  const explicitHeader = (
    req.headers['x-channel'] ||
    req.headers['x-client-platform'] ||
    req.headers['x-platform'] ||
    ''
  ).toString().toLowerCase().trim();

  if (explicitHeader === 'app' || explicitHeader === 'mobile' || explicitHeader === 'mobile_app' || explicitHeader === 'ios' || explicitHeader === 'android') {
    return 'app';
  }
  if (explicitHeader === 'pos' || explicitHeader === 'store' || explicitHeader === 'terminal') {
    return 'pos';
  }
  if (explicitHeader === 'admin' || explicitHeader === 'dashboard') {
    return 'admin';
  }
  if (explicitHeader === 'web' || explicitHeader === 'browser') {
    return 'web';
  }

  // 2. Request body or query overrides (e.g. POS cashier checkout or app telemetry)
  const bodySource = (req.body?.channel || req.body?.source || req.query?.channel || req.query?.source || '').toString().toLowerCase().trim();
  if (bodySource === 'app' || bodySource === 'mobile' || bodySource === 'mobile_app') return 'app';
  if (bodySource === 'pos' || bodySource === 'store' || bodySource === 'cashier') return 'pos';
  if (bodySource === 'admin') return 'admin';
  if (bodySource === 'web' || bodySource === 'online') return 'web';

  // 3. User-Agent Heuristics
  const ua = (req.headers['user-agent'] || '').toLowerCase();
  if (
    ua.includes('bemsapp') ||
    ua.includes('bemsfarmsapp') ||
    ua.includes('okhttp') ||
    ua.includes('cfnetwork') ||
    ua.includes('react-native') ||
    ua.includes('capacitor') ||
    ua.includes('cordova') ||
    ua.includes('expo') ||
    ua.includes('wv') || // Android WebView
    (ua.includes('mobile') && ua.includes('safari') && ua.includes('version/') && ua.includes('standalone'))
  ) {
    return 'app';
  }

  // Default to standard web browser
  return 'web';
}

module.exports = { detectChannel };
