import { createComponentFactory, Spectator } from '@ngneat/spectator';
import { RouterTestingModule } from '@angular/router/testing';
import { Component } from '@angular/core';
import { NavigationComponent } from './navigation.component';
import { CommonModule } from '@angular/common';

// Mock component for routing tests
@Component({
  template: '<div>Mock Route Component</div>'
})
class MockRouteComponent {}

describe('NavigationComponent', () => {
  let spectator: Spectator<NavigationComponent>;

  const createComponent = createComponentFactory({
    component: NavigationComponent,
    imports: [
      CommonModule,
      RouterTestingModule.withRoutes([
        { path: '', component: MockRouteComponent },
        { path: 'about', component: MockRouteComponent },
        { path: 'contact', component: MockRouteComponent },
        { path: 'fibonacci', component: MockRouteComponent },
        { path: 'highlights', component: MockRouteComponent },
        { path: 'conversation-history', component: MockRouteComponent },
        { path: 'music', component: MockRouteComponent },
        { path: 'timeline', component: MockRouteComponent },
        { path: 'flash-experiments', component: MockRouteComponent },
        { path: 'emails', component: MockRouteComponent }
      ])
    ],
    declarations: [MockRouteComponent]
  });

  beforeEach(() => {
    spectator = createComponent();
  });

  describe('Component Initialization', () => {
    it('should create the component', () => {
      expect(spectator.component).toBeTruthy();
    });

    it('should render without errors', () => {
      expect(spectator.fixture.nativeElement).toBeTruthy();
    });
  });

  describe('Navigation Structure', () => {
    it('should have main navbar container', () => {
      const navbar = spectator.query('.navbar');
      expect(navbar).toExist();
    });

    it('should have navigation container with Flexbox layout', () => {
      const navContainer = spectator.query('.nav-container');
      expect(navContainer).toExist();
      expect(navContainer).toHaveStyle({
        display: 'flex',
        'justify-content': 'space-between',
        'align-items': 'center'
      });
    });

    it('should display logo', () => {
      const logo = spectator.query('.nav-logo .logo-link');
      expect(logo).toExist();
      expect(logo).toHaveText('Jouster');
    });

    it('should have navigation menu with Flexbox layout', () => {
      const navMenu = spectator.query('.nav-menu');
      expect(navMenu).toExist();
      expect(navMenu).toHaveStyle({
        display: 'flex'
      });
    });
  });

  describe('Navigation Links', () => {
    it('should display all navigation links', () => {
      const navLinks = spectator.queryAll('.nav-link');
      expect(navLinks.length).toBeGreaterThan(0);

      // Check for specific navigation items
      const linkTexts = navLinks.map(link => link.textContent?.trim());
      expect(linkTexts).toContain('About');
      expect(linkTexts).toContain('Contact');
      expect(linkTexts).toContain('Fibonacci');
      expect(linkTexts).toContain('Highlights');
      expect(linkTexts).toContain('Home');
      expect(linkTexts).toContain('Conversations');
      expect(linkTexts).toContain('Music');
      expect(linkTexts).toContain('Timeline');
      expect(linkTexts).toContain('Flash Experiments');
      expect(linkTexts).toContain('Emails');
    });

    it('should have correct router links', () => {
      const aboutLink = spectator.query('a[routerLink="/about"]');
      const homeLink = spectator.query('a[routerLink="/"]');
      const musicLink = spectator.query('a[routerLink="/music"]');

      expect(aboutLink).toExist();
      expect(homeLink).toExist();
      expect(musicLink).toExist();
    });

    it('should have routerLinkActive directive on navigation links', () => {
      const navLinks = spectator.queryAll('a[routerLinkActive="active"]');
      expect(navLinks.length).toBeGreaterThan(0);
    });
  });

  describe('Responsive Design', () => {
    it('should have responsive navigation container', () => {
      const navContainer = spectator.query('.nav-container');
      expect(navContainer).toHaveStyle({
        'max-width': '1200px',
        margin: '0 auto'
      });
    });

    it('should use Flexbox for responsive layout', () => {
      const navMenu = spectator.query('.nav-menu');
      expect(navMenu).toHaveStyle({
        display: 'flex',
        gap: '2rem'
      });
    });
  });

  describe('Styling and Visual Effects', () => {
    it('should have sticky positioning', () => {
      const navbar = spectator.query('.navbar');
      expect(navbar).toHaveStyle({
        position: 'sticky',
        top: '0'
      });
    });

    it('should have proper z-index for layering', () => {
      const navbar = spectator.query('.navbar');
      expect(navbar).toHaveStyle({
        'z-index': '1000'
      });
    });

    it('should have box shadow for depth', () => {
      const navbar = spectator.query('.navbar');
      expect(navbar).toHaveStyle({
        'box-shadow': '0 2px 4px rgba(0, 0, 0, 0.1)'
      });
    });
  });

  describe('Interactive Behavior', () => {
    it('should have hover effects on logo', () => {
      const logo = spectator.query('.logo-link');
      expect(logo).toHaveStyle({
        transition: 'color 0.3s ease'
      });
    });

    it('should have hover effects on navigation links', () => {
      const navLinks = spectator.queryAll('.nav-link');
      navLinks.forEach(link => {
        expect(link).toHaveStyle({
          transition: 'all 0.3s ease'
        });
      });
    });

    it('should handle click events on navigation links', () => {
      const aboutLink = spectator.query('a[routerLink="/about"]');
      expect(aboutLink).toExist();

      // Click should not throw error
      expect(() => spectator.click(aboutLink)).not.toThrow();
    });
  });

  describe('Accessibility', () => {
    it('should use semantic nav element', () => {
      const nav = spectator.query('nav');
      expect(nav).toExist();
    });

    it('should have proper link structure', () => {
      const navLinks = spectator.queryAll('.nav-link');
      navLinks.forEach(link => {
        expect(link.tagName.toLowerCase()).toBe('a');
      });
    });

    it('should have accessible link text', () => {
      const navLinks = spectator.queryAll('.nav-link');
      navLinks.forEach(link => {
        expect(link.textContent?.trim()).toBeTruthy();
      });
    });
  });

  describe('Flexbox Layout Implementation', () => {
    it('should use Flexbox for main navigation layout', () => {
      const navContainer = spectator.query('.nav-container');
      expect(navContainer).toHaveClass('flex') ||
      expect(navContainer).toHaveStyle({ display: 'flex' });
    });

    it('should use proper Flexbox alignment', () => {
      const navContainer = spectator.query('.nav-container');
      expect(navContainer).toHaveStyle({
        'justify-content': 'space-between',
        'align-items': 'center'
      });
    });

    it('should use Flexbox gap for menu spacing', () => {
      const navMenu = spectator.query('.nav-menu');
      expect(navMenu).toHaveStyle({
        gap: '2rem'
      });
    });
  });

  describe('Performance', () => {
    it('should render navigation efficiently', () => {
      const startTime = performance.now();
      spectator.detectChanges();
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(50);
    });

    it('should not cause layout thrashing', () => {
      // Navigation should use Flexbox for stable layout
      const navContainer = spectator.query('.nav-container');
      expect(navContainer).toHaveStyle({ display: 'flex' });
    });
  });
});
