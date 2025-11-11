// CloudFront Function: Add Security Headers for HTTPS-Only
// This function adds security headers to enforce HTTPS and prevent security issues

function handler(event) {
    var response = event.response;
    var headers = response.headers;

    // HTTP Strict Transport Security (HSTS)
    // Forces browsers to always use HTTPS for 1 year
    headers['strict-transport-security'] = {
        value: 'max-age=31536000; includeSubDomains; preload'
    };

    // Prevent clickjacking attacks
    headers['x-frame-options'] = {
        value: 'SAMEORIGIN'
    };

    // Prevent MIME-type sniffing
    headers['x-content-type-options'] = {
        value: 'nosniff'
    };

    // Referrer Policy - protect user privacy
    headers['referrer-policy'] = {
        value: 'strict-origin-when-cross-origin'
    };

    // Content Security Policy
    // Prevents mixed content (HTTP resources on HTTPS page)
    headers['content-security-policy'] = {
        value: "upgrade-insecure-requests; default-src 'self' https:; script-src 'self' 'unsafe-inline' 'unsafe-eval' https:; style-src 'self' 'unsafe-inline' https:; img-src 'self' data: https:; font-src 'self' data: https:; connect-src 'self' https: wss:; frame-ancestors 'self';"
    };

    // Permissions Policy (formerly Feature Policy)
    headers['permissions-policy'] = {
        value: 'geolocation=(), microphone=(), camera=()'
    };

    return response;
}

