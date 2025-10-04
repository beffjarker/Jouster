import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InstagramService, InstagramImage } from '../../services/instagram.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-highlights',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page-container">
      <h1>Highlights from @beffjarker</h1>
      <div class="instagram-notice">
        <p class="notice-text">
          <strong>Backend API Solution:</strong> I've created a Node.js backend that fetches real @beffjarker posts server-side,
          bypassing CORS restrictions. Start the backend server to see authentic Instagram content!
        </p>
        <div class="notice-actions">
          <a
            href="https://instagram.com/beffjarker"
            target="_blank"
            rel="noopener noreferrer"
            class="instagram-link"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
            </svg>
            Visit Real @beffjarker Profile
          </a>
          <button
            class="console-link"
            (click)="startBackend()"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L2 7v10c0 5.55 3.84 9.49 9 9.49s9-3.94 9-9.49V7l-10-5zM9 12H7v-2h2v2zm4 0h-2v-2h2v2zm4 0h-2v-2h2v2z"/>
            </svg>
            Start Backend Server Instructions
          </button>
        </div>
      </div>

      <div class="loading" *ngIf="loading">
        <div class="spinner"></div>
        <p>Loading Instagram highlights...</p>
      </div>

      <div class="instagram-grid" *ngIf="!loading">
        <div class="instagram-item" *ngFor="let image of images$ | async; let i = index">
          <div class="image-container">
            <img
              [src]="image.media_url"
              [alt]="image.caption || 'Instagram image'"
              (load)="onImageLoad(i)"
              (error)="onImageError(i)"
            >
            <div class="image-overlay">
              <div class="image-info">
                <p class="caption">{{ getShortCaption(image.caption) }}</p>
                <span class="date">{{ formatDate(image.timestamp) }}</span>
              </div>
              <a
                [href]="image.permalink"
                target="_blank"
                rel="noopener noreferrer"
                class="view-on-instagram"
                aria-label="View on Instagram"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>

      <div class="empty-state" *ngIf="!loading && (images$ | async)?.length === 0">
        <p>No images available at the moment. Please try again later.</p>
      </div>
    </div>
  `,
  styleUrls: ['./highlights.component.scss']
})
export class HighlightsComponent implements OnInit {
  images$: Observable<InstagramImage[]>;
  loading = true;

  constructor(private instagramService: InstagramService) {
    this.images$ = this.instagramService.getTopImages();
  }

  ngOnInit() {
    // Simulate loading delay for better UX
    setTimeout(() => {
      this.loading = false;
    }, 1500);
  }

  getShortCaption(caption: string): string {
    if (!caption) return '';
    return caption.length > 80 ? caption.substring(0, 80) + '...' : caption;
  }

  formatDate(timestamp: string): string {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  onImageLoad(index: number) {
    // Handle successful image load
    console.log(`Image ${index + 1} loaded successfully`);
  }

  onImageError(index: number) {
    // Handle image load error
    console.error(`Failed to load image ${index + 1}`);
  }

  startBackend() {
    // Provide specific instructions for the backend server we just created
    console.log('🚀 Backend API Instructions for @beffjarker Instagram Posts:');
    console.log('1. Open a new terminal/command prompt');
    console.log('2. Navigate to the backend folder: cd H:\\projects\\Jouster\\backend');
    console.log('3. Start the server: npm start');
    console.log('4. The API will run on: http://localhost:3001');
    console.log('5. Refresh this page to see real Instagram posts!');
    console.log('📡 API endpoint: http://localhost:3001/api/instagram/beffjarker');

    const instructions = `Backend Server Instructions:

1. Open a new terminal/command prompt
2. Run: cd H:\\projects\\Jouster\\backend
3. Run: npm start
4. Wait for "🚀 Jouster Backend API running on http://localhost:3001"
5. Refresh this page to see real @beffjarker posts!

The backend server will fetch Instagram data server-side, bypassing CORS restrictions.`;

    alert(instructions);
  }
}
