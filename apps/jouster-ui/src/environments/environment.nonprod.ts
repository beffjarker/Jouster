import { AppEnvironment } from './environment.interface';
// Non-Prod Environment Configuration
// Shared backend for preview environments, dev, qa, and staging.
// Talks to api-nonprod.jouster.org, which reads/writes the jouster-life-map-nonprod table.
export const environment: AppEnvironment = {
  production: false,
  name: 'nonprod',
  version: '0.6.0',
  apiUrl: 'https://api-nonprod.jouster.org/api',
  wsUrl: 'wss://api-nonprod.jouster.org/ws',
  baseUrl: 'https://nonprod.jouster.org',
  forceHttps: true,
  enableDevTools: true,
  cloudFrontDomain: '',
  requireSecureConnection: true,
  upgradeInsecureRequests: true,
  features: {
    enableMockUsers: false,
    enableDebugMode: true,
    enableConsoleLogging: true,
  },
};

