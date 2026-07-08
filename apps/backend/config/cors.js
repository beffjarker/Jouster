/**
 * CORS Configuration
 * Implements secure Cross-Origin Resource Sharing policies
 */

/**
 * Allowed origins based on environment
 */
const getAllowedOrigins = () => {
  const env = process.env.NODE_ENV || 'development';

  switch (env) {
    case 'production':
      return [
        'https://jouster.org',
        'https://www.jouster.org',
        'https://api.jouster.org',
      ];

    case 'staging':
      return [
        'https://staging.jouster.org',
        'https://api-staging.jouster.org',
        'http://localhost:4200',
      ];

    // Shared non-prod API (api-nonprod.jouster.org) used by preview environments,
    // dev, qa, and staging. Accepts preview frontends served from *.jouster.org
    // custom domains and from S3 website preview buckets.
    case 'nonprod':
      return [
        'https://api-nonprod.jouster.org',
        'https://nonprod.jouster.org',
        'https://*.jouster.org',                       // preview/qa/staging custom domains
        'http://*.s3-website-us-west-2.amazonaws.com', // S3 website preview buckets
        'http://localhost:4200',
        'http://localhost:3000',
      ];

    case 'development':
    default:
      return [
        'http://localhost:4200',
        'http://127.0.0.1:4200',
        'http://localhost:3000',
        'http://127.0.0.1:3000',
      ];
  }
};

/**
 * Match an origin against an allowed entry, supporting a single `*.` wildcard
 * in the hostname (e.g., `https://*.jouster.org`). Protocol and port must match.
 */
const originMatches = (originUrl, allowed) => {
  // Wildcard entry: compare protocol + hostname suffix.
  if (allowed.includes('*.')) {
    const [proto, rest] = allowed.split('://');
    const suffix = rest.replace('*.', '.'); // '*.jouster.org' -> '.jouster.org'
    return (
      originUrl.protocol === `${proto}:` &&
      (originUrl.hostname.endsWith(suffix) || originUrl.hostname === suffix.slice(1))
    );
  }

  // Exact entry: compare protocol + hostname + port.
  const allowedUrl = new URL(allowed);
  return (
    originUrl.protocol === allowedUrl.protocol &&
    originUrl.hostname === allowedUrl.hostname &&
    originUrl.port === allowedUrl.port
  );
};

/**
 * CORS options configuration
 */
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = getAllowedOrigins();

    // Allow requests with no origin (mobile apps, Postman, curl)
    // But only in development
    if (!origin && process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }

    if (!origin) {
      return callback(new Error('Origin not allowed by CORS'));
    }

    try {
      const originUrl = new URL(origin);

      const isAllowed = allowedOrigins.some((allowed) => originMatches(originUrl, allowed));

      if (isAllowed) {
        callback(null, true);
      } else {
        console.warn(`CORS blocked origin: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    } catch (error) {
      console.error(`Invalid origin format: ${origin}`);
      callback(new Error('Invalid origin'));
    }
  },

  credentials: true,

  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],

  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'X-API-Key',
    'Accept',
    'Origin',
  ],

  exposedHeaders: [
    'X-Total-Count',
    'X-Page-Count',
    'X-Current-Page',
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
  ],

  maxAge: 86400, // 24 hours - how long preflight results can be cached

  optionsSuccessStatus: 200, // Some legacy browsers (IE11) choke on 204
};

/**
 * CORS error handler
 */
const handleCorsError = (err, req, res, next) => {
  if (err.message === 'Not allowed by CORS' || err.message === 'Origin not allowed by CORS') {
    return res.status(403).json({
      error: 'CORS policy violation',
      message: 'Origin not allowed',
    });
  }
  next(err);
};

// NOTE: The validation helpers below were historically appended to this file.
// Everything (CORS config + validation helpers) is exported from the single
// module.exports at the end of the file. A previous *second* module.exports here
// silently overwrote the CORS exports, leaving cors(undefined) — i.e. all origins
// allowed. That has been fixed by consolidating into one export.

/**
 * Input Validation Middleware
 * Uses express-validator for comprehensive input validation
 */

const { body, param, query, validationResult } = require('express-validator');

/**
 * Handle validation errors
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array().map(err => ({
        field: err.path,
        message: err.msg,
        value: err.value,
      })),
    });
  }

  next();
};

/**
 * Email endpoint validation
 */
const validateEmailQuery = [
  query('pageSize')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('Page size must be between 1 and 1000'),
  query('marker')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 1024 })
    .withMessage('Marker must be a valid string'),
  handleValidationErrors,
];

const validateEmailKey = [
  param('key')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('Email key is required')
    .matches(/^[a-zA-Z0-9\-_\/\.]+$/)
    .withMessage('Invalid email key format'),
  handleValidationErrors,
];

/**
 * Conversation history validation
 */
const validateConversationId = [
  param('id')
    .isUUID()
    .withMessage('Conversation ID must be a valid UUID'),
  handleValidationErrors,
];

/**
 * Generic sanitization for all string inputs
 */
const sanitizeString = (value) => {
  if (typeof value !== 'string') return value;

  // Remove null bytes
  value = value.replace(/\0/g, '');

  // Trim whitespace
  value = value.trim();

  return value;
};

/**
 * Validate AWS S3 keys
 */
const isValidS3Key = (key) => {
  // S3 key validation rules
  const maxLength = 1024;
  const invalidChars = /[\x00-\x1F\x7F]/;

  if (!key || key.length > maxLength) return false;
  if (invalidChars.test(key)) return false;

  return true;
};

/**
 * Validate pagination parameters
 */
const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  handleValidationErrors,
];

/**
 * Validate date range queries
 */
const validateDateRange = [
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid ISO 8601 date'),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid ISO 8601 date')
    .custom((endDate, { req }) => {
      if (req.query.startDate && new Date(endDate) < new Date(req.query.startDate)) {
        throw new Error('End date must be after start date');
      }
      return true;
    }),
  handleValidationErrors,
];

module.exports = {
  // CORS
  corsOptions,
  getAllowedOrigins,
  handleCorsError,
  // Validation helpers
  handleValidationErrors,
  validateEmailQuery,
  validateEmailKey,
  validateConversationId,
  validatePagination,
  validateDateRange,
  sanitizeString,
  isValidS3Key,
};

