/**
 * Security Middleware Configuration
 * Implements comprehensive security best practices for Express.js
 */

const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const hpp = require('hpp');
const xss = require('xss-clean');
const mongoSanitize = require('express-mongo-sanitize');

/**
 * Configure Helmet for security headers
 */
const helmetConfig = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'https:', 'http://localhost:*'],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", 'https://graph.facebook.com', 'https://ws.audioscrobbler.com'],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  noSniff: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  xssFilter: true,
});

/**
 * Rate limiting configuration - Prevents brute force attacks
 */
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/health';
  },
});

/**
 * Strict rate limiter for authentication endpoints
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 auth requests per windowMs
  message: 'Too many authentication attempts, please try again later.',
  skipSuccessfulRequests: true,
});

/**
 * API rate limiter
 */
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // Limit each IP to 30 API requests per minute
  message: 'API rate limit exceeded, please slow down.',
});

/**
 * Sanitize user input to prevent NoSQL injection
 */
const sanitizeInput = mongoSanitize({
  replaceWith: '_',
  onSanitize: ({ req, key }) => {
    console.warn(`Sanitized potentially dangerous input: ${key}`);
  },
});

/**
 * Additional security headers middleware
 */
const additionalSecurityHeaders = (req, res, next) => {
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');

  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Enable XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Referrer policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Permissions policy (formerly Feature-Policy)
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

  // Remove powered by header
  res.removeHeader('X-Powered-By');

  next();
};

/**
 * Request validation middleware
 */
const validateRequest = (req, res, next) => {
  // Validate URL doesn't contain suspicious patterns
  const suspiciousPatterns = [
    /\.\./,  // Directory traversal
    /<script/i,  // XSS attempts
    /javascript:/i,  // JavaScript protocol
    /on\w+=/i,  // Event handlers
  ];

  const url = req.url.toLowerCase();

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(url)) {
      console.warn(`Blocked suspicious request: ${req.url} from ${req.ip}`);
      return res.status(400).json({ error: 'Invalid request' });
    }
  }

  next();
};

/**
 * HTTPS enforcement for production
 */
const enforceHTTPS = (req, res, next) => {
  if (process.env.NODE_ENV === 'production') {
    if (req.headers['x-forwarded-proto'] !== 'https') {
      return res.redirect(301, `https://${req.hostname}${req.url}`);
    }
  }
  next();
};

/**
 * Log security events
 */
const securityLogger = (req, res, next) => {
  const startTime = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - startTime;

    // Log suspicious status codes
    if (res.statusCode >= 400) {
      console.log({
        timestamp: new Date().toISOString(),
        method: req.method,
        url: req.url,
        status: res.statusCode,
        ip: req.ip,
        userAgent: req.get('user-agent'),
        duration: `${duration}ms`,
      });
    }
  });

  next();
};

module.exports = {
  helmetConfig,
  generalLimiter,
  authLimiter,
  apiLimiter,
  sanitizeInput,
  xssClean: xss(),
  hppProtection: hpp(),
  additionalSecurityHeaders,
  validateRequest,
  enforceHTTPS,
  securityLogger,
};

