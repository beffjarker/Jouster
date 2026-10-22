/**
 * Life Map Validation Middleware
 * Strict express-validator schemas for life-map write operations.
 * Mirrors the LifeMapEntry interface used by the Angular frontend.
 *
 * @module middleware/life-map-validation
 */

const { body, param, query, validationResult } = require('express-validator');

/**
 * Allowed entry categories. Kept in sync with the frontend category palette in
 * timeline.component.ts (`categoryColors`).
 */
const VALID_CATEGORIES = [
  'personal', 'work', 'travel', 'milestone', 'other', 'health', 'legal',
  'education', 'church', 'career', 'residence', 'family', 'relationship',
  'financial', 'creative', 'spiritual', 'military', 'event',
];

/**
 * Handle validation errors uniformly (400 with field-level detail).
 */
function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      details: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }
  next();
}

/**
 * Shared field rules for create/update. The `optional` flag relaxes presence
 * checks for PUT (partial updates) while keeping format/range constraints.
 */
function entryFieldRules({ optional }) {
  const maybe = (chain) => (optional ? chain.optional() : chain);

  return [
    maybe(body('title').isString().trim().isLength({ min: 1, max: 200 }))
      .withMessage('title must be 1–200 characters'),

    body('description').optional().isString().trim().isLength({ max: 5000 })
      .withMessage('description must be at most 5000 characters'),

    maybe(body('date').isISO8601())
      .withMessage('date must be a valid ISO 8601 date'),

    maybe(body('category').isString().trim().isIn(VALID_CATEGORIES))
      .withMessage(`category must be one of: ${VALID_CATEGORIES.join(', ')}`),

    // Location
    maybe(body('location').isObject())
      .withMessage('location is required'),
    maybe(body('location.lat').isFloat({ min: -90, max: 90 }))
      .withMessage('location.lat must be between -90 and 90'),
    maybe(body('location.lng').isFloat({ min: -180, max: 180 }))
      .withMessage('location.lng must be between -180 and 180'),
    body('location.name').optional().isString().trim().isLength({ max: 200 }),
    body('location.street').optional().isString().trim().isLength({ max: 200 }),
    body('location.city').optional().isString().trim().isLength({ max: 120 }),
    body('location.state').optional().isString().trim().isLength({ max: 120 }),
    body('location.zip').optional().isString().trim().isLength({ max: 20 }),
    body('location.country').optional().isString().trim().isLength({ max: 120 }),

    // Tags & images (bounded arrays)
    body('tags').optional().isArray({ max: 20 })
      .withMessage('tags must be an array of at most 20 items'),
    body('tags.*').optional().isString().trim().isLength({ min: 1, max: 40 })
      .withMessage('each tag must be 1–40 characters'),

    body('images').optional().isArray({ max: 20 })
      .withMessage('images must be an array of at most 20 items'),
    body('images.*').optional().matches(/^[\w\-]+\.(jpg|jpeg|png|svg)$/i)
      .withMessage('each image must be a valid filename'),
  ];
}

const validateCreateEntry = [...entryFieldRules({ optional: false }), handleValidationErrors];
const validateUpdateEntry = [
  param('id').isString().trim().isLength({ min: 1, max: 128 }).withMessage('invalid id'),
  ...entryFieldRules({ optional: true }),
  handleValidationErrors,
];
const validateEntryId = [
  param('id').isString().trim().isLength({ min: 1, max: 128 }).withMessage('invalid id'),
  handleValidationErrors,
];

const validateGeocodeQuery = [
  query('q').isString().trim().isLength({ min: 2, max: 200 })
    .withMessage('q must be 2–200 characters'),
  handleValidationErrors,
];

const validateImageUpload = [
  body('data')
    .isString()
    .matches(/^data:image\/(jpeg|jpg|png|svg\+xml);base64,/)
    .withMessage('data must be a base64 image data URL (jpeg/png/svg)'),
  handleValidationErrors,
];

module.exports = {
  VALID_CATEGORIES,
  handleValidationErrors,
  validateCreateEntry,
  validateUpdateEntry,
  validateEntryId,
  validateGeocodeQuery,
  validateImageUpload,
};

