import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { InstagramService, InstagramImage } from '../../services/instagram.service';
import { Observable } from 'rxjs';

interface InstagramEmbed {
  id: string;
  embedCode: string;
  caption: string;
  postUrl: string;
}

@Component({
  selector: 'jstr-highlights',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './highlights.component.html',
  styleUrls: ['./highlights.component.scss']
})
export class HighlightsComponent implements OnInit {
  public images$: Observable<InstagramImage[]>;
  public loading = true;
  public showEmbeds = false; // Start with portfolio gallery
  public showAddForm = false;

  // Instagram embed management
  public instagramEmbeds: InstagramEmbed[] = [
    // Sample embed (replace with real ones)
    {
      id: 'sample_1',
      embedCode: `<!-- Add real Instagram embed codes here -->
      <div style="text-align: center; padding: 20px; border: 2px dashed #ccc; border-radius: 8px;">
        <p>📱 <strong>Instagram Embed Placeholder</strong></p>
        <p>To add real @beffjarker posts:</p>
        <p>1. Go to instagram.com/beffjarker</p>
        <p>2. Click "..." on a post → "Embed"</p>
        <p>3. Copy embed code and paste it here</p>
      </div>`,
      caption: 'Sample embed - replace with real Instagram post',
      postUrl: 'https://instagram.com/beffjarker'
    }
  ];

  public newEmbedCode = '';
  public newEmbedCaption = '';
  public newEmbedUrl = '';

  constructor(
    private instagramService: InstagramService,
    private sanitizer: DomSanitizer
  ) {
    this.images$ = this.instagramService.getUserMedia();
  }

  public ngOnInit() {
    this.loadSavedEmbeds(); // Load saved embeds on component init
    setTimeout(() => {
      this.loading = false;
    }, 1000);
  }

  public toggleContent(showEmbeds: boolean) {
    this.showEmbeds = showEmbeds;
    this.showAddForm = false;
  }

  public getSafeHtml(html: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  public addEmbed() {
    if (this.newEmbedCode.trim()) {
      const newEmbed: InstagramEmbed = {
        id: `embed_${Date.now()}`,
        embedCode: this.newEmbedCode.trim(),
        caption: this.newEmbedCaption.trim() || 'Instagram post from @beffjarker',
        postUrl: this.newEmbedUrl.trim() || 'https://instagram.com/beffjarker'
      };

      this.instagramEmbeds.push(newEmbed);

      // Clear form
      this.newEmbedCode = '';
      this.newEmbedCaption = '';
      this.newEmbedUrl = '';
      this.showAddForm = false;

      // Save to localStorage for persistence
      localStorage.setItem('beffjarker_embeds', JSON.stringify(this.instagramEmbeds));
    }
  }

  // Load saved embeds from localStorage
  private loadSavedEmbeds() {
    const saved = localStorage.getItem('beffjarker_embeds');
    if (saved) {
      try {
        this.instagramEmbeds = JSON.parse(saved);
      } catch (e) {
        console.warn('Could not load saved Instagram embeds');
      }
    }
  }

  // Add missing utility methods for the gallery
  public getShortCaption(caption: string): string {
    if (!caption) return 'View this post on Instagram';
    return caption.length > 100 ? caption.substring(0, 100) + '...' : caption;
  }

  public formatDate(timestamp: string): string {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  public onImageLoad(_index: number) {
    // Handle image load event
  }

  public onImageError(index: number) {
    // Handle image error event
    console.warn(`Failed to load image at index ${index}`);
  }

  public startBackend() {
    // Provide instructions for starting the backend
    alert('To start the backend:\n\n1. Open a terminal\n2. Navigate to the backend folder\n3. Run: npm install\n4. Run: npm start\n\nThe backend will start on port 3000');
  }
}
