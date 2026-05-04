import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { MockAuthService, LoginResponse, MockUser } from './mock-auth.service';
import { RealAuthService } from './real-auth.service';

export type User = Omit<MockUser, 'password'>;

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
}

/**
 * Unified Authentication Service
 * Automatically switches between Mock and Real auth based on environment
 * Manages authentication state and localStorage persistence
 */
@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly STORAGE_KEY_ACCESS = 'jouster_access_token';
  private readonly STORAGE_KEY_REFRESH = 'jouster_refresh_token';
  private readonly STORAGE_KEY_USER = 'jouster_user';

  private authStateSubject = new BehaviorSubject<AuthState>({
    isAuthenticated: false,
    user: null,
    accessToken: null,
    refreshToken: null
  });

  public readonly authState$ = this.authStateSubject.asObservable();

  // Use mock or real auth based on environment
  private authProvider: MockAuthService | RealAuthService;

  constructor(
    private mockAuthService: MockAuthService,
    private realAuthService: RealAuthService
  ) {
    this.authProvider = environment.useMockAuth
      ? this.mockAuthService
      : this.realAuthService;

    const authType = environment.useMockAuth ? 'MOCK (Alice in Wonderland)' : 'REAL (Backend API)';
    console.log(`≡ƒÄ» AuthService initialized - Mode: ${authType}`);
    console.log(`≡ƒîì Environment: ${environment.name}`);

    this.initializeAuthState();
  }

  /**
   * Initialize auth state from localStorage on app startup
   */
  private initializeAuthState() {
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
            console.warn('ΓÜá∩╕Å Stored token is invalid, clearing auth state');
            this.logout();
          }
        });
      } catch (error) {
        console.error('Γ¥î Failed to parse stored user data:', error);
        this.logout();
      }
    }
  }

  /**
   * Login with username and password
   */
  login(username: string, password: string): Observable<boolean> {
    return this.authProvider.login(username, password).pipe(
      tap((response: LoginResponse) => {
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

          const mode = environment.useMockAuth ? '≡ƒÄ⌐ (Mock)' : '≡ƒöÉ (Real)';
          console.log(`Γ£à Login successful ${mode}:`, username);
        }
      }),
      map((response: LoginResponse) => response.success),
      catchError((error: unknown) => {
        console.error('Γ¥î Login failed:', error);
        return of(false);
      })
    );
  }

  /**
   * Logout and clear all stored data
   */
  logout() {
    const currentState = this.authStateSubject.value;

    if (currentState.accessToken && !environment.useMockAuth) {
      // Call logout endpoint for real auth (optional, for server-side cleanup)
      (this.authProvider as RealAuthService).logout(currentState.accessToken).subscribe({
        next: () => console.log('Γ£à Server-side logout successful'),
        error: (error: unknown) => console.warn('ΓÜá∩╕Å Server-side logout failed:', error)
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
   * Verify if current token is valid
   */
  verifyToken(): Observable<boolean> {
    const accessToken = this.authStateSubject.value.accessToken;

    if (!accessToken) {
      return of(false);
    }

    return this.authProvider.verifyToken(accessToken).pipe(
      map((response: { valid: boolean; user?: User }) => response.valid),
      catchError(() => of(false))
    );
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.authStateSubject.value.isAuthenticated;
  }

  /**
   * Get environment info (for debugging)
   */
  static getEnvironmentInfo() {
    return {
      name: environment.name,
      useMockAuth: environment.useMockAuth,
      authApiUrl: environment.authApiUrl,
      features: environment.features
    };
  }
}

