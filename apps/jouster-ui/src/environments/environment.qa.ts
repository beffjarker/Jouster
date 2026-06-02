import { AppEnvironment } from './environment.interface';
// QA Environment Configuration
export const environment: AppEnvironment = {
  production: false,
  name: 'qa',
  version: '0.6.0',
  apiUrl: 'https://api-qa.jouster.org/api',
  wsUrl: 'wss://api-qa.jouster.org/ws',
  baseUrl: 'https://qa.jouster.org',
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
