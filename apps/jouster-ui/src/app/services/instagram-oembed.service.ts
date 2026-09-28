import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, forkJoin } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

export interface InstagramOEmbedResponse {
  version: string;
  title: string;
  author_name: string;
  author_url: string;
  author_id: number;
  media_id: string;
  provider_name: string;
  provider_url: string;
  type: string;
  width: number;
  height: number;
  html: string;
  thumbnail_url: string;
  thumbnail_width: number;
  thumbnail_height: number;
}

export interface InstagramPost {
  postUrl: string;
  embedHtml: string;
  thumbnailUrl: string;
  authorName: string;
  mediaId: string;
}

@Injectable({
  providedIn: 'root'
})
export class InstagramOembedService {
  private readonly OEMBED_API = 'https://api.instagram.com/oembed';

  constructor(private http: HttpClient) {}

  /**
   * Fetch oEmbed data for a single Instagram post URL
   * @param postUrl The Instagram post URL (e.g., https://www.instagram.com/p/ABC123/)
   */
  getOEmbedData(postUrl: string): Observable<InstagramOEmbedResponse | null> {
    const encodedUrl = encodeURIComponent(postUrl);
    const apiUrl = `${this.OEMBED_API}?url=${encodedUrl}&omitscript=true`;

    return this.http.get<InstagramOEmbedResponse>(apiUrl).pipe(
      catchError(error => {
        console.error('Failed to fetch oEmbed data for:', postUrl, error);
        return of(null);
      })
    );
  }

  /**
   * Fetch oEmbed data for multiple Instagram post URLs
   * @param postUrls Array of Instagram post URLs
   */
  getMultipleOEmbedData(postUrls: string[]): Observable<InstagramPost[]> {
    const requests = postUrls.map(url =>
      this.getOEmbedData(url).pipe(
        map(response => {
          if (!response) return null;

          return {
            postUrl: url,
            embedHtml: response.html,
            thumbnailUrl: response.thumbnail_url,
            authorName: response.author_name,
            mediaId: response.media_id
          } as InstagramPost;
        })
      )
    );

    return forkJoin(requests).pipe(
      map(results => results.filter((post): post is InstagramPost => post !== null))
    );
  }

  /**
   * Validate if a URL is a valid Instagram post URL
   */
  static isValidInstagramUrl(url: string) {
    const instagramPostPattern = /^https?:\/\/(www\.)?instagram\.com\/(p|reel)\/[A-Za-z0-9_-]+\/?$/;
    return instagramPostPattern.test(url);
  }
}

