// Unit tests for logic.js - run with Node.js
// Usage: node test.js

const assert = require('assert');
const logic = require('./logic.js');

const {
    GRID_SIZE,
    WIN_POPULATION,
    LOSE_DAYS,
    BUILDINGS,
    createInitialState,
    getAdjacentCells,
    hasRoadAdjacent,
    calculateIncome,
    calculatePopulation,
    canPlaceBuilding,
    placeBuilding,
    nextDay,
    removeBuilding,
    checkWinCondition,
    checkLoseCondition,
} = logic;

let passed = 0;
let failed = 0;

function test(name, fn) {
    try {
        fn();
        console.log(`  ✓ ${name}`);
        passed++;
    } catch (e) {
        console.log(`  ✗ ${name}`);
        console.log(`    ${e.message}`);
        failed++;
    }
}

console.log('Testing GRID_SIZE...');
test('GRID_SIZE should be 8', () => {
    assert.strictEqual(GRID_SIZE, 8);
});

console.log('Testing WIN_POPULATION...');
test('WIN_POPULATION should be 100', () => {
    assert.strictEqual(WIN_POPULATION, 100);
});

console.log('Testing LOSE_DAYS...');
test('LOSE_DAYS should be 5', () => {
    assert.strictEqual(LOSE_DAYS, 5);
});

console.log('Testing BUILDINGS config...');
test('Should have 6 building types', () => {
    assert.strictEqual(Object.keys(BUILDINGS).length, 6);
});

test('Road should cost $10', () => {
    assert.strictEqual(BUILDINGS.road.cost, 10);
});

test('Residential should give +10 pop', () => {
    assert.strictEqual(BUILDINGS.residential.pop, 10);
});

test('Commercial should give $15/day income', () => {
    assert.strictEqual(BUILDINGS.commercial.income, 15);
});

console.log('Testing createInitialState...');
test('Should return initial state with $1000', () => {
    const state = createInitialState();
    assert.strictEqual(state.money, 1000);
});

test('Should start with empty grid', () => {
    const state = createInitialState();
    for (let i = 0; i < GRID_SIZE; i++) {
        for (let j = 0; j < GRID_SIZE; j++) {
            assert.strictEqual(state.grid[i][j], null);
        }
    }
});

test('Should start with 0 population', () => {
    const state = createInitialState();
    assert.strictEqual(state.population, 0);
});

test('Should start on day 1', () => {
    const state = createInitialState();
    assert.strictEqual(state.day, 1);
});

test('Should not be game over initially', () => {
    const state = createInitialState();
    assert.strictEqual(state.gameOver, false);
});

console.log('Testing getAdjacentCells...');
test('Corner cell should have 2 adjacent cells', () => {
    const adj = getAdjacentCells(0, 0);
    assert.strictEqual(adj.length, 2);
});

test('Edge cell should have 3 adjacent cells', () => {
    const adj = getAdjacentCells(0, 1);
    assert.strictEqual(adj.length, 3);
});

test('Center cell should have 4 adjacent cells', () => {
    const adj = getAdjacentCells(3, 3);
    assert.strictEqual(adj.length, 4);
});

console.log('Testing hasRoadAdjacent...');
test('Should return true when road is adjacent', () => {
    const grid = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null));
    grid[0][1] = 'road';
    assert.strictEqual(hasRoadAdjacent(grid, 0, 0), true);
});

test('Should return false when no road is adjacent', () => {
    const grid = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null));
    grid[0][2] = 'road';
    assert.strictEqual(hasRoadAdjacent(grid, 0, 0), false);
});

console.log('Testing calculateIncome...');
test('Empty grid should have 0 income', () => {
    const grid = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null));
    assert.strictEqual(calculateIncome(grid), 0);
});

test('One residential should give $5/day', () => {
    const grid = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null));
    grid[0][0] = 'residential';
    grid[0][1] = 'road';
    assert.strictEqual(calculateIncome(grid), 5);
});

test('One commercial on road should give $15/day', () => {
    const grid = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null));
    grid[0][0] = 'commercial';
    grid[0][1] = 'road';
    assert.strictEqual(calculateIncome(grid), 15);
});

test('One commercial not on road should give $7/day (half)', () => {
    const grid = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null));
    grid[0][0] = 'commercial';
    grid[2][0] = 'road';
    assert.strictEqual(calculateIncome(grid), 7);
});

console.log('Testing calculatePopulation...');
test('Empty grid should have 0 population', () => {
    const grid = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null));
    assert.strictEqual(calculatePopulation(grid), 0);
});

test('One residential should give +10 pop', () => {
    const grid = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null));
    grid[0][0] = 'residential';
    assert.strictEqual(calculatePopulation(grid), 10);
});

test('One residential + one park should give +12 pop', () => {
    const grid = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null));
    grid[0][0] = 'residential';
    grid[0][1] = 'park';
    assert.strictEqual(calculatePopulation(grid), 12);
});

console.log('Testing canPlaceBuilding...');
test('Should allow placing on empty cell with road adjacent', () => {
    const grid = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null));
    grid[0][1] = 'road';
    assert.strictEqual(canPlaceBuilding(grid, 0, 0, 'residential'), true);
});

test('Should not allow placing on occupied cell', () => {
    const grid = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null));
    grid[0][0] = 'road';
    assert.strictEqual(canPlaceBuilding(grid, 0, 0, 'residential'), false);
});

test('Should not allow residential without road adjacent', () => {
    const grid = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null));
    assert.strictEqual(canPlaceBuilding(grid, 0, 0, 'residential'), false);
});

test('Should allow road without requirements', () => {
    const grid = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null));
    assert.strictEqual(canPlaceBuilding(grid, 0, 0, 'road'), true);
});

console.log('Testing placeBuilding...');
test('Should place building and deduct cost', () => {
    let state = createInitialState();
    state.grid[0][1] = 'road'; // Add road first
    state = placeBuilding(state, 0, 0, 'residential');
    assert.strictEqual(state.grid[0][0], 'residential');
    assert.strictEqual(state.money, 900);
});

test('Should not place if insufficient funds', () => {
    let state = createInitialState();
    state.money = 50;
    state.grid[0][1] = 'road';
    state = placeBuilding(state, 0, 0, 'residential');
    assert.strictEqual(state.grid[0][0], null);
    assert.strictEqual(state.money, 50);
});

test('Should not modify original state', () => {
    const state = createInitialState();
    state.grid[0][1] = 'road';
    const newState = placeBuilding(state, 0, 0, 'residential');
    assert.strictEqual(state.grid[0][0], null);
    assert.strictEqual(newState.grid[0][0], 'residential');
});

console.log('Testing nextDay...');
test('Should increment day', () => {
    const state = createInitialState();
    const newState = nextDay(state);
    assert.strictEqual(newState.day, 2);
});

test('Should add income to money', () => {
    let state = createInitialState();
    state.grid[0][0] = 'road';
    state.grid[0][1] = 'residential';
    const newState = nextDay(state);
    assert.strictEqual(newState.money, 1005);
});

test('Should not trigger game over on first day', () => {
    const state = createInitialState();
    state.money = -100;
    const newState = nextDay(state);
    assert.strictEqual(newState.gameOver, false);
});

console.log('Testing removeBuilding...');
test('Should remove building and refund half cost', () => {
    let state = createInitialState();
    state.grid[0][0] = 'residential';
    state.money = 900;
    const newState = removeBuilding(state, 0, 0);
    assert.strictEqual(newState.grid[0][0], null);
    assert.strictEqual(newState.money, 950);
});

test('Should not remove from empty cell', () => {
    const state = createInitialState();
    const newState = removeBuilding(state, 0, 0);
    assert.strictEqual(newState.grid[0][0], null);
    assert.strictEqual(newState.money, 1000);
});

console.log('Testing checkWinCondition...');
test('Should return true when population >= 100', () => {
    const grid = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null));
    // 10 residential buildings = 100 pop
    for (let i = 0; i < 10; i++) {
        grid[0][i % GRID_SIZE] = 'residential';
    }
    assert.strictEqual(checkWinCondition({ population: 100 }), true);
});

test('Should return false when population < 100', () => {
    assert.strictEqual(checkWinCondition({ population: 99 }), false);
});

console.log('Testing checkLoseCondition...');
test('Should return true when bankruptDays >= 5', () => {
    assert.strictEqual(checkLoseCondition({ bankruptDays: 5 }), true);
});

test('Should return false when bankruptDays < 5', () => {
    assert.strictEqual(checkLoseCondition({ bankruptDays: 4 }), false);
});

console.log('Testing full game scenario...');
test('Should reach win condition with enough residential buildings', () => {
    let state = createInitialState();
    // Place roads and residential buildings
    for (let i = 0; i < GRID_SIZE; i++) {
        state.grid[0][i] = 'road';
    }
    for (let row = 1; row < GRID_SIZE; row++) {
        for (let col = 0; col < GRID_SIZE; col++) {
            if (state.money >= BUILDINGS.residential.cost) {
                state = placeBuilding(state, row, col, 'residential');
            }
        }
    }
    assert.strictEqual(state.population, 640);
    assert.strictEqual(checkWinCondition(state), true);
});

// Print summary
console.log('\n========================================');
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log('========================================');

if (failed > 0) {
    process.exit(1);
}
