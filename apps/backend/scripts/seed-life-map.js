/**
 * Seed Data for Life Map (DynamoDB Local)
 *
 * Populates the local DynamoDB with demo entries themed around
 * the Jouster project's literary and mathematical references.
 *
 * Usage:
 *   docker-compose up -d          (start DynamoDB Local)
 *   node scripts/seed-life-map.js          (seed data)
 *   node scripts/seed-life-map.js --reset  (drop table, recreate, re-seed)
 *
 * @module scripts/seed-life-map
 */

const AWS = require('aws-sdk');

const ENDPOINT = process.env.DYNAMODB_ENDPOINT || 'http://localhost:8000';
const TABLE_NAME = process.env.LIFE_MAP_TABLE_NAME || 'jouster-life-map-dev';
const REGION = 'us-west-2';
const RESET = process.argv.includes('--reset');

const dynamodb = new AWS.DynamoDB({
  endpoint: ENDPOINT,
  region: REGION,
  accessKeyId: 'dummy',
  secretAccessKey: 'dummy',
});

const docClient = new AWS.DynamoDB.DocumentClient({
  endpoint: ENDPOINT,
  region: REGION,
  accessKeyId: 'dummy',
  secretAccessKey: 'dummy',
});

const now = new Date().toISOString();

/**
 * Helper to create an entry with defaults.
 */
function entry(id, title, description, date, category, location, tags, images = []) {
  return { id, title, description, date, category, location, images, tags, createdAt: now, updatedAt: now };
}

function loc(lat, lng, city, state, country = 'US', name) {
  return { lat, lng, city, state, country, name: name || `${city}, ${state}` };
}

// ============================================================================
// SEED ENTRIES (~60 themed demo + career entries)
// ============================================================================

const SEED_ENTRIES = [
  // ═══════════════════════════════════════════════════════════════════════════
  // FIBONACCI & GOLDEN RATIO (10 entries)
  // ═══════════════════════════════════════════════════════════════════════════
  entry('demo-fibonacci-pisa', 'Where Fibonacci Began — Pisa, 1202',
    'Leonardo of Pisa published Liber Abaci, introducing the sequence 1, 1, 2, 3, 5, 8, 13, 21... to the Western world. Each number the sum of the two before it. The ratio between consecutive terms converges on phi (φ ≈ 1.618033...), the golden ratio — irrational, infinite, never repeating.',
    '1202-01-15T12:00:00.000Z', 'milestone',
    loc(43.7228, 10.4017, 'Pisa', 'Tuscany', 'IT'),
    ['fibonacci', 'golden-ratio', 'mathematics', 'liber-abaci', 'phi', 'history']),

  entry('demo-golden-parthenon', 'The Golden Ratio in the Parthenon',
    'The Parthenon\'s facade fits within a golden rectangle — width to height in the ratio φ:1. Whether intentional or projected, the proportions create harmony that resonates across millennia.',
    '0438-06-01T12:00:00.000Z', 'milestone',
    loc(37.9715, 23.7267, 'Athens', 'Attica', 'GR'),
    ['golden-ratio', 'architecture', 'ancient-greece', 'parthenon', 'proportion']),

  entry('demo-da-vinci-vitruvian', 'Da Vinci & the Divine Proportion',
    'Leonardo da Vinci illustrated Luca Pacioli\'s "De Divina Proportione" in 1509, drawing the Vitruvian Man — the human body inscribed in both circle and square, proportions echoing phi. The navel divides the body at the golden ratio of total height.',
    '1509-01-01T12:00:00.000Z', 'milestone',
    loc(45.4642, 9.1900, 'Milan', 'Lombardy', 'IT'),
    ['da-vinci', 'golden-ratio', 'vitruvian-man', 'divine-proportion', 'art', 'anatomy']),

  entry('demo-le-corbusier', 'Le Corbusier\'s Modulor — Architecture from Phi',
    'Le Corbusier\'s Modulor system (1948) derived all architectural proportions from the golden ratio applied to human scale. A 6-foot man with raised arm at 226cm — divided by phi at the navel, again at the knee. Buildings designed to resonate with human bodies.',
    '1948-01-01T12:00:00.000Z', 'milestone',
    loc(48.8566, 2.3522, 'Paris', 'Île-de-France', 'FR'),
    ['le-corbusier', 'modulor', 'golden-ratio', 'architecture', 'proportion', 'human-scale']),

  entry('demo-sunflower-seeds', 'Sunflower Seed Spirals — 137.5° of Perfection',
    'Each sunflower seed is placed at exactly 137.5° from the last — the golden angle. This produces optimal packing, ensuring every seed gets maximum sunlight. Count the spirals: 34 going one way, 55 the other. Both Fibonacci numbers.',
    '2001-07-20T12:00:00.000Z', 'personal',
    loc(43.6724, -111.9132, 'Rigby', 'ID'),
    ['fibonacci', 'sunflower', 'golden-angle', 'nature', 'flash-experiments'],
    ['placeholder-fibonacci.svg']),

  entry('demo-flash-golden-spiral', 'First Flash Experiments — ActionScript Spirals',
    'The first experiments with Macromedia Flash MX and ActionScript 1.0. Drawing golden spirals frame by frame, watching phi unfold on screen. Sunflower patterns at 137.5° intervals. 56 experiments would eventually emerge from these early tests.',
    '2001-09-01T12:00:00.000Z', 'personal',
    loc(43.4926, -112.0408, 'Idaho Falls', 'ID'),
    ['flash', 'actionscript', 'golden-ratio', 'fibonacci', 'animation', 'canvas'],
    ['placeholder-spiral.svg']),

  entry('demo-nautilus-shell', 'The Nautilus Shell — Logarithmic Spiral',
    'The chambered nautilus grows its shell in a logarithmic spiral — each chamber approximately φ times larger than the last. A living fossil, 500 million years unchanged, embodying the golden ratio in calcium carbonate.',
    '2002-03-14T12:00:00.000Z', 'personal',
    loc(21.3069, -157.8583, 'Honolulu', 'HI'),
    ['nautilus', 'logarithmic-spiral', 'golden-ratio', 'nature', 'geometry'],
    ['placeholder-nautilus.svg']),

  entry('demo-fibonacci-rabbits', 'Fibonacci\'s Original Problem — Breeding Rabbits',
    'The original question: "How many pairs of rabbits will there be after one year, starting with one pair, if each pair produces a new pair every month starting from their second month?" Answer: 144 pairs — the 12th Fibonacci number. A toy problem that unlocked infinity.',
    '1202-06-01T12:00:00.000Z', 'milestone',
    loc(43.7228, 10.4017, 'Pisa', 'Tuscany', 'IT'),
    ['fibonacci', 'rabbits', 'recursion', 'sequence', 'population', 'mathematics']),

  entry('demo-golden-rectangle-art', 'Mondrian, Seurat & the Golden Rectangle',
    'Piet Mondrian\'s abstract compositions and Georges Seurat\'s pointillist masterpieces both use golden rectangle subdivisions — conscious or not. The eye is drawn to focal points positioned at phi ratios within the frame. Instagram still uses the rule of thirds (an approximation of phi).',
    '1930-01-01T12:00:00.000Z', 'milestone',
    loc(52.3676, 4.9041, 'Amsterdam', 'North Holland', 'NL'),
    ['golden-rectangle', 'mondrian', 'seurat', 'art', 'composition', 'proportion']),

  entry('demo-penrose-tiling', 'Penrose Tiles — Aperiodic Order from Phi',
    'Roger Penrose discovered in 1974 that two tile shapes with proportions derived from phi can tile an infinite plane without ever repeating. Aperiodic order — never periodic, yet never random. The ratio of thick to thin rhombi converges on phi as the tiling grows.',
    '1974-01-01T12:00:00.000Z', 'milestone',
    loc(51.7520, -1.2577, 'Oxford', 'Oxfordshire', 'GB'),
    ['penrose', 'tiling', 'aperiodic', 'golden-ratio', 'geometry', 'quasi-crystal']),

  // ═══════════════════════════════════════════════════════════════════════════
  // ALICE IN WONDERLAND (7 entries)
  // ═══════════════════════════════════════════════════════════════════════════
  entry('demo-alice-oxford', 'Down the Rabbit Hole — Oxford, 1862',
    '"Alice was beginning to get very tired of sitting by her sister on the bank." Charles Lutwidge Dodgson (Lewis Carroll) — mathematician, logician — told the story to Alice Liddell on a golden afternoon. Mathematics disguised as nonsense: the Cheshire Cat\'s grin as a mathematical limit.',
    '1862-07-04T12:00:00.000Z', 'milestone',
    loc(51.7520, -1.2577, 'Oxford', 'Oxfordshire', 'GB'),
    ['alice', 'wonderland', 'lewis-carroll', 'mathematics', 'literature', 'logic']),

  entry('demo-alice-looking-glass', 'Through the Looking-Glass — Symmetry and Inversion',
    '"It\'s a poor sort of memory that only works backwards," said the White Queen. Carroll\'s sequel is built on symmetry — mirror images, chess moves, time running in reverse. The Red Queen\'s race anticipates both evolutionary biology and running on a fractal treadmill.',
    '1871-12-27T12:00:00.000Z', 'milestone',
    loc(51.7520, -1.2577, 'Oxford', 'Oxfordshire', 'GB'),
    ['alice', 'looking-glass', 'symmetry', 'chess', 'lewis-carroll', 'red-queen']),

  entry('demo-alice-scaling', 'Alice, Phi, and the Drink Me Bottle',
    'When Alice drinks, she shrinks by a ratio. When she eats, she grows by a ratio. Carroll understood scaling transformations. The proportional changes mirror self-similar scaling of fractals and the multiplicative nature of the golden ratio. Each transformation preserves shape while changing scale.',
    '2020-03-15T12:00:00.000Z', 'personal',
    loc(39.9138, -105.0367, 'Thornton', 'CO'),
    ['alice', 'scaling', 'golden-ratio', 'fractals', 'self-similarity', 'transformation']),

  entry('demo-carroll-fibonacci', 'Carroll\'s Fibonacci Puzzle — The Missing Square',
    'Lewis Carroll posed a famous puzzle: cut an 8×8 square (area 64) into pieces and rearrange into a 5×13 rectangle (area 65). Where does the extra square come from? The trick works because 5, 8, and 13 are consecutive Fibonacci numbers. Carroll the mathematician meets Carroll the trickster.',
    '1890-01-01T12:00:00.000Z', 'milestone',
    loc(51.7520, -1.2577, 'Oxford', 'Oxfordshire', 'GB'),
    ['carroll', 'fibonacci', 'puzzle', 'missing-square', 'geometry', 'deception']),

  entry('demo-cheshire-cat-limit', 'The Cheshire Cat as Mathematical Limit',
    '"Well! I\'ve often seen a cat without a grin," thought Alice; "but a grin without a cat! It\'s the most curious thing!" A function approaching its limit — the cat disappears but the grin (the property) remains. Carroll was teaching calculus through absurdity.',
    '1865-11-26T12:00:00.000Z', 'milestone',
    loc(51.7520, -1.2577, 'Oxford', 'Oxfordshire', 'GB'),
    ['alice', 'cheshire-cat', 'limits', 'calculus', 'carroll', 'abstraction']),

  entry('demo-mad-hatter-time', 'The Mad Tea Party — Time as Modular Arithmetic',
    'At the Mad Hatter\'s table, it is always six o\'clock. Time has stopped — or rather, it cycles modulo a fixed point. The table rotates but the positions repeat. Carroll demonstrates cyclic groups and modular arithmetic through a tea party that never advances.',
    '1865-11-26T12:00:00.000Z', 'milestone',
    loc(51.7520, -1.2577, 'Oxford', 'Oxfordshire', 'GB'),
    ['alice', 'mad-hatter', 'modular-arithmetic', 'time', 'cyclic-groups', 'carroll']),

  entry('demo-queens-croquet', 'The Queen\'s Croquet — Chaos Theory in Wonderland',
    'Flamingo mallets, hedgehog balls, card soldiers as wickets — all moving independently. The game is unplayable because the system is chaotic: tiny changes in initial conditions produce wildly different outcomes. Carroll intuited sensitive dependence 100 years before Lorenz named it.',
    '1865-11-26T12:00:00.000Z', 'milestone',
    loc(51.7520, -1.2577, 'Oxford', 'Oxfordshire', 'GB'),
    ['alice', 'queens-croquet', 'chaos-theory', 'sensitivity', 'carroll', 'nonlinear']),

  // ═══════════════════════════════════════════════════════════════════════════
  // FRACTALS & INFINITE PATTERNS (5 entries)
  // ═══════════════════════════════════════════════════════════════════════════
  entry('demo-mandelbrot-set', 'The Mandelbrot Set — Infinite Complexity from z² + c',
    'Benoit Mandelbrot visualized the set in 1980. The boundary of z² + c iterated on the complex plane reveals infinite detail at every zoom level — self-similar but never exactly repeating. Infinite length contained in finite area. Simple equation, infinite complexity.',
    '1980-03-01T12:00:00.000Z', 'milestone',
    loc(48.8566, 2.3522, 'Paris', 'Île-de-France', 'FR'),
    ['mandelbrot', 'fractals', 'complex-numbers', 'iteration', 'self-similarity'],
    ['placeholder-fractal.svg']),

  entry('demo-koch-snowflake', 'Koch Snowflake — Infinite Perimeter, Finite Area',
    'Start with a triangle. On each side, add a smaller triangle at 1/3 scale. Repeat infinitely. The perimeter grows without bound while the area converges to 8/5 of the original. Helge von Koch, 1904 — a continuous curve that is nowhere differentiable.',
    '1904-01-01T12:00:00.000Z', 'milestone',
    loc(59.3293, 18.0686, 'Stockholm', 'Stockholm', 'SE'),
    ['koch', 'snowflake', 'fractals', 'self-similarity', 'infinite-perimeter']),

  entry('demo-julia-sets', 'Julia Sets — One Equation, Infinite Worlds',
    'For each complex number c, there exists a Julia set — the boundary between points that escape to infinity under z² + c and those that don\'t. Change c slightly and the entire set transforms. The Mandelbrot set is a map OF all Julia sets — it indexes infinity.',
    '1918-01-01T12:00:00.000Z', 'milestone',
    loc(48.8566, 2.3522, 'Paris', 'Île-de-France', 'FR'),
    ['julia', 'fractals', 'complex-plane', 'iteration', 'mandelbrot', 'boundary']),

  entry('demo-sierpinski-triangle', 'Sierpinski Triangle — Removing to Create',
    'Start with a triangle. Remove the middle quarter. From each remaining triangle, remove the middle quarter. Repeat. The resulting shape has zero area but infinite perimeter. Dimension log(3)/log(2) ≈ 1.585 — neither 1D nor 2D.',
    '1915-01-01T12:00:00.000Z', 'milestone',
    loc(51.1079, 17.0385, 'Wrocław', 'Lower Silesia', 'PL'),
    ['sierpinski', 'triangle', 'fractals', 'hausdorff-dimension', 'self-similarity']),

  entry('demo-fractal-trees', 'L-Systems & Fractal Trees — Grammar of Growth',
    'Aristid Lindenmayer\'s L-systems (1968) model plant growth through string rewriting rules. F → F[+F]F[-F]F generates a tree. Simple grammar, branching complexity. The Flash experiments with particle systems are descendants of this algorithmic botany.',
    '1968-01-01T12:00:00.000Z', 'milestone',
    loc(52.0907, 5.1214, 'Utrecht', 'Utrecht', 'NL'),
    ['l-systems', 'lindenmayer', 'fractals', 'trees', 'grammar', 'algorithmic-botany']),

  // ═══════════════════════════════════════════════════════════════════════════
  // TESSERACTS & HIGHER DIMENSIONS (4 entries)
  // ═══════════════════════════════════════════════════════════════════════════
  entry('demo-tesseract', 'The Tesseract — A Cube in Four Dimensions',
    'A point extended becomes a line. A line swept becomes a square. A square extruded becomes a cube. A cube translated through the fourth dimension becomes a tesseract. We see only its 3D shadow, rotating impossibly. Charles Howard Hinton coined the term in 1888.',
    '1888-01-01T12:00:00.000Z', 'milestone',
    loc(51.5074, -0.1278, 'London', 'England', 'GB'),
    ['tesseract', 'hypercube', 'dimensions', '4d', 'geometry', 'projection'],
    ['placeholder-tesseract.svg']),

  entry('demo-flatland', 'Flatland — A Romance of Many Dimensions',
    '"I call our world Flatland, not because we call it so, but to make its nature clearer to you." Edwin Abbott\'s 1884 novella uses a 2D world to explore dimensional perception. A sphere passing through Flatland appears as an expanding and contracting circle.',
    '1884-01-01T12:00:00.000Z', 'milestone',
    loc(51.5074, -0.1278, 'London', 'England', 'GB'),
    ['flatland', 'dimensions', 'abbott', 'geometry', 'literature', 'analogy']),

  entry('demo-calabi-yau', 'Calabi-Yau Manifolds — Hidden Dimensions Curled Tight',
    'String theory proposes 10 or 11 dimensions — the extra 6-7 curled into Calabi-Yau manifolds at Planck scale (~10⁻³⁵m). Each point in our 3D space is actually a tiny 6D knot. The shape of these manifolds determines the physics of our universe.',
    '1978-01-01T12:00:00.000Z', 'milestone',
    loc(41.3163, -72.9223, 'New Haven', 'CT'),
    ['calabi-yau', 'string-theory', 'dimensions', 'manifold', 'physics', 'topology']),

  entry('demo-projections', 'Projecting Higher Dimensions — Shadows of Reality',
    'We understand 3D by casting 2D shadows (photography). Similarly, a tesseract\'s 3D "shadow" is what we can render on screen. Each rotation in 4D produces impossible-seeming transformations in the projection. Our Flash experiments rotate hypercubes in real-time.',
    '2002-05-01T12:00:00.000Z', 'personal',
    loc(43.4926, -112.0408, 'Idaho Falls', 'ID'),
    ['projection', 'tesseract', '4d', 'rotation', 'flash-experiments', 'shadow']),

  // ═══════════════════════════════════════════════════════════════════════════
  // WAVES & FOURIER (4 entries)
  // ═══════════════════════════════════════════════════════════════════════════
  entry('demo-fourier', 'Fourier\'s Gift — Any Shape from Sine Waves',
    'Jean-Baptiste Joseph Fourier proved in 1807 that any periodic function can be decomposed into sine and cosine waves. A square wave is an infinite sum of odd harmonics. Music, images, signals — everything is frequencies.',
    '1807-12-21T12:00:00.000Z', 'milestone',
    loc(45.1885, 5.7245, 'Grenoble', 'Isère', 'FR'),
    ['fourier', 'sine', 'cosine', 'waves', 'harmonics', 'decomposition'],
    ['placeholder-wave.svg']),

  entry('demo-standing-waves', 'Standing Waves — Vibration Creates Structure',
    'A string fixed at both ends can only vibrate at specific frequencies — harmonics. The fundamental, the octave, the fifth. These are the only stable patterns. Ernst Chladni showed that vibrating plates produce geometric patterns from sand — nodal lines where the plate doesn\'t move.',
    '1787-01-01T12:00:00.000Z', 'milestone',
    loc(51.3397, 12.3731, 'Leipzig', 'Saxony', 'DE'),
    ['standing-waves', 'chladni', 'harmonics', 'vibration', 'patterns', 'music']),

  entry('demo-musical-tuning', 'Musical Tuning & the Golden Ratio',
    'A piano octave spans 13 keys: 8 white, 5 black. The chromatic scale has 13 semitones. Major chord: notes 1, 3, 5. Fibonacci everywhere in music. And the "most pleasing" musical intervals (octave 2:1, fifth 3:2, fourth 4:3) are ratios of small integers — Pythagorean tuning.',
    '2003-01-15T12:00:00.000Z', 'personal',
    loc(43.4926, -112.0408, 'Idaho Falls', 'ID'),
    ['music', 'tuning', 'fibonacci', 'octave', 'pythagorean', 'intervals']),

  entry('demo-flash-sine-waves', 'Flash Sine/Cosine Experiments',
    'The Flash wave experiments visualized trigonometry in motion — circles decomposed into their x and y projections producing sine and cosine. Harmonic series stacked. Wave interference creating standing patterns. Simple trig, endlessly beautiful.',
    '2001-10-15T12:00:00.000Z', 'personal',
    loc(43.4926, -112.0408, 'Idaho Falls', 'ID'),
    ['flash', 'sine', 'cosine', 'trigonometry', 'waves', 'canvas', 'animation'],
    ['placeholder-wave.svg']),

  // ═══════════════════════════════════════════════════════════════════════════
  // PHYLLOTAXIS & NATURE (5 entries)
  // ═══════════════════════════════════════════════════════════════════════════
  entry('demo-phyllotaxis', 'Phyllotaxis — Why Plants Count in Fibonacci',
    'Pine cones: 8 spirals one way, 13 the other. Pineapples: 8, 13, 21. Romanesco broccoli: fractal spirals at every scale. The golden angle (≈137.5°) is the most irrational angle — no two seeds ever line up perfectly, giving each maximum space.',
    '2003-06-15T12:00:00.000Z', 'personal',
    loc(43.6724, -111.9132, 'Rigby', 'ID'),
    ['phyllotaxis', 'fibonacci', 'golden-angle', 'pine-cone', 'romanesco', 'nature']),

  entry('demo-romanesco', 'Romanesco Broccoli — Edible Fractals',
    'Each bud is a miniature copy of the whole, arranged in a logarithmic spiral. Count the spirals: always Fibonacci numbers. It\'s a fractal you can eat — self-similar at multiple scales, grown from simple genetic rules into geometric perfection.',
    '2005-03-01T12:00:00.000Z', 'personal',
    loc(41.9028, 12.4964, 'Rome', 'Lazio', 'IT'),
    ['romanesco', 'fractal', 'fibonacci', 'self-similarity', 'nature', 'food']),

  entry('demo-hurricane-spiral', 'Hurricanes, Galaxies & the Universal Spiral',
    'The Milky Way\'s spiral arms, hurricanes, whirlpools, water draining — all logarithmic spirals. DNA\'s double helix completes a full turn every 34 angstroms, with a width of 21 angstroms. 34/21 ≈ 1.619 — essentially phi. The spiral is everywhere.',
    '2005-01-15T12:00:00.000Z', 'personal',
    loc(43.4926, -112.0408, 'Idaho Falls', 'ID'),
    ['galaxy', 'spiral', 'logarithmic', 'golden-ratio', 'dna', 'hurricane', 'nature']),

  entry('demo-bee-ancestry', 'Honeybee Family Tree — Fibonacci in Genetics',
    'A male bee (drone) has 1 parent (mother only). A female has 2 parents. Count ancestors: 1, 1, 2, 3, 5, 8, 13... Fibonacci! The drone\'s family tree naturally produces the sequence because of haploid/diploid genetics. Nature discovered Fibonacci through reproduction.',
    '2004-05-01T12:00:00.000Z', 'personal',
    loc(43.6724, -111.9132, 'Rigby', 'ID'),
    ['bee', 'fibonacci', 'genetics', 'ancestry', 'haploid', 'nature', 'family-tree']),

  entry('demo-golden-angle-evolution', 'Evolution Discovered Phi First',
    'The golden angle wasn\'t designed — it evolved. Plants that packed seeds slightly more efficiently survived. Over millions of years, the packing angle converged on 137.5° because it\'s the MOST irrational angle — derived from phi. Evolution is a hill-climbing algorithm that found the global optimum.',
    '2003-08-01T12:00:00.000Z', 'personal',
    loc(43.6724, -111.9132, 'Rigby', 'ID'),
    ['evolution', 'golden-angle', 'optimization', 'natural-selection', 'phi', 'convergence']),

  // ═══════════════════════════════════════════════════════════════════════════
  // FLASH EXPERIMENTS & CREATIVE CODING (8 entries)
  // ═══════════════════════════════════════════════════════════════════════════
  entry('demo-particle-systems', 'Particle Systems & Emergent Beauty',
    'Simple rules, complex behavior. Each particle follows basic physics: velocity, gravity, friction. But thousands together create something alive — flocking birds, flowing water. No central control, just local rules producing global patterns.',
    '2002-02-14T12:00:00.000Z', 'personal',
    loc(43.4926, -112.0408, 'Idaho Falls', 'ID'),
    ['particles', 'emergence', 'complexity', 'flash-experiments', 'flocking', 'physics']),

  entry('demo-mouse-follow', 'Mouse Following — The Pursuit Curve',
    'A point chasing another traces a pursuit curve. When the prey moves in a circle, you get beautiful spiraling patterns. The Flash mouse-following experiments used chains of followers, each chasing the one ahead, creating organic tentacle-like motions from pure geometry.',
    '2001-11-01T12:00:00.000Z', 'personal',
    loc(43.4926, -112.0408, 'Idaho Falls', 'ID'),
    ['pursuit-curve', 'mouse-following', 'flash-experiments', 'geometry', 'interactive']),

  entry('demo-bounce-physics', 'Bounce Physics — Conservation and Chaos',
    'A ball bouncing in a box. Simple physics: velocity, gravity, elasticity. But change the coefficient of restitution slightly and order becomes chaos. Deterministic but unpredictable. Like weather. Like life.',
    '2002-01-15T12:00:00.000Z', 'personal',
    loc(43.4926, -112.0408, 'Idaho Falls', 'ID'),
    ['bounce', 'physics', 'chaos-theory', 'flash-experiments', 'deterministic']),

  entry('demo-network-connections', 'Network Connections — Six Degrees and Small Worlds',
    'Draw nodes. Connect nearby ones. Watch networks form. A few random long-distance connections transform a grid into a small world where everything is reachable in a handful of hops. The Flash network experiments visualized how connections cluster.',
    '2002-04-01T12:00:00.000Z', 'personal',
    loc(43.4926, -112.0408, 'Idaho Falls', 'ID'),
    ['networks', 'graph-theory', 'small-world', 'flash-experiments', 'connections']),

  entry('demo-color-theory', 'Color Theory Experiments — HSL and Harmony',
    'Cycling through hue at constant saturation and lightness creates rainbows. Complementary colors sit 180° apart on the wheel. Triadic harmonies at 120°. The Flash color experiments proved that mathematical relationships between wavelengths produce aesthetic pleasure.',
    '2002-03-01T12:00:00.000Z', 'personal',
    loc(43.4926, -112.0408, 'Idaho Falls', 'ID'),
    ['color-theory', 'hsl', 'harmony', 'flash-experiments', 'rainbow', 'wavelength']),

  entry('demo-pythagorean-circle', 'Pythagorean Theorem as Circle — x² + y² = r²',
    'The Pythagorean theorem IS the equation of a circle. Every point (x, y) satisfying x² + y² = r² lies on a circle of radius r. The Flash Pythagorean Circle experiment draws this truth one degree at a time, plotting cos(θ) and sin(θ) to verify the relationship.',
    '2001-12-01T12:00:00.000Z', 'personal',
    loc(43.4926, -112.0408, 'Idaho Falls', 'ID'),
    ['pythagorean', 'circle', 'trigonometry', 'flash-experiments', 'x2-y2-r2']),

  entry('demo-spring-physics', 'Spring Physics — Hooke\'s Law in Motion',
    'F = -kx. The force of a spring is proportional to displacement and opposite in direction. Connect particles with springs and you get cloth simulation, soft body physics, bouncing chains. Simple harmonic motion — another sine wave hiding in mechanics.',
    '2002-06-01T12:00:00.000Z', 'personal',
    loc(43.4926, -112.0408, 'Idaho Falls', 'ID'),
    ['spring', 'hookes-law', 'physics', 'flash-experiments', 'harmonic-motion', 'simulation']),

  entry('demo-canvas-to-html5', 'Flash to HTML5 Canvas — 20 Years Later',
    'In 2024, the original 56 Flash experiments were rebuilt in HTML5 Canvas and TypeScript. The mathematics remained identical. RequestAnimationFrame replaced onEnterFrame. Context2D replaced the timeline. The art survived the technology shift because math is eternal.',
    '2024-10-01T12:00:00.000Z', 'personal',
    loc(39.9138, -105.0367, 'Thornton', 'CO'),
    ['html5', 'canvas', 'flash', 'migration', 'typescript', 'preservation']),

  // ═══════════════════════════════════════════════════════════════════════════
  // CROSS-THEME INTERSECTIONS (7 entries)
  // ═══════════════════════════════════════════════════════════════════════════
  entry('demo-alice-fractal', 'Alice as Fractal — Self-Similar Narrative',
    'Wonderland\'s structure is fractal: stories within stories, the trial about a trial, the story told within the story. Alice herself scales up and down — a self-similar transformation. Carroll\'s narrative mirrors the mathematical structures he studied.',
    '2020-06-01T12:00:00.000Z', 'personal',
    loc(39.9138, -105.0367, 'Thornton', 'CO'),
    ['alice', 'fractal', 'self-similarity', 'narrative', 'recursion', 'meta']),

  entry('demo-wonderland-4d', 'Wonderland as Higher-Dimensional Space',
    'What if Wonderland is simply a 4D space projected into Alice\'s 3D perception? Objects changing size could be moving along the 4th axis. The Cheshire Cat fading is a 4D object moving "upward" out of Alice\'s 3D slice. Carroll, mathematically, could have intended this.',
    '2020-07-01T12:00:00.000Z', 'personal',
    loc(39.9138, -105.0367, 'Thornton', 'CO'),
    ['alice', 'wonderland', '4d', 'tesseract', 'projection', 'dimensions', 'interpretation']),

  entry('demo-music-fibonacci', 'Fibonacci in Music — From Bartók to Tool',
    'Béla Bartók structured "Music for Strings, Percussion, and Celesta" using Fibonacci numbers for bar counts. Tool\'s "Lateralus" has syllable counts following the sequence. Debussy used golden proportions for climax placement. The sequence IS rhythm.',
    '2004-01-01T12:00:00.000Z', 'personal',
    loc(43.4926, -112.0408, 'Idaho Falls', 'ID'),
    ['fibonacci', 'music', 'bartok', 'tool', 'lateralus', 'rhythm', 'composition']),

  entry('demo-chaos-fractals-music', 'Where Chaos Meets Music Meets Fractals',
    'Fractal music: melodies that are self-similar at different time scales. 1/f noise (pink noise) is fractal — it sounds "natural" because nature is fractal. The Flash experiments with bouncing balls accidentally generated rhythms that sounded musical because chaos has structure.',
    '2003-03-01T12:00:00.000Z', 'personal',
    loc(43.4926, -112.0408, 'Idaho Falls', 'ID'),
    ['chaos', 'fractals', 'music', 'pink-noise', '1-over-f', 'rhythm', 'self-similarity']),

  entry('demo-golden-ratio-faces', 'The Golden Ratio in Human Faces — Myth and Truth',
    'Pop science claims beautiful faces conform to phi. The truth is more nuanced: we prefer AVERAGENESS (composite faces), which happens to approximate phi ratios because of human body proportions. The golden ratio in faces is likely a consequence, not a cause, of beauty.',
    '2004-06-01T12:00:00.000Z', 'personal',
    loc(43.4926, -112.0408, 'Idaho Falls', 'ID'),
    ['golden-ratio', 'faces', 'beauty', 'myth', 'averageness', 'proportion', 'debunking']),

  entry('demo-recursion-everywhere', 'Recursion: The Pattern that Contains Itself',
    'A function that calls itself. A story about a story. A mirror reflecting a mirror. Droste effect. Fibonacci: F(n) = F(n-1) + F(n-2). Fractals: apply the rule to the result of the rule. Recursion is the fundamental pattern of self-reference — and consciousness itself may be recursive.',
    '2003-09-01T12:00:00.000Z', 'personal',
    loc(43.4926, -112.0408, 'Idaho Falls', 'ID'),
    ['recursion', 'self-reference', 'fibonacci', 'fractals', 'droste', 'consciousness']),

  entry('demo-emergence-life', 'Conway\'s Game of Life — Complexity from Nothing',
    'Four rules. Dead cells with 3 neighbors become alive. Live cells with 2-3 neighbors survive. Everything else dies. From this, gliders emerge, guns that shoot gliders, computers built from gliders. Turing-complete complexity from four rules and an infinite grid. Emergence incarnate.',
    '1970-10-01T12:00:00.000Z', 'milestone',
    loc(40.3440, -74.6514, 'Princeton', 'NJ'),
    ['conway', 'game-of-life', 'emergence', 'cellular-automata', 'complexity', 'turing-complete']),

  // ═══════════════════════════════════════════════════════════════════════════
  // CAREER HISTORY (9 entries)
  // ═══════════════════════════════════════════════════════════════════════════
  entry('career-republic-services', 'Full Stack Engineer — Republic Services',
    'Lead a team of engineers developing the eCommerce platform using Angular, TypeScript, Node.js, and AWS. Drive Micro Front-End architecture with Module Federation and Nx monorepo. Build and deploy AI-driven applications. Provide technical leadership across the full SDLC.',
    '2019-12-01T00:00:00.000Z', 'career',
    loc(43.8260, -111.7897, 'Rexburg', 'ID'),
    ['career', 'republic-services', 'angular', 'typescript', 'nodejs', 'aws', 'micro-frontend', 'ai']),

  entry('career-matrix-medical', 'Senior Developer — Matrix Medical Network',
    'Developed a cross-platform mobile application using React and Redux to enable nurse practitioners to gather health assessments remotely. Integrated with Couchbase backend for real-time sync and offline storage. Ensured HIPAA compliance throughout.',
    '2017-02-01T00:00:00.000Z', 'career',
    loc(33.4942, -111.9261, 'Scottsdale', 'AZ'),
    ['career', 'matrix-medical', 'react', 'redux', 'couchbase', 'mobile', 'hipaa', 'healthcare']),

  entry('career-cybersponse', 'Software Engineer — CyberSponse, Inc.',
    'Developed the 4th version of the Incident Response platform from the ground up as an AngularJS application. Built dynamic views, JWT authentication, and contributed to CI/CD pipeline development. Implemented responsive design and interactive directives.',
    '2015-03-01T00:00:00.000Z', 'career',
    loc(33.4942, -111.9261, 'Scottsdale', 'AZ'),
    ['career', 'cybersponse', 'angularjs', 'security', 'incident-response', 'jwt', 'cicd']),

  entry('career-pearson', 'Lead Software Developer — Pearson',
    'Led the conversion of Flash-based e-learning courseware into modern web solutions using AngularJS. Managed cross-functional teams onshore and offshore. Acted as Scrum Master and developer. Integrated two large LMS systems through web services.',
    '2003-11-01T00:00:00.000Z', 'career',
    loc(33.3062, -111.8413, 'Chandler', 'AZ'),
    ['career', 'pearson', 'angularjs', 'flash', 'elearning', 'scrum', 'lms', 'leadership']),

  entry('career-higherconcept', 'Flash Developer — HigherConcept',
    'Worked as a Graphic Designer and Flash Developer creating an Algebra 101 e-Learning course. Developed interactive and non-interactive Flash animations, tests, and custom graphics with ActionScript.',
    '2003-05-01T00:00:00.000Z', 'career',
    loc(33.4152, -111.8315, 'Mesa', 'AZ'),
    ['career', 'higherconcept', 'flash', 'actionscript', 'elearning', 'graphic-design']),

  entry('career-knowledgenet', 'Graphic Designer / Flash Developer — KnowledgeNet',
    'Created IT-focused eLearning courses with Flash animations and ActionScript. Built custom 3D graphics using Lightwave, Illustrator, and Photoshop. Produced demos for trade shows and corporate clients including Cisco, EMC, and BMW.',
    '2000-01-01T00:00:00.000Z', 'career',
    loc(33.4942, -111.9261, 'Scottsdale', 'AZ'),
    ['career', 'knowledgenet', 'flash', 'actionscript', 'lightwave', '3d', 'elearning', 'cisco', 'bmw']),

  entry('career-mindspring-earthlink', 'Technical Support Representative — MindSpring / Earthlink',
    'Provided technical support via phone and email, resolving email and internet connectivity issues across Windows, Mac OS, and Linux. Configured DNS, TCP/IP, and DHCP for dial-up and DSL connections.',
    '1999-01-01T00:00:00.000Z', 'career',
    loc(33.4255, -111.9400, 'Tempe', 'AZ'),
    ['career', 'mindspring', 'earthlink', 'tech-support', 'networking', 'dns', 'dialup']),

  entry('career-winstar-goodnet', 'Technical Support Representative — Winstar / GoodNet',
    'Provided technical support via phone and email, troubleshooting email and internet connectivity across multiple platforms. Configured DNS, TCP/IP, and DHCP for dial-up and DSL connections.',
    '1998-04-01T00:00:00.000Z', 'career',
    loc(33.4484, -112.0740, 'Phoenix', 'AZ'),
    ['career', 'winstar', 'goodnet', 'tech-support', 'networking', 'dns', 'dialup']),

  entry('career-bestway', 'Carpet Cleaning Technician — Bestway Carpet Cleaners',
    'Cleaned and maintained carpets in homes and offices using specialized equipment. Performed regular maintenance on HydraMaster truck-mounted steam cleaning machine. Provided client guidance on post-cleaning care and maintenance.',
    '1992-04-01T00:00:00.000Z', 'career',
    loc(43.4926, -112.0408, 'Idaho Falls', 'ID'),
    ['career', 'bestway', 'carpet-cleaning', 'customer-service', 'equipment-maintenance']),
];

// ============================================================================
// DATABASE OPERATIONS
// ============================================================================

/**
 * Delete the table (for --reset mode).
 */
async function deleteTable() {
  try {
    await dynamodb.deleteTable({ TableName: TABLE_NAME }).promise();
    console.log(`✓ Deleted table: ${TABLE_NAME}`);
    await new Promise(resolve => setTimeout(resolve, 1000));
  } catch (error) {
    if (error.code === 'ResourceNotFoundException') {
      console.log(`  Table ${TABLE_NAME} does not exist, nothing to delete`);
    } else {
      throw error;
    }
  }
}

/**
 * Create the table if it doesn't exist.
 */
async function createTable() {
  const params = {
    TableName: TABLE_NAME,
    KeySchema: [
      { AttributeName: 'id', KeyType: 'HASH' },
    ],
    AttributeDefinitions: [
      { AttributeName: 'id', AttributeType: 'S' },
      { AttributeName: 'category', AttributeType: 'S' },
      { AttributeName: 'date', AttributeType: 'S' },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'category-date-index',
        KeySchema: [
          { AttributeName: 'category', KeyType: 'HASH' },
          { AttributeName: 'date', KeyType: 'RANGE' },
        ],
        Projection: { ProjectionType: 'ALL' },
        ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 },
      },
    ],
    ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 },
  };

  try {
    await dynamodb.createTable(params).promise();
    console.log(`✓ Created table: ${TABLE_NAME}`);
    await new Promise(resolve => setTimeout(resolve, 1000));
  } catch (error) {
    if (error.code === 'ResourceInUseException') {
      console.log(`✓ Table already exists: ${TABLE_NAME}`);
    } else {
      throw error;
    }
  }
}

/**
 * Seed the table with demo entries using batch writes.
 */
async function seedEntries() {
  let inserted = 0;
  const BATCH_SIZE = 25; // DynamoDB batch limit

  for (let i = 0; i < SEED_ENTRIES.length; i += BATCH_SIZE) {
    const batch = SEED_ENTRIES.slice(i, i + BATCH_SIZE);
    const params = {
      RequestItems: {
        [TABLE_NAME]: batch.map(item => ({
          PutRequest: { Item: item },
        })),
      },
    };

    try {
      await docClient.batchWrite(params).promise();
      inserted += batch.length;
    } catch (error) {
      // Fallback to individual puts if batch fails
      for (const item of batch) {
        try {
          await docClient.put({ TableName: TABLE_NAME, Item: item }).promise();
          inserted++;
        } catch (putError) {
          console.error(`  ✗ Failed to insert ${item.id}:`, putError.message);
        }
      }
    }
  }

  console.log(`✓ Seeded ${inserted}/${SEED_ENTRIES.length} entries`);
}

/**
 * Main execution.
 */
async function main() {
  console.log(`\n╔════════════════════════════════════════════════╗`);
  console.log(`║  Jouster Life Map — Seed Demo Data            ║`);
  console.log(`╚════════════════════════════════════════════════╝`);
  console.log(`  Endpoint: ${ENDPOINT}`);
  console.log(`  Table:    ${TABLE_NAME}`);
  console.log(`  Mode:     ${RESET ? 'RESET (drop + recreate + seed)' : 'SEED (create if needed + seed)'}`);
  console.log(`  Entries:  ${SEED_ENTRIES.length}\n`);

  try {
    if (RESET) {
      await deleteTable();
    }

    await createTable();
    await seedEntries();

    // Verify
    const result = await docClient.scan({ TableName: TABLE_NAME, Select: 'COUNT' }).promise();
    console.log(`\n✓ Table now has ${result.Count} entries`);

    // Show category breakdown
    const fullScan = await docClient.scan({ TableName: TABLE_NAME }).promise();
    const categories = {};
    fullScan.Items.forEach(i => { categories[i.category] = (categories[i.category] || 0) + 1; });
    console.log('  Categories:', Object.entries(categories).map(([k, v]) => `${k}(${v})`).join(', '));

    const locations = [...new Set(fullScan.Items.map(i => i.location?.city).filter(Boolean))];
    console.log(`  Locations:  ${locations.length} cities`);
    console.log(`\n✓ Done! Start the backend and visit /timeline\n`);
  } catch (error) {
    console.error('\n✗ Seed failed:', error.message);
    console.error('  Is DynamoDB Local running? Try: docker-compose up -d');
    process.exit(1);
  }
}

main();

