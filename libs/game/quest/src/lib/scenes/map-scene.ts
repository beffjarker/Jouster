import { InputManager, Renderer, Scene, createCanvas, wrapText } from '@jouster/game/engine';
import { COMPANION_SLOTS } from '../data/companions';
import { MapDef, mapDef } from '../data/maps';
import { LANDMARKS } from '../data/overworld-gen';
import { GameState, questStage } from '../state/game-state';
import { isExplored } from '../state/fog';
import { SEASON_NAMES, WEATHER, currentWeather, seasonAt } from '../state/weather';
import { COLORS, SCREEN_H, SCREEN_W } from '../ui/widgets';
import { GameContext, requireState } from './context';

/** Mini-map colour for each tile id. */
const TILE_COLORS: Readonly<Record<string, string>> = {
  grass: '#4a9a3a',
  road: '#c8a868',
  forest: '#1e6a2a',
  hills: '#8a8a4a',
  mountain: '#6a5a4a',
  water: '#2a5ac0',
  bridge: '#a87a3a',
  town: '#e0e0e0',
  caveEntrance: '#202020',
  ruins: '#8a4a3a',
  tree: '#1e5a24',
  wall: '#8a7a6a',
  townGrass: '#5aa84a',
  cobble: '#a8a090',
  carpet: '#a03030',
  wood: '#9a6a3a',
  counter: '#6a4020',
  fountain: '#4a8ae0',
  rock: '#4a4048',
  torch: '#e8841c',
  caveFloor: '#8a7a6a',
  caveWater: '#2a4a8a',
  caveExit: '#e0c040',
};
const FOG_COLOR = '#14100c';
const PARCHMENT = '#3a2c1c';

/** Named places that appear on the overworld map once discovered. */
export const PLACES: ReadonlyArray<{ name: string; x: number; y: number }> = [
  { name: 'Aldmere', ...LANDMARKS.aldmere },
  { name: 'Brookhollow', ...LANDMARKS.brookhollow },
  { name: 'Thornwick Ruins', ...LANDMARKS.thornwick },
  { name: 'Goblin Cave', ...LANDMARKS.goblinCave },
  { name: 'Wolf Den', ...LANDMARKS.wolfDen },
  { name: 'West Lakeshore', ...LANDMARKS.lakeshore },
];

/** True when tile (x, y) of `map` should be drawn (towns are never fogged). */
export function tileKnown(state: GameState, map: MapDef, x: number, y: number): boolean {
  return !map.fog || isExplored(state.explored[map.id], map.rows[0].length, x, y);
}

/** Main story objective plus every companion side quest that has been offered. */
export function questLog(state: GameState): string[] {
  const f = state.flags;
  const lines = [
    !f['bossDefeated']
      ? 'MAIN: Defeat the Goblin King in his cave in the north-eastern hills.'
      : !f['actOneComplete']
        ? 'MAIN: Report your victory to King Aldric in Aldmere.'
        : 'MAIN: Act I complete. Grow strong and gather allies.',
  ];
  let any = false;
  for (const slot of COMPANION_SLOTS) {
    const stage = questStage(state, slot.id);
    if (stage === 'locked' || state.quests[slot.id] === undefined) {
      continue;
    }
    any = true;
    const who = state.companions[slot.id]?.name ?? '???';
    const q = slot.quest;
    if (stage === 'done') {
      lines.push(`${q.title.toUpperCase()} (${who}): Complete.`);
    } else if (stage === 'ready') {
      lines.push(`${q.title.toUpperCase()} (${who}): Done! Return to ${who} in ${slot.home}.`);
    } else if (stage === 'available') {
      lines.push(`${q.title.toUpperCase()} (${who}): Not accepted. Talk to ${who} in ${slot.home}.`);
    } else {
      lines.push(`${q.title.toUpperCase()} (${who}): ${q.objective}`);
    }
  }
  if (!any) {
    lines.push(
      f['bossDefeated']
        ? 'Travelers across the vale may need your help. Talk to them.'
        : 'Nobody will join an untested hero. Defeat the Goblin King first.',
    );
  }
  return lines;
}

/**
 * Quest pins on map `mapId`: the mini-boss spot for accepted quests, and the quest giver once the quest is
 * ready to turn in (a town giver is pinned at the town's overworld entrance).
 */
export function questPins(state: GameState, mapId: string): Array<{ x: number; y: number }> {
  const landmarks: Readonly<Record<string, { x: number; y: number }>> = LANDMARKS;
  const pins: Array<{ x: number; y: number }> = [];
  for (const slot of COMPANION_SLOTS) {
    const stage = questStage(state, slot.id);
    if (stage === 'active' && slot.quest.pin.mapId === mapId) {
      pins.push(slot.quest.pin);
    } else if (stage === 'ready') {
      if (slot.mapId === mapId) {
        pins.push({ x: slot.x, y: slot.y });
      } else if (mapId === 'overworld' && landmarks[slot.mapId]) {
        pins.push(landmarks[slot.mapId]);
      }
    }
  }
  return pins;
}

/**
 * World map overlay (M): the current map scaled to fit, explored tiles only, with a blinking
 * party marker, discovered places and quest pins.
 */
export class MapScene implements Scene {
  public readonly id = 'world-map';
  public readonly overlay = true;
  private readonly state: GameState;
  private readonly map: MapDef;
  private image: HTMLCanvasElement | null = null;
  private readonly scale: number;
  private time = 0;

  constructor(private readonly ctx: GameContext) {
    this.state = requireState(ctx);
    this.map = mapDef(this.state.mapId);
    const w = this.map.rows[0].length;
    const h = this.map.rows.length;
    const fit = Math.min(MAP_AREA_W / w, MAP_AREA_H / h);
    this.scale = Math.max(1, Math.floor(fit * 2) / 2);
    // The terrain image is built lazily on first render (needs a DOM canvas).
  }

  public update(dt: number, input: InputManager): void {
    this.time += dt;
    if (input.wasPressed('map') || input.wasPressed('cancel') || input.wasPressed('confirm')) {
      this.ctx.audio.play('cancel');
      this.ctx.stack.pop();
    }
  }

  public render(r: Renderer): void {
    r.fillRect(0, 0, SCREEN_W, SCREEN_H, 'rgba(0,0,0,0.6)');
    const w = this.map.rows[0].length * this.scale;
    const h = this.map.rows.length * this.scale;
    const ox = MAP_X + Math.floor((MAP_AREA_W - w) / 2);
    const oy = MAP_Y + Math.floor((MAP_AREA_H - h) / 2);
    r.window(MAP_X - 8, 4, MAP_AREA_W + 16, SCREEN_H - 8, '#d8c090', PARCHMENT);
    r.textCentered(this.map.name.toUpperCase(), MAP_X + MAP_AREA_W / 2, 10, COLORS.gold);
    this.image ??= this.buildImage(this.map.rows[0].length, this.map.rows.length);
    r.draw(this.image, ox, oy, { scale: this.scale });
    const px = (x: number): number => ox + x * this.scale;
    const py = (y: number): number => oy + y * this.scale;
    const known = (x: number, y: number): boolean => tileKnown(this.state, this.map, x, y);
    const places = this.map.id === 'overworld' ? PLACES.filter((p) => known(p.x, p.y)) : [];
    places.forEach((p) => r.strokeRect(px(p.x) - 2, py(p.y) - 2, this.scale + 4, this.scale + 4, '#ffffff'));
    const pins = this.pins().filter((p) => known(p.x, p.y));
    if (Math.floor(this.time * 3) % 2 === 0) {
      pins.forEach((p) => {
        r.fillRect(px(p.x) + this.scale / 2 - 1, py(p.y) - 6, 2, 4, COLORS.gold);
        r.fillRect(px(p.x) + this.scale / 2 - 1, py(p.y) - 1, 2, 1, COLORS.gold);
      });
    }
    const blink = Math.floor(this.time * 4) % 2 === 0;
    const s = Math.max(3, this.scale + 1);
    r.fillRect(px(this.state.x) + this.scale / 2 - s / 2, py(this.state.y) + this.scale / 2 - s / 2, s, s, blink ? '#ff3030' : '#ffffff');
    this.renderLegend(r, places, pins.length > 0);
  }

  private pins(): Array<{ x: number; y: number }> {
    return questPins(this.state, this.map.id);
  }

  private renderLegend(r: Renderer, places: ReadonlyArray<{ name: string }>, hasPins: boolean): void {
    const x = LEGEND_X;
    r.window(x, 4, SCREEN_W - x - 4, SCREEN_H - 8);
    let y = 12;
    r.text('LEGEND', x + 8, y, COLORS.gold);
    y += 12;
    r.fillRect(x + 10, y + 1, 4, 4, '#ff3030');
    r.text('YOU', x + 20, y);
    y += 10;
    if (hasPins) {
      r.fillRect(x + 11, y, 2, 4, COLORS.gold);
      r.fillRect(x + 11, y + 5, 2, 1, COLORS.gold);
      r.text('QUEST', x + 20, y);
      y += 10;
    }
    if (this.map.id === 'overworld') {
      y += 4;
      r.text('PLACES', x + 8, y, COLORS.gold);
      y += 12;
      if (places.length === 0) {
        r.text('NONE YET', x + 12, y, COLORS.dim);
        y += 10;
      }
      places.forEach((p) => {
        r.text(p.name.toUpperCase(), x + 12, y);
        y += 10;
      });
    }
    y += 4;
    r.text('QUESTS', x + 8, y, COLORS.gold);
    y += 12;
    const width = Math.floor((SCREEN_W - x - 20) / 6);
    for (const line of questLog(this.state)) {
      for (const part of wrapText(line, width)) {
        if (y > SCREEN_H - 40) {
          break;
        }
        r.text(part, x + 8, y, COLORS.dim);
        y += 9;
      }
    }
    const sky =
      this.map.backdrop === 'cave'
        ? 'UNDERGROUND'
        : `${SEASON_NAMES[seasonAt(this.state.steps)]} - ${WEATHER[currentWeather(this.state)].name}`.toUpperCase();
    r.text(sky, x + 8, SCREEN_H - 29, COLORS.gold);
    r.text('M / X: CLOSE', x + 8, SCREEN_H - 18, COLORS.dim);
  }

  /** One pixel per tile; unexplored tiles are fog. */
  private buildImage(w: number, h: number): HTMLCanvasElement {
    const canvas = createCanvas(w, h);
    const g = canvas.getContext('2d');
    if (!g) {
      return canvas;
    }
    const ids = new Map(this.map.legend.map((t) => [t.char, t.id]));
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const id = ids.get(this.map.rows[y][x]) ?? '';
        g.fillStyle = tileKnown(this.state, this.map, x, y) ? TILE_COLORS[id] ?? '#808080' : FOG_COLOR;
        g.fillRect(x, y, 1, 1);
      }
    }
    return canvas;
  }
}

const MAP_X = 16;
const MAP_Y = 22;
/** Map area keeps the screen's proportions; the legend gets the rest of the width. */
const MAP_AREA_W = Math.round(SCREEN_W * 0.5625);
const MAP_AREA_H = SCREEN_H - 34;
const LEGEND_X = MAP_X + MAP_AREA_W + 12;
