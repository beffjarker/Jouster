import { createComponentFactory, Spectator } from '@ngneat/spectator';
import { MockProvider } from 'ng-mocks';
import { of, throwError } from 'rxjs';
import { ConversationHistoryComponent } from './conversation-history.component';
import { ConversationHistoryService, ConversationSession, ConversationHistoryAnalysis } from '../../services/conversation-history.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

describe('ConversationHistoryComponent', () => {
  let spectator: Spectator<ConversationHistoryComponent>;
  let conversationHistoryService: jest.Mocked<ConversationHistoryService>;

  const mockSessions: ConversationSession[] = [
    {
      conversationId: 'conv_001',
      title: 'Test Conversation 1',
      project: 'Jouster',
      startTime: '2024-10-01T10:00:00Z',
      endTime: '2024-10-01T11:00:00Z',
      messages: [
        {
          messageId: 'msg_001',
          timestamp: 1696161600000,
          role: 'user',
          content: 'Hello, can you help me with testing?',
          metadata: { context: 'Testing help request' }
        },
        {
          messageId: 'msg_002',
          timestamp: 1696161660000,
          role: 'assistant',
          content: 'Of course! I\'d be happy to help you with testing.',
          metadata: { context: 'Testing assistance' }
        }
      ],
      summary: {
        mainTopics: ['Testing', 'Angular', 'Spectator'],
        keyAchievements: ['Set up testing framework', 'Created first test'],
        nextSteps: ['Add more test coverage', 'Implement E2E tests']
      }
    }
  ];

  const mockAnalysis: ConversationHistoryAnalysis = {
    totalSessions: 5,
    totalMessages: 45,
    averageSessionLength: 9.0,
    topTopics: [
      { topic: 'Testing', count: 12 },
      { topic: 'Angular', count: 8 },
      { topic: 'CSS', count: 6 }
    ],
    recentActivity: [
      { date: '2024-10-01', sessions: 2, messages: 18 },
      { date: '2024-10-02', sessions: 1, messages: 12 }
    ],
    productivity: {
      issuesResolved: 15,
      featuresImplemented: 8,
      componentsCreated: 12
    }
  };

  const createComponent = createComponentFactory({
    component: ConversationHistoryComponent,
    imports: [CommonModule, FormsModule, RouterModule.forRoot([])],
    providers: [
      MockProvider(ConversationHistoryService, {
        sessions$: of(mockSessions),
        getAnalysis: jest.fn().mockReturnValue(of(mockAnalysis)),
        searchConversations: jest.fn().mockReturnValue(of(mockSessions)),
        loadSessions: jest.fn()
      })
    ],
    detectChanges: false
  });

  beforeEach(() => {
    spectator = createComponent();
    conversationHistoryService = spectator.inject(ConversationHistoryService) as jest.Mocked<ConversationHistoryService>;
  });

  describe('Component Initialization', () => {
    it('should create the component', () => {
      expect(spectator.component).toBeTruthy();
    });

    it('should initialize with correct default values', () => {
      expect(spectator.component.selectedSession).toBeNull();
      expect(spectator.component.searchTerm).toBe('');
      expect(spectator.component.loading).toBe(true);
      expect(spectator.component.viewMode).toBe('list');
    });

    it('should set loading to false after timeout', (done) => {
      spectator.detectChanges();

      setTimeout(() => {
        expect(spectator.component.loading).toBe(false);
        done();
      }, 1100);
    });
  });

  describe('Session Management', () => {
    beforeEach(() => {
      spectator.detectChanges();
    });

    it('should select a session and switch to details view', () => {
      spectator.component.selectSession(mockSessions[0]);

      expect(spectator.component.selectedSession).toBe(mockSessions[0]);
      expect(spectator.component.viewMode).toBe('details');
    });

    it('should close session details and return to list view', () => {
      spectator.component.selectedSession = mockSessions[0];
      spectator.component.viewMode = 'details';

      spectator.component.closeSessionDetails();

      expect(spectator.component.selectedSession).toBeNull();
      expect(spectator.component.viewMode).toBe('list');
    });

    it('should set view mode correctly', () => {
      spectator.component.setViewMode('analytics');
      expect(spectator.component.viewMode).toBe('analytics');
      expect(spectator.component.selectedSession).toBeNull();

      spectator.component.selectedSession = mockSessions[0];
      spectator.component.setViewMode('list');
      expect(spectator.component.selectedSession).toBeNull();
    });
  });

  describe('Search Functionality', () => {
    beforeEach(() => {
      spectator.detectChanges();
    });

    it('should update search term on search change', () => {
      const searchTerm = 'testing';

      spectator.component.onSearchChange(searchTerm);

      expect(spectator.component.searchTerm).toBe(searchTerm);
    });

    it('should handle empty search term', () => {
      spectator.component.onSearchChange('');

      expect(spectator.component.searchTerm).toBe('');
    });
  });

  describe('Helper Methods', () => {
    it('should format date correctly', () => {
      const dateString = '2024-10-01T10:30:00Z';
      const formatted = spectator.component.formatDate(dateString);

      expect(formatted).toMatch(/Oct \d{1,2}, 2024/);
      expect(formatted).toContain('10:30 AM');
    });

    it('should format duration correctly', () => {
      const startTime = '2024-10-01T10:00:00Z';
      const endTime = '2024-10-01T11:30:00Z';

      const duration = spectator.component.formatDuration(startTime, endTime);

      expect(duration).toBe('1h 30m');
    });

    it('should handle in progress sessions', () => {
      const startTime = '2024-10-01T10:00:00Z';

      const duration = spectator.component.formatDuration(startTime);

      expect(duration).toBe('In progress');
    });

    it('should get message preview correctly', () => {
      const preview = spectator.component.getMessagePreview(mockSessions[0]);

      expect(preview).toBe('Hello, can you help me with testing?');
    });

    it('should truncate long message previews', () => {
      const longSession = {
        ...mockSessions[0],
        messages: [{
          ...mockSessions[0].messages[0],
          content: 'A'.repeat(150)
        }]
      };

      const preview = spectator.component.getMessagePreview(longSession);

      expect(preview).toHaveLength(103); // 100 chars + '...'
      expect(preview).toEndWith('...');
    });

    it('should get correct session icon based on topics', () => {
      const flashSession = {
        ...mockSessions[0],
        summary: { ...mockSessions[0].summary!, mainTopics: ['Flash', 'Animation'] }
      };

      expect(spectator.component.getSessionIcon(flashSession)).toBe('⚡');

      const lintingSession = {
        ...mockSessions[0],
        summary: { ...mockSessions[0].summary!, mainTopics: ['Linting', 'ESLint'] }
      };

      expect(spectator.component.getSessionIcon(lintingSession)).toBe('🔧');
    });

    it('should get correct topic badge class', () => {
      expect(spectator.component.getTopicBadgeClass('Flash Animation')).toBe('badge-flash');
      expect(spectator.component.getTopicBadgeClass('ESLint Config')).toBe('badge-linting');
      expect(spectator.component.getTopicBadgeClass('WSL Setup')).toBe('badge-system');
      expect(spectator.component.getTopicBadgeClass('Python Script')).toBe('badge-python');
      expect(spectator.component.getTopicBadgeClass('Docker Container')).toBe('badge-docker');
      expect(spectator.component.getTopicBadgeClass('UI Component')).toBe('badge-ui');
      expect(spectator.component.getTopicBadgeClass('Other Topic')).toBe('badge-default');
    });
  });

  describe('Template Integration', () => {
    beforeEach(() => {
      spectator.component.loading = false;
      spectator.detectChanges();
    });

    it('should display page header correctly', () => {
      expect(spectator.query('.page-header h1')).toHaveText('💬 Conversation History');
      expect(spectator.query('.subtitle')).toHaveText('Review and explore AI assistant conversations');
    });

    it('should show view toggle buttons', () => {
      const toggleButtons = spectator.queryAll('.toggle-btn');

      expect(toggleButtons).toHaveLength(2);
      expect(toggleButtons[0]).toHaveText('📋 Sessions');
      expect(toggleButtons[1]).toHaveText('📊 Analytics');
    });

    it('should display search bar in list view', () => {
      spectator.component.viewMode = 'list';
      spectator.detectChanges();

      expect(spectator.query('.search-input')).toExist();
      expect(spectator.query('.search-input')).toHaveAttribute('placeholder', 'Search conversations...');
    });

    it('should toggle active state on view buttons', () => {
      spectator.component.viewMode = 'analytics';
      spectator.detectChanges();

      const sessionBtn = spectator.query('[data-testid="sessions-btn"]') || spectator.queryAll('.toggle-btn')[0];
      const analyticsBtn = spectator.query('[data-testid="analytics-btn"]') || spectator.queryAll('.toggle-btn')[1];

      expect(sessionBtn).not.toHaveClass('active');
      expect(analyticsBtn).toHaveClass('active');
    });
  });

  describe('Loading State', () => {
    it('should show loading spinner when loading is true', () => {
      spectator.component.loading = true;
      spectator.detectChanges();

      expect(spectator.query('.loading-container')).toExist();
      expect(spectator.query('.loading-spinner')).toExist();
      expect(spectator.query('.loading-container p')).toHaveText('Loading conversation history...');
    });

    it('should hide loading spinner when loading is false', () => {
      spectator.component.loading = false;
      spectator.detectChanges();

      expect(spectator.query('.loading-container')).not.toExist();
      expect(spectator.query('.main-content')).toExist();
    });
  });

  describe('Error Handling', () => {
    it('should handle service errors gracefully', () => {
      conversationHistoryService.getAnalysis.mockReturnValue(throwError('Service error'));

      spectator.detectChanges();

      // Component should still be functional even if service fails
      expect(spectator.component).toBeTruthy();
      expect(spectator.component.loading).toBe(true);
    });
  });

  describe('TrackBy Functions', () => {
    it('should return correct trackBy values', () => {
      const session = mockSessions[0];
      const message = session.messages[0];

      expect(spectator.component.trackBySessionId(0, session)).toBe(session.conversationId);
      expect(spectator.component.trackByMessageId(0, message)).toBe(message.messageId);
    });
  });
});
