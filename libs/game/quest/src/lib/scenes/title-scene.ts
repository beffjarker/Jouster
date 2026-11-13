import { InputManager, Renderer, Scene } from '@jouster/game/engine';
import { TILE, fitScale, spriteSize, tileAnchor } from '../art/art';
import { CLASS_ORDER, classDef } from '../data/classes';
import { ABILITIES } from '../data/abilities';
import { GameState, hasSave, loadGame, newGameState } from '../state/game-state';
import { createMember, memberStats, weaponDef } from '../state/party';
import { COLORS, ListMenu, SCREEN_H, SCREEN_W, charsFit } from '../ui/widgets';

/** The title and name screens were laid out for a 216-unit-tall screen; centre that block vertically. */
const OY = Math.floor((SCREEN_H - 216) / 2);
import { GameContext } from './context';
import { WorldScene } from './world-scene';

/** Title screen: New Game / Continue. */
export class TitleScene implements Scene {
  public readonly id = 'title';
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
    r.clear('#0b0b2a');
    for (let i = 0; i < 40; i++) {
      const x = (i * 97) % SCREEN_W;
      const y = (i * 53) % (100 + OY);
      const on = Math.floor(this.time * 2 + i) % 5 !== 0;
      r.fillRect(x, y, 1, 1, on ? '#ffffff' : '#555577');
    }
    drawMountains(r, 138 + OY);
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

function drawMountains(r: Renderer, baseY: number): void {
  for (let x = 0; x < SCREEN_W; x++) {
    const h = 30 + Math.round(18 * Math.sin(x / 23) + 10 * Math.sin(x / 7 + 1));
    r.fillRect(x, baseY - h, 1, h, '#1e2050');
    const h2 = 14 + Math.round(8 * Math.sin(x / 13 + 2));
    r.fillRect(x, baseY - h2, 1, h2, '#283a28');
  }
  r.fillRect(0, baseY, SCREEN_W, SCREEN_H - baseY, '#1a2a18');
}

/** Choose the hero's class; shows stats, weapon and abilities. */
export class ClassSelectScene implements Scene {
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
    r.clear('#000000');
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

/** Type the hero's name (keyboard), Enter to start. */
export class NameEntryScene implements Scene {
  public readonly id = 'name-entry';
  private name: string;
  private time = 0;

  constructor(
    private readonly ctx: GameContext,
    private readonly classId: (typeof CLASS_ORDER)[number],
  ) {
    this.name = 'HERO';
  }

  public update(dt: number, input: InputManager): void {
    this.time += dt;
    for (const key of input.typed) {
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
  }

  public render(r: Renderer): void {
    r.clear('#000000');
    const cls = classDef(this.classId);
    r.textCentered(`NAME YOUR ${cls.name.toUpperCase()}`, SCREEN_W / 2, 60 + OY, COLORS.gold);
    const portrait = this.ctx.art.character(this.classId, 'down', Math.floor(this.time * 3) % 2);
    r.draw(portrait, SCREEN_W / 2 - TILE, 80 + OY, { scale: fitScale(portrait, TILE * 2) });
    r.window(SCREEN_W / 2 - 40, 124 + OY, 80, 22);
    const cursor = Math.floor(this.time * 2) % 2 === 0 ? '_' : ' ';
    r.text(this.name + (this.name.length < MAX_NAME ? cursor : ''), SCREEN_W / 2 - 30, 131 + OY);
    r.textCentered('TYPE A NAME, THEN PRESS ENTER', SCREEN_W / 2, 160 + OY, COLORS.dim);
    r.textCentered('BACKSPACE DELETES  ESC GOES BACK', SCREEN_W / 2, 172 + OY, COLORS.dim);
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
