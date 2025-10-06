import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject, of, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

// Existing interfaces maintained with camelCase naming
export interface LastfmTrack {
  name: string;
  artist: string;
  album?: string;
  image?: string;
  url?: string;
  playcount?: number;
  date?: Date;
}

export interface LastfmArtist {
  name: string;
  playcount: number;
  image?: string;
  url?: string;
  listeners?: number;
}

export interface LastfmAlbum {
  name: string;
  artist: string;
  playcount: number;
  image?: string;
  url?: string;
}

export interface LastfmUser {
  name: string;
  playcount: number;
  artistCount: number;
  albumCount: number;
  trackCount: number;
  registered: Date;
  url: string;
}

// New interfaces for authentication
export interface LastfmAuthState {
  isAuthenticated: boolean;
  username: string | null;
  sessionKey: string | null;
}

export interface LastfmAuthResult {
  success: boolean;
  sessionKey: string;
  username: string;
}

export interface LastfmScrobbleData {
  artist: string;
  track: string;
  timestamp: number;
  album?: string;
  albumArtist?: string;
  duration?: number;
  mbid?: string;
}

export interface LastfmScrobbleResult {
  success: boolean;
  accepted: number;
  ignored: number;
}

// Existing analysis interfaces maintained
export interface ListeningHistoryAnalysis {
  totalScrobbles: number;
  averageScrobblesPerDay: number;
  membershipDays: number;
  mostActiveYear: string;
  mostActiveMonth: string;
  listeningStreaks: ListeningStreak[];
  genreDistribution: GenreStats[];
  yearlyStats: YearlyStats[];
  monthlyTrends: MonthlyTrend[];
  discoveryRate: number;
  explorationScore: number;
  diversityIndex: number;
}

export interface ListeningStreak {
  startDate: Date;
  endDate: Date;
  duration: number;
  scrobbles: number;
  type: string;
  days: number;
  totalScrobbles: number;
  avgPerDay: number;
}

export interface GenreStats {
  genre: string;
  playcount: number;
  percentage: number;
  topArtists: string[];
}

export interface YearlyStats {
  year: number;
  scrobbles: number;
  uniqueArtists: number;
  uniqueAlbums: number;
  uniqueTracks: number;
  topArtist: string;
  topAlbum: string;
  topTrack: string;
}

export interface MonthlyTrend {
  year: number;
  month: number;
  scrobbles: number;
  averagePerDay: number;
  averageScrobbles: number;
}

export interface HistoricalPeriodData {
  period: string;
  artists: LastfmArtist[];
  albums: LastfmAlbum[];
  tracks: LastfmTrack[];
}

// Last.fm API response interfaces
interface LastfmApiResponse {
  error?: {
    code: number;
    message: string;
  };
}

interface LastfmAuthResponse extends LastfmApiResponse {
  session?: {
    key: string;
    name: string;
    subscriber: string;
  };
}

interface LastfmTracksResponse extends LastfmApiResponse {
  recenttracks?: {
    track: LastfmTrack[] | LastfmTrack;
  };
}

interface LastfmArtistsResponse extends LastfmApiResponse {
  topartists?: {
    artist: LastfmArtist[] | LastfmArtist;
  };
}

interface LastfmAlbumsResponse extends LastfmApiResponse {
  topalbums?: {
    album: LastfmAlbum[] | LastfmAlbum;
  };
}

interface LastfmUserResponse extends LastfmApiResponse {
  user?: LastfmUser;
}

interface LastfmScrobbleResponse extends LastfmApiResponse {
  scrobbles?: {
    '@attr': {
      accepted: string;
      ignored: string;
    };
  };
}

interface LastfmNowPlayingResponse extends LastfmApiResponse {
  nowplaying?: {
    track: string;
    artist: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class LastfmService {
  // Configuration based on Last.fm API documentation with camelCase naming
  private readonly apiUrl = 'http://www.last.fm/2.0/';
  private readonly authUrl = 'http://www.last.fm/api/auth/';
  private readonly apiKey = 'your-api-key'; // Should be configured via environment
  private readonly sharedSecret = 'your-shared-secret'; // Should be configured via environment
  private readonly callbackUrl = 'http://localhost:4200/lastfm/callback';

  // Use Angular's inject() function instead of constructor injection
  private readonly http = inject(HttpClient);

  // Authentication state management
  private readonly authStateSubject = new BehaviorSubject<LastfmAuthState>({
    isAuthenticated: false,
    username: null,
    sessionKey: null
  });

  public readonly authState$ = this.authStateSubject.asObservable();

  constructor() {
    this.restoreSession();
  }

  // Authentication Flow Methods

  /**
   * Generate Last.fm authorization URL for web application flow
   * Based on: https://www.last.fm/api/authentication
   */
  public getAuthorizationUrl(): string {
    const params = new URLSearchParams({
      api_key: this.apiKey,
      cb: this.callbackUrl
    });

    return `${this.authUrl}?${params.toString()}`;
  }

  /**
   * Handle authentication callback and exchange token for session key
   * Based on: https://www.last.fm/api/authspec method auth.getSession
   */
  public handleAuthCallback(token: string): Observable<LastfmAuthResult> {
    const params: Record<string, string> = {
      method: 'auth.getSession',
      api_key: this.apiKey,
      token: token
    };

    const signature = this.generateApiSignature(params);
    const body = new HttpParams()
      .set('method', params.method)
      .set('api_key', params.api_key)
      .set('token', params.token)
      .set('api_sig', signature)
      .set('format', 'json');

    return this.http.post<LastfmAuthResponse>(this.apiUrl, body.toString(), {
      headers: { 'content-type': 'application/x-www-form-urlencoded' }
    }).pipe(
      map(response => {
        if (response.error) {
          throw new Error(`Last.fm authentication failed: ${response.error.message}`);
        }

        if (!response.session) {
          throw new Error('Last.fm authentication failed: No session data received');
        }

        const sessionKey = response.session.key;
        const username = response.session.name;

        // Store session data
        this.storeSessionData(sessionKey, username);

        return {
          success: true,
          sessionKey,
          username
        };
      }),
      catchError(error => {
        console.error('Last.fm authentication error:', error);
        return throwError(() => new Error('Last.fm authentication failed'));
      })
    );
  }

  /**
   * Logout and clear authentication state
   */
  public logout(): void {
    localStorage.removeItem('lastfm_session_key');
    localStorage.removeItem('lastfm_username');

    this.authStateSubject.next({
      isAuthenticated: false,
      username: null,
      sessionKey: null
    });
  }

  /**
   * Restore session from localStorage on service initialization
   */
  public restoreSession(): void {
    const sessionKey = localStorage.getItem('lastfm_session_key');
    const username = localStorage.getItem('lastfm_username');

    if (sessionKey && username) {
      this.authStateSubject.next({
        isAuthenticated: true,
        username,
        sessionKey
      });
    }
  }

  /**
   * Validate current session with Last.fm API
   */
  public validateSession(): Observable<boolean> {
    const currentState = this.authStateSubject.value;

    if (!currentState.isAuthenticated || !currentState.sessionKey) {
      return of(false);
    }

    const params: Record<string, string> = {
      method: 'user.getInfo',
      api_key: this.apiKey,
      sk: currentState.sessionKey,
      user: currentState.username || ''
    };

    const signature = this.generateApiSignature(params);
    const body = new HttpParams()
      .set('method', params.method)
      .set('api_key', params.api_key)
      .set('user', params.user)
      .set('sk', params.sk)
      .set('api_sig', signature)
      .set('format', 'json');

    return this.http.post<LastfmUserResponse>(this.apiUrl, body.toString(), {
      headers: { 'content-type': 'application/x-www-form-urlencoded' }
    }).pipe(
      map(response => {
        if (response.error) {
          this.logout(); // Clear invalid session
          return false;
        }
        return true;
      }),
      catchError(() => {
        this.logout(); // Clear invalid session on error
        return of(false);
      })
    );
  }

  // Authentication State Methods

  public isAuthenticated(): boolean {
    return this.authStateSubject.value.isAuthenticated;
  }

  public getCurrentUser(): string | null {
    return this.authStateSubject.value.username;
  }

  // Authenticated API Methods

  /**
   * Get recent tracks for authenticated user
   * Based on: user.getRecentTracks method
   */
  public getRecentTracks(limit = 10): Observable<LastfmTrack[]> {
    if (!this.isAuthenticated()) {
      return throwError(() => new Error('Last.fm authentication required'));
    }

    const currentState = this.authStateSubject.value;
    const params: Record<string, string> = {
      method: 'user.getRecentTracks',
      api_key: this.apiKey,
      user: currentState.username || '',
      sk: currentState.sessionKey || '',
      limit: limit.toString()
    };

    const signature = this.generateApiSignature(params);
    const body = new HttpParams()
      .set('method', params.method)
      .set('api_key', params.api_key)
      .set('user', params.user)
      .set('limit', params.limit)
      .set('sk', params.sk)
      .set('api_sig', signature)
      .set('format', 'json');

    return this.http.post<LastfmTracksResponse>(this.apiUrl, body.toString(), {
      headers: { 'content-type': 'application/x-www-form-urlencoded' }
    }).pipe(
      map(response => {
        if (response.error) {
          throw new Error(`Last.fm API error: ${response.error.message}`);
        }

        if (!response.recenttracks) {
          return [];
        }

        const tracks = response.recenttracks.track;
        return Array.isArray(tracks) ? tracks : [tracks];
      }),
      catchError(error => {
        if (error.message?.includes('network error')) {
          return throwError(() => new Error('Last.fm network error'));
        }
        return throwError(() => error);
      })
    );
  }

  /**
   * Get top artists for authenticated user
   */
  public getTopArtists(period = '7day', limit = 12): Observable<LastfmArtist[]> {
    if (!this.isAuthenticated()) {
      return throwError(() => new Error('Last.fm authentication required'));
    }

    const currentState = this.authStateSubject.value;
    const params: Record<string, string> = {
      method: 'user.getTopArtists',
      api_key: this.apiKey,
      user: currentState.username || '',
      sk: currentState.sessionKey || '',
      period,
      limit: limit.toString()
    };

    const signature = this.generateApiSignature(params);
    const body = new HttpParams()
      .set('method', params.method)
      .set('api_key', params.api_key)
      .set('user', params.user)
      .set('period', params.period)
      .set('limit', params.limit)
      .set('sk', params.sk)
      .set('api_sig', signature)
      .set('format', 'json');

    return this.http.post<LastfmArtistsResponse>(this.apiUrl, body.toString(), {
      headers: { 'content-type': 'application/x-www-form-urlencoded' }
    }).pipe(
      map(response => {
        if (response.error) {
          throw new Error(`Last.fm API error: ${response.error.message}`);
        }

        if (!response.topartists) {
          return [];
        }

        const artists = response.topartists.artist;
        return Array.isArray(artists) ? artists : [artists];
      })
    );
  }

  /**
   * Get top albums for authenticated user
   */
  public getTopAlbums(period = '7day', limit = 9): Observable<LastfmAlbum[]> {
    if (!this.isAuthenticated()) {
      return throwError(() => new Error('Last.fm authentication required'));
    }

    const currentState = this.authStateSubject.value;
    const params: Record<string, string> = {
      method: 'user.getTopAlbums',
      api_key: this.apiKey,
      user: currentState.username || '',
      sk: currentState.sessionKey || '',
      period,
      limit: limit.toString()
    };

    const signature = this.generateApiSignature(params);
    const body = new HttpParams()
      .set('method', params.method)
      .set('api_key', params.api_key)
      .set('user', params.user)
      .set('period', params.period)
      .set('limit', params.limit)
      .set('sk', params.sk)
      .set('api_sig', signature)
      .set('format', 'json');

    return this.http.post<LastfmAlbumsResponse>(this.apiUrl, body.toString(), {
      headers: { 'content-type': 'application/x-www-form-urlencoded' }
    }).pipe(
      map(response => {
        if (response.error) {
          throw new Error(`Last.fm API error: ${response.error.message}`);
        }

        if (!response.topalbums) {
          return [];
        }

        const albums = response.topalbums.album;
        return Array.isArray(albums) ? albums : [albums];
      })
    );
  }

  /**
   * Get user information for authenticated user
   */
  public getUserInfo(): Observable<LastfmUser> {
    if (!this.isAuthenticated()) {
      return throwError(() => new Error('Last.fm authentication required'));
    }

    const currentState = this.authStateSubject.value;
    const params: Record<string, string> = {
      method: 'user.getInfo',
      api_key: this.apiKey,
      user: currentState.username || '',
      sk: currentState.sessionKey || ''
    };

    const signature = this.generateApiSignature(params);
    const body = new HttpParams()
      .set('method', params.method)
      .set('api_key', params.api_key)
      .set('user', params.user)
      .set('sk', params.sk)
      .set('api_sig', signature)
      .set('format', 'json');

    return this.http.post<LastfmUserResponse>(this.apiUrl, body.toString(), {
      headers: { 'content-type': 'application/x-www-form-urlencoded' }
    }).pipe(
      map(response => {
        if (response.error) {
          throw new Error(`Last.fm API error: ${response.error.message}`);
        }

        if (!response.user) {
          throw new Error('Last.fm API error: No user data received');
        }

        return response.user;
      })
    );
  }

  // Scrobbling Methods (Write Operations)

  /**
   * Scrobble a track to Last.fm
   * Based on: track.scrobble method
   */
  public scrobbleTrack(trackData: LastfmScrobbleData): Observable<LastfmScrobbleResult> {
    if (!this.isAuthenticated()) {
      return throwError(() => new Error('Last.fm authentication required'));
    }

    const currentState = this.authStateSubject.value;
    const params: Record<string, string> = {
      method: 'track.scrobble',
      api_key: this.apiKey,
      sk: currentState.sessionKey || '',
      'artist[0]': trackData.artist,
      'track[0]': trackData.track,
      'timestamp[0]': trackData.timestamp.toString()
    };

    // Add optional parameters
    if (trackData.album) {
      params['album[0]'] = trackData.album;
    }
    if (trackData.duration) {
      params['duration[0]'] = trackData.duration.toString();
    }

    const signature = this.generateApiSignature(params);
    const body = new HttpParams()
      .set('method', params.method)
      .set('api_key', params.api_key)
      .set('sk', params.sk)
      .set('artist[0]', params['artist[0]'])
      .set('track[0]', params['track[0]'])
      .set('timestamp[0]', params['timestamp[0]'])
      .set('api_sig', signature)
      .set('format', 'json');

    return this.http.post<LastfmScrobbleResponse>(this.apiUrl, body.toString(), {
      headers: { 'content-type': 'application/x-www-form-urlencoded' }
    }).pipe(
      map(response => {
        if (response.error) {
          throw new Error(`Last.fm scrobble error: ${response.error.message}`);
        }

        if (!response.scrobbles) {
          throw new Error('Last.fm scrobble error: No scrobble data received');
        }

        return {
          success: true,
          accepted: parseInt(response.scrobbles['@attr'].accepted, 10),
          ignored: parseInt(response.scrobbles['@attr'].ignored, 10)
        };
      })
    );
  }

  /**
   * Update now playing status
   * Based on: track.updateNowPlaying method
   */
  public updateNowPlaying(trackData: Partial<LastfmScrobbleData>): Observable<{ success: boolean }> {
    if (!this.isAuthenticated()) {
      return throwError(() => new Error('Last.fm authentication required'));
    }

    const currentState = this.authStateSubject.value;
    const params: Record<string, string> = {
      method: 'track.updateNowPlaying',
      api_key: this.apiKey,
      sk: currentState.sessionKey || '',
      artist: trackData.artist || '',
      track: trackData.track || ''
    };

    if (trackData.album) {
      params.album = trackData.album;
    }

    const signature = this.generateApiSignature(params);
    const body = new HttpParams()
      .set('method', params.method)
      .set('api_key', params.api_key)
      .set('sk', params.sk)
      .set('artist', params.artist)
      .set('track', params.track)
      .set('api_sig', signature)
      .set('format', 'json');

    return this.http.post<LastfmNowPlayingResponse>(this.apiUrl, body.toString(), {
      headers: { 'content-type': 'application/x-www-form-urlencoded' }
    }).pipe(
      map(response => {
        if (response.error) {
          throw new Error(`Last.fm now playing error: ${response.error.message}`);
        }

        return { success: true };
      })
    );
  }

  // Private Helper Methods

  /**
   * Generate API signature for authenticated requests
   * Based on: https://www.last.fm/api/authspec
   */
  private generateApiSignature(params: Record<string, string>): string {
    // Sort parameters alphabetically
    const sortedKeys = Object.keys(params).sort();

    // Create parameter string
    let paramString = '';
    for (const key of sortedKeys) {
      paramString += key + params[key];
    }

    // Add shared secret
    paramString += this.sharedSecret;

    // Generate MD5 hash (in real implementation, use crypto library)
    // For now, returning a mock signature for testing
    return this.md5Hash(paramString);
  }

  /**
   * Simple MD5 hash implementation (use proper crypto library in production)
   */
  private md5Hash(input: string): string {
    // This is a simplified implementation for testing
    // In production, use a proper crypto library like crypto-js
    let hash = 0;
    if (input.length === 0) return hash.toString();

    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }

    // Convert to hex and pad to 32 characters for MD5-like format
    return Math.abs(hash).toString(16).padStart(32, '0');
  }

  /**
   * Store session data in localStorage
   */
  private storeSessionData(sessionKey: string, username: string): void {
    localStorage.setItem('lastfm_session_key', sessionKey);
    localStorage.setItem('lastfm_username', username);

    this.authStateSubject.next({
      isAuthenticated: true,
      username,
      sessionKey
    });
  }

  // Legacy methods for backward compatibility (can be removed if not needed)
  // These maintain the original mock fallback behavior for existing components

  /**
   * Get listening history analysis (existing functionality)
   */
  public getListeningHistoryAnalysis(): Observable<ListeningHistoryAnalysis> {
    // Implementation would analyze user's listening data
    // For now, return mock data for backward compatibility
    return of({
      totalScrobbles: 0,
      averageScrobblesPerDay: 0,
      membershipDays: 0,
      mostActiveYear: '',
      mostActiveMonth: '',
      listeningStreaks: [],
      genreDistribution: [],
      yearlyStats: [],
      monthlyTrends: [],
      discoveryRate: 0,
      explorationScore: 0,
      diversityIndex: 0
    });
  }

  /**
   * Get historical period data (existing functionality)
   */
  public getHistoricalPeriodData(_periods: string[]): Observable<HistoricalPeriodData[]> {
    // Implementation would fetch historical data for specified periods
    return of([]);
  }
}
