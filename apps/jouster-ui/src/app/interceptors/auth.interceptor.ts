import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { catchError, switchMap, throwError } from 'rxjs';

/**
 * HTTP Interceptor for JWT token injection and refresh
 *
 * Features:
 * - Automatically adds Authorization header with JWT token
 * - Handles 401 errors by refreshing token
 * - Retries failed request after token refresh
 * - Excludes auth endpoints from token injection
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);

  // Skip auth endpoints
  if (req.url.includes('/api/auth/login') ||
      req.url.includes('/api/auth/refresh')) {
    return next(req);
  }

  // Get current access token
  const accessToken = authService.getAccessToken();

  // Clone request and add authorization header if token exists
  const authReq = accessToken
    ? req.clone({
        setHeaders: {
          Authorization: `Bearer ${accessToken}`
        }
      })
    : req;

  // Handle request and catch 401 errors for token refresh
  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      // If 401 and we have a refresh token, try to refresh
      if (error.status === 401 && accessToken) {
        console.log('ΓÜá∩╕Å Access token expired, attempting refresh...');

        return authService.refreshAccessToken().pipe(
          switchMap(newToken => {
            if (newToken) {
              // Retry original request with new token
              const retryReq = req.clone({
                setHeaders: {
                  Authorization: `Bearer ${newToken}`
                }
              });

              console.log('Γ£à Token refreshed, retrying request');
              return next(retryReq);
            } else {
              // Refresh failed, logout user
              console.error('Γ¥î Token refresh failed, logging out');
              authService.logout();
              return throwError(() => error);
            }
          }),
          catchError(refreshError => {
            // Refresh failed, logout user
            console.error('Γ¥î Token refresh error:', refreshError);
            authService.logout();
            return throwError(() => error);
          })
        );
      }

      // Not a 401 or no token to refresh, pass error through
      return throwError(() => error);
    })
  );
};

