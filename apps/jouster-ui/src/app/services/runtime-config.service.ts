import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

export interface RuntimeConfig {
  /**
   * Base URL of the backend API (no trailing slash), e.g.
   *   ''                                   -> same-origin (relative /api/...)
   *   'https://jouster.org'                -> production (from environment)
   *   'https://abc123.execute-api...'      -> per-PR preview API Gateway
   */
  apiBaseUrl: string;
  /** Optional environment label surfaced for debugging/telemetry. */
  environment?: string;
}

/**
 * Defaults come from the build-time environment so artifacts deployed WITHOUT a
 * /config.json (QA, staging, production) still hit the right backend. The
 * environment's `apiUrl` includes the `/api` suffix, which is stripped here
 * because callers append `/api/...` themselves ('/api' -> '' = same-origin).
 */
const DEFAULT_CONFIG: RuntimeConfig = {
  apiBaseUrl: environment.apiUrl.replace(/\/api\/?$/, ''),
  environment: environment.name,
};

/**
 * Loads runtime configuration from /config.json at application startup so the
 * SAME built artifact can point at different backends per environment (local,
 * per-PR preview, staging, prod) without a rebuild. The preview deploy pipeline
 * writes /config.json into the S3 site with the environment's API Gateway URL.
 */
@Injectable({ providedIn: 'root' })
export class RuntimeConfigService {
  private config: RuntimeConfig = { ...DEFAULT_CONFIG };

  /** Invoked by APP_INITIALIZER before the app bootstraps. */
  async load(): Promise<void> {
    try {
      const res = await fetch('/config.json', { cache: 'no-store' });
      if (res.ok) {
        const loaded = (await res.json()) as Partial<RuntimeConfig>;
        this.config = { ...DEFAULT_CONFIG, ...loaded };
      }
    } catch {
      // Fall back to defaults (local dev) if config.json is missing/unreachable.
    }
  }

  /** Backend API base URL with no trailing slash. */
  get apiBaseUrl(): string {
    return (this.config.apiBaseUrl || '').replace(/\/$/, '');
  }

  get environment(): string {
    return this.config.environment || 'unknown';
  }

  /** Build an absolute API URL from a path beginning with '/'. */
  apiUrl(path: string): string {
    const p = path.startsWith('/') ? path : `/${path}`;
    return `${this.apiBaseUrl}${p}`;
  }
}
