/**
 * QA Environment Configuration
 * - Uses real backend API
 * - Preview deployments and QA testing
 */
export const environment = {
  production: false,
  name: 'qa' as const,
  useMockAuth: false,
  apiUrl: 'https://api-qa.jouster.org/api',
  authApiUrl: 'https://api-qa.jouster.org/api/auth',
  features: {
    enableMockUsers: false,
    enableDebugMode: true,
    enableConsoleLogging: true
  }
};

