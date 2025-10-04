import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

export interface InstagramImage {
  id: string;
  permalink: string;
  media_url: string;
  caption: string;
  media_type: string;
  timestamp: string;
}

@Injectable({
  providedIn: 'root'
})
export class InstagramService {
  private readonly INSTAGRAM_USERNAME = 'beffjarker';
  private readonly BACKEND_API_URL = 'http://localhost:3001/api';

  constructor(private http: HttpClient) {}

  getTopImages(): Observable<InstagramImage[]> {
    console.log('Fetching Instagram posts via backend API...');

    // Use our backend API to fetch Instagram data
    return this.fetchViaBackend().pipe(
      catchError(error => {
        console.warn('Backend API fetch failed:', error);
        console.log('Backend might not be running. Falling back to demo content.');
        return this.getBackendFallbackImages();
      })
    );
  }

  private fetchViaBackend(): Observable<InstagramImage[]> {
    const apiUrl = `${this.BACKEND_API_URL}/instagram/${this.INSTAGRAM_USERNAME}`;

    return this.http.get<any>(apiUrl).pipe(
      map(response => {
        if (response.success && response.data) {
          console.log(`✅ Successfully fetched ${response.data.length} real posts from @${this.INSTAGRAM_USERNAME}!`);
          return response.data as InstagramImage[];
        } else {
          throw new Error(response.message || 'Invalid response from backend');
        }
      }),
      catchError(error => {
        if (error.status === 0) {
          throw new Error('Backend API is not running. Please start the backend server on port 3001.');
        }
        throw error;
      })
    );
  }

  private getBackendFallbackImages(): Observable<InstagramImage[]> {
    // Updated fallback with backend instructions
    const fallbackImages: InstagramImage[] = [
      {
        id: 'backend-demo-1',
        permalink: `https://instagram.com/beffjarker`,
        media_url: 'https://picsum.photos/400/400?random=301',
        caption: '🚀 Backend API Solution Ready! Start the backend server to see real @beffjarker posts.',
        media_type: 'IMAGE',
        timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 'backend-demo-2',
        permalink: `https://instagram.com/beffjarker`,
        media_url: 'https://picsum.photos/400/400?random=302',
        caption: '💻 Run "npm start" in the backend folder to start the Instagram API server on port 3001',
        media_type: 'IMAGE',
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 'backend-demo-3',
        permalink: `https://instagram.com/beffjarker`,
        media_url: 'https://picsum.photos/400/400?random=303',
        caption: '🔧 Once the backend is running, refresh this page to see real Instagram posts!',
        media_type: 'IMAGE',
        timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 'backend-demo-4',
        permalink: `https://instagram.com/beffjarker`,
        media_url: 'https://picsum.photos/400/400?random=304',
        caption: '✅ Backend bypasses CORS restrictions by fetching Instagram data server-side',
        media_type: 'IMAGE',
        timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 'backend-demo-5',
        permalink: `https://instagram.com/beffjarker`,
        media_url: 'https://picsum.photos/400/400?random=305',
        caption: '🎯 This approach works for any public Instagram profile without authentication',
        media_type: 'IMAGE',
        timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 'backend-demo-6',
        permalink: `https://instagram.com/beffjarker`,
        media_url: 'https://picsum.photos/400/400?random=306',
        caption: '🔗 Meanwhile, click any image to visit the real @beffjarker Instagram profile',
        media_type: 'IMAGE',
        timestamp: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 'backend-demo-7',
        permalink: `https://instagram.com/beffjarker`,
        media_url: 'https://picsum.photos/400/400?random=307',
        caption: '📡 Backend API endpoint: http://localhost:3001/api/instagram/beffjarker',
        media_type: 'IMAGE',
        timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 'backend-demo-8',
        permalink: `https://instagram.com/beffjarker`,
        media_url: 'https://picsum.photos/400/400?random=308',
        caption: '⚡ Server-side scraping is more reliable than browser-based attempts',
        media_type: 'IMAGE',
        timestamp: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 'backend-demo-9',
        permalink: `https://instagram.com/beffjarker`,
        media_url: 'https://picsum.photos/400/400?random=309',
        caption: '🌟 Production ready: Deploy the backend to any cloud service for real usage',
        media_type: 'IMAGE',
        timestamp: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 'backend-demo-10',
        permalink: `https://instagram.com/beffjarker`,
        media_url: 'https://picsum.photos/400/400?random=310',
        caption: '🎉 Start the backend server and see this transform into real @beffjarker content!',
        media_type: 'IMAGE',
        timestamp: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
      }
    ];

    return of(fallbackImages);
  }

  private transformInstagramResponse(response: any): InstagramImage[] {
    // Transform RapidAPI response to our format
    if (!response || !response.data) {
      throw new Error('Invalid Instagram API response');
    }

    return response.data.slice(0, 10).map((item: any) => ({
      id: item.id || item.pk,
      permalink: `https://www.instagram.com/p/${item.code}/`,
      media_url: item.image_versions2?.candidates?.[0]?.url || item.display_url,
      caption: item.caption?.text || 'No caption available',
      media_type: item.media_type === 1 ? 'IMAGE' : 'VIDEO',
      timestamp: new Date(item.taken_at * 1000).toISOString()
    }));
  }

  // Method to set up Instagram API integration
  setupInstagramAPI(accessToken: string): void {
    // This would be used to set up proper Instagram Basic Display API
    console.log('Instagram API setup - access token provided');
    // Store token securely and use for authenticated requests
  }
}
