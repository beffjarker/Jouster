import {
  FACING_DELTA,
  Facing,
  InputManager,
  Renderer,
  Scene,
  TileMap,
  pickEncounter,
  rollEncounter,
  scaledEncounterRate,
} from '@jouster/game/engine';
import { TILE, tileVariant } from '../art/art';
import { classDef } from '../data/classes';
import { PRE_BOSS_HINT, companionIntro, companionLines, companionSlot } from '../data/companions';
import { ITEM_SHOP_STOCK, WEAPON_SHOP_STOCK } from '../data/equipment';
import { Backdrop, BossDef, INN_RESPAWN, MapDef, NpcDef, Warp, mapDef, mapHasEncounters } from '../data/maps';
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
  advanceCompanionQuest,
  companionAvailable,
  companionInfo,
  recruitCompanion,
  saveGame,
} from '../state/game-state';
import { applyFieldRegen, restoreMember } from '../state/party';
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
const FOG_DIM = 'rgba(7,6,12,0.5)';
const FOG_EDGE = 'rgba(7,6,12,0.7)';

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
    this.nameTimer = Math.max(0, this.nameTimer - dt);
    this.toastTimer = Math.max(0, this.toastTimer - dt);
    const next = this.pending.shift();
    if (next) {
      next();
      return;
    }
    this.updateNpcs(dt);
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
    if (input.wasPressed('map')) {
      this.idle = 0;
      this.ctx.audio.play('confirm');
      this.ctx.stack.push(new MapScene(this.ctx));
      return;
    }
    const dir = DIRECTIONS.find((d) => input.isDown(d));
    if (dir) {
      this.idle = 0;
      this.tryMove(dir);
    } else {
      this.idle += dt;
    }
  }

  public render(r: Renderer): void {
    const leader = this.walkers[0];
    const lx = this.lerp(leader.fromX, leader.x, this.moveT) * TILE;
    const ly = this.lerp(leader.fromY, leader.y, this.moveT) * TILE;
    const camX = Math.round(lx - (SCREEN_W - TILE) / 2);
    const camY = Math.round(ly - (SCREEN_H - TILE) / 2);
    const frame = Math.floor(this.time * 2) % 2;
    const startX = Math.floor(camX / TILE);
    const startY = Math.floor(camY / TILE);
    const outside = this.tileIds.get(this.map.outsideTile) ?? 'grass';
    for (let ty = startY; ty <= startY + SCREEN_H / TILE + 1; ty++) {
      for (let tx = startX; tx <= startX + SCREEN_W / TILE + 1; tx++) {
        const ch = this.tiles.charAt(tx, ty);
        const id = ch === undefined ? outside : this.tileIds.get(ch) ?? outside;
        const variant = tileVariant(this.map.id, id, tx, ty);
        r.draw(this.ctx.art.tile(id, frame, variant), tx * TILE - camX, ty * TILE - camY);
      }
    }
    if (this.outdoors) {
      drawSeasonTint(r, seasonAt(this.state.steps));
    }
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
          draw: () =>
            humanoid
              ? r.draw(this.ctx.art.character(spriteId, n.facing, f), px, py, { flipX: n.facing === 'left' })
              : r.draw(this.ctx.art.monster(spriteId), px, py - (frame ? 1 : 0)),
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
      sprites.push({
        y: py + (i === 0 ? 0.5 : -i * 0.01),
        draw: () => r.draw(sprite, px, py, { flipX: w.facing === 'left', alpha: member.hp > 0 ? 1 : 0.45 }),
      });
    });
    sprites.sort((a, b) => a.y - b.y).forEach((s) => s.draw());
    if (this.outdoors) {
      drawWeather(r, this.weather, this.time, { x: camX, y: camY });
    }
    if (this.map.fog) {
      this.renderFog(r, startX, startY, camX, camY);
    }
    this.renderHud(r);
  }

  /** Unexplored tiles are black (dithered at the edge); explored tiles out of sight are dimmed. */
  private renderFog(r: Renderer, startX: number, startY: number, camX: number, camY: number): void {
    const radius = this.sightRadius;
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
        } else if (!inSight(tx - this.state.x, ty - this.state.y, radius)) {
          r.fillRect(sx, sy, TILE, TILE, FOG_DIM);
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
      this.warpTo(warp);
      return;
    }
    const event = this.map.events.find((e) => e.x === s.x && e.y === s.y);
    if (event) {
      this.handleEvent(event.id);
    }
    const tableId = this.tiles.tileAt(s.x, s.y)?.encounterTableId;
    const table = tableId ? ENCOUNTER_TABLES.get(tableId) : undefined;
    // Monsters shy away from a party that far out-levels the area.
    const partyLevel = Math.max(...s.party.map((m) => m.level));
    const rate = table ? scaledEncounterRate(table.rate, partyLevel, table.level) : 0;
    if (table && rollEncounter(rate, s.stepsSinceBattle, this.ctx.rng)) {
      const max = s.party.length === 1 ? SOLO_MAX_ENEMIES : MAX_PARTY;
      this.startBattle(pickEncounter(table, this.ctx.rng, max));
    }
  }

  /** Shows a short banner when the season turns or the weather changes (outdoors only). */
  private announceSky(season: Season, weather: WeatherKind): void {
    const nextSeason = seasonAt(this.state.steps);
    const next = this.weather;
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
      this.queueMessage(boss.victory);
    }
  }

  // --- Interaction ---------------------------------------------------------------------------

  private interact(): void {
    const leader = this.walkers[0];
    const d = FACING_DELTA[leader.facing];
    let npc = this.npcAt(leader.x + d.x, leader.y + d.y);
    if (!npc && this.tiles.tileAt(leader.x + d.x, leader.y + d.y)?.id === 'counter') {
      npc = this.npcAt(leader.x + d.x * 2, leader.y + d.y * 2);
    }
    if (!npc) {
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
          stack.push(new ShopScene(this.ctx, 'item', ITEM_SHOP_STOCK)),
        );
        return;
      case 'weaponShop':
        say(stack, audio, ["SMITH: Finest steel in the vale. I'll take your old gear in trade."], () =>
          stack.push(new ShopScene(this.ctx, 'weapon', WEAPON_SHOP_STOCK)),
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
        'Grow strong, and gather allies. When the seal breaks, we will need you.',
        '- END OF ACT I - Thank you for playing! The world remains open to explore.',
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
    const stage = advanceCompanionQuest(s, companionId);
    switch (stage) {
      case 'locked':
        say(stack, audio, [...companionIntro(companionId, c), ...companionLines([PRE_BOSS_HINT], c)]);
        return;
      case 'offered':
        audio.play('confirm');
        say(stack, audio, [
          ...companionIntro(companionId, c),
          ...companionLines(quest.offer, c),
          `New quest: ${quest.title}.`,
        ]);
        return;
      case 'active':
        say(stack, audio, companionLines(quest.reminder, c));
        return;
      case 'completed':
        audio.play('victory');
        say(stack, audio, [...companionLines(quest.thanks, c), `Quest complete: ${quest.title}. Received ${rewardText(quest.reward)}.`], () =>
          this.offerToJoin(companionId),
        );
        return;
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
    const joined = (leaving?: string): void => {
      this.syncWalkers();
      audio.play('levelUp');
      say(stack, audio, [
        `${c.name} the ${classDef(c.classId).name.toLowerCase()} joins the party!`,
        ...(leaving ? [`${leaving} heads off and will wait at their usual spot.`] : []),
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
            joined(leaving.name);
          }
        },
      );
    });
  }

  private handleEvent(id: string): void {
    if (id === 'thornwick' && this.state.flags['thornwickNight'] && !this.state.flags['boneCaptainDefeated']) {
      this.queueMessage(['Pale lights drift among the ruins. Something in old armour stands guard...']);
      return;
    }
    const s = this.state;
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
