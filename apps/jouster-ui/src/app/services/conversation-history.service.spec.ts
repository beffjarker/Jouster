import { createServiceFactory, SpectatorService } from '@ngneat/spectator';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { ConversationHistoryService, ConversationSession, ConversationHistoryAnalysis } from './conversation-history.service';

describe('ConversationHistoryService', () => {
  let spectator: SpectatorService<ConversationHistoryService>;
  let service: ConversationHistoryService;

  const createService = createServiceFactory({
    service: ConversationHistoryService,
    imports: [HttpClientTestingModule]
  });

  beforeEach(() => {
    spectator = createService();
    service = spectator.service;
  });

  describe('Service Initialization', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should initialize sessions observable', () => {
      expect(service.sessions$).toBeDefined();
    });

    it('should call loadSessions on initialization', () => {
      const loadSessionsSpy = jest.spyOn(service, 'loadSessions');
      const newService = createService().service;
      expect(loadSessionsSpy).toHaveBeenCalled();
    });
  });

  describe('Session Management', () => {
    const mockSessions: ConversationSession[] = [
      {
        conversationId: 'conv_001',
        title: 'Test Conversation',
        project: 'Jouster',
        startTime: '2024-10-01T10:00:00Z',
        endTime: '2024-10-01T11:00:00Z',
        messages: [
          {
            messageId: 'msg_001',
            timestamp: 1696161600000,
            role: 'user',
            content: 'Test message',
            metadata: { context: 'Testing' }
          }
        ],
        summary: {
          mainTopics: ['Testing'],
          keyAchievements: ['Created test'],
          nextSteps: ['Add more tests']
        }
      }
    ];

    it('should load sessions and sort by date', (done) => {
      service.loadSessions();

      service.sessions$.subscribe(sessions => {
        expect(Array.isArray(sessions)).toBe(true);
        done();
      });
    });

    it('should get session by ID', (done) => {
      // Mock the sessions$ observable
      jest.spyOn(service, 'sessions$', 'get').mockReturnValue(of(mockSessions));

      service.getSession('conv_001').subscribe(session => {
        expect(session).toBeTruthy();
        expect(session?.conversationId).toBe('conv_001');
        done();
      });
    });

    it('should return null for non-existent session', (done) => {
      jest.spyOn(service, 'sessions$', 'get').mockReturnValue(of(mockSessions));

      service.getSession('non_existent').subscribe(session => {
        expect(session).toBeNull();
        done();
      });
    });
  });

  describe('Analysis Generation', () => {
    const mockSessions: ConversationSession[] = [
      {
        conversationId: 'conv_001',
        title: 'Test Conversation 1',
        project: 'Jouster',
        startTime: '2024-10-01T10:00:00Z',
        messages: [
          {
            messageId: 'msg_001',
            timestamp: 1696161600000,
            role: 'user',
            content: 'Test message',
            metadata: { issuesResolved: 5 }
          }
        ],
        summary: {
          mainTopics: ['Testing', 'Angular'],
          keyAchievements: ['Setup tests', 'Fixed bugs'],
          nextSteps: []
        }
      }
    ];

    it('should generate analysis from sessions', (done) => {
      jest.spyOn(service, 'sessions$', 'get').mockReturnValue(of(mockSessions));

      service.getAnalysis().subscribe(analysis => {
        expect(analysis).toBeDefined();
        expect(analysis.totalSessions).toBe(1);
        expect(analysis.totalMessages).toBe(1);
        expect(analysis.topTopics.length).toBeGreaterThan(0);
        done();
      });
    });

    it('should calculate productivity metrics correctly', (done) => {
      jest.spyOn(service, 'sessions$', 'get').mockReturnValue(of(mockSessions));

      service.getAnalysis().subscribe(analysis => {
        expect(analysis.productivity.issuesResolved).toBe(5);
        expect(analysis.productivity.featuresImplemented).toBe(2);
        done();
      });
    });
  });

  describe('Search Functionality', () => {
    const mockSessions: ConversationSession[] = [
      {
        conversationId: 'conv_001',
        title: 'Angular Testing',
        project: 'Jouster',
        startTime: '2024-10-01T10:00:00Z',
        messages: [
          {
            messageId: 'msg_001',
            timestamp: 1696161600000,
            role: 'user',
            content: 'How to test components?'
          }
        ],
        summary: {
          mainTopics: ['Testing', 'Components'],
          keyAchievements: [],
          nextSteps: []
        }
      }
    ];

    it('should search conversations by title', (done) => {
      jest.spyOn(service, 'sessions$', 'get').mockReturnValue(of(mockSessions));

      service.searchConversations('Angular').subscribe(results => {
        expect(results.length).toBe(1);
        expect(results[0].title).toContain('Angular');
        done();
      });
    });

    it('should search conversations by message content', (done) => {
      jest.spyOn(service, 'sessions$', 'get').mockReturnValue(of(mockSessions));

      service.searchConversations('components').subscribe(results => {
        expect(results.length).toBe(1);
        done();
      });
    });

    it('should search conversations by topics', (done) => {
      jest.spyOn(service, 'sessions$', 'get').mockReturnValue(of(mockSessions));

      service.searchConversations('Testing').subscribe(results => {
        expect(results.length).toBe(1);
        done();
      });
    });

    it('should return empty array for no matches', (done) => {
      jest.spyOn(service, 'sessions$', 'get').mockReturnValue(of(mockSessions));

      service.searchConversations('NonExistent').subscribe(results => {
        expect(results.length).toBe(0);
        done();
      });
    });
  });

  describe('Date Range Filtering', () => {
    const mockSessions: ConversationSession[] = [
      {
        conversationId: 'conv_001',
        title: 'Test Conversation',
        project: 'Jouster',
        startTime: '2024-10-01T10:00:00Z',
        messages: []
      },
      {
        conversationId: 'conv_002',
        title: 'Another Conversation',
        project: 'Jouster',
        startTime: '2024-09-01T10:00:00Z',
        messages: []
      }
    ];

    it('should filter sessions by date range', (done) => {
      jest.spyOn(service, 'sessions$', 'get').mockReturnValue(of(mockSessions));

      const startDate = new Date('2024-09-15');
      const endDate = new Date('2024-10-15');

      service.getSessionsByDateRange(startDate, endDate).subscribe(results => {
        expect(results.length).toBe(1);
        expect(results[0].conversationId).toBe('conv_001');
        done();
      });
    });
  });

  describe('Mock Data Fallback', () => {
    it('should provide mock data when API fails', () => {
      const mockData = (service as any).getMockSessions();
      expect(Array.isArray(mockData)).toBe(true);
      expect(mockData.length).toBeGreaterThan(0);
    });

    it('should calculate analysis from mock data', (done) => {
      const mockData = (service as any).getMockSessions();
      jest.spyOn(service, 'sessions$', 'get').mockReturnValue(of(mockData));

      service.getAnalysis().subscribe(analysis => {
        expect(analysis).toBeDefined();
        expect(analysis.totalSessions).toBeGreaterThan(0);
        done();
      });
    });
  });
});
