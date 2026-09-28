import { Injectable } from '@angular/core';
import { Observable, of, delay } from 'rxjs';

/**
 * Alice in Wonderland Mock Users
 * Used for local development and testing
 */
export interface MockUser {
  userId: string;
  username: string;
  password: string; // Plain text for mock only!
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'moderator' | 'user';
  avatar?: string;
}

export const ALICE_IN_WONDERLAND_USERS: MockUser[] = [
  {
    userId: 'e47c06b2-fba2-41b1-a936-e170e655093d',
    username: 'alice',
    password: 'throughthelookingglass',
    email: 'alice@wonderland.local',
    firstName: 'Alice',
    lastName: 'Liddell',
    role: 'admin',
    avatar: '≡ƒæº'
  },
  {
    userId: 'c7f9d8e1-3b2a-4c5d-9e6f-8a7b6c5d4e3f',
    username: 'queenofhearts',
    password: 'offwithheads',
    email: 'queen@wonderland.local',
    firstName: 'Queen',
    lastName: 'of Hearts',
    role: 'moderator',
    avatar: '≡ƒæ╕'
  },
  {
    userId: 'b6e8c9d0-2a1b-3c4d-8e5f-7a6b5c4d3e2f',
    username: 'madhatter',
    password: 'teaparty',
    email: 'hatter@wonderland.local',
    firstName: 'Mad',
    lastName: 'Hatter',
    role: 'user',
    avatar: '≡ƒÄ⌐'
  },
  {
    userId: 'a5d7b8c9-1a0b-2c3d-7e4f-6a5b4c3d2e1f',
    username: 'cheshire',
    password: 'grinning',
    email: 'cheshire@wonderland.local',
    firstName: 'Cheshire',
    lastName: 'Cat',
    role: 'user',
    avatar: '≡ƒÿ║'
  },
  {
    userId: '94c6a7b8-0a9b-1c2d-6e3f-5a4b3c2d1e0f',
    username: 'whiterabbit',
    password: 'imlate',
    email: 'rabbit@wonderland.local',
    firstName: 'White',
    lastName: 'Rabbit',
    role: 'user',
    avatar: '≡ƒÉ░'
  },
  {
    userId: '83b5a6b7-9a8b-0c1d-5e2f-4a3b2c1d0e9f',
    username: 'caterpillar',
    password: 'whoRyou',
    email: 'caterpillar@wonderland.local',
    firstName: 'Blue',
    lastName: 'Caterpillar',
    role: 'user',
    avatar: '≡ƒÉ¢'
  },
  {
    userId: '72a4b5c6-8a7b-9c0d-4e1f-3a2b1c0d9e8f',
    username: 'marchhare',
    password: 'teaparty',
    email: 'hare@wonderland.local',
    firstName: 'March',
    lastName: 'Hare',
    role: 'user',
    avatar: '≡ƒÉç'
  },
  {
    userId: '61b3c4d5-7a6b-8c9d-3e0f-2a1b0c9d8e7f',
    username: 'dormouse',
    password: 'sleepy',
    email: 'dormouse@wonderland.local',
    firstName: 'Dormouse',
    lastName: '',
    role: 'user',
    avatar: '≡ƒÿ┤'
  },
  {
    userId: '50c2d3e4-6a5b-7c8d-2e9f-1a0b9c8d7e6f',
    username: 'tweedledee',
    password: 'contrariwise',
    email: 'dee@wonderland.local',
    firstName: 'Tweedle',
    lastName: 'Dee',
    role: 'user',
    avatar: '≡ƒæÑ'
  },
  {
    userId: '4fd1e2f3-5a4b-6c7d-1e8f-0a9b8c7d6e5f',
    username: 'tweedledum',
    password: 'contrariwise',
    email: 'dum@wonderland.local',
    firstName: 'Tweedle',
    lastName: 'Dum',
    role: 'user',
    avatar: '≡ƒæÑ'
  }
];

export interface LoginResponse {
  success: boolean;
  message: string;
  data?: {
    accessToken: string;
    refreshToken: string;
    user: Omit<MockUser, 'password'>;
  };
}

/**
 * Mock Authentication Service
 * Simulates backend authentication with Alice in Wonderland characters
 * FOR LOCAL DEVELOPMENT ONLY - Never use in production!
 */
@Injectable({
  providedIn: 'root'
})
export class MockAuthService {
  private readonly MOCK_DELAY_MS = 500; // Simulate network delay

  constructor() {
    console.log('≡ƒÄ⌐ MockAuthService initialized - Alice in Wonderland authentication active');
    console.log('≡ƒôï Available users:', ALICE_IN_WONDERLAND_USERS.map(u => u.username).join(', '));
  }

  /**
   * Mock login - validates credentials against Wonderland users
   */
  login(username: string, password: string): Observable<LoginResponse> {
    const user = ALICE_IN_WONDERLAND_USERS.find(
      u => u.username.toLowerCase() === username.toLowerCase()
    );

    if (!user) {
      return of({
        success: false,
        message: `User '${username}' not found in Wonderland. Try: ${ALICE_IN_WONDERLAND_USERS[0].username}`
      }).pipe(delay(this.MOCK_DELAY_MS));
    }

    if (user.password !== password) {
      return of({
        success: false,
        message: 'Invalid password. Check your credentials and try again.'
      }).pipe(delay(this.MOCK_DELAY_MS));
    }

    // Generate mock JWT tokens
    const accessToken = this.generateMockToken(user, 'access');
    const refreshToken = this.generateMockToken(user, 'refresh');

    const { password: _, ...userWithoutPassword } = user;

    return of({
      success: true,
      message: 'Login successful',
      data: {
        accessToken,
        refreshToken,
        user: userWithoutPassword
      }
    }).pipe(delay(this.MOCK_DELAY_MS));
  }

  /**
   * Mock logout
   */
  logout(): Observable<{ success: boolean; message: string }> {
    return of({
      success: true,
      message: 'Logged out successfully'
    }).pipe(delay(this.MOCK_DELAY_MS));
  }

  /**
   * Mock token refresh
   */
  refreshToken(refreshToken: string): Observable<LoginResponse> {
    // Decode mock token to get user
    try {
      const payload = JSON.parse(atob(refreshToken.split('.')[1]));
      const user = ALICE_IN_WONDERLAND_USERS.find(u => u.userId === payload.userId);

      if (!user) {
        return of({
          success: false,
          message: 'Invalid refresh token'
        }).pipe(delay(this.MOCK_DELAY_MS));
      }

      const newAccessToken = this.generateMockToken(user, 'access');
      const { password: _, ...userWithoutPassword } = user;

      return of({
        success: true,
        message: 'Token refreshed successfully',
        data: {
          accessToken: newAccessToken,
          refreshToken: refreshToken,
          user: userWithoutPassword
        }
      }).pipe(delay(this.MOCK_DELAY_MS));
    } catch (error) {
      return of({
        success: false,
        message: 'Invalid token format'
      }).pipe(delay(this.MOCK_DELAY_MS));
    }
  }

  /**
   * Mock token verification
   */
  verifyToken(token: string): Observable<{ valid: boolean; user?: Omit<MockUser, 'password'> }> {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const user = ALICE_IN_WONDERLAND_USERS.find(u => u.userId === payload.userId);

      if (!user) {
        return of({ valid: false }).pipe(delay(this.MOCK_DELAY_MS));
      }

      const { password: _, ...userWithoutPassword } = user;

      return of({
        valid: true,
        user: userWithoutPassword
      }).pipe(delay(this.MOCK_DELAY_MS));
    } catch (error) {
      return of({ valid: false }).pipe(delay(this.MOCK_DELAY_MS));
    }
  }

  /**
   * Generate a mock JWT token
   * Format: header.payload.signature (base64 encoded)
   */
  private generateMockToken(user: MockUser, type: 'access' | 'refresh'): string {
    const header = {
      alg: 'HS256',
      typ: 'JWT'
    };

    const now = Math.floor(Date.now() / 1000);
    const expiresIn = type === 'access' ? 86400 : 604800; // 1 day / 7 days

    const payload = {
      userId: user.userId,
      username: user.username,
      role: user.role,
      type: type,
      iat: now,
      exp: now + expiresIn,
      aud: 'jouster-ui',
      iss: 'jouster-auth-mfe-mock'
    };

    const signature = 'mock-signature-wonderland';

    return `${btoa(JSON.stringify(header))}.${btoa(JSON.stringify(payload))}.${btoa(signature)}`;
  }

  /**
   * Get all mock users (for testing/demo purposes)
   */
  getAllMockUsers(): MockUser[] {
    return ALICE_IN_WONDERLAND_USERS.map(u => ({ ...u }));
  }

  /**
   * Get mock user by username (without password)
   */
  getMockUserByUsername(username: string): Omit<MockUser, 'password'> | undefined {
    const user = ALICE_IN_WONDERLAND_USERS.find(
      u => u.username.toLowerCase() === username.toLowerCase()
    );

    if (!user) {
      return undefined;
    }

    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
}

