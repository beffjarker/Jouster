import { AppEnvironment } from './environment.interface';
// Staging Environment Configuration
export const environment: AppEnvironment = {
  production: false,
  name: 'staging',
  version: '0.6.0',
  apiUrl: 'https://api-stg.jouster.org/api',
  wsUrl: 'wss://api-stg.jouster.org/ws',
  baseUrl: 'https://stg.jouster.org',
  forceHttps: true,
  enableDevTools: false,
  cloudFrontDomain: '',
  requireSecureConnection: true,
  upgradeInsecureRequests: true,
  features: {
    enableMockUsers: false,
    enableDebugMode: false,
    enableConsoleLogging: false,
  },
};
