import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { RuntimeConfigService } from '../services/runtime-config.service';

/**
 * HTTP Interceptor for our own API requests:
 * - adds `withCredentials` so the session cookie is sent (incl. cross-origin previews);
 * - adds `X-Requested-With: XMLHttpRequest`, which the backend requires on every
 *   state-changing `/api` request as CSRF defense-in-depth.
 */
export const credentialsInterceptor: HttpInterceptorFn = (req, next) => {
  const apiPrefix = `${inject(RuntimeConfigService).apiBaseUrl}/api`;

  if (req.url.startsWith('/api') || req.url.startsWith(apiPrefix)) {
    return next(
      req.clone({
        withCredentials: true,
        headers: req.headers.set('X-Requested-With', 'XMLHttpRequest'),
      }),
    );
  }

  return next(req);
};
