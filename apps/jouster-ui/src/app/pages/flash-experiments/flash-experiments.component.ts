import { Component, OnInit, OnDestroy, AfterViewInit, ElementRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CanvasAnimationsService, AnimationCleanup } from '../../services/canvas-animations.service';

interface FlashExperiment {
  id: string;
  name: string;
  description: string;
  category: string;
  canvasFunction: (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) => () => void;
  hasPresets?: boolean;
  presets?: Array<{id: string, name: string, description: string}>;
  mathSummary?: string;
  mathDetails?: {
    explanation: string;
    formula?: string;
    links?: Array<{
      label: string;
      url: string;
    }>;
  };
}

@Component({
  selector: 'jstr-flash-experiments',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './flash-experiments.component.html',
  styleUrls: ['./flash-experiments.component.scss']
})
export class FlashExperimentsComponent implements OnInit, OnDestroy, AfterViewInit {
  // Main Featured Experiment Properties
  public mainExperimentType: 'pythagorean-circle' | 'sinecosinewaves' | 'spiral' | 'particles' | 'following' | 'network' | 'bounce' | 'sunflower' = 'pythagorean-circle';
  public mainPreset = 'classic';
  public mainTrailEnabled = false;
  public isMainExperimentRunning = false;

  /** Center point control mode for the playground canvas. */
  public mainCenterMode: 'manual' | 'mouse' | 'formula' = 'manual';
  /** Current center X position (updated by all three modes). */
  public mainCenterX = 200;
  /** Current center Y position (updated by all three modes). */
  public mainCenterY = 150;
  /** Formula mode: pixels to move center X per frame. */
  public mainDeltaX = 1;
  /** Formula mode: pixels to move center Y per frame. */
  public mainDeltaY = 0;
  /** rAF ID for formula mode animation loop. */
  private mainFormulaAnimationId?: number;
  /** Bound mouse handler references for cleanup. */
  private mainMouseMoveHandler?: (e: MouseEvent) => void;
  private mainMouseLeaveHandler?: (e: MouseEvent) => void;
  public mainParams = {
    // Particle parameters
    particleCount: 80,
    speed: 3.0,
    gravity: 0.2,
    friction: 0.95,
    radius: 2.5,
    // Spiral parameters
    rotationSpeed: 0.05,
    arms: 5,
    density: 150,
    // Wave parameters
    amplitude: 1.5,
    frequency: 0.015,
    waveSpeed: 0.06,
    // Sunflower parameters
    seedCount: 200,
    seedRadius: 3.0,
    scale: 1.5
  };

  /** Default preset per experiment type. */
  public readonly defaultPresets: Record<string, string> = {
    'pythagorean-circle': 'classic',
    'sinecosinewaves': 'classic',
    'spiral': 'classic',
    'particles': 'bouncing',
    'following': 'chain',
    'network': 'classic',
    'bounce': 'classic',
    'sunflower': 'golden',
  };

  private mainAnimationCleanup?: AnimationCleanup;

  // Existing properties
  public experiments: FlashExperiment[] = [];
  public filteredExperiments: FlashExperiment[] = [];
  public selectedCategory = '';
  public sunflowerPresets: Map<string, string> = new Map(); // experimentId -> presetId
  public wavePresets: Map<string, string> = new Map(); // experimentId -> presetId
  public spiralPresets: Map<string, string> = new Map(); // experimentId -> presetId
  public particlePresets: Map<string, string> = new Map(); // experimentId -> presetId
  public followingPresets: Map<string, string> = new Map(); // experimentId -> presetId
  public networkPresets: Map<string, string> = new Map(); // experimentId -> presetId
  public bouncePresets: Map<string, string> = new Map(); // experimentId -> presetId
  public pythagoreanPresets: Map<string, string> = new Map(); // experimentId -> presetId
  public pythagoreanTrailEnabled: Map<string, boolean> = new Map(); // experimentId -> trail toggle

  // Universal mouse tracking for all experiments
  public experimentCenterPoints: Map<string, {x: number, y: number}> = new Map();
  public experimentMouseModes: Map<string, 'manual' | 'mouse'> = new Map();
  public activeMouseTracking: Set<string> = new Set();

  // Cached canvas dimensions — updated only on init and resize, not every change detection
  public canvasDimensions: Map<string, {width: number, height: number}> = new Map();

  // Highlight System for Featured Experiments
  public highlightedExperiments: Set<string> = new Set(['pythagorean-circle']); // Featured experiments
  public featuredExperiment: string = 'pythagorean-circle'; // Primary featured experiment
  public highlightPulse: boolean = true; // Enable pulsing animation for highlights

  // Center point controls for explosive burst (legacy - now part of universal system)
  public explosiveCenterX: number = 200; // Default center X
  public explosiveCenterY: number = 150; // Default center Y
  public showExplosiveCenterControls: boolean = false;
  public explosiveCenterMode: 'manual' | 'mouse' = 'manual'; // Control mode for explosive center
  public isMouseTracking: boolean = false; // Track if mouse is being followed

  // Math explanation expand/collapse state
  public expandedMathDetails: Set<string> = new Set();

  private runningAnimations: Map<string, AnimationCleanup> = new Map();
  private resizeObserver?: ResizeObserver;
  private resizeTimeout?: ReturnType<typeof setTimeout>;

  constructor(
    private canvasAnimations: CanvasAnimationsService,
    private ngZone: NgZone,
    private elementRef: ElementRef,
  ) {}

  public ngOnInit() {
    this.initializeExperiments();
    this.filterExperiments();
  }

  public ngAfterViewInit() {
    // Initial sizing of all canvases after view renders
    this.sizeAllCanvases();

    // Auto-start the playground experiment after DOM settles
    setTimeout(() => this.startMainExperiment(), 100);

    // Observe canvas container resizes for responsive behavior
    this.ngZone.runOutsideAngular(() => {
      this.resizeObserver = new ResizeObserver(() => {
        if (this.resizeTimeout) {
          clearTimeout(this.resizeTimeout);
        }
        this.resizeTimeout = setTimeout(() => this.onCanvasContainersResized(), 150);
      });

      // Observe the main page container for layout changes
      const pageContainer = this.elementRef.nativeElement.querySelector('.page-container');
      if (pageContainer) {
        this.resizeObserver.observe(pageContainer);
      }
    });
  }

  /**
   * Sizes a single canvas element to match its CSS display size.
   * This ensures the canvas bitmap resolution matches the rendered size
   * instead of scaling a fixed-size bitmap.
   * Also updates the cached dimensions map.
   */
  private sizeCanvas(canvas: HTMLCanvasElement): void {
    // Use clientWidth/clientHeight to get the inner content area excluding borders.
    // getBoundingClientRect() includes borders (e.g., a 3px border adds 6px total),
    // which would make the canvas bitmap larger than the visible drawing area.
    const displayWidth = canvas.clientWidth;
    const displayHeight = canvas.clientHeight;

    if (displayWidth > 0 && displayHeight > 0 &&
        (canvas.width !== displayWidth || canvas.height !== displayHeight)) {
      canvas.width = displayWidth;
      canvas.height = displayHeight;
    }

    // Update cached dimensions for template bindings
    const id = canvas.id.replace('canvas-', '');
    this.canvasDimensions.set(id, { width: canvas.width, height: canvas.height });
  }

  /**
   * Sizes all canvases on the page to match their display sizes.
   */
  private sizeAllCanvases(): void {
    // Size the main canvas
    const mainCanvas = document.getElementById('mainCanvas') as HTMLCanvasElement;
    if (mainCanvas) {
      this.sizeCanvas(mainCanvas);
    }

    // Size each experiment canvas
    this.experiments.forEach(experiment => {
      const canvas = document.getElementById(`canvas-${experiment.id}`) as HTMLCanvasElement;
      if (canvas) {
        this.sizeCanvas(canvas);
      }
    });
  }

  /**
   * Handles canvas container resize: re-sizes canvases and restarts running animations.
   */
  private onCanvasContainersResized(): void {
    this.ngZone.run(() => {
      // Re-size the main canvas
      const mainCanvas = document.getElementById('mainCanvas') as HTMLCanvasElement;
      if (mainCanvas) {
        this.sizeCanvas(mainCanvas);
        // Restart main experiment if running
        if (this.isMainExperimentRunning) {
          this.stopMainExperiment();
          this.startMainExperiment();
        }
      }

      // Re-size experiment canvases and restart running ones
      this.experiments.forEach(experiment => {
        const canvas = document.getElementById(`canvas-${experiment.id}`) as HTMLCanvasElement;
        if (canvas) {
          this.sizeCanvas(canvas);
          if (this.runningAnimations.has(experiment.id)) {
            this.restartExperimentIfRunning(experiment.id);
          }
        }
      });

      // Update default center points to reflect new canvas sizes
      this.experimentCenterPoints.forEach((point, experimentId) => {
        if (this.getExperimentMouseMode(experimentId) === 'manual') {
          const dims = this.canvasDimensions.get(experimentId);
          if (dims) {
            // Clamp existing center points to new canvas bounds
            point.x = Math.min(point.x, dims.width);
            point.y = Math.min(point.y, dims.height);
          }
        }
      });
    });
  }

  /**
   * Returns the cached canvas width for a given experiment.
   * Only updated on init and resize — safe for template binding without performance cost.
   */
  public getCanvasWidth(experimentId: string): number {
    return this.canvasDimensions.get(experimentId)?.width || 400;
  }

  /**
   * Returns the cached canvas height for a given experiment.
   * Only updated on init and resize — safe for template binding without performance cost.
   */
  public getCanvasHeight(experimentId: string): number {
    return this.canvasDimensions.get(experimentId)?.height || 300;
  }

  public capitalizeCategory(category: string): string {
    return category.charAt(0).toUpperCase() + category.slice(1);
  }

  public initializeExperiments() {
    this.experiments = [
      {
        id: 'pythagorean-circle',
        name: 'Pythagorean Circle Drawing',
        description: 'Draw circles using the Pythagorean theorem (x² + y² = r²) with customizable particle shapes, radius, and color',
        category: 'math',
        mathSummary: 'Each pixel is placed at distance r from center by solving x² + y² = r². Angle θ sweeps 0→2π, computing x = r·cos(θ) and y = r·sin(θ) to trace the circle.',
        mathDetails: {
          explanation: 'The Pythagorean theorem states that for a right triangle, a² + b² = c². A circle is the set of all points at distance r from a center. By parameterizing with angle θ, each frame computes x = r·cos(θ), y = r·sin(θ) and plots that pixel. The trail effect retains previous pixels instead of clearing the canvas each frame.',
          formula: 'x = cx + r·cos(θ),  y = cy + r·sin(θ)  where θ ∈ [0, 2π]',
          links: [
            { label: 'Pythagorean Theorem — Wikipedia', url: 'https://en.wikipedia.org/wiki/Pythagorean_theorem' },
            { label: 'Parametric Circle — Math is Fun', url: 'https://www.mathsisfun.com/geometry/circle.html' },
          ],
        },
        canvasFunction: (canvas, ctx) => {
          const center = this.getExperimentCenter('pythagorean-circle');
          return this.canvasAnimations.createPythagoreanCircle(canvas, ctx, this.getPythagoreanPreset('pythagorean-circle'), {
            centerX: center.x,
            centerY: center.y,
            getCenterX: () => this.getExperimentCenter('pythagorean-circle').x,
            getCenterY: () => this.getExperimentCenter('pythagorean-circle').y,
            trailEnabled: this.getPythagoreanTrailEnabled('pythagorean-circle'),
            backgroundColor: '#fafafa',
          });
        },
        hasPresets: true,
        presets: [
          { id: 'classic', name: 'Classic Pixel', description: 'Classic single-pixel circle using Pythagorean theorem' },
          { id: 'dotted', name: 'Dotted Circle', description: 'Dotted circle drawn with small circles' },
          { id: 'square-particles', name: 'Square Particles', description: 'Circle made of square particles' },
          { id: 'diamond-ring', name: 'Diamond Ring', description: 'Circle composed of diamond-shaped particles' },
          { id: 'star-trail', name: 'Star Trail', description: 'Star-shaped particles with fading trail effect' },
          { id: 'rainbow', name: 'Rainbow Circle', description: 'Rainbow-colored circle with hue cycling' },
          { id: 'concentric', name: 'Concentric Rings', description: 'Multiple concentric circles drawn simultaneously' },
          { id: 'triangle-burst', name: 'Triangle Burst', description: 'Triangle particles forming concentric rings with trails' }
        ]
      },
      {
        id: 'sinecosinewaves',
        name: 'Sine & Cosine Waves',
        description: 'Combined sine and cosine wave patterns with various mathematical relationships',
        category: 'waves',
        mathSummary: 'Waves are drawn using y = A·sin(ωt + φ), where A controls height, ω controls frequency, and φ shifts the phase. Cosine is sine shifted by π/2.',
        mathDetails: {
          explanation: 'Sine and cosine are fundamental trigonometric functions that describe periodic oscillation. The amplitude A scales the wave height, angular frequency ω = 2πf determines how many cycles per unit, and phase φ shifts the wave left or right. Harmonics layer multiples of the base frequency. Interference occurs when two waves overlap, creating constructive (peaks align) or destructive (peaks cancel) patterns.',
          formula: 'y = A·sin(ωt + φ)  where ω = 2πf',
          links: [
            { label: 'Sine Wave — Wikipedia', url: 'https://en.wikipedia.org/wiki/Sine_wave' },
            { label: 'Wave Interference — Khan Academy', url: 'https://www.khanacademy.org/science/physics/mechanical-waves-and-sound/interference-of-waves/v/wave-interference' },
          ],
        },
        canvasFunction: (canvas, ctx) => {
          const center = this.getExperimentCenter('sinecosinewaves');
          return this.canvasAnimations.createSineCosineWave(canvas, ctx, this.getWavePreset('sinecosinewaves'), {
            centerX: center.x,
            centerY: center.y,
            getCenterX: () => this.getExperimentCenter('sinecosinewaves').x,
            getCenterY: () => this.getExperimentCenter('sinecosinewaves').y
          });
        },
        hasPresets: true,
        presets: [
          { id: 'classic', name: 'Classic Sin/Cos', description: 'Traditional sine and cosine waves' },
          { id: 'harmonic', name: 'Harmonic Series', description: 'Fundamental frequency with 2nd and 3rd harmonics' },
          { id: 'interference', name: 'Wave Interference', description: 'Two waves creating interference patterns' },
          { id: 'phase', name: 'Phase Relationships', description: 'Multiple sine waves with different phase shifts' },
          { id: 'amplitude', name: 'Amplitude Variations', description: 'Same frequency with different amplitudes' },
          { id: 'frequency', name: 'Frequency Spectrum', description: 'Low, medium, and high frequency waves' },
          { id: 'composite', name: 'Composite Waves', description: 'Complex combination of sine and cosine waves' },
          { id: 'standing', name: 'Standing Wave', description: 'Forward and backward waves creating standing pattern' }
        ]
      },
      {
        id: 'spiral',
        name: 'Spiral Animation',
        description: 'Animated spiral patterns with different mathematical spiral types from original Flash experiments',
        category: 'geometric',
        mathSummary: 'Points spiral outward using r = a + bθ (Archimedean) or r = a·e^(bθ) (logarithmic), converting polar coordinates to canvas pixels.',
        mathDetails: {
          explanation: 'Spirals are curves that wind around a center with increasing (or decreasing) distance. An Archimedean spiral has constant spacing between turns (r = a + bθ). A logarithmic spiral grows exponentially (r = a·e^(bθ)) — found in nautilus shells and galaxies. Fermat spirals use r = a·√θ, producing the seed patterns in sunflowers. Each type converts polar (r, θ) to Cartesian (x, y) for rendering.',
          formula: 'Archimedean: r = a + bθ  |  Logarithmic: r = a·e^(bθ)',
          links: [
            { label: 'Spiral — Wikipedia', url: 'https://en.wikipedia.org/wiki/Spiral' },
            { label: 'Archimedean Spiral — Wolfram MathWorld', url: 'https://mathworld.wolfram.com/ArchimedeanSpiral.html' },
          ],
        },
        canvasFunction: (canvas, ctx) => {
          const center = this.getExperimentCenter('spiral');
          return this.canvasAnimations.createSpiralAnimation(canvas, ctx, this.getSpiralPreset('spiral'), {
            centerX: center.x,
            centerY: center.y,
            getCenterX: () => this.getExperimentCenter('spiral').x,
            getCenterY: () => this.getExperimentCenter('spiral').y
          });
        },
        hasPresets: true,
        presets: [
          { id: 'classic', name: 'Classic Logarithmic', description: 'Traditional logarithmic spiral pattern' },
          { id: 'archimedean', name: 'Archimedean Spiral', description: 'Uniform spacing spiral from spiral.fla' },
          { id: 'pinwheel', name: 'Pinwheel Pattern', description: 'Fast-rotating pinwheel from pinwheel.fla' },
          { id: 'double', name: 'Double Spiral', description: 'Two counter-rotating spirals' },
          { id: 'hyperbolic', name: 'Hyperbolic Spiral', description: 'Inward-curving hyperbolic pattern' },
          { id: 'fermat', name: 'Fermat Spiral', description: 'Golden ratio-based Fermat spiral' },
          { id: 'square', name: 'Square Spiral', description: 'Angular square-based spiral pattern' }
        ]
      },
      {
        id: 'particles',
        name: 'Particle System',
        description: 'Dynamic particle systems with various physics behaviors from original Flash experiments',
        category: 'particles',
        mathSummary: 'Each particle has position and velocity vectors updated per frame: p += v, v += a. Walls reflect velocity, gravity pulls downward, and friction scales speed.',
        mathDetails: {
          explanation: 'Particle systems simulate Newtonian mechanics. Each particle stores position (x, y) and velocity (vx, vy). Per frame: velocity is modified by acceleration (gravity, attraction), then position advances by velocity. Wall collisions reverse the relevant velocity component. Friction multiplies velocity by a damping factor (e.g., 0.95) each frame. Explosive bursts give random initial velocities that decay over time.',
          formula: 'v = v₀ + a·Δt,  p = p₀ + v·Δt,  v_wall = -e·v',
          links: [
            { label: 'Particle System — Wikipedia', url: 'https://en.wikipedia.org/wiki/Particle_system' },
            { label: 'Newton\'s Laws of Motion', url: 'https://en.wikipedia.org/wiki/Newton%27s_laws_of_motion' },
          ],
        },
        canvasFunction: (canvas, ctx) => {
          const preset = this.getParticlePreset('particles');
          const center = this.getExperimentCenter('particles');
          const options = {
            centerX: preset === 'exploding' ? this.explosiveCenterX : center.x,
            centerY: preset === 'exploding' ? this.explosiveCenterY : center.y,
            getCenterX: () => preset === 'exploding' ? this.explosiveCenterX : this.getExperimentCenter('particles').x,
            getCenterY: () => preset === 'exploding' ? this.explosiveCenterY : this.getExperimentCenter('particles').y
          };
          return this.canvasAnimations.createParticleSystem(canvas, ctx, preset, options);
        },
        hasPresets: true,
        presets: [
          { id: 'bouncing', name: 'Bouncing Particles', description: 'Simple bouncing particles with wall collision' },
          { id: 'flowing', name: 'Flowing Motion', description: 'Fluid-like flowing motion from randomxymovement.fla' },
          { id: 'exploding', name: 'Explosive Burst', description: 'Explosive burst pattern with fade-out effects' },
          { id: 'gravity', name: 'Gravity Simulation', description: 'Strong gravitational pull simulation' },
          { id: 'magnetic', name: 'Magnetic Forces', description: 'Magnetic attraction and repulsion forces' },
          { id: 'orbital', name: 'Orbital Mechanics', description: 'Orbital mechanics with central attraction' },
          { id: 'swirling', name: 'Swirling Vortex', description: 'Swirling vortex pattern from PacketSpeed.fla' },
          { id: 'random', name: 'Chaotic Random', description: 'Chaotic random movement with bursts' }
        ]
      },
      {
        id: 'following',
        name: 'Mouse Following',
        description: 'Interactive mouse following animations with different behavioral patterns from original Flash experiments',
        category: 'interactive',
        mathSummary: 'Elements chase a target point using spring physics: acceleration = -k·distance - damping·velocity, producing smooth, elastic pursuit.',
        mathDetails: {
          explanation: 'Mouse following uses spring-damper equations. Each element computes the distance to the target (mouse or leader), applies a spring force proportional to that distance (F = -k·x), and a damping force opposing velocity (F = -c·v). Chain following passes each element\'s position as the next element\'s target. Swarm behavior adds separation forces to prevent overlap. Flocking combines alignment, cohesion, and separation rules.',
          formula: 'F = -k·(pos - target) - c·velocity',
          links: [
            { label: 'Easing Functions — easings.net', url: 'https://easings.net/' },
            { label: 'Boids (Flocking) — Wikipedia', url: 'https://en.wikipedia.org/wiki/Boids' },
          ],
        },
        canvasFunction: (canvas, ctx) => {
          const center = this.getExperimentCenter('following');
          return this.canvasAnimations.createFollowingAnimation(canvas, ctx, this.getFollowingPreset('following'), {
            centerX: center.x,
            centerY: center.y,
            getCenterX: () => this.getExperimentCenter('following').x,
            getCenterY: () => this.getExperimentCenter('following').y
          });
        },
        hasPresets: true,
        presets: [
          { id: 'chain', name: 'Chain Following', description: 'Classic chain following from follow.fla' },
          { id: 'swarm', name: 'Swarm Intelligence', description: 'Swarm intelligence following behavior' },
          { id: 'elastic', name: 'Elastic Band', description: 'Elastic band-like following with spring physics' },
          { id: 'magnetic', name: 'Magnetic Attraction', description: 'Magnetic attraction with mouse as magnet' },
          { id: 'orbital', name: 'Orbital Mechanics', description: 'Orbital mechanics around mouse cursor' },
          { id: 'delayed', name: 'Delayed Following', description: 'Delayed following with memory trail from follow2.fla' },
          { id: 'snake', name: 'Snake Movement', description: 'Snake-like movement with tight following' },
          { id: 'flock', name: 'Flocking Behavior', description: 'Flocking behavior with separation and cohesion' }
        ]
      },
      {
        id: 'network',
        name: 'Network Connections',
        description: 'Dynamic network of connected nodes with different topologies from original LinedNet Flash experiments',
        category: 'networks',
        mathSummary: 'Nodes move freely while lines connect pairs within a distance threshold, computed via d = √((x₂-x₁)² + (y₂-y₁)²). Line opacity fades with distance.',
        mathDetails: {
          explanation: 'Network visualizations use graph theory concepts. Each node is a point with position and velocity. Every frame, all pairs are checked: if the Euclidean distance between two nodes is below a threshold, a line is drawn between them. Line opacity is inversely proportional to distance — closer nodes have brighter connections. This creates organic, constantly shifting network topologies as nodes drift, collide with walls, and reform connections.',
          formula: 'd(p₁,p₂) = √((x₂-x₁)² + (y₂-y₁)²),  opacity = 1 - d/threshold',
          links: [
            { label: 'Graph Theory — Wikipedia', url: 'https://en.wikipedia.org/wiki/Graph_theory' },
            { label: 'Euclidean Distance — Math is Fun', url: 'https://www.mathsisfun.com/algebra/distance-2-points.html' },
          ],
        },
        canvasFunction: (canvas, ctx) => {
          const center = this.getExperimentCenter('network');
          return this.canvasAnimations.createNetworkAnimation(canvas, ctx, this.getNetworkPreset('network'), {
            centerX: center.x,
            centerY: center.y,
            getCenterX: () => this.getExperimentCenter('network').x,
            getCenterY: () => this.getExperimentCenter('network').y
          });
        },
        hasPresets: true,
        presets: [
          { id: 'classic', name: 'Classic Network', description: 'Classic network from LinedNet.fla' },
          { id: 'dense', name: 'Dense Network', description: 'Dense network with more connections from LinedNet2.fla' },
          { id: 'sparse', name: 'Sparse Network', description: 'Sparse network with long-range connections' },
          { id: 'dynamic', name: 'Dynamic Wrapping', description: 'Dynamic wrapping network from LinedNet3.fla' },
          { id: 'magnetic', name: 'Magnetic Attraction', description: 'Magnetic attraction network' },
          { id: 'repulsion', name: 'Repulsion Network', description: 'Repulsion-based network with spacing' },
          { id: 'organic', name: 'Organic Network', description: 'Organic-like network with many small nodes' },
          { id: 'constellation', name: 'Constellation', description: 'Constellation-like network with bright connections' }
        ]
      },
      {
        id: 'bounce',
        name: 'Bounce Physics',
        description: 'Realistic bouncing balls with different physics behaviors from original BounceBack Flash experiment',
        category: 'physics',
        mathSummary: 'Balls fall under gravity (vy += g each frame) and bounce off surfaces by reversing velocity: v\' = -e·v, where e is the coefficient of restitution.',
        mathDetails: {
          explanation: 'Bounce physics simulates gravitational free-fall and elastic collisions. Each frame, gravity adds to the vertical velocity (vy += g). When a ball hits a boundary, the perpendicular velocity component is reversed and scaled by the restitution coefficient e (0 = perfectly inelastic, 1 = perfectly elastic). Values above 1 create "super-elastic" bouncing. Ball-to-ball collisions use conservation of momentum and energy to compute post-collision velocities.',
          formula: 'vy += g·Δt,  v_bounce = -e·v  (e = restitution)',
          links: [
            { label: 'Coefficient of Restitution — Wikipedia', url: 'https://en.wikipedia.org/wiki/Coefficient_of_restitution' },
            { label: 'Elastic Collision — Khan Academy', url: 'https://www.khanacademy.org/science/physics/linear-momentum/elastic-and-inelastic-collisions/v/elastic-and-inelastic-collisions' },
          ],
        },
        canvasFunction: (canvas, ctx) => {
          const center = this.getExperimentCenter('bounce');
          return this.canvasAnimations.createBounceAnimation(canvas, ctx, this.getBouncePreset('bounce'), {
            centerX: center.x,
            centerY: center.y,
            getCenterX: () => this.getExperimentCenter('bounce').x,
            getCenterY: () => this.getExperimentCenter('bounce').y
          });
        },
        hasPresets: true,
        presets: [
          { id: 'classic', name: 'Classic Bounce', description: 'Classic bounce physics from BounceBack.fla' },
          { id: 'floating', name: 'Floating Bubbles', description: 'Low gravity floating bubbles' },
          { id: 'heavy', name: 'Heavy Balls', description: 'Heavy balls with strong gravity' },
          { id: 'elastic', name: 'Super Elastic', description: 'Super elastic bouncing balls' },
          { id: 'chaotic', name: 'Chaotic System', description: 'Chaotic multi-ball system' },
          { id: 'magnetic', name: 'Magnetic Attraction', description: 'Magnetic attraction between balls' },
          { id: 'orbital', name: 'Orbital Mechanics', description: 'Orbital mechanics with central attraction' },
          { id: 'explosive', name: 'Explosive Burst', description: 'Explosive burst with many small balls' }
        ]
      },
      {
        id: 'sunflower',
        name: 'Golden Ratio & Fibonacci Patterns',
        description: 'Golden ratio, Fibonacci spirals, and sunflower seed arrangements from original Flash experiments',
        category: 'nature',
        mathSummary: 'Seeds are placed at angle θₙ = n × 137.508° (the golden angle) with radius r = c·√n, producing the optimal packing seen in real sunflowers.',
        mathDetails: {
          explanation: 'The golden angle (≈137.508°) is derived from the golden ratio φ = (1+√5)/2. When each successive seed is rotated by this irrational angle, no two seeds ever align perfectly, producing the most efficient packing possible. The Fibonacci sequence (1, 1, 2, 3, 5, 8, 13…) emerges naturally — count the spirals in either direction and you get consecutive Fibonacci numbers. The radius r = c·√n ensures uniform density as seeds fill outward.',
          formula: 'θₙ = n × 137.508°,  r = c·√n  (golden angle = 360°/φ²)',
          links: [
            { label: 'Golden Angle — Wikipedia', url: 'https://en.wikipedia.org/wiki/Golden_angle' },
            { label: 'Fibonacci in Nature — Numberphile (YouTube)', url: 'https://www.youtube.com/watch?v=ahXIMUkSXX0' },
            { label: 'Phyllotaxis — Wikipedia', url: 'https://en.wikipedia.org/wiki/Phyllotaxis' },
          ],
        },
        canvasFunction: (canvas, ctx) => {
          const center = this.getExperimentCenter('sunflower');
          return this.canvasAnimations.createSunflowerPattern(canvas, ctx, this.getSunflowerPreset('sunflower'), {
            centerX: center.x,
            centerY: center.y,
            getCenterX: () => this.getExperimentCenter('sunflower').x,
            getCenterY: () => this.getExperimentCenter('sunflower').y
          });
        },
        hasPresets: true,
        presets: [
          // Original Sunflower Patterns
          { id: 'golden', name: 'Classic Golden (137.5°)', description: 'Traditional sunflower pattern using golden angle' },
          { id: 'fibonacci', name: 'Fibonacci Variant (144°)', description: 'Fibonacci-based spiral pattern' },
          { id: 'double', name: 'Double Golden (275°)', description: 'Double golden angle pattern' },
          { id: 'triple', name: 'Triple Division (120°)', description: 'Three-way symmetric pattern' },
          { id: 'fast', name: 'Rapid Generation', description: 'Fast-growing golden spiral' },
          { id: 'dense', name: 'Dense Packing', description: 'Tightly packed sunflower seeds' },
          { id: 'spiral', name: 'Square Spiral (90°)', description: 'Square-based spiral pattern' },
          { id: 'pentagram', name: 'Pentagonal (72°)', description: 'Pentagon-based symmetry' },
          // Additional Fibonacci/Golden Ratio Patterns
          { id: 'fibonacci-classic', name: 'Classic Fibonacci Spiral', description: 'Classic Fibonacci spiral from fibonacci_sequence.fla' },
          { id: 'golden-ratio', name: 'Pure Golden Ratio', description: 'Golden ratio spiral from golden_ratio.fla' },
          { id: 'nautilus', name: 'Nautilus Shell', description: 'Nautilus shell pattern from golden_ratio2.fla' },
          { id: 'galaxy', name: 'Galaxy Spiral', description: 'Galaxy spiral from golden_ratio3.fla' },
          { id: 'plant-growth', name: 'Plant Growth', description: 'Plant growth pattern from golden_ratio4.fla' },
          { id: 'number-sequence', name: 'Number Sequence', description: 'Fibonacci number sequence visualization from golden_ratio5.fla' },
          { id: 'golden-rectangles', name: 'Golden Rectangles', description: 'Golden rectangles spiral from golden_ratio6.fla' },
          { id: 'logarithmic', name: 'Logarithmic Spiral', description: 'Logarithmic spiral approximation from golden_ratio7.fla' }
        ]
      }
    ];
  }

  public filterExperiments() {
    if (this.selectedCategory) {
      this.filteredExperiments = this.experiments.filter(exp => exp.category === this.selectedCategory);
    } else {
      this.filteredExperiments = [...this.experiments];
    }
  }

  public startExperiment(experiment: FlashExperiment) {
    this.stopExperiment(experiment); // Stop any existing animation

    const canvas = document.getElementById(`canvas-${experiment.id}`) as HTMLCanvasElement;
    const ctx = canvas.getContext('2d')!;

    // Size canvas to match its CSS display size
    this.sizeCanvas(canvas);

    // Recenter to canvas center when in manual mode and starting fresh
    this.recenterExperiment(experiment.id, canvas);

    // Setup canvas with common properties
    this.canvasAnimations.setupCanvas(canvas, ctx);

    const cleanupFunction = experiment.canvasFunction(canvas, ctx);

    // Store cleanup function for later use
    this.runningAnimations.set(experiment.id, cleanupFunction);
  }

  public stopExperiment(experiment: FlashExperiment) {
    const cleanupFunction = this.runningAnimations.get(experiment.id);
    if (cleanupFunction) {
      cleanupFunction();
      this.runningAnimations.delete(experiment.id);
    }
  }

  public resetExperiment(experiment: FlashExperiment) {
    this.stopExperiment(experiment);
    const canvas = document.getElementById(`canvas-${experiment.id}`) as HTMLCanvasElement;
    const ctx = canvas.getContext('2d')!;
    this.canvasAnimations.clearCanvas(canvas, ctx);

    // Reset center point to canvas center
    this.recenterExperiment(experiment.id, canvas);
  }

  // Main Experiment Methods
  public startMainExperiment() {
    const canvas = document.getElementById('mainCanvas') as HTMLCanvasElement;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Stop any existing animation
    if (this.mainAnimationCleanup) {
      this.mainAnimationCleanup();
    }

    // Size canvas to match its CSS display size
    this.sizeCanvas(canvas);

    // Start the selected experiment type with current parameters
    this.mainAnimationCleanup = this.runMainExperiment(canvas, ctx);
    this.isMainExperimentRunning = true;
  }

  public stopMainExperiment() {
    if (this.mainAnimationCleanup) {
      this.mainAnimationCleanup();
      this.mainAnimationCleanup = undefined;
    }
    this.stopFormulaMode();
    this.stopMainMouseTracking();
    this.isMainExperimentRunning = false;
  }

  public resetMainExperiment() {
    this.stopMainExperiment();

    // Reset preset to default for current type
    this.mainPreset = this.defaultPresets[this.mainExperimentType] || 'classic';
    this.mainTrailEnabled = false;
    this.mainCenterMode = 'manual';
    this.mainDeltaX = 1;
    this.mainDeltaY = 0;

    // Clear canvas
    const canvas = document.getElementById('mainCanvas') as HTMLCanvasElement;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  }

  public applyMainChanges() {
    if (this.isMainExperimentRunning) {
      // Restart with new parameters
      this.stopMainExperiment();
      this.startMainExperiment();
    }
  }

  public onMainExperimentTypeChange() {
    this.stopMainExperiment();
    this.mainPreset = this.defaultPresets[this.mainExperimentType] || 'classic';
    this.mainTrailEnabled = false;
    this.mainCenterMode = 'manual';
    this.resetMainExperiment();
    // Auto-start with the new type
    setTimeout(() => this.startMainExperiment(), 50);
  }

  /**
   * Get the current preset's description for display in the playground.
   */
  public getMainPresetDescription(): string {
    const experiment = this.experiments.find(e => e.id === this.mainExperimentType);
    if (!experiment?.presets) return '';
    const preset = experiment.presets.find(p => p.id === this.mainPreset);
    return preset?.description || '';
  }

  private runMainExperiment(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D): AnimationCleanup {
    // Initialize center to canvas center if in manual mode
    if (this.mainCenterMode === 'manual') {
      this.mainCenterX = Math.round(canvas.width / 2);
      this.mainCenterY = Math.round(canvas.height / 2);
    }

    // Build the physics tick function — the Flash onEnterFrame equivalent.
    // Formula mode: advance center by delta each frame.
    // Manual/mouse mode: no-op (state is set externally by sliders or mouse events).
    const onTick = this.mainCenterMode === 'formula' ? () => {
      this.mainCenterX += this.mainDeltaX;
      this.mainCenterY += this.mainDeltaY;

      // Continuous wrapping — wrap only when PAST the edge, preserving overshoot.
      // Range [0, canvas.width] is valid — the center can reach both edges.
      // e.g., position 398 + delta 5 = 403 → 403 - 400 = 3 (overshoot preserved)
      while (this.mainCenterX > canvas.width) { this.mainCenterX -= canvas.width; }
      while (this.mainCenterX < 0) { this.mainCenterX += canvas.width; }
      while (this.mainCenterY > canvas.height) { this.mainCenterY -= canvas.height; }
      while (this.mainCenterY < 0) { this.mainCenterY += canvas.height; }
    } : () => {};  // No-op — NOT undefined. The tick always exists.

    // Derive speedMultiplier from delta magnitude
    const speed = Math.sqrt(this.mainDeltaX ** 2 + this.mainDeltaY ** 2);
    const speedMultiplier = this.mainCenterMode === 'formula' && speed > 0 ? speed : 1;

    const options = {
      centerX: this.mainCenterX,
      centerY: this.mainCenterY,
      getCenterX: () => this.mainCenterX,
      getCenterY: () => this.mainCenterY,
      trailEnabled: this.mainTrailEnabled,
      onTick,
      speedMultiplier,
      backgroundColor: '#fafafa',
    };

    // Start mouse tracking if active (formula mode is now handled by onTick)
    if (this.mainCenterMode === 'mouse') {
      this.startMainMouseTracking(canvas);
    } else if (this.mainCenterMode === 'formula') {
      this.startFormulaMode(canvas);
    }

    switch (this.mainExperimentType) {
      case 'pythagorean-circle':
        return this.canvasAnimations.createPythagoreanCircle(canvas, ctx, this.mainPreset, options);
      case 'sinecosinewaves':
        return this.canvasAnimations.createSineCosineWave(canvas, ctx, this.mainPreset, options);
      case 'spiral':
        return this.canvasAnimations.createSpiralAnimation(canvas, ctx, this.mainPreset, options);
      case 'particles':
        return this.canvasAnimations.createParticleSystem(canvas, ctx, this.mainPreset, options);
      case 'following':
        return this.canvasAnimations.createFollowingAnimation(canvas, ctx, this.mainPreset, options);
      case 'network':
        return this.canvasAnimations.createNetworkAnimation(canvas, ctx, this.mainPreset, options);
      case 'bounce':
        return this.canvasAnimations.createBounceAnimation(canvas, ctx, this.mainPreset, options);
      case 'sunflower':
        return this.canvasAnimations.createSunflowerPattern(canvas, ctx, this.mainPreset, options);
      default:
        return () => {};
    }
  }

  // ── Playground Center Point Controls ───────────────────────────────────

  /** Start mouse tracking on the main canvas for 'mouse' center mode. */
  private startMainMouseTracking(canvas: HTMLCanvasElement): void {
    this.stopMainMouseTracking();

    this.mainMouseMoveHandler = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      this.mainCenterX = Math.round(e.clientX - rect.left);
      this.mainCenterY = Math.round(e.clientY - rect.top);
    };

    this.mainMouseLeaveHandler = () => {
      this.mainCenterX = Math.round(canvas.width / 2);
      this.mainCenterY = Math.round(canvas.height / 2);
    };

    canvas.addEventListener('mousemove', this.mainMouseMoveHandler);
    canvas.addEventListener('mouseleave', this.mainMouseLeaveHandler);
  }

  /** Stop mouse tracking on the main canvas. */
  private stopMainMouseTracking(): void {
    const canvas = document.getElementById('mainCanvas') as HTMLCanvasElement;
    if (canvas && this.mainMouseMoveHandler) {
      canvas.removeEventListener('mousemove', this.mainMouseMoveHandler);
    }
    if (canvas && this.mainMouseLeaveHandler) {
      canvas.removeEventListener('mouseleave', this.mainMouseLeaveHandler);
    }
    this.mainMouseMoveHandler = undefined;
    this.mainMouseLeaveHandler = undefined;
  }

  /** Initialize formula mode center position. No standalone rAF — onTick handles it inside the animation loop. */
  private startFormulaMode(canvas: HTMLCanvasElement): void {
    this.stopFormulaMode();

    this.mainCenterX = Math.round(canvas.width / 2);
    this.mainCenterY = Math.round(canvas.height / 2);
    // No rAF loop — onTick handles center updates inside the animation's rAF loop
  }

  /** Stop formula mode. No standalone rAF to cancel — the animation's cleanup handles it. */
  private stopFormulaMode(): void {
    this.mainFormulaAnimationId = undefined;
  }

  /** Handle center mode radio button change. Restarts animation so onTick/speedMultiplier takes effect. */
  public onMainCenterModeChange(): void {
    this.stopMainMouseTracking();

    if (this.isMainExperimentRunning) {
      // Restart animation with new mode (onTick/speedMultiplier recalculated)
      this.stopMainExperiment();
      this.startMainExperiment();
    }
  }

  public ngOnDestroy() {
    // Clean up resize observer
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = undefined;
    }
    if (this.resizeTimeout) {
      clearTimeout(this.resizeTimeout);
    }

    // Clean up main experiment
    if (this.mainAnimationCleanup) {
      this.mainAnimationCleanup();
      this.mainAnimationCleanup = undefined;
    }
    this.stopFormulaMode();
    this.stopMainMouseTracking();

    // Clean up all running animations
    this.runningAnimations.forEach(cleanupFunction => {
      cleanupFunction();
    });
    this.runningAnimations.clear();

    // Clean up all mouse tracking
    this.activeMouseTracking.forEach(experimentId => {
      this.stopUniversalMouseTracking(experimentId);
    });
    this.activeMouseTracking.clear();

    // Legacy mouse tracking cleanup
    this.stopMouseTracking();
  }

  public getSunflowerPreset(experimentId: string): string {
    return this.sunflowerPresets.get(experimentId) || 'golden';
  }

  public setSunflowerPreset(experimentId: string, presetId: string) {
    this.sunflowerPresets.set(experimentId, presetId);
    const experiment = this.experiments.find(exp => exp.id === experimentId);
    if (experiment && experiment.hasPresets) {
      const canvas = document.getElementById(`canvas-${experimentId}`) as HTMLCanvasElement;
      const ctx = canvas.getContext('2d')!;
      this.canvasAnimations.clearCanvas(canvas, ctx);
      experiment.canvasFunction(canvas, ctx);
    }
  }

  public getWavePreset(experimentId: string): string {
    return this.wavePresets.get(experimentId) || 'classic';
  }

  public setWavePreset(experimentId: string, presetId: string) {
    this.wavePresets.set(experimentId, presetId);
    const experiment = this.experiments.find(exp => exp.id === experimentId);
    if (experiment && experiment.hasPresets) {
      const canvas = document.getElementById(`canvas-${experimentId}`) as HTMLCanvasElement;
      const ctx = canvas.getContext('2d')!;
      this.canvasAnimations.clearCanvas(canvas, ctx);
      experiment.canvasFunction(canvas, ctx);
    }
  }

  public getSpiralPreset(experimentId: string): string {
    return this.spiralPresets.get(experimentId) || 'archimedean';
  }

  public setSpiralPreset(experimentId: string, presetId: string) {
    this.spiralPresets.set(experimentId, presetId);
    const experiment = this.experiments.find(exp => exp.id === experimentId);
    if (experiment && experiment.hasPresets) {
      const canvas = document.getElementById(`canvas-${experimentId}`) as HTMLCanvasElement;
      const ctx = canvas.getContext('2d')!;
      this.canvasAnimations.clearCanvas(canvas, ctx);
      experiment.canvasFunction(canvas, ctx);
    }
  }

  public getParticlePreset(experimentId: string): string {
    return this.particlePresets.get(experimentId) || 'bouncing';
  }

  public setParticlePreset(experimentId: string, presetId: string) {
    this.particlePresets.set(experimentId, presetId);

    // Show/hide explosive center controls based on preset
    this.showExplosiveCenterControls = (presetId === 'exploding');

    const experiment = this.experiments.find(exp => exp.id === experimentId);
    if (experiment && experiment.hasPresets) {
      this.restartParticleExperiment(experimentId);
    }
  }

  public onExplosiveCenterChange() {
    // Restart the particle animation with new center point when user changes the values
    if (this.getParticlePreset('particles') === 'exploding') {
      this.restartParticleExperiment('particles');
    }
  }

  public onExplosiveCenterModeChange() {
    // Handle switching between manual and mouse control modes
    if (this.explosiveCenterMode === 'mouse') {
      this.startMouseTracking();
    } else {
      this.stopMouseTracking();
    }
    this.restartParticleExperiment('particles');
  }

  private startMouseTracking() {
    if (!this.isMouseTracking) {
      this.isMouseTracking = true;
      const canvas = document.getElementById('canvas-particles') as HTMLCanvasElement;
      if (canvas) {
        canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
        canvas.addEventListener('mouseleave', this.handleMouseLeave.bind(this));
      }
    }
  }

  private stopMouseTracking() {
    if (this.isMouseTracking) {
      this.isMouseTracking = false;
      const canvas = document.getElementById('canvas-particles') as HTMLCanvasElement;
      if (canvas) {
        canvas.removeEventListener('mousemove', this.handleMouseMove.bind(this));
        canvas.removeEventListener('mouseleave', this.handleMouseLeave.bind(this));
      }
    }
  }

  private handleMouseMove(event: MouseEvent) {
    if (this.explosiveCenterMode === 'mouse' && this.getParticlePreset('particles') === 'exploding') {
      const canvas = event.target as HTMLCanvasElement;
      const rect = canvas.getBoundingClientRect();
      this.explosiveCenterX = Math.round(event.clientX - rect.left);
      this.explosiveCenterY = Math.round(event.clientY - rect.top);
      // Don't restart the experiment on every mouse move to maintain performance
      // The animation service will use the updated coordinates in real-time
    }
  }

  private handleMouseLeave(event: MouseEvent) {
    // Optionally reset to center when mouse leaves canvas
    if (this.explosiveCenterMode === 'mouse') {
      const canvas = document.getElementById('canvas-particles') as HTMLCanvasElement;
      this.explosiveCenterX = canvas ? Math.round(canvas.width / 2) : 200;
      this.explosiveCenterY = canvas ? Math.round(canvas.height / 2) : 150;
    }
  }

  private restartParticleExperiment(experimentId: string) {
    const experiment = this.experiments.find(exp => exp.id === experimentId);
    if (experiment) {
      const canvas = document.getElementById(`canvas-${experimentId}`) as HTMLCanvasElement;
      const ctx = canvas.getContext('2d')!;
      this.stopExperiment(experiment);
      this.canvasAnimations.clearCanvas(canvas, ctx);
      const cleanupFunction = experiment.canvasFunction(canvas, ctx);
      this.runningAnimations.set(experiment.id, cleanupFunction);
    }
  }

  public getFollowingPreset(experimentId: string): string {
    return this.followingPresets.get(experimentId) || 'chain';
  }

  public setFollowingPreset(experimentId: string, presetId: string) {
    this.followingPresets.set(experimentId, presetId);
    const experiment = this.experiments.find(exp => exp.id === experimentId);
    if (experiment && experiment.hasPresets) {
      const canvas = document.getElementById(`canvas-${experimentId}`) as HTMLCanvasElement;
      const ctx = canvas.getContext('2d')!;
      this.canvasAnimations.clearCanvas(canvas, ctx);
      experiment.canvasFunction(canvas, ctx);
    }
  }

  public getNetworkPreset(experimentId: string): string {
    return this.networkPresets.get(experimentId) || 'classic';
  }

  public setNetworkPreset(experimentId: string, presetId: string) {
    this.networkPresets.set(experimentId, presetId);
    const experiment = this.experiments.find(exp => exp.id === experimentId);
    if (experiment && experiment.hasPresets) {
      const canvas = document.getElementById(`canvas-${experimentId}`) as HTMLCanvasElement;
      const ctx = canvas.getContext('2d')!;
      this.canvasAnimations.clearCanvas(canvas, ctx);
      experiment.canvasFunction(canvas, ctx);
    }
  }

  public getBouncePreset(experimentId: string): string {
    return this.bouncePresets.get(experimentId) || 'classic';
  }

  public setBouncePreset(experimentId: string, presetId: string) {
    this.bouncePresets.set(experimentId, presetId);
    const experiment = this.experiments.find(exp => exp.id === experimentId);
    if (experiment && experiment.hasPresets) {
      const canvas = document.getElementById(`canvas-${experimentId}`) as HTMLCanvasElement;
      const ctx = canvas.getContext('2d')!;
      this.canvasAnimations.clearCanvas(canvas, ctx);
      experiment.canvasFunction(canvas, ctx);
    }
  }

  public getPythagoreanPreset(experimentId: string): string {
    return this.pythagoreanPresets.get(experimentId) || 'classic';
  }

  public setPythagoreanPreset(experimentId: string, presetId: string) {
    this.pythagoreanPresets.set(experimentId, presetId);
    const experiment = this.experiments.find(exp => exp.id === experimentId);
    if (experiment && experiment.hasPresets) {
      const canvas = document.getElementById(`canvas-${experimentId}`) as HTMLCanvasElement;
      const ctx = canvas.getContext('2d')!;
      this.stopExperiment(experiment);
      this.canvasAnimations.clearCanvas(canvas, ctx);
      const cleanupFunction = experiment.canvasFunction(canvas, ctx);
      this.runningAnimations.set(experiment.id, cleanupFunction);
    }
  }

  public getPythagoreanTrailEnabled(experimentId: string): boolean | undefined {
    if (!this.pythagoreanTrailEnabled.has(experimentId)) {
      return undefined; // No user override; let the preset default apply
    }
    return this.pythagoreanTrailEnabled.get(experimentId)!;
  }

  public setPythagoreanTrailEnabled(experimentId: string, enabled: boolean) {
    this.pythagoreanTrailEnabled.set(experimentId, enabled);
    this.restartExperimentIfRunning(experimentId);
  }

  public getSelectValue(event: Event): string {
    const target = event.target as HTMLSelectElement;
    return target.value;
  }

  public getPresetForExperiment(experimentId: string): string {
    if (experimentId === 'sinecosinewaves') {
      return this.getWavePreset(experimentId);
    } else if (experimentId === 'sunflower') {
      return this.getSunflowerPreset(experimentId);
    } else if (experimentId === 'spiral') {
      return this.getSpiralPreset(experimentId);
    } else if (experimentId === 'particles') {
      return this.getParticlePreset(experimentId);
    } else if (experimentId === 'following') {
      return this.getFollowingPreset(experimentId);
    } else if (experimentId === 'network') {
      return this.getNetworkPreset(experimentId);
    } else if (experimentId === 'bounce') {
      return this.getBouncePreset(experimentId);
    } else if (experimentId === 'pythagorean-circle') {
      return this.getPythagoreanPreset(experimentId);
    }
    return '';
  }

  public setPresetForExperiment(experimentId: string, presetId: string) {
    if (experimentId === 'sinecosinewaves') {
      this.setWavePreset(experimentId, presetId);
    } else if (experimentId === 'sunflower') {
      this.setSunflowerPreset(experimentId, presetId);
    } else if (experimentId === 'spiral') {
      this.setSpiralPreset(experimentId, presetId);
    } else if (experimentId === 'particles') {
      this.setParticlePreset(experimentId, presetId);
    } else if (experimentId === 'following') {
      this.setFollowingPreset(experimentId, presetId);
    } else if (experimentId === 'network') {
      this.setNetworkPreset(experimentId, presetId);
    } else if (experimentId === 'bounce') {
      this.setBouncePreset(experimentId, presetId);
    } else if (experimentId === 'pythagorean-circle') {
      this.setPythagoreanPreset(experimentId, presetId);
    }
  }

  public getPresetDescription(experiment: FlashExperiment): string {
    if (!experiment.presets) return '';
    const currentPresetId = this.getPresetForExperiment(experiment.id);
    const preset = experiment.presets.find(p => p.id === currentPresetId);
    return preset?.description || '';
  }

  // Universal Mouse Tracking Methods for All Experiments

  public initializeExperimentCenter(experimentId: string) {
    // Initialize default center point for each experiment based on actual canvas size
    if (!this.experimentCenterPoints.has(experimentId)) {
      const canvas = document.getElementById(`canvas-${experimentId}`) as HTMLCanvasElement;
      const centerX = canvas ? Math.round(canvas.width / 2) : 200;
      const centerY = canvas ? Math.round(canvas.height / 2) : 150;
      this.experimentCenterPoints.set(experimentId, { x: centerX, y: centerY });
    }
    if (!this.experimentMouseModes.has(experimentId)) {
      this.experimentMouseModes.set(experimentId, 'manual');
    }
  }

  /**
   * Resets the experiment center point to the true center of the canvas.
   * Called on start and reset to ensure the animation begins centered.
   */
  private recenterExperiment(experimentId: string, canvas?: HTMLCanvasElement): void {
    if (this.getExperimentMouseMode(experimentId) === 'manual') {
      const cvs = canvas || document.getElementById(`canvas-${experimentId}`) as HTMLCanvasElement;
      if (cvs && cvs.width > 0 && cvs.height > 0) {
        const centerX = Math.round(cvs.width / 2);
        const centerY = Math.round(cvs.height / 2);
        this.experimentCenterPoints.set(experimentId, { x: centerX, y: centerY });
      }
    }
  }

  public getExperimentCenter(experimentId: string): { x: number, y: number } {
    this.initializeExperimentCenter(experimentId);
    return this.experimentCenterPoints.get(experimentId)!;
  }

  public setExperimentCenter(experimentId: string, x: number, y: number) {
    this.experimentCenterPoints.set(experimentId, { x, y });
    this.restartExperimentIfRunning(experimentId);
  }

  public getExperimentMouseMode(experimentId: string): 'manual' | 'mouse' {
    this.initializeExperimentCenter(experimentId);
    return this.experimentMouseModes.get(experimentId)!;
  }

  public setExperimentMouseMode(experimentId: string, mode: 'manual' | 'mouse') {
    this.experimentMouseModes.set(experimentId, mode);

    if (mode === 'mouse') {
      this.startUniversalMouseTracking(experimentId);
    } else {
      this.stopUniversalMouseTracking(experimentId);
    }

    this.restartExperimentIfRunning(experimentId);
  }

  public startUniversalMouseTracking(experimentId: string) {
    if (!this.activeMouseTracking.has(experimentId)) {
      this.activeMouseTracking.add(experimentId);
      const canvas = document.getElementById(`canvas-${experimentId}`) as HTMLCanvasElement;
      if (canvas) {
        canvas.addEventListener('mousemove', (event) => this.handleUniversalMouseMove(event, experimentId));
        canvas.addEventListener('mouseleave', (event) => this.handleUniversalMouseLeave(event, experimentId));
        canvas.style.cursor = 'crosshair'; // Visual feedback
      }
    }
  }

  public stopUniversalMouseTracking(experimentId: string) {
    if (this.activeMouseTracking.has(experimentId)) {
      this.activeMouseTracking.delete(experimentId);
      const canvas = document.getElementById(`canvas-${experimentId}`) as HTMLCanvasElement;
      if (canvas) {
        canvas.removeEventListener('mousemove', (event) => this.handleUniversalMouseMove(event, experimentId));
        canvas.removeEventListener('mouseleave', (event) => this.handleUniversalMouseLeave(event, experimentId));
        canvas.style.cursor = 'default'; // Reset cursor
      }
    }
  }

  private handleUniversalMouseMove(event: MouseEvent, experimentId: string) {
    if (this.getExperimentMouseMode(experimentId) === 'mouse') {
      const canvas = event.target as HTMLCanvasElement;
      const rect = canvas.getBoundingClientRect();
      const x = Math.round(event.clientX - rect.left);
      const y = Math.round(event.clientY - rect.top);

      // Update the center point without restarting the experiment for performance
      this.experimentCenterPoints.set(experimentId, { x, y });

      // For backward compatibility with explosive particles
      if (experimentId === 'particles' && this.getParticlePreset('particles') === 'exploding') {
        this.explosiveCenterX = x;
        this.explosiveCenterY = y;
      }
    }
  }

  private handleUniversalMouseLeave(event: MouseEvent, experimentId: string) {
    if (this.getExperimentMouseMode(experimentId) === 'mouse') {
      // Reset to canvas center when mouse leaves
      const canvas = document.getElementById(`canvas-${experimentId}`) as HTMLCanvasElement;
      const centerX = canvas ? Math.round(canvas.width / 2) : 200;
      const centerY = canvas ? Math.round(canvas.height / 2) : 150;
      const centerPoint = { x: centerX, y: centerY };
      this.experimentCenterPoints.set(experimentId, centerPoint);

      // For backward compatibility with explosive particles
      if (experimentId === 'particles') {
        this.explosiveCenterX = centerPoint.x;
        this.explosiveCenterY = centerPoint.y;
      }
    }
  }

  private restartExperimentIfRunning(experimentId: string) {
    const experiment = this.experiments.find(exp => exp.id === experimentId);
    if (experiment && this.runningAnimations.has(experimentId)) {
      const canvas = document.getElementById(`canvas-${experimentId}`) as HTMLCanvasElement;
      const ctx = canvas.getContext('2d')!;
      this.stopExperiment(experiment);
      this.canvasAnimations.clearCanvas(canvas, ctx);
      const cleanupFunction = experiment.canvasFunction(canvas, ctx);
      this.runningAnimations.set(experiment.id, cleanupFunction);
    }
  }

  public onExperimentCenterChange(experimentId: string, x: number, y: number) {
    this.setExperimentCenter(experimentId, x, y);
  }

  public onExperimentMouseModeChange(experimentId: string, mode: 'manual' | 'mouse') {
    this.setExperimentMouseMode(experimentId, mode);
  }

  // Highlight System Methods
  public isHighlighted(experimentId: string): boolean {
    return this.highlightedExperiments.has(experimentId);
  }

  public isFeatured(experimentId: string): boolean {
    return this.featuredExperiment === experimentId;
  }

  public getHighlightClass(experimentId: string): string {
    const classes = [];
    if (this.isHighlighted(experimentId)) {
      classes.push('highlighted');
    }
    if (this.isFeatured(experimentId)) {
      classes.push('featured');
    }
    if (this.highlightPulse && this.isHighlighted(experimentId)) {
      classes.push('pulse-highlight');
    }
    return classes.join(' ');
  }

  public getHighlightBadge(experimentId: string): string {
    if (this.isFeatured(experimentId)) {
      return 'FEATURED';
    }
    if (this.isHighlighted(experimentId)) {
      return 'HIGHLIGHT';
    }
    return '';
  }

  // Math Explanation Methods

  /** Toggle the expanded state of math details for an experiment. */
  public toggleMathDetails(experimentId: string): void {
    if (this.expandedMathDetails.has(experimentId)) {
      this.expandedMathDetails.delete(experimentId);
    } else {
      this.expandedMathDetails.add(experimentId);
    }
  }

  /** Check if math details are expanded for an experiment. */
  public isMathDetailsExpanded(experimentId: string): boolean {
    return this.expandedMathDetails.has(experimentId);
  }

  /**
   * Get the math summary for the currently selected playground experiment type.
   */
  public getMainMathSummary(): string {
    const experiment = this.experiments.find(e => e.id === this.mainExperimentType);
    return experiment?.mathSummary || '';
  }

  /**
   * Get the math details for the currently selected playground experiment type.
   */
  public getMainMathDetails(): FlashExperiment['mathDetails'] {
    const experiment = this.experiments.find(e => e.id === this.mainExperimentType);
    return experiment?.mathDetails;
  }
}



