import { Component, OnInit, OnDestroy, AfterViewInit, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as L from 'leaflet';
import { LifeMapService, LifeMapEntry } from '../../services/life-map.service';

@Component({
  selector: 'jstr-timeline',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './timeline.component.html',
  styleUrls: ['./leaflet.css', './timeline.component.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class TimelineComponent implements OnInit, AfterViewInit, OnDestroy {
  public currentDate = new Date();
  private map!: L.Map;
  public entries: LifeMapEntry[] = [];
  public filteredEntries: LifeMapEntry[] = [];
  public selectedCategory = '';
  public selectedCity = '';
  public selectedTag = '';
  public selectedYearStart: string = '';
  public selectedYearEnd: string = '';
  public showApproximate = true;
  public selectedEntry: LifeMapEntry | null = null;
  public isLoading = true;
  public errorMessage = '';
  public sortOrder: 'asc' | 'desc' = 'asc';
  private mapInitialized = false;

  constructor(private lifeMapService: LifeMapService) {}

  public ngOnInit() {
    this.loadEntries();
  }

  public ngAfterViewInit() {
    // Map init deferred until data loads and DOM is ready
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

        // Initialize map after DOM updates (ngIf removes the div while loading)
        // Use increasing delays to ensure Angular has rendered the *ngIf div
        setTimeout(() => {
          this.tryInitMap();
        }, 50);
        setTimeout(() => {
          this.tryInitMap();
        }, 500);
        setTimeout(() => {
          this.tryInitMap();
        }, 1500);
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = 'Failed to load entries. Are you authenticated?';
        console.error('Life map load error:', err);
      }
    });
  }

  /**
   * Attempt to initialize the map. Only sets mapInitialized on success.
   */
  private tryInitMap(): void {
    if (this.mapInitialized) return;
    const el = document.getElementById('timeline-map');
    if (!el) return; // DOM not ready yet, will retry
    this.initializeMap();
    this.mapInitialized = true;
  }

  public initializeMap() {

    try {
      this.map = L.map('timeline-map').setView([39, -105], 5);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(this.map);

      // Force size recalculation after DOM settles
      setTimeout(() => {
        if (this.map) {
          this.map.invalidateSize();
        }
      }, 300);

      setTimeout(() => {
        if (this.map) {
          this.map.invalidateSize();
        }
      }, 1000);

      // If entries already loaded, add to map
      if (this.entries.length > 0) {
        this.addEventsToMap();
      }
    } catch (e) {
      console.error('Map initialization error:', e);
    }
  }

  /**
   * Create a Leaflet marker icon using local assets.
   */
  private createMarkerIcon(): L.Icon {
    return L.icon({
      iconUrl: 'marker-icon.png',
      iconRetinaUrl: 'marker-icon-2x.png',
      shadowUrl: 'marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41],
    });
  }

  public addEventsToMap() {
    if (!this.map) return;

    // Clear existing markers
    this.map.eachLayer((layer: L.Layer) => {
      if (layer instanceof L.Marker) {
        this.map.removeLayer(layer);
      }
    });

    const bounds: L.LatLng[] = [];
    const markerIcon = this.createMarkerIcon();

    this.filteredEntries.forEach(entry => {
      // Check for valid coordinates (not null/undefined, and not 0,0)
      if (entry.location?.lat == null || entry.location?.lng == null) return;
      if (entry.location.lat === 0 && entry.location.lng === 0) return;

      const latLng = L.latLng(entry.location.lat, entry.location.lng);
      bounds.push(latLng);

      const marker = L.marker(latLng, { icon: markerIcon }).addTo(this.map);

      const dateStr = new Date(entry.date).toLocaleDateString();
      marker.bindPopup(`
        <div class="map-popup">
          <h4>${entry.title}</h4>
          <p>${entry.description?.slice(0, 150) || ''}${entry.description?.length > 150 ? '...' : ''}</p>
          <small>${dateStr} — ${entry.location.city || ''}, ${entry.location.state || ''}</small>
        </div>
      `);
    });

    // Auto-fit map to show all markers
    if (bounds.length > 0) {
      const latLngBounds = L.latLngBounds(bounds);
      this.map.fitBounds(latLngBounds, { padding: [30, 30], maxZoom: 12 });
    }
  }

  public filterEntries() {
    let result = [...this.entries];

    // Category filter
    if (this.selectedCategory) {
      result = result.filter(e => e.category === this.selectedCategory);
    }

    // City filter
    if (this.selectedCity) {
      result = result.filter(e => e.location?.city === this.selectedCity);
    }

    // Tag filter
    if (this.selectedTag) {
      result = result.filter(e => e.tags?.includes(this.selectedTag));
    }

    // Year range filter
    if (this.selectedYearStart) {
      const startYear = parseInt(this.selectedYearStart, 10);
      result = result.filter(e => {
        const year = new Date(e.date).getFullYear();
        return !isNaN(year) && year >= startYear;
      });
    }
    if (this.selectedYearEnd) {
      const endYear = parseInt(this.selectedYearEnd, 10);
      result = result.filter(e => {
        const year = new Date(e.date).getFullYear();
        return !isNaN(year) && year <= endYear;
      });
    }

    // Approximate dates toggle
    if (!this.showApproximate) {
      result = result.filter(e => !e.tags?.includes('date-approximate'));
    }

    // Sort by date
    result.sort((a, b) => {
      const diff = new Date(a.date).getTime() - new Date(b.date).getTime();
      return this.sortOrder === 'asc' ? diff : -diff;
    });

    this.filteredEntries = result;

    // Update map markers when filter changes
    if (this.map) {
      this.addEventsToMap();
    }
  }

  public sortEvents() {
    this.filterEntries();
  }

  public clearFilters() {
    this.selectedCategory = '';
    this.selectedCity = '';
    this.selectedTag = '';
    this.selectedYearStart = '';
    this.selectedYearEnd = '';
    this.showApproximate = true;
    this.filterEntries();
  }

  public hasActiveFilters(): boolean {
    return !!(this.selectedCategory || this.selectedCity || this.selectedTag ||
      this.selectedYearStart || this.selectedYearEnd || !this.showApproximate);
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

  public getCities(): string[] {
    return [...new Set(this.entries.map(e => e.location?.city).filter(Boolean))].sort() as string[];
  }

  public getTags(): string[] {
    const allTags = this.entries.flatMap(e => e.tags || []);
    return [...new Set(allTags)].sort();
  }

  public getYears(): number[] {
    const years = this.entries
      .map(e => new Date(e.date).getFullYear())
      .filter(y => !isNaN(y));
    return [...new Set(years)].sort((a, b) => a - b);
  }

  public getUniqueLocations(): string[] {
    return [...new Set(this.entries.map(e => e.location?.city || 'Unknown').filter(Boolean))];
  }

  public getCategories(): string[] {
    return [...new Set(this.entries.map(e => e.category))];
  }

  public getMostActiveYear(): string {
    if (this.entries.length === 0) return 'N/A';
    const years = this.entries.map(e => new Date(e.date).getFullYear()).filter(y => !isNaN(y));
    const counts: Record<number, number> = {};
    years.forEach(y => counts[y] = (counts[y] || 0) + 1);
    const best = Object.entries(counts).reduce((a, b) => a[1] > b[1] ? a : b);
    return `${best[0]} (${best[1]})`;
  }

  public getDateRange(): string {
    if (this.entries.length === 0) return 'N/A';
    const years = this.entries
      .map(e => new Date(e.date).getFullYear())
      .filter(y => !isNaN(y));
    if (years.length === 0) return 'N/A';
    const first = Math.min(...years);
    const last = Math.max(...years);
    return `${first} – ${last}`;
  }
}
