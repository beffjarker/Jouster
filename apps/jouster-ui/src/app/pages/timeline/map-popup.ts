import { LifeMapEntry } from '../../services/life-map.service';
import { parseCalendarDate } from './calendar-date';

const HTML_ESCAPES = new Map<string, string>([
  ['&', '&amp;'],
  ['<', '&lt;'],
  ['>', '&gt;'],
  ['"', '&quot;'],
  ['\'', '&#39;'],
]);

/**
 * Escape a value for safe interpolation into HTML text or a quoted attribute.
 * Leaflet's `bindPopup` assigns string content via innerHTML, so every
 * user-controlled value placed in a popup must pass through this.
 */
export function escapeHtml(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => HTML_ESCAPES.get(ch) ?? ch);
}

/** Popup markup for a life-map entry marker; all entry fields are escaped. */
export function buildEntryPopupHtml(entry: LifeMapEntry): string {
  const description = entry.description || '';
  const excerpt = description.length > 150 ? `${description.slice(0, 150)}...` : description;
  const dateStr = parseCalendarDate(entry.date).toLocaleDateString();
  const place = `${entry.location?.city || ''}, ${entry.location?.state || ''}`;
  return `
        <div class="map-popup">
          <h4>${escapeHtml(entry.title)}</h4>
          <p>${escapeHtml(excerpt)}</p>
          <small>${escapeHtml(dateStr)} — ${escapeHtml(place)}</small>
        </div>
      `;
}

/** Popup markup for the fallback marker shown when no entries match the filters. */
export function buildFallbackPopupHtml(title: string, locationStr: string): string {
  return `
        <div class="map-popup">
          <h4>${escapeHtml(title)}</h4>
          <small>${escapeHtml(locationStr || 'No entries in the selected date range')}</small>
        </div>
      `;
}
