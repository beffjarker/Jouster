import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { RuntimeConfigService } from '../services/runtime-config.service';

/**
 * HTTP Interceptor that adds withCredentials to all API requests.
 * This ensures session cookies are sent with cross-origin requests
 * (e.g. per-PR preview frontends calling their API Gateway backend).
 */
export const credentialsInterceptor: HttpInterceptorFn = (req, next) => {
  const apiPrefix = `${inject(RuntimeConfigService).apiBaseUrl}/api`;

  // Only add credentials for our own API requests
  if (req.url.startsWith('/api') || req.url.startsWith(apiPrefix)) {
    return next(req.clone({ withCredentials: true }));
  }

  return next(req);
};
