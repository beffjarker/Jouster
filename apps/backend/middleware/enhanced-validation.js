/**
 * Enhanced Validation Middleware
 * Provides additional security validation beyond express-validator
 * Mitigates validator.js URL bypass vulnerability (GHSA-9965-vmph-33xx)
 */

/**
 * Custom URL validator that doesn't rely on vulnerable validator.js
 * Uses native URL constructor for robust validation
 */
function validateURL(url, options = {}) {
  const {
    protocols = ['http:', 'https:'],
    requireProtocol = true,
    allowLocalhost = false,
    allowPrivateIPs = false
  } = options;

  try {
    const parsed = new URL(url);

    // Check protocol whitelist
    if (!protocols.includes(parsed.protocol)) {
      return { valid: false, reason: 'Invalid protocol' };
    }

    // Check for localhost if not allowed
    if (!allowLocalhost && (
      parsed.hostname === 'localhost' ||
      parsed.hostname === '127.0.0.1' ||
      parsed.hostname === '::1'
    )) {
      return { valid: false, reason: 'Localhost URLs not allowed' };
    }

    // Check for private IP ranges if not allowed
    if (!allowPrivateIPs && isPrivateIP(parsed.hostname)) {
      return { valid: false, reason: 'Private IP addresses not allowed' };
    }

    // Check for suspicious patterns
    if (hasSuspiciousPatterns(url)) {
      return { valid: false, reason: 'Suspicious URL pattern detected' };
    }

    return { valid: true, parsed };
  } catch (error) {
    return { valid: false, reason: 'Invalid URL format' };
  }
}

/**
 * Check if hostname is a private IP address
 */
function isPrivateIP(hostname) {
  const privateIPPatterns = [
    /^10\./,                    // 10.0.0.0/8
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // 172.16.0.0/12
    /^192\.168\./,              // 192.168.0.0/16
    /^169\.254\./,              // 169.254.0.0/16 (link-local)
    /^127\./,                   // 127.0.0.0/8 (loopback)
    /^fc00:/,                   // IPv6 unique local
    /^fe80:/,                   // IPv6 link-local
  ];

  return privateIPPatterns.some(pattern => pattern.test(hostname));
}

/**
 * Check for suspicious URL patterns that could indicate attacks
 */
function hasSuspiciousPatterns(url) {
  const suspiciousPatterns = [
    /<script/i,                 // XSS attempt
    /javascript:/i,             // JavaScript protocol
    /data:/i,                   // Data URI (can be dangerous)
    /vbscript:/i,              // VBScript protocol
    /file:/i,                   // File protocol
    /@.*@/,                     // Multiple @ symbols
    /\.\./,                     // Path traversal
    /%00/,                      // Null byte
    /%0[ad]/i,                  // CRLF injection
    /[\x00-\x1f\x7f]/,         // Control characters
  ];

  return suspiciousPatterns.some(pattern => pattern.test(url));
}

/**
 * Middleware to validate URLs in request body
 */
function validateURLFields(fields = []) {
  return (req, res, next) => {
    const errors = [];

    for (const field of fields) {
      const value = req.body[field];

      if (value) {
        const validation = validateURL(value, {
          allowLocalhost: process.env.NODE_ENV === 'development',
          allowPrivateIPs: process.env.NODE_ENV === 'development'
        });

        if (!validation.valid) {
          errors.push({
            field,
            message: `Invalid URL: ${validation.reason}`,
            value: value.substring(0, 50) // Truncate for logging
          });
        }
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors
      });
    }

    next();
  };
}

/**
 * Enhanced email validation
 * Provides additional validation beyond validator.js
 */
function validateEmail(email) {
  // Basic format check
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { valid: false, reason: 'Invalid email format' };
  }

  // Check for suspicious patterns
  const suspiciousPatterns = [
    /<script/i,
    /javascript:/i,
    /\.\./,
    /%00/,
  ];

  if (suspiciousPatterns.some(pattern => pattern.test(email))) {
    return { valid: false, reason: 'Suspicious email pattern detected' };
  }

  // Check length constraints
  if (email.length > 254) { // RFC 5321
    return { valid: false, reason: 'Email too long' };
  }

  const [local, domain] = email.split('@');
  if (local.length > 64) { // RFC 5321
    return { valid: false, reason: 'Local part too long' };
  }

  return { valid: true };
}

/**
 * Middleware to validate email fields
 */
function validateEmailFields(fields = []) {
  return (req, res, next) => {
    const errors = [];

    for (const field of fields) {
      const value = req.body[field];

      if (value) {
        const validation = validateEmail(value);

        if (!validation.valid) {
          errors.push({
            field,
            message: validation.reason,
            value: value.substring(0, 50)
          });
        }
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors
      });
    }

    next();
  };
}

/**
 * Validate and sanitize common input types
 */
function sanitizeInput(value, type = 'string') {
  if (value === null || value === undefined) {
    return value;
  }

  switch (type) {
    case 'string':
      // Remove control characters and normalize whitespace
      return String(value)
        .replace(/[\x00-\x1f\x7f]/g, '')
        .trim();

    case 'number':
      const num = Number(value);
      return isNaN(num) ? null : num;

    case 'boolean':
      return Boolean(value);

    case 'array':
      return Array.isArray(value) ? value : [value];

    default:
      return value;
  }
}

/**
 * General purpose input sanitization middleware
 */
function sanitizeRequestBody(schema = {}) {
  return (req, res, next) => {
    if (!req.body || typeof req.body !== 'object') {
      return next();
    }

    for (const [key, type] of Object.entries(schema)) {
      if (req.body[key] !== undefined) {
        req.body[key] = sanitizeInput(req.body[key], type);
      }
    }

    next();
  };
}

module.exports = {
  validateURL,
  validateURLFields,
  validateEmail,
  validateEmailFields,
  sanitizeInput,
  sanitizeRequestBody,
  isPrivateIP,
  hasSuspiciousPatterns
};

