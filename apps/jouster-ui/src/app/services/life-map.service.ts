import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, map } from 'rxjs';

export interface LifeMapLocation {
  lat: number;
  lng: number;
  name: string;
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
}

export interface LifeMapEntry {
  id: string;
  title: string;
  description: string;
  date: string;
  category: string;
  location: LifeMapLocation;
  images: string[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

/** Payload for creating/updating an entry (server generates id/timestamps). */
export interface LifeMapEntryInput {
  title: string;
  description?: string;
  date: string;
  category: string;
  location: LifeMapLocation;
  images?: string[];
  tags?: string[];
}

/** Result from the server-side geocode lookup. */
export interface GeocodeResult {
  lat: number;
  lng: number;
  displayName: string;
  city: string;
  state: string;
  country: string;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  total?: number;
  message?: string;
}

interface ImageUrlResponse {
  success: boolean;
  url: string;
  expires: number;
}

interface ImageUploadResponse {
  success: boolean;
  filename: string;
}

/**
 * Service for fetching and mutating life map entries and images via the backend API.
 * All requests include credentials (session cookie) automatically via interceptor.
 * Write operations also send the `X-Requested-With` header (CSRF defense-in-depth).
 */
@Injectable({
  providedIn: 'root'
})
export class LifeMapService {
  private readonly API_URL = '/api/life-map';

  /** Sent on all state-changing requests; the backend rejects writes without it. */
  private readonly writeHeaders = new HttpHeaders({ 'X-Requested-With': 'XMLHttpRequest' });

  constructor(private http: HttpClient) {}

  /**
   * Get all life map entries sorted by date.
   */
  getEntries(): Observable<LifeMapEntry[]> {
    return this.http.get<ApiResponse<LifeMapEntry[]>>(`${this.API_URL}/entries`)
      .pipe(map(response => response.data));
  }

  /**
   * Get a single entry by ID.
   */
  getEntry(id: string): Observable<LifeMapEntry> {
    return this.http.get<ApiResponse<LifeMapEntry>>(`${this.API_URL}/entries/${id}`)
      .pipe(map(response => response.data));
  }

  /**
   * Create a new entry. Requires an authenticated session.
   */
  createEntry(input: LifeMapEntryInput): Observable<LifeMapEntry> {
    return this.http
      .post<ApiResponse<LifeMapEntry>>(`${this.API_URL}/entries`, input, { headers: this.writeHeaders })
      .pipe(map(response => response.data));
  }

  /**
   * Update an existing entry. Requires an authenticated session.
   */
  updateEntry(id: string, input: Partial<LifeMapEntryInput>): Observable<LifeMapEntry> {
    return this.http
      .put<ApiResponse<LifeMapEntry>>(`${this.API_URL}/entries/${id}`, input, { headers: this.writeHeaders })
      .pipe(map(response => response.data));
  }

  /**
   * Delete an entry. Requires an authenticated session.
   */
  deleteEntry(id: string): Observable<void> {
    return this.http
      .delete<ApiResponse<null>>(`${this.API_URL}/entries/${id}`, { headers: this.writeHeaders })
      .pipe(map(() => undefined));
  }

  /**
   * Resolve an address string to candidate coordinates (server-side geocode).
   */
  geocode(query: string): Observable<GeocodeResult[]> {
    return this.http
      .get<ApiResponse<GeocodeResult[]>>(`${this.API_URL}/geocode`, { params: { q: query } })
      .pipe(map(response => response.data));
  }

  /**
   * Upload an image (base64 data URL) and get back the stored filename.
   */
  uploadImage(dataUrl: string): Observable<string> {
    return this.http
      .post<ImageUploadResponse>(`${this.API_URL}/images`, { data: dataUrl }, { headers: this.writeHeaders })
      .pipe(map(response => response.filename));
  }

  /**
   * Get a presigned S3 URL for a journal image.
   * URLs expire after 15 minutes.
   */
  getImageUrl(filename: string): Observable<string> {
    return this.http.get<ImageUrlResponse>(`${this.API_URL}/images/${filename}`)
      .pipe(map(response => response.url));
  }
}

