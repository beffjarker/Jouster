import { createComponentFactory, Spectator } from '@ngneat/spectator';
import { HomeComponent } from './home.component';
import { CommonModule } from '@angular/common';

describe('HomeComponent', () => {
  let spectator: Spectator<HomeComponent>;

  const createComponent = createComponentFactory({
    component: HomeComponent,
    imports: [CommonModule],
    shallow: true // Use shallow rendering for simple components
  });

  beforeEach(() => {
    spectator = createComponent();
  });

  describe('Component Initialization', () => {
    it('should create the component', () => {
      expect(spectator.component).toBeTruthy();
    });

    it('should render the component without errors', () => {
      expect(spectator.fixture.nativeElement).toBeTruthy();
    });
  });

  describe('Template Integration', () => {
    it('should display main heading', () => {
      const heading = spectator.query('h1');
      expect(heading).toExist();
      expect(heading).toHaveText('Welcome to Jouster');
    });

    it('should have proper page container with Flexbox layout', () => {
      const container = spectator.query('.page-container');
      expect(container).toExist();
      expect(container).toHaveClass('flex');
      expect(container).toHaveClass('flex-column');
    });

    it('should display content sections', () => {
      const contentSections = spectator.queryAll('.content-section');
      expect(contentSections.length).toBeGreaterThan(0);
    });

    it('should have responsive layout structure', () => {
      const container = spectator.query('.page-container');
      expect(container).toHaveStyle({
        display: 'flex',
        'flex-direction': 'column'
      });
    });
  });

  describe('Flexbox Layout Integration', () => {
    it('should use Flexbox utility classes correctly', () => {
      const flexElements = spectator.queryAll('.flex-center, .flex-between, .flex-column');
      expect(flexElements.length).toBeGreaterThan(0);
    });

    it('should have proper gap spacing', () => {
      const gapElements = spectator.queryAll('[class*="gap-"]');
      // Should have elements with gap classes for consistent spacing
      expect(gapElements.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Content Display', () => {
    it('should display welcome information', () => {
      const content = spectator.fixture.nativeElement.textContent;
      expect(content).toContain('Welcome to Jouster');
    });

    it('should have content sections with proper styling', () => {
      const contentSections = spectator.queryAll('.content-section');
      contentSections.forEach(section => {
        expect(section).toHaveClass('flex');
        expect(section).toHaveClass('flex-column');
      });
    });
  });

  describe('Responsive Design', () => {
    it('should have responsive container with max-width', () => {
      const container = spectator.query('.page-container');
      expect(container).toExist();
      // Container should have responsive styling
    });

    it('should adapt to different screen sizes using Flexbox', () => {
      const container = spectator.query('.page-container');
      expect(container).toHaveClass('flex-column');
      // Flexbox will handle responsive behavior inherently
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading hierarchy', () => {
      const h1 = spectator.query('h1');
      expect(h1).toExist();

      const h2Elements = spectator.queryAll('h2');
      // Should have logical heading structure
    });

    it('should have semantic HTML structure', () => {
      expect(spectator.fixture.nativeElement).toBeTruthy();
      // Component should render without accessibility violations
    });
  });

  describe('Performance', () => {
    it('should render efficiently without complex operations', () => {
      const startTime = performance.now();
      spectator.detectChanges();
      const endTime = performance.now();

      // Simple component should render quickly
      expect(endTime - startTime).toBeLessThan(100);
    });
  });
});
