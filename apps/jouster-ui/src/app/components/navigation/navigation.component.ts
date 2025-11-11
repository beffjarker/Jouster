import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { Subject } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';

interface NavigationItem {
  path: string;
  label: string;
  icon: string;
  description?: string;
  requiresAuth?: boolean; // True if item requires authentication
  isPublic?: boolean; // True if item is available without auth (default: false)
}

@Component({
  selector: 'jstr-navigation',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './navigation.component.html',
  styleUrls: ['./navigation.component.scss']
})
export class NavigationComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  public isMenuOpen = false;
  public currentRoute = '';
  public isMobile = false;

  // TODO: Wire up actual authentication service
  // For now, this simulates logged-out state
  public isAuthenticated = false;

  public navigationItems: NavigationItem[] = [
    {
      path: '/',
      label: 'Flash Experiments',
      icon: '🎨',
      description: '56+ interactive presets',
      isPublic: true // Public - Flash experiments home page
    },
    {
      path: '/highlights',
      label: 'Highlights',
      icon: '⭐',
      description: 'Featured content',
      requiresAuth: true // Requires login
    },
    {
      path: '/timeline',
      label: 'Timeline',
      icon: '📅',
      description: 'Interactive visualization',
      requiresAuth: true // Requires login
    },
    {
      path: '/conversation-history',
      label: 'Conversations',
      icon: '💬',
      description: 'Chat history & analysis',
      requiresAuth: true // Requires login
    },
    {
      path: '/fibonacci',
      label: 'Fibonacci',
      icon: '🔢',
      description: 'Mathematical visualizations',
      requiresAuth: true // Requires login
    },
    {
      path: '/music',
      label: 'Music',
      icon: '🎵',
      description: 'Music player & listening history',
      requiresAuth: true // Requires login
    },
    {
      path: '/emails',
      label: 'Emails',
      icon: '📧',
      description: 'Email management',
      requiresAuth: true // Requires login
    },
    {
      path: '/about',
      label: 'About',
      icon: 'ℹ️',
      description: 'About this project',
      isPublic: true // Public - About section
    },
    {
      path: '/contact',
      label: 'Contact',
      icon: '📞',
      description: 'Get in touch',
      isPublic: true // Public - Contact section
    }
  ];

  constructor(private router: Router) {}

  ngOnInit() {
    this.checkScreenSize();

    // Track route changes to update active menu item and close mobile menu
    this.router.events
      .pipe(
        filter(event => event instanceof NavigationEnd),
        takeUntil(this.destroy$)
      )
      .subscribe((event: NavigationEnd) => {
        this.currentRoute = event.url;
        if (this.isMobile) {
          this.closeMenu();
        }
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  @HostListener('window:resize')
  onResize() {
    this.checkScreenSize();
    if (!this.isMobile) {
      this.closeMenu();
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event) {
    const target = event.target as Element;
    const nav = document.querySelector('.navigation-container');
    const hamburger = document.querySelector('.hamburger-button');

    if (this.isMenuOpen && nav && !nav.contains(target) && !hamburger?.contains(target)) {
      this.closeMenu();
    }
  }

  private checkScreenSize() {
    this.isMobile = window.innerWidth < 768;
  }

  public toggleMenu() {
    this.isMenuOpen = !this.isMenuOpen;
  }

  public closeMenu() {
    this.isMenuOpen = false;
  }

  public isActiveRoute(path: string): boolean {
    if (path === '/') {
      return this.currentRoute === '/';
    }
    return this.currentRoute.startsWith(path);
  }

  /**
   * Get navigation items visible to current user
   * Public items (home, about, contact) are always visible
   * Auth-required items only visible when logged in
   */
  public get visibleNavigationItems(): NavigationItem[] {
    if (this.isAuthenticated) {
      // Show all items when authenticated
      return this.navigationItems;
    }

    // Show only public items when not authenticated
    return this.navigationItems.filter(item => item.isPublic === true);
  }

  public onNavigate(path: string) {
    this.router.navigate([path]);
    if (this.isMobile) {
      this.closeMenu();
    }
  }

  public trackByPath(index: number, item: NavigationItem): string {
    return item.path;
  }
}
