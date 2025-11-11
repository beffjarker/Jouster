/**
 * Security Testing Suite
 * Tests for security middleware and vulnerability mitigations
 */

const {
  validateURL,
  validateEmail,
  validateURLFields,
  validateEmailFields,
  sanitizeInput,
  sanitizeRequestBody,
  isPrivateIP,
  hasSuspiciousPatterns
} = require('../middleware/enhanced-validation');

describe('Enhanced Validation Security Tests', () => {

  describe('URL Validation', () => {
    test('should accept valid HTTPS URLs', () => {
      const result = validateURL('https://example.com');
      expect(result.valid).toBe(true);
    });

    test('should accept valid HTTP URLs', () => {
      const result = validateURL('http://example.com');
      expect(result.valid).toBe(true);
    });

    test('should reject javascript: protocol', () => {
      const result = validateURL('javascript:alert(1)');
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('protocol');
    });

    test('should reject data: protocol', () => {
      const result = validateURL('data:text/html,<script>alert(1)</script>');
      expect(result.valid).toBe(false);
    });

    test('should reject file: protocol', () => {
      const result = validateURL('file:///etc/passwd');
      expect(result.valid).toBe(false);
    });

    test('should reject localhost in production', () => {
      const result = validateURL('http://localhost:3000', { allowLocalhost: false });
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('Localhost');
    });

    test('should allow localhost in development', () => {
      const result = validateURL('http://localhost:3000', { allowLocalhost: true });
      expect(result.valid).toBe(true);
    });

    test('should detect XSS attempts in URLs', () => {
      const result = validateURL('https://evil.com/<script>alert(1)</script>');
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('Suspicious');
    });

    test('should detect path traversal attempts', () => {
      const result = validateURL('https://example.com/../../../etc/passwd');
      expect(result.valid).toBe(false);
    });

    test('should detect null byte injection', () => {
      const result = validateURL('https://example.com%00.evil.com');
      expect(result.valid).toBe(false);
    });
  });

  describe('Email Validation', () => {
    test('should accept valid emails', () => {
      const result = validateEmail('user@example.com');
      expect(result.valid).toBe(true);
    });

    test('should reject invalid email format', () => {
      const result = validateEmail('not-an-email');
      expect(result.valid).toBe(false);
    });

    test('should reject XSS attempts in emails', () => {
      const result = validateEmail('user<script>@example.com');
      expect(result.valid).toBe(false);
    });

    test('should reject emails that are too long', () => {
      const longEmail = 'a'.repeat(255) + '@example.com';
      const result = validateEmail(longEmail);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('too long');
    });

    test('should reject emails with path traversal attempts', () => {
      const result = validateEmail('user/../admin@example.com');
      expect(result.valid).toBe(false);
    });
  });

  describe('Private IP Detection', () => {
    test('should detect 10.x.x.x range', () => {
      expect(isPrivateIP('10.0.0.1')).toBe(true);
      expect(isPrivateIP('10.255.255.255')).toBe(true);
    });

    test('should detect 192.168.x.x range', () => {
      expect(isPrivateIP('192.168.1.1')).toBe(true);
      expect(isPrivateIP('192.168.255.255')).toBe(true);
    });

    test('should detect 172.16-31.x.x range', () => {
      expect(isPrivateIP('172.16.0.1')).toBe(true);
      expect(isPrivateIP('172.31.255.255')).toBe(true);
    });

    test('should detect localhost ranges', () => {
      expect(isPrivateIP('127.0.0.1')).toBe(true);
      expect(isPrivateIP('127.255.255.255')).toBe(true);
    });

    test('should not detect public IPs as private', () => {
      expect(isPrivateIP('8.8.8.8')).toBe(false);
      expect(isPrivateIP('1.1.1.1')).toBe(false);
    });
  });

  describe('Suspicious Pattern Detection', () => {
    test('should detect script tags', () => {
      expect(hasSuspiciousPatterns('<script>alert(1)</script>')).toBe(true);
      expect(hasSuspiciousPatterns('<SCRIPT>alert(1)</SCRIPT>')).toBe(true);
    });

    test('should detect javascript: protocol', () => {
      expect(hasSuspiciousPatterns('javascript:alert(1)')).toBe(true);
    });

    test('should detect data: URIs', () => {
      expect(hasSuspiciousPatterns('data:text/html,<h1>test</h1>')).toBe(true);
    });

    test('should detect path traversal', () => {
      expect(hasSuspiciousPatterns('../../../etc/passwd')).toBe(true);
    });

    test('should detect null bytes', () => {
      expect(hasSuspiciousPatterns('test%00null')).toBe(true);
    });

    test('should detect CRLF injection', () => {
      expect(hasSuspiciousPatterns('test%0d%0aHeader: injected')).toBe(true);
    });

    test('should not flag normal content', () => {
      expect(hasSuspiciousPatterns('https://example.com')).toBe(false);
      expect(hasSuspiciousPatterns('user@example.com')).toBe(false);
    });
  });

  describe('Input Sanitization', () => {
    test('should remove control characters from strings', () => {
      const input = 'test\x00\x01\x02string';
      const result = sanitizeInput(input, 'string');
      expect(result).toBe('teststring');
    });

    test('should trim whitespace', () => {
      const result = sanitizeInput('  test  ', 'string');
      expect(result).toBe('test');
    });

    test('should convert to numbers correctly', () => {
      expect(sanitizeInput('123', 'number')).toBe(123);
      expect(sanitizeInput('123.45', 'number')).toBe(123.45);
      expect(sanitizeInput('invalid', 'number')).toBe(null);
    });

    test('should convert to boolean correctly', () => {
      expect(sanitizeInput('true', 'boolean')).toBe(true);
      expect(sanitizeInput('false', 'boolean')).toBe(true); // Non-empty string
      expect(sanitizeInput('', 'boolean')).toBe(false);
    });

    test('should handle null and undefined', () => {
      expect(sanitizeInput(null, 'string')).toBe(null);
      expect(sanitizeInput(undefined, 'string')).toBe(undefined);
    });
  });

  describe('URL Fields Middleware', () => {
    test('should pass valid URL in request body', () => {
      const middleware = validateURLFields(['website']);
      const req = { body: { website: 'https://example.com' } };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    test('should reject invalid URL in request body', () => {
      const middleware = validateURLFields(['website']);
      const req = { body: { website: 'javascript:alert(1)' } };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      middleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Validation failed'
        })
      );
    });
  });

  describe('Email Fields Middleware', () => {
    test('should pass valid email in request body', () => {
      const middleware = validateEmailFields(['email']);
      const req = { body: { email: 'user@example.com' } };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    test('should reject invalid email in request body', () => {
      const middleware = validateEmailFields(['email']);
      const req = { body: { email: 'not-an-email' } };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      middleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('Request Body Sanitization Middleware', () => {
    test('should sanitize fields according to schema', () => {
      const middleware = sanitizeRequestBody({
        name: 'string',
        age: 'number',
        active: 'boolean'
      });

      const req = {
        body: {
          name: '  John\x00Doe  ',
          age: '25',
          active: 'true'
        }
      };
      const res = {};
      const next = jest.fn();

      middleware(req, res, next);

      expect(req.body.name).toBe('JohnDoe');
      expect(req.body.age).toBe(25);
      expect(req.body.active).toBe(true);
      expect(next).toHaveBeenCalled();
    });
  });
});

describe('Vulnerability Mitigation Tests', () => {

  describe('validator.js URL Bypass (GHSA-9965-vmph-33xx)', () => {
    test('should mitigate URL validation bypass with custom validator', () => {
      // Test cases that might bypass vulnerable validator.js
      const maliciousURLs = [
        'https://example.com@evil.com',
        'https://example.com:evil.com',
        'https://example.com/../evil.com',
        'https://example.com%00.evil.com'
      ];

      for (const url of maliciousURLs) {
        const result = validateURL(url);
        // Our validator should catch these
        expect(result.valid).toBe(false);
      }
    });
  });

  describe('XSS Protection', () => {
    test('should detect common XSS patterns', () => {
      const xssAttempts = [
        '<script>alert(1)</script>',
        'javascript:alert(1)',
        '<img src=x onerror=alert(1)>',
        '<svg onload=alert(1)>',
        'data:text/html,<script>alert(1)</script>'
      ];

      for (const attempt of xssAttempts) {
        expect(hasSuspiciousPatterns(attempt)).toBe(true);
      }
    });
  });

  describe('Path Traversal Protection', () => {
    test('should detect path traversal attempts', () => {
      const traversalAttempts = [
        '../../../etc/passwd',
        '..\\..\\..\\windows\\system32',
        'https://example.com/../admin',
        '/var/www/../../../etc/passwd'
      ];

      for (const attempt of traversalAttempts) {
        expect(hasSuspiciousPatterns(attempt)).toBe(true);
      }
    });
  });

  describe('Injection Protection', () => {
    test('should detect null byte injection', () => {
      expect(hasSuspiciousPatterns('test%00.txt')).toBe(true);
    });

    test('should detect CRLF injection', () => {
      expect(hasSuspiciousPatterns('test%0d%0a')).toBe(true);
      expect(hasSuspiciousPatterns('test%0a')).toBe(true);
    });

    test('should remove control characters', () => {
      const malicious = 'test\x00\x01\x02\x03string';
      const sanitized = sanitizeInput(malicious, 'string');
      expect(sanitized).not.toContain('\x00');
      expect(sanitized).toBe('teststring');
    });
  });
});

// Integration test setup for running against live server
describe('Security Integration Tests', () => {
  // These would be run against a test server instance
  // Skipped by default to avoid requiring server to be running

  test.skip('should enforce rate limiting', async () => {
    // Test rate limiting by making multiple requests
  });

  test.skip('should set security headers', async () => {
    // Test that all security headers are present
  });

  test.skip('should enforce CORS policy', async () => {
    // Test CORS configuration
  });
});

module.exports = {
  // Export for integration with other test suites
};

