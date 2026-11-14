import { HttpErrorResponse, HttpInterceptorFn, HttpStatusCode } from '@angular/common/http';
import { Injector, inject } from '@angular/core';
import { throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { RuntimeConfigService } from '../services/runtime-config.service';

/**
 * When a private API call returns 401 (session expired / revoked server-side), mark the
 * client logged out and leave any private page. The error is re-thrown so callers still
 * see it. `/api/auth/*` is skipped: AuthService handles those responses itself.
 */
export const unauthorizedInterceptor: HttpInterceptorFn = (req, next) => {
  // Resolved lazily: AuthService depends on HttpClient, which runs this interceptor.
  const injector = inject(Injector);
  const apiPrefix = `${inject(RuntimeConfigService).apiBaseUrl}/api`;
  const isApi = req.url.startsWith('/api') || req.url.startsWith(apiPrefix);
  const isAuthEndpoint = req.url.includes('/api/auth/');

  if (!isApi || isAuthEndpoint) {
    return next(req);
  }

  return next(req).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === HttpStatusCode.Unauthorized) {
        injector.get(AuthService).endSession();
      }
      return throwError(() => error);
    }),
  );
};
