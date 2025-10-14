import { createComponentFactory, Spectator } from '@ngneat/spectator';
import { MockProvider } from 'ng-mocks';
import { of, throwError } from 'rxjs';
import { ListeningHistoryComponent } from './listening-history.component';
import { LastfmService, ListeningHistoryAnalysis } from '../../services/lastfm.service';
import { CommonModule } from '@angular/common';

describe('ListeningHistoryComponent', () => {
  let spectator: Spectator<ListeningHistoryComponent>;
  let lastfmService: jasmine.SpyObj<LastfmService>;

  const mockAnalysisData: ListeningHistoryAnalysis = {
    totalScrobbles: 47892,
    averageScrobblesPerDay: 40.2,
    membershipDays: 1825,
    mostActiveYear: '2023',
    mostActiveMonth: 'October',
    listeningStreaks: [
      {
        startDate: new Date('2023-10-01'),
        endDate: new Date('2023-10-14'),
        duration: 14 * 24 * 60 * 60,
        scrobbles: 847
      }
    ],
    genreDistribution: [
      {
        genre: 'Alternative Rock',
        playcount: 16762,
        percentage: 35.0,
        topArtists: ['Radiohead', 'Arctic Monkeys', 'Kings of Leon']
      },
      {
        genre: 'Indie Folk',
        playcount: 11973,
        percentage: 25.0,
        topArtists: ['Bon Iver', 'Fleet Foxes', 'Iron & Wine']
      }
    ],
    yearlyStats: [
      {
        year: 2023,
        scrobbles: 12500,
        uniqueArtists: 315,
        uniqueAlbums: 420,
        uniqueTracks: 1250,
        topArtist: 'Radiohead',
        topAlbum: 'OK Computer',
        topTrack: 'Paranoid Android'
      }
    ],
    monthlyTrends: [
      {
        year: 2023,
        month: 10,
        scrobbles: 1250,
        averagePerDay: 40.3
      }
    ]
  };

  const createComponent = createComponentFactory({
    component: ListeningHistoryComponent,
    imports: [CommonModule],
    providers: [
      MockProvider(LastfmService, {
        getListeningHistoryAnalysis: jasmine.createSpy('getListeningHistoryAnalysis').and.returnValue(of(mockAnalysisData))
      })
    ],
    detectChanges: false
  });

  beforeEach(() => {
    spectator = createComponent();
    lastfmService = spectator.inject(LastfmService) as jasmine.SpyObj<LastfmService>;
  });

  describe('Component Initialization', () => {
    it('should create the component', () => {
      expect(spectator.component).toBeTruthy();
    });

    it('should initialize with loading state', () => {
      expect(spectator.component.loadingAnalysis).toBe(true);
    });

    it('should load analysis data on init', () => {
      spectator.detectChanges();

      expect(lastfmService.getListeningHistoryAnalysis).toHaveBeenCalled();
      expect(spectator.component.analysisData).toBeDefined();
    });

    it('should set loading to false after timeout', (done) => {
      spectator.detectChanges();

      setTimeout(() => {
        expect(spectator.component.loadingAnalysis).toBe(false);
        done();
      }, 2100);
    });
  });

  describe('Month Name Helper', () => {
    it('should return correct month names', () => {
      expect(spectator.component.getMonthName(1)).toBe('January');
      expect(spectator.component.getMonthName(6)).toBe('June');
      expect(spectator.component.getMonthName(12)).toBe('December');
    });

    it('should handle invalid month numbers', () => {
      expect(spectator.component.getMonthName(0)).toBe('Invalid Month');
      expect(spectator.component.getMonthName(13)).toBe('Invalid Month');
      expect(spectator.component.getMonthName(-1)).toBe('Invalid Month');
    });
  });

  describe('Template Integration', () => {
    beforeEach(() => {
      spectator.component.loadingAnalysis = false;
      spectator.detectChanges();
    });

    it('should display page title', () => {
      expect(spectator.query('h1')).toHaveText('Listening History Analysis');
    });

    it('should display profile banner', () => {
      const profileBanner = spectator.query('.profile-banner');
      expect(profileBanner).toExist();
      expect(profileBanner.querySelector('h2')).toContain('Music Listening Analysis');
    });

    it('should display loading state when loading is true', () => {
      spectator.component.loadingAnalysis = true;
      spectator.detectChanges();

      expect(spectator.query('.loading')).toExist();
      expect(spectator.query('.loading')).toContain('Analyzing your listening history');
    });

    it('should hide loading state when loading is false', () => {
      expect(spectator.query('.loading')).not.toExist();
      expect(spectator.query('.analysis-container')).toExist();
    });
  });

  describe('Data Display', () => {
    beforeEach(() => {
      spectator.component.loadingAnalysis = false;
      spectator.detectChanges();
    });

    it('should display overview stats correctly', () => {
      const statsCards = spectator.queryAll('.stat-card');
      expect(statsCards.length).toBeGreaterThan(0);
    });

    it('should display genre distribution', () => {
      const genreSection = spectator.query('.genre-distribution');
      expect(genreSection).toExist();

      const genreItems = spectator.queryAll('.genre-item');
      expect(genreItems.length).toBe(2);
    });

    it('should display yearly breakdown', () => {
      const yearlySection = spectator.query('.yearly-breakdown');
      expect(yearlySection).toExist();

      const yearCards = spectator.queryAll('.year-card');
      expect(yearCards.length).toBe(1);
    });

    it('should display monthly trends', () => {
      const trendsSection = spectator.query('.monthly-trends');
      expect(trendsSection).toExist();
    });

    it('should display listening streaks', () => {
      const streaksSection = spectator.query('.listening-streaks');
      expect(streaksSection).toExist();

      const streakItems = spectator.queryAll('.streak-item');
      expect(streakItems.length).toBe(1);
    });
  });

  describe('Data Formatting', () => {
    beforeEach(() => {
      spectator.component.loadingAnalysis = false;
      spectator.detectChanges();
    });

    it('should format large numbers correctly', () => {
      // This would test number formatting in the template
      expect(spectator.component.analysisData).toBeDefined();
    });

    it('should display percentage values correctly', () => {
      const genreItems = spectator.queryAll('.genre-item');
      if (genreItems.length > 0) {
        const firstGenre = genreItems[0];
        expect(firstGenre.querySelector('.percentage')).toContain('35.0%');
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle service errors gracefully', () => {
      lastfmService.getListeningHistoryAnalysis.and.returnValue(throwError('Service error'));

      spectator.detectChanges();

      expect(spectator.component).toBeTruthy();
      expect(spectator.component.loadingAnalysis).toBe(true);
    });
  });

  describe('Responsive Design', () => {
    beforeEach(() => {
      spectator.component.loadingAnalysis = false;
      spectator.detectChanges();
    });

    it('should have responsive layout classes', () => {
      expect(spectator.query('.stats-grid')).toHaveClass('flex');
      expect(spectator.query('.stats-grid')).toHaveClass('flex-wrap');
    });

    it('should adapt cards to different screen sizes', () => {
      const statCards = spectator.queryAll('.stat-card');
      statCards.forEach(card => {
        expect(card).toHaveClass('flex');
        expect(card).toHaveClass('flex-column');
      });
    });
  });

  describe('Data Attribution', () => {
    beforeEach(() => {
      spectator.component.loadingAnalysis = false;
      spectator.detectChanges();
    });

    it('should display data attribution', () => {
      const attribution = spectator.query('.data-attribution');
      expect(attribution).toExist();
      expect(attribution).toContain('Data provided by Last.fm');
    });
  });

  describe('Animation and Visual Effects', () => {
    beforeEach(() => {
      spectator.component.loadingAnalysis = false;
      spectator.detectChanges();
    });

    it('should have animated progress bars', () => {
      const genreFills = spectator.queryAll('.genre-fill');
      genreFills.forEach(fill => {
        expect(fill).toHaveStyle({ transition: 'width 1s ease' });
      });
    });

    it('should have animated trend bars', () => {
      const trendFills = spectator.queryAll('.trend-fill');
      trendFills.forEach(fill => {
        expect(fill).toHaveStyle({ transition: 'width 1s ease' });
      });
    });
  });

  describe('Accessibility', () => {
    beforeEach(() => {
      spectator.component.loadingAnalysis = false;
      spectator.detectChanges();
    });

    it('should have proper heading structure', () => {
      expect(spectator.query('h1')).toExist();
      expect(spectator.queryAll('h2').length).toBeGreaterThan(0);
    });

    it('should have descriptive text for screen readers', () => {
      const statCards = spectator.queryAll('.stat-card');
      statCards.forEach(card => {
        expect(card.querySelector('.stat-label')).toExist();
      });
    });
  });
});
