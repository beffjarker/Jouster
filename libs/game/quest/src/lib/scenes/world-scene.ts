import {
  FACING_DELTA,
  Facing,
  InputManager,
  Renderer,
  Scene,
  TileMap,
  firstStepToward,
  pickEncounter,
  rollEncounter,
  scaledEncounterRate,
} from '@jouster/game/engine';
import { TILE, castsShadow, decorTopOf, tileAnchor, tileVariant } from '../art/art';
import { groundVariant } from '../art/lpc-manifest';
import { classDef } from '../data/classes';
import { PRE_BOSS_HINT, companionIntro, companionLines, companionRestSpot, companionSlot } from '../data/companions';
import { ITEM_SHOP_STOCK, WEAPON_SHOP_STOCK } from '../data/equipment';
import { ARMOR_SHOP_STOCK } from '../data/gear';
import { Backdrop, BossDef, INN_RESPAWN, MapDef, NpcDef, SIGN_TEXT, Warp, mapDef, mapHasEncounters, talkAcross, wanderBlocked } from '../data/maps';
import { ENCOUNTER_TABLES, SOLO_MAX_ENEMIES } from '../data/monsters';
import {
  CAVE_FOG_RADIUS,
  TORCH_LIGHT_RADIUS,
  TORCH_SIGHT_BONUS,
  inSight,
  isExplored,
  revealAround,
} from '../state/fog';
import {
  GameState,
  MAX_PARTY,
  answerCompanionQuest,
  companionAvailable,
  companionInfo,
  completeCompanionQuest,
  markQuestReady,
  questStage,
  recruitCompanion,
  saveGame,
} from '../state/game-state';
import { PartyMember, applyFieldRegen, restoreMember } from '../state/party';
import {
  SEASON_NAMES,
  Season,
  WEATHER,
  WeatherKind,
  seasonAt,
  weatherAt,
  weatherSeed,
  weatherSightRadius,
} from '../state/weather';
import { drawSeasonTint, drawWeather } from '../ui/weather-fx';
import { COLORS, SCREEN_H, SCREEN_W, ask, drawPartyStatus, say } from '../ui/widgets';
import { BattleEnd, BattleScene } from './battle-scene';
import { GameContext, memberStatus, requireState } from './context';
import { MapScene } from './map-scene';
import { FieldMenuScene, ShopScene } from './menu-scenes';

/** Seconds to walk one tile. */
export const STEP_TIME = 0.16;
const NPC_STEP_TIME = 0.3;
const WANDER_RADIUS = 2;
const INN_PRICE_PER_MEMBER = 6;
const REVIVE_PRICE_PER_LEVEL = 5;
const KING_GIFT = 50;
const ACT_ONE_REWARD = 200;
const ACT_TWO_REWARD = 500;
const DESERT_TILES = new Set(['sand', 'dunes', 'sandRoad', 'cactus']);
const MARSH_TILES = new Set(['marsh', 'mireTree', 'boardwalk', 'bog']);
const COMPANION_READY = 'I owe you. Shall I come along?';

function rewardText(reward: { gold: number; items?: Record<string, number> }): string {
  const items = Object.entries(reward.items ?? {}).map(([id, n]) => `${n} ${id}${n > 1 ? 's' : ''}`);
  return [`${reward.gold} gold`, ...items].join(', ');
}

const DIRECTIONS: readonly Facing[] = ['up', 'down', 'left', 'right'];
const OPPOSITE: ReadonlyMap<Facing, Facing> = new Map<Facing, Facing>([
  ['up', 'down'],
  ['down', 'up'],
  ['left', 'right'],
  ['right', 'left'],
]);

interface Walker {
  x: number;
  y: number;
  fromX: number;
  fromY: number;
  facing: Facing;
}

const FOG = '#07060c';
const FOG_DIM_ALPHA = 0.5;
const FOG_DIM = `rgba(7,6,12,${FOG_DIM_ALPHA})`;
/** Seconds a change of weather or season takes to fade from the old sky to the new one. */
export const SKY_FADE_SECONDS = 3;
const FOG_EDGE = 'rgba(7,6,12,0.7)';

/**
 * Camera offset on one axis. A map narrower (or shorter) than the view is centred and stays still, with the
 * map's outside tile (forest around towns, rock around caves) filling the border; larger maps follow the leader.
 */
export function cameraAxis(leaderPx: number, mapTiles: number, viewPx: number): number {
  const mapPx = mapTiles * TILE;
  if (mapPx <= viewPx) {
    return Math.round((mapPx - viewPx) / 2);
  }
  return Math.round(leaderPx - (viewPx - TILE) / 2);
}

/**
 * Where a click / tap sent the party. `stand` walks onto the tile; `face` walks next to it (an NPC, sign,
 * wall or counter) and turns to it, then talks when `talk` is set.
 */
export interface WalkGoal {
  x: number;
  y: number;
  mode: 'stand' | 'face';
  talk: boolean;
}

interface NpcRuntime extends Walker {
  def: NpcDef;
  moveT: number;
  wanderTimer: number;
}

/** Top-down exploration: movement, NPCs, warps, events and random encounters. */
export class WorldScene implements Scene {
  public readonly id = 'world';
  private readonly state: GameState;
  private readonly map: MapDef;
  private readonly tiles: TileMap;
  private readonly tileIds: ReadonlyMap<string, string>;
  private readonly walkers: Walker[] = [];
  private readonly npcs: NpcRuntime[];
  private readonly pending: Array<() => void> = [];
  private moving = false;
  private moveT = 1;
  private time = 0;
  private idle = 0;
  private nameTimer = 2.5;
  private readonly seed: number;
  private readonly torches: ReadonlyArray<{ x: number; y: number }>;
  private toast = '';
  private toastTimer = 0;
  /** The sky being faded out after a weather or season change; `skyFade` runs 0..1 toward the current sky. */
  private skyFrom: { weather: WeatherKind; season: Season } | null = null;
  private skyFade = 1;
  private walkGoal: WalkGoal | null = null;
  /** Pointer press that started the current walk; dragging while it is held steers the party. */
  private steerPress = -1;

  constructor(private readonly ctx: GameContext) {
    this.state = requireState(ctx);
    this.map = mapDef(this.state.mapId);
    this.tiles = new TileMap(this.map.rows, this.map.legend);
    this.tileIds = new Map(this.map.legend.map((t) => [t.char, t.id]));
    this.seed = weatherSeed(this.state);
    this.torches = this.map.rows.flatMap((row, y) =>
      [...row].flatMap((ch, x) => (this.tileIds.get(ch) === 'torch' ? [{ x, y }] : [])),
    );
    this.syncWalkers();
    this.npcs = this.map.npcs.map((def) => ({
      def,
      x: def.x,
      y: def.y,
      fromX: def.x,
      fromY: def.y,
      facing: def.facing,
      moveT: 1,
      wanderTimer: 1 + ctx.rng.next() * 2,
    }));
    this.reveal();
  }

  /** Caves have no sky: no weather or seasons underground. */
  private get outdoors(): boolean {
    return this.map.backdrop !== 'cave';
  }

  private get weather(): WeatherKind {
    return weatherAt(this.state.steps, this.seed);
  }

  /**
   * Tiles the party can currently see around itself (fogged maps only): 8 on a sunny day minus
   * the weather's severity outdoors; a fixed radius in caves, +1 while a wall torch is near.
   */
  private get sightRadius(): number {
    if (!this.outdoors) {
      const lit = this.torches.some((t) => inSight(t.x - this.state.x, t.y - this.state.y, TORCH_LIGHT_RADIUS));
      return CAVE_FOG_RADIUS + (lit ? TORCH_SIGHT_BONUS : 0);
    }
    return weatherSightRadius(this.weather);
  }

  private reveal(): void {
    if (this.map.fog) {
      revealAround(this.state, this.map.id, this.tiles.width, this.tiles.height, this.state.x, this.state.y, this.sightRadius);
    }
  }

  /** True when tile (x, y) has been explored (always true on maps without fog). */
  private explored(x: number, y: number): boolean {
    return !this.map.fog || isExplored(this.state.explored[this.map.id], this.tiles.width, x, y);
  }

  /** Shows a message the next time this scene is active (e.g. after a fade). */
  public queueMessage(lines: string[], then?: () => void): void {
    this.pending.push(() => say(this.ctx.stack, this.ctx.audio, lines, then));
  }

  public update(dt: number, input: InputManager): void {
    this.time += dt;
    this.skyFade = Math.min(1, this.skyFade + dt / SKY_FADE_SECONDS);
    this.nameTimer = Math.max(0, this.nameTimer - dt);
    this.toastTimer = Math.max(0, this.toastTimer - dt);
    const next = this.pending.shift();
    if (next) {
      next();
      return;
    }
    this.updateNpcs(dt);
    this.updatePointer(input);
    if (this.walkGoal && DIRECTIONS.some((d) => input.isDown(d))) {
      // Any direction key takes over from a click / tap walk, even mid-step.
      this.walkGoal = null;
    }
    if (this.moving) {
      this.moveT = Math.min(1, this.moveT + dt / STEP_TIME);
      if (this.moveT >= 1) {
        this.moving = false;
        this.finishStep();
      }
      return;
    }
    if (input.wasPressed('confirm')) {
      this.idle = 0;
      this.interact();
      return;
    }
    if (input.wasPressed('cancel')) {
      this.idle = 0;
      this.ctx.stack.push(new FieldMenuScene(this.ctx));
      return;
    }
    if (input.wasPressed('items') || input.wasPressed('equip')) {
      this.idle = 0;
      this.ctx.audio.play('confirm');
      this.ctx.stack.push(new FieldMenuScene(this.ctx, input.wasPressed('items') ? 'item' : 'equip'));
      return;
    }
    if (input.wasPressed('map')) {
      this.idle = 0;
      this.ctx.audio.play('confirm');
      this.ctx.stack.push(new MapScene(this.ctx));
      return;
    }
    const dir = DIRECTIONS.find((d) => input.isDown(d));
    if (dir) {
      this.idle = 0;
      this.walkGoal = null;
      this.tryMove(dir);
    } else if (this.walkGoal) {
      this.idle = 0;
      this.followGoal();
    } else {
      this.idle += dt;
    }
  }

  /** The party's current tap-to-walk destination, if any (for tests). */
  public get goal(): Readonly<WalkGoal> | null {
    return this.walkGoal;
  }

  /** Camera offset in logical units (top-left of the view in map space). */
  private camera(): { x: number; y: number } {
    const leader = this.walkers[0];
    const lx = this.lerp(leader.fromX, leader.x, this.moveT) * TILE;
    const ly = this.lerp(leader.fromY, leader.y, this.moveT) * TILE;
    return { x: cameraAxis(lx, this.tiles.width, SCREEN_W), y: cameraAxis(ly, this.tiles.height, SCREEN_H) };
  }

  /** Map tile under a logical screen point. */
  public tileAtScreen(sx: number, sy: number): { x: number; y: number } {
    const cam = this.camera();
    return { x: Math.floor((sx + cam.x) / TILE), y: Math.floor((sy + cam.y) / TILE) };
  }

  /** Logical screen point at the centre of a map tile (inverse of `tileAtScreen`). */
  public tileToScreen(x: number, y: number): { x: number; y: number } {
    const cam = this.camera();
    return { x: x * TILE - cam.x + TILE / 2, y: y * TILE - cam.y + TILE / 2 };
  }

  /** Click / tap: walk to the tile, or up to an NPC or sign to talk; drag while held to steer. */
  private updatePointer(input: InputManager): void {
    const tap = input.tap;
    if (tap) {
      this.idle = 0;
      this.steerPress = input.pointerPresses;
      const t = this.tileAtScreen(tap.x, tap.y);
      const leader = this.walkers[0];
      if (t.x === leader.x && t.y === leader.y && !this.moving) {
        this.walkGoal = null;
        this.interact();
        return;
      }
      this.setGoal(t.x, t.y);
      return;
    }
    const p = input.pointer;
    if (p?.down && this.steerPress === input.pointerPresses && input.pointerMovedThisFrame) {
      const t = this.tileAtScreen(p.x, p.y);
      if (!this.walkGoal || this.walkGoal.x !== t.x || this.walkGoal.y !== t.y) {
        this.setGoal(t.x, t.y);
      }
    }
  }

  private setGoal(x: number, y: number): void {
    const sign = this.map.signs?.some((s) => s.x === x && s.y === y) ?? false;
    const npc = this.npcAt(x, y) !== undefined;
    const blocked = !this.tiles.inBounds(x, y) || this.tiles.isSolid(x, y);
    this.walkGoal = { x, y, mode: npc || sign || blocked ? 'face' : 'stand', talk: npc || sign };
  }

  /** Direction from which `interact()` reaches the goal tile (next to it, or across a shop counter). */
  private facingToGoal(x: number, y: number, goal: WalkGoal): Facing | null {
    for (const dir of DIRECTIONS) {
      const d = FACING_DELTA[dir];
      if (x + d.x === goal.x && y + d.y === goal.y) {
        return dir;
      }
      const counter = talkAcross(this.tiles.tileAt(x + d.x, y + d.y)?.id);
      if (goal.talk && counter && x + d.x * 2 === goal.x && y + d.y * 2 === goal.y) {
        return dir;
      }
    }
    return null;
  }

  /** Takes one step along a shortest path to the walk goal; talks or stops on arrival. */
  private followGoal(): void {
    const goal = this.walkGoal;
    const leader = this.walkers[0];
    if (!goal) {
      return;
    }
    if (goal.mode === 'stand' && leader.x === goal.x && leader.y === goal.y) {
      this.walkGoal = null;
      return;
    }
    if (goal.mode === 'face') {
      const face = this.facingToGoal(leader.x, leader.y, goal);
      if (face) {
        this.walkGoal = null;
        leader.facing = face;
        this.state.facing = face;
        if (goal.talk) {
          this.interact();
        }
        return;
      }
    }
    const free = (x: number, y: number): boolean =>
      this.tiles.inBounds(x, y) && !this.tiles.isSolid(x, y) && !this.npcAt(x, y) && this.explored(x, y);
    const isWarp = (x: number, y: number): boolean => this.map.warps.some((w) => w.x === x && w.y === y);
    const isGoal =
      goal.mode === 'stand'
        ? (x: number, y: number): boolean => x === goal.x && y === goal.y
        : (x: number, y: number): boolean => free(x, y) && !isWarp(x, y) && this.facingToGoal(x, y, goal) !== null;
    // Doors and stairs are only walked through when they are the destination.
    const step = firstStepToward(leader, isGoal, (x, y) => free(x, y) && !isWarp(x, y));
    const d = step ? FACING_DELTA[step] : null;
    if (!step || !d || this.tiles.isSolid(leader.x + d.x, leader.y + d.y) || this.npcAt(leader.x + d.x, leader.y + d.y)) {
      this.walkGoal = null;
      if (step) {
        leader.facing = step;
        this.state.facing = step;
      }
      return;
    }
    this.tryMove(step);
  }

  public render(r: Renderer): void {
    const { x: camX, y: camY } = this.camera();
    const frame = Math.floor(this.time * 2) % 2;
    const startX = Math.floor(camX / TILE);
    const startY = Math.floor(camY / TILE);
    const outside = this.tileIds.get(this.map.outsideTile) ?? 'grass';
    const tileId = (tx: number, ty: number): string => {
      const ch = this.tiles.charAt(tx, ty);
      return ch === undefined ? outside : this.tileIds.get(ch) ?? outside;
    };
    for (let ty = startY; ty <= startY + SCREEN_H / TILE + 1; ty++) {
      for (let tx = startX; tx <= startX + SCREEN_W / TILE + 1; tx++) {
        const id = tileId(tx, ty);
        const variant = tileVariant(this.map.id, id, tx, ty);
        r.draw(this.ctx.art.tile(id, frame, variant, groundVariant(tx, ty)), tx * TILE - camX, ty * TILE - camY);
        if (!castsShadow(id) && castsShadow(tileId(tx, ty - 1))) {
          r.draw(this.ctx.art.wallShadow(), tx * TILE - camX, ty * TILE - camY);
        }
        const top = decorTopOf(tileId(tx, ty + 1));
        if (top) {
          r.draw(this.ctx.art.decorTop(top), tx * TILE - camX, ty * TILE - camY);
        }
      }
    }
    const season = seasonAt(this.state.steps);
    const from = this.outdoors && this.skyFade < 1 ? this.skyFrom : null;
    if (this.outdoors) {
      if (from && from.season !== season) {
        drawSeasonTint(r, from.season, 1 - this.skyFade);
        drawSeasonTint(r, season, this.skyFade);
      } else {
        drawSeasonTint(r, season);
      }
    }
    const windy = this.outdoors && (this.weather === 'storm' || this.weather === 'blizzard');
    (this.map.signs ?? []).forEach((s, i) => {
      const sway = windy ? Math.round(Math.sin(this.time * 6 + i)) : 0;
      r.draw(this.ctx.art.sign(s.kind), s.x * TILE - camX + sway, s.y * TILE - camY);
    });
    const sprites: Array<{ y: number; draw(): void }> = [];
    this.npcs
      .filter((n) => this.npcVisible(n) && this.explored(n.x, n.y))
      .forEach((n) => {
        const px = this.lerp(n.fromX, n.x, n.moveT) * TILE - camX;
        const py = this.lerp(n.fromY, n.y, n.moveT) * TILE - camY;
        const f = n.moveT < 1 ? Math.floor(n.moveT * 2) % 2 : frame;
        const spriteId = n.def.sprite?.(this.state) ?? n.def.spriteId;
        const humanoid = this.ctx.art.isCharacter(spriteId) || n.def.role === 'companion';
        sprites.push({
          y: py,
          draw: () => {
            const sprite = humanoid ? this.ctx.art.character(spriteId, n.facing, f) : this.ctx.art.monster(spriteId);
            const a = tileAnchor(sprite);
            r.draw(sprite, px - a.x, py - a.y - (!humanoid && frame ? 1 : 0));
          },
        });
      });
    const walkFrame = this.moving ? Math.floor(this.moveT * 2 + this.state.steps) % 2 : frame;
    this.walkers.forEach((w, i) => {
      const member = this.state.party[i];
      if (!member) {
        return;
      }
      const px = this.lerp(w.fromX, w.x, this.moveT) * TILE - camX;
      const py = this.lerp(w.fromY, w.y, this.moveT) * TILE - camY;
      const sprite = this.ctx.art.character(member.classId, w.facing, walkFrame);
      const a = tileAnchor(sprite);
      sprites.push({
        y: py + (i === 0 ? 0.5 : -i * 0.01),
        draw: () => r.draw(sprite, px - a.x, py - a.y, { alpha: member.hp > 0 ? 1 : 0.45 }),
      });
    });
    this.renderGoal(r, camX, camY);
    sprites.sort((a, b) => a.y - b.y).forEach((s) => s.draw());
    if (this.outdoors) {
      const cam = { x: camX, y: camY };
      if (from && from.weather !== this.weather) {
        drawWeather(r, from.weather, this.time, cam, 1 - this.skyFade);
        drawWeather(r, this.weather, this.time, cam, this.skyFade);
      } else {
        drawWeather(r, this.weather, this.time, cam);
      }
    }
    if (this.map.fog) {
      this.renderFog(r, startX, startY, camX, camY);
    }
    this.renderHud(r);
  }

  /** Blinking corner marks on the tap-to-walk destination. */
  private renderGoal(r: Renderer, camX: number, camY: number): void {
    const g = this.walkGoal;
    if (!g || Math.floor(this.time * 4) % 2 === 1) {
      return;
    }
    const x = g.x * TILE - camX;
    const y = g.y * TILE - camY;
    const c = COLORS.gold;
    const k = 5;
    r.fillRect(x, y, k, 1, c);
    r.fillRect(x, y, 1, k, c);
    r.fillRect(x + TILE - k, y, k, 1, c);
    r.fillRect(x + TILE - 1, y, 1, k, c);
    r.fillRect(x, y + TILE - 1, k, 1, c);
    r.fillRect(x, y + TILE - k, 1, k, c);
    r.fillRect(x + TILE - k, y + TILE - 1, k, 1, c);
    r.fillRect(x + TILE - 1, y + TILE - k, 1, k, c);
  }

  /** Unexplored tiles are black (dithered at the edge); explored tiles out of sight are dimmed. */
  private renderFog(r: Renderer, startX: number, startY: number, camX: number, camY: number): void {
    const radius = this.sightRadius;
    // While the weather changes, the dim ring past the party's sight fades between the old and new radius.
    const fromRadius =
      this.outdoors && this.skyFade < 1 && this.skyFrom ? weatherSightRadius(this.skyFrom.weather) : radius;
    const half = TILE / 2;
    for (let ty = startY; ty <= startY + SCREEN_H / TILE + 1; ty++) {
      for (let tx = startX; tx <= startX + SCREEN_W / TILE + 1; tx++) {
        const sx = tx * TILE - camX;
        const sy = ty * TILE - camY;
        if (!this.explored(tx, ty)) {
          const edge =
            this.explored(tx + 1, ty) || this.explored(tx - 1, ty) || this.explored(tx, ty + 1) || this.explored(tx, ty - 1);
          if (edge) {
            r.fillRect(sx, sy, TILE, TILE, FOG_EDGE);
            r.fillRect(sx, sy, half, half, FOG);
            r.fillRect(sx + half, sy + half, half, half, FOG);
          } else {
            r.fillRect(sx, sy, TILE, TILE, FOG);
          }
        } else {
          const outNow = !inSight(tx - this.state.x, ty - this.state.y, radius);
          const outBefore = !inSight(tx - this.state.x, ty - this.state.y, fromRadius);
          if (outNow && outBefore) {
            r.fillRect(sx, sy, TILE, TILE, FOG_DIM);
          } else if (outNow || outBefore) {
            const dim = outNow ? this.skyFade : 1 - this.skyFade;
            r.fillRect(sx, sy, TILE, TILE, `rgba(7,6,12,${(FOG_DIM_ALPHA * dim).toFixed(3)})`);
          }
        }
      }
    }
  }

  // --- Movement ------------------------------------------------------------------------------

  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  /** Keeps one walker per party member; new members appear on the leader's tile. */
  private syncWalkers(): void {
    const { x, y, facing } = this.state;
    while (this.walkers.length < this.state.party.length) {
      const lead = this.walkers[0];
      this.walkers.push({ x: lead?.x ?? x, y: lead?.y ?? y, fromX: lead?.x ?? x, fromY: lead?.y ?? y, facing });
    }
    this.walkers.length = this.state.party.length;
  }

  private npcAt(x: number, y: number): NpcRuntime | undefined {
    return this.npcs.find((n) => n.x === x && n.y === y && this.npcVisible(n));
  }

  private npcVisible(n: NpcRuntime): boolean {
    return n.def.visible ? n.def.visible(this.state) : true;
  }

  /** Positions of visible NPCs that stay put (shopkeepers, kings, companions, bosses). */
  private standingNpcs(): NpcRuntime[] {
    return this.npcs.filter((n) => !n.def.wander && this.npcVisible(n));
  }

  private tryMove(dir: Facing): void {
    const leader = this.walkers[0];
    leader.facing = dir;
    this.state.facing = dir;
    const d = FACING_DELTA[dir];
    const nx = leader.x + d.x;
    const ny = leader.y + d.y;
    if (this.tiles.isSolid(nx, ny) || this.npcAt(nx, ny)) {
      return;
    }
    for (let i = this.walkers.length - 1; i >= 0; i--) {
      const w = this.walkers[i];
      w.fromX = w.x;
      w.fromY = w.y;
      if (i > 0) {
        const ahead = this.walkers[i - 1];
        if (ahead.x !== w.x || ahead.y !== w.y) {
          w.facing = ahead.x > w.x ? 'right' : ahead.x < w.x ? 'left' : ahead.y > w.y ? 'down' : 'up';
        }
        w.x = ahead.x;
        w.y = ahead.y;
      }
    }
    leader.x = nx;
    leader.y = ny;
    this.state.x = nx;
    this.state.y = ny;
    this.reveal();
    this.moving = true;
    this.moveT = 0;
  }

  private finishStep(): void {
    const s = this.state;
    const before = { season: seasonAt(s.steps), weather: this.weather };
    s.steps++;
    s.stepsSinceBattle++;
    this.announceSky(before.season, before.weather);
    s.party.forEach((m) => applyFieldRegen(m, s.steps, mapHasEncounters(this.map)));
    const warp = this.map.warps.find((w) => w.x === s.x && w.y === s.y);
    if (warp) {
      this.walkGoal = null;
      if (warp.requires && !s.flags[warp.requires]) {
        this.queueMessage([...(warp.lockedLines ?? ['The way is barred.'])]);
        return;
      }
      this.warpTo(warp);
      return;
    }
    const event = this.map.events.find((e) => e.x === s.x && e.y === s.y);
    if (event) {
      this.walkGoal = null;
      this.handleEvent(event.id);
    }
    const tableId = this.tiles.tileAt(s.x, s.y)?.encounterTableId;
    const table = tableId ? ENCOUNTER_TABLES.get(tableId) : undefined;
    // Monsters shy away from a party that far out-levels the area.
    const partyLevel = Math.max(...s.party.map((m) => m.level));
    const rate = table ? scaledEncounterRate(table.rate, partyLevel, table.level) : 0;
    if (table && rollEncounter(rate, s.stepsSinceBattle, this.ctx.rng)) {
      const max = s.party.length === 1 ? SOLO_MAX_ENEMIES : MAX_PARTY;
      this.walkGoal = null;
      this.startBattle(pickEncounter(table, this.ctx.rng, max));
    }
  }

  /** Shows a short banner when the season turns or the weather changes (outdoors only). */
  private announceSky(season: Season, weather: WeatherKind): void {
    const nextSeason = seasonAt(this.state.steps);
    const next = this.weather;
    if (nextSeason !== season || next !== weather) {
      this.skyFrom = { weather, season };
      this.skyFade = 0;
    }
    if (nextSeason !== season) {
      this.showToast(`${SEASON_NAMES[nextSeason]} has come.`);
    } else if (next !== weather) {
      this.showToast(WEATHER[next].message);
    } else {
      return;
    }
    // Sight may have grown (e.g. the sky cleared), so reveal the wider area right away.
    this.reveal();
  }

  private showToast(text: string): void {
    if (this.outdoors) {
      this.toast = text;
      this.toastTimer = 2.5;
    }
  }

  private warpTo(w: Warp): void {
    this.state.mapId = w.toMap;
    this.state.x = w.toX;
    this.state.y = w.toY;
    this.state.facing = w.facing;
    this.ctx.audio.play('door');
    this.ctx.stack.replace(new WorldScene(this.ctx), true);
  }

  private updateNpcs(dt: number): void {
    this.npcs.forEach((n) => {
      if (n.moveT < 1) {
        n.moveT = Math.min(1, n.moveT + dt / NPC_STEP_TIME);
        return;
      }
      if (!n.def.wander || !this.npcVisible(n)) {
        return;
      }
      n.wanderTimer -= dt;
      if (n.wanderTimer > 0) {
        return;
      }
      n.wanderTimer = 1.2 + this.ctx.rng.next() * 2.5;
      const dir = this.ctx.rng.pick(DIRECTIONS);
      n.facing = dir;
      const nx = n.x + FACING_DELTA[dir].x;
      const ny = n.y + FACING_DELTA[dir].y;
      const free =
        Math.abs(nx - n.def.x) <= WANDER_RADIUS &&
        Math.abs(ny - n.def.y) <= WANDER_RADIUS &&
        !this.tiles.isSolid(nx, ny) &&
        !this.npcAt(nx, ny) &&
        !wanderBlocked(this.tiles, this.standingNpcs(), nx, ny) &&
        !this.walkers.some((w) => (w.x === nx && w.y === ny) || (w.fromX === nx && w.fromY === ny)) &&
        !this.map.warps.some((w) => w.x === nx && w.y === ny);
      if (free) {
        n.fromX = n.x;
        n.fromY = n.y;
        n.x = nx;
        n.y = ny;
        n.moveT = 0;
      }
    });
  }

  // --- Battles -------------------------------------------------------------------------------

  private backdropHere(): Backdrop {
    const id = this.tiles.tileAt(this.state.x, this.state.y)?.id;
    if (id === 'forest' || id === 'hills') {
      return id;
    }
    if (id && DESERT_TILES.has(id)) {
      return 'desert';
    }
    if (id && MARSH_TILES.has(id)) {
      return 'marsh';
    }
    return this.map.backdrop;
  }

  private startBattle(monsterIds: string[], boss?: BossDef): void {
    const battle = new BattleScene(this.ctx, {
      monsterIds,
      boss: boss !== undefined,
      backdrop: this.backdropHere(),
      onEnd: (outcome) => this.afterBattle(outcome, boss),
    });
    this.ctx.stack.push(battle, true);
  }

  private afterBattle(outcome: BattleEnd, boss?: BossDef): void {
    const s = this.state;
    if (outcome === 'defeat') {
      s.gold = Math.floor(s.gold / 2);
      s.party.forEach(restoreMember);
      s.mapId = INN_RESPAWN.mapId;
      s.x = INN_RESPAWN.x;
      s.y = INN_RESPAWN.y;
      s.facing = INN_RESPAWN.facing;
      s.stepsSinceBattle = 0;
      const world = new WorldScene(this.ctx);
      world.queueMessage([
        'You wake at the inn in Aldmere, bruised but alive.',
        'Half of your gold was lost. Rest, regroup and try again!',
      ]);
      this.ctx.stack.reset(world, true);
      return;
    }
    this.ctx.stack.pop(true);
    if (boss && outcome === 'victory') {
      s.flags[boss.defeatFlag] = true;
      const readyId = markQuestReady(s, boss.defeatFlag);
      const giver = readyId ? companionInfo(s, readyId) : null;
      this.queueMessage(
        giver && readyId ? [...boss.victory, `Return to ${giver.name} in ${companionSlot(readyId).home}.`] : boss.victory,
      );
    }
  }

  // --- Interaction ---------------------------------------------------------------------------

  private interact(): void {
    const leader = this.walkers[0];
    const d = FACING_DELTA[leader.facing];
    let npc = this.npcAt(leader.x + d.x, leader.y + d.y);
    if (!npc && talkAcross(this.tiles.tileAt(leader.x + d.x, leader.y + d.y)?.id)) {
      npc = this.npcAt(leader.x + d.x * 2, leader.y + d.y * 2);
    }
    if (!npc) {
      const sign = this.map.signs?.find((s) => s.x === leader.x + d.x && s.y === leader.y + d.y);
      if (sign) {
        const text = SIGN_TEXT[sign.kind];
        this.ctx.audio.play('confirm');
        say(this.ctx.stack, this.ctx.audio, [`${this.map.name.toUpperCase()} ${text.name.toUpperCase()} - ${text.blurb}`]);
      }
      return;
    }
    if (npc.moveT >= 1) {
      npc.facing = OPPOSITE.get(leader.facing) ?? npc.facing;
    }
    this.ctx.audio.play('confirm');
    this.talkTo(npc.def);
  }

  private talkTo(def: NpcDef): void {
    const { stack, audio } = this.ctx;
    switch (def.role) {
      case 'talk':
        say(stack, audio, def.lines?.(this.state) ?? ['...']);
        return;
      case 'king':
        this.talkToKing(def);
        return;
      case 'inn':
        this.talkToInn();
        return;
      case 'itemShop':
        say(stack, audio, ['MERCHANT: Welcome! Herbs, tonics, feathers - take a look.'], () =>
          stack.push(new ShopScene(this.ctx, 'item', def.stock ?? ITEM_SHOP_STOCK)),
        );
        return;
      case 'weaponShop':
        say(stack, audio, ["SMITH: Finest steel in the vale. I'll take your old gear in trade."], () =>
          stack.push(new ShopScene(this.ctx, 'weapon', def.stock ?? WEAPON_SHOP_STOCK)),
        );
        return;
      case 'armorShop':
        say(stack, audio, ['ARMORER: Mail, shields and charms. Buy now, wear it later if you like.'], () =>
          stack.push(new ShopScene(this.ctx, 'armor', def.stock ?? ARMOR_SHOP_STOCK)),
        );
        return;
      case 'church':
        this.talkToPriest();
        return;
      case 'boss': {
        const boss = def.boss;
        if (boss) {
          ask(stack, audio, boss.lines, ['FIGHT', 'RETREAT'], (choice) => {
            if (choice === 0) {
              this.startBattle(boss.monsterIds, boss);
            }
          });
        }
        return;
      }
      case 'companion':
        if (def.companionId) {
          this.talkToCompanion(def.companionId);
        }
        return;
    }
  }

  private talkToKing(def: NpcDef): void {
    const { stack, audio } = this.ctx;
    const s = this.state;
    const hero = s.party[0].name;
    if (s.flags['bossDefeated'] && !s.flags['actOneComplete']) {
      s.flags['actOneComplete'] = true;
      s.flags['metKing'] = true;
      s.gold += ACT_ONE_REWARD;
      audio.play('victory');
      say(stack, audio, [
        `KING ALDRIC: The Goblin King is slain! ${hero}, Aldmere is in your debt.`,
        `Take these ${ACT_ONE_REWARD} gold pieces with my thanks.`,
        'Yet the goblins served a greater master. Vyrmorth, the dragon beneath the northern peaks, is waking.',
        'Grow strong, and gather allies. The guard at the southern pass beyond Thornwick will now let you through.',
        '- END OF ACT I - The Southlands await.',
      ]);
      return;
    }
    if (s.flags['sandWyrmDefeated'] && s.flags['marshWitchDefeated'] && !s.flags['actTwoComplete']) {
      s.flags['actTwoComplete'] = true;
      s.gold += ACT_TWO_REWARD;
      audio.play('victory');
      say(stack, audio, [
        `KING ALDRIC: The Sand Wyrm and the Marsh Witch, both fallen! ${hero}, the south is free.`,
        `Take these ${ACT_TWO_REWARD} gold pieces, and the thanks of every road from Aldmere to Sandhollow.`,
        'The witch spoke of Vyrmorth before she fell. The dragon gathers its strength in the north.',
        '- END OF ACT II - Thank you for playing! The world remains open to explore.',
      ]);
      return;
    }
    if (!s.flags['metKing']) {
      s.flags['metKing'] = true;
      s.gold += KING_GIFT;
      say(stack, audio, [
        `KING ALDRIC: Welcome, ${hero}. Dark days have come to Greenwood Vale.`,
        'Goblins burned the village of Thornwick, and their king hides in a cave in the north-eastern hills.',
        `Defeat the Goblin King and Aldmere will reward you. Take ${KING_GIFT} gold for supplies.`,
        'Travelers in our tavern, in the ruins of Thornwick and in Brookhollow may aid you - once you have proven yourself.',
      ]);
      return;
    }
    const lines = def.lines?.(s) ?? [];
    say(stack, audio, lines.length ? lines : ['KING ALDRIC: Go, hero. The Goblin King awaits in the eastern hills.']);
  }

  private talkToInn(): void {
    const { stack, audio } = this.ctx;
    const s = this.state;
    const price = INN_PRICE_PER_MEMBER * s.party.length;
    ask(
      stack,
      audio,
      [`INNKEEPER: Welcome, travelers! A night's rest is ${price} gold. Will you stay?`],
      ['YES', 'NO'],
      (choice) => {
        if (choice !== 0) {
          say(stack, audio, ['INNKEEPER: Safe travels!']);
          return;
        }
        if (s.gold < price) {
          say(stack, audio, ["INNKEEPER: You don't have enough gold, I'm afraid."]);
          return;
        }
        s.gold -= price;
        s.party.forEach(restoreMember);
        // Resting while the Thornwick quest is open lets the Bone Captain rise in the ruins.
        const night = s.quests['thornwick'] === 'active' && !s.flags['boneCaptainDefeated'];
        if (night) {
          s.flags['thornwickNight'] = true;
        }
        const saved = saveGame(this.ctx.storage, s);
        audio.play('heal');
        say(stack, audio, [
          'Good morning! Your party is fully rested.',
          ...(night ? ['You dreamed of cold lights drifting over the ruins of Thornwick...'] : []),
          saved ? 'Your journey has been recorded.' : 'Your journey could not be saved in this browser.',
        ]);
      },
    );
  }

  private talkToPriest(): void {
    const { stack, audio } = this.ctx;
    const s = this.state;
    ask(stack, audio, ['PRIEST: Welcome to the chapel, child. How may I help?'], ['REVIVE', 'SAVE', 'LEAVE'], (c) => {
      if (c === 1) {
        const saved = saveGame(this.ctx.storage, s);
        say(stack, audio, [saved ? 'PRIEST: Your deeds are recorded in the book of adventure.' : 'The book will not open...']);
        return;
      }
      if (c !== 0) {
        say(stack, audio, ['PRIEST: Go with the light.']);
        return;
      }
      const fallen = s.party.find((m) => m.hp <= 0);
      if (!fallen) {
        say(stack, audio, ['PRIEST: All of your party walk among the living.']);
        return;
      }
      const price = REVIVE_PRICE_PER_LEVEL * fallen.level;
      ask(stack, audio, [`PRIEST: To revive ${fallen.name}, I ask a donation of ${price} gold.`], ['YES', 'NO'], (yes) => {
        if (yes !== 0) {
          return;
        }
        if (s.gold < price) {
          say(stack, audio, ['PRIEST: Alas, you cannot afford the donation.']);
          return;
        }
        s.gold -= price;
        restoreMember(fallen);
        audio.play('heal');
        say(stack, audio, [`${fallen.name} is revived!`]);
      });
    });
  }

  /**
   * Companions never join before the Goblin King falls. After that each asks a favour (a side
   * quest); once it is done they offer to join (and rejoin freely after leaving the party).
   */
  private talkToCompanion(companionId: string): void {
    const { stack, audio } = this.ctx;
    const s = this.state;
    const c = companionInfo(s, companionId);
    const quest = companionSlot(companionId).quest;
    switch (questStage(s, companionId)) {
      case 'locked':
        say(stack, audio, [...companionIntro(companionId, c), ...companionLines([PRE_BOSS_HINT], c)]);
        return;
      case 'available': {
        const firstTime = s.quests[companionId] === undefined;
        ask(
          stack,
          audio,
          [...(firstTime ? companionIntro(companionId, c) : []), ...companionLines(quest.offer, c), `Accept the quest "${quest.title}"?`],
          ['YES', 'NO'],
          (choice) => {
            answerCompanionQuest(s, companionId, choice === 0);
            if (choice === 0) {
              audio.play('confirm');
              say(stack, audio, [`New quest: ${quest.title}.`]);
            } else {
              say(stack, audio, [`${c.name.toUpperCase()}: I understand. If you change your mind, I'll be here.`]);
            }
          },
        );
        return;
      }
      case 'active':
        say(stack, audio, companionLines(quest.reminder, c));
        return;
      case 'ready': {
        const early = s.quests[companionId] !== 'ready';
        completeCompanionQuest(s, companionId);
        audio.play('victory');
        say(
          stack,
          audio,
          [
            ...(early ? companionLines(quest.already, c) : []),
            ...companionLines(quest.thanks, c),
            `Quest complete: ${quest.title}. Received ${rewardText(quest.reward)}.`,
          ],
          () => this.offerToJoin(companionId),
        );
        return;
      }
      case 'done':
        this.offerToJoin(companionId);
        return;
    }
  }

  private offerToJoin(companionId: string): void {
    const { stack, audio } = this.ctx;
    const s = this.state;
    if (!companionAvailable(s, companionId)) {
      return;
    }
    const c = companionInfo(s, companionId);
    const intro = companionLines([`{name}: ${COMPANION_READY}`], c);
    const joined = (leaving?: PartyMember): void => {
      this.syncWalkers();
      audio.play('levelUp');
      say(stack, audio, [
        `${c.name} the ${classDef(c.classId).name.toLowerCase()} joins the party!`,
        ...(leaving ? [`${leaving.name} heads off to wait in ${companionRestSpot(leaving.id).home}.`] : []),
      ]);
    };
    ask(stack, audio, [...intro, `Let ${c.name} join the party?`], ['YES', 'NO'], (choice) => {
      if (choice !== 0) {
        say(stack, audio, [`${c.name.toUpperCase()}: Another time, then. I'll be here.`]);
        return;
      }
      if (s.party.length < MAX_PARTY) {
        recruitCompanion(s, companionId);
        joined();
        return;
      }
      const swappable = s.party.filter((m) => m.id !== 'hero');
      ask(
        stack,
        audio,
        ['Your party is full. Who should part ways?'],
        [...swappable.map((m) => m.name.toUpperCase()), 'NOBODY'],
        (k) => {
          const leaving = swappable[k];
          if (leaving && recruitCompanion(s, companionId, leaving.id)) {
            joined(leaving);
          }
        },
      );
    });
  }

  private handleEvent(id: string): void {
    const s = this.state;
    if (id === 'denNest' && !s.flags['alphaWolfDefeated'] && s.quests['tavern'] !== 'active') {
      this.queueMessage([
        'A nest of gnawed bones. Huge paw prints lead deeper into the hills...',
        'Whatever made them is out hunting. Someone in Aldmere may know more.',
      ]);
      return;
    }
    if (id === 'lakeShore' && !s.flags['giantToadDefeated'] && s.quests['brookhollow'] !== 'active') {
      this.queueMessage(['A torn fishing net lies in the reeds, slick with slime. Something big lives in this lake.']);
      return;
    }
    if (id === 'thornwick' && this.state.flags['thornwickNight'] && !this.state.flags['boneCaptainDefeated']) {
      this.queueMessage(['Pale lights drift among the ruins. Something in old armour stands guard...']);
      return;
    }
    if (id === 'thornwick' && !s.flags['sawRuins']) {
      s.flags['sawRuins'] = true;
      this.queueMessage([
        'The ruins of Thornwick. Charred beams and broken carts litter the square.',
        'Goblin tracks lead north, toward the hills.',
      ]);
    }
  }

  // --- HUD -----------------------------------------------------------------------------------

  private renderHud(r: Renderer): void {
    if (this.nameTimer > 0) {
      const name = this.map.name.toUpperCase();
      const w = name.length * 6 + 20;
      r.window(SCREEN_W / 2 - w / 2, 8, w, 20);
      r.textCentered(name, SCREEN_W / 2, 14, COLORS.gold);
    } else if (this.toastTimer > 0) {
      const w = this.toast.length * 6 + 20;
      r.window(SCREEN_W / 2 - w / 2, 8, w, 20);
      r.textCentered(this.toast.toUpperCase(), SCREEN_W / 2, 14);
    } else if (this.idle > 1.2 && this.ctx.stack.top === this) {
      drawPartyStatus(r, this.state.party.map(memberStatus), 4);
      r.window(SCREEN_W - 64, SCREEN_H - 26, 56, 20);
      r.textRight(`${this.state.gold}G`, SCREEN_W - 14, SCREEN_H - 20, COLORS.gold);
      if (this.outdoors) {
        const sky = `${SEASON_NAMES[seasonAt(this.state.steps)]} - ${WEATHER[this.weather].name}`.toUpperCase();
        const w = sky.length * 6 + 16;
        r.window(SCREEN_W - w - 8, SCREEN_H - 50, w, 20);
        r.textRight(sky, SCREEN_W - 16, SCREEN_H - 44);
      }
    }
  }
}
