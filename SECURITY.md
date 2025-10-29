# Jouster Security Policy

## Supported Versions

Currently supported versions with security updates:

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

If you discover a security vulnerability, please follow these steps:

1. **DO NOT** open a public issue
2. Email the security team with details
3. Include the following information:
   - Type of vulnerability
   - Full paths of affected source files
   - Location of the affected code (tag/branch/commit)
   - Step-by-step instructions to reproduce
   - Proof-of-concept or exploit code (if available)
   - Impact of the vulnerability

### What to Expect

- Acknowledgment within 48 hours
- Regular updates on the progress
- Credit in the security advisory (if desired)

## Security Best Practices for Contributors

### Code Contributions

1. **Never commit secrets**
   - No API keys, passwords, or tokens in code
   - Use environment variables for all sensitive data
   - Check with `git diff` before committing

2. **Input Validation**
   - Always validate user input
   - Use provided validation middleware
   - Sanitize data before database operations

3. **Dependencies**
   - Run `npm audit` before submitting PRs
   - Keep dependencies up to date
   - Review security advisories

4. **Authentication & Authorization**
   - Use secure session management
   - Implement proper access controls
   - Never trust client-side data

### Code Review Checklist

- [ ] No hardcoded credentials
- [ ] Input validation implemented
- [ ] Error messages don't expose sensitive info
- [ ] Dependencies are up to date
- [ ] Security headers are properly set
- [ ] Rate limiting considered
- [ ] HTTPS enforced in production

## Security Measures Implemented

This project implements the following security measures:

- **Helmet.js**: Security headers
- **Rate Limiting**: DDoS protection
- **CORS**: Cross-origin resource sharing control
- **Input Validation**: XSS and injection prevention
- **Sanitization**: NoSQL injection prevention
- **HTTPS Enforcement**: Production SSL/TLS
- **Credential Encryption**: Secure secret management

## Automated Security

- GitHub Dependabot: Dependency vulnerability scanning
- npm audit: Regular security audits
- ESLint security rules: Static code analysis

## Security Contacts

For security-related questions or concerns, please contact the security team.

---

**Last Updated**: 2025-10-14

