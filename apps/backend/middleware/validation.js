/**
 * Route-specific validation middleware
 * Provides validation for email routes
 */

const { body, query, param, validationResult } = require('express-validator');

/**
 * Middleware to handle validation errors
 */
function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
}

/**
 * Validate email query parameters (for listing emails)
 */
const validateEmailQuery = [
  query('pageSize')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('pageSize must be between 1 and 1000'),
  query('marker')
    .optional()
    .isString()
    .trim()
    .withMessage('marker must be a string'),
  handleValidationErrors
];

/**
 * Validate email key parameter (for getting specific email)
 */
const validateEmailKey = [
  param('key')
    .notEmpty()
    .withMessage('Email key is required')
    .isString()
    .trim()
    .withMessage('Email key must be a string'),
  handleValidationErrors
];

module.exports = {
  validateEmailQuery,
  validateEmailKey,
  handleValidationErrors
};

