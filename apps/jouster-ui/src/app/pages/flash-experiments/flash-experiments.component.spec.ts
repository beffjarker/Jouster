import { createComponentFactory, Spectator } from '@ngneat/spectator';
import { MockProvider } from 'ng-mocks';
import { of, throwError } from 'rxjs';
import { FlashExperimentsComponent } from './flash-experiments.component';
import { CanvasAnimationsService, FlashExperiment } from '../../services/canvas-animations.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

describe('FlashExperimentsComponent', () => {
  let spectator: Spectator<FlashExperimentsComponent>;
  let canvasAnimationsService: jest.Mocked<CanvasAnimationsService>;

  const mockExperiments: FlashExperiment[] = [
    {
      id: 'spiral-pattern',
      title: 'Spiral Pattern',
      description: 'A mesmerizing spiral animation recreating classic Flash effects',
      category: 'Patterns',
      canvasFunction: jest.fn().mockReturnValue(() => {})
    },
    {
      id: 'particle-system',
      title: 'Particle System',
      description: 'Dynamic particle effects with physics simulation',
      category: 'Physics',
      canvasFunction: jest.fn().mockReturnValue(() => {})
    }
  ];

  const createComponent = createComponentFactory({
    component: FlashExperimentsComponent,
    imports: [CommonModule, FormsModule],
    providers: [
      MockProvider(CanvasAnimationsService, {
        getExperiments: jest.fn().mockReturnValue(mockExperiments),
        getExperimentsByCategory: jest.fn().mockReturnValue(mockExperiments),
        getCategories: jest.fn().mockReturnValue(['All', 'Patterns', 'Physics']),
        initializeCanvas: jest.fn(),
        startAnimation: jest.fn(),
        stopAnimation: jest.fn(),
        resetAnimation: jest.fn()
      })
    ],
    detectChanges: false
  });

  beforeEach(() => {
    spectator = createComponent();
    canvasAnimationsService = spectator.inject(CanvasAnimationsService) as jest.Mocked<CanvasAnimationsService>;
  });

  describe('Component Initialization', () => {
    it('should create the component', () => {
      expect(spectator.component).toBeTruthy();
    });

    it('should initialize with default values', () => {
      expect(spectator.component.selectedCategory).toBe('All');
      expect(spectator.component.runningAnimations).toEqual(new Set());
    });

    it('should load experiments on init', () => {
      spectator.detectChanges();

      expect(canvasAnimationsService.getExperiments).toHaveBeenCalled();
      expect(canvasAnimationsService.getCategories).toHaveBeenCalled();
      expect(spectator.component.experiments).toEqual(mockExperiments);
    });

    it('should filter experiments correctly', () => {
      spectator.detectChanges();

      expect(spectator.component.filteredExperiments).toEqual(mockExperiments);
    });
  });

  describe('Category Filtering', () => {
    beforeEach(() => {
      spectator.detectChanges();
    });

    it('should filter experiments by category', () => {
      spectator.component.onCategoryChange('Patterns');

      expect(canvasAnimationsService.getExperimentsByCategory).toHaveBeenCalledWith('Patterns');
      expect(spectator.component.selectedCategory).toBe('Patterns');
    });

    it('should show all experiments when "All" category is selected', () => {
      spectator.component.onCategoryChange('All');

      expect(canvasAnimationsService.getExperiments).toHaveBeenCalled();
      expect(spectator.component.selectedCategory).toBe('All');
    });

    it('should update filtered experiments after category change', () => {
      const patternsExperiments = [mockExperiments[0]];
      canvasAnimationsService.getExperimentsByCategory.mockReturnValue(patternsExperiments);

      spectator.component.onCategoryChange('Patterns');

      expect(spectator.component.filteredExperiments).toEqual(patternsExperiments);
    });
  });

  describe('Animation Control', () => {
    beforeEach(() => {
      spectator.detectChanges();
    });

    it('should start animation when play button is clicked', () => {
      const experimentId = 'spiral-pattern';
      const mockCanvas = document.createElement('canvas');

      spectator.component.toggleAnimation(experimentId, mockCanvas);

      expect(canvasAnimationsService.initializeCanvas).toHaveBeenCalledWith(mockCanvas, experimentId);
      expect(canvasAnimationsService.startAnimation).toHaveBeenCalledWith(experimentId);
      expect(spectator.component.runningAnimations.has(experimentId)).toBe(true);
    });

    it('should stop animation when stop button is clicked', () => {
      const experimentId = 'spiral-pattern';
      const mockCanvas = document.createElement('canvas');

      spectator.component.runningAnimations.add(experimentId);
      spectator.component.toggleAnimation(experimentId, mockCanvas);

      expect(canvasAnimationsService.stopAnimation).toHaveBeenCalledWith(experimentId);
      expect(spectator.component.runningAnimations.has(experimentId)).toBe(false);
    });

    it('should reset animation when reset button is clicked', () => {
      const experimentId = 'spiral-pattern';
      const mockCanvas = document.createElement('canvas');

      spectator.component.resetAnimation(experimentId, mockCanvas);

      expect(canvasAnimationsService.resetAnimation).toHaveBeenCalledWith(experimentId);
      expect(canvasAnimationsService.initializeCanvas).toHaveBeenCalledWith(mockCanvas, experimentId);
      expect(spectator.component.runningAnimations.has(experimentId)).toBe(false);
    });

    it('should check if animation is running correctly', () => {
      const experimentId = 'spiral-pattern';

      expect(spectator.component.isAnimationRunning(experimentId)).toBe(false);

      spectator.component.runningAnimations.add(experimentId);
      expect(spectator.component.isAnimationRunning(experimentId)).toBe(true);
    });
  });

  describe('Statistics', () => {
    beforeEach(() => {
      spectator.detectChanges();
    });

    it('should return correct total experiments count', () => {
      expect(spectator.component.getTotalExperiments()).toBe(2);
    });

    it('should return correct running animations count', () => {
      expect(spectator.component.getRunningAnimations()).toBe(0);

      spectator.component.runningAnimations.add('spiral-pattern');
      expect(spectator.component.getRunningAnimations()).toBe(1);
    });

    it('should return correct categories count', () => {
      expect(spectator.component.getCategories()).toBe(3); // All, Patterns, Physics
    });
  });

  describe('Template Integration', () => {
    beforeEach(() => {
      spectator.detectChanges();
    });

    it('should display page title and intro', () => {
      expect(spectator.query('h1')).toHaveText('Flash Experiments');
      expect(spectator.query('.intro')).toContain('Recreating classic Flash animations using modern web technologies');
    });

    it('should display category filter', () => {
      const categorySelect = spectator.query('.category-select');
      expect(categorySelect).toExist();
    });

    it('should display experiment cards', () => {
      const experimentCards = spectator.queryAll('.experiment-card');
      expect(experimentCards).toHaveLength(2);
    });

    it('should display experiment titles and descriptions', () => {
      const firstCard = spectator.query('.experiment-card');
      expect(firstCard.querySelector('h3')).toHaveText('Spiral Pattern');
      expect(firstCard.querySelector('p')).toContain('mesmerizing spiral animation');
    });

    it('should display category badges', () => {
      const categoryBadges = spectator.queryAll('.category-badge');
      expect(categoryBadges).toHaveLength(2);
      expect(categoryBadges[0]).toHaveText('PATTERNS');
      expect(categoryBadges[1]).toHaveText('PHYSICS');
    });

    it('should display canvas containers', () => {
      const canvasContainers = spectator.queryAll('.canvas-container');
      expect(canvasContainers).toHaveLength(2);
    });

    it('should display control buttons', () => {
      const controlButtons = spectator.queryAll('.control-button');
      expect(controlButtons.length).toBeGreaterThan(0);
    });
  });

  describe('Canvas Integration', () => {
    beforeEach(() => {
      spectator.detectChanges();
    });

    it('should initialize canvas after view init', () => {
      spectator.component.ngAfterViewInit();

      // Should attempt to get canvas elements and initialize them
      expect(canvasAnimationsService.initializeCanvas).toHaveBeenCalled();
    });

    it('should handle canvas elements correctly', () => {
      const canvasElement = document.createElement('canvas');
      canvasElement.id = 'canvas-spiral-pattern';
      spectator.fixture.nativeElement.appendChild(canvasElement);

      spectator.component.ngAfterViewInit();

      expect(canvasAnimationsService.initializeCanvas).toHaveBeenCalledWith(canvasElement, 'spiral-pattern');
    });
  });

  describe('Error Handling', () => {
    it('should handle service errors gracefully', () => {
      canvasAnimationsService.getExperiments.mockImplementation(() => {
        throw new Error('Service error');
      });

      expect(() => spectator.detectChanges()).not.toThrow();
      expect(spectator.component).toBeTruthy();
    });

    it('should handle missing canvas elements', () => {
      spectator.component.ngAfterViewInit();

      // Should not throw error when canvas elements are not found
      expect(spectator.component).toBeTruthy();
    });
  });

  describe('Component Lifecycle', () => {
    it('should clean up animations on destroy', () => {
      spectator.component.runningAnimations.add('spiral-pattern');
      spectator.component.runningAnimations.add('particle-system');

      spectator.component.ngOnDestroy();

      expect(canvasAnimationsService.stopAnimation).toHaveBeenCalledWith('spiral-pattern');
      expect(canvasAnimationsService.stopAnimation).toHaveBeenCalledWith('particle-system');
      expect(spectator.component.runningAnimations.size).toBe(0);
    });
  });

  describe('Responsive Design', () => {
    beforeEach(() => {
      spectator.detectChanges();
    });

    it('should adapt to different screen sizes', () => {
      // This would be more comprehensive with actual viewport testing
      expect(spectator.query('.experiments-grid')).toHaveClass('flex');
      expect(spectator.query('.experiments-grid')).toHaveClass('flex-wrap');
    });
  });
});
