import { createComponentFactory, Spectator } from '@ngneat/spectator';
import { MockProvider } from 'ng-mocks';
import { of, throwError } from 'rxjs';
import { MusicComponent } from './music.component';
import { LastfmService, LastfmTrack, LastfmArtist, LastfmAlbum, LastfmUser } from '../../services/lastfm.service';
import { CommonModule } from '@angular/common';

describe('MusicComponent', () => {
  let spectator: Spectator<MusicComponent>;
  let lastfmService: jest.Mocked<LastfmService>;

  const mockRecentTracks: LastfmTrack[] = [
    {
      name: 'Bohemian Rhapsody',
      artist: 'Queen',
      album: 'A Night at the Opera',
      image: 'https://example.com/bohemian.jpg',
      playcount: 127,
      date: new Date('2023-10-01T10:00:00Z')
    },
    {
      name: 'Stairway to Heaven',
      artist: 'Led Zeppelin',
      album: 'Led Zeppelin IV',
      image: 'https://example.com/stairway.jpg',
      playcount: 89,
      date: new Date('2023-10-01T09:00:00Z')
    }
  ];

  const mockTopArtists: LastfmArtist[] = [
    {
      name: 'The Beatles',
      playcount: 2847,
      image: 'https://example.com/beatles.jpg',
      listeners: 4500000
    },
    {
      name: 'Queen',
      playcount: 1923,
      image: 'https://example.com/queen.jpg',
      listeners: 3800000
    }
  ];

  const mockTopAlbums: LastfmAlbum[] = [
    {
      name: 'Abbey Road',
      artist: 'The Beatles',
      playcount: 456,
      image: 'https://example.com/abbey-road.jpg'
    },
    {
      name: 'The Dark Side of the Moon',
      artist: 'Pink Floyd',
      playcount: 389,
      image: 'https://example.com/dark-side.jpg'
    }
  ];

  const mockUserInfo: LastfmUser = {
    name: 'Treysin',
    playcount: 47892,
    artist_count: 2341,
    album_count: 8934,
    track_count: 15672,
    registered: new Date('2019-03-15'),
    url: 'https://last.fm/user/Treysin'
  };

  const createComponent = createComponentFactory({
    component: MusicComponent,
    imports: [CommonModule],
    providers: [
      MockProvider(LastfmService, {
        getRecentTracks: jest.fn().mockReturnValue(of(mockRecentTracks)),
        getTopArtists: jest.fn().mockReturnValue(of(mockTopArtists)),
        getTopAlbums: jest.fn().mockReturnValue(of(mockTopAlbums)),
        getUserInfo: jest.fn().mockReturnValue(of(mockUserInfo))
      })
    ]
  });

  beforeEach(() => {
    spectator = createComponent();
    lastfmService = spectator.inject(LastfmService) as jest.Mocked<LastfmService>;
  });

  describe('Component Initialization', () => {
    it('should create', () => {
      expect(spectator.component).toBeTruthy();
    });

    it('should initialize with loading states set to true', () => {
      expect(spectator.component.loadingTracks).toBe(true);
      expect(spectator.component.loadingArtists).toBe(true);
      expect(spectator.component.loadingAlbums).toBe(true);
      expect(spectator.component.loadingUserInfo).toBe(true);
    });

    it('should call LastFM service methods on initialization', () => {
      expect(lastfmService.getRecentTracks).toHaveBeenCalled();
      expect(lastfmService.getTopArtists).toHaveBeenCalled();
      expect(lastfmService.getTopAlbums).toHaveBeenCalled();
      expect(lastfmService.getUserInfo).toHaveBeenCalled();
    });

    it('should have observables assigned', () => {
      expect(spectator.component.recentTracks).toBeDefined();
      expect(spectator.component.topArtists).toBeDefined();
      expect(spectator.component.topAlbums).toBeDefined();
      expect(spectator.component.userInfo).toBeDefined();
    });
  });

  describe('Template Rendering', () => {
    it('should render the main title', () => {
      const title = spectator.query('h1');
      expect(title).toHaveText('🎵 Music from Treysin\'s Last.fm');
    });

    it('should render the profile banner', () => {
      const banner = spectator.query('.profile-banner');
      expect(banner).toExist();

      const link = spectator.query('.profile-banner a');
      expect(link).toHaveAttribute('href', 'https://www.last.fm/user/Treysin');
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener');
    });

    it('should render section headings', () => {
      const sections = spectator.queryAll('section h2');
      expect(sections).toHaveLength(4);
      expect(sections[0]).toHaveText('🎵 Recently Played');
      expect(sections[1]).toHaveText('🎤 Top Artists');
      expect(sections[2]).toHaveText('💿 Top Albums');
      expect(sections[3]).toHaveText('📊 Profile Stats');
    });

    it('should render data attribution', () => {
      const attribution = spectator.query('.data-attribution');
      expect(attribution).toExist();
      expect(attribution).toContainText('Music data powered by');
      expect(attribution).toContainText('User: Treysin');
    });
  });

  describe('Loading States', () => {
    it('should show loading indicators initially', () => {
      const loadingElements = spectator.queryAll('.loading');
      expect(loadingElements).toHaveLength(4);
      expect(loadingElements[0]).toHaveText('Loading recent tracks...');
      expect(loadingElements[1]).toHaveText('Loading top artists...');
      expect(loadingElements[2]).toHaveText('Loading top albums...');
      expect(loadingElements[3]).toHaveText('Loading profile...');
    });

    it('should hide loading indicators after ngOnInit with delays', (done) => {
      spectator.component.ngOnInit();

      // Check that tracks loading is set to false after 1 second
      setTimeout(() => {
        expect(spectator.component.loadingTracks).toBe(false);
      }, 1100);

      // Check that artists loading is set to false after 1.5 seconds
      setTimeout(() => {
        expect(spectator.component.loadingArtists).toBe(false);
      }, 1600);

      // Check that albums loading is set to false after 2 seconds
      setTimeout(() => {
        expect(spectator.component.loadingAlbums).toBe(false);
      }, 2100);

      // Check that user info loading is set to false after 2.5 seconds
      setTimeout(() => {
        expect(spectator.component.loadingUserInfo).toBe(false);
        done();
      }, 2600);
    });
  });

  describe('Recent Tracks Section', () => {
    beforeEach(() => {
      spectator.component.loadingTracks = false;
      spectator.detectChanges();
    });

    it('should render track cards when not loading', () => {
      const trackCards = spectator.queryAll('.track-card');
      expect(trackCards).toHaveLength(2);
    });

    it('should display track information correctly', () => {
      const firstTrack = spectator.query('.track-card:first-child');
      expect(firstTrack).toExist();

      const trackName = firstTrack?.querySelector('.track-name');
      const trackArtist = firstTrack?.querySelector('.track-artist');
      const trackAlbum = firstTrack?.querySelector('.track-album');
      const playCount = firstTrack?.querySelector('.play-count');

      expect(trackName).toHaveText('Bohemian Rhapsody');
      expect(trackArtist).toHaveText('Queen');
      expect(trackAlbum).toHaveText('A Night at the Opera');
      expect(playCount).toHaveText('127 plays');
    });

    it('should display track images with correct attributes', () => {
      const trackImages = spectator.queryAll('.track-image img');
      expect(trackImages).toHaveLength(2);

      const firstImage = trackImages[0];
      expect(firstImage).toHaveAttribute('src', 'https://example.com/bohemian.jpg');
      expect(firstImage).toHaveAttribute('alt', 'Bohemian Rhapsody by Queen');
      expect(firstImage).toHaveAttribute('loading', 'lazy');
    });

    it('should use placeholder image when track image is not available', () => {
      // Create a mock track without image
      const tracksWithoutImage = [{
        ...mockRecentTracks[0],
        image: undefined
      }];

      lastfmService.getRecentTracks.mockReturnValue(of(tracksWithoutImage));
      spectator.component.recentTracks = of(tracksWithoutImage);
      spectator.detectChanges();

      const trackImage = spectator.query('.track-image img');
      expect(trackImage).toHaveAttribute('src', 'https://via.placeholder.com/150x150?text=♪');
    });
  });

  describe('Top Artists Section', () => {
    beforeEach(() => {
      spectator.component.loadingArtists = false;
      spectator.detectChanges();
    });

    it('should render artist cards when not loading', () => {
      const artistCards = spectator.queryAll('.artist-card');
      expect(artistCards).toHaveLength(2);
    });

    it('should display artist information correctly', () => {
      const firstArtist = spectator.query('.artist-card:first-child');
      expect(firstArtist).toExist();

      const artistName = firstArtist?.querySelector('.artist-name');
      const playCount = firstArtist?.querySelector('.play-count');
      const listeners = firstArtist?.querySelector('.listeners');

      expect(artistName).toHaveText('The Beatles');
      expect(playCount).toHaveText('2847 plays');
      expect(listeners).toHaveText('4500000 listeners');
    });

    it('should display artist images with correct attributes', () => {
      const artistImages = spectator.queryAll('.artist-image img');
      expect(artistImages).toHaveLength(2);

      const firstImage = artistImages[0];
      expect(firstImage).toHaveAttribute('src', 'https://example.com/beatles.jpg');
      expect(firstImage).toHaveAttribute('alt', 'The Beatles');
      expect(firstImage).toHaveAttribute('loading', 'lazy');
    });
  });

  describe('Top Albums Section', () => {
    beforeEach(() => {
      spectator.component.loadingAlbums = false;
      spectator.detectChanges();
    });

    it('should render album cards when not loading', () => {
      const albumCards = spectator.queryAll('.album-card');
      expect(albumCards).toHaveLength(2);
    });

    it('should display album information correctly', () => {
      const firstAlbum = spectator.query('.album-card:first-child');
      expect(firstAlbum).toExist();

      const albumName = firstAlbum?.querySelector('.album-name');
      const albumArtist = firstAlbum?.querySelector('.album-artist');
      const playCount = firstAlbum?.querySelector('.play-count');

      expect(albumName).toHaveText('Abbey Road');
      expect(albumArtist).toHaveText('The Beatles');
      expect(playCount).toHaveText('456 plays');
    });

    it('should display album images with correct attributes', () => {
      const albumImages = spectator.queryAll('.album-image img');
      expect(albumImages).toHaveLength(2);

      const firstImage = albumImages[0];
      expect(firstImage).toHaveAttribute('src', 'https://example.com/abbey-road.jpg');
      expect(firstImage).toHaveAttribute('alt', 'Abbey Road by The Beatles');
      expect(firstImage).toHaveAttribute('loading', 'lazy');
    });
  });

  describe('User Info Section', () => {
    beforeEach(() => {
      spectator.component.loadingUserInfo = false;
      spectator.detectChanges();
    });

    it('should render user stats when not loading', () => {
      const statCards = spectator.queryAll('.stat-card');
      expect(statCards).toHaveLength(4);
    });

    it('should display user statistics correctly', () => {
      const statCards = spectator.queryAll('.stat-card');

      // Total Plays
      expect(statCards[0].querySelector('h3')).toHaveText('Total Plays');
      expect(statCards[0].querySelector('.stat-number')).toHaveText('47,892');

      // Artists
      expect(statCards[1].querySelector('h3')).toHaveText('Artists');
      expect(statCards[1].querySelector('.stat-number')).toHaveText('2,341');

      // Albums
      expect(statCards[2].querySelector('h3')).toHaveText('Albums');
      expect(statCards[2].querySelector('.stat-number')).toHaveText('8,934');

      // Member Since
      expect(statCards[3].querySelector('h3')).toHaveText('Member Since');
      expect(statCards[3].querySelector('.stat-date')).toExist();
    });
  });

  describe('Error Handling', () => {
    it('should handle service errors gracefully', () => {
      lastfmService.getRecentTracks.mockReturnValue(throwError('API Error'));
      lastfmService.getTopArtists.mockReturnValue(throwError('API Error'));
      lastfmService.getTopAlbums.mockReturnValue(throwError('API Error'));
      lastfmService.getUserInfo.mockReturnValue(throwError('API Error'));

      // Component should still initialize without throwing errors
      expect(() => {
        spectator = createComponent();
      }).not.toThrow();
    });

    it('should handle empty data arrays', () => {
      lastfmService.getRecentTracks.mockReturnValue(of([]));
      lastfmService.getTopArtists.mockReturnValue(of([]));
      lastfmService.getTopAlbums.mockReturnValue(of([]));

      spectator = createComponent();
      spectator.component.loadingTracks = false;
      spectator.component.loadingArtists = false;
      spectator.component.loadingAlbums = false;
      spectator.detectChanges();

      const trackCards = spectator.queryAll('.track-card');
      const artistCards = spectator.queryAll('.artist-card');
      const albumCards = spectator.queryAll('.album-card');

      expect(trackCards).toHaveLength(0);
      expect(artistCards).toHaveLength(0);
      expect(albumCards).toHaveLength(0);
    });
  });

  describe('Accessibility', () => {
    it('should have proper alt text for images', () => {
      spectator.component.loadingTracks = false;
      spectator.component.loadingArtists = false;
      spectator.component.loadingAlbums = false;
      spectator.detectChanges();

      const images = spectator.queryAll('img');
      images.forEach(img => {
        expect(img).toHaveAttribute('alt');
        expect(img.getAttribute('alt')).not.toBe('');
      });
    });

    it('should have proper external link attributes', () => {
      const externalLinks = spectator.queryAll('a[target="_blank"]');
      externalLinks.forEach(link => {
        expect(link).toHaveAttribute('rel', 'noopener');
      });
    });
  });

  describe('Performance', () => {
    it('should use lazy loading for images', () => {
      spectator.component.loadingTracks = false;
      spectator.component.loadingArtists = false;
      spectator.component.loadingAlbums = false;
      spectator.detectChanges();

      const images = spectator.queryAll('img');
      images.forEach(img => {
        expect(img).toHaveAttribute('loading', 'lazy');
      });
    });

    it('should not re-call service methods after initialization', () => {
      const initialCallCount = lastfmService.getRecentTracks.mock.calls.length;

      spectator.component.ngOnInit();
      spectator.detectChanges();

      expect(lastfmService.getRecentTracks.mock.calls.length).toBe(initialCallCount);
    });
  });
});
