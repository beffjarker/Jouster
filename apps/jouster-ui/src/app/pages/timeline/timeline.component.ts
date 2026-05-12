import { Component, OnInit, OnDestroy, AfterViewInit, ViewChild, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as L from 'leaflet';
import { LifeMapService, LifeMapEntry } from '../../services/life-map.service';
import { TimelineSliderComponent } from '../../components/timeline-slider/timeline-slider.component';
import { PageTitleComponent } from '../../components/page-title/page-title.component';
import { SearchableSelectComponent } from '@jouster/shared/ui';

@Component({
  selector: 'jstr-timeline',
  standalone: true,
  imports: [CommonModule, FormsModule, TimelineSliderComponent, PageTitleComponent, SearchableSelectComponent],
  templateUrl: './timeline.component.html',
  styleUrls: ['./leaflet.css', './timeline.component.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class TimelineComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild(TimelineSliderComponent) sliderComponent?: TimelineSliderComponent;

  public currentDate = new Date();
  /** Birth date — slider minimum. Source: dev-tools/scripts/insert-life-events.js */
  public birthDate = new Date('1978-04-02');
  private map!: L.Map;
  private markerMap = new Map<string, L.Marker>();
  public entries: LifeMapEntry[] = [];
  public filteredEntries: LifeMapEntry[] = [];
  public selectedCategory = '';
  public selectedCity = '';
  public selectedTag = '';
  public sliderStartDate: Date | null = null;
  public sliderEndDate: Date | null = null;
  public showApproximate = true;
  public selectedEntry: LifeMapEntry | null = null;
  public fallbackEntry: LifeMapEntry | null = null;
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
      const center = this.getDefaultMapCenter();
      this.map = L.map('timeline-map').setView(center, 10);

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
   * Get the default map center from the latest residence entry.
   * Falls back to the latest entry of any category, then US center.
   */
  private getDefaultMapCenter(): [number, number] {
    const entry = this.getDefaultFallbackEntry();
    if (entry) {
      return [entry.location.lat, entry.location.lng];
    }
    return [39.8283, -98.5795];
  }

  /**
   * Get the latest residence entry with valid coordinates for fallback display.
   */
  private getDefaultFallbackEntry(): LifeMapEntry | null {
    const validEntries = this.entries
      .filter(e => e.location?.lat != null && e.location?.lng != null
        && !(e.location.lat === 0 && e.location.lng === 0))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return validEntries.find(e => e.category === 'residence')
      || validEntries[0]
      || null;
  }

  /**
   * Literary color palette — maps category names to hex colors.
   * Each color is drawn from a literary work whose themes resonate with the category.
   */
  private readonly categoryColors: Record<string, string> = {
    personal: '#3498db',     // Wonderland Blue (Lewis Carroll)
    work: '#5d6d7e',         // Bartleby Slate (Herman Melville)
    travel: '#f39c12',       // Nautilus Gold (Jules Verne)
    milestone: '#2ecc71',    // Emerald City (L. Frank Baum)
    other: '#9b59b6',        // Usher Violet (Edgar Allan Poe)
    health: '#1abc9c',       // Frankenstein Teal (Mary Shelley)
    legal: '#e67e22',        // Dracula Amber (Bram Stoker)
    education: '#8e44ad',    // Cheshire Purple (Lewis Carroll)
    church: '#2980b9',       // Meditations Blue (Marcus Aurelius)
    career: '#2c3e50',       // Prince Iron (Niccolò Machiavelli)
    residence: '#d4a574',    // Hobbit Hearth (J.R.R. Tolkien)
    family: '#e74c3c',       // Little Women Red (Louisa May Alcott)
    relationship: '#e08283', // Pride & Prejudice Coral (Jane Austen)
    financial: '#6c7a3a',    // Gatsby Olive (F. Scott Fitzgerald)
    creative: '#d35400',     // Fahrenheit Orange (Ray Bradbury)
    spiritual: '#4a3680',    // Siddhartha Indigo (Hermann Hesse)
    military: '#7f8c8d',     // War & Peace Steel (Leo Tolstoy)
  };

  /**
   * Create a Leaflet DivIcon colored by category using an inline SVG marker pin.
   */
  private createCategoryIcon(category: string): L.DivIcon {
    const color = this.categoryColors[category] || '#3498db';
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="25" height="41" viewBox="0 0 25 41">
        <path d="M12.5 0C5.6 0 0 5.6 0 12.5C0 21.9 12.5 41 12.5 41S25 21.9 25 12.5C25 5.6 19.4 0 12.5 0Z"
              fill="${color}" stroke="#fff" stroke-width="1.5"/>
        <circle cx="12.5" cy="12.5" r="5" fill="#fff" opacity="0.9"/>
      </svg>`;

    return L.divIcon({
      html: svg,
      className: 'category-marker',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
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
    this.markerMap.clear();

    const bounds: L.LatLng[] = [];

    this.filteredEntries.forEach(entry => {
      // Check for valid coordinates (not null/undefined, and not 0,0)
      if (entry.location?.lat == null || entry.location?.lng == null) return;
      if (entry.location.lat === 0 && entry.location.lng === 0) return;

      const latLng = L.latLng(entry.location.lat, entry.location.lng);
      bounds.push(latLng);

      const icon = this.createCategoryIcon(entry.category);
      const marker = L.marker(latLng, { icon }).addTo(this.map);

      const dateStr = new Date(entry.date).toLocaleDateString();
      marker.bindPopup(`
        <div class="map-popup">
          <h4>${entry.title}</h4>
          <p>${entry.description?.slice(0, 150) || ''}${entry.description?.length > 150 ? '...' : ''}</p>
          <small>${dateStr} — ${entry.location.city || ''}, ${entry.location.state || ''}</small>
        </div>
      `);

      // Store marker by entry ID for direct lookup
      this.markerMap.set(entry.id, marker);
    });

    // Auto-fit map to show all markers
    if (bounds.length > 0) {
      this.fallbackEntry = null;
      const latLngBounds = L.latLngBounds(bounds);
      this.map.fitBounds(latLngBounds, { padding: [30, 30], maxZoom: 12 });
    } else {
      // No filtered entries — show latest residence as a fallback marker
      this.fallbackEntry = this.getDefaultFallbackEntry();
      const center = this.getDefaultMapCenter();
      const latLng = L.latLng(center[0], center[1]);
      const icon = this.createCategoryIcon('residence');
      const marker = L.marker(latLng, { icon }).addTo(this.map);
      const fallbackTitle = this.fallbackEntry?.title || 'Current Location';
      const fallbackCity = this.fallbackEntry?.location?.city || '';
      const fallbackState = this.fallbackEntry?.location?.state || '';
      const locationStr = [fallbackCity, fallbackState].filter(Boolean).join(', ');
      marker.bindPopup(`
        <div class="map-popup">
          <h4>${fallbackTitle}</h4>
          <small>${locationStr || 'No entries in the selected date range'}</small>
        </div>
      `);
      this.map.setView(latLng, 10);
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

    // Date range filter (driven by the timeline slider)
    if (this.sliderStartDate) {
      result = result.filter(e => new Date(e.date) >= this.sliderStartDate!);
    }
    if (this.sliderEndDate) {
      result = result.filter(e => new Date(e.date) <= this.sliderEndDate!);
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

  public onCategoryChange(value: string): void {
    this.selectedCategory = value;
    this.autoExpandIfNeeded();
    this.filterEntries();
  }

  public onCityChange(value: string): void {
    this.selectedCity = value;
    this.autoExpandIfNeeded();
    this.filterEntries();
  }

  public onTagChange(value: string): void {
    this.selectedTag = value;
    this.autoExpandIfNeeded();
    this.filterEntries();
  }

  /**
   * If the current filters match entries outside the slider range,
   * auto-expand the slider to include them.
   */
  private autoExpandIfNeeded(): void {
    if (!this.selectedCategory && !this.selectedCity && !this.selectedTag) return;

    // Apply category/city/tag filters (but NOT date range)
    let candidates = [...this.entries];
    if (this.selectedCategory) {
      candidates = candidates.filter(e => e.category === this.selectedCategory);
    }
    if (this.selectedCity) {
      candidates = candidates.filter(e => e.location?.city === this.selectedCity);
    }
    if (this.selectedTag) {
      candidates = candidates.filter(e => e.tags?.includes(this.selectedTag));
    }
    if (!this.showApproximate) {
      candidates = candidates.filter(e => !e.tags?.includes('date-approximate'));
    }

    if (candidates.length === 0) return;

    // Check if any candidates fall outside current slider range
    const dates = candidates.map(e => new Date(e.date));
    const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));

    const needsExpand =
      (this.sliderStartDate && minDate < this.sliderStartDate) ||
      (this.sliderEndDate && maxDate > this.sliderEndDate);

    if (needsExpand && this.sliderComponent) {
      // Expand to cover all matching entries
      const newStart = this.sliderStartDate && minDate < this.sliderStartDate ? minDate : this.sliderStartDate!;
      const newEnd = this.sliderEndDate && maxDate > this.sliderEndDate ? maxDate : this.sliderEndDate!;
      this.sliderComponent.setRange(newStart, newEnd);
    }
  }

  /**
   * Handle date range changes from the timeline slider.
   * Called on slider init (default range) and on every drag.
   */
  public onSliderRangeChange(range: { start: Date; end: Date }): void {
    this.sliderStartDate = range.start;
    this.sliderEndDate = range.end;
    this.filterEntries();
  }

  public clearFilters() {
    this.selectedCategory = '';
    this.selectedCity = '';
    this.selectedTag = '';
    this.showApproximate = true;
    // Reset slider to its default range (last 2 years)
    if (this.sliderComponent) {
      this.sliderComponent.reset();
    }
    this.filterEntries();
  }

  public hasActiveFilters(): boolean {
    return !!(this.selectedCategory || this.selectedCity || this.selectedTag || !this.showApproximate);
  }

  public viewOnMap(entry: LifeMapEntry) {
    if (!this.map || !entry.location?.lat || !entry.location?.lng) return;

    this.map.setView([entry.location.lat, entry.location.lng], 14);

    // Close any open popup first, then open the correct one by entry ID
    this.map.closePopup();
    const marker = this.markerMap.get(entry.id);
    if (marker) {
      marker.openPopup();
    }
  }

  public selectEntry(entry: LifeMapEntry) {
    this.selectedEntry = this.selectedEntry?.id === entry.id ? null : entry;

    // Focus map on the selected entry's marker
    if (this.selectedEntry) {
      this.viewOnMap(this.selectedEntry);
    }
  }

  public getCities(): string[] {
    return [...new Set(this.dateFilteredEntries().map(e => e.location?.city).filter(Boolean))].sort() as string[];
  }

  public getTags(): string[] {
    const allTags = this.dateFilteredEntries().flatMap(e => e.tags || []);
    return [...new Set(allTags)].sort();
  }


  public getUniqueLocations(): string[] {
    return [...new Set(this.entries.map(e => e.location?.city || 'Unknown').filter(Boolean))];
  }

  public getCategories(): string[] {
    return [...new Set(this.dateFilteredEntries().map(e => e.category))];
  }

  /**
   * Returns entries filtered only by the current date range (not by category/city/tag).
   * Used to populate dropdown options so they reflect what's visible in the slider range.
   */
  private dateFilteredEntries(): LifeMapEntry[] {
    let result = [...this.entries];
    if (this.sliderStartDate) {
      result = result.filter(e => new Date(e.date) >= this.sliderStartDate!);
    }
    if (this.sliderEndDate) {
      result = result.filter(e => new Date(e.date) <= this.sliderEndDate!);
    }
    if (!this.showApproximate) {
      result = result.filter(e => !e.tags?.includes('date-approximate'));
    }
    return result;
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
