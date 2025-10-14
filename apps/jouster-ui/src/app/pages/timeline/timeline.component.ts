import { Component, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as L from 'leaflet';

interface TimelineEvent {
  id: string;
  title: string;
  description: string;
  date: Date;
  location: {
    lat: number;
    lng: number;
    name: string;
  };
  category: 'personal' | 'work' | 'travel' | 'milestone' | 'other';
}

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
  public events: TimelineEvent[] = [];
  public filteredEvents: TimelineEvent[] = [];
  public selectedCategory = '';

  public newEvent = {
    title: '',
    description: '',
    dateString: new Date().toISOString().slice(0, 16),
    locationName: '',
    category: 'personal' as 'personal' | 'work' | 'travel' | 'milestone' | 'other',
    lat: 0,
    lng: 0
  };

  public ngOnInit() {
    this.loadEvents();
    this.filterEvents();
  }

  public ngAfterViewInit() {
    this.initializeMap();
  }

  public ngOnDestroy() {
    if (this.map) {
      this.map.remove();
    }
  }

  public initializeMap() {
    // Initialize the map centered on the world
    this.map = L.map('map').setView([20, 0], 2);

    // Add OpenStreetMap tiles (open system as requested)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '© OpenStreetMap contributors'
    }).addTo(this.map);

    // Add click handler for setting event location
    this.map.on('click', (e: L.LeafletMouseEvent) => {
      this.newEvent.lat = e.latlng.lat;
      this.newEvent.lng = e.latlng.lng;
      this.newEvent.locationName = `${e.latlng.lat.toFixed(4)}, ${e.latlng.lng.toFixed(4)}`;

      // Add temporary marker
      this.clearTemporaryMarkers();
      const tempMarker = L.marker([e.latlng.lat, e.latlng.lng])
        .addTo(this.map)
        .bindPopup('Selected location for new event');

      // Store reference to temp marker for later removal
      (tempMarker as any).isTemp = true;
    });

    // Add existing events to map
    this.addEventsToMap();
  }

  public addEventsToMap() {
    this.events.forEach(event => {
      const marker = L.marker([event.location.lat, event.location.lng])
        .addTo(this.map);

      marker.bindPopup(`
        <div class="map-popup">
          <h4>${event.title}</h4>
          <p>${event.description}</p>
          <small>${event.date.toLocaleDateString()}</small>
        </div>
      `);
    });
  }

  public clearTemporaryMarkers() {
    this.map.eachLayer((layer: any) => {
      if (layer instanceof L.Marker && (layer as any).isTemp) {
        this.map.removeLayer(layer);
      }
    });
  }

  public addEvent() {
    if (!this.newEvent.title) return;

    const event: TimelineEvent = {
      id: Date.now().toString(),
      title: this.newEvent.title,
      description: this.newEvent.description,
      date: new Date(this.newEvent.dateString),
      location: {
        lat: this.newEvent.lat || 0,
        lng: this.newEvent.lng || 0,
        name: this.newEvent.locationName || 'Unknown Location'
      },
      category: this.newEvent.category
    };

    this.events.push(event);
    this.saveEvents();
    this.filterEvents();

    // Add marker to map
    const marker = L.marker([event.location.lat, event.location.lng])
      .addTo(this.map);

    marker.bindPopup(`
      <div class="map-popup">
        <h4>${event.title}</h4>
        <p>${event.description}</p>
        <small>${event.date.toLocaleDateString()}</small>
      </div>
    `);

    // Reset form
    this.resetForm();
    this.clearTemporaryMarkers();
  }

  public resetForm() {
    this.newEvent = {
      title: '',
      description: '',
      dateString: new Date().toISOString().slice(0, 16),
      locationName: '',
      category: 'personal',
      lat: 0,
      lng: 0
    };
  }

  public clearForm() {
    this.resetForm();
  }

  public deleteEvent(id: string) {
    this.events = this.events.filter(event => event.id !== id);
    this.saveEvents();
    this.filterEvents();

    // Refresh map markers
    this.map.eachLayer((layer: any) => {
      if (layer instanceof L.Marker) {
        this.map.removeLayer(layer);
      }
    });
    this.addEventsToMap();
  }

  public filterEvents() {
    if (this.selectedCategory) {
      this.filteredEvents = this.events.filter(event => event.category === this.selectedCategory);
    } else {
      this.filteredEvents = [...this.events];
    }

    // Sort by date (newest first)
    this.filteredEvents.sort((a, b) => b.date.getTime() - a.date.getTime());
  }

  public sortEvents() {
    // Sort events by date (newest first)
    this.events.sort((a, b) => b.date.getTime() - a.date.getTime());
  }

  public viewOnMap(event: TimelineEvent) {
    this.focusOnEvent(event);
  }

  public editEvent(event: TimelineEvent) {
    // Populate the form with event data for editing
    this.newEvent = {
      title: event.title,
      description: event.description,
      dateString: event.date.toISOString().slice(0, 16),
      locationName: event.location.name,
      category: event.category,
      lat: event.location.lat,
      lng: event.location.lng
    };
  }

  public focusOnEvent(event: TimelineEvent) {
    this.map.setView([event.location.lat, event.location.lng], 10);

    // Find and open the popup for this event
    this.map.eachLayer((layer: any) => {
      if (layer instanceof L.Marker) {
        const latLng = layer.getLatLng();
        if (latLng.lat === event.location.lat && latLng.lng === event.location.lng) {
          layer.openPopup();
        }
      }
    });
  }

  public saveEvents() {
    localStorage.setItem('timeline-events', JSON.stringify(this.events));
  }

  public loadEvents() {
    const saved = localStorage.getItem('timeline-events');
    if (saved) {
      const parsedEvents = JSON.parse(saved);
      this.events = parsedEvents.map((event: any) => ({
        ...event,
        date: new Date(event.date)
      }));
    }
  }

  public getUniqueLocations() {
    return [...new Set(this.events.map(e => e.location.name))];
  }

  public getMostActiveMonth(): string {
    if (this.events.length === 0) return 'N/A';

    // Calculate most active month from events
    const months = this.events.map(e => e.date.getMonth());
    const monthCounts = months.reduce((acc, month) => {
      acc[month] = (acc[month] || 0) + 1;
      return acc;
    }, {} as {[key: number]: number});

    const mostActive = Object.keys(monthCounts).reduce((a, b) =>
      (monthCounts[Number(a)] || 0) > (monthCounts[Number(b)] || 0) ? a : b
    );

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                       'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return monthNames[Number(mostActive)] || 'N/A';
  }

  public getFavoriteCategory(): string {
    if (this.events.length === 0) return 'N/A';

    const categories = this.events.map(e => e.category);
    const categoryCounts = categories.reduce((acc, cat) => {
      acc[cat] = (acc[cat] || 0) + 1;
      return acc;
    }, {} as {[key: string]: number});

    return Object.keys(categoryCounts).reduce((a, b) =>
      (categoryCounts[a] || 0) > (categoryCounts[b] || 0) ? a : b
    ) || 'N/A';
  }

  // Keep sortOrder property
  public sortOrder: 'asc' | 'desc' = 'desc';
}
