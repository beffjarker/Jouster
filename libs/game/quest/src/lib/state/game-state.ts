import { ClassId, Facing, totalXpForLevel } from '@jouster/game/engine';
import { CLASS_ORDER, classDef } from '../data/classes';
import { companionDef } from '../data/companions';
import { WEAPONS } from '../data/equipment';
import { PartyMember, createMember } from './party';

export const SAVE_VERSION = 1;
export const SAVE_KEY = 'jouster-quest-save-v1';
export const MAX_PARTY = 3;
export const STARTING_GOLD = 50;
export const STARTING_HERBS = 3;

export interface GameState {
  version: number;
  party: PartyMember[];
  gold: number;
  inventory: Record<string, number>;
  flags: Record<string, boolean>;
  /** Levels of companions who left the party (so they rejoin at least at that level). */
  companionLevels: Record<string, number>;
  mapId: string;
  x: number;
  y: number;
  facing: Facing;
  steps: number;
  stepsSinceBattle: number;
  playSeconds: number;
}

/** Minimal storage shape (window.localStorage or a test double). */
export interface SaveStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** In-memory `SaveStorage` (fallback when localStorage is unavailable, and for tests). */
export function memoryStorage(): SaveStorage {
  const data = new Map<string, string>();
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key),
  };
}

export function newGameState(heroName: string, classId: ClassId): GameState {
  return {
    version: SAVE_VERSION,
    party: [createMember('hero', heroName, classId, 1)],
    gold: STARTING_GOLD,
    inventory: { herb: STARTING_HERBS + classDef(classId).bonusHerbs },
    flags: {},
    companionLevels: {},
    mapId: 'aldmere',
    x: 4,
    y: 5,
    facing: 'up',
    steps: 0,
    stepsSinceBattle: 0,
    playSeconds: 0,
  };
}

export function inParty(state: GameState, companionId: string): boolean {
  return state.party.some((m) => m.id === companionId);
}

/** True when the companion is waiting at their home spot (unlocked and not in the party). */
export function companionAvailable(state: GameState, companionId: string): boolean {
  const def = companionDef(companionId);
  return !inParty(state, companionId) && (!def.requiresFlag || state.flags[def.requiresFlag] === true);
}

/**
 * Creates a fixed-class companion at the hero's level. Companions who left the party and
 * rejoin keep their own level (stored in `companionLevels`) if it is higher.
 */
export function createCompanion(state: GameState, companionId: string): PartyMember {
  const def = companionDef(companionId);
  const level = Math.max(state.party[0]?.level ?? 1, state.companionLevels[companionId] ?? 1);
  const member = createMember(def.id, def.name, def.classId, level);
  member.xp = totalXpForLevel(level);
  return member;
}

/** Adds a companion, or swaps out `replaceId` when the party is full. Returns false if not possible. */
export function recruitCompanion(state: GameState, companionId: string, replaceId?: string): boolean {
  if (!companionAvailable(state, companionId)) {
    return false;
  }
  if (state.party.length >= MAX_PARTY) {
    const idx = state.party.findIndex((m) => m.id === replaceId && m.id !== 'hero');
    if (idx < 0) {
      return false;
    }
    const leaving = state.party[idx];
    state.companionLevels[leaving.id] = leaving.level;
    state.party.splice(idx, 1);
  }
  state.party.push(createCompanion(state, companionId));
  return true;
}

export function addItem(state: GameState, itemId: string, count = 1): void {
  state.inventory[itemId] = (state.inventory[itemId] ?? 0) + count;
}

export function saveGame(storage: SaveStorage, state: GameState): boolean {
  try {
    storage.setItem(SAVE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

/** Loads and validates a save. Returns null when missing, corrupt or from another version. */
export function loadGame(storage: SaveStorage): GameState | null {
  let raw: string | null;
  try {
    raw = storage.getItem(SAVE_KEY);
  } catch {
    return null;
  }
  if (!raw) {
    return null;
  }
  try {
    const data = JSON.parse(raw) as Partial<GameState>;
    return isValidState(data) ? data : null;
  } catch {
    return null;
  }
}

export function hasSave(storage: SaveStorage): boolean {
  return loadGame(storage) !== null;
}

function isValidState(s: Partial<GameState>): s is GameState {
  if (s.version !== SAVE_VERSION || !Array.isArray(s.party) || s.party.length < 1 || s.party.length > MAX_PARTY) {
    return false;
  }
  const membersOk = s.party.every(
    (m) =>
      typeof m?.name === 'string' &&
      CLASS_ORDER.includes(m.classId) &&
      WEAPONS.has(m.weaponId) &&
      Number.isFinite(m.level) &&
      Number.isFinite(m.hp) &&
      Number.isFinite(m.mp),
  );
  return (
    membersOk &&
    typeof s.gold === 'number' &&
    typeof s.mapId === 'string' &&
    typeof s.x === 'number' &&
    typeof s.y === 'number' &&
    typeof s.inventory === 'object' &&
    s.inventory !== null &&
    typeof s.flags === 'object' &&
    s.flags !== null &&
    typeof s.companionLevels === 'object' &&
    s.companionLevels !== null
  );
}
