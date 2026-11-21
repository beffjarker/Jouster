// ============================================================================
// City Builder & Traffic - Test Runner
// ============================================================================

// Import logic functions (works in both Node.js and browser)
let {
  GRID_W, GRID_H, MAX_TURNS, INITIAL_MONEY, INITIAL_HAPPINESS,
  createInitialState, canPlace, placeTile, getPoweredTiles,
  bfsPath, simulateTraffic, calcHappiness, recalcState,
  advanceTurn, saveGame, loadGame, runTests,
  TILE_EMPTY, TILE_ROAD, TILE_RESIDENTIAL, TILE_COMMERCIAL,
  TILE_INDUSTRIAL, TILE_POWER, TILE_WATER, TILE_BUILDING,
} = typeof module !== 'undefined' && module.exports ?
  require('./logic.js') :
  {
    GRID_W: window.GRID_W, GRID_H: window.GRID_H,
    MAX_TURNS: window.MAX_TURNS,
    INITIAL_MONEY: window.INITIAL_MONEY,
    INITIAL_HAPPINESS: window.INITIAL_HAPPINESS,
    createInitialState: window.createInitialState,
    canPlace: window.canPlace,
    placeTile: window.placeTile,
    getPoweredTiles: window.getPoweredTiles,
    bfsPath: window.bfsPath,
    simulateTraffic: window.simulateTraffic,
    calcHappiness: window.calcHappiness,
    recalcState: window.recalcState,
    advanceTurn: window.advanceTurn,
    saveGame: window.saveGame,
    loadGame: window.loadGame,
    runTests: window.runTests,
    TILE_EMPTY: window.TILE_EMPTY,
    TILE_ROAD: window.TILE_ROAD,
    TILE_RESIDENTIAL: window.TILE_RESIDENTIAL,
    TILE_COMMERCIAL: window.TILE_COMMERCIAL,
    TILE_INDUSTRIAL: window.TILE_INDUSTRIAL,
    TILE_POWER: window.TILE_POWER,
    TILE_WATER: window.TILE_WATER,
    TILE_BUILDING: window.TILE_BUILDING,
  };

// --- Test Runner ---
function runAllTests() {
  console.log('=== City Builder & Traffic - Test Suite ===\n');

  // Run the built-in test suite from logic.js
  const results = runTests();

  // Print results
  console.log(`Results: ${results.passed} passed, ${results.failed} failed\n`);

  for (const test of results.tests) {
    const icon = test.result === 'PASS' ? '✓' : '✗';
    console.log(`  ${icon} ${test.name}`);
  }

  if (results.failed > 0) {
    console.log('\n❌ Some tests failed!');
    return false;
  } else {
    console.log('\n✅ All tests passed!');
    return true;
  }
}

// Run in Node.js
if (typeof module !== 'undefined' && module.exports) {
  const passed = runAllTests();
  process.exit(passed ? 0 : 1);
}

// Run in browser (exposed globally)
if (typeof window !== 'undefined') {
  window.runAllTests = runAllTests;
}
