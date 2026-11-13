import { AudioManager, CELL_WIDTH, InputManager, Renderer, Scene, SceneStack, wrapText } from '@jouster/game/engine';

/** Logical 16:9 screen (rendered at 2x on a 768x432 canvas). */
export const SCREEN_W = 384;
export const SCREEN_H = 216;
export const LINE_H = 10;

export const COLORS = {
  text: '#ffffff',
  dim: '#7a7a8a',
  gold: '#f0d040',
  hp: '#40d060',
  hpLow: '#e04040',
  mp: '#4090f0',
  warn: '#ff8040',
};

/** Small right-pointing triangle cursor. */
export function drawCursor(r: Renderer, x: number, y: number, color = COLORS.text): void {
  for (let i = 0; i < 4; i++) {
    r.fillRect(x + i, y + i, 1, 7 - i * 2, color);
  }
}

/**
 * Small window with a short wrapped description (up to 3 lines), e.g. what the highlighted
 * item does. With `anchor: 'above'` the window's bottom edge sits at `y`.
 */
export function drawHint(r: Renderer, text: string, x: number, y: number, w: number, anchor: 'above' | 'below' = 'below'): void {
  const lines = wrapText(text.toUpperCase(), Math.floor((w - 16) / CELL_WIDTH)).slice(0, 3);
  const h = lines.length * LINE_H + 10;
  const top = anchor === 'above' ? y - h : y;
  r.window(x, top, w, h);
  lines.forEach((line, i) => r.text(line, x + 8, top + 6 + i * LINE_H));
}

export interface MenuItem {
  label: string;
  right?: string;
  enabled?: boolean;
}

export interface MenuSelect {
  kind: 'select';
  index: number;
}

export interface MenuCancel {
  kind: 'cancel';
}

export type MenuResult = MenuSelect | MenuCancel | null;

/** Vertical list menu with a wrapping cursor that scrolls when longer than `visible`. */
export class ListMenu {
  public cursor = 0;
  private scroll = 0;

  constructor(
    public items: MenuItem[],
    private readonly audio?: AudioManager,
    public visible = 8,
  ) {}

  public setItems(items: MenuItem[]): void {
    this.items = items;
    this.cursor = Math.max(0, Math.min(this.cursor, items.length - 1));
  }

  public update(input: InputManager): MenuResult {
    const n = this.items.length;
    let result: MenuResult = null;
    if (n > 0 && input.wasPressed('down')) {
      this.cursor = (this.cursor + 1) % n;
      this.audio?.play('cursor');
    } else if (n > 0 && input.wasPressed('up')) {
      this.cursor = (this.cursor - 1 + n) % n;
      this.audio?.play('cursor');
    } else if (n > 0 && input.wasPressed('confirm')) {
      if (this.items[this.cursor].enabled === false) {
        this.audio?.play('cancel');
      } else {
        this.audio?.play('confirm');
        result = { kind: 'select', index: this.cursor };
      }
    } else if (input.wasPressed('cancel')) {
      this.audio?.play('cancel');
      result = { kind: 'cancel' };
    }
    if (this.cursor < this.scroll) {
      this.scroll = this.cursor;
    } else if (this.cursor >= this.scroll + this.visible) {
      this.scroll = this.cursor - this.visible + 1;
    }
    return result;
  }

  public height(): number {
    return Math.max(1, Math.min(this.items.length, this.visible)) * LINE_H + 12;
  }

  /** Draws the menu inside its own window. */
  public render(r: Renderer, x: number, y: number, w: number, active = true, title?: string): void {
    r.window(x, y, w, this.height());
    if (title) {
      r.fillRect(x + 8, y - 1, title.length * 6 + 4, 3, '#000000');
      r.text(title, x + 10, y - 3, COLORS.gold);
    }
    const end = Math.min(this.items.length, this.scroll + this.visible);
    for (let i = this.scroll; i < end; i++) {
      const item = this.items[i];
      const ty = y + 7 + (i - this.scroll) * LINE_H;
      const color = item.enabled === false ? COLORS.dim : COLORS.text;
      r.text(item.label, x + 14, ty, color);
      if (item.right) {
        r.textRight(item.right, x + w - 8, ty, color);
      }
      if (i === this.cursor) {
        drawCursor(r, x + 6, ty, active ? COLORS.text : COLORS.dim);
      }
    }
    if (this.scroll > 0) {
      r.textRight('^', x + w - 3, y + 2, COLORS.dim);
    }
    if (end < this.items.length) {
      r.textRight('~', x + w - 3, y + this.height() - 9, COLORS.dim);
    }
  }
}

export const MESSAGE_CHARS = 58;
const MESSAGE_LINES = 4;
const MESSAGE_H = 68;
/** Top of the message window (it hugs the bottom of the screen). */
export const MESSAGE_Y = SCREEN_H - MESSAGE_H - 4;
const CHARS_PER_SECOND = 80;

export interface MessageOptions {
  choices?: string[];
  /** Receives the chosen option index (cancel picks the last option, or -1 without choices). */
  onClose?(choice: number): void;
}

/**
 * Dragon Warrior-style message box overlay: typewriter text, paging, and an optional choice
 * menu after the last page.
 */
export class MessageScene implements Scene {
  public readonly id = 'message';
  public readonly overlay = true;
  private readonly pages: string[][] = [];
  private page = 0;
  private shown = 0;
  private blink = 0;
  private readonly menu: ListMenu | null;

  constructor(
    private readonly stack: SceneStack,
    private readonly audio: AudioManager,
    lines: string[],
    private readonly options: MessageOptions = {},
  ) {
    lines.forEach((line) => {
      const wrapped = wrapText(line, MESSAGE_CHARS);
      for (let i = 0; i < wrapped.length; i += MESSAGE_LINES) {
        this.pages.push(wrapped.slice(i, i + MESSAGE_LINES));
      }
    });
    if (this.pages.length === 0) {
      this.pages.push(['']);
    }
    this.menu = options.choices?.length ? new ListMenu(options.choices.map((c) => ({ label: c })), audio) : null;
  }

  private get pageText(): string[] {
    return this.pages[this.page];
  }

  private get pageLength(): number {
    return this.pageText.reduce((s, l) => s + l.length, 0);
  }

  private get lastPage(): boolean {
    return this.page === this.pages.length - 1;
  }

  public update(dt: number, input: InputManager): void {
    this.blink += dt;
    const total = this.pageLength;
    if (this.shown < total) {
      this.shown = Math.min(total, this.shown + dt * CHARS_PER_SECOND);
      if (input.wasPressed('confirm') || input.wasPressed('cancel')) {
        this.shown = total;
      }
      return;
    }
    if (this.lastPage && this.menu) {
      const res = this.menu.update(input);
      if (res?.kind === 'select') {
        this.close(res.index);
      } else if (res?.kind === 'cancel') {
        this.close(this.menu.items.length - 1);
      }
      return;
    }
    if (input.wasPressed('confirm') || input.wasPressed('cancel')) {
      if (this.lastPage) {
        this.close(-1);
      } else {
        this.audio.play('cursor');
        this.page++;
        this.shown = 0;
      }
    }
  }

  public render(r: Renderer): void {
    const x = 8;
    const y = MESSAGE_Y;
    const w = SCREEN_W - 16;
    r.window(x, y, w, MESSAGE_H);
    let remaining = Math.floor(this.shown);
    this.pageText.forEach((line, i) => {
      r.text(line.slice(0, Math.max(0, remaining)), x + 10, y + 10 + i * 13);
      remaining -= line.length;
    });
    const done = this.shown >= this.pageLength;
    if (done && !(this.lastPage && this.menu) && Math.floor(this.blink * 3) % 2 === 0) {
      const cx = x + w / 2;
      for (let i = 0; i < 4; i++) {
        r.fillRect(cx - 3 + i, y + 62 + i, 7 - i * 2, 1, COLORS.text);
      }
    }
    if (done && this.lastPage && this.menu) {
      const mw = Math.max(...this.menu.items.map((c) => c.label.length)) * 6 + 24;
      this.menu.render(r, SCREEN_W - mw - 8, y - this.menu.height() - 2, mw);
    }
  }

  private close(choice: number): void {
    this.stack.pop();
    this.options.onClose?.(choice);
  }
}

/** Shows a message box and calls `then` when it is dismissed. */
export function say(stack: SceneStack, audio: AudioManager, lines: string[], then?: () => void): void {
  stack.push(new MessageScene(stack, audio, lines, { onClose: () => then?.() }));
}

/** Shows a message with choices; `then` receives the chosen index (cancel = last option). */
export function ask(
  stack: SceneStack,
  audio: AudioManager,
  lines: string[],
  choices: string[],
  then: (choice: number) => void,
): void {
  stack.push(new MessageScene(stack, audio, lines, { choices, onClose: then }));
}

export interface StatusEntry {
  name: string;
  level: number;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
}

/** Party status windows, one per member, centred horizontally. */
export function drawPartyStatus(r: Renderer, entries: StatusEntry[], y: number, highlight = -1): void {
  const w = 80;
  const gap = 4;
  const total = entries.length * w + (entries.length - 1) * gap;
  let x = Math.round((SCREEN_W - total) / 2);
  entries.forEach((e, i) => {
    r.window(x, y, w, 44, i === highlight ? COLORS.gold : COLORS.text);
    const dead = e.hp <= 0;
    const hpColor = dead ? COLORS.hpLow : e.hp <= e.maxHp / 4 ? COLORS.warn : COLORS.text;
    r.text(e.name.slice(0, 7), x + 7, y + 6, dead ? COLORS.hpLow : COLORS.text);
    r.textRight(`L${e.level}`, x + w - 6, y + 6, COLORS.dim);
    r.text('HP', x + 7, y + 16, hpColor);
    r.textRight(`${e.hp}/${e.maxHp}`, x + w - 6, y + 16, hpColor);
    r.bar(x + 7, y + 25, w - 14, 2, e.maxHp ? e.hp / e.maxHp : 0, dead ? COLORS.hpLow : COLORS.hp);
    r.text('MP', x + 7, y + 29, COLORS.text);
    r.textRight(`${e.mp}/${e.maxMp}`, x + w - 6, y + 29, COLORS.text);
    r.bar(x + 7, y + 38, w - 14, 2, e.maxMp ? e.mp / e.maxMp : 0, COLORS.mp);
    x += w + gap;
  });
}
