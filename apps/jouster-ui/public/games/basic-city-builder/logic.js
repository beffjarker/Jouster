// Game logic - pure functions, no DOM dependencies

const GRID_SIZE = 8;
const WIN_POPULATION = 100;
const LOSE_DAYS = 5;

const BUILDINGS = {
    road: { name: 'Road', cost: 10, pop: 0, income: 0, color: '#7f8c8d' },
    residential: { name: 'Residential', cost: 100, pop: 10, income: 5, color: '#3498db' },
    commercial: { name: 'Commercial', cost: 200, pop: 0, income: 15, color: '#9b59b6' },
    industrial: { name: 'Industrial', cost: 300, pop: 5, income: 20, color: '#e67e22' },
    park: { name: 'Park', cost: 50, pop: 2, income: 0, color: '#2ecc71' },
    town_hall: { name: 'Town Hall', cost: 500, pop: 20, income: 0, color: '#f1c40f' },
};

function createInitialState() {
    const grid = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null));
    return {
        grid,
        money: 1000,
        population: 0,
        day: 1,
        bankruptDays: 0,
        gameOver: false,
        winner: null,
    };
}

function getAdjacentCells(row, col) {
    const adjacent = [];
    if (row > 0) adjacent.push([row - 1, col]);
    if (row < GRID_SIZE - 1) adjacent.push([row + 1, col]);
    if (col > 0) adjacent.push([row, col - 1]);
    if (col < GRID_SIZE - 1) adjacent.push([row, col + 1]);
    return adjacent;
}

function hasRoadAdjacent(grid, row, col) {
    const adjacent = getAdjacentCells(row, col);
    return adjacent.some(([r, c]) => grid[r][c] === 'road');
}

function calculateIncome(grid) {
    let income = 0;
    for (let row = 0; row < GRID_SIZE; row++) {
        for (let col = 0; col < GRID_SIZE; col++) {
            const building = grid[row][col];
            if (building && BUILDINGS[building]) {
                const b = BUILDINGS[building];
                // Commercial buildings need road adjacency for full income
                if (building === 'commercial' && !hasRoadAdjacent(grid, row, col)) {
                    income += Math.floor(b.income / 2);
                } else {
                    income += b.income;
                }
            }
        }
    }
    return income;
}

function calculatePopulation(grid) {
    let pop = 0;
    for (let row = 0; row < GRID_SIZE; row++) {
        for (let col = 0; col < GRID_SIZE; col++) {
            const building = grid[row][col];
            if (building && BUILDINGS[building]) {
                pop += BUILDINGS[building].pop;
            }
        }
    }
    return pop;
}

function canPlaceBuilding(grid, row, col, buildingType) {
    if (row < 0 || row >= GRID_SIZE || col < 0 || col >= GRID_SIZE) return false;
    if (grid[row][col] !== null) return false;
    if (buildingType === 'residential' && !hasRoadAdjacent(grid, row, col)) return false;
    return true;
}

function placeBuilding(state, row, col, buildingType) {
    if (state.gameOver) return state;
    if (!canPlaceBuilding(state.grid, row, col, buildingType)) return state;

    const newState = {
        ...state,
        grid: state.grid.map(row => [...row]),
    };

    newState.grid[row][col] = buildingType;
    newState.money -= BUILDINGS[buildingType].cost;

    return newState;
}

function nextDay(state) {
    if (state.gameOver) return state;

    const newState = {
        ...state,
        day: state.day + 1,
        grid: state.grid.map(row => [...row]),
    };

    const income = calculateIncome(newState.grid);
    newState.money += income;
    newState.population = calculatePopulation(newState.grid);

    // Check lose condition
    if (newState.money < 0) {
        newState.bankruptDays = state.bankruptDays + 1;
        if (newState.bankruptDays >= LOSE_DAYS) {
            newState.gameOver = true;
            newState.winner = 'lose';
            return newState;
        }
    } else {
        newState.bankruptDays = 0;
    }

    // Check win condition
    if (newState.population >= WIN_POPULATION) {
        newState.gameOver = true;
        newState.winner = 'win';
        return newState;
    }

    return newState;
}

function removeBuilding(state, row, col) {
    if (state.gameOver) return state;
    const building = state.grid[row][col];
    if (!building) return state;

    const newState = {
        ...state,
        grid: state.grid.map(row => [...row]),
    };

    // Refund half the cost
    const refund = Math.floor(BUILDINGS[building].cost / 2);
    newState.money += refund;
    newState.grid[row][col] = null;

    return newState;
}

function checkWinCondition(state) {
    return state.population >= WIN_POPULATION;
}

function checkLoseCondition(state) {
    return state.bankruptDays >= LOSE_DAYS;
}

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
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
    };
}
