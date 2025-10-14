import { Component, OnInit, OnDestroy } from '@angular/core';
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
}

@Component({
  selector: 'jstr-flash-experiments',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './flash-experiments.component.html',
  styleUrls: ['./flash-experiments.component.scss']
})
export class FlashExperimentsComponent implements OnInit, OnDestroy {
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

  // Universal mouse tracking for all experiments
  public experimentCenterPoints: Map<string, {x: number, y: number}> = new Map();
  public experimentMouseModes: Map<string, 'manual' | 'mouse'> = new Map();
  public activeMouseTracking: Set<string> = new Set();

  // Highlight System for Featured Experiments
  public highlightedExperiments: Set<string> = new Set(['particles']); // Featured experiments
  public featuredExperiment: string = 'particles'; // Primary featured experiment
  public highlightPulse: boolean = true; // Enable pulsing animation for highlights

  // Center point controls for explosive burst (legacy - now part of universal system)
  public explosiveCenterX: number = 200; // Default center X
  public explosiveCenterY: number = 150; // Default center Y
  public showExplosiveCenterControls: boolean = false;
  public explosiveCenterMode: 'manual' | 'mouse' = 'manual'; // Control mode for explosive center
  public isMouseTracking: boolean = false; // Track if mouse is being followed

  private runningAnimations: Map<string, AnimationCleanup> = new Map();

  constructor(private canvasAnimations: CanvasAnimationsService) {}

  public ngOnInit() {
    this.initializeExperiments();
    this.filterExperiments();
  }

  public capitalizeCategory(category: string): string {
    return category.charAt(0).toUpperCase() + category.slice(1);
  }

  public initializeExperiments() {
    this.experiments = [
      {
        id: 'sinecosinewaves',
        name: 'Sine & Cosine Waves',
        description: 'Combined sine and cosine wave patterns with various mathematical relationships',
        category: 'waves',
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
  }

  public ngOnDestroy() {
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
      this.explosiveCenterX = 200; // Canvas center
      this.explosiveCenterY = 150; // Canvas center
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
    // Initialize default center point for each experiment
    if (!this.experimentCenterPoints.has(experimentId)) {
      this.experimentCenterPoints.set(experimentId, { x: 200, y: 150 }); // Default canvas center
    }
    if (!this.experimentMouseModes.has(experimentId)) {
      this.experimentMouseModes.set(experimentId, 'manual');
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
      const centerPoint = { x: 200, y: 150 }; // Default canvas center
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
}
