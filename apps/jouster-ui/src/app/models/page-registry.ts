/**
 * Page Registry — Single source of truth for all page titles, icons, and visibility.
 *
 * Both the navigation component and page components read from this registry.
 * Changing a title here updates both the nav menu and the page header automatically.
 */

export interface PageConfig {
  /** Canonical URL path (e.g., '/interactive-playground') */
  path: string;
  /** Title shown in the nav menu AND on the page (when showTitleOnPage is true) */
  title: string;
  /** Emoji icon shown in the nav menu */
  icon: string;
  /** Short description shown below the nav label */
  description: string;
  /** If true, renders <h1> on the page. If false, title is shown in nav only. */
  showTitleOnPage: boolean;
  requiresAuth: boolean;
  isPublic: boolean;
}

export const PAGE_REGISTRY: PageConfig[] = [
  {
    path: '/interactive-playground',
    title: 'Interactive Playground',
    icon: '🎨',
    description: '56+ interactive presets',
    showTitleOnPage: false,   // Page has its own section headers
    requiresAuth: false,
    isPublic: true,
  },
  {
    path: '/highlights',
    title: 'Highlights',
    icon: '⭐',
    description: 'Featured content',
    showTitleOnPage: true,
    requiresAuth: true,
    isPublic: false,
  },
  {
    path: '/timeline',
    title: 'Life Map',
    icon: '📅',
    description: 'Interactive visualization',
    showTitleOnPage: true,
    requiresAuth: true,
    isPublic: false,
  },
  {
    path: '/fibonacci',
    title: 'Fibonacci',
    icon: '🔢',
    description: 'Mathematical visualizations',
    showTitleOnPage: true,
    requiresAuth: true,
    isPublic: false,
  },
  {
    path: '/music',
    title: 'Music',
    icon: '🎵',
    description: 'Music player & listening history',
    showTitleOnPage: true,
    requiresAuth: true,
    isPublic: false,
  },
  {
    path: '/emails',
    title: 'Emails',
    icon: '📧',
    description: 'Email management',
    showTitleOnPage: true,
    requiresAuth: true,
    isPublic: false,
  },
  {
    path: '/about',
    title: 'About',
    icon: 'ℹ️',
    description: 'About this project',
    showTitleOnPage: true,
    requiresAuth: false,
    isPublic: true,
  },
  {
    path: '/contact',
    title: 'Contact',
    icon: '📞',
    description: 'Get in touch',
    showTitleOnPage: true,
    requiresAuth: false,
    isPublic: true,
  },
];

/**
 * Helper to find a page config by canonical path.
 */
export function getPageConfig(path: string): PageConfig | undefined {
  return PAGE_REGISTRY.find(p => p.path === path);
}

/**
 * Helper to build Angular route data for a given path.
 */
export function routeData(path: string): { pageConfig: PageConfig } | Record<string, never> {
  const config = getPageConfig(path);
  return config ? { pageConfig: config } : {};
}

