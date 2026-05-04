import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';

export interface User {
  id: number;
  username: string;
  role: string;
  email: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  data?: {
    accessToken: string;
    refreshToken: string;
    user: User;
  };
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly API_URL = 'http://localhost:3000/api/auth';
  private readonly STORAGE_KEY_ACCESS = 'jouster_access_token';
  private readonly STORAGE_KEY_REFRESH = 'jouster_refresh_token';
  private readonly STORAGE_KEY_USER = 'jouster_user';

  private authStateSubject = new BehaviorSubject<AuthState>({
    isAuthenticated: false,
    user: null,
    accessToken: null,
    refreshToken: null
  });

  public authState$ = this.authStateSubject.asObservable();

  constructor(private http: HttpClient) {
    this.initializeAuthState();
  }

  /**
   * Initialize auth state from localStorage on app startup
   */
  private initializeAuthState(): void {
    const accessToken = localStorage.getItem(this.STORAGE_KEY_ACCESS);
    const refreshToken = localStorage.getItem(this.STORAGE_KEY_REFRESH);
    const userJson = localStorage.getItem(this.STORAGE_KEY_USER);

    if (accessToken && userJson) {
      try {
        const user = JSON.parse(userJson);
        this.authStateSubject.next({
          isAuthenticated: true,
          user,
          accessToken,
          refreshToken
        });

        // Verify token is still valid
        this.verifyToken().subscribe({
          error: () => {
            // Token invalid, clear state
            this.logout();
          }
        });
      } catch (error) {
        console.error('Failed to parse stored user data:', error);
        this.logout();
      }
    }
  }

  /**
   * Login with username and password
   */
  login(username: string, password: string): Observable<boolean> {
    return this.http.post<LoginResponse>(`${this.API_URL}/login`, {
      username,
      password
    }).pipe(
      tap(response => {
        if (response.success && response.data) {
          // Store tokens and user data
          localStorage.setItem(this.STORAGE_KEY_ACCESS, response.data.accessToken);
          localStorage.setItem(this.STORAGE_KEY_REFRESH, response.data.refreshToken);
          localStorage.setItem(this.STORAGE_KEY_USER, JSON.stringify(response.data.user));

          // Update auth state
          this.authStateSubject.next({
            isAuthenticated: true,
            user: response.data.user,
            accessToken: response.data.accessToken,
            refreshToken: response.data.refreshToken
          });

          console.log('Γ£à Login successful:', username);
        }
      }),
      map(response => response.success),
      catchError(error => {
        console.error('Γ¥î Login failed:', error);
        return of(false);
      })
    );
  }

  /**
   * Logout and clear all stored data
   */
  logout(): void {
    const currentState = this.authStateSubject.value;

    if (currentState.accessToken) {
      // Call logout endpoint (optional, for server-side cleanup)
      this.http.post(`${this.API_URL}/logout`, {}, {
        headers: new HttpHeaders({
          'Authorization': `Bearer ${currentState.accessToken}`
        })
      }).subscribe({
        next: () => console.log('Γ£à Server-side logout successful'),
        error: (error) => console.warn('ΓÜá∩╕Å Server-side logout failed:', error)
      });
    }

    // Clear local storage
    localStorage.removeItem(this.STORAGE_KEY_ACCESS);
    localStorage.removeItem(this.STORAGE_KEY_REFRESH);
    localStorage.removeItem(this.STORAGE_KEY_USER);

    // Update auth state
    this.authStateSubject.next({
      isAuthenticated: false,
      user: null,
      accessToken: null,
      refreshToken: null
    });

    console.log('Γ£à Logout successful');
  }

  /**
   * Refresh access token using refresh token
   */
  refreshAccessToken(): Observable<string | null> {
    const refreshToken = this.authStateSubject.value.refreshToken;

    if (!refreshToken) {
      return of(null);
    }

    return this.http.post<LoginResponse>(`${this.API_URL}/refresh`, {
      refreshToken
    }).pipe(
      tap(response => {
        if (response.success && response.data?.accessToken) {
          // Update access token
          localStorage.setItem(this.STORAGE_KEY_ACCESS, response.data.accessToken);

          const currentState = this.authStateSubject.value;
          this.authStateSubject.next({
            ...currentState,
            accessToken: response.data.accessToken
          });

          console.log('Γ£à Access token refreshed');
        }
      }),
      map(response => response.success ? response.data.accessToken : null),
      catchError(error => {
        console.error('Γ¥î Token refresh failed:', error);
        // Refresh token expired or invalid, logout
        this.logout();
        return of(null);
      })
    );
  }

  /**
   * Verify if current token is valid
   */
  verifyToken(): Observable<boolean> {
    const accessToken = this.authStateSubject.value.accessToken;

    if (!accessToken) {
      return of(false);
    }

    return this.http.get<{ success: boolean }>(`${this.API_URL}/verify`, {
      headers: new HttpHeaders({
        'Authorization': `Bearer ${accessToken}`
      })
    }).pipe(
      map(response => response.success),
      catchError(() => of(false))
    );
  }

  /**
   * Get current authentication state (synchronous)
   */
  getAuthState(): AuthState {
    return this.authStateSubject.value;
  }

  /**
   * Check if user is authenticated (synchronous)
   */
  isAuthenticated(): boolean {
    return this.authStateSubject.value.isAuthenticated;
  }

  /**
   * Get current user (synchronous)
   */
  getCurrentUser(): User | null {
    return this.authStateSubject.value.user;
  }

  /**
   * Get current access token (synchronous)
   */
  getAccessToken(): string | null {
    return this.authStateSubject.value.accessToken;
  }

  /**
   * Check if user has specific role
   */
  hasRole(role: string): boolean {
    const user = this.authStateSubject.value.user;
    return user?.role === role;
  }
}

