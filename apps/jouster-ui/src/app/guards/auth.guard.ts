import { inject } from '@angular/core';
import { Router, CanActivateFn, UrlTree } from '@angular/router';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

/**
 * Auth Guard to protect routes requiring authentication.
 *
 * Verifies the session asynchronously against the backend so that deep-links
 * (direct navigation before the startup session check resolves) are not
 * falsely redirected. Unauthenticated users are silently sent home — there is
 * no visible login page.
 */
export const authGuard: CanActivateFn = (): Observable<boolean | UrlTree> => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Fast path: already known to be authenticated this session.
  if (authService.isAuthenticated()) {
    return of(true);
  }

  // Otherwise verify with the backend before deciding (handles deep-links).
  return authService.verify().pipe(
    map((authenticated) => authenticated ? true : router.createUrlTree(['/'])),
    catchError(() => of(router.createUrlTree(['/'])))
  );
};
