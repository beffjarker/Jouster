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
import { CONTROLS, ControlEntry, JousterQuestGame, TEXT_ENTRY_SCENES } from '@jouster/game/quest';
import { PageTitleComponent } from '../../components/page-title/page-title.component';

/** Canvas size in real pixels (480x270 logical layout at 2x density). */
const CANVAS_W = 960;
const CANVAS_H = 540;

/**
 * Largest whole-number scale of the canvas that fits the available space, so pixels stay square and even.
 * Falls back to fitting (a fractional scale) when even 1x does not fit, e.g. on phones.
 */
export function integerScale(availW: number, availH: number): number {
  const fit = Math.min(availW / CANVAS_W, availH / CANVAS_H);
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
  private game: JousterQuestGame | null = null;
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
    this.canvasRef.nativeElement.removeEventListener('keydown', this.onKeyDown);
    this.game?.destroy();
    this.game = null;
  }

  /** Clicking the canvas focuses it (and unlocks audio on the first user gesture). */
  public focusCanvas(): void {
    this.canvasRef.nativeElement.focus();
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
      canvas.style.width = `${Math.floor(CANVAS_W * scale)}px`;
    } else {
      canvas.style.width = '';
    }
    this.cdr.markForCheck();
  }
}
