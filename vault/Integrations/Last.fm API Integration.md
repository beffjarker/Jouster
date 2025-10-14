# Last.fm API Integration Guide

> **Music Integration Service:** Complete implementation guide for Last.fm web application authentication and API integration in the Jouster project.

---

## 📚 Source References

### Official Last.fm API Documentation
- **[Last.fm API Documentation](https://www.last.fm/api)** - Complete API reference
- **[Authentication Guide](https://www.last.fm/api/authentication)** - Web application authentication flow
- **[Authentication Specification](https://www.last.fm/api/authspec)** - Detailed auth implementation specs
- **[Method Documentation](https://www.last.fm/api/intro)** - Available API methods and parameters

### Implementation Standards
- **[Angular HTTP Client](https://angular.io/guide/http)** - Angular HTTP service best practices
- **[RxJS Observable Patterns](https://rxjs.dev/guide/observable)** - Reactive programming with observables
- **[JWT/Session Management](https://angular.io/guide/http#security-xsrf-protection)** - Client-side session handling

---

## 🔐 Authentication Implementation

### Web Application Flow
The Last.fm service implements the official web application authentication flow:

1. **Authorization Request**: Redirect user to Last.fm with API key and callback URL
2. **User Authorization**: User grants permission on Last.fm website
3. **Token Exchange**: Last.fm redirects back with authorization token
4. **Session Creation**: Exchange token for persistent session key
5. **Authenticated Requests**: Use session key for all API calls

### Key Components

#### Authentication Service Methods
```typescript
// Generate authorization URL for user redirect
getAuthorizationUrl(): string

// Handle callback and exchange token for session
handleAuthCallback(token: string): Observable<LastfmAuthResult>

// Session management
restoreSession(): void
validateSession(): Observable<boolean>
logout(): void

// Authentication state
isAuthenticated(): boolean
getCurrentUser(): string | null
authState$: Observable<LastfmAuthState>
```

#### API Configuration
- **API URL**: `http://www.last.fm/2.0/`
- **Auth URL**: `http://www.last.fm/api/auth/`
- **Callback URL**: `http://localhost:4200/lastfm/callback`
- **Required Credentials**: API Key and Shared Secret

---

## 🎵 Available API Methods

### User Data Methods
```typescript
// Get recent listening history
getRecentTracks(limit?: number): Observable<LastfmTrack[]>

// Get top artists by time period
getTopArtists(period?: string, limit?: number): Observable<LastfmArtist[]>

// Get top albums by time period
getTopAlbums(period?: string, limit?: number): Observable<LastfmAlbum[]>

// Get user profile information
getUserInfo(): Observable<LastfmUser>
```

### Scrobbling Methods (Write Operations)
```typescript
// Submit listening history
scrobbleTrack(trackData: LastfmScrobbleData): Observable<LastfmScrobbleResult>

// Update currently playing track
updateNowPlaying(trackData: Partial<LastfmScrobbleData>): Observable<{success: boolean}>
```

---

## 🏗️ Implementation Architecture

### Authentication State Management
```typescript
interface LastfmAuthState {
  isAuthenticated: boolean;
  username: string | null;
  sessionKey: string | null;
}
```

### Data Interfaces
```typescript
interface LastfmTrack {
  name: string;
  artist: string;
  album?: string;
  image?: string;
  url?: string;
  playcount?: number;
  date?: Date;
}

interface LastfmArtist {
  name: string;
  playcount: number;
  image?: string;
  url?: string;
  listeners?: number;
}

interface LastfmScrobbleData {
  artist: string;
  track: string;
  timestamp: number;
  album?: string;
  duration?: number;
}
```

---

## 🧪 Testing Implementation

### Test Coverage
The service includes comprehensive unit tests using @ngneat/spectator:

#### Authentication Flow Tests
- ✅ Authorization URL generation
- ✅ Token exchange for session key
- ✅ Session persistence in localStorage
- ✅ Logout and state clearing
- ✅ Session validation with API

#### API Method Tests
- ✅ Authenticated request handling
- ✅ API signature generation
- ✅ Error handling and network failures
- ✅ Authentication requirement validation
- ✅ Observable state management

#### Test Categories
1. **Service Initialization** - Configuration and initial state
2. **Authentication Flow** - Complete auth workflow testing
3. **Session Management** - Persistence and validation
4. **Authenticated API Calls** - User data retrieval
5. **Scrobbling Operations** - Write operations
6. **Error Handling** - Network and API errors
7. **Observable State** - Reactive state management

---

## 🔧 Usage Examples

### Basic Authentication Setup
```typescript
// In component constructor
constructor(private lastfmService: LastfmService) {}

// Subscribe to authentication state
ngOnInit() {
  this.lastfmService.authState$.subscribe(state => {
    if (state.isAuthenticated) {
      this.loadUserData();
    }
  });
}

// Initiate login
login() {
  const authUrl = this.lastfmService.getAuthorizationUrl();
  window.location.href = authUrl;
}

// Handle callback (in callback component)
ngOnInit() {
  const token = this.route.snapshot.queryParams['token'];
  if (token) {
    this.lastfmService.handleAuthCallback(token).subscribe({
      next: (result) => this.router.navigate(['/music']),
      error: (error) => console.error('Auth failed:', error)
    });
  }
}
```

### Fetching User Data
```typescript
// Get recent tracks
loadRecentTracks() {
  this.lastfmService.getRecentTracks(20).subscribe({
    next: (tracks) => this.recentTracks = tracks,
    error: (error) => this.handleError(error)
  });
}

// Get top artists for different periods
loadTopArtists() {
  forkJoin({
    week: this.lastfmService.getTopArtists('7day', 10),
    month: this.lastfmService.getTopArtists('1month', 10),
    year: this.lastfmService.getTopArtists('12month', 10)
  }).subscribe(results => {
    this.topArtists = results;
  });
}
```

### Scrobbling Integration
```typescript
// Scrobble a track
scrobbleCurrentTrack() {
  const trackData: LastfmScrobbleData = {
    artist: this.currentTrack.artist,
    track: this.currentTrack.name,
    timestamp: Math.floor(Date.now() / 1000),
    album: this.currentTrack.album,
    duration: this.currentTrack.duration
  };

  this.lastfmService.scrobbleTrack(trackData).subscribe({
    next: (result) => console.log('Scrobbled:', result),
    error: (error) => console.error('Scrobble failed:', error)
  });
}

// Update now playing
updateNowPlaying(track: any) {
  this.lastfmService.updateNowPlaying({
    artist: track.artist,
    track: track.name,
    album: track.album
  }).subscribe();
}
```

---

## 🔒 Security Considerations

### API Key Management
- Store API credentials in environment variables
- Never commit secrets to version control
- Use Angular environment configuration for different deployment targets

### Session Security
- Session keys stored in localStorage with validation
- Automatic session validation on service initialization
- Graceful handling of expired sessions

### API Signature Generation
- Proper parameter sorting and signature creation
- MD5 hash generation for authenticated requests
- Secure handling of shared secret

---

## 📊 Error Handling

### Authentication Errors
- Invalid token handling during callback
- Session expiration detection
- Network connectivity issues
- API rate limiting

### API Error Responses
```typescript
interface LastfmError {
  code: number;
  message: string;
}

// Common error codes:
// 2: Invalid service
// 6: Invalid parameters
// 9: Invalid session key
// 14: Invalid token
```

---

## 🚀 Integration with Existing Components

### Music Component Integration
The service integrates seamlessly with existing music components:

```typescript
// In music.component.ts
export class MusicComponent implements OnInit {
  public recentTracks$ = this.lastfmService.getRecentTracks();
  public topArtists$ = this.lastfmService.getTopArtists();
  public isAuthenticated$ = this.lastfmService.authState$.pipe(
    map(state => state.isAuthenticated)
  );
}
```

### Listening History Component
```typescript
// Enhanced with real Last.fm data
export class ListeningHistoryComponent {
  loadUserListeningData() {
    if (this.lastfmService.isAuthenticated()) {
      return this.lastfmService.getUserInfo().pipe(
        switchMap(user => this.analyzeListeningHistory(user))
      );
    }
    return this.fallbackToMockData();
  }
}
```

---

## 🔄 Migration from Previous Implementation

### Backward Compatibility
- Existing components continue to work with mock data fallbacks
- Gradual migration path for authentication-dependent features
- Maintained interface compatibility for existing method signatures

### Enhanced Features
- Real user authentication vs. hardcoded username
- Write operations (scrobbling) now available
- Live session management and validation
- Proper error handling and user feedback

---

## 📈 Future Enhancements

### Planned Features
1. **Batch Scrobbling** - Multiple track submission
2. **Artist/Album Details** - Extended metadata retrieval
3. **Friend Integration** - Social features and friend activity
4. **Recommendation Engine** - Similar artists and tracks
5. **Playlist Management** - User playlist operations

### Performance Optimizations
1. **Request Caching** - Cache API responses for better performance
2. **Offline Support** - Queue scrobbles when offline
3. **Progressive Loading** - Paginated data loading
4. **Image Optimization** - Lazy loading of artist/album images

---

## 🔗 Related Documentation

### Internal References
- [[SPECTATOR_TESTING_GUIDE]] - Testing implementation details
- [[Backend-API]] - Backend integration points
- [[Music Component Architecture]] - UI component integration

### External Resources
- **[Last.fm API Terms](https://www.last.fm/api/tos)** - Terms of service
- **[Rate Limiting](https://www.last.fm/api/tos#4)** - API usage limits
- **[Community Guidelines](https://www.last.fm/legal/terms)** - Usage guidelines

---

*This guide provides complete implementation details for Last.fm API integration following official documentation and Angular best practices.*
