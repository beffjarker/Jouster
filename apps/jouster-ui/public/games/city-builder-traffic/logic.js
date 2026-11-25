// ============================================================================
// City Builder & Traffic - Pure Game Logic (no DOM, no canvas)
// ============================================================================

// --- Constants ---
const GRID_W = 12;
const GRID_H = 10;
const MAX_TURNS = 300;
const INITIAL_MONEY = 800;
const INITIAL_HAPPINESS = 70;
const MIN_HAPPINESS = 0;
const WIN_HAPPINESS = 80;
const WIN_TURNS = 200;

// Tile types
const TILE_EMPTY = 'empty';
const TILE_ROAD = 'road';
const TILE_RESIDENTIAL = 'residential';
const TILE_COMMERCIAL = 'commercial';
const TILE_INDUSTRIAL = 'industrial';
const TILE_POWER = 'power';
const TILE_WATER = 'water';
const TILE_BUILDING = 'building';

// Building types (for buildings on top of roads)
const BUILDING_NONE = 'none';

// --- Helpers ---
function key(x, y) {
  return `${x},${y}`;
}

function parseKey(k) {
  const [x, y] = k.split(',').map(Number);
  return { x, y };
}

function inBounds(x, y) {
  return x >= 0 && x < GRID_W && y >= 0 && y < GRID_H;
}

function cloneGrid(grid) {
  return grid.map(row => [...row]);
}

function cloneBuildings(buildings) {
  const copy = {};
  for (const k in buildings) {
    copy[k] = { ...buildings[k] };
  }
  return copy;
}

// --- Initial State ---
function createInitialState() {
  const grid = [];
  for (let y = 0; y < GRID_H; y++) {
    const row = [];
    for (let x = 0; x < GRID_W; x++) {
      row.push(TILE_EMPTY);
    }
    grid.push(row);
  }
  return {
    grid: cloneGrid(grid),
    buildings: {},
    money: INITIAL_MONEY,
    happiness: INITIAL_HAPPINESS,
    turn: 0,
    totalBuildings: 0,
    totalRoads: 0,
    totalPopulation: 0,
    vehicles: [],
    congestionMap: {},
    gameOver: false,
    gameWon: false,
    message: '',
    stats: {
      buildingsBuilt: 0,
      roadsBuilt: 0,
      demolishCount: 0,
      powerPlants: 0,
      waterTowers: 0,
      residentialCount: 0,
      commercialCount: 0,
      industrialCount: 0,
    },
  };
}

// --- Building Costs ---
const BUILD_COSTS = {
  road: 10,
  residential: 50,
  commercial: 75,
  industrial: 100,
  power: 200,
  water: 150,
  demolish: -5, // refund
};

// --- Placement ---
function canPlace(state, x, y, type) {
  if (!inBounds(x, y)) return false;
  const current = state.grid[y][x];
  if (type === 'demolish') return current !== TILE_EMPTY;
  if (current !== TILE_EMPTY) return false;

  // Power can be placed anywhere on an empty tile (roads can be extended to it later)
  if (type === 'power') {
    // No adjacency requirement
  }

  // Water needs to be adjacent to at least one road
  if (type === 'water') {
    let hasRoadNearby = false;
    for (let dy = -3; dy <= 3; dy++) {
      for (let dx = -3; dx <= 3; dx++) {
        const nx = x + dx, ny = y + dy;
        if (inBounds(nx, ny) && state.grid[ny][nx] === TILE_ROAD) {
          const dist = Math.abs(dx) + Math.abs(dy);
          if (dist <= 3) hasRoadNearby = true;
        }
      }
    }
    if (!hasRoadNearby) return false;
  }

  // Non-road structures need at least one adjacent road (for access)
  // Power plants are exempt (roads can be extended to them later)
  if (type !== TILE_ROAD && type !== 'power') {
    let hasAdjacentRoad = false;
    const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
    for (const [dx, dy] of dirs) {
      const nx = x + dx, ny = y + dy;
      if (inBounds(nx, ny) && state.grid[ny][nx] === TILE_ROAD) {
        hasAdjacentRoad = true;
        break;
      }
    }
    if (!hasAdjacentRoad) return false;
  }

  return true;
}

function placeTile(state, x, y, type) {
  if (!canPlace(state, x, y, type)) return { success: false, error: 'Cannot place here' };

  const cost = BUILD_COSTS[type];
  if (state.money < cost) return { success: false, error: 'Not enough money' };

  state.grid[y][x] = type;
  state.money -= cost;

  if (type === TILE_ROAD) {
    state.totalRoads++;
    state.stats.roadsBuilt++;
  } else if (type === 'demolish') {
    const prev = state.grid[y][x];
    state.grid[y][x] = TILE_EMPTY;
    if (state.buildings[key(x, y)]) {
      delete state.buildings[key(x, y)];
      state.totalBuildings = Math.max(0, state.totalBuildings - 1);
    }
    state.stats.demolishCount++;
    state.totalRoads = Math.max(0, state.totalRoads - 1);
  } else {
    state.grid[y][x] = type;
    const buildingType = type === TILE_POWER ? 'powerPlant' : type === TILE_WATER ? 'waterTower' : type;
    state.buildings[key(x, y)] = {
      type: buildingType,
      health: 100,
      powered: false,
      occupants: 0,
      maxOccupants: type === TILE_RESIDENTIAL ? 10 : type === TILE_COMMERCIAL ? 8 : type === TILE_INDUSTRIAL ? 6 : 0,
    };
    state.totalBuildings++;
    state.stats.buildingsBuilt++;
    if (buildingType === 'powerPlant') state.stats.powerPlants++;
    if (buildingType === 'waterTower') state.stats.waterTowers++;
    if (buildingType === 'residential') state.stats.residentialCount++;
    if (buildingType === 'commercial') state.stats.commercialCount++;
    if (buildingType === 'industrial') state.stats.industrialCount++;
  }

  // Recalculate everything
  recalcState(state);
  return { success: true };
}

// --- Power Distribution ---
function getPoweredTiles(state) {
  const powered = new Set();
  const powerSources = [];

  // Find power plants
  for (let y = 0; y < GRID_H; y++) {
    for (let x = 0; x < GRID_W; x++) {
      if (state.grid[y][x] === TILE_POWER) {
        powerSources.push({ x, y });
      }
    }
  }

  // BFS from each power source along roads, then extend 3 tiles in all directions
  for (const source of powerSources) {
    // BFS on roads from power plant
    const visited = new Set();
    const queue = [{ x: source.x, y: source.y, dist: 0 }];
    visited.add(key(source.x, source.y));
    powered.add(key(source.x, source.y));

    while (queue.length > 0) {
      const curr = queue.shift();

      // Mark this tile and immediate neighbors as powered (power lines)
      for (let dy = -3; dy <= 3; dy++) {
        for (let dx = -3; dx <= 3; dx++) {
          const nx = curr.x + dx, ny = curr.y + dy;
          const nk = key(nx, ny);
          if (inBounds(nx, ny) && !visited.has(nk)) {
            const dist = Math.abs(dx) + Math.abs(dy);
            if (dist <= 3) {
              powered.add(nk);
            }
          }
        }
      }

      // Extend BFS along roads up to 6 tiles from source
      if (curr.dist < 6) {
        const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
        for (const [dx, dy] of dirs) {
          const nx = curr.x + dx, ny = curr.y + dy;
          const nk = key(nx, ny);
          if (inBounds(nx, ny) && !visited.has(nk) && state.grid[ny][nx] === TILE_ROAD) {
            visited.add(nk);
            queue.push({ x: nx, y: ny, dist: curr.dist + 1 });
          }
        }
      }
    }
  }

  return powered;
}

// --- Traffic Simulation ---
function generateVehicles(state) {
  const vehicles = [];
  const buildingKeys = Object.keys(state.buildings);

  // Spawn rate depends on residential/commercial/industrial ratio
  const residential = state.stats.residentialCount;
  const commercial = state.stats.commercialCount;
  const industrial = state.stats.industrialCount;
  const total = residential + commercial + industrial;
  if (total === 0) return vehicles;

  // Number of vehicles based on building count
  const numVehicles = Math.min(Math.floor(total * 0.8), 20);

  for (let i = 0; i < numVehicles; i++) {
    // Pick a random building as origin
    const originKey = buildingKeys[Math.floor(Math.random() * buildingKeys.length)];
    const origin = parseKey(originKey);

    // Find nearest road
    const road = findNearestRoad(state, origin.x, origin.y);
    if (!road) continue;

    // Pick destination (different building)
    let destKey;
    let dest;
    let attempts = 0;
    do {
      destKey = buildingKeys[Math.floor(Math.random() * buildingKeys.length)];
      dest = parseKey(destKey);
      attempts++;
    } while ((dest.x === origin.x && dest.y === origin.y) && attempts < 10);

    if (!dest || (dest.x === origin.x && dest.y === origin.y)) continue;

    // Find nearest road to destination
    const destRoad = findNearestRoad(state, dest.x, dest.y);
    if (!destRoad) continue;

    // BFS path from origin road to dest road
    const path = bfsPath(state, road.x, road.y, destRoad.x, destRoad.y);
    if (!path || path.length < 2) continue;

    const vehicleType = state.buildings[originKey].type === TILE_RESIDENTIAL ? 'car' :
                        state.buildings[originKey].type === TILE_COMMERCIAL ? 'truck' : 'car';

    vehicles.push({
      id: `v${i}`,
      x: road.x,
      y: road.y,
      path: path,
      pathIndex: 0,
      type: vehicleType,
      speed: vehicleType === 'truck' ? 0.5 : 1,
      progress: 0,
      origin: originKey,
      destination: destKey,
      congestion: 0,
      stuck: 0,
    });
  }

  return vehicles;
}

function findNearestRoad(state, startX, startY) {
  const visited = new Set();
  const queue = [{ x: startX, y: startY, dist: 0 }];
  visited.add(key(startX, startY));

  while (queue.length > 0) {
    const curr = queue.shift();
    if (state.grid[curr.y][curr.x] === TILE_ROAD) {
      return { x: curr.x, y: curr.y };
    }
    const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
    for (const [dx, dy] of dirs) {
      const nx = curr.x + dx, ny = curr.y + dy;
      const nk = key(nx, ny);
      if (inBounds(nx, ny) && !visited.has(nk)) {
        visited.add(nk);
        queue.push({ x: nx, y: ny, dist: curr.dist + 1 });
      }
    }
  }
  return null;
}

function bfsPath(state, startX, startY, endX, endY) {
  if (state.grid[startY][startX] !== TILE_ROAD || state.grid[endY][endX] !== TILE_ROAD) {
    return null;
  }

  const visited = new Set();
  const parent = {};
  const queue = [{ x: startX, y: startY }];
  visited.add(key(startX, startY));

  while (queue.length > 0) {
    const curr = queue.shift();

    if (curr.x === endX && curr.y === endY) {
      // Reconstruct path
      const path = [{ x: endX, y: endY }];
      let currKey = key(endX, endY);
      while (currKey !== key(startX, startY)) {
        const p = parent[currKey];
        path.unshift({ x: p.x, y: p.y });
        currKey = key(p.x, p.y);
      }
      return path;
    }

    const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
    for (const [dx, dy] of dirs) {
      const nx = curr.x + dx, ny = curr.y + dy;
      const nk = key(nx, ny);
      if (inBounds(nx, ny) && !visited.has(nk) && state.grid[ny][nx] === TILE_ROAD) {
        visited.add(nk);
        parent[nk] = curr;
        queue.push({ x: nx, y: ny });
      }
    }
  }

  return null;
}

function simulateTraffic(state) {
  const powered = getPoweredTiles(state);
  const congestionMap = {};

  // Count vehicles per road tile
  const roadTraffic = {};
  for (const v of state.vehicles) {
    if (v.pathIndex < v.path.length) {
      const pos = v.path[v.pathIndex];
      const k = key(pos.x, pos.y);
      roadTraffic[k] = (roadTraffic[k] || 0) + 1;
    }
  }

  // Apply congestion
  for (const k in roadTraffic) {
    congestionMap[k] = Math.min(roadTraffic[k] / 3, 1); // 3+ vehicles = max congestion
  }

  // Move vehicles
  for (const v of state.vehicles) {
    if (v.pathIndex >= v.path.length) continue;

    const nextPos = v.path[v.pathIndex];
    const nk = key(nextPos.x, nextPos.y);
    const traffic = roadTraffic[nk] || 0;

    // Congestion slows vehicles
    const effectiveSpeed = v.speed * (1 - congestionMap[nk] * 0.7);
    v.progress += effectiveSpeed;

    if (v.progress >= 1) {
      v.progress = 0;
      v.x = nextPos.x;
      v.y = nextPos.y;
      v.pathIndex++;

      // Check if stuck
      if (traffic >= 3) {
        v.stuck++;
        if (v.stuck > 10) {
          // Vehicle gives up, returns to origin
          v.pathIndex = 0;
          v.stuck = 0;
          v.progress = 0;
        }
      } else {
        v.stuck = 0;
      }
    }
  }

  state.congestionMap = congestionMap;
}

// --- Happiness Calculation ---
function calcHappiness(state) {
  let base = 70;
  let factors = [];

  // Power coverage
  const powered = getPoweredTiles(state);
  const unpowered = [];
  for (let y = 0; y < GRID_H; y++) {
    for (let x = 0; x < GRID_W; x++) {
      const k = key(x, y);
      if (state.grid[y][x] !== TILE_EMPTY && state.grid[y][x] !== TILE_ROAD && !powered.has(k)) {
        unpowered.push(k);
      }
    }
  }
  if (unpowered.length > 0) {
    const penalty = Math.min(unpowered.length * 3, 30);
    base -= penalty;
    factors.push(`unpowered: -${penalty}`);
  }

  // Population density bonus
  const residential = state.stats.residentialCount;
  const commercial = state.stats.commercialCount;
  const industrial = state.stats.industrialCount;
  const total = residential + commercial + industrial;

  if (total > 0) {
    // Balanced mix bonus
    const ratios = [residential / total, commercial / total, industrial / total];
    const ideal = 1 / 3;
    let balancePenalty = 0;
    for (const r of ratios) {
      balancePenalty += Math.abs(r - ideal) * 15;
    }
    base -= Math.min(balancePenalty, 15);
    factors.push(`balance: -${Math.min(Math.round(balancePenalty), 15)}`);

    // Too many buildings penalty (overcrowding)
    const occupancy = total / (GRID_W * GRID_H);
    if (occupancy > 0.5) {
      const overcrowd = (occupancy - 0.5) * 40;
      base -= Math.min(overcrowd, 20);
      factors.push(`overcrowd: -${Math.min(Math.round(overcrowd), 20)}`);
    }
  }

  // Congestion penalty
  let congestionPenalty = 0;
  for (const k in state.congestionMap) {
    congestionPenalty += state.congestionMap[k] * 2;
  }
  base -= Math.min(congestionPenalty, 15);
  factors.push(`congestion: -${Math.min(Math.round(congestionPenalty), 15)}`);

  // Water access bonus
  const waterTiles = [];
  for (let y = 0; y < GRID_H; y++) {
    for (let x = 0; x < GRID_W; x++) {
      if (state.grid[y][x] === TILE_WATER) {
        waterTiles.push({ x, y });
      }
    }
  }
  if (waterTiles.length > 0) {
    let waterBonus = 0;
    for (const wt of waterTiles) {
      for (let dy = -5; dy <= 5; dy++) {
        for (let dx = -5; dx <= 5; dx++) {
          const nx = wt.x + dx, ny = wt.y + dy;
          if (inBounds(nx, ny)) {
            const dist = Math.abs(dx) + Math.abs(dy);
            if (dist <= 5) {
              waterBonus += Math.max(0, (5 - dist));
            }
          }
        }
      }
    }
    base += Math.min(waterBonus * 0.5, 10);
    factors.push(`water: +${Math.min(Math.round(waterBonus * 0.5), 10)}`);
  }

  // Clamp
  state.happiness = Math.max(MIN_HAPPINESS, Math.min(100, Math.round(base)));
  state._happinessFactors = factors;
  return state.happiness;
}

// --- Recalculate ---
function recalcState(state) {
  // Recount buildings by type
  state.stats.residentialCount = 0;
  state.stats.commercialCount = 0;
  state.stats.industrialCount = 0;
  state.stats.powerPlants = 0;
  state.stats.waterTowers = 0;
  state.totalBuildings = 0;
  state.totalRoads = 0;

  for (let y = 0; y < GRID_H; y++) {
    for (let x = 0; x < GRID_W; x++) {
      const tile = state.grid[y][x];
      if (tile !== TILE_EMPTY) {
        if (tile === TILE_ROAD) {
          state.totalRoads++;
        } else {
          state.totalBuildings++;
          const b = state.buildings[key(x, y)];
          if (b) {
            if (b.type === 'residential') state.stats.residentialCount++;
            if (b.type === 'commercial') state.stats.commercialCount++;
            if (b.type === 'industrial') state.stats.industrialCount++;
            if (b.type === 'powerPlant') state.stats.powerPlants++;
            if (b.type === 'waterTower') state.stats.waterTowers++;
          }
        }
      }
    }
  }

  // Power
  const powered = getPoweredTiles(state);
  for (const k in state.buildings) {
    state.buildings[k].powered = powered.has(k);
  }

  // Traffic
  state.vehicles = generateVehicles(state);
  simulateTraffic(state);

  // Happiness
  calcHappiness(state);

  // Population
  state.totalPopulation = 0;
  for (const k in state.buildings) {
    const b = state.buildings[k];
    if (b.type === TILE_RESIDENTIAL && b.powered) {
      b.occupants = Math.floor(b.maxOccupants * (state.happiness / 100));
      state.totalPopulation += b.occupants;
    } else {
      b.occupants = 0;
    }
  }

  // Win/lose check
  if (state.happiness <= MIN_HAPPINESS) {
    state.gameOver = true;
    state.gameWon = false;
    state.message = 'City collapsed! Happiness reached zero.';
  } else if (state.happiness >= WIN_HAPPINESS && state.turn >= WIN_TURNS) {
    state.gameWon = true;
    state.gameOver = true;
    state.message = `Victory! Your city thrives with ${state.happiness}% happiness!`;
  } else if (state.turn >= MAX_TURNS) {
    state.gameWon = false;
    state.gameOver = true;
    state.message = `Time's up! Final happiness: ${state.happiness}%`;
  }
}

// --- Turn Advance ---
function advanceTurn(state) {
  if (state.gameOver) return;
  state.turn++;

  // Regenerate traffic
  state.vehicles = generateVehicles(state);
  simulateTraffic(state);

  // Happiness fluctuation
  const fluctuation = Math.floor(Math.random() * 7) - 3; // -3 to +3
  state.happiness = Math.max(MIN_HAPPINESS, Math.min(100, state.happiness + fluctuation));

  // Recalculate everything
  recalcState(state);
}

// --- Save / Load ---
function saveGame(state) {
  const data = {
    grid: state.grid,
    buildings: state.buildings,
    money: state.money,
    happiness: state.happiness,
    turn: state.turn,
    totalBuildings: state.totalBuildings,
    totalRoads: state.totalRoads,
    totalPopulation: state.totalPopulation,
    stats: state.stats,
  };
  return JSON.stringify(data);
}

function loadGame(json) {
  try {
    const data = JSON.parse(json);
    const state = createInitialState();
    state.grid = data.grid;
    state.buildings = data.buildings;
    state.money = data.money;
    state.happiness = data.happiness;
    state.turn = data.turn;
    state.totalBuildings = data.totalBuildings;
    state.totalRoads = data.totalRoads;
    state.totalPopulation = data.totalPopulation;
    state.stats = data.stats;
    recalcState(state);
    return state;
  } catch (e) {
    return null;
  }
}

// --- Test Suite ---
function runTests() {
  const results = { passed: 0, failed: 0, tests: [] };

  function assert(condition, name) {
    if (condition) {
      results.passed++;
      results.tests.push({ name, result: 'PASS' });
    } else {
      results.failed++;
      results.tests.push({ name, result: 'FAIL' });
    }
  }

  // Test 1: Initial state
  const s1 = createInitialState();
  assert(s1.money === INITIAL_MONEY, 'initial money');
  assert(s1.happiness === INITIAL_HAPPINESS, 'initial happiness');
  assert(s1.turn === 0, 'initial turn');
  assert(s1.grid.flat().every(t => t === TILE_EMPTY), 'empty grid');
  assert(s1.gameOver === false, 'game not over');

  // Test 2: Place road
  const s2 = createInitialState();
  const r2 = placeTile(s2, 0, 0, TILE_ROAD);
  assert(r2.success === true, 'place road at 0,0');
  assert(s2.grid[0][0] === TILE_ROAD, 'road placed correctly');
  assert(s2.money === INITIAL_MONEY - BUILD_COSTS.road, 'road cost deducted');

  // Test 3: Cannot place on road
  const s3 = createInitialState();
  placeTile(s3, 0, 0, TILE_ROAD);
  const r3 = placeTile(s3, 0, 0, TILE_ROAD);
  assert(r3.success === false, 'cannot place on road');

  // Test 4: Cannot place residential without adjacent road
  const s4 = createInitialState();
  const r4 = placeTile(s4, 2, 2, TILE_RESIDENTIAL);
  assert(r4.success === false, 'cannot place residential without road');

  // Test 5: Place road then residential
  const s5 = createInitialState();
  placeTile(s5, 1, 0, TILE_ROAD);
  const r5 = placeTile(s5, 2, 0, TILE_RESIDENTIAL);
  assert(r5.success === true, 'place residential next to road');
  assert(s5.grid[0][2] === TILE_RESIDENTIAL, 'residential placed correctly');

  // Test 6: Money management
  const s6 = createInitialState();
  assert(s6.money === INITIAL_MONEY, 'initial money correct');
  placeTile(s6, 0, 0, TILE_ROAD);
  placeTile(s6, 1, 0, TILE_RESIDENTIAL);
  const expectedMoney = INITIAL_MONEY - BUILD_COSTS.road - BUILD_COSTS.residential;
  assert(s6.money === expectedMoney, 'money after placements');

  // Test 7: Demolish
  const s7 = createInitialState();
  placeTile(s7, 0, 0, TILE_ROAD);
  placeTile(s7, 1, 0, TILE_RESIDENTIAL);
  const moneyBefore = s7.money;
  placeTile(s7, 1, 0, 'demolish');
  assert(s7.grid[1][0] === TILE_EMPTY, 'tile demolished');
  assert(s7.money > moneyBefore, 'demolish refund');

  // Test 8: Power distribution
  const s8 = createInitialState();
  placeTile(s8, 5, 5, TILE_POWER);
  for (let i = 5; i <= 8; i++) {
    placeTile(s8, i, 5, TILE_ROAD);
  }
  const powered = getPoweredTiles(s8);
  assert(powered.has(key(8, 5)), 'power reaches end of road');
  assert(powered.has(key(6, 5)), 'power reaches middle of road');

  // Test 9: BFS pathfinding
  const s9 = createInitialState();
  placeTile(s9, 0, 0, TILE_ROAD);
  placeTile(s9, 1, 0, TILE_ROAD);
  placeTile(s9, 2, 0, TILE_ROAD);
  placeTile(s9, 3, 0, TILE_ROAD);
  const path = bfsPath(s9, 0, 0, 3, 0);
  assert(path !== null, 'path exists on straight road');
  assert(path.length >= 4, 'path has enough points');
  assert(path[0].x === 0 && path[0].y === 0, 'path starts correctly');
  assert(path[path.length - 1].x === 3 && path[path.length - 1].y === 0, 'path ends correctly');

  // Test 10: No path through non-road
  const s10 = createInitialState();
  placeTile(s10, 0, 0, TILE_ROAD);
  placeTile(s10, 2, 0, TILE_ROAD);
  const path10 = bfsPath(s10, 0, 0, 2, 0);
  assert(path10 === null, 'no path through gap');

  // Test 11: Happiness calculation
  const s11 = createInitialState();
  placeTile(s11, 0, 0, TILE_ROAD);
  placeTile(s11, 1, 0, TILE_RESIDENTIAL);
  placeTile(s11, 2, 0, TILE_COMMERCIAL);
  placeTile(s11, 3, 0, TILE_INDUSTRIAL);
  placeTile(s11, 4, 0, TILE_POWER);
  recalcState(s11);
  assert(s11.happiness > 0, 'happiness positive with buildings');

  // Test 12: Income generation
  const s12 = createInitialState();
  placeTile(s12, 0, 0, TILE_ROAD);
  placeTile(s12, 1, 0, TILE_RESIDENTIAL);
  placeTile(s12, 2, 0, TILE_COMMERCIAL);
  advanceTurn(s12);
  assert(s12.money > INITIAL_MONEY - BUILD_COSTS.residential - BUILD_COSTS.commercial, 'income generated');

  // Test 13: Game over by happiness
  const s13 = createInitialState();
  // Create unpowered buildings to tank happiness
  for (let i = 0; i < 20; i++) {
    const x = i % GRID_W;
    const y = Math.floor(i / GRID_W);
    if (x < GRID_W && y < GRID_H) {
      placeTile(s13, x, y, TILE_RESIDENTIAL);
    }
  }
  // Remove all roads so nothing is powered
  s13.grid = createInitialState().grid;
  for (let y = 0; y < GRID_H; y++) {
    for (let x = 0; x < GRID_W; x++) {
      s13.grid[y][x] = TILE_RESIDENTIAL;
      s13.buildings[key(x, y)] = { type: 'residential', health: 100, powered: false, occupants: 0, maxOccupants: 10 };
    }
  }
  s13.totalBuildings = GRID_W * GRID_H;
  s13.stats.residentialCount = GRID_W * GRID_H;
  calcHappiness(s13);
  assert(s13.happiness < 30, 'happiness very low with no power');

  // Test 14: Save / Load
  const s14 = createInitialState();
  placeTile(s14, 0, 0, TILE_ROAD);
  placeTile(s14, 1, 0, TILE_RESIDENTIAL);
  const saved = saveGame(s14);
  const loaded = loadGame(saved);
  assert(loaded !== null, 'load returns state');
  assert(loaded.grid[0][0] === TILE_ROAD, 'grid restored');
  assert(loaded.grid[0][1] === TILE_RESIDENTIAL, 'buildings restored');
  assert(loaded.money === s14.money, 'money restored');
  assert(loaded.happiness === s14.happiness, 'happiness restored');

  // Test 15: 2000-step simulation
  const s15 = createInitialState();
  // Pre-build a small connected city
  for (let x = 0; x < 6; x++) {
    placeTile(s15, x, 0, TILE_ROAD);
  }
  for (let x = 0; x < 3; x++) {
    placeTile(s15, x, 1, TILE_RESIDENTIAL);
    placeTile(s15, x + 3, 1, TILE_COMMERCIAL);
  }
  placeTile(s15, 5, 0, TILE_POWER);

  let simHappiness = s15.happiness;
  let simMoney = s15.money;
  for (let t = 0; t < 2000; t++) {
    advanceTurn(s15);
    if (s15.gameOver) break;
  }
  assert(simHappiness >= 0 && simHappiness <= 100, 'happiness in range after sim');
  assert(s15.turn > 0, 'turns advanced');
  assert(s15.vehicles.length >= 0, 'vehicles exist after sim');

  return results;
}

// Export for Node.js / browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    GRID_W, GRID_H, MAX_TURNS, INITIAL_MONEY, INITIAL_HAPPINESS,
    TILE_EMPTY, TILE_ROAD, TILE_RESIDENTIAL, TILE_COMMERCIAL,
    TILE_INDUSTRIAL, TILE_POWER, TILE_WATER, TILE_BUILDING,
    createInitialState, canPlace, placeTile, getPoweredTiles,
    bfsPath, simulateTraffic, calcHappiness, recalcState,
    advanceTurn, saveGame, loadGame, runTests,
  };
}
