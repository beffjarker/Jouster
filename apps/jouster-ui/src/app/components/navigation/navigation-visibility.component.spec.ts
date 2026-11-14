import { createComponentFactory, mockProvider, Spectator } from '@ngneat/spectator/jest';
import { provideRouter } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { NavigationComponent } from './navigation.component';

describe('NavigationComponent menu visibility', () => {
  let spectator: Spectator<NavigationComponent>;
  const authenticated$ = new BehaviorSubject<boolean>(false);

  const createComponent = createComponentFactory({
    component: NavigationComponent,
    providers: [provideRouter([]), mockProvider(AuthService, { authenticated$ })],
  });

  const labels = (): string[] =>
    spectator.queryAll('.nav-label').map((el) => el.textContent?.trim() ?? '');

  beforeEach(() => {
    authenticated$.next(false);
    spectator = createComponent();
  });

  it('shows only public pages when logged out', () => {
    expect(labels()).toEqual(['Interactive Playground', 'Jouster Quest', 'About', 'Contact']);
    expect(labels()).not.toContain('Life Map');
  });

  it('reveals private pages, including Life Map, once logged in', () => {
    authenticated$.next(true);
    spectator.detectChanges();

    expect(labels()).toEqual(
      expect.arrayContaining(['Life Map', 'Emails', 'Music', 'Highlights', 'Fibonacci', 'Conversations']),
    );
  });

  it('hides private pages again when the session ends', () => {
    authenticated$.next(true);
    spectator.detectChanges();
    authenticated$.next(false);
    spectator.detectChanges();

    expect(labels()).toEqual(['Interactive Playground', 'Jouster Quest', 'About', 'Contact']);
  });
});
