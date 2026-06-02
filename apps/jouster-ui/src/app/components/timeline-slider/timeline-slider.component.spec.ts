import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { TimelineSliderComponent } from './timeline-slider.component';

describe('TimelineSliderComponent', () => {
  let component: TimelineSliderComponent;
  let fixture: ComponentFixture<TimelineSliderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TimelineSliderComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TimelineSliderComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  describe('initialization', () => {
    it('should set slider bounds from minDate and maxDate', () => {
      component.minDate = new Date(2000, 0, 1); // Jan 2000
      component.maxDate = new Date(2026, 4, 1); // May 2026
      fixture.detectChanges();

      expect(component.sliderMin).toBe(2000 * 12 + 0); // Jan 2000
      expect(component.sliderMax).toBe(2026 * 12 + 4); // May 2026
    });

    it('should default start handle to maxDate minus defaultRangeYears', () => {
      component.minDate = new Date(1978, 3, 2); // Apr 1978
      component.maxDate = new Date(2026, 4, 10); // May 2026
      component.defaultRangeYears = 2;
      fixture.detectChanges();

      const expectedStart = 2024 * 12 + 4; // May 2024
      expect(component.startValue).toBe(expectedStart);
      expect(component.endValue).toBe(2026 * 12 + 4);
    });

    it('should clamp default start to sliderMin if range exceeds available data', () => {
      component.minDate = new Date(2025, 0, 1); // Jan 2025
      component.maxDate = new Date(2026, 0, 1); // Jan 2026
      component.defaultRangeYears = 5; // Would go to Jan 2021, before min
      fixture.detectChanges();

      expect(component.startValue).toBe(2025 * 12 + 0); // clamped to min
    });

    it('should emit rangeChange on init with the default range', () => {
      const spy = jest.spyOn(component.rangeChange, 'emit');
      component.minDate = new Date(2000, 0, 1);
      component.maxDate = new Date(2026, 4, 1);
      component.defaultRangeYears = 2;
      fixture.detectChanges();

      expect(spy).toHaveBeenCalledTimes(1);
      const emitted = spy.mock.calls[0][0];
      expect(emitted.start.getFullYear()).toBe(2024);
      expect(emitted.start.getMonth()).toBe(4); // May
      expect(emitted.end.getFullYear()).toBe(2026);
      expect(emitted.end.getMonth()).toBe(4); // May
    });
  });

  describe('labels', () => {
    it('should format start and end labels as "MMM yyyy"', () => {
      component.minDate = new Date(2000, 0, 1);
      component.maxDate = new Date(2026, 4, 1);
      component.defaultRangeYears = 2;
      fixture.detectChanges();

      expect(component.startLabel).toBe('May 2024');
      expect(component.endLabel).toBe('May 2026');
    });
  });

  describe('handle changes', () => {
    beforeEach(() => {
      component.minDate = new Date(2000, 0, 1);
      component.maxDate = new Date(2026, 4, 1);
      component.defaultRangeYears = 2;
      fixture.detectChanges();
    });

    it('should prevent start from exceeding end', () => {
      const endBefore = component.endValue;
      component.onStartChange(component.endValue + 10);
      expect(component.startValue).toBe(endBefore);
    });

    it('should prevent end from going below start', () => {
      const startBefore = component.startValue;
      component.onEndChange(component.startValue - 10);
      expect(component.endValue).toBe(startBefore);
    });

    it('should accept string values from input events', () => {
      const target = component.sliderMin + 12;
      component.onStartChange(String(target));
      expect(component.startValue).toBe(target);
    });

    it('should update labels when handles change', () => {
      component.onStartChange(2020 * 12 + 0); // Jan 2020
      expect(component.startLabel).toBe('Jan 2020');
    });

    it('should debounce emissions on drag', fakeAsync(() => {
      const spy = jest.spyOn(component.rangeChange, 'emit');
      spy.mockClear();

      component.onStartChange(component.sliderMin + 12);
      component.onStartChange(component.sliderMin + 24);
      component.onStartChange(component.sliderMin + 36);

      // Before debounce fires, no new emissions
      expect(spy).not.toHaveBeenCalled();

      tick(200);

      // After debounce, exactly 1 emission
      expect(spy).toHaveBeenCalledTimes(1);
    }));
  });

  describe('fill calculations', () => {
    beforeEach(() => {
      component.minDate = new Date(2000, 0, 1);
      component.maxDate = new Date(2010, 0, 1); // 120 months range
      component.defaultRangeYears = 0;
      fixture.detectChanges();
    });

    it('should calculate fillLeft as percentage of start position', () => {
      component.onStartChange(2000 * 12 + 0); // at min
      expect(component.fillLeft).toBe(0);

      component.onStartChange(2005 * 12 + 0); // midpoint
      expect(component.fillLeft).toBeCloseTo(50, 0);
    });

    it('should calculate fillWidth as percentage of range width', () => {
      component.startValue = 2000 * 12;
      component.endValue = 2010 * 12;
      expect(component.fillWidth).toBeCloseTo(100, 0);

      component.startValue = 2000 * 12;
      component.endValue = 2005 * 12;
      expect(component.fillWidth).toBeCloseTo(50, 0);
    });
  });

  describe('year ticks', () => {
    it('should include first and last year', () => {
      component.minDate = new Date(2000, 0, 1);
      component.maxDate = new Date(2026, 4, 1);
      fixture.detectChanges();

      const years = component.yearTicks.map(t => t.year);
      expect(years[0]).toBe(2000);
      expect(years[years.length - 1]).toBe(2026);
    });

    it('should have first tick at 0% and last tick at 100%', () => {
      component.minDate = new Date(2000, 0, 1);
      component.maxDate = new Date(2026, 4, 1);
      fixture.detectChanges();

      expect(component.yearTicks[0].percent).toBe(0);
      expect(component.yearTicks[component.yearTicks.length - 1].percent).toBe(100);
    });
  });

  describe('reset', () => {
    it('should restore handles to default positions', () => {
      component.minDate = new Date(2000, 0, 1);
      component.maxDate = new Date(2026, 4, 1);
      component.defaultRangeYears = 2;
      fixture.detectChanges();

      // Move handles away from defaults
      component.onStartChange(2000 * 12);
      component.onEndChange(2010 * 12);

      const spy = jest.spyOn(component.rangeChange, 'emit');
      component.reset();

      expect(component.startValue).toBe(2024 * 12 + 4);
      expect(component.endValue).toBe(2026 * 12 + 4);
      expect(spy).toHaveBeenCalled();
    });
  });
});

