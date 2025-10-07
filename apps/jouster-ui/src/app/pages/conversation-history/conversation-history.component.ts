import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import {
  ConversationHistoryService,
  ConversationSession,
  ConversationHistoryAnalysis
} from '../../services/conversation-history.service';
import { Observable, Subject, BehaviorSubject, combineLatest } from 'rxjs';
import { map, startWith, debounceTime, distinctUntilChanged } from 'rxjs/operators';

@Component({
  selector: 'jstr-conversation-history',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './conversation-history.component.html',
  styleUrls: ['./conversation-history.component.scss']
})
export class ConversationHistoryComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private searchTermSubject = new BehaviorSubject<string>('');

  public sessions$: Observable<ConversationSession[]>;
  public analysis$: Observable<ConversationHistoryAnalysis>;
  public filteredSessions$: Observable<ConversationSession[]>;
  public selectedSession: ConversationSession | null = null;
  public searchTerm = '';
  public loading = true;
  public viewMode: 'list' | 'details' | 'analytics' = 'list';

  constructor(private conversationHistoryService: ConversationHistoryService) {
    this.sessions$ = this.conversationHistoryService.sessions$;
    this.analysis$ = this.conversationHistoryService.getAnalysis();

    // Set up filtered sessions based on search
    this.filteredSessions$ = combineLatest([
      this.sessions$,
      this.searchTermSubject.pipe(
        debounceTime(300),
        distinctUntilChanged(),
        startWith('')
      )
    ]).pipe(
      map(([sessions, searchTerm]) => {
        if (!searchTerm.trim()) {
          return sessions;
        }
        return sessions.filter(session =>
          session.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          session.summary?.mainTopics.some(topic =>
            topic.toLowerCase().includes(searchTerm.toLowerCase())
          ) ||
          session.messages.some(msg =>
            msg.content.toLowerCase().includes(searchTerm.toLowerCase())
          )
        );
      })
    );
  }

  public ngOnInit() {
    // Show loading state briefly
    setTimeout(() => {
      this.loading = false;
    }, 1000);
  }

  public ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  public onSearchChange(term: string) {
    this.searchTerm = term;
    this.searchTermSubject.next(term);
  }

  public selectSession(session: ConversationSession) {
    this.selectedSession = session;
    this.viewMode = 'details';
  }

  public closeSessionDetails() {
    this.selectedSession = null;
    this.viewMode = 'list';
  }

  public setViewMode(mode: 'list' | 'details' | 'analytics') {
    this.viewMode = mode;
    if (mode !== 'details') {
      this.selectedSession = null;
    }
  }

  public formatDate(dateInput: string | number) {
    const date = typeof dateInput === 'number' ? new Date(dateInput) : new Date(dateInput);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  public formatDuration(startTime: string, endTime?: string) {
    if (!endTime) return 'In progress';

    const start = new Date(startTime);
    const end = new Date(endTime);
    const durationMs = end.getTime() - start.getTime();
    const minutes = Math.floor(durationMs / (1000 * 60));
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    return `${minutes}m`;
  }

  public getMessagePreview(session: ConversationSession) {
    const userMessages = session.messages.filter(m => m.role === 'user');
    if (userMessages.length === 0) return 'No user messages';

    const firstMessage = userMessages[0]?.content;
    if (!firstMessage) return 'No user messages';

    return firstMessage.length > 100 ? firstMessage.substring(0, 100) + '...' : firstMessage;
  }

  public getSessionIcon(session: ConversationSession) {
    const topics = session.summary?.mainTopics || [];

    if (topics.some(t => t.toLowerCase().includes('flash'))) return '⚡';
    if (topics.some(t => t.toLowerCase().includes('linting'))) return '🔧';
    if (topics.some(t => t.toLowerCase().includes('wsl'))) return '🐧';
    if (topics.some(t => t.toLowerCase().includes('python'))) return '🐍';
    if (topics.some(t => t.toLowerCase().includes('docker'))) return '🐳';
    if (topics.some(t => t.toLowerCase().includes('ui'))) return '🎨';

    return '💬';
  }

  public getTopicBadgeClass(topic: string) {
    const lowercaseTopic = topic.toLowerCase();

    if (lowercaseTopic.includes('flash')) return 'badge-flash';
    if (lowercaseTopic.includes('linting')) return 'badge-linting';
    if (lowercaseTopic.includes('wsl') || lowercaseTopic.includes('linux')) return 'badge-system';
    if (lowercaseTopic.includes('python')) return 'badge-python';
    if (lowercaseTopic.includes('docker')) return 'badge-docker';
    if (lowercaseTopic.includes('ui') || lowercaseTopic.includes('component')) return 'badge-ui';

    return 'badge-default';
  }

  public trackBySessionId(_index: number, session: ConversationSession) {
    return session.conversationId;
  }

  public trackByMessageId(_index: number, message: any) {
    return message.messageId;
  }
}
