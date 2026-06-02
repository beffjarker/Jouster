import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

/**
 * Dual-handle date range slider for filtering timeline entries by date.
 *
 * Uses month-level granularity internally (months since epoch) mapped to
 * two overlaid `<input type="range">` elements for start/end selection.
 *
 * @example
 * ```html
 * <jstr-timeline-slider
 *   [minDate]="birthDate"
 *   [maxDate]="currentDate"
 *   [defaultRangeYears]="2"
 *   (rangeChange)="onSliderRangeChange($event)">
 * </jstr-timeline-slider>
 * ```
 */
@Component({
  selector: 'jstr-timeline-slider',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './timeline-slider.component.html',
  styleUrls: ['./timeline-slider.component.scss'],
})
export class TimelineSliderComponent implements OnInit, OnChanges {
  /** Earliest selectable date (e.g., birth date). */
  @Input() minDate: Date = new Date('1978-04-02');

  /** Latest selectable date (e.g., today). */
  @Input() maxDate: Date = new Date();

  /** How many years back from maxDate to set the default start handle. */
  @Input() defaultRangeYears = 2;

  /** Emits when the selected date range changes (on init and on drag). */
  @Output() rangeChange = new EventEmitter<{ start: Date; end: Date }>();

  /** Internal numeric min (months since epoch). */
  public sliderMin = 0;

  /** Internal numeric max (months since epoch). */
  public sliderMax = 1;

  /** Current start handle value (months since epoch). */
  public startValue = 0;

  /** Current end handle value (months since epoch). */
  public endValue = 1;

  /** Formatted label for the start handle. */
  public startLabel = '';

  /** Formatted label for the end handle. */
  public endLabel = '';

  /** Debounce timer ID for range emissions. */
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;

  /** Year tick marks displayed along the slider track. */
  public yearTicks: { year: number; percent: number }[] = [];

  public ngOnInit(): void {
    this.initializeSlider();
  }

  public ngOnChanges(changes: SimpleChanges): void {
    if (changes['minDate'] || changes['maxDate'] || changes['defaultRangeYears']) {
      this.initializeSlider();
    }
  }

  /**
   * Set up slider bounds and default handle positions, then emit the default range.
   */
  private initializeSlider(): void {
    this.sliderMin = this.dateToMonths(this.minDate);
    this.sliderMax = this.dateToMonths(this.maxDate);

    // Default start = maxDate minus defaultRangeYears
    const defaultStart = new Date(
      this.maxDate.getFullYear() - this.defaultRangeYears,
      this.maxDate.getMonth(),
      1
    );
    this.startValue = Math.max(this.dateToMonths(defaultStart), this.sliderMin);
    this.endValue = this.sliderMax;

    this.updateLabels();
    this.buildYearTicks();

    // Emit the default range immediately so parent filters on load
    this.emitRange();
  }

  /**
   * Called when the start (left) handle changes.
   * Prevents start from exceeding end.
   */
  public onStartChange(value: number | string): void {
    const num = typeof value === 'string' ? parseInt(value, 10) : value;
    this.startValue = Math.min(num, this.endValue);
    this.updateLabels();
    this.debouncedEmit();
  }

  /**
   * Called when the end (right) handle changes.
   * Prevents end from going below start.
   */
  public onEndChange(value: number | string): void {
    const num = typeof value === 'string' ? parseInt(value, 10) : value;
    this.endValue = Math.max(num, this.startValue);
    this.updateLabels();
    this.debouncedEmit();
  }

  /**
   * Reset handles to the default positions (last N years).
   * Can be called externally via ViewChild.
   */
  public reset(): void {
    this.initializeSlider();
  }

  /**
   * Programmatically set the slider range to encompass the given dates.
   * Adds a 1-month buffer on each side for visual breathing room.
   */
  public setRange(start: Date, end: Date): void {
    this.startValue = Math.max(this.dateToMonths(start) - 1, this.sliderMin);
    this.endValue = Math.min(this.dateToMonths(end) + 1, this.sliderMax);
    this.updateLabels();
    this.emitRange();
  }

  /**
   * Calculate the left percentage of the filled track area.
   */
  public get fillLeft(): number {
    const range = this.sliderMax - this.sliderMin;
    if (range <= 0) return 0;
    return ((this.startValue - this.sliderMin) / range) * 100;
  }

  /**
   * Calculate the width percentage of the filled track area.
   */
  public get fillWidth(): number {
    const range = this.sliderMax - this.sliderMin;
    if (range <= 0) return 100;
    return ((this.endValue - this.startValue) / range) * 100;
  }

  /**
   * Convert a Date to months since epoch (year * 12 + month).
   */
  private dateToMonths(date: Date): number {
    return date.getFullYear() * 12 + date.getMonth();
  }

  /**
   * Convert months since epoch back to a Date (1st of the month).
   */
  private monthsToDate(months: number): Date {
    const year = Math.floor(months / 12);
    const month = months % 12;
    return new Date(year, month, 1);
  }

  /**
   * Format a months-since-epoch value to "MMM yyyy" for display.
   */
  private formatMonthYear(months: number): string {
    const date = this.monthsToDate(months);
    const monthNames = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    ];
    return `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
  }

  /** Update both handle labels. */
  private updateLabels(): void {
    this.startLabel = this.formatMonthYear(this.startValue);
    this.endLabel = this.formatMonthYear(this.endValue);
  }

  /** Build year tick marks for display under the slider. */
  private buildYearTicks(): void {
    const minYear = this.monthsToDate(this.sliderMin).getFullYear();
    const maxYear = this.monthsToDate(this.sliderMax).getFullYear();
    const totalYears = maxYear - minYear;
    const range = this.sliderMax - this.sliderMin;

    // Choose step: every 5 years for long spans, every 2 for short
    let step = 5;
    if (totalYears <= 10) step = 1;
    else if (totalYears <= 20) step = 2;
    else if (totalYears <= 30) step = 5;
    else step = 10;

    this.yearTicks = [];
    // Always include first year
    this.yearTicks.push({ year: minYear, percent: 0 });

    const firstTick = Math.ceil(minYear / step) * step;
    for (let y = firstTick; y <= maxYear; y += step) {
      if (y === minYear || y === maxYear) continue;
      const monthVal = y * 12; // January of that year
      const pct = ((monthVal - this.sliderMin) / range) * 100;
      if (pct > 2 && pct < 98) {
        this.yearTicks.push({ year: y, percent: pct });
      }
    }

    // Always include last year
    this.yearTicks.push({ year: maxYear, percent: 100 });
  }

  /**
   * Debounce range emissions to avoid excessive calls during drag (~150ms).
   */
  private debouncedEmit(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    this.debounceTimer = setTimeout(() => {
      this.emitRange();
    }, 150);
  }

  /** Emit the current range to the parent. */
  private emitRange(): void {
    this.rangeChange.emit({
      start: this.monthsToDate(this.startValue),
      end: this.monthsToDate(this.endValue),
    });
  }
}

