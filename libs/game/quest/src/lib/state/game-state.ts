import { ClassId, Facing, Rng, createRng, timeSeed, totalXpForLevel } from '@jouster/game/engine';
import { CLASS_ORDER, classDef } from '../data/classes';
import { COMPANION_SLOTS, CompanionInfo, companionSlot, rollCompanions } from '../data/companions';
import { WEAPONS } from '../data/equipment';
import { PartyMember, createMember } from './party';

export const SAVE_VERSION = 3;
/** Older save versions that loadGame can migrate. */
const MIGRATABLE_VERSIONS: readonly number[] = [2];
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
  /** Companion rolled for each companion slot at the start of this playthrough. */
  companions: Record<string, CompanionInfo>;
  /** Explored tiles per fogged map, as a bitset of 32-bit words (row-major, see `state/fog.ts`). */
  explored: Record<string, number[]>;
  /** Companion side-quest progress per companion slot. */
  quests: Record<string, QuestStatus>;
  mapId: string;
  x: number;
  y: number;
  facing: Facing;
  steps: number;
  stepsSinceBattle: number;
  playSeconds: number;
}

/**
 * Stored companion side-quest progress (missing = not offered yet). `available` = offered but declined,
 * `active` = accepted, `ready` = mini-boss beaten (turn in), `done` = rewarded.
 */
export type QuestStatus = 'available' | 'active' | 'ready' | 'done';

/** Quest stage as the player sees it (plan 15.6); `locked` = before the Goblin King falls. */
export type QuestStage = 'locked' | 'available' | 'active' | 'ready' | 'done';

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

/** Starts a new journey. The companion roster is rolled with `rng` (random when omitted). */
export function newGameState(heroName: string, classId: ClassId, rng: Rng = createRng(timeSeed())): GameState {
  return {
    version: SAVE_VERSION,
    party: [createMember('hero', heroName, classId, 1)],
    gold: STARTING_GOLD,
    inventory: { herb: STARTING_HERBS + classDef(classId).bonusHerbs },
    flags: {},
    companionLevels: {},
    companions: rollCompanions(classId, rng),
    explored: {},
    quests: {},
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
export function companionPresent(state: GameState, companionId: string): boolean {
  const slot = companionSlot(companionId);
  return (
    companionId in state.companions &&
    !inParty(state, companionId) &&
    (!slot.requiresFlag || state.flags[slot.requiresFlag] === true)
  );
}

/**
 * True when a present companion is willing to join: the Goblin King has fallen and the
 * companion's side quest is done (companions who were in the party before always rejoin).
 */
export function companionAvailable(state: GameState, companionId: string): boolean {
  return (
    companionPresent(state, companionId) &&
    state.flags['bossDefeated'] === true &&
    state.quests[companionId] === 'done'
  );
}

/**
 * The stage of a companion's side quest. A mini-boss beaten before the quest was accepted (only possible in
 * older saves) counts as `ready`, so the reward is never lost.
 */
export function questStage(state: GameState, companionId: string): QuestStage {
  const status = state.quests[companionId];
  if (status === 'done') {
    return 'done';
  }
  if (state.flags['bossDefeated'] !== true && status === undefined) {
    return 'locked';
  }
  if (status === 'ready' || state.flags[companionSlot(companionId).quest.doneFlag] === true) {
    return 'ready';
  }
  return status === 'active' ? 'active' : 'available';
}

/** True while the companion's quest is accepted and its mini-boss is still out there. */
export function questActive(state: GameState, companionId: string): boolean {
  return questStage(state, companionId) === 'active';
}

/** The player said YES (`accept`) or NO to a companion's request. */
export function answerCompanionQuest(state: GameState, companionId: string, accept: boolean): void {
  if (questStage(state, companionId) === 'available') {
    state.quests[companionId] = accept ? 'active' : 'available';
  }
}

/**
 * Called when a mini-boss falls: moves the matching active quest to `ready`. Returns the companion slot id
 * so the scene can say who to return to, or null if no quest was waiting on that flag.
 */
export function markQuestReady(state: GameState, defeatFlag: string): string | null {
  const slot = COMPANION_SLOTS.find((c) => c.quest.doneFlag === defeatFlag);
  if (!slot || state.quests[slot.id] !== 'active') {
    return null;
  }
  state.quests[slot.id] = 'ready';
  return slot.id;
}

/** Turns in a `ready` quest: grants the reward once and marks it done. Returns false otherwise. */
export function completeCompanionQuest(state: GameState, companionId: string): boolean {
  if (questStage(state, companionId) !== 'ready') {
    return false;
  }
  const quest = companionSlot(companionId).quest;
  state.quests[companionId] = 'done';
  state.gold += quest.reward.gold;
  for (const [itemId, count] of Object.entries(quest.reward.items ?? {})) {
    addItem(state, itemId, count);
  }
  return true;
}

/** The companion rolled for a slot in this playthrough (the slot id doubles as the member id). */
export function companionInfo(state: GameState, companionId: string): CompanionInfo {
  const info = state.companions[companionId];
  if (!info) {
    throw new Error(`Unknown companion: ${companionId}`);
  }
  return info;
}

/**
 * Creates a fixed-class companion at the hero's level. Companions who left the party and
 * rejoin keep their own level (stored in `companionLevels`) if it is higher.
 */
export function createCompanion(state: GameState, companionId: string): PartyMember {
  const info = companionInfo(state, companionId);
  const level = Math.max(state.party[0]?.level ?? 1, state.companionLevels[companionId] ?? 1);
  const member = createMember(companionId, info.name, info.classId, level);
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
    const data = migrate(JSON.parse(raw) as Partial<GameState>);
    return isValidState(data) ? data : null;
  } catch {
    return null;
  }
}

export function hasSave(storage: SaveStorage): boolean {
  return loadGame(storage) !== null;
}

/** Upgrades older saves: v2 had no fog or quests (companions already met keep their place). */
function migrate(s: Partial<GameState>): Partial<GameState> {
  if (typeof s?.version !== 'number' || !MIGRATABLE_VERSIONS.includes(s.version)) {
    return s;
  }
  const quests: Record<string, QuestStatus> = {};
  for (const id of [...(s.party ?? []).map((m) => m.id), ...Object.keys(s.companionLevels ?? {})]) {
    if (id !== 'hero') {
      quests[id] = 'done';
    }
  }
  return { ...s, version: SAVE_VERSION, explored: s.explored ?? {}, quests: s.quests ?? quests };
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
    s.companionLevels !== null &&
    typeof s.explored === 'object' &&
    s.explored !== null &&
    typeof s.quests === 'object' &&
    s.quests !== null &&
    validRoster(s.companions)
  );
}

function validRoster(roster: unknown): boolean {
  if (typeof roster !== 'object' || roster === null) {
    return false;
  }
  const r = roster as Record<string, CompanionInfo | undefined>;
  return COMPANION_SLOTS.every((slot) => {
    const c = r[slot.id];
    return typeof c?.name === 'string' && CLASS_ORDER.includes(c.classId);
  });
}
