# Security Best Practices Guide for Jouster

## 🔒 Security Implementation Status

This document outlines all security measures implemented in the Jouster project.

## Critical Security Measures Implemented

### 1. Secrets Management ✅

**Status**: CONFIGURED
**Priority**: CRITICAL

- `.env` files are properly ignored in `.gitignore`
- AWS credentials are NOT committed to the repository
- Credential encryption system implemented
- Master key management for production ready

**Action Items**:
- [ ] Set `ENCRYPTION_MASTER_KEY` environment variable in production
- [ ] Rotate AWS credentials after any suspected exposure
- [ ] Configure AWS Secrets Manager for production credentials
- [ ] Remove hardcoded API keys from `server.js` (use env vars only)

### 2. Security Middleware ✅

**Status**: IMPLEMENTED
**Files**: `apps/backend/middleware/security.js`

Implemented protections:
- ✅ Helmet.js for security headers
- ✅ Rate limiting (general, API, and auth endpoints)
- ✅ XSS protection
- ✅ NoSQL injection prevention
- ✅ HTTP Parameter Pollution (HPP) protection
- ✅ HTTPS enforcement for production
- ✅ Security event logging

### 3. CORS Configuration ✅

**Status**: IMPLEMENTED
**Files**: `apps/backend/config/cors.js`

Features:
- Environment-specific allowed origins
- Proper credential handling
- Preflight caching
- CORS error handling

### 4. Input Validation ✅

**Status**: IMPLEMENTED
**Files**: `apps/backend/middleware/validation.js`

Validations:
- Email endpoint query parameters
- S3 key validation
- Conversation ID validation (UUID)
- Pagination parameters
- Date range validation

### 5. Enhanced Credential Manager ✅

**Status**: IMPLEMENTED
**Files**: `apps/backend/credential-manager-secure.js`

Features:
- AES-256-GCM encryption
- Master key management
- Credential masking for logs
- Validation checks
- Secure environment detection

## Environment Variables Checklist

### Required for All Environments

```bash
NODE_ENV=development|staging|production
PORT=3000
```

### Production-Specific (CRITICAL)

```bash
# Master encryption key (32+ characters, cryptographically random)
ENCRYPTION_MASTER_KEY=<generate-with-crypto>

# HTTPS enforcement
ENFORCE_HTTPS=true

# Use encrypted versions of credentials
INSTAGRAM_APP_ID_ENCRYPTED=<encrypted-value>
INSTAGRAM_APP_SECRET_ENCRYPTED=<encrypted-value>
AWS_ACCESS_KEY_ID_ENCRYPTED=<encrypted-value>
AWS_SECRET_ACCESS_KEY_ENCRYPTED=<encrypted-value>
```

### AWS Credentials (Development Only)

```bash
AWS_ACCESS_KEY_ID=<dev-only>
AWS_SECRET_ACCESS_KEY=<dev-only>
AWS_REGION=us-west-2
```

### API Keys (Development Only)

```bash
INSTAGRAM_APP_ID=<dev-key>
INSTAGRAM_APP_SECRET=<dev-secret>
LASTFM_API_KEY=<dev-key>
```

## Security Checklist for Deployment

### Pre-Deployment

- [ ] Rotate all AWS credentials
- [ ] Generate production encryption master key
- [ ] Encrypt all production secrets
- [ ] Review and update CORS allowed origins
- [ ] Enable HTTPS enforcement
- [ ] Configure rate limits based on expected traffic
- [ ] Set up AWS Secrets Manager or similar
- [ ] Remove all development credentials from production

### Post-Deployment

- [ ] Verify HTTPS is enforced
- [ ] Test rate limiting is working
- [ ] Verify CORS blocks unauthorized origins
- [ ] Check security headers are present
- [ ] Monitor logs for security events
- [ ] Set up alerting for suspicious activity

## Dependency Security

### Regular Maintenance

```bash
# Audit dependencies for vulnerabilities
npm audit

# Fix automatically if possible
npm audit fix

# For severe vulnerabilities requiring manual intervention
npm audit fix --force
```

### Recommended Schedule
- Weekly: Run `npm audit` in CI/CD
- Monthly: Update dependencies
- Immediately: Fix critical vulnerabilities

## Rate Limiting Configuration

| Endpoint Type | Window | Max Requests | Notes |
|--------------|--------|--------------|-------|
| General | 15 min | 100 | All endpoints |
| API | 1 min | 30 | API routes |
| Auth | 15 min | 5 | Authentication |
| Health Check | N/A | Unlimited | Monitoring |

## Security Headers Implemented

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: geolocation=(), microphone=(), camera=()`
- Content Security Policy with strict directives

## Common Security Vulnerabilities - Prevention

### ✅ Prevented

1. **SQL/NoSQL Injection**: Input sanitization implemented
2. **XSS (Cross-Site Scripting)**: XSS-clean middleware + CSP headers
3. **CSRF**: SameSite cookies + origin validation
4. **Clickjacking**: X-Frame-Options: DENY
5. **Man-in-the-Middle**: HTTPS enforcement + HSTS
6. **Brute Force**: Rate limiting on all endpoints
7. **Directory Traversal**: Path validation + sanitization
8. **Information Disclosure**: Error handling + no stack traces in production

### ⚠️ Requires Ongoing Vigilance

1. **Dependency Vulnerabilities**: Run `npm audit` regularly
2. **Exposed Secrets**: Never commit credentials
3. **Insufficient Logging**: Monitor security events
4. **Weak Authentication**: Use strong tokens and rotation

## AWS Security Best Practices

### IAM Policies

- Use least privilege principle
- Separate dev/staging/prod credentials
- Enable MFA on AWS accounts
- Rotate credentials every 90 days
- Use IAM roles for EC2/Lambda instead of access keys when possible

### S3 Security

- Enable bucket encryption
- Block public access unless explicitly needed
- Enable versioning for critical data
- Configure lifecycle policies
- Enable access logging

## Incident Response Plan

### If Credentials Are Exposed

1. **IMMEDIATELY**:
   - Rotate all exposed credentials in AWS/API providers
   - Revoke all active sessions
   - Change encryption keys

2. **Within 1 Hour**:
   - Review access logs for unauthorized usage
   - Document the incident
   - Notify stakeholders

3. **Within 24 Hours**:
   - Investigate how exposure occurred
   - Implement additional safeguards
   - Update security documentation

## Security Contacts

- Security issues: [Create private security advisory]
- AWS account security: [AWS Support]
- Dependency vulnerabilities: [GitHub Dependabot]

## Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [AWS Security Best Practices](https://aws.amazon.com/security/best-practices/)
- [Express.js Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)

---

**Last Updated**: 2025-10-14
**Next Review**: 2025-11-14
/**
 * Enhanced Credential Manager with Secure Secret Management
 * Implements AWS Secrets Manager integration and better security practices
 */

const crypto = require('crypto');

class CredentialManager {
  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
    this.isProduction = process.env.NODE_ENV === 'production';
    this.algorithm = 'aes-256-gcm';
  }

  /**
   * Encrypt sensitive data using AES-256-GCM
   * This is more secure than simple XOR obfuscation
   */
  encrypt(text, masterKey = null) {
    if (!text || text.includes('your_')) return text;

    try {
      const key = masterKey || this.getMasterKey();
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv(this.algorithm, key, iv);
      
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const authTag = cipher.getAuthTag();
      
      // Return iv:authTag:encrypted
      return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
    } catch (error) {
      console.error('Encryption error:', error.message);
      throw new Error('Failed to encrypt credential');
    }
  }

  /**
   * Decrypt sensitive data
   */
  decrypt(encryptedText, masterKey = null) {
    if (!encryptedText || encryptedText.includes('your_')) return encryptedText;

    try {
      const key = masterKey || this.getMasterKey();
      const parts = encryptedText.split(':');
      
      if (parts.length !== 3) {
        throw new Error('Invalid encrypted format');
      }
      
      const iv = Buffer.from(parts[0], 'hex');
      const authTag = Buffer.from(parts[1], 'hex');
      const encrypted = parts[2];
      
      const decipher = crypto.createDecipheriv(this.algorithm, key, iv);
      decipher.setAuthTag(authTag);
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      console.warn('Decryption failed, returning as-is:', error.message);
      return encryptedText;
    }
  }

  /**
   * Get or generate master encryption key
   * In production, this should come from AWS Secrets Manager or similar
   */
  getMasterKey() {
    const envKey = process.env.ENCRYPTION_MASTER_KEY;
    
    if (envKey) {
      // Ensure key is 32 bytes for AES-256
      return crypto.createHash('sha256').update(envKey).digest();
    }
    
    if (this.isProduction) {
      throw new Error('ENCRYPTION_MASTER_KEY must be set in production');
    }
    
    // Development fallback (NOT for production!)
    return crypto.createHash('sha256').update('jouster-dev-key-2024').digest();
  }

  /**
   * Get credential based on environment with secure handling
   */
  getCredential(envVar, encryptedVar = null) {
    const value = process.env[envVar];
    
    // If encrypted version exists and we're in production, use it
    if (this.isProduction && encryptedVar && process.env[encryptedVar]) {
      try {
        return this.decrypt(process.env[encryptedVar]);
      } catch (error) {
        console.error(`Failed to decrypt ${encryptedVar}:`, error.message);
        throw new Error(`Credential decryption failed for ${envVar}`);
      }
    }
    
    // Validate the credential doesn't look like a placeholder
    if (value && value.includes('your_')) {
      return null;
    }
    
    return value;
  }

  /**
   * Validate all required credentials are present and valid
   */
  validateCredentials() {
    const required = [
      'INSTAGRAM_APP_ID',
      'INSTAGRAM_APP_SECRET',
      'INSTAGRAM_ACCESS_TOKEN',
      'INSTAGRAM_USER_ID',
      'FACEBOOK_PAGE_ID',
      'FACEBOOK_PAGE_ACCESS_TOKEN'
    ];

    const missing = [];
    const configured = {};
    const invalid = [];

    required.forEach(key => {
      try {
        const value = this.getCredential(key, `${key}_ENCRYPTED`);
        
        if (!value) {
          missing.push(key);
        } else if (value.includes('your_') || value.includes('placeholder')) {
          invalid.push(key);
        } else {
          // Show only first 8 characters for verification
          configured[key] = `${value.substring(0, 8)}...`;
        }
      } catch (error) {
        missing.push(key);
      }
    });

    return {
      isValid: missing.length === 0 && invalid.length === 0,
      missing,
      invalid,
      configured,
      environment: process.env.NODE_ENV || 'development'
    };
  }

  /**
   * Get all Instagram API credentials securely
   */
  getInstagramCredentials() {
    return {
      appId: this.getCredential('INSTAGRAM_APP_ID', 'INSTAGRAM_APP_ID_ENCRYPTED'),
      appSecret: this.getCredential('INSTAGRAM_APP_SECRET', 'INSTAGRAM_APP_SECRET_ENCRYPTED'),
      accessToken: this.getCredential('INSTAGRAM_ACCESS_TOKEN', 'INSTAGRAM_ACCESS_TOKEN_ENCRYPTED'),
      userId: this.getCredential('INSTAGRAM_USER_ID', 'INSTAGRAM_USER_ID_ENCRYPTED'),
      pageId: this.getCredential('FACEBOOK_PAGE_ID', 'FACEBOOK_PAGE_ID_ENCRYPTED'),
      pageAccessToken: this.getCredential('FACEBOOK_PAGE_ACCESS_TOKEN', 'FACEBOOK_PAGE_ACCESS_TOKEN_ENCRYPTED')
    };
  }

  /**
   * Get AWS credentials securely
   */
  getAWSCredentials() {
    return {
      accessKeyId: this.getCredential('AWS_ACCESS_KEY_ID', 'AWS_ACCESS_KEY_ID_ENCRYPTED'),
      secretAccessKey: this.getCredential('AWS_SECRET_ACCESS_KEY', 'AWS_SECRET_ACCESS_KEY_ENCRYPTED'),
      region: process.env.AWS_REGION || 'us-west-2'
    };
  }

  /**
   * Mask sensitive information for logging
   */
  maskSensitive(value, visibleChars = 4) {
    if (!value || typeof value !== 'string') return '[EMPTY]';
    
    if (value.length <= visibleChars * 2) {
      return '*'.repeat(value.length);
    }
    
    const start = value.substring(0, visibleChars);
    const end = value.substring(value.length - visibleChars);
    const masked = '*'.repeat(value.length - (visibleChars * 2));
    
    return `${start}${masked}${end}`;
  }

  /**
   * Check if running in secure environment
   */
  isSecureEnvironment() {
    const checks = {
      nodeEnvSet: !!process.env.NODE_ENV,
      notDevelopment: process.env.NODE_ENV !== 'development',
      encryptionKeySet: !!process.env.ENCRYPTION_MASTER_KEY,
      httpsEnforced: process.env.ENFORCE_HTTPS === 'true',
    };

    return {
      isSecure: Object.values(checks).every(check => check === true),
      checks
    };
  }
}

module.exports = CredentialManager;

