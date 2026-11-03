/**
 * Authentication Guard Middleware
 *
 * The API is deny-by-default: `apiAuthGate` is mounted on `/api` and requires an
 * authenticated session for every route except the explicit PUBLIC_API_ROUTES
 * allowlist. Routers may additionally apply `requireAuth` (defense in depth).
 *
 * @module middleware/auth-guard
 */

const { ABSOLUTE_TIMEOUT_MS, SESSION_COOKIE_NAME } = require('../config/session');

/**
 * Routes reachable without a session, relative to the `/api` mount point.
 * Matching is exact (method + path); anything else requires authentication.
 */
const PUBLIC_API_ROUTES = [
  { method: 'POST', path: '/auth/login' },
  { method: 'POST', path: '/auth/logout' },
  { method: 'GET', path: '/auth/verify' },
];

const STATE_CHANGING_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

/**
 * @param {import('express').Request} req
 * @returns {boolean} true when the request targets an allowlisted public API route.
 */
function isPublicApiRoute(req) {
  const method = req.method === 'HEAD' ? 'GET' : req.method;
  return PUBLIC_API_ROUTES.some((route) => route.method === method && route.path === req.path);
}

/**
 * @param {import('express').Request} req
 * @param {number} [now]
 * @returns {boolean} true when the session is authenticated and within its absolute lifetime.
 */
function isSessionAuthenticated(req, now = Date.now()) {
  if (!req.session || req.session.authenticated !== true) {
    return false;
  }

  const authenticatedAt = Date.parse(req.session.authenticatedAt);
  if (Number.isNaN(authenticatedAt)) {
    return false;
  }

  return now - authenticatedAt < ABSOLUTE_TIMEOUT_MS;
}

function sendUnauthorized(res) {
  return res.status(401).json({
    success: false,
    message: 'Authentication required',
  });
}

/**
 * Requires an authenticated, unexpired session. Expired sessions are destroyed.
 */
function requireAuth(req, res, next) {
  if (isSessionAuthenticated(req)) {
    return next();
  }

  if (req.session && req.session.authenticated === true) {
    return req.session.destroy(() => {
      res.clearCookie(SESSION_COOKIE_NAME, { path: '/' });
      sendUnauthorized(res);
    });
  }

  return sendUnauthorized(res);
}

/**
 * Deny-by-default gate for everything under `/api`.
 */
function apiAuthGate(req, res, next) {
  if (isPublicApiRoute(req)) {
    return next();
  }
  return requireAuth(req, res, next);
}

/**
 * CSRF defense-in-depth for every state-changing API request. A cross-site HTML form
 * cannot set custom headers, and a cross-origin script needs a CORS preflight that
 * only allowlisted origins pass. Combined with the `sameSite=strict` cookie.
 */
function requireXhrForWrites(req, res, next) {
  if (STATE_CHANGING_METHODS.includes(req.method) && req.get('X-Requested-With') !== 'XMLHttpRequest') {
    return res.status(403).json({ success: false, message: 'Missing required header' });
  }
  return next();
}

module.exports = {
  PUBLIC_API_ROUTES,
  apiAuthGate,
  isPublicApiRoute,
  isSessionAuthenticated,
  requireAuth,
  requireXhrForWrites,
};
