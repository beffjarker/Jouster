import { createServiceFactory, SpectatorService } from '@ngneat/spectator';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { LastfmService, LastfmTrack, LastfmArtist, LastfmAlbum, LastfmUser, LastfmAuthState } from './lastfm.service';

describe('LastfmService', () => {
  let spectator: SpectatorService<LastfmService>;
  let httpController: HttpTestingController;
  let service: LastfmService;

  const createService = createServiceFactory({
    service: LastfmService,
    imports: [HttpClientTestingModule]
  });

  beforeEach(() => {
    spectator = createService();
    service = spectator.service;
    httpController = spectator.inject(HttpTestingController);

    // Clear any existing session data
    localStorage.clear();
  });

  afterEach(() => {
    httpController.verify();
    localStorage.clear();
  });

  describe('Service Initialization', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should have correct Last.fm API configuration', () => {
      expect((service as any).apiKey).toBeDefined();
      expect((service as any).callbackUrl).toBeDefined();
    });

    it('should initialize with no authenticated user', () => {
      expect(service.isAuthenticated()).toBe(false);
      expect(service.getCurrentUser()).toBeNull();
    });
  });

  // INTENTIONALLY FAILING TESTS - Authentication Flow
  describe('Authentication Flow (Web Application)', () => {
    describe('getAuthorizationUrl', () => {
      it('should generate correct Last.fm authorization URL', () => {
        const authUrl = service.getAuthorizationUrl();

        expect(authUrl).toContain('http://www.last.fm/api/auth/');
        expect(authUrl).toContain('api_key=');
        expect(authUrl).toContain('cb=');
      });

      it('should include callback URL in authorization URL', () => {
        const authUrl = service.getAuthorizationUrl();
        const expectedCallback = encodeURIComponent('http://localhost:4200/lastfm/callback');

        expect(authUrl).toContain(`cb=${expectedCallback}`);
      });
    });

    describe('handleAuthCallback', () => {
      it('should exchange token for session key successfully', (done) => {
        const mockToken = 'test-auth-token-123';
        const mockSessionKey = 'test-session-key-456';
        const mockUsername = 'testuser';

        service.handleAuthCallback(mockToken).subscribe(result => {
          expect(result.success).toBe(true);
          expect(result.sessionKey).toBe(mockSessionKey);
          expect(result.username).toBe(mockUsername);
          done();
        });

        const req = httpController.expectOne('http://www.last.fm/2.0/');
        expect(req.request.method).toBe('POST');
        expect(req.request.body).toContain('method=auth.getSession');
        expect(req.request.body).toContain(`token=${mockToken}`);

        req.flush({
          session: {
            name: mockUsername,
            key: mockSessionKey,
            subscriber: '0'
          }
        });
      });

      it('should handle authentication callback errors', (done) => {
        const invalidToken = 'invalid-token';

        service.handleAuthCallback(invalidToken).subscribe({
          next: () => fail('Should have thrown an error'),
          error: (error) => {
            expect(error.message).toContain('authentication failed');
            done();
          }
        });

        const req = httpController.expectOne('http://www.last.fm/2.0/');
        req.flush({ error: { code: 14, message: 'Invalid token' } }, { status: 400, statusText: 'Bad Request' });
      });

      it('should store session data in localStorage after successful auth', (done) => {
        const mockToken = 'test-token';
        const mockSessionKey = 'test-session';
        const mockUsername = 'testuser';

        service.handleAuthCallback(mockToken).subscribe(() => {
          expect(localStorage.getItem('lastfm_session_key')).toBe(mockSessionKey);
          expect(localStorage.getItem('lastfm_username')).toBe(mockUsername);
          expect(service.isAuthenticated()).toBe(true);
          done();
        });

        const req = httpController.expectOne('http://www.last.fm/2.0/');
        req.flush({
          session: {
            name: mockUsername,
            key: mockSessionKey,
            subscriber: '0'
          }
        });
      });
    });

    describe('logout', () => {
      it('should clear authentication state and localStorage', () => {
        // Setup authenticated state
        localStorage.setItem('lastfm_session_key', 'test-session');
        localStorage.setItem('lastfm_username', 'testuser');

        service.logout();

        expect(localStorage.getItem('lastfm_session_key')).toBeNull();
        expect(localStorage.getItem('lastfm_username')).toBeNull();
        expect(service.isAuthenticated()).toBe(false);
        expect(service.getCurrentUser()).toBeNull();
      });

      it('should emit authentication state change', (done) => {
        localStorage.setItem('lastfm_session_key', 'test-session');

        service.authState$.subscribe(state => {
          if (!state.isAuthenticated) {
            expect(state.isAuthenticated).toBe(false);
            expect(state.username).toBeNull();
            done();
          }
        });

        service.logout();
      });
    });
  });

  // INTENTIONALLY FAILING TESTS - Session Management
  describe('Session Management', () => {
    describe('restoreSession', () => {
      it('should restore authentication from localStorage', () => {
        localStorage.setItem('lastfm_session_key', 'stored-session');
        localStorage.setItem('lastfm_username', 'storeduser');

        service.restoreSession();

        expect(service.isAuthenticated()).toBe(true);
        expect(service.getCurrentUser()).toBe('storeduser');
      });

      it('should not authenticate with missing session data', () => {
        localStorage.removeItem('lastfm_session_key');
        localStorage.removeItem('lastfm_username');

        service.restoreSession();

        expect(service.isAuthenticated()).toBe(false);
        expect(service.getCurrentUser()).toBeNull();
      });
    });

    describe('validateSession', () => {
      it('should validate active session with Last.fm API', (done) => {
        localStorage.setItem('lastfm_session_key', 'valid-session');
        localStorage.setItem('lastfm_username', 'validuser');

        service.validateSession().subscribe(isValid => {
          expect(isValid).toBe(true);
          done();
        });

        const req = httpController.expectOne('http://www.last.fm/2.0/');
        expect(req.request.method).toBe('POST');
        expect(req.request.body).toContain('method=user.getInfo');

        req.flush({
          user: {
            name: 'validuser',
            playcount: '12345'
          }
        });
      });

      it('should handle invalid session gracefully', (done) => {
        localStorage.setItem('lastfm_session_key', 'invalid-session');

        service.validateSession().subscribe(isValid => {
          expect(isValid).toBe(false);
          expect(service.isAuthenticated()).toBe(false);
          done();
        });

        const req = httpController.expectOne('http://www.last.fm/2.0/');
        req.flush({ error: { code: 9, message: 'Invalid session key' } }, { status: 403, statusText: 'Forbidden' });
      });
    });
  });

  // INTENTIONALLY FAILING TESTS - Authenticated API Calls
  describe('Authenticated API Methods', () => {
    beforeEach(() => {
      // Setup authenticated state for these tests
      localStorage.setItem('lastfm_session_key', 'test-session-key');
      localStorage.setItem('lastfm_username', 'testuser');
      service.restoreSession();
    });

    describe('getRecentTracks', () => {
      it('should fetch recent tracks for authenticated user', (done) => {
        const mockTracks: LastfmTrack[] = [
          {
            name: 'Bohemian Rhapsody',
            artist: 'Queen',
            album: 'A Night at the Opera',
            image: 'https://example.com/image.jpg',
            playcount: 127,
            date: new Date('2023-10-01T10:00:00Z')
          }
        ];

        service.getRecentTracks(10).subscribe(tracks => {
          expect(tracks).toEqual(mockTracks);
          expect(tracks.length).toBe(1);
          done();
        });

        const req = httpController.expectOne('http://www.last.fm/2.0/');
        expect(req.request.method).toBe('POST');
        expect(req.request.body).toContain('method=user.getRecentTracks');
        expect(req.request.body).toContain('user=testuser');
        expect(req.request.body).toContain('sk=test-session-key');

        req.flush({
          recenttracks: {
            track: mockTracks
          }
        });
      });

      it('should require authentication', (done) => {
        service.logout();

        service.getRecentTracks().subscribe({
          next: () => fail('Should require authentication'),
          error: (error) => {
            expect(error.message).toContain('authentication required');
            done();
          }
        });
      });

      it('should include proper API signature for authenticated request', (done) => {
        service.getRecentTracks(5).subscribe(() => done());

        const req = httpController.expectOne('http://www.last.fm/2.0/');
        expect(req.request.body).toContain('api_sig=');

        req.flush({ recenttracks: { track: [] } });
      });
    });

    describe('scrobbleTrack', () => {
      it('should scrobble track with proper authentication', (done) => {
        const trackData = {
          artist: 'Test Artist',
          track: 'Test Track',
          timestamp: Math.floor(Date.now() / 1000),
          album: 'Test Album'
        };

        service.scrobbleTrack(trackData).subscribe(result => {
          expect(result.success).toBe(true);
          done();
        });

        const req = httpController.expectOne('http://www.last.fm/2.0/');
        expect(req.request.method).toBe('POST');
        expect(req.request.body).toContain('method=track.scrobble');
        expect(req.request.body).toContain(`artist=${encodeURIComponent(trackData.artist)}`);
        expect(req.request.body).toContain('sk=test-session-key');

        req.flush({
          scrobbles: {
            '@attr': { accepted: 1, ignored: 0 }
          }
        });
      });

      it('should require authentication for scrobbling', (done) => {
        service.logout();

        const trackData = {
          artist: 'Test Artist',
          track: 'Test Track',
          timestamp: Math.floor(Date.now() / 1000)
        };

        service.scrobbleTrack(trackData).subscribe({
          next: () => fail('Should require authentication'),
          error: (error) => {
            expect(error.message).toContain('authentication required');
            done();
          }
        });
      });
    });

    describe('updateNowPlaying', () => {
      it('should update now playing status', (done) => {
        const trackData = {
          artist: 'Current Artist',
          track: 'Current Track',
          album: 'Current Album'
        };

        service.updateNowPlaying(trackData).subscribe(result => {
          expect(result.success).toBe(true);
          done();
        });

        const req = httpController.expectOne('http://www.last.fm/2.0/');
        expect(req.request.method).toBe('POST');
        expect(req.request.body).toContain('method=track.updateNowPlaying');
        expect(req.request.body).toContain('sk=test-session-key');

        req.flush({
          nowplaying: {
            track: trackData.track,
            artist: trackData.artist
          }
        });
      });
    });
  });

  // INTENTIONALLY FAILING TESTS - API Signature Generation
  describe('API Signature Generation', () => {
    it('should generate correct API signature for authenticated requests', () => {
      const params = {
        method: 'user.getRecentTracks',
        user: 'testuser',
        api_key: 'test-api-key',
        sk: 'test-session-key'
      };

      const signature = (service as any).generateApiSignature(params);

      expect(signature).toBeDefined();
      expect(typeof signature).toBe('string');
      expect(signature.length).toBe(32); // MD5 hash length
    });

    it('should include shared secret in signature calculation', () => {
      const params = { method: 'test.method', api_key: 'test-key' };

      const signature = (service as any).generateApiSignature(params);

      // Should use shared secret in calculation
      expect(signature).toBeDefined();
    });
  });

  // INTENTIONALLY FAILING TESTS - Error Handling
  describe('Error Handling', () => {
    it('should handle Last.fm API errors gracefully', (done) => {
      localStorage.setItem('lastfm_session_key', 'test-session');
      localStorage.setItem('lastfm_username', 'testuser');

      service.getRecentTracks().subscribe({
        next: () => fail('Should handle API error'),
        error: (error) => {
          expect(error.code).toBe(6);
          expect(error.message).toContain('Invalid parameters');
          done();
        }
      });

      const req = httpController.expectOne('http://www.last.fm/2.0/');
      req.flush({
        error: {
          code: 6,
          message: 'Invalid parameters - Missing required parameter'
        }
      });
    });

    it('should handle network errors', (done) => {
      service.getRecentTracks().subscribe({
        next: () => fail('Should handle network error'),
        error: (error) => {
          expect(error.message).toContain('network error');
          done();
        }
      });

      const req = httpController.expectOne('http://www.last.fm/2.0/');
      req.error(new ErrorEvent('Network error'));
    });
  });

  // INTENTIONALLY FAILING TESTS - Observable State Management
  describe('Observable State Management', () => {
    it('should provide authentication state as observable', (done) => {
      service.authState$.subscribe(state => {
        expect(state).toBeDefined();
        expect(state.isAuthenticated).toBe(false);
        expect(state.username).toBeNull();
        expect(state.sessionKey).toBeNull();
        done();
      });
    });

    it('should emit state changes when authentication status changes', () => {
      const states: LastfmAuthState[] = [];

      service.authState$.subscribe(state => states.push(state));

      // Simulate login
      localStorage.setItem('lastfm_session_key', 'test-session');
      localStorage.setItem('lastfm_username', 'testuser');
      service.restoreSession();

      // Simulate logout
      service.logout();

      expect(states.length).toBeGreaterThan(1);
      expect(states[states.length - 1].isAuthenticated).toBe(false);
    });
  });
});
