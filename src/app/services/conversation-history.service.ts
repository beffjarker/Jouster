import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

export interface ConversationMessage {
  messageId: string;
  timestamp: number;
  role: 'user' | 'assistant';
  content: string;
  metadata?: {
    context?: string;
    components?: string[];
    issuesResolved?: number;
    finalStatus?: string;
    [key: string]: any;
  };
}

export interface ConversationSummary {
  mainTopics: string[];
  keyAchievements: string[];
  nextSteps: string[];
}

export interface ConversationSession {
  conversationId: string;
  title: string;
  project: string;
  startTime: string;
  endTime?: string;
  messages: ConversationMessage[];
  summary?: ConversationSummary;
}

export interface ConversationHistoryAnalysis {
  totalSessions: number;
  totalMessages: number;
  averageSessionLength: number;
  topTopics: { topic: string; count: number }[];
  recentActivity: { date: string; sessions: number; messages: number }[];
  productivity: {
    issuesResolved: number;
    featuresImplemented: number;
    componentsCreated: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class ConversationHistoryService {
  private readonly baseUrl = '/api/conversation-history'; // Backend API endpoint
  private sessionsSubject = new BehaviorSubject<ConversationSession[]>([]);
  public sessions$ = this.sessionsSubject.asObservable();

  constructor(private http: HttpClient) {
    this.loadSessions();
  }

  /**
   * Load all conversation sessions
   */
  public loadSessions(): void {
    this.http.get<{success: boolean, data: ConversationSession[]}>(`${this.baseUrl}`)
      .pipe(
        map(response => response.data || []),
        catchError(() => {
          // Fallback to mock data for development
          return of(this.getMockSessions());
        })
      )
      .subscribe(sessions => {
        this.sessionsSubject.next(sessions.sort((a, b) =>
          new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
        ));
      });
  }

  /**
   * Get a specific conversation session by ID
   */
  public getSession(conversationId: string): Observable<ConversationSession | null> {
    return this.sessions$.pipe(
      map(sessions => sessions.find(s => s.conversationId === conversationId) || null)
    );
  }

  /**
   * Get conversation history analysis
   */
  public getAnalysis(): Observable<ConversationHistoryAnalysis> {
    return this.sessions$.pipe(
      map(sessions => this.calculateAnalysis(sessions))
    );
  }

  /**
   * Search conversations by content or topic
   */
  public searchConversations(query: string): Observable<ConversationSession[]> {
    return this.sessions$.pipe(
      map(sessions => sessions.filter(session =>
        session.title.toLowerCase().includes(query.toLowerCase()) ||
        session.messages.some(msg =>
          msg.content.toLowerCase().includes(query.toLowerCase())
        ) ||
        session.summary?.mainTopics.some(topic =>
          topic.toLowerCase().includes(query.toLowerCase())
        ) || false
      ))
    );
  }

  /**
   * Get sessions by date range
   */
  public getSessionsByDateRange(startDate: Date, endDate: Date): Observable<ConversationSession[]> {
    return this.sessions$.pipe(
      map(sessions => sessions.filter(session => {
        const sessionDate = new Date(session.startTime);
        return sessionDate >= startDate && sessionDate <= endDate;
      }))
    );
  }

  /**
   * Calculate analysis metrics from sessions
   */
  private calculateAnalysis(sessions: ConversationSession[]): ConversationHistoryAnalysis {
    const totalMessages = sessions.reduce((sum, s) => sum + s.messages.length, 0);
    const averageSessionLength = sessions.length > 0 ? totalMessages / sessions.length : 0;

    // Extract topics from summaries
    const allTopics = sessions.flatMap(s => s.summary?.mainTopics || []);
    const topicCounts = allTopics.reduce((acc, topic) => {
      acc[topic] = (acc[topic] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topTopics = Object.entries(topicCounts)
      .map(([topic, count]) => ({ topic, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Calculate recent activity (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentSessions = sessions.filter(s => new Date(s.startTime) >= thirtyDaysAgo);
    const recentActivity = this.groupSessionsByDate(recentSessions);

    // Calculate productivity metrics
    const productivity = {
      issuesResolved: sessions.reduce((sum, s) =>
        sum + s.messages.reduce((msgSum, m) =>
          msgSum + (m.metadata?.issuesResolved || 0), 0
        ), 0
      ),
      featuresImplemented: sessions.reduce((sum, s) =>
        sum + (s.summary?.keyAchievements.length || 0), 0
      ),
      componentsCreated: sessions.reduce((sum, s) =>
        sum + s.messages.reduce((msgSum, m) =>
          msgSum + (m.metadata?.components?.length || 0), 0
        ), 0
      )
    };

    return {
      totalSessions: sessions.length,
      totalMessages,
      averageSessionLength: Math.round(averageSessionLength * 10) / 10,
      topTopics,
      recentActivity,
      productivity
    };
  }

  /**
   * Group sessions by date for activity tracking
   */
  private groupSessionsByDate(sessions: ConversationSession[]): { date: string; sessions: number; messages: number }[] {
    const grouped = sessions.reduce((acc, session) => {
      const date = new Date(session.startTime).toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = { sessions: 0, messages: 0 };
      }
      acc[date].sessions++;
      acc[date].messages += session.messages.length;
      return acc;
    }, {} as Record<string, { sessions: number; messages: number }>);

    return Object.entries(grouped)
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Mock data for development
   */
  private getMockSessions(): ConversationSession[] {
    return [
      {
        conversationId: 'conv_jouster_linting_wsl_setup_20241005',
        title: 'Jouster Linting Updates & WSL2 Setup',
        project: 'Jouster',
        startTime: '2025-10-05T03:30:00Z',
        endTime: '2025-10-05T04:45:00Z',
        messages: [
          {
            messageId: 'msg_001',
            timestamp: 1728095400000,
            role: 'user',
            content: 'where were we?',
            metadata: { context: 'Resuming work on Jouster project' }
          },
          {
            messageId: 'msg_002',
            timestamp: 1728095460000,
            role: 'assistant',
            content: 'We were working on the Flash Experiments feature and linting configuration updates.',
            metadata: {
              context: 'Project status summary',
              components: ['FlashExperimentsComponent', 'CanvasAnimationsService']
            }
          }
        ],
        summary: {
          mainTopics: ['ESLint configuration', 'Flash Experiments', 'WSL2 setup'],
          keyAchievements: ['Resolved 194 linting issues', 'WSL2 installation setup'],
          nextSteps: ['Run linting checks', 'Complete Flash experiments']
        }
      }
    ];
  }
}
