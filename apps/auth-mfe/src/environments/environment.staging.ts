/**
 * Staging Environment Configuration
 * - Uses real backend API
 * - Pre-production testing
 */
export const environment = {
  production: false,
  name: 'staging' as const,
  useMockAuth: false,
  apiUrl: 'https://api-staging.jouster.org/api',
  authApiUrl: 'https://api-staging.jouster.org/api/auth',
  features: {
    enableMockUsers: false,
    enableDebugMode: false,
    enableConsoleLogging: false
  }
};

