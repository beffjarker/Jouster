/**
 * Authentication Routes
 * Single-user session-based auth with bcrypt password verification.
 *
 * Routes:
 *   POST /api/auth/login  - Authenticate with password
 *   POST /api/auth/logout - Destroy session
 *   GET  /api/auth/verify - Check if session is valid
 *
 * @module routes/auth
 */

const express = require('express');
const bcrypt = require('bcrypt');
const router = express.Router();

/**
 * POST /api/auth/login
 * Verify password against stored bcrypt hash and create session.
 */
router.post('/login', async (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Password is required',
      });
    }

    const storedHash = process.env.LIFE_MAP_PASSWORD_HASH;

    if (!storedHash) {
      console.error('LIFE_MAP_PASSWORD_HASH not configured in environment');
      return res.status(500).json({
        success: false,
        message: 'Authentication not configured',
      });
    }

    const isValid = await bcrypt.compare(password, storedHash);

    if (!isValid) {
      // Intentional delay to mitigate timing attacks
      await new Promise(resolve => setTimeout(resolve, 1000));
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    // Regenerate the session ID on privilege elevation to prevent session fixation.
    return req.session.regenerate((regenErr) => {
      if (regenErr) {
        console.error('Session regeneration error:', regenErr.message);
        return res.status(500).json({
          success: false,
          message: 'Internal server error',
        });
      }

      // Set session as authenticated
      req.session.authenticated = true;
      req.session.authenticatedAt = new Date().toISOString();

      return res.json({
        success: true,
        message: 'Authenticated',
      });
    });
  } catch (error) {
    console.error('Login error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

/**
 * POST /api/auth/logout
 * Destroy the current session.
 */
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Session destroy error:', err);
      return res.status(500).json({
        success: false,
        message: 'Logout failed',
      });
    }

    res.clearCookie('jstr.sid');
    return res.json({
      success: true,
      message: 'Logged out',
    });
  });
});

/**
 * GET /api/auth/verify
 * Check if the current session is authenticated.
 */
router.get('/verify', (req, res) => {
  if (req.session && req.session.authenticated === true) {
    return res.json({
      success: true,
      authenticated: true,
      authenticatedAt: req.session.authenticatedAt,
    });
  }

  return res.json({
    success: true,
    authenticated: false,
  });
});

module.exports = router;

