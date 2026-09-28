# NASA Section — Implementation Plan

**Date**: June 2, 2026  
**Status**: Planning  
**Location**: Left navigation menu → new "NASA" page in `jouster-ui`

---

## Overview

Add a **NASA** section to the left navigation menu that showcases data from NASA's Open APIs using the existing `NASA_API_KEY` in `.env`. This will be a new page at `/nasa` with multiple sub-sections powered by different NASA API endpoints.

---

## NASA API — Full Access Overview

The API key (`NASA_API_KEY`) provides authenticated access (**1,000 requests/hour**) to the following endpoints:

### 🌟 Tier 1 — High Visual Impact (Recommended for MVP)

| API | Endpoint | Description | Use Case |
|-----|----------|-------------|----------|
| **APOD** | `GET /planetary/apod` | Astronomy Picture of the Day — curated image/video with explanation | Hero section, daily featured content |
| **Mars Rover Photos** | `GET /mars-photos/api/v1/rovers/{rover}/photos` | Photos from Curiosity, Opportunity, Spirit | Photo gallery with rover/date filters |
| **EPIC** | `GET /EPIC/api/natural` | Full-disc Earth images from DSCOVR satellite | Earth visualization, date picker |
| **NASA Image Library** | `GET https://images-api.nasa.gov/search` | Search NASA's entire media archive | Search-powered media browser |

### 🔭 Tier 2 — Scientific Data

| API | Endpoint | Description | Use Case |
|-----|----------|-------------|----------|
| **Asteroids NeoWs** | `GET /neo/rest/v1/feed` | Near-Earth objects, close approaches by date | Interactive asteroid tracker/table |
| **DONKI** | `GET /DONKI/{type}` | Solar flares, CMEs, geomagnetic storms | Space weather dashboard |
| **Earth Imagery** | `GET /planetary/earth/imagery` | Landsat 8 satellite imagery by coordinates | Coordinate-based Earth viewer |
| **Exoplanet Archive** | External TAP service | Confirmed exoplanet data | Data table/visualization |

### 📚 Tier 3 — Reference/Catalog

| API | Endpoint | Description | Use Case |
|-----|----------|-------------|----------|
| **TechTransfer** | `GET /techtransfer/patent/` | NASA patents, software, spinoff tech | Searchable patent browser |
| **GeneLab** | External API | Space biology/genomics data | Scientific data display |
| **InSight (Mars Weather)** | `GET /insight_weather/` | Mars weather from InSight lander | Mars weather widget (may be EOL) |

### Rate Limits & Constraints

- **1,000 requests/hour** per key (vs. 30/hour for `DEMO_KEY`)
- Most endpoints return JSON; EPIC returns image URLs
- APOD sometimes returns video (YouTube embeds) instead of images
- Mars Rover: Curiosity is still active; Opportunity/Spirit are historical only

---

## Architecture Plan

### Pattern (matches existing pages)

The project uses a clean pattern:
1. **Page Registry** (`models/page-registry.ts`) — single source of truth for nav items
2. **Routes** (`app.routes.ts`) — lazy-loaded standalone components
3. **Service** (`services/nasa.service.ts`) — handles API calls via backend proxy
4. **Component** (`pages/nasa/`) — standalone page component

### File Changes

```
apps/jouster-ui/src/app/
├── models/page-registry.ts          # ADD NASA entry
├── app.routes.ts                    # ADD /nasa route
├── services/nasa.service.ts         # NEW — NASA API service
├── pages/nasa/                      # NEW — page folder
│   ├── nasa.component.ts
│   ├── nasa.component.html
│   ├── nasa.component.scss
│   └── nasa.component.spec.ts

apps/backend/src/
├── routes/nasa.routes.ts            # NEW — backend proxy routes
```

---

## Implementation Steps

### Phase 1: MVP (APOD + Infrastructure)

**Goal**: Get the NASA section visible in nav with one working feature.

#### Step 1: Register the page

```typescript
// models/page-registry.ts — add entry
{
  path: '/nasa',
  title: 'NASA',
  icon: '🚀',
  description: 'Space data & imagery',
  showTitleOnPage: true,
  requiresAuth: true,
  isPublic: false,
}
```

#### Step 2: Add the route

```typescript
// app.routes.ts
{
  path: 'nasa',
  data: routeData('/nasa'),
  loadComponent: () => import('./pages/nasa/nasa.component').then(m => m.NasaComponent),
  canActivate: [authGuard],
}
```

#### Step 3: Create backend proxy

The frontend should NOT call NASA APIs directly (exposes API key in browser). Create backend routes that proxy requests:

- `GET /api/nasa/apod` → forwards to `https://api.nasa.gov/planetary/apod`
- `GET /api/nasa/mars-photos` → forwards to Mars Rover API
- `GET /api/nasa/epic` → forwards to EPIC API
- `GET /api/nasa/neo` → forwards to NeoWs API

#### Step 4: Create NASA service

```typescript
// services/nasa.service.ts
@Injectable({ providedIn: 'root' })
export class NasaService {
  private http = inject(HttpClient);

  getApod(date?: string): Observable<ApodResponse> { ... }
  getMarsPhotos(rover: string, sol: number): Observable<MarsPhoto[]> { ... }
  getEpicImages(date?: string): Observable<EpicImage[]> { ... }
  getNearEarthObjects(startDate: string, endDate: string): Observable<NeoFeed> { ... }
}
```

#### Step 5: Create NASA page component

- Hero section: APOD (image + explanation)
- Sub-navigation tabs for different API sections

---

### Phase 2: Mars Rover Gallery

- Rover selector (Curiosity, Opportunity, Spirit)
- Sol (Martian day) or Earth date picker
- Camera filter (FHAZ, RHAZ, MAST, CHEMCAM, MAHLI, MARDI, NAVCAM)
- Responsive photo grid with lightbox

### Phase 3: Near-Earth Objects Tracker

- Date range picker for asteroid close approaches
- Table with: name, diameter, velocity, miss distance, hazardous flag
- Sort/filter capabilities
- Visual "danger scale" indicator

### Phase 4: EPIC Earth Viewer

- Date picker (images available ~daily)
- Full-disc Earth image display
- Metadata overlay (coordinates, date/time)
- Animation: cycle through images for a time-lapse effect

### Phase 5: Space Weather (DONKI)

- Solar flare timeline
- CME (Coronal Mass Ejection) events
- Geomagnetic storm alerts
- Visual activity indicator

---

## UI/UX Concepts

### Page Layout

```
┌─────────────────────────────────────────────┐
│ 🚀 NASA                                     │
├─────────────────────────────────────────────┤
│ [APOD] [Mars Rover] [Asteroids] [Earth] ... │  ← tab nav
├─────────────────────────────────────────────┤
│                                             │
│   ┌─────────────────────────────────────┐   │
│   │                                     │   │
│   │      Astronomy Picture of the Day   │   │
│   │            (hero image)             │   │
│   │                                     │   │
│   └─────────────────────────────────────┘   │
│                                             │
│   Title: "Nebula NGC 1234"                  │
│   Date: June 2, 2026                        │
│   Explanation: "This stunning..."           │
│                                             │
└─────────────────────────────────────────────┘
```

### Design Principles

- Dark theme friendly (space imagery looks great on dark backgrounds)
- Lazy-load images (Mars Rover can return 100+ photos)
- Cache responses (APOD changes daily; Mars photos are static)
- Graceful degradation when API is unavailable
- Loading skeletons for async content

---

## Data Models (TypeScript Interfaces)

```typescript
interface ApodResponse {
  date: string;
  explanation: string;
  hdurl?: string;
  media_type: 'image' | 'video';
  title: string;
  url: string;
  copyright?: string;
}

interface MarsPhoto {
  id: number;
  sol: number;
  img_src: string;
  earth_date: string;
  camera: { id: number; name: string; full_name: string };
  rover: { id: number; name: string; status: string };
}

interface NeoObject {
  id: string;
  name: string;
  estimated_diameter: { kilometers: { min: number; max: number } };
  is_potentially_hazardous_asteroid: boolean;
  close_approach_data: CloseApproach[];
}

interface EpicImage {
  identifier: string;
  caption: string;
  image: string;
  date: string;
  coords: { lat: number; lon: number };
}
```

---

## Testing Plan

- **Unit tests**: NASA service (mock HTTP), component rendering
- **Integration**: Backend proxy routes return expected shape
- **E2E**: Page loads, APOD displays, tabs navigate correctly
- **Coverage target**: ≥80% for service and component

---

## Dependencies

- **None new** — uses existing `HttpClient`, Angular standalone components
- **Optional**: Image lightbox library for Mars Rover gallery (or build custom)
- **Backend**: Standard Express route + `node-fetch` or `axios` for proxy

---

## Risks & Considerations

| Risk | Mitigation |
|------|------------|
| API rate limiting (1k/hr) | Backend caching (Redis or in-memory), stale-while-revalidate |
| APOD returns video not image | Handle `media_type === 'video'` with iframe embed |
| Mars Rover returns 0 photos for some sols | Show "No photos for this date" message |
| EPIC images are large (~2MB each) | Lazy load, use thumbnail endpoint first |
| NASA API downtime | Graceful error states, cached fallback |

---

## Success Criteria

- [ ] 🚀 emoji and "NASA" appears in left nav menu
- [ ] `/nasa` route loads with APOD displayed
- [ ] Backend proxy hides API key from browser
- [ ] At least APOD section fully functional with tests
- [ ] Responsive on mobile and desktop
- [ ] Loading states and error handling in place

---

## References

- NASA API docs: https://api.nasa.gov/
- APOD API: https://github.com/nasa/apod-api
- Mars Rover Photos: https://api.nasa.gov/mars-photos/
- EPIC: https://epic.gsfc.nasa.gov/about/api
- NeoWs: https://api.nasa.gov/neo/
- Existing page pattern: `apps/jouster-ui/src/app/pages/fibonacci/`
- Page registry: `apps/jouster-ui/src/app/models/page-registry.ts`

