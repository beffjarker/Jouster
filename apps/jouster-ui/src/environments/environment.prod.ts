// Production Environment Configuration
// HTTPS-only configuration for jouster.org
export const environment = {
  production: true,

  // Force HTTPS for all URLs
  apiUrl: 'https://jouster.org/api',
  wsUrl: 'wss://jouster.org/ws',
  baseUrl: 'https://jouster.org',

  // Security settings
  forceHttps: true,
  enableDevTools: false,

  // CloudFront configuration
  cloudFrontDomain: 'https://d2kfv0ssubbghw.cloudfront.net',

  // SSL/TLS enforcement
  requireSecureConnection: true,
  upgradeInsecureRequests: true
};
// Development Environment Configuration
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api',
  wsUrl: 'ws://localhost:3000',
  baseUrl: 'http://localhost:4200',
  forceHttps: false,
  enableDevTools: true
};

