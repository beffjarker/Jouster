# Quick Security Setup Guide - Backend

## ✅ Security Package Status
All required security packages are **INSTALLED** in `apps/backend`:
- ✅ helmet (v8.1.0)
- ✅ express-rate-limit (v8.1.0)
- ✅ express-validator (v7.2.1)
- ✅ hpp (v0.2.3)
- ✅ xss-clean (v0.1.4)
- ✅ express-mongo-sanitize (v2.2.0)
- ✅ dotenv-vault (v1.27.0)

## 🚀 Available Security Commands (from apps/backend)

```bash
# Run automated security checks
npm run security:check

# Check for dependency vulnerabilities
npm run security:audit

# Fix automatically fixable vulnerabilities
npm run security:audit:fix

# Run complete security scan
npm run security:full

# Run platform-specific audit script
npm run security:scan
```

## 📋 Next Steps to Activate Security

### 1. Update Server to Use Security Middleware

You have two options:

**Option A: Use the new secure server (Recommended)**
```bash
cd apps/backend
# Backup current server
copy server.js server.js.backup
# Use the secure version
copy server-secure.js server.js
```

**Option B: Manually integrate security middleware**
Add to the top of your existing `server.js`:
```javascript
// Import security middleware
const {
  helmetConfig,
  generalLimiter,
  apiLimiter,
  sanitizeInput,
  xssClean,
  hppProtection,
  additionalSecurityHeaders,
  validateRequest,
  enforceHTTPS,
  securityLogger,
} = require('./middleware/security');

const { corsOptions, handleCorsError } = require('./config/cors');

// Apply middleware (BEFORE other middleware)
app.use(enforceHTTPS);
app.use(helmetConfig);
app.use(additionalSecurityHeaders);
app.use(securityLogger);
app.use(validateRequest);
app.use(generalLimiter);
app.use(xssClean);
app.use(sanitizeInput);
app.use(hppProtection);

// Replace existing CORS with secure version
app.use(cors(corsOptions));
app.use(handleCorsError);

// Add API rate limiting
app.use('/api', apiLimiter);
```

### 2. Test the Security Setup

```bash
# From apps/backend directory
npm run security:check
npm start
```

Then test endpoints:
```bash
curl http://localhost:3000/health
```

Check response headers include security headers like:
- X-Content-Type-Options: nosniff
- X-Frame-Options: DENY
- Strict-Transport-Security (in production)

### 3. Fix Any Dependency Vulnerabilities

```bash
npm run security:audit:fix
```

## 🔧 Configuration Files Created

- ✅ `apps/backend/middleware/security.js` - Security middleware
- ✅ `apps/backend/middleware/validation.js` - Input validation
- ✅ `apps/backend/config/cors.js` - CORS configuration
- ✅ `apps/backend/credential-manager-secure.js` - Enhanced credential management
- ✅ `apps/backend/server-secure.js` - Fully integrated secure server
- ✅ `apps/backend/routes/emails.js` - Updated with validation

## 🎯 Quick Test

Run this to verify security is working:

```bash
cd apps/backend
npm run security:check
npm start
```

In another terminal:
```bash
curl -I http://localhost:3000/health
```

You should see security headers in the response.

## 📊 Current Status

- ✅ Security packages installed
- ✅ Security middleware created
- ✅ Validation middleware created
- ✅ CORS configuration ready
- ✅ Scripts added to package.json
- ⏳ **Waiting: Apply security middleware to server.js**
- ⏳ **Waiting: Test security headers**

## 🚨 Before Production

1. Generate encryption master key:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   ```

2. Set environment variable:
   ```bash
   set ENCRYPTION_MASTER_KEY=<generated-key>
   ```

3. Rotate AWS credentials in .env file

4. Test all endpoints with security enabled

---

**All security components are ready to activate!**

