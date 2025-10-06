import { Route } from '@angular/router';

export const appRoutes: Route[] = [
  {
    path: '',
    loadComponent: () => import('./pages/home/home.component').then(m => m.HomeComponent)
  },
  {
    path: 'highlights',
    loadComponent: () => import('./pages/highlights/highlights.component').then(m => m.HighlightsComponent)
  },
  {
    path: 'about',
    loadComponent: () => import('./pages/about/about.component').then(m => m.AboutComponent)
  },
  {
    path: 'contact',
    loadComponent: () => import('./pages/contact/contact.component').then(m => m.ContactComponent)
  },
  {
    path: 'fibonacci',
    loadComponent: () => import('./pages/fibonacci/fibonacci.component').then(m => m.FibonacciComponent)
  },
  {
    path: 'music',
    loadComponent: () => import('./pages/music/music.component').then(m => m.MusicComponent)
  },
  {
    path: 'listening-history',
    loadComponent: () => import('./pages/listening-history/listening-history.component').then(m => m.ListeningHistoryComponent)
  },
  {
    path: 'emails',
    loadComponent: () => import('./pages/emails/emails.component').then(m => m.EmailsComponent)
  },
  {
    path: 'timeline',
    loadComponent: () => import('./pages/timeline/timeline.component').then(m => m.TimelineComponent)
  },
  {
    path: 'flash-experiments',
    loadComponent: () => import('./pages/flash-experiments/flash-experiments.component').then(m => m.FlashExperimentsComponent)
  },
  {
    path: 'conversation-history',
    loadComponent: () => import('./pages/conversation-history/conversation-history.component').then(m => m.ConversationHistoryComponent)
  },
  { path: '**', redirectTo: '' } // Wildcard route for 404 - redirect to home
];
