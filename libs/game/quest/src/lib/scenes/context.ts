import { AudioManager, Rng, SceneStack } from '@jouster/game/engine';
import { Art } from '../art/art';
import { GameState, SaveStorage } from '../state/game-state';
import { PartyMember, memberStats } from '../state/party';
import { StatusEntry } from '../ui/widgets';

/** Shared services handed to every scene. */
export interface GameContext {
  stack: SceneStack;
  audio: AudioManager;
  art: Art;
  rng: Rng;
  storage: SaveStorage;
  /** Current game (null on the title screen before a game is started or loaded). */
  state: GameState | null;
}

/** Returns the active game state or throws (scenes past the title always have one). */
export function requireState(ctx: GameContext): GameState {
  if (!ctx.state) {
    throw new Error('No active game');
  }
  return ctx.state;
}

export function memberStatus(m: PartyMember): StatusEntry {
  const s = memberStats(m);
  return { name: m.name, level: m.level, hp: m.hp, maxHp: s.hp, mp: m.mp, maxMp: s.mp, poisoned: !!m.poisoned };
}
