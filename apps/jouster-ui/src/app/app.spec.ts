import { createComponentFactory, Spectator } from '@ngneat/spectator';
import { App } from './app';
import { NxWelcome } from './nx-welcome';

describe('App', () => {
  let spectator: Spectator<App>;

  const createComponent = createComponentFactory({
    component: App,
    imports: [NxWelcome],
    shallow: true, // Use shallow rendering for better performance and isolation
  });

  beforeEach(() => {
    spectator = createComponent();
  });

  describe('Component Initialization', () => {
    it('should create the app component', () => {
      expect(spectator.component).toBeTruthy();
    });

    it('should render welcome title', () => {
      expect(spectator.query('h1')).toHaveText('Welcome Jouster');
    });

    it('should have the correct component structure', () => {
      expect(spectator.query('h1')).toExist();
    });
  });

  describe('Component Integration', () => {
    it('should include the NxWelcome component', () => {
      expect(spectator.query('nx-welcome')).toExist();
    });
  });
});
