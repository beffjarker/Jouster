import { AppEnvironment } from './environment.interface';

export const environment: AppEnvironment = {
  production: false,
  name: 'qa',
  version: '0.5.1',
  apiUrl: 'https://api-qa.jouster.org/api',
  wsUrl: 'wss://api-qa.jouster.org/ws',
  baseUrl: 'https://qa.jouster.org',
  forceHttps: true,
  enableDevTools: true,
  features: {
    enableMockUsers: false,
    enableDebugMode: true,
    enableConsoleLogging: true,
  },
};

