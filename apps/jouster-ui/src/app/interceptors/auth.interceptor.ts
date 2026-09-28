import { HttpInterceptorFn } from '@angular/common/http';

/**
 * Legacy auth interceptor — no longer used with session-based auth.
 * Kept for reference. The credentialsInterceptor handles cookie-based auth.
 *
 * @deprecated Use credentialsInterceptor instead
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req);
};
