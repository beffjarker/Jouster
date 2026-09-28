/**
 * Authentication Guard Middleware
 * Protects routes that require an authenticated session.
 *
 * @module middleware/auth-guard
 */

/**
 * Middleware that checks for an authenticated session.
 * Returns 401 if not authenticated.
 */
function requireAuth(req, res, next) {
  if (req.session && req.session.authenticated === true) {
    return next();
  }

  return res.status(401).json({
    success: false,
    message: 'Authentication required',
  });
}

module.exports = { requireAuth };

