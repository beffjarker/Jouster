import { Component, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as L from 'leaflet';
import { LifeMapService, LifeMapEntry } from '../../services/life-map.service';

@Component({
  selector: 'jstr-timeline',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './timeline.component.html',
  styleUrls: ['./timeline.component.scss']
})
export class TimelineComponent implements OnInit, AfterViewInit, OnDestroy {
  public currentDate = new Date();
  private map!: L.Map;
  public entries: LifeMapEntry[] = [];
  public filteredEntries: LifeMapEntry[] = [];
  public selectedCategory = '';
  public selectedEntry: LifeMapEntry | null = null;
  public isLoading = true;
  public errorMessage = '';
  public sortOrder: 'asc' | 'desc' = 'asc';

  constructor(private lifeMapService: LifeMapService) {}

  public ngOnInit() {
    this.loadEntries();
  }

  public ngAfterViewInit() {
    this.initializeMap();
  }

  public ngOnDestroy() {
    if (this.map) {
      this.map.remove();
    }
  }

  /**
   * Load entries from DynamoDB via the backend API.
   */
  private loadEntries(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.lifeMapService.getEntries().subscribe({
      next: (entries) => {
        this.entries = entries;
        this.filterEntries();
        this.isLoading = false;

        // Add markers to map once data is loaded
        if (this.map) {
          this.addEventsToMap();
        }
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = 'Failed to load entries. Are you authenticated?';
        console.error('Life map load error:', err);
      }
    });
  }

  public initializeMap() {
    this.map = L.map('timeline-map').setView([43.5, -112], 7);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '© OpenStreetMap contributors'
    }).addTo(this.map);

    // If entries already loaded, add to map
    if (this.entries.length > 0) {
      this.addEventsToMap();
    }
  }

  public addEventsToMap() {
    // Clear existing markers
    this.map.eachLayer((layer: L.Layer) => {
      if (layer instanceof L.Marker) {
        this.map.removeLayer(layer);
      }
    });

    this.filteredEntries.forEach(entry => {
      if (!entry.location?.lat || !entry.location?.lng) return;

      const marker = L.marker([entry.location.lat, entry.location.lng])
        .addTo(this.map);

      const dateStr = new Date(entry.date).toLocaleDateString();
      marker.bindPopup(`
        <div class="map-popup">
          <h4>${entry.title}</h4>
          <p>${entry.description?.slice(0, 150) || ''}${entry.description?.length > 150 ? '...' : ''}</p>
          <small>${dateStr} — ${entry.location.city || ''}, ${entry.location.state || ''}</small>
        </div>
      `);
    });
  }

  public filterEntries() {
    if (this.selectedCategory) {
      this.filteredEntries = this.entries.filter(e => e.category === this.selectedCategory);
    } else {
      this.filteredEntries = [...this.entries];
    }

    // Sort by date
    this.filteredEntries.sort((a, b) => {
      const diff = new Date(a.date).getTime() - new Date(b.date).getTime();
      return this.sortOrder === 'asc' ? diff : -diff;
    });

    // Update map markers when filter changes
    if (this.map) {
      this.addEventsToMap();
    }
  }

  public sortEvents() {
    this.filterEntries();
  }

  public viewOnMap(entry: LifeMapEntry) {
    if (!entry.location?.lat || !entry.location?.lng) return;

    this.map.setView([entry.location.lat, entry.location.lng], 12);

    // Open popup for this entry
    this.map.eachLayer((layer: L.Layer) => {
      if (layer instanceof L.Marker) {
        const latLng = (layer as L.Marker).getLatLng();
        if (latLng.lat === entry.location.lat && latLng.lng === entry.location.lng) {
          (layer as L.Marker).openPopup();
        }
      }
    });
  }

  public selectEntry(entry: LifeMapEntry) {
    this.selectedEntry = this.selectedEntry?.id === entry.id ? null : entry;
  }

  public getUniqueLocations(): string[] {
    return [...new Set(this.entries.map(e => e.location?.city || 'Unknown').filter(Boolean))];
  }

  public getCategories(): string[] {
    return [...new Set(this.entries.map(e => e.category))];
  }

  public getMostActiveYear(): string {
    if (this.entries.length === 0) return 'N/A';
    const years = this.entries.map(e => new Date(e.date).getFullYear());
    const counts: Record<number, number> = {};
    years.forEach(y => counts[y] = (counts[y] || 0) + 1);
    const best = Object.entries(counts).reduce((a, b) => a[1] > b[1] ? a : b);
    return `${best[0]} (${best[1]})`;
  }

  public getDateRange(): string {
    if (this.entries.length === 0) return 'N/A';
    const first = new Date(this.entries[0].date).getFullYear();
    const last = new Date(this.entries[this.entries.length - 1].date).getFullYear();
    return `${first} – ${last}`;
  }
}
