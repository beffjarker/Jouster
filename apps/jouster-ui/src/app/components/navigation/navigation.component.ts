import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { Subject } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';
import { AuthService } from '../../services/auth.service';
import { PAGE_REGISTRY, PageConfig } from '../../models/page-registry';
import { environment } from '../../../environments/environment';
interface NavigationItem {
  path: string;
  label: string;
  icon: string;
  description?: string;
  requiresAuth?: boolean;
  isPublic?: boolean;
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
  public showVersionInfo = false;
  /** Version sourced from environment config */
  public readonly appVersion = environment.version;
  public readonly isProduction = environment.production;
  public readonly environmentName = environment.production ? 'Production' : 'Development';
  public isAuthenticated = false;
  /** Navigation items derived from PAGE_REGISTRY */
  public navigationItems: NavigationItem[] = PAGE_REGISTRY.map((page: PageConfig) => ({
    path: page.path,
    label: page.title,
    icon: page.icon,
    description: page.description,
    requiresAuth: page.requiresAuth,
    isPublic: page.isPublic,
  }));
  constructor(private router: Router, private authService: AuthService) {}
  ngOnInit() {
    this.checkScreenSize();
    this.authService.authenticated$
      .pipe(takeUntil(this.destroy$))
      .subscribe(authenticated => {
        this.isAuthenticated = authenticated;
      });
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
    return this.currentRoute.startsWith(path);
  }
  public get visibleNavigationItems(): NavigationItem[] {
    if (this.isAuthenticated) {
      return this.navigationItems;
    }
    return this.navigationItems.filter(item => item.isPublic === true);
  }
  public onNavigate(path: string) {
    this.router.navigate([path]);
    if (this.isMobile) {
      this.closeMenu();
    }
  }
  public toggleVersionInfo(event: Event): void {
    event.stopPropagation();
    this.showVersionInfo = !this.showVersionInfo;
  }
  public trackByPath(index: number, item: NavigationItem): string {
    return item.path;
  }
}