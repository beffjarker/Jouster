import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';
import { RuntimeConfigService } from './runtime-config.service';
import { isPrivatePath } from '../models/page-registry';

export interface AuthResponse {
  success: boolean;
  message?: string;
  authenticated?: boolean;
  authenticatedAt?: string;
}

/** Public route users are sent to when their session ends while on a private page. */
export const SESSION_ENDED_REDIRECT = '/interactive-playground';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(RuntimeConfigService);
  private readonly router = inject(Router);

  private get API_URL(): string {
    return this.config.apiUrl('/api/auth');
  }

  private authenticatedSubject = new BehaviorSubject<boolean>(false);
  public authenticated$ = this.authenticatedSubject.asObservable();

  constructor() {
    this.checkSession();
  }

  /**
   * Check if there's an existing valid session on startup
   */
  private checkSession(): void {
    this.http.get<AuthResponse>(`${this.API_URL}/verify`, { withCredentials: true })
      .pipe(
        catchError(() => of({ success: true, authenticated: false }))
      )
      .subscribe(response => {
        this.authenticatedSubject.next(response.authenticated === true);
      });
  }

  /**
   * Login with password only (single-user, no username needed)
   */
  public login(password: string): Observable<boolean> {
    return this.http.post<AuthResponse>(`${this.API_URL}/login`, { password }, { withCredentials: true })
      .pipe(
        tap(response => {
          if (response.success) {
            this.authenticatedSubject.next(true);
          }
        }),
        map(response => response.success),
        catchError(() => of(false))
      );
  }

  /**
   * Logout and destroy session
   */
  public logout(): Observable<boolean> {
    return this.http.post<AuthResponse>(`${this.API_URL}/logout`, {}, { withCredentials: true })
      .pipe(
        tap(() => this.endSession()),
        map(response => response.success),
        catchError(() => {
          this.endSession();
          return of(true);
        })
      );
  }

  /**
   * Mark the client as logged out (after logout, or when the API reports 401 because the
   * session expired) and leave any private page so its content is no longer shown.
   */
  public endSession(): void {
    this.authenticatedSubject.next(false);
    if (isPrivatePath(this.router.url)) {
      void this.router.navigateByUrl(SESSION_ENDED_REDIRECT);
    }
  }

  /**
   * Check if user is authenticated (synchronous)
   */
  public isAuthenticated(): boolean {
    return this.authenticatedSubject.value;
  }

  /**
   * Verify session is still valid (async)
   */
  public verify(): Observable<boolean> {
    return this.http.get<AuthResponse>(`${this.API_URL}/verify`, { withCredentials: true })
      .pipe(
        tap(response => {
          this.authenticatedSubject.next(response.authenticated === true);
        }),
        map(response => response.authenticated === true),
        catchError(() => {
          this.authenticatedSubject.next(false);
          return of(false);
        })
      );
  }
}

