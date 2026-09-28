/**
 * Production Environment Configuration
 * - Uses real backend API
 * - Production deployment
 */
export const environment = {
  production: true,
  name: 'production' as const,
  useMockAuth: false,
  apiUrl: 'https://api.jouster.org/api',
  authApiUrl: 'https://api.jouster.org/api/auth',
  features: {
    enableMockUsers: false,
    enableDebugMode: false,
    enableConsoleLogging: false
  }
};

