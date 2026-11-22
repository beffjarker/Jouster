import { AUDIO_CHANNELS, AudioChannel, ClassId, Facing, Rng, createRng, timeSeed, totalXpForLevel } from '@jouster/game/engine';
import { CLASS_ORDER, classDef } from '../data/classes';
import { COMPANION_SLOTS, CompanionInfo, companionSlot, rollCompanions } from '../data/companions';
import { WEAPONS } from '../data/equipment';
import { GEAR } from '../data/gear';
import { BAG_LIMIT, canEquip, createGear, equippedId, returnGear, stashGear } from './equipment';
import { GearItem, isValidGearItem } from './loot';
import { PartyMember, createMember, memberStats } from './party';

export const SAVE_VERSION = 6;
/** Older save versions that loadGame can migrate. */
const MIGRATABLE_VERSIONS: readonly number[] = [2, 3, 4, 5];
/** Storage key of save slot 1 (the only slot before plan §41, so older saves land there). */
export const SAVE_KEY = 'jouster-quest-save-v1';
/** Number of save slots (adventure logs) on the title screen (plan §41). */
export const SAVE_SLOTS = 3;
export const MAX_PARTY = 3;
export const STARTING_GOLD = 50;
export const STARTING_HERBS = 3;

export interface GameState {
  version: number;
  party: PartyMember[];
  gold: number;
  /** Consumables by id and count. */
  inventory: Record<string, number>;
  /** Weapons and gear in the bag, each with its rarity and bonuses (plan 33.4); at most `BAG_LIMIT`. */
  gear: GearItem[];
  /** Uid for the next piece of gear created. */
  nextGearUid: number;
  /** Found gear waiting for room in a full bag; the field asks what to drop (plan 33.4). */
  pendingGear?: GearItem[];
  flags: Record<string, boolean>;
  /** Level and XP of companions who left the party (they rejoin exactly as they left, plan 16.1). */
  companionProgress: Record<string, CompanionProgress>;
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
  /** Volume (0 to 1) per audio channel, restored when the game is continued. Missing in older saves. */
  volumes?: VolumeSettings;
  /** Save slot (0-based) this journey is written to; missing means slot 0 (plan §41). */
  slot?: number;
  /** When this journey was last saved (ms since the epoch); the title screen picks the newest. */
  savedAt?: number;
}

/** What the title screen shows for a filled save slot. */
export interface SlotSummary {
  slot: number;
  heroName: string;
  classId: ClassId;
  level: number;
  mapId: string;
  playSeconds: number;
  savedAt: number;
}

/** Saved volume per audio channel (0 to 1). */
export type VolumeSettings = Partial<Record<AudioChannel, number>>;

/** A benched companion's saved level and total XP. */
export interface CompanionProgress {
  level: number;
  xp: number;
}

/** Save fields that older versions used and later versions dropped. */
interface LegacySave extends Partial<GameState> {
  /** v2/v3: companion levels only (replaced by `companionProgress` in v4). */
  companionLevels?: Record<string, number>;
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

/** The consumables a new hero of this class starts with: Herbs plus any class extras (the Wizard's Tonics). */
export function startingInventory(classId: ClassId): Record<string, number> {
  const def = classDef(classId);
  return { herb: STARTING_HERBS + def.bonusHerbs, ...def.startingItems };
}

/** Starts a new journey. The companion roster is rolled with `rng` (random when omitted). */
export function newGameState(heroName: string, classId: ClassId, rng: Rng = createRng(timeSeed())): GameState {
  return {
    version: SAVE_VERSION,
    party: [createMember('hero', heroName, classId, 1)],
    gold: STARTING_GOLD,
    inventory: startingInventory(classId),
    gear: [],
    nextGearUid: 1,
    flags: {},
    companionProgress: {},
    companions: rollCompanions(classId, rng),
    explored: {},
    quests: {},
    mapId: 'aldmere',
    x: 6,
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

/**
 * True when the companion is waiting at their home spot (unlocked and not in the party). Word of the Goblin
 * King's fall is what draws most of them out; only a companion with `beforeKing` lines (the cave prisoner) is
 * there before that.
 */
export function companionPresent(state: GameState, companionId: string): boolean {
  const slot = companionSlot(companionId);
  return (
    companionId in state.companions &&
    (state.flags['bossDefeated'] === true || slot.beforeKing !== undefined) &&
    !inParty(state, companionId) &&
    (!slot.requiresFlag || state.flags[slot.requiresFlag] === true)
  );
}

/**
 * True when the companion was in the party and left it (they now wait at their rest spot, see
 * `companionRestSpot`, instead of where they were first found).
 */
export function companionBenched(state: GameState, companionId: string): boolean {
  return companionId in state.companionProgress && !inParty(state, companionId);
}

/**
 * True when a present companion is willing to join: the Goblin King has fallen and their side quest is done
 * (companions who were in the party before always rejoin).
 */
export function companionAvailable(state: GameState, companionId: string): boolean {
  return (
    state.flags['bossDefeated'] === true &&
    companionPresent(state, companionId) &&
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
 * Level a companion has the first time they join: half the hero's level, rounded down, minimum 1
 * (plan 16.1; the simulator showed a level-1 ally took ~21 fights to reach level 4 beside a level-6 hero).
 */
export function companionJoinLevel(heroLevel: number): number {
  return Math.max(1, Math.floor(heroLevel / 2));
}

/**
 * Creates a fixed-class companion. First-time recruits start at `companionJoinLevel`; companions who left
 * the party rejoin with exactly the level and XP they left with (stored in `companionProgress`).
 */
export function createCompanion(state: GameState, companionId: string): PartyMember {
  const info = companionInfo(state, companionId);
  const stored = state.companionProgress[companionId];
  const level = stored?.level ?? companionJoinLevel(state.party[0]?.level ?? 1);
  const member = createMember(companionId, info.name, info.classId, level);
  member.xp = stored?.xp ?? totalXpForLevel(level);
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
    state.companionProgress[leaving.id] = { level: leaving.level, xp: leaving.xp };
    returnGear(state, leaving);
    state.party.splice(idx, 1);
  }
  state.party.push(createCompanion(state, companionId));
  return true;
}

/** Adds consumables; a weapon or gear id instead adds plain Common pieces to the bag (or pending when full). */
export function addItem(state: GameState, itemId: string, count = 1): void {
  if (WEAPONS.has(itemId) || GEAR.has(itemId)) {
    for (let i = 0; i < count; i++) {
      stashGear(state, createGear(state, { baseId: itemId, rarity: 'common', bonus: {} }));
    }
    return;
  }
  state.inventory[itemId] = (state.inventory[itemId] ?? 0) + count;
}

/** Storage key of a save slot (0-based); slot 0 keeps the original key so older saves still load. */
export function slotKey(slot: number): string {
  return slot === 0 ? SAVE_KEY : `${SAVE_KEY}-slot${slot + 1}`;
}

/** The slot a journey saves to: its own slot when valid, else slot 0. */
export function stateSlot(state: Pick<GameState, 'slot'>): number {
  const slot = state.slot;
  return typeof slot === 'number' && Number.isInteger(slot) && slot >= 0 && slot < SAVE_SLOTS ? slot : 0;
}

/** Writes the journey into its slot (see `stateSlot`) and stamps `savedAt`. */
export function saveGame(storage: SaveStorage, state: GameState): boolean {
  try {
    state.savedAt = Date.now();
    storage.setItem(slotKey(stateSlot(state)), JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

/** Loads and validates a save slot (0-based). Returns null when missing, corrupt or from another version. */
export function loadGame(storage: SaveStorage, slot = 0): GameState | null {
  let raw: string | null;
  try {
    raw = storage.getItem(slotKey(slot));
  } catch {
    return null;
  }
  if (!raw) {
    return null;
  }
  try {
    const data = migrate(JSON.parse(raw) as Partial<GameState>);
    if (!isValidState(data)) {
      return null;
    }
    // Bad volume values never cost the player their save; they just fall back to the defaults.
    const volumes = cleanVolumes(data.volumes);
    if (volumes) {
      data.volumes = volumes;
    } else {
      delete data.volumes;
    }
    // The key a save was read from decides its slot, so a copied save keeps writing where it was loaded.
    if (slot === 0) {
      delete data.slot;
    } else {
      data.slot = slot;
    }
    if (typeof data.savedAt !== 'number' || !Number.isFinite(data.savedAt)) {
      delete data.savedAt;
    }
    return data;
  } catch {
    return null;
  }
}

/** Known channels with a finite level, clamped to 0..1; undefined when nothing usable is left. */
export function cleanVolumes(raw: unknown): VolumeSettings | undefined {
  if (typeof raw !== 'object' || raw === null) {
    return undefined;
  }
  const out: VolumeSettings = {};
  for (const channel of AUDIO_CHANNELS) {
    const v = (raw as Record<string, unknown>)[channel];
    if (typeof v === 'number' && Number.isFinite(v)) {
      out[channel] = Math.min(1, Math.max(0, v));
    }
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

/**
 * Writes new volume levels into a stored save without touching anything else in it, so changing the volume
 * never saves (or loses) game progress. With no `slot` (the title screen), every stored save gets the levels.
 * Returns true when at least one save was updated.
 */
export function saveVolumes(storage: SaveStorage, volumes: VolumeSettings, slot?: number): boolean {
  const slots = slot === undefined ? Array.from({ length: SAVE_SLOTS }, (_, i) => i) : [slot];
  let wrote = false;
  for (const s of slots) {
    try {
      const raw = storage.getItem(slotKey(s));
      const data: unknown = raw ? JSON.parse(raw) : null;
      if (typeof data !== 'object' || data === null) {
        continue;
      }
      storage.setItem(slotKey(s), JSON.stringify({ ...data, volumes: { ...volumes } }));
      wrote = true;
    } catch {
      // A full or broken slot keeps its old levels; the others still update.
    }
  }
  return wrote;
}

/** True when any slot holds a loadable save. */
export function hasSave(storage: SaveStorage): boolean {
  return slotSummaries(storage).some((s) => s !== null);
}

/** One entry per save slot: its summary, or null when the slot is empty or unreadable. */
export function slotSummaries(storage: SaveStorage): Array<SlotSummary | null> {
  return Array.from({ length: SAVE_SLOTS }, (_, slot) => {
    const s = loadGame(storage, slot);
    if (!s) {
      return null;
    }
    const hero = s.party.find((m) => m.id === 'hero') ?? s.party[0];
    return {
      slot,
      heroName: hero.name,
      classId: hero.classId,
      level: hero.level,
      mapId: s.mapId,
      playSeconds: s.playSeconds ?? 0,
      savedAt: s.savedAt ?? 0,
    };
  });
}

/** The most recently saved slot (ties go to the lowest slot), or -1 when every slot is empty. */
export function latestSlot(storage: SaveStorage): number {
  let best: SlotSummary | null = null;
  for (const s of slotSummaries(storage)) {
    if (s && (!best || s.savedAt > best.savedAt)) {
      best = s;
    }
  }
  return best ? best.slot : -1;
}

/**
 * Upgrades older saves step by step: v2/v3 -> v4 (fog, quests, companion XP) -> v5 (Necromancer replaces the
 * Paladin) -> v6 (gear moves from counted ids to rarity instances).
 */
function migrate(s: LegacySave): Partial<GameState> {
  if (typeof s?.version !== 'number' || !MIGRATABLE_VERSIONS.includes(s.version)) {
    return s;
  }
  const v4 = s.version < 4 ? migrateToV4(s) : s;
  const v5 = s.version < 5 ? migrateToV5(v4) : v4;
  return migrateToV6(v5);
}

/**
 * v2 had no fog or quests (companions already met keep their place); v2 and v3 stored benched companions'
 * levels only, which become `{ level, xp }` at the start of that level (no downgrade).
 */
function migrateToV4(s: LegacySave): Partial<GameState> {
  const { companionLevels, ...rest } = s;
  const levels = typeof companionLevels === 'object' && companionLevels !== null ? companionLevels : {};
  const quests: Record<string, QuestStatus> = {};
  for (const id of [...(s.party ?? []).map((m) => m.id), ...Object.keys(levels)]) {
    if (id !== 'hero') {
      quests[id] = 'done';
    }
  }
  const companionProgress: Record<string, CompanionProgress> = {};
  for (const [id, level] of Object.entries(levels)) {
    if (Number.isFinite(level)) {
      companionProgress[id] = { level, xp: totalXpForLevel(level) };
    }
  }
  return {
    ...rest,
    version: 4,
    explored: s.explored ?? {},
    quests: s.quests ?? quests,
    companionProgress: s.companionProgress ?? companionProgress,
  };
}

/** v4 sword-and-shield weapons -> the same-tier scythe. */
const PALADIN_WEAPONS: Readonly<Record<string, string>> = {
  knightBlade: 'boneScythe',
  oathBlade: 'graveScythe',
  aegisBlade: 'duneReaper',
  glacierBlade: 'frostreapScythe',
  emberguardBlade: 'soulfireScythe',
};

const necromancerFor = (classId: ClassId): ClassId => ((classId as string) === 'paladin' ? 'necromancer' : classId);

/**
 * v5 retired the Paladin: Paladins become Necromancers (same name, level and XP), sword-and-shield weapons
 * become same-tier scythes, and armor or shields a Necromancer can't wear go back to the bag.
 */
function migrateToV5(s: Partial<GameState>): Partial<GameState> {
  const inventory: Record<string, number> = {};
  for (const [id, count] of Object.entries(s.inventory ?? {})) {
    const to = PALADIN_WEAPONS[id] ?? id;
    inventory[to] = (inventory[to] ?? 0) + count;
  }
  const state: Partial<GameState> = { ...s, version: 5, inventory };
  if (s.companions && typeof s.companions === 'object') {
    state.companions = Object.fromEntries(
      Object.entries(s.companions).map(([id, c]) => [id, { ...c, classId: necromancerFor(c.classId) }]),
    );
  }
  if (Array.isArray(s.party)) {
    state.party = s.party.map((old) => {
      const m: PartyMember = { ...old, classId: necromancerFor(old.classId), weaponId: PALADIN_WEAPONS[old.weaponId] ?? old.weaponId };
      if (m.classId !== old.classId) {
        (['armor', 'shield', 'accessory'] as const).forEach((slot) => {
          const id = equippedId(m, slot);
          if (id && GEAR.has(id) && !canEquip(m, id)) {
            inventory[id] = (inventory[id] ?? 0) + 1;
            delete m[slot === 'armor' ? 'armorId' : slot === 'shield' ? 'shieldId' : 'accessoryId'];
          }
        });
        const max = memberStats(m);
        m.hp = Math.min(m.hp, max.hp);
        m.mp = Math.min(m.mp, max.mp);
      }
      return m;
    });
  }
  return state;
}

/**
 * v6 split the bag: weapon and gear ids counted in `inventory` become plain Common pieces in `gear` (any beyond the
 * bag limit wait in `pendingGear`); worn gear stays as it was, an implicit plain Common.
 */
function migrateToV6(s: Partial<GameState>): Partial<GameState> {
  const inventory: Record<string, number> = {};
  const gear: GearItem[] = [];
  let uid = 1;
  for (const [id, count] of Object.entries(s.inventory ?? {})) {
    if (WEAPONS.has(id) || GEAR.has(id)) {
      for (let i = 0; i < count; i++) {
        gear.push({ uid: uid++, baseId: id, rarity: 'common', bonus: {} });
      }
    } else {
      inventory[id] = count;
    }
  }
  const state: Partial<GameState> = {
    ...s,
    version: SAVE_VERSION,
    inventory,
    gear: gear.slice(0, BAG_LIMIT),
    nextGearUid: uid,
  };
  if (gear.length > BAG_LIMIT) {
    state.pendingGear = gear.slice(BAG_LIMIT);
  }
  return state;
}

/** Bag, pending and worn pieces are well formed, and every uid is below `nextGearUid`. */
function validGear(s: Partial<GameState>): boolean {
  if (!Array.isArray(s.gear) || s.gear.length > BAG_LIMIT || !Number.isInteger(s.nextGearUid)) {
    return false;
  }
  if (s.pendingGear !== undefined && !Array.isArray(s.pendingGear)) {
    return false;
  }
  const worn = (s.party ?? []).flatMap((m) => Object.values(m?.worn ?? {}));
  return [...s.gear, ...(s.pendingGear ?? []), ...worn].every(
    (g) => isValidGearItem(g) && g.uid < (s.nextGearUid ?? 0),
  );
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
      [m.armorId, m.shieldId, m.accessoryId].every((id) => id === undefined || GEAR.has(id)) &&
      (m.poisoned === undefined || typeof m.poisoned === 'boolean') &&
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
    validGear(s) &&
    typeof s.flags === 'object' &&
    s.flags !== null &&
    validProgress(s.companionProgress) &&
    typeof s.explored === 'object' &&
    s.explored !== null &&
    typeof s.quests === 'object' &&
    s.quests !== null &&
    validRoster(s.companions)
  );
}

function validProgress(progress: unknown): boolean {
  if (typeof progress !== 'object' || progress === null) {
    return false;
  }
  return Object.values(progress as Record<string, CompanionProgress | undefined>).every(
    (p) => Number.isFinite(p?.level) && Number.isFinite(p?.xp),
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
