import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { RuntimeConfigService } from './runtime-config.service';

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

/**
 * Service for fetching life map entries and images from the backend API.
 * All requests include credentials (session cookie) automatically via interceptor.
 */
@Injectable({
  providedIn: 'root'
})
export class LifeMapService {
  private get API_URL(): string {
    return this.config.apiUrl('/api/life-map');
  }

  constructor(private http: HttpClient, private config: RuntimeConfigService) {}

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
   * Get a presigned S3 URL for a journal image.
   * URLs expire after 15 minutes.
   */
  getImageUrl(filename: string): Observable<string> {
    return this.http.get<ImageUrlResponse>(`${this.API_URL}/images/${filename}`)
      .pipe(map(response => response.url));
  }
}

