/**
 * Development Environment Configuration
 * - Uses mock Alice in Wonderland authentication
 * - Local development only
 */
export const environment = {
  production: false,
  name: 'development' as const,
  useMockAuth: true,
  apiUrl: 'http://localhost:3001/api',
  authApiUrl: 'http://localhost:3001/api/auth',
  features: {
    enableMockUsers: true,
    enableDebugMode: true,
    enableConsoleLogging: true
  }
};
