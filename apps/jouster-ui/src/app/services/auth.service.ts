import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';

export interface AuthResponse {
  success: boolean;
  message?: string;
  authenticated?: boolean;
  authenticatedAt?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly API_URL = '/api/auth';

  private authenticatedSubject = new BehaviorSubject<boolean>(false);
  public authenticated$ = this.authenticatedSubject.asObservable();

  constructor(private http: HttpClient) {
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
  login(password: string): Observable<boolean> {
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
  logout(): Observable<boolean> {
    return this.http.post<AuthResponse>(`${this.API_URL}/logout`, {}, { withCredentials: true })
      .pipe(
        tap(() => {
          this.authenticatedSubject.next(false);
        }),
        map(response => response.success),
        catchError(() => {
          this.authenticatedSubject.next(false);
          return of(true);
        })
      );
  }

  /**
   * Check if user is authenticated (synchronous)
   */
  isAuthenticated(): boolean {
    return this.authenticatedSubject.value;
  }

  /**
   * Verify session is still valid (async)
   */
  verify(): Observable<boolean> {
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

