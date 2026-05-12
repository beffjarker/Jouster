import { HttpInterceptorFn } from '@angular/common/http';
import { environment } from '../../environments/environment';

/**
 * HTTP Interceptor that adds withCredentials to all API requests.
 * This ensures session cookies are sent with cross-origin requests.
 */
export const credentialsInterceptor: HttpInterceptorFn = (req, next) => {
  // Only add credentials for our own API requests
  if (req.url.startsWith('/api') || req.url.startsWith(environment.apiUrl)) {
    const credReq = req.clone({ withCredentials: true });
    return next(credReq);
  }

  return next(req);
};
