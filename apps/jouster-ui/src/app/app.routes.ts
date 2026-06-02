import { Route } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { routeData } from './models/page-registry';

export const appRoutes: Route[] = [
  // Root redirect — no component at '/', always go to the main page
  {
    path: '',
    redirectTo: 'interactive-playground',
    pathMatch: 'full',
  },
  {
    path: 'interactive-playground',
    data: routeData('/interactive-playground'),
    loadComponent: () => import('./pages/flash-experiments/flash-experiments.component').then(m => m.FlashExperimentsComponent),
  },
  // Legacy path — old bookmarks and links continue to work
  {
    path: 'flash-experiments',
    redirectTo: 'interactive-playground',
    pathMatch: 'full',
  },
  {
    path: 'highlights',
    data: routeData('/highlights'),
    loadComponent: () => import('./pages/highlights/highlights.component').then(m => m.HighlightsComponent),
    canActivate: [authGuard],
  },
  {
    path: 'about',
    data: routeData('/about'),
    loadComponent: () => import('./pages/about/about.component').then(m => m.AboutComponent),
  },
  {
    path: 'contact',
    data: routeData('/contact'),
    loadComponent: () => import('./pages/contact/contact.component').then(m => m.ContactComponent),
  },
  {
    path: 'fibonacci',
    data: routeData('/fibonacci'),
    loadComponent: () => import('./pages/fibonacci/fibonacci.component').then(m => m.FibonacciComponent),
    canActivate: [authGuard],
  },
  {
    path: 'music',
    data: routeData('/music'),
    loadComponent: () => import('./pages/music/music.component').then(m => m.MusicComponent),
    canActivate: [authGuard],
  },
  {
    path: 'listening-history',
    redirectTo: '/music',
    pathMatch: 'full',
  },
  {
    path: 'emails',
    data: routeData('/emails'),
    loadComponent: () => import('./pages/emails/emails.component').then(m => m.EmailsComponent),
    canActivate: [authGuard],
  },
  {
    path: 'timeline',
    data: routeData('/timeline'),
    loadComponent: () => import('./pages/timeline/timeline.component').then(m => m.TimelineComponent),
    canActivate: [authGuard],
  },
  {
    path: 'conversation-history',
    loadComponent: () => import('./pages/conversation-history/conversation-history.component').then(m => m.ConversationHistoryComponent),
    canActivate: [authGuard],
  },
  { path: '**', redirectTo: 'interactive-playground' },
];
