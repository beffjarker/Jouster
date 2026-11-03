import { LifeMapEntry } from '../../services/life-map.service';
import { buildEntryPopupHtml, buildFallbackPopupHtml, escapeHtml } from './map-popup';

describe('map-popup', () => {
  const payload = '<img src=x onerror="alert(1)">';

  const entry = (overrides: Partial<LifeMapEntry> = {}): LifeMapEntry => ({
    id: '1',
    title: 'Trip',
    description: 'Short',
    date: '2020-01-01',
    category: 'travel',
    location: { lat: 1, lng: 2, name: 'Here', city: 'Portland', state: 'OR' },
    images: [],
    tags: [],
    ...overrides,
  } as LifeMapEntry);

  it('escapes all HTML-significant characters', () => {
    expect(escapeHtml(`<a href="x" title='y'>&</a>`))
      .toBe('&lt;a href=&quot;x&quot; title=&#39;y&#39;&gt;&amp;&lt;/a&gt;');
    expect(escapeHtml(null)).toBe('');
    expect(escapeHtml(undefined)).toBe('');
  });

  it('escapes title, description and location in entry popups', () => {
    const html = buildEntryPopupHtml(entry({
      title: payload,
      description: payload,
      location: { lat: 1, lng: 2, name: 'x', city: payload, state: payload },
    }));
    expect(html).not.toContain('<img');
    expect(html).toContain('&lt;img src=x onerror=&quot;alert(1)&quot;&gt;');
  });

  it('truncates long descriptions before escaping', () => {
    const html = buildEntryPopupHtml(entry({ description: 'a'.repeat(200) }));
    expect(html).toContain(`${'a'.repeat(150)}...`);
  });

  it('escapes the fallback popup and supplies a default location message', () => {
    expect(buildFallbackPopupHtml(payload, payload)).not.toContain('<img');
    expect(buildFallbackPopupHtml('Home', '')).toContain('No entries in the selected date range');
  });
});
