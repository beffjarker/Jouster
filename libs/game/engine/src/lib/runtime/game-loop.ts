/** Fixed simulation step (60 updates per second). */
export const FIXED_STEP = 1 / 60;
const MAX_FRAME_TIME = 0.25;

export interface FrameScheduler {
  request(callback: (timeMs: number) => void): number;
  cancel(handle: number): void;
}

/** Uses `requestAnimationFrame` in browsers. */
export const animationFrameScheduler: FrameScheduler = {
  request: (callback) => requestAnimationFrame(callback),
  cancel: (handle) => cancelAnimationFrame(handle),
};

/**
 * Fixed-timestep loop: `update` runs at a steady 60 Hz regardless of display refresh rate;
 * `render` runs once per animation frame and gets `ahead`, the seconds (0 to {@link FIXED_STEP}) of real
 * time since the last update, so moving things can be drawn where they are now rather than where the last
 * update left them. Without it, motion judders whenever the display and the update rate drift apart.
 */
export class GameLoop {
  private handle: number | null = null;
  private lastTime: number | null = null;
  private accumulator = 0;

  constructor(
    private readonly update: (dt: number) => void,
    private readonly render: (ahead: number) => void,
    private readonly scheduler: FrameScheduler = animationFrameScheduler,
  ) {}

  public get running(): boolean {
    return this.handle !== null;
  }

  public start(): void {
    if (this.handle !== null) {
      return;
    }
    this.lastTime = null;
    this.accumulator = 0;
    this.handle = this.scheduler.request(this.tick);
  }

  public stop(): void {
    if (this.handle !== null) {
      this.scheduler.cancel(this.handle);
      this.handle = null;
    }
  }

  private readonly tick = (timeMs: number): void => {
    const time = timeMs / 1000;
    const frame = this.lastTime === null ? FIXED_STEP : Math.min(MAX_FRAME_TIME, time - this.lastTime);
    this.lastTime = time;
    this.accumulator += frame;
    while (this.accumulator >= FIXED_STEP) {
      this.update(FIXED_STEP);
      this.accumulator -= FIXED_STEP;
    }
    this.render(this.accumulator);
    if (this.handle !== null) {
      this.handle = this.scheduler.request(this.tick);
    }
  };
}
