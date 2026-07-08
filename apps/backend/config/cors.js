/**
 * CORS Configuration
 * Implements secure Cross-Origin Resource Sharing policies
 */

/**
 * Allowed origins based on environment
 */
const getAllowedOrigins = () => {
  const env = process.env.NODE_ENV || 'development';

  // Extra origins can be injected at deploy time (e.g. per-PR preview S3 website
  // URL) via a comma-separated CORS_ALLOWED_ORIGINS env var. These are always
  // merged in, regardless of NODE_ENV, so preview environments can reach the API.
  const extraOrigins = (process.env.CORS_ALLOWED_ORIGINS || '')
    .split(',')
    .map(o => o.trim())
    .filter(Boolean);

  let baseOrigins;
  switch (env) {
    case 'production':
      baseOrigins = [
        'https://jouster.org',
        'https://www.jouster.org',
        'https://api.jouster.org',
      ];
      break;

    case 'staging':
      baseOrigins = [
        'https://staging.jouster.org',
        'https://api-staging.jouster.org',
        'http://localhost:4200',
      ];
      break;

    // Shared non-prod API (api-nonprod.jouster.org) used by preview environments,
    // dev, qa, and staging. Accepts preview frontends served from *.jouster.org
    // custom domains and from S3 website preview buckets.
    case 'nonprod':
      baseOrigins = [
        'https://api-nonprod.jouster.org',
        'https://nonprod.jouster.org',
        'https://*.jouster.org',                       // preview/qa/staging custom domains
        'http://*.s3-website-us-west-2.amazonaws.com', // S3 website preview buckets
        'http://localhost:4200',
        'http://localhost:3000',
      ];
      break;

    case 'development':
    default:
      baseOrigins = [
        'http://localhost:4200',
        'http://127.0.0.1:4200',
        'http://localhost:3000',
        'http://127.0.0.1:3000',
      ];
      break;
  }

  return [...new Set([...baseOrigins, ...extraOrigins])];
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

    // Requests without an Origin header are not browser cross-origin requests
    // (curl, health checks, server-to-server), so CORS does not apply to them.
    if (!origin) {
      return callback(null, true);
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

module.exports = {
  corsOptions,
  getAllowedOrigins,
  handleCorsError,
};
