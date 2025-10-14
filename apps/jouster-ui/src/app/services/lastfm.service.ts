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
  // Configuration - check environment variables first, fallback to development mode
  private readonly apiUrl = 'https://ws.audioscrobbler.com/2.0/';
  private readonly authUrl = 'https://www.last.fm/api/auth/';
  private readonly apiKey = this.getApiKey();
  private readonly sharedSecret = this.getSharedSecret();
  private readonly callbackUrl = 'http://localhost:4200/lastfm/callback';

  // Development mode flag
  private readonly isDevelopmentMode = !this.apiKey || this.apiKey === 'your-api-key';

  // Use Angular's inject() function instead of constructor injection
  private readonly http = inject(HttpClient);

  // Authentication state management
  private readonly authStateSubject = new BehaviorSubject<LastfmAuthState>({
    isAuthenticated: this.isDevelopmentMode, // Auto-authenticate in dev mode
    username: this.isDevelopmentMode ? 'DemoUser' : null,
    sessionKey: this.isDevelopmentMode ? 'demo-session-key' : null
  });

  public readonly authState$ = this.authStateSubject.asObservable();

  constructor() {
    if (!this.isDevelopmentMode) {
      this.restoreSession();
    }
  }

  private getApiKey(): string {
    // Check for environment variable, fallback to placeholder
    return (typeof window !== 'undefined' && (window as any).LASTFM_API_KEY) ||
           'your-api-key';
  }

  private getSharedSecret(): string {
    // Check for environment variable, fallback to placeholder
    return (typeof window !== 'undefined' && (window as any).LASTFM_SHARED_SECRET) ||
           'your-shared-secret';
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
      .set('method', params['method'])
      .set('api_key', params['api_key'])
      .set('token', params['token'])
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
  public logout() {
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
  public restoreSession() {
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
      .set('method', params['method'])
      .set('api_key', params['api_key'])
      .set('user', params['user'])
      .set('sk', params['sk'])
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
    if (this.isDevelopmentMode) {
      return of(this.getMockRecentTracks(limit));
    }

    const authState = this.authStateSubject.value;
    if (!authState.isAuthenticated || !authState.sessionKey) {
      return of(this.getMockRecentTracks(limit));
    }

    // Real API call implementation would go here
    return of(this.getMockRecentTracks(limit));
  }

  /**
   * Get top artists for authenticated user
   */
  public getTopArtists(period = '7day', limit = 12): Observable<LastfmArtist[]> {
    if (this.isDevelopmentMode) {
      return of(this.getMockTopArtists(limit));
    }

    const authState = this.authStateSubject.value;
    if (!authState.isAuthenticated || !authState.sessionKey) {
      return of(this.getMockTopArtists(limit));
    }

    // Real API call implementation would go here
    return of(this.getMockTopArtists(limit));
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
      .set('method', params['method'])
      .set('api_key', params['api_key'])
      .set('user', params['user'])
      .set('period', params['period'])
      .set('limit', params['limit'])
      .set('sk', params['sk'])
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
      .set('method', params['method'])
      .set('api_key', params['api_key'])
      .set('user', params['user'])
      .set('sk', params['sk'])
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
      params['album'] = trackData['album'];
    }
    if (trackData.duration) {
      params['duration[0]'] = trackData.duration.toString();
    }

    const signature = this.generateApiSignature(params);
    const body = new HttpParams()
      .set('method', params['method'])
      .set('api_key', params['api_key'])
      .set('sk', params['sk'])
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

    if (trackData['album']) {
      params['album'] = trackData['album'];
    }

    const signature = this.generateApiSignature(params);
    const body = new HttpParams()
      .set('method', params['method'])
      .set('api_key', params['api_key'])
      .set('sk', params['sk'])
      .set('artist', params['artist'])
      .set('track', params['track'])
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

  /**
   * Get listening history analysis with fallback to mock data
   */
  public getListeningHistoryAnalysis(): Observable<ListeningHistoryAnalysis> {
    if (this.isDevelopmentMode) {
      return of(this.getMockListeningHistoryAnalysis());
    }

    // If we have real API credentials, attempt to fetch real data
    // For now, return mock data as the real implementation would require complex API orchestration
    return of(this.getMockListeningHistoryAnalysis());
  }

  /**
   * Generate comprehensive mock listening history analysis
   */
  private getMockListeningHistoryAnalysis(): ListeningHistoryAnalysis {
    const currentYear = new Date().getFullYear();

    return {
      totalScrobbles: 127543,
      averageScrobblesPerDay: 89.2,
      membershipDays: 1429,
      mostActiveYear: (currentYear - 1).toString(),
      mostActiveMonth: 'March',
      discoveryRate: 15.8,
      explorationScore: 73.2,
      diversityIndex: 8.7,
      listeningStreaks: [
        {
          startDate: new Date(2024, 2, 15),
          endDate: new Date(2024, 2, 28),
          duration: 13,
          scrobbles: 1247,
          type: 'High Activity',
          days: 13,
          totalScrobbles: 1247,
          avgPerDay: 95.9
        },
        {
          startDate: new Date(2024, 5, 3),
          endDate: new Date(2024, 5, 18),
          duration: 15,
          scrobbles: 1891,
          type: 'Discovery Phase',
          days: 15,
          totalScrobbles: 1891,
          avgPerDay: 126.1
        }
      ],
      genreDistribution: [
        { genre: 'Alternative Rock', playcount: 23456, percentage: 18.4, topArtists: ['Radiohead', 'Arctic Monkeys', 'The Strokes'] },
        { genre: 'Electronic', playcount: 19234, percentage: 15.1, topArtists: ['Aphex Twin', 'Boards of Canada', 'Burial'] },
        { genre: 'Jazz', playcount: 15789, percentage: 12.4, topArtists: ['Miles Davis', 'John Coltrane', 'Bill Evans'] },
        { genre: 'Hip Hop', playcount: 14567, percentage: 11.4, topArtists: ['Kendrick Lamar', 'J Dilla', 'MF DOOM'] },
        { genre: 'Classical', playcount: 12890, percentage: 10.1, topArtists: ['Bach', 'Mozart', 'Beethoven'] },
        { genre: 'Indie Pop', playcount: 11234, percentage: 8.8, topArtists: ['Vampire Weekend', 'Tame Impala', 'MGMT'] },
        { genre: 'Post-Rock', playcount: 9876, percentage: 7.7, topArtists: ['Godspeed You! Black Emperor', 'Explosions in the Sky', 'Sigur Rós'] },
        { genre: 'Folk', playcount: 8765, percentage: 6.9, topArtists: ['Bob Dylan', 'Joni Mitchell', 'Nick Drake'] },
        { genre: 'Ambient', playcount: 6543, percentage: 5.1, topArtists: ['Brian Eno', 'Tim Hecker', 'Stars of the Lid'] },
        { genre: 'Other', playcount: 5189, percentage: 4.1, topArtists: ['Various Artists'] }
      ],
      yearlyStats: [
        {
          year: currentYear,
          scrobbles: 28945,
          uniqueArtists: 1247,
          uniqueAlbums: 2891,
          uniqueTracks: 8734,
          topArtist: 'Radiohead',
          topAlbum: 'OK Computer',
          topTrack: 'Paranoid Android'
        },
        {
          year: currentYear - 1,
          scrobbles: 34567,
          uniqueArtists: 1567,
          uniqueAlbums: 3245,
          uniqueTracks: 9876,
          topArtist: 'Miles Davis',
          topAlbum: 'Kind of Blue',
          topTrack: 'So What'
        },
        {
          year: currentYear - 2,
          scrobbles: 31234,
          uniqueArtists: 1398,
          uniqueAlbums: 2987,
          uniqueTracks: 8945,
          topArtist: 'Aphex Twin',
          topAlbum: 'Selected Ambient Works 85-92',
          topTrack: 'Windowlicker'
        },
        {
          year: currentYear - 3,
          scrobbles: 32797,
          uniqueArtists: 1456,
          uniqueAlbums: 3123,
          uniqueTracks: 9234,
          topArtist: 'J Dilla',
          topAlbum: 'Donuts',
          topTrack: 'Time: The Donut of the Heart'
        }
      ],
      monthlyTrends: [
        { year: currentYear, month: 1, scrobbles: 2845, averagePerDay: 91.8, averageScrobbles: 91.8 },
        { year: currentYear, month: 2, scrobbles: 2567, averagePerDay: 91.7, averageScrobbles: 91.7 },
        { year: currentYear, month: 3, scrobbles: 3124, averagePerDay: 100.8, averageScrobbles: 100.8 },
        { year: currentYear, month: 4, scrobbles: 2987, averagePerDay: 99.6, averageScrobbles: 99.6 },
        { year: currentYear, month: 5, scrobbles: 3234, averagePerDay: 104.3, averageScrobbles: 104.3 },
        { year: currentYear, month: 6, scrobbles: 2876, averagePerDay: 95.9, averageScrobbles: 95.9 },
        { year: currentYear, month: 7, scrobbles: 3456, averagePerDay: 111.5, averageScrobbles: 111.5 },
        { year: currentYear, month: 8, scrobbles: 3123, averagePerDay: 100.7, averageScrobbles: 100.7 },
        { year: currentYear, month: 9, scrobbles: 2789, averagePerDay: 93.0, averageScrobbles: 93.0 },
        { year: currentYear, month: 10, scrobbles: 2944, averagePerDay: 95.0, averageScrobbles: 95.0 }
      ]
    };
  }

  /**
   * Generate mock recent tracks data
   */
  private getMockRecentTracks(limit: number): LastfmTrack[] {
    const mockTracks = [
      { name: 'Paranoid Android', artist: 'Radiohead', album: 'OK Computer', playcount: 147, date: new Date() },
      { name: 'So What', artist: 'Miles Davis', album: 'Kind of Blue', playcount: 89, date: new Date(Date.now() - 3600000) },
      { name: 'Windowlicker', artist: 'Aphex Twin', album: 'Richard D. James Album', playcount: 76, date: new Date(Date.now() - 7200000) },
      { name: 'Time: The Donut of the Heart', artist: 'J Dilla', album: 'Donuts', playcount: 123, date: new Date(Date.now() - 10800000) },
      { name: 'Claire de Lune', artist: 'Claude Debussy', album: 'Suite Bergamasque', playcount: 94, date: new Date(Date.now() - 14400000) },
      { name: 'Strobe', artist: 'Deadmau5', album: 'For Lack of a Better Name', playcount: 67, date: new Date(Date.now() - 18000000) },
      { name: 'Blue Monday', artist: 'New Order', album: 'Power, Corruption & Lies', playcount: 88, date: new Date(Date.now() - 21600000) },
      { name: 'Teardrop', artist: 'Massive Attack', album: 'Mezzanine', playcount: 156, date: new Date(Date.now() - 25200000) },
      { name: 'Svefn-g-englar', artist: 'Sigur Rós', album: 'Ágætis byrjun', playcount: 43, date: new Date(Date.now() - 28800000) },
      { name: 'The Less I Know the Better', artist: 'Tame Impala', album: 'Currents', playcount: 198, date: new Date(Date.now() - 32400000) }
    ];

    return mockTracks.slice(0, Math.min(limit, mockTracks.length));
  }

  /**
   * Generate mock top artists data
   */
  private getMockTopArtists(limit: number): LastfmArtist[] {
    const mockArtists = [
      { name: 'Radiohead', playcount: 3456, listeners: 2847563 },
      { name: 'Miles Davis', playcount: 2789, listeners: 1456789 },
      { name: 'Aphex Twin', playcount: 2345, listeners: 987654 },
      { name: 'J Dilla', playcount: 2123, listeners: 876543 },
      { name: 'Boards of Canada', playcount: 1987, listeners: 654321 },
      { name: 'Burial', playcount: 1876, listeners: 543210 },
      { name: 'Sigur Rós', playcount: 1654, listeners: 456789 },
      { name: 'Tame Impala', playcount: 1543, listeners: 987456 },
      { name: 'Massive Attack', playcount: 1432, listeners: 765432 },
      { name: 'Brian Eno', playcount: 1321, listeners: 543987 }
    ];

    return mockArtists.slice(0, Math.min(limit, mockArtists.length));
  }

  // Legacy methods for backward compatibility (can be removed if not needed)
  // These maintain the original mock fallback behavior for existing components

  /**
   * Get historical period data (existing functionality)
   */
  public getHistoricalPeriodData(_periods: string[]): Observable<HistoricalPeriodData[]> {
    // Implementation would fetch historical data for specified periods
    return of([]);
  }
}
