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

  // Center point controls for explosive burst
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
        canvasFunction: (canvas, ctx) => this.canvasAnimations.createSineCosineWave(canvas, ctx, this.getWavePreset('sinecosinewaves')),
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
        canvasFunction: (canvas, ctx) => this.canvasAnimations.createSpiralAnimation(canvas, ctx, this.getSpiralPreset('spiral')),
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
          const options = preset === 'exploding' ? {
            centerX: this.explosiveCenterX,
            centerY: this.explosiveCenterY,
            getCenterX: () => this.explosiveCenterX,
            getCenterY: () => this.explosiveCenterY
          } : undefined;
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
        canvasFunction: (canvas, ctx) => this.canvasAnimations.createFollowingAnimation(canvas, ctx, this.getFollowingPreset('following')),
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
        canvasFunction: (canvas, ctx) => this.canvasAnimations.createNetworkAnimation(canvas, ctx, this.getNetworkPreset('network')),
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
        canvasFunction: (canvas, ctx) => this.canvasAnimations.createBounceAnimation(canvas, ctx, this.getBouncePreset('bounce')),
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
        canvasFunction: (canvas, ctx) => this.canvasAnimations.createSunflowerPattern(canvas, ctx, this.getSunflowerPreset('sunflower')),
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
}
