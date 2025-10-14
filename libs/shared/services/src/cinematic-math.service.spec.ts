import { createServiceFactory, SpectatorService } from '@ngneat/spectator';
import { CinematicMathService, MathematicalConstant, SequencePattern } from './cinematic-math.service';

describe('CinematicMathService', () => {
  let spectator: SpectatorService<CinematicMathService>;
  let service: CinematicMathService;

  const createService = createServiceFactory({
    service: CinematicMathService
  });

  beforeEach(() => {
    spectator = createService();
    service = spectator.service;
  });

  describe('Ready Player One - Primary Mathematical References', () => {
    it('should provide Ready Player One mathematical constants as primary source', () => {
      const constants = service.getMathematicalConstants();

      expect(constants.length).toBeGreaterThan(0);

      // Primary: Golden Ratio from OASIS world design
      const goldenRatio = constants.find(c => c.name.includes('Golden Ratio'));
      expect(goldenRatio).toBeDefined();
      expect(goldenRatio!.value).toBeCloseTo(1.618033988749, 10);
      expect(goldenRatio!.filmReference).toContain('Ready Player One');
      expect(goldenRatio!.significance).toContain('OASIS level design');
    });

    it('should recognize Ready Player One significant numbers', () => {
      const constants = service.getMathematicalConstants();

      // Look for OASIS-specific mathematical references
      const oasisConstants = constants.filter(c => c.filmReference.includes('Ready Player One'));
      expect(oasisConstants.length).toBeGreaterThan(1);

      // Should include references to the three keys, easter eggs, etc.
      const hasGameReferences = oasisConstants.some(c =>
        c.significance.includes('key') ||
        c.significance.includes('easter egg') ||
        c.significance.includes('OASIS')
      );
      expect(hasGameReferences).toBe(true);
    });

    it('should handle OASIS world mathematical principles', () => {
      const patterns = service.getSequencePatterns();

      const oasisPatterns = patterns.filter(p =>
        p.filmContext.includes('Ready Player One') ||
        p.description.includes('OASIS')
      );

      expect(oasisPatterns.length).toBeGreaterThan(0);
    });
  });

  describe('Mathematical Constants', () => {
    let constants: MathematicalConstant[];

    beforeEach(() => {
      constants = service.getMathematicalConstants();
    });

    it('should return an array of mathematical constants', () => {
      expect(Array.isArray(constants)).toBe(true);
      expect(constants.length).toBeGreaterThan(0);
    });

    it('should include fundamental constants with film references', () => {
      const piConstant = constants.find(c => c.name.includes('Pi'));
      expect(piConstant).toBeDefined();
      expect(piConstant!.value).toBeCloseTo(Math.PI, 10);
      expect(piConstant!.filmReference).toBeTruthy();

      const eConstant = constants.find(c => c.name.includes('Euler'));
      expect(eConstant).toBeDefined();
      expect(eConstant!.value).toBeCloseTo(Math.E, 10);
    });

    it('should have unique identifiers for each constant', () => {
      const ids = constants.map(c => c.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(constants.length);
    });

    it('should include mathematical significance explanations', () => {
      constants.forEach(constant => {
        expect(constant.significance).toBeTruthy();
        expect(constant.significance.length).toBeGreaterThan(10);
      });
    });
  });

  describe('Sequence Patterns', () => {
    let patterns: SequencePattern[];

    beforeEach(() => {
      patterns = service.getSequencePatterns();
    });

    it('should return an array of sequence patterns', () => {
      expect(Array.isArray(patterns)).toBe(true);
      expect(patterns.length).toBeGreaterThan(0);
    });

    it('should include Fibonacci sequence with cinematic context', () => {
      const fibPattern = patterns.find(p => p.name.includes('Fibonacci'));
      expect(fibPattern).toBeDefined();
      expect(fibPattern!.generate(10)).toEqual([0, 1, 1, 2, 3, 5, 8, 13, 21, 34]);
      expect(fibPattern!.filmContext).toContain('Pi');
    });

    it('should generate sequences correctly', () => {
      patterns.forEach(pattern => {
        if (pattern.generate) {
          const sequence = pattern.generate(5);
          expect(Array.isArray(sequence)).toBe(true);
          expect(sequence.length).toBe(5);
        }
      });
    });

    it('should have film context for each pattern', () => {
      patterns.forEach(pattern => {
        expect(pattern.filmContext).toBeTruthy();
        expect(pattern.filmContext.length).toBeGreaterThan(5);
      });
    });
  });

  describe('Fibonacci Generation', () => {
    it('should generate standard Fibonacci sequence', () => {
      const sequence = service.generateFibonacci(10);
      expect(sequence).toEqual([0, 1, 1, 2, 3, 5, 8, 13, 21, 34]);
    });

    it('should generate custom start Fibonacci sequence', () => {
      const sequence = service.generateCustomFibonacci(2, 3, 5);
      expect(sequence).toEqual([2, 3, 5, 8, 13]);
    });

    it('should handle edge cases', () => {
      expect(service.generateFibonacci(0)).toEqual([]);
      expect(service.generateFibonacci(1)).toEqual([0]);
      expect(service.generateFibonacci(2)).toEqual([0, 1]);
    });

    it('should validate inputs', () => {
      expect(() => service.generateFibonacci(-1)).toThrow();
      expect(() => service.generateCustomFibonacci(1, 1, -1)).toThrow();
    });
  });

  describe('Mathematical Calculations', () => {
    it('should calculate golden ratio correctly', () => {
      const goldenRatio = service.calculateGoldenRatio();
      expect(goldenRatio).toBeCloseTo(1.618033988749, 10);
    });

    it('should identify prime numbers', () => {
      expect(service.isPrime(2)).toBe(true);
      expect(service.isPrime(3)).toBe(true);
      expect(service.isPrime(17)).toBe(true);
      expect(service.isPrime(4)).toBe(false);
      expect(service.isPrime(1)).toBe(false);
      expect(service.isPrime(0)).toBe(false);
    });

    it('should calculate factorial', () => {
      expect(service.factorial(0)).toBe(1);
      expect(service.factorial(1)).toBe(1);
      expect(service.factorial(5)).toBe(120);
      expect(service.factorial(10)).toBe(3628800);
    });

    it('should handle factorial edge cases', () => {
      expect(() => service.factorial(-1)).toThrow();
      expect(() => service.factorial(1.5)).toThrow();
    });
  });

  describe('Cinematic References Integration', () => {
    it('should connect mathematical concepts to film narratives', () => {
      const constants = service.getMathematicalConstants();
      const patterns = service.getSequencePatterns();

      // Every mathematical element should have cinematic context
      constants.forEach(constant => {
        expect(constant.filmReference).toBeTruthy();
        expect(constant.cinematicSignificance).toBeTruthy();
      });

      patterns.forEach(pattern => {
        expect(pattern.filmContext).toBeTruthy();
      });
    });

    it('should prioritize Ready Player One references', () => {
      const constants = service.getMathematicalConstants();
      const readyPlayerOneRefs = constants.filter(c => c.filmReference.includes('Ready Player One'));

      // Should have significant Ready Player One mathematical references
      expect(readyPlayerOneRefs.length).toBeGreaterThan(2);
    });

    it('should include Pi (1998) mathematical obsession themes', () => {
      const patterns = service.getSequencePatterns();
      const piReferences = patterns.filter(p => p.filmContext.includes('Pi'));

      expect(piReferences.length).toBeGreaterThan(0);
    });
  });

  describe('Performance', () => {
    it('should generate sequences efficiently', () => {
      const startTime = performance.now();
      service.generateFibonacci(1000);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(100);
    });

    it('should cache mathematical constants', () => {
      const first = service.getMathematicalConstants();
      const second = service.getMathematicalConstants();

      expect(first).toBe(second); // Should be the same reference if cached
    });
  });
});
