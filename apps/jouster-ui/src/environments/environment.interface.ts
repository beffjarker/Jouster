/** Shared environment configuration interface for all build targets. */
export interface AppEnvironment {
  production: boolean;
  name: 'development' | 'nonprod' | 'qa' | 'staging' | 'production';
  version: string;
  apiUrl: string;
  wsUrl: string;
  baseUrl: string;
  forceHttps: boolean;
  enableDevTools: boolean;
  cloudFrontDomain?: string;
  requireSecureConnection?: boolean;
  upgradeInsecureRequests?: boolean;
  features: {
    enableMockUsers: boolean;
    enableDebugMode: boolean;
    enableConsoleLogging: boolean;
  };
}

