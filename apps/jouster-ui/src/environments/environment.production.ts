// Production Environment Configuration
export const environment = {
  production: true,
  version: '0.5.0', // TODO: Automate version injection from package.json during build
  apiUrl: 'https://jouster.org/api',
  wsUrl: 'wss://jouster.org/ws',
  baseUrl: 'https://jouster.org',
  forceHttps: true,
  enableDevTools: false,
  cloudFrontDomain: 'https://d2kfv0ssubbghw.cloudfront.net',
  requireSecureConnection: true,
  upgradeInsecureRequests: true
};

