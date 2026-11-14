import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  HostListener,
  inject,
  NgZone,
  OnDestroy,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  CONTROLS,
  ControlEntry,
  JousterQuestGame,
  POINTER_CONTROLS,
  PointerControlEntry,
  TEXT_ENTRY_SCENES,
  TOUCH_BUTTONS,
  TouchButton,
} from '@jouster/game/quest';
import { PageTitleComponent } from '../../components/page-title/page-title.component';

/**
 * Base on-page size of the canvas in CSS pixels (the 480x270 logical layout at 2x). The canvas itself is
 * 1920x1080 (4x density), so HiDPI screens and 1080p full screen show every art pixel 1:1.
 */
const DISPLAY_W = 960;
const DISPLAY_H = 540;
/** Held direction buttons repeat like a held key: first repeat after this delay, then every REPEAT_MS. */
const REPEAT_DELAY_MS = 350;
const REPEAT_MS = 120;

/** True on phones and tablets (a coarse pointer and no fine one), where the touch pad is shown by default. */
export function prefersTouchPad(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia('(pointer: coarse)').matches && !window.matchMedia('(any-pointer: fine)').matches;
}

/**
 * Largest whole-number scale of the canvas that fits the available space, so pixels stay square and even.
 * Falls back to fitting (a fractional scale) when even 1x does not fit, e.g. on phones.
 */
export function integerScale(availW: number, availH: number): number {
  const fit = Math.min(availW / DISPLAY_W, availH / DISPLAY_H);
  return fit >= 1 ? Math.floor(fit) : fit;
}

/** Hosts the Jouster Quest canvas game. The game loop runs outside Angular's zone. */
@Component({
  selector: 'jstr-jouster-quest',
  standalone: true,
  imports: [CommonModule, PageTitleComponent],
  templateUrl: './jouster-quest.component.html',
  styleUrls: ['./jouster-quest.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JousterQuestComponent implements AfterViewInit, OnDestroy {
  @ViewChild('screen', { static: true }) public canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('frame', { static: true }) public frameRef!: ElementRef<HTMLElement>;

  public unsupported = false;
  public fullscreen = false;
  public readonly controls: readonly ControlEntry[] = CONTROLS;
  public readonly pointerControls: readonly PointerControlEntry[] = POINTER_CONTROLS;
  public readonly dpad: readonly TouchButton[] = TOUCH_BUTTONS.filter((b) => b.repeat);
  public readonly faceButtons: readonly TouchButton[] = TOUCH_BUTTONS.filter((b) => b.id === 'a' || b.id === 'b');
  public readonly menuButtons: readonly TouchButton[] = TOUCH_BUTTONS.filter(
    (b) => !b.repeat && b.id !== 'a' && b.id !== 'b',
  );
  public touchPad = prefersTouchPad();
  private game: JousterQuestGame | null = null;
  private readonly held = new Map<string, ReturnType<typeof setTimeout> | undefined>();
  private readonly zone = inject(NgZone);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly onKeyDown = (e: KeyboardEvent): void => {
    const typing = TEXT_ENTRY_SCENES.includes(this.canvasRef.nativeElement.dataset['scene'] ?? '');
    if (e.code === 'KeyF' && !e.repeat && !e.ctrlKey && !e.altKey && !e.metaKey && !typing) {
      e.preventDefault();
      this.zone.run(() => this.toggleFullscreen());
    }
  };

  public ngAfterViewInit(): void {
    const canvas = this.canvasRef.nativeElement;
    canvas.addEventListener('keydown', this.onKeyDown);
    try {
      this.zone.runOutsideAngular(() => {
        this.game = new JousterQuestGame(canvas, {
          keySource: canvas,
          onSceneChange: (id) => {
            canvas.dataset['scene'] = id ?? '';
          },
        });
        this.game.start();
      });
      canvas.focus();
    } catch {
      this.unsupported = true;
      this.cdr.markForCheck();
    }
  }

  public ngOnDestroy(): void {
    TOUCH_BUTTONS.forEach((b) => this.touchRelease(b));
    this.canvasRef.nativeElement.removeEventListener('keydown', this.onKeyDown);
    this.game?.destroy();
    this.game = null;
  }

  /** Clicking the canvas focuses it (and unlocks audio on the first user gesture). */
  public focusCanvas(): void {
    this.canvasRef.nativeElement.focus();
  }

  /** Shows or hides the on-screen touch pad. */
  public toggleTouchPad(): void {
    this.touchPad = !this.touchPad;
    this.canvasRef.nativeElement.focus();
  }

  /**
   * Touch pad button pressed: send its key to the canvas as a real keydown, so the game handles it exactly like the
   * keyboard. The default is prevented so the canvas keeps focus (losing it would release every held key).
   */
  public touchPress(button: TouchButton, event?: Event): void {
    event?.preventDefault();
    if (this.held.has(button.id)) {
      return;
    }
    const canvas = this.canvasRef.nativeElement;
    if (document.activeElement !== canvas) {
      canvas.focus();
    }
    this.sendKey('keydown', button, false);
    const repeat = (delay: number): ReturnType<typeof setTimeout> =>
      setTimeout(() => {
        this.sendKey('keydown', button, true);
        this.held.set(button.id, repeat(REPEAT_MS));
      }, delay);
    this.held.set(button.id, button.repeat ? repeat(REPEAT_DELAY_MS) : undefined);
  }

  /** Touch pad button released (or the finger slid off it). */
  public touchRelease(button: TouchButton, event?: Event): void {
    event?.preventDefault();
    if (!this.held.has(button.id)) {
      return;
    }
    clearTimeout(this.held.get(button.id));
    this.held.delete(button.id);
    this.sendKey('keyup', button, false);
  }

  private sendKey(type: 'keydown' | 'keyup', button: TouchButton, repeat: boolean): void {
    this.canvasRef.nativeElement.dispatchEvent(
      new KeyboardEvent(type, { code: button.code, key: button.key, repeat, bubbles: true, cancelable: true }),
    );
  }

  /** F key / button: show the game frame full screen (Fullscreen API), or leave full screen. */
  public toggleFullscreen(): void {
    const frame = this.frameRef.nativeElement;
    if (document.fullscreenElement) {
      void document.exitFullscreen?.();
    } else if (typeof frame.requestFullscreen === 'function') {
      void frame.requestFullscreen().catch(() => undefined);
    }
    this.canvasRef.nativeElement.focus();
  }

  @HostListener('document:fullscreenchange')
  @HostListener('window:resize')
  public updateScale(): void {
    const canvas = this.canvasRef.nativeElement;
    this.fullscreen = !!document.fullscreenElement && document.fullscreenElement === this.frameRef.nativeElement;
    if (this.fullscreen) {
      const scale = integerScale(window.innerWidth, window.innerHeight);
      canvas.style.width = `${Math.floor(DISPLAY_W * scale)}px`;
    } else {
      canvas.style.width = '';
    }
    this.cdr.markForCheck();
  }
}
