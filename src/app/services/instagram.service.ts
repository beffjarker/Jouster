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
  like_count?: number;
  comments_count?: number;
}

@Injectable({
  providedIn: 'root'
})
export class InstagramService {
  private readonly INSTAGRAM_USERNAME = 'beffjarker';
  private readonly BACKEND_API_URL = 'http://localhost:3000/api';

  constructor(private http: HttpClient) {}

  // Method expected by highlights component
  getUserMedia(): Observable<InstagramImage[]> {
    return this.getInstagramPosts();
  }

  // Main method to get Instagram posts via backend
  getInstagramPosts(): Observable<InstagramImage[]> {
    console.log('Fetching Instagram posts via backend API...');

    return this.http.get<any>(`${this.BACKEND_API_URL}/instagram/user/media`).pipe(
      map(response => {
        if (response.data && Array.isArray(response.data)) {
          console.log(`✅ Successfully fetched ${response.data.length} posts from @${this.INSTAGRAM_USERNAME}`);
          return response.data as InstagramImage[];
        } else {
          throw new Error('Invalid response format from backend');
        }
      }),
      catchError(error => {
        console.warn('Backend API fetch failed:', error);
        console.log('Backend might not be running. Falling back to enhanced mock data.');
        return this.getEnhancedMockData();
      })
    );
  }

  // Legacy method for backwards compatibility
  getTopImages(): Observable<InstagramImage[]> {
    return this.getInstagramPosts();
  }

  // Enhanced mock data that matches the backend structure
  private getEnhancedMockData(): Observable<InstagramImage[]> {
    const mockData: InstagramImage[] = [
      {
        id: 'mock_001',
        permalink: 'https://instagram.com/p/mock001/',
        media_url: 'https://picsum.photos/600/600?random=101',
        caption: '🌅 Golden hour magic at the coast. There\'s something about that warm light that makes everything feel possible. Shot with 85mm at f/2.8 #goldenhour #coastalphotography #beffjarker #photography #sunset',
        media_type: 'IMAGE',
        timestamp: new Date(Date.now() - 86400000).toISOString(),
        like_count: 342,
        comments_count: 28
      },
      {
        id: 'mock_002',
        permalink: 'https://instagram.com/p/mock002/',
        media_url: 'https://picsum.photos/600/800?random=102',
        caption: '🏔️ Alpine adventure recap! Three days in the mountains taught me more about patience and light than any workshop ever could. #alpinephotography #mountains #patience #beffjarker',
        media_type: 'CAROUSEL_ALBUM',
        timestamp: new Date(Date.now() - 172800000).toISOString(),
        like_count: 528,
        comments_count: 45
      },
      {
        id: 'mock_003',
        permalink: 'https://instagram.com/p/mock003/',
        media_url: 'https://picsum.photos/600/600?random=103',
        caption: '📸 Street photography session in the old quarter. Love how this alley captures both shadow and story. #streetphotography #shadows #storytelling #beffjarker #urban',
        media_type: 'IMAGE',
        timestamp: new Date(Date.now() - 259200000).toISOString(),
        like_count: 289,
        comments_count: 31
      },
      {
        id: 'mock_004',
        permalink: 'https://instagram.com/p/mock004/',
        media_url: 'https://picsum.photos/600/400?random=104',
        caption: '🌊 Experimenting with long exposure techniques at the pier. 30-second exposure with ND filters to get that silky water effect. #longexposure #seascape #technicalphotography #beffjarker',
        media_type: 'IMAGE',
        timestamp: new Date(Date.now() - 345600000).toISOString(),
        like_count: 445,
        comments_count: 62
      },
      {
        id: 'mock_005',
        permalink: 'https://instagram.com/p/mock005/',
        media_url: 'https://picsum.photos/600/600?random=105',
        caption: '🎭 Portrait session with Maria - exploring the interplay between natural and artificial light. This setup took 3 hours to perfect but the result speaks for itself. #portraitphotography #lightingsetup #beffjarker #portraits',
        media_type: 'IMAGE',
        timestamp: new Date(Date.now() - 432000000).toISOString(),
        like_count: 612,
        comments_count: 87
      },
      {
        id: 'mock_006',
        permalink: 'https://instagram.com/p/mock006/',
        media_url: 'https://picsum.photos/600/900?random=106',
        caption: '🌸 Macro Monday! Getting intimate with nature - this cherry blossom petal tells a whole story about spring\'s fleeting beauty. Shot at f/8 with extension tubes for maximum detail. #macrophotography #spring #details #beffjarker #nature',
        media_type: 'IMAGE',
        timestamp: new Date(Date.now() - 518400000).toISOString(),
        like_count: 378,
        comments_count: 43
      },
      {
        id: 'mock_007',
        permalink: 'https://instagram.com/p/mock007/',
        media_url: 'https://picsum.photos/600/600?random=107',
        caption: '🏙️ City lights and reflections - sometimes the best urban shots happen after midnight when the city breathes differently. This puddle became my composition partner tonight. #nightphotography #urban #reflections #beffjarker #citylife',
        media_type: 'IMAGE',
        timestamp: new Date(Date.now() - 604800000).toISOString(),
        like_count: 467,
        comments_count: 38
      },
      {
        id: 'mock_008',
        permalink: 'https://instagram.com/p/mock008/',
        media_url: 'https://picsum.photos/600/800?random=108',
        caption: '🦅 Wildlife photography ethics matter. This hawk was photographed from 50+ meters with a 600mm lens - no disturbance, just patience and respect. The shot took 4 hours of waiting but wildlife photography isn\'t about the rush. #wildlifephotography #ethics #patience #beffjarker #birds',
        media_type: 'IMAGE',
        timestamp: new Date(Date.now() - 691200000).toISOString(),
        like_count: 523,
        comments_count: 76
      },
      {
        id: 'mock_009',
        permalink: 'https://instagram.com/p/mock009/',
        media_url: 'https://picsum.photos/600/600?random=109',
        caption: '☕ Coffee shop chronicles - documenting the quiet moments between the rush. This barista\'s concentration while crafting latte art reminded me why I love documentary photography. Real moments > posed shots. #documentaryphotography #coffee #realmoments #beffjarker',
        media_type: 'IMAGE',
        timestamp: new Date(Date.now() - 777600000).toISOString(),
        like_count: 334,
        comments_count: 29
      },
      {
        id: 'mock_010',
        permalink: 'https://instagram.com/p/mock010/',
        media_url: 'https://picsum.photos/600/600?random=110',
        caption: '🎨 Behind the lens: My mobile editing setup for field work. iPad Pro + Apple Pencil + Lightroom Mobile = creativity anywhere. Sometimes the best editing happens right where you captured the moment. What\'s in your mobile kit? #mobileediting #workflow #beffjarker #lightroom #gear',
        media_type: 'CAROUSEL_ALBUM',
        timestamp: new Date(Date.now() - 864000000).toISOString(),
        like_count: 892,
        comments_count: 156
      }
    ];

    return of(mockData);
  }

  // Get user profile information
  getUserProfile(): Observable<any> {
    return this.http.get<any>(`${this.BACKEND_API_URL}/instagram/user`).pipe(
      catchError(error => {
        console.warn('Failed to fetch user profile:', error);
        return of({
          id: 'mock_user_id',
          username: 'beffjarker',
          name: 'Beff Jarker Photography',
          account_type: 'BUSINESS',
          media_count: 10,
          note: 'Mock data - backend not available'
        });
      })
    );
  }

  // Health check method
  checkBackendHealth(): Observable<any> {
    return this.http.get<any>(`${this.BACKEND_API_URL}/health`).pipe(
      catchError(error => {
        console.warn('Backend health check failed:', error);
        return of({
          status: 'backend_unavailable',
          using_mock_data: true,
          note: 'Backend server is not running'
        });
      })
    );
  }
}
