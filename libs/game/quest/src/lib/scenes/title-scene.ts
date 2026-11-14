import { InputManager, PointerPoint, Renderer, Scene } from '@jouster/game/engine';
import { TILE, fitScale, spriteSize, tileAnchor } from '../art/art';
import { titleTwinkles } from '../art/hd-backdrops';
import { CLASS_ORDER, classDef } from '../data/classes';
import { ABILITIES } from '../data/abilities';
import { GameState, hasSave, loadGame, newGameState } from '../state/game-state';
import { createMember, memberStats, weaponDef } from '../state/party';
import { COLORS, ListMenu, SCREEN_H, SCREEN_W, charsFit, inRect } from '../ui/widgets';

/** The title and name screens were laid out for a 216-unit-tall screen; centre that block vertically. */
const OY = Math.floor((SCREEN_H - 216) / 2);
/** Horizon of the painted title backdrop, just under the class line-up. */
const HORIZON = 138 + OY;
/** Blinking glints over the painted stars, clear of the moon (upper left). */
const TWINKLES = titleTwinkles(SCREEN_W, HORIZON, 24).filter((t) => Math.hypot(t.x - SCREEN_W * 0.15, t.y - HORIZON * 0.3) > 30);
import { GameContext } from './context';
import { WorldScene } from './world-scene';

/** Title screen: New Game / Continue. */
export class TitleScene implements Scene {
  public readonly id = 'title';
  public readonly music = 'title';
  private readonly menu: ListMenu;
  private time = 0;

  constructor(private readonly ctx: GameContext) {
    this.menu = new ListMenu([{ label: 'NEW GAME' }, { label: 'CONTINUE', enabled: hasSave(ctx.storage) }], ctx.audio);
    if (hasSave(ctx.storage)) {
      this.menu.cursor = 1;
    }
  }

  public update(dt: number, input: InputManager): void {
    this.time += dt;
    const res = this.menu.update(input);
    if (res?.kind !== 'select') {
      return;
    }
    if (res.index === 0) {
      this.ctx.stack.replace(new ClassSelectScene(this.ctx), true);
      return;
    }
    const state = loadGame(this.ctx.storage);
    if (state) {
      this.ctx.state = state;
      this.ctx.stack.replace(new WorldScene(this.ctx), true);
    }
  }

  public render(r: Renderer): void {
    r.draw(this.ctx.art.titleBackdrop(SCREEN_W, SCREEN_H, HORIZON), 0, 0);
    TWINKLES.forEach((t, i) => {
      const a = Math.max(0, Math.sin(this.time * (1.3 + (i % 5) * 0.4) + i * 2.1));
      if (a > 0.05) {
        const c = `rgba(255,255,255,${(a * 0.9).toFixed(2)})`;
        r.fillRect(t.x - 1, t.y - 0.25, 2.5, 0.5, c);
        r.fillRect(t.x, t.y - 1.25, 0.5, 2.5, c);
      }
    });
    r.textCentered('JOUSTER', SCREEN_W / 2 + 1, 41 + OY, '#802010');
    r.textCentered('JOUSTER', SCREEN_W / 2, 40 + OY, COLORS.gold);
    r.textCentered('QUEST', SCREEN_W / 2 + 1, 53 + OY, '#802010');
    r.textCentered('QUEST', SCREEN_W / 2, 52 + OY, COLORS.gold);
    r.textCentered('THE DRAGON SEAL', SCREEN_W / 2, 70 + OY, COLORS.text);
    CLASS_ORDER.forEach((id, i) => {
      const frame = Math.floor(this.time * 3 + i) % 2;
      const sprite = this.ctx.art.character(id, 'down', frame);
      const gap = Math.max(24, spriteSize(sprite).width);
      const a = tileAnchor(sprite);
      r.draw(sprite, SCREEN_W / 2 - (CLASS_ORDER.length * gap) / 2 + (gap - TILE) / 2 + i * gap - a.x, 104 + OY - a.y);
    });
    this.menu.render(r, SCREEN_W / 2 - 44, 150 + OY, 88);
    r.textCentered('ARROWS/WASD MOVE  Z/ENTER OK  X/ESC BACK  M MAP', SCREEN_W / 2, SCREEN_H - 16, COLORS.dim);
  }
}

/** Draws the title's night scene, dimmed, behind the class and name screens. */
function dimBackdrop(r: Renderer, ctx: GameContext): void {
  r.draw(ctx.art.titleBackdrop(SCREEN_W, SCREEN_H, HORIZON), 0, 0);
  r.fade(0.62, '#000000');
}

/** Choose the hero's class; shows stats, weapon and abilities. */
export class ClassSelectScene implements Scene {
  public readonly music = 'title';
  public readonly id = 'class-select';
  private readonly menu: ListMenu;
  private time = 0;

  constructor(private readonly ctx: GameContext) {
    this.menu = new ListMenu(
      CLASS_ORDER.map((id) => ({ label: classDef(id).name.toUpperCase() })),
      ctx.audio,
    );
  }

  public update(dt: number, input: InputManager): void {
    this.time += dt;
    const res = this.menu.update(input);
    if (res?.kind === 'select') {
      this.ctx.stack.replace(new NameEntryScene(this.ctx, CLASS_ORDER[res.index]), true);
    } else if (res?.kind === 'cancel') {
      this.ctx.stack.replace(new TitleScene(this.ctx), true);
    }
  }

  public render(r: Renderer): void {
    dimBackdrop(r, this.ctx);
    r.textCentered('CHOOSE YOUR CLASS', SCREEN_W / 2, 8, COLORS.gold);
    this.menu.render(r, 8, 24, 76);
    const id = CLASS_ORDER[this.menu.cursor];
    const cls = classDef(id);
    const m = createMember('preview', cls.name, id, 1);
    const s = memberStats(m);
    const x = 92;
    r.window(x, 24, SCREEN_W - x - 8, SCREEN_H - 32);
    const frame = Math.floor(this.time * 3) % 2;
    const portrait = this.ctx.art.character(id, 'down', frame);
    r.draw(portrait, x + 8, 32, { scale: fitScale(portrait, TILE * 2) });
    r.text(cls.name.toUpperCase(), x + 44, 34, COLORS.gold);
    r.text(cls.role.toUpperCase(), x + 44, 46, COLORS.dim);
    const stats: Array<[string, number]> = [
      ['HP', s.hp],
      ['MP', s.mp],
      ['ATK', s.atk],
      ['DEF', s.def],
      ['AGI', s.agi],
      ['MAG', s.mag],
    ];
    stats.forEach(([label, v], i) => {
      const sx = x + 8 + (i % 2) * 74;
      const sy = 70 + Math.floor(i / 2) * 11;
      r.text(label, sx, sy, COLORS.dim);
      r.textRight(String(v), sx + 60, sy);
    });
    r.text('WEAPON', x + 8, 108, COLORS.dim);
    r.text(weaponDef(cls.startingWeaponId).name.toUpperCase(), x + 54, 108);
    r.text('SKILLS', x + 160, 34, COLORS.dim);
    cls.abilities.slice(0, 6).forEach((a, i) => {
      const name = ABILITIES.get(a.abilityId)?.name ?? a.abilityId;
      r.text(`L${String(a.level).padEnd(2)} ${name.toUpperCase()}`, x + 166, 46 + i * 10);
    });
    const desc = cls.passive ? `${cls.description} ${cls.passive.name}: ${cls.passive.description}` : cls.description;
    wrapLines(desc, charsFit(SCREEN_W - x - 24)).slice(0, 8).forEach((line, i) => r.text(line, x + 8, 128 + i * 11, COLORS.text));
  }
}

function wrapLines(text: string, width: number): string[] {
  const out: string[] = [];
  let line = '';
  text.split(' ').forEach((word) => {
    if ((line + ' ' + word).trim().length > width) {
      out.push(line);
      line = word;
    } else {
      line = (line + ' ' + word).trim();
    }
  });
  if (line) {
    out.push(line);
  }
  return out;
}

const MAX_NAME = 7;
const NAME_CHARS = /^[a-zA-Z0-9 '-]$/;

/** One key of the on-screen keyboard used to name the hero by mouse or touch. */
export interface NameKey {
  /** Character typed, or a command. */
  readonly value: string | 'DEL' | 'BACK' | 'OK';
  readonly label: string;
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

const KEY_W = 20;
const KEY_H = 13;
const GRID_COLS = 10;
const GRID_X = SCREEN_W / 2 - (GRID_COLS * KEY_W) / 2;
const GRID_Y = 182 + OY - 27;

/** A-Z, '-', apostrophe, space and delete on a 10-wide grid, with BACK and OK below. */
export const NAME_KEYS: readonly NameKey[] = [
  ...[...'ABCDEFGHIJKLMNOPQRSTUVWXYZ', '-', "'", ' ', 'DEL'].map((value, i) => ({
    value,
    label: value === ' ' ? 'SP' : value === 'DEL' ? 'DL' : value,
    x: GRID_X + (i % GRID_COLS) * KEY_W,
    y: GRID_Y + Math.floor(i / GRID_COLS) * KEY_H,
    w: KEY_W,
    h: KEY_H,
  })),
  { value: 'BACK', label: 'BACK', x: GRID_X, y: GRID_Y + 3 * KEY_H + 4, w: KEY_W * 3, h: KEY_H },
  { value: 'OK', label: 'OK', x: GRID_X + KEY_W * 7, y: GRID_Y + 3 * KEY_H + 4, w: KEY_W * 3, h: KEY_H },
];

/** On-screen key under a logical point, if any. */
export function nameKeyAt(p: PointerPoint | null): NameKey | undefined {
  return NAME_KEYS.find((k) => inRect(p, k.x, k.y, k.w, k.h));
}

/** Type the hero's name (keyboard), Enter to start. */
export class NameEntryScene implements Scene {
  public readonly music = 'title';
  public readonly id = 'name-entry';
  private name: string;
  private time = 0;
  private hover: NameKey | undefined;

  constructor(
    private readonly ctx: GameContext,
    private readonly classId: (typeof CLASS_ORDER)[number],
  ) {
    this.name = 'HERO';
  }

  public update(dt: number, input: InputManager): void {
    this.time += dt;
    const tapped = nameKeyAt(input.tap)?.value;
    const tappedKey = tapped === 'OK' ? 'Enter' : tapped === 'BACK' ? 'Escape' : tapped === 'DEL' ? 'Backspace' : tapped;
    for (const key of tappedKey ? [...input.typed, tappedKey] : input.typed) {
      if (key === 'Enter') {
        this.start();
        return;
      }
      if (key === 'Escape') {
        this.ctx.audio.play('cancel');
        this.ctx.stack.replace(new ClassSelectScene(this.ctx), true);
        return;
      }
      if (key === 'Backspace') {
        this.name = this.name.slice(0, -1);
        this.ctx.audio.play('cursor');
      } else if (NAME_CHARS.test(key) && this.name.length < MAX_NAME) {
        this.name += key.toUpperCase();
        this.ctx.audio.play('cursor');
      }
    }
    this.hover = nameKeyAt(input.pointer);
  }

  /** The hero's name as typed so far (for tests). */
  public get typedName(): string {
    return this.name;
  }

  public render(r: Renderer): void {
    dimBackdrop(r, this.ctx);
    const cls = classDef(this.classId);
    r.textCentered(`NAME YOUR ${cls.name.toUpperCase()}`, SCREEN_W / 2, 60 + OY, COLORS.gold);
    const portrait = this.ctx.art.character(this.classId, 'down', Math.floor(this.time * 3) % 2);
    r.draw(portrait, SCREEN_W / 2 - TILE, 80 + OY, { scale: fitScale(portrait, TILE * 2) });
    r.window(SCREEN_W / 2 - 40, 124 + OY, 80, 22);
    const cursor = Math.floor(this.time * 2) % 2 === 0 ? '_' : ' ';
    r.text(this.name + (this.name.length < MAX_NAME ? cursor : ''), SCREEN_W / 2 - 30, 131 + OY);
    NAME_KEYS.forEach((k) => {
      const lit = this.hover === k;
      const command = k.value === 'BACK' || k.value === 'OK';
      if (command) {
        r.window(k.x, k.y, k.w, k.h, lit ? COLORS.gold : COLORS.text);
      }
      const special = k.value === ' ' || k.value === 'DEL';
      r.textCentered(k.label, k.x + k.w / 2, k.y + 3, lit ? COLORS.gold : special ? COLORS.dim : COLORS.text);
    });
    r.textCentered('TYPE OR TAP A NAME  ENTER / OK STARTS  BACKSPACE DELETES  ESC GOES BACK', SCREEN_W / 2, SCREEN_H - 14, COLORS.dim);
  }

  private start(): void {
    const name = this.name.trim() || 'HERO';
    this.ctx.audio.play('confirm');
    const state: GameState = newGameState(name, this.classId, this.ctx.rng);
    this.ctx.state = state;
    const world = new WorldScene(this.ctx);
    this.ctx.stack.replace(world, true);
    world.queueMessage([
      `${name}, a young ${classDef(this.classId).name.toLowerCase()}, arrives at Aldmere castle.`,
      'Goblins have been raiding the valley, and rumors say an ancient dragon stirs beneath the peaks.',
      'Speak with King Aldric, or set out on your own. The world is yours to explore.',
    ]);
  }
}
