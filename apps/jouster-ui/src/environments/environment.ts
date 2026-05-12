import { AppEnvironment } from './environment.interface';

export const environment: AppEnvironment = {
  production: false,
  name: 'development',
  version: '0.5.1', // TODO: Automate version injection from package.json during build
  apiUrl: '/api',           // Relative — proxy handles routing in dev
  wsUrl: 'ws://localhost:3001/ws',
  baseUrl: 'http://localhost:4200',
  forceHttps: false,
  enableDevTools: true,
  features: {
    enableMockUsers: true,
    enableDebugMode: true,
    enableConsoleLogging: true,
  },
};
