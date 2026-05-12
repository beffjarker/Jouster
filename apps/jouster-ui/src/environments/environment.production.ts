import { AppEnvironment } from './environment.interface';
// Production Environment Configuration
export const environment: AppEnvironment = {
  production: true,
  name: 'production',
  version: '0.6.0',
  apiUrl: 'https://jouster.org/api',
  wsUrl: 'wss://jouster.org/ws',
  baseUrl: 'https://jouster.org',
  forceHttps: true,
  enableDevTools: false,
  cloudFrontDomain: 'https://d2kfv0ssubbghw.cloudfront.net',
  requireSecureConnection: true,
  upgradeInsecureRequests: true,
  features: {
    enableMockUsers: false,
    enableDebugMode: false,
    enableConsoleLogging: false,
  },
};
