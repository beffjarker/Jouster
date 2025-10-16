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

      const isAllowed = allowedOrigins.some(allowed => {
        const allowedUrl = new URL(allowed);
        return (
          originUrl.protocol === allowedUrl.protocol &&
          originUrl.hostname === allowedUrl.hostname &&
          originUrl.port === allowedUrl.port
        );
      });

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

module.exports = {
  corsOptions,
  getAllowedOrigins,
  handleCorsError,
};
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
  handleValidationErrors,
  validateEmailQuery,
  validateEmailKey,
  validateConversationId,
  validatePagination,
  validateDateRange,
  sanitizeString,
  isValidS3Key,
};

