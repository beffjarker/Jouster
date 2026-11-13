import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  inject,
  NgZone,
  OnDestroy,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { CONTROLS, ControlEntry, JousterQuestGame } from '@jouster/game/quest';
import { PageTitleComponent } from '../../components/page-title/page-title.component';

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

  public unsupported = false;
  public readonly controls: readonly ControlEntry[] = CONTROLS;
  private game: JousterQuestGame | null = null;
  private readonly zone = inject(NgZone);
  private readonly cdr = inject(ChangeDetectorRef);

  public ngAfterViewInit(): void {
    const canvas = this.canvasRef.nativeElement;
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
    this.game?.destroy();
    this.game = null;
  }

  /** Clicking the canvas focuses it (and unlocks audio on the first user gesture). */
  public focusCanvas(): void {
    this.canvasRef.nativeElement.focus();
  }
}
