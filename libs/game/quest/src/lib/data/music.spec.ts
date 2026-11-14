import { parseTrack, stepDuration } from '@jouster/game/engine';
import { MAPS, mapDef } from './maps';
import { MusicId, TRACKS, musicForMap, musicTrack } from './music';

describe('music', () => {
  it('has well-formed tracks: same-length voices, keyed by their own id, in a sensible tempo', () => {
    for (const [id, track] of Object.entries(TRACKS)) {
      expect(track.id).toBe(id);
      const voices = parseTrack(track);
      // Whole 4/4 bars of eighth notes, so loops line up.
      expect(voices[0].length % 8).toBe(0);
      expect(stepDuration(track)).toBeGreaterThan(0.15);
      expect(stepDuration(track)).toBeLessThan(0.4);
      for (const voice of track.voices) {
        expect(voice.volume).toBeGreaterThan(0);
        expect(voice.volume).toBeLessThanOrEqual(0.08);
      }
    }
  });

  it('keeps notes within an audible chiptune range', () => {
    for (const track of Object.values(TRACKS)) {
      for (const voice of parseTrack(track)) {
        for (const note of voice.notes) {
          expect(note.freq === 0 || (note.freq >= 25 && note.freq <= 2000)).toBe(true);
        }
      }
    }
  });

  it('gives every map a theme: towns, caves and each region', () => {
    for (const def of MAPS.values()) {
      expect(TRACKS[musicForMap(def)]).toBeDefined();
    }
    const expected: Record<string, MusicId> = {
      overworld: 'overworld',
      southlands: 'southlands',
      frostpeaks: 'frostpeaks',
      embermountains: 'embermountains',
      aldmere: 'town',
      brookhollow: 'town',
      sandhollow: 'town',
      frostgate: 'town',
      emberwatch: 'town',
      goblinCave: 'dungeon',
      wolfDen: 'dungeon',
      sunShrine: 'dungeon',
      mireShrine: 'dungeon',
      wyvernRoost: 'dungeon',
      vyrmorthLair: 'dungeon',
    };
    for (const [id, music] of Object.entries(expected)) {
      expect(musicForMap(mapDef(id))).toBe(music);
    }
  });

  it('looks tracks up by scene music id', () => {
    expect(musicTrack('battle')).toBe(TRACKS.battle);
    expect(musicTrack(null)).toBeNull();
    expect(musicTrack('')).toBeNull();
    expect(musicTrack('toString')).toBeNull();
  });
});
