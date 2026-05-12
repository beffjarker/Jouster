import { AppEnvironment } from './environment.interface';

export const environment: AppEnvironment = {
  production: false,
  name: 'staging',
  version: '0.5.1',
  apiUrl: 'https://api-stg.jouster.org/api',
  wsUrl: 'wss://api-stg.jouster.org/ws',
  baseUrl: 'https://stg.jouster.org',
  forceHttps: true,
  enableDevTools: false,
  features: {
    enableMockUsers: false,
    enableDebugMode: false,
    enableConsoleLogging: false,
  },
};

