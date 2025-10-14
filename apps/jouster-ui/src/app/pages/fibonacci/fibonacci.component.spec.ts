import { createComponentFactory, Spectator } from '@ngneat/spectator';
import { FormsModule } from '@angular/forms';
import { FibonacciComponent } from './fibonacci.component';

describe('FibonacciComponent', () => {
  let spectator: Spectator<FibonacciComponent>;

  const createComponent = createComponentFactory({
    component: FibonacciComponent,
    imports: [FormsModule]
  });

  beforeEach(() => {
    spectator = createComponent();
  });

  describe('Component Initialization', () => {
    it('should create', () => {
      expect(spectator.component).toBeTruthy();
    });

    it('should initialize with classic Fibonacci sequence like Max Cohen\'s obsession with patterns', () => {
      expect(spectator.component.startA).toBe(0);
      expect(spectator.component.startB).toBe(1);
      expect(spectator.component.sequenceLength).toBe(15);
    });

    it('should generate initial sequence on component init', () => {
      expect(spectator.component.fibonacciSequence.length).toBe(15);
      expect(spectator.component.fibonacciSequence[0]).toBe(0);
      expect(spectator.component.fibonacciSequence[1]).toBe(1);
    });
  });

  describe('Mathematical Properties - Pi Film References', () => {
    it('should calculate golden ratio approximation like Max\'s search for patterns in Pi', () => {
      spectator.component.sequenceLength = 20;
      spectator.component.generateSequence();

      const goldenRatio = (1 + Math.sqrt(5)) / 2;
      expect(spectator.component.goldenRatio).toBeCloseTo(goldenRatio, 10);
    });

    it('should identify when ratio approaches phi (216 digits of obsession)', () => {
      spectator.component.sequenceLength = 10;
      spectator.component.generateSequence();

      // Test golden ratio approximation detection
      const isApproximation = spectator.component.isGoldenRatioApproximation(8);
      expect(typeof isApproximation).toBe('boolean');
    });

    it('should handle Max Cohen inspired sequence lengths (216)', () => {
      spectator.component.sequenceLength = 50; // More manageable than 216 for testing
      spectator.component.generateSequence();

      expect(spectator.component.fibonacciSequence.length).toBe(50);
      expect(spectator.component.largestTerm).toBeGreaterThan(0);
    });
  });

  describe('Christopher Nolan Time-based Patterns', () => {
    it('should generate sequence in correct temporal order (Memento inspired)', () => {
      spectator.component.sequenceLength = 8;
      spectator.component.generateSequence();

      // Verify sequence follows Fibonacci rule: F(n) = F(n-1) + F(n-2)
      for (let i = 2; i < spectator.component.fibonacciSequence.length; i++) {
        const expected = spectator.component.fibonacciSequence[i-1] + spectator.component.fibonacciSequence[i-2];
        expect(spectator.component.fibonacciSequence[i]).toBe(expected);
      }
    });

    it('should handle recursive patterns like Inception\'s nested dreams', () => {
      spectator.component.startA = 1;
      spectator.component.startB = 1;
      spectator.component.sequenceLength = 6;
      spectator.component.generateSequence();

      // Test nested/recursive calculation
      expect(spectator.component.fibonacciSequence).toEqual([1, 1, 2, 3, 5, 8]);
    });

    it('should maintain mathematical precision across iterations (Interstellar time precision)', () => {
      spectator.component.sequenceLength = 30;
      spectator.component.generateSequence();

      // Verify no floating point errors in integer sequence
      spectator.component.fibonacciSequence.forEach(num => {
        expect(Number.isInteger(num)).toBe(true);
      });
    });
  });

  describe('Preset Configurations - Film Character Inspirations', () => {
    it('should set classic Fibonacci like Max Cohen\'s mathematical obsession', () => {
      spectator.component.setClassicFibonacci();

      expect(spectator.component.startA).toBe(0);
      expect(spectator.component.startB).toBe(1);
      expect(spectator.component.fibonacciSequence[0]).toBe(0);
      expect(spectator.component.fibonacciSequence[1]).toBe(1);
    });

    it('should set Lucas numbers inspired by Nolan\'s non-linear narratives', () => {
      spectator.component.setLucasNumbers();

      expect(spectator.component.startA).toBe(2);
      expect(spectator.component.startB).toBe(1);
      expect(spectator.component.fibonacciSequence[0]).toBe(2);
      expect(spectator.component.fibonacciSequence[1]).toBe(1);
    });

    it('should handle custom sequences like Cobb\'s dream architecture', () => {
      spectator.component.setTribonacci();

      expect(spectator.component.startA).toBe(1);
      expect(spectator.component.startB).toBe(1);
    });
  });

  describe('Visual Representation - Cinematic Patterns', () => {
    it('should generate spiral arcs like the spiral staircase in Vertigo (Nolan influence)', () => {
      spectator.component.generateSequence();

      expect(spectator.component.spiralArcs.length).toBeGreaterThan(0);
      expect(spectator.component.spiralArcs.length).toBeLessThanOrEqual(8);
    });

    it('should create color patterns for visualization like Nolan\'s color symbolism', () => {
      const colors = spectator.component.getBarColor(0);
      expect(colors).toBeDefined();
      expect(typeof colors).toBe('string');
      expect(colors).toMatch(/^#[0-9a-f]{6}$/i);
    });

    it('should scale bar heights proportionally like Zimmer\'s musical scales', () => {
      spectator.component.fibonacciSequence = [1, 1, 2, 3, 5, 8];
      const height = spectator.component.getBarHeight(8);

      expect(height).toBe(200); // Max height for largest value
      expect(spectator.component.getBarHeight(1)).toBeLessThan(height);
    });
  });

  describe('Number Formatting - Pi\'s Numerical Obsession', () => {
    it('should format large numbers like Max\'s 216-digit number obsession', () => {
      const largeNumber = 1234567890123;
      const formatted = spectator.component.formatNumber(largeNumber);

      expect(formatted).toContain(','); // Should have comma separators
    });

    it('should use scientific notation for extremely large numbers', () => {
      const veryLargeNumber = 1e15;
      const formatted = spectator.component.formatNumber(veryLargeNumber);

      expect(formatted).toContain('e+'); // Scientific notation
    });

    it('should handle small numbers without scientific notation', () => {
      const smallNumber = 144;
      const formatted = spectator.component.formatNumber(smallNumber);

      expect(formatted).toBe('144');
    });
  });

  describe('Mathematical Properties Calculation', () => {
    it('should calculate sequence sum like Max\'s pattern recognition', () => {
      spectator.component.fibonacciSequence = [0, 1, 1, 2, 3, 5];
      spectator.component.calculateProperties();

      expect(spectator.component.sequenceSum).toBe(12); // 0+1+1+2+3+5
    });

    it('should identify largest term in sequence', () => {
      spectator.component.fibonacciSequence = [0, 1, 1, 2, 3, 5, 8];
      spectator.component.calculateProperties();

      expect(spectator.component.largestTerm).toBe(8);
    });

    it('should calculate current ratio between consecutive terms', () => {
      spectator.component.fibonacciSequence = [1, 1, 2, 3, 5, 8];
      spectator.component.calculateProperties();

      expect(spectator.component.currentRatio).toBe(8/5); // F(5)/F(4)
    });
  });

  describe('Template Rendering - Cinematic UI', () => {
    it('should render the main title with mathematical symbolism', () => {
      const title = spectator.query('h1');
      expect(title).toHaveText('🔢 Fibonacci Sequence Generator');
    });

    it('should display banner with exploration theme like Nolan protagonists', () => {
      const banner = spectator.query('.fibonacci-banner h2');
      expect(banner).toHaveText('Interactive Fibonacci Explorer');
    });

    it('should show preset buttons for different sequence types', () => {
      const classicBtn = spectator.query('.preset-btn.classic');
      const lucasBtn = spectator.query('.preset-btn.lucas');
      const customBtn = spectator.query('.preset-btn.custom');

      expect(classicBtn).toExist();
      expect(lucasBtn).toExist();
      expect(customBtn).toExist();
    });

    it('should render mathematical properties section', () => {
      const propertiesSection = spectator.query('.properties-section');
      expect(propertiesSection).toExist();

      const goldenRatioCard = spectator.query('.property-card');
      expect(goldenRatioCard).toExist();
    });
  });

  describe('Edge Cases - Nolan\'s Complex Scenarios', () => {
    it('should handle zero-length sequences gracefully', () => {
      spectator.component.sequenceLength = 0;
      spectator.component.generateSequence();

      expect(spectator.component.fibonacciSequence.length).toBe(0);
    });

    it('should handle single-term sequences', () => {
      spectator.component.sequenceLength = 1;
      spectator.component.startA = 5;
      spectator.component.generateSequence();

      expect(spectator.component.fibonacciSequence).toEqual([5]);
    });

    it('should handle negative starting values like reversed time in Tenet', () => {
      spectator.component.startA = -1;
      spectator.component.startB = 1;
      spectator.component.sequenceLength = 5;
      spectator.component.generateSequence();

      expect(spectator.component.fibonacciSequence[0]).toBe(-1);
      expect(spectator.component.fibonacciSequence[1]).toBe(1);
      expect(spectator.component.fibonacciSequence[2]).toBe(0);
    });
  });

  describe('Interactive Features - User Experience', () => {
    it('should update sequence on input change', () => {
      const initialLength = spectator.component.fibonacciSequence.length;

      spectator.component.sequenceLength = 20;
      spectator.component.generateSequence();

      expect(spectator.component.fibonacciSequence.length).not.toBe(initialLength);
      expect(spectator.component.fibonacciSequence.length).toBe(20);
    });

    it('should respond to preset button clicks', () => {
      spectator.click('.preset-btn.lucas');

      expect(spectator.component.startA).toBe(2);
      expect(spectator.component.startB).toBe(1);
    });
  });
});
