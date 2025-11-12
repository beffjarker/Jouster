# Mathematical & Geometric Concepts - Reference for Mocks & Testing

**Date**: November 12, 2025  
**Purpose**: Reference document for mathematical/geometric concepts for use in testing, mocks, models, and creative implementations  
**Topics**: Golden Ratio, Fibonacci Sequences, Fractals, Tesseracts, and related concepts

---

## Golden Ratio (φ - Phi)

### Definition
φ = (1 + √5) / 2 ≈ 1.618033988749...

### Properties
- Self-replicating ratio found in nature, art, and architecture
- a/b = (a+b)/a = φ
- φ² = φ + 1
- 1/φ = φ - 1

### Applications in Jouster

**Visual Design:**
```typescript
const PHI = 1.618033988749;

// Layout proportions
const containerWidth = 1000;
const contentWidth = containerWidth / PHI; // ≈ 618px
const sidebarWidth = containerWidth - contentWidth; // ≈ 382px

// Typography scale
const baseFontSize = 16;
const h1Size = baseFontSize * PHI * PHI; // ≈ 41.89px
const h2Size = baseFontSize * PHI; // ≈ 25.89px
```

**Animation Timing:**
```typescript
const baseDelay = 1000; // 1 second
const goldenDelay = baseDelay / PHI; // ≈ 618ms
```

**Test Data Generator:**
```typescript
function generateGoldenSequence(iterations: number): number[] {
  const sequence = [1];
  for (let i = 1; i < iterations; i++) {
    sequence.push(sequence[i - 1] * PHI);
  }
  return sequence;
}
```

---

## Fibonacci Sequence

### Definition
Each number is the sum of the two preceding ones:
0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987...

### Formula
F(n) = F(n-1) + F(n-2)
- F(0) = 0
- F(1) = 1

### Relationship to Golden Ratio
As n approaches infinity: F(n+1) / F(n) → φ

### Applications in Jouster

**Existing Implementation:**
- Already have Fibonacci component: `apps/jouster-ui/src/app/pages/fibonacci/`
- Can be used as reference for new implementations

**Test Data:**
```typescript
// Mock data generator
function generateFibonacciArray(count: number): number[] {
  if (count <= 0) return [];
  if (count === 1) return [0];
  
  const fib = [0, 1];
  for (let i = 2; i < count; i++) {
    fib.push(fib[i - 1] + fib[i - 2]);
  }
  return fib;
}

// Example: Generate 20 Fibonacci numbers for testing
const mockData = generateFibonacciArray(20);
// [0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987, 1597, 2584, 4181]
```

**Visual Patterns:**
```typescript
// Fibonacci spiral coordinates
function fibonacciSpiralPoints(iterations: number): Point[] {
  const fib = generateFibonacciArray(iterations);
  const points: Point[] = [];
  
  let x = 0, y = 0;
  let direction = 0; // 0: right, 1: up, 2: left, 3: down
  
  for (let i = 0; i < iterations; i++) {
    const size = fib[i];
    // Generate arc points based on size and direction
    // ... implementation
  }
  
  return points;
}
```

---

## Fractals

### Definition
Self-similar patterns that repeat at different scales.

### Common Fractals

#### 1. **Mandelbrot Set**
```typescript
function mandelbrot(cx: number, cy: number, maxIterations: number): number {
  let x = 0, y = 0;
  let iteration = 0;
  
  while (x * x + y * y <= 4 && iteration < maxIterations) {
    const xTemp = x * x - y * y + cx;
    y = 2 * x * y + cy;
    x = xTemp;
    iteration++;
  }
  
  return iteration;
}
```

#### 2. **Sierpinski Triangle**
```typescript
interface Point { x: number; y: number; }

function sierpinskiTriangle(depth: number, vertices: Point[]): Point[][] {
  if (depth === 0) return [vertices];
  
  const triangles: Point[][] = [];
  // Recursive subdivision
  // ... implementation
  
  return triangles;
}
```

#### 3. **Koch Snowflake**
```typescript
function kochCurve(start: Point, end: Point, depth: number): Point[] {
  if (depth === 0) return [start, end];
  
  // Divide line into 3 segments
  // Create equilateral triangle on middle segment
  // Recursively apply to each segment
  // ... implementation
  
  return points;
}
```

### Applications in Jouster

**Background Patterns:**
```typescript
// Generate fractal pattern for backgrounds
const fractalPattern = generateFractalPattern({
  type: 'mandelbrot',
  width: 1920,
  height: 1080,
  zoom: 1.0,
  iterations: 100
});
```

**Data Structures:**
```typescript
// Fractal-like nested data for testing
interface FractalNode {
  id: string;
  value: number;
  children?: FractalNode[];
}

function generateFractalData(depth: number, branchFactor: number): FractalNode {
  if (depth === 0) return { id: '0', value: 0 };
  
  return {
    id: `node-${depth}`,
    value: depth,
    children: Array(branchFactor).fill(0).map((_, i) => 
      generateFractalData(depth - 1, branchFactor)
    )
  };
}
```

---

## Tesseracts (4D Hypercubes)

### Definition
A tesseract is the 4-dimensional analog of a cube.
- Cube (3D): 8 vertices, 12 edges, 6 faces
- Tesseract (4D): 16 vertices, 32 edges, 24 faces, 8 cells

### Projection to 2D/3D

```typescript
interface Vector4D {
  x: number;
  y: number;
  z: number;
  w: number;
}

// Project 4D point to 3D
function project4Dto3D(point: Vector4D, distance: number = 2): Vector3D {
  const scale = distance / (distance - point.w);
  return {
    x: point.x * scale,
    y: point.y * scale,
    z: point.z * scale
  };
}

// Generate tesseract vertices
function generateTesseractVertices(): Vector4D[] {
  const vertices: Vector4D[] = [];
  
  for (let w = -1; w <= 1; w += 2) {
    for (let z = -1; z <= 1; z += 2) {
      for (let y = -1; y <= 1; y += 2) {
        for (let x = -1; x <= 1; x += 2) {
          vertices.push({ x, y, z, w });
        }
      }
    }
  }
  
  return vertices; // 16 vertices
}

// Generate tesseract edges
function generateTesseractEdges(): [number, number][] {
  const edges: [number, number][] = [];
  const vertices = generateTesseractVertices();
  
  // Connect vertices that differ by exactly one coordinate
  for (let i = 0; i < vertices.length; i++) {
    for (let j = i + 1; j < vertices.length; j++) {
      const v1 = vertices[i];
      const v2 = vertices[j];
      
      const differences = [
        Math.abs(v1.x - v2.x),
        Math.abs(v1.y - v2.y),
        Math.abs(v1.z - v2.z),
        Math.abs(v1.w - v2.w)
      ];
      
      const diffCount = differences.filter(d => d === 2).length;
      if (diffCount === 1) {
        edges.push([i, j]);
      }
    }
  }
  
  return edges; // 32 edges
}
```

### Applications in Jouster

**Rotating Tesseract Visualization:**
```typescript
function rotateTesseract(
  vertices: Vector4D[], 
  angleXY: number, 
  angleZW: number
): Vector4D[] {
  // Rotation in 4D space
  return vertices.map(v => {
    // Rotate in XY plane
    const x1 = v.x * Math.cos(angleXY) - v.y * Math.sin(angleXY);
    const y1 = v.x * Math.sin(angleXY) + v.y * Math.cos(angleXY);
    
    // Rotate in ZW plane
    const z1 = v.z * Math.cos(angleZW) - v.w * Math.sin(angleZW);
    const w1 = v.z * Math.sin(angleZW) + v.w * Math.cos(angleZW);
    
    return { x: x1, y: y1, z: z1, w: w1 };
  });
}
```

**Mock Data with Higher Dimensions:**
```typescript
// 4D point cloud for testing
function generate4DPointCloud(count: number): Vector4D[] {
  return Array(count).fill(0).map(() => ({
    x: Math.random() * 2 - 1,
    y: Math.random() * 2 - 1,
    z: Math.random() * 2 - 1,
    w: Math.random() * 2 - 1
  }));
}
```

---

## Related Mathematical Concepts

### Penrose Tiling
Non-periodic tiling using golden ratio:
```typescript
interface Tile {
  type: 'kite' | 'dart';
  vertices: Point[];
}

function generatePenroseTiling(iterations: number): Tile[] {
  // Uses golden ratio for tile proportions
  // Self-similar but non-repeating pattern
  // ... implementation
}
```

### Sacred Geometry
- Flower of Life
- Metatron's Cube
- Platonic Solids
- Vesica Piscis

### Spirals
```typescript
// Golden spiral
function goldenSpiral(turns: number, pointsPerTurn: number): Point[] {
  const points: Point[] = [];
  const totalPoints = turns * pointsPerTurn;
  
  for (let i = 0; i < totalPoints; i++) {
    const angle = (i / pointsPerTurn) * 2 * Math.PI;
    const radius = Math.pow(PHI, angle / (Math.PI / 2));
    
    points.push({
      x: radius * Math.cos(angle),
      y: radius * Math.sin(angle)
    });
  }
  
  return points;
}

// Fibonacci spiral (approximation)
function fibonacciSpiral(terms: number): Point[] {
  const fib = generateFibonacciArray(terms);
  const points: Point[] = [];
  
  // Quarter circles with Fibonacci radii
  // ... implementation
  
  return points;
}
```

---

## Usage in Testing & Mocks

### Test Data Generation

```typescript
// Complex nested data using Fibonacci
const mockNestedData = {
  levels: generateFibonacciArray(10),
  structure: generateFractalData(5, 3),
  proportions: {
    width: 1000,
    height: 1000 / PHI,
    sections: [
      { size: 377, color: '#gold' },
      { size: 233, color: '#silver' },
      { size: 144, color: '#bronze' }
    ]
  }
};

// Geometric test patterns
const testPatterns = {
  fibonacci: generateFibonacciArray(20),
  goldenRatios: generateGoldenSequence(10),
  fractalDepth: 7,
  tesseractVertices: generateTesseractVertices(),
  spiralPoints: goldenSpiral(5, 100)
};
```

### Visual Testing Utilities

```typescript
// Component for visualizing mathematical concepts
interface MathVisualProps {
  type: 'fibonacci' | 'golden-ratio' | 'fractal' | 'tesseract';
  config: any;
}

// Can be used in Storybook or testing
const mathVisualStories = {
  'Golden Spiral': { type: 'golden-ratio', config: { turns: 3 } },
  'Fibonacci Tree': { type: 'fibonacci', config: { depth: 8 } },
  'Mandelbrot Zoom': { type: 'fractal', config: { zoom: 1000 } },
  'Rotating Tesseract': { type: 'tesseract', config: { speed: 0.01 } }
};
```

### Performance Testing

```typescript
// Use Fibonacci numbers for scaling tests
const performanceTests = generateFibonacciArray(15).map(count => ({
  itemCount: count,
  expectedTime: count * 0.1, // O(n) expected
  testName: `Performance with ${count} items`
}));
```

---

## Implementation References

### Existing Code
- **Fibonacci Component**: `apps/jouster-ui/src/app/pages/fibonacci/`
- **Flash Experiments**: May contain geometric/mathematical visualizations

### Future Components (Ideas)

```
apps/jouster-ui/src/app/pages/
  ├── golden-ratio/          # Golden ratio visualizations
  ├── fractals/              # Fractal explorer
  ├── tesseract/             # 4D hypercube rotation
  ├── sacred-geometry/       # Sacred geometry patterns
  └── math-playground/       # General mathematical experiments
```

---

## Resources & References

### Books
- "The Golden Ratio: The Story of PHI" by Mario Livio
- "The Fractal Geometry of Nature" by Benoit Mandelbrot
- "Flatland: A Romance of Many Dimensions" by Edwin Abbott

### Online Resources
- Wolfram MathWorld
- 3Blue1Brown (YouTube - visual mathematics)
- Numberphile (YouTube)

### Existing Flash Experiments
Check `public/flash-experiments/` for:
- Spiral implementations
- Fibonacci sequences
- Golden ratio visualizations
- Geometric patterns

---

## Quick Reference: Key Numbers

```typescript
// Constants for use in code
export const MATH_CONSTANTS = {
  PHI: 1.618033988749,          // Golden ratio
  PHI_INVERSE: 0.618033988749,   // 1/φ
  PHI_SQUARED: 2.618033988749,   // φ²
  
  FIBONACCI: [0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987],
  
  EULER: 2.718281828459,         // e
  PI: Math.PI,                   // π
  TAU: Math.PI * 2,              // τ = 2π
  
  SQRT_2: 1.414213562373,        // √2
  SQRT_3: 1.732050807569,        // √3
  SQRT_5: 2.236067977500,        // √5
};
```

---

**Created**: November 12, 2025  
**Purpose**: Reference for mathematical/geometric concepts in Jouster  
**Use Cases**: Testing, mocks, models, visualizations, creative implementations  
**Status**: Living document - expand as needed

---

*"In nature's infinite book of secrecy, a little I can read." - William Shakespeare*

