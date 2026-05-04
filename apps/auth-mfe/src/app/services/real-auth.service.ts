import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { LoginResponse } from './mock-auth.service';

export interface User {
  userId: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  avatar?: string;
}

/**
 * Real Authentication Service
 * Calls actual backend API endpoints
 * Used in QA, Staging, and Production
 */
@Injectable({
  providedIn: 'root'
})
export class RealAuthService {
  private readonly authApiUrl = environment.authApiUrl;

  constructor(private http: HttpClient) {
    console.log(`≡ƒöÉ RealAuthService initialized - Backend API: ${this.authApiUrl}`);
  }

  /**
   * Login with username and password via backend API
   */
  login(username: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.authApiUrl}/login`, {
      username,
      password
    });
  }

  /**
   * Logout via backend API
   */
  logout(accessToken: string): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(
      `${this.authApiUrl}/logout`,
      {},
      {
        headers: new HttpHeaders({
          'Authorization': `Bearer ${accessToken}`
        })
      }
    );
  }

  /**
   * Refresh access token using refresh token
   */
  refreshToken(refreshToken: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.authApiUrl}/refresh`, {
      refreshToken
    });
  }

  /**
   * Verify if current token is valid
   */
  verifyToken(token: string): Observable<{ valid: boolean; user?: User }> {
    return this.http.get<{ valid: boolean; user?: User }>(
      `${this.authApiUrl}/verify`,
      {
        headers: new HttpHeaders({
          'Authorization': `Bearer ${token}`
        })
      }
    );
  }
}
