// Main game script - Canvas rendering and UI interaction

const GRID_SIZE = 8;
const CELL_SIZE = 60;
const CANVAS_SIZE = GRID_SIZE * CELL_SIZE;

let gameState = null;
let selectedBuilding = null;
let canvas = null;
let ctx = null;

// Building color mapping
const BUILDING_COLORS = {
    road: '#7f8c8d',
    residential: '#3498db',
    commercial: '#9b59b6',
    industrial: '#e67e22',
    park: '#2ecc71',
    town_hall: '#f1c40f',
};

function init() {
    canvas = document.getElementById('game-canvas');
    ctx = canvas.getContext('2d');
    canvas.width = CANVAS_SIZE;
    canvas.height = CANVAS_SIZE;

    // Initialize game state
    gameState = createInitialState();

    // Set up event listeners
    setupBuildingSelector();
    setupCanvasInteraction();
    setupNextDayButton();
    setupRestartButton();

    // Initial render
    updateUI();
    drawGrid();
}

function setupBuildingSelector() {
    const buttons = document.querySelectorAll('.building-btn');
    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            buttons.forEach(b => b.classList.remove('selected'));
            if (selectedBuilding === btn.dataset.building) {
                selectedBuilding = null;
            } else {
                selectedBuilding = btn.dataset.building;
                btn.classList.add('selected');
            }
        });
    });
}

function setupCanvasInteraction() {
    canvas.addEventListener('click', (e) => {
        if (gameState.gameOver) return;

        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const col = Math.floor(x / CELL_SIZE);
        const row = Math.floor(y / CELL_SIZE);

        // Check if clicking on existing building (to remove)
        if (selectedBuilding === null && gameState.grid[row][col]) {
            gameState = removeBuilding(gameState, row, col);
            updateUI();
            drawGrid();
            return;
        }

        // Place building
        if (selectedBuilding) {
            if (canPlaceBuilding(gameState.grid, row, col, selectedBuilding)) {
                if (gameState.money >= BUILDINGS[selectedBuilding].cost) {
                    gameState = placeBuilding(gameState, row, col, selectedBuilding);
                    updateUI();
                    drawGrid();
                }
            }
        }
    });

    // Right-click to remove building
    canvas.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        if (gameState.gameOver) return;

        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const col = Math.floor(x / CELL_SIZE);
        const row = Math.floor(y / CELL_SIZE);

        if (gameState.grid[row][col]) {
            gameState = removeBuilding(gameState, row, col);
            updateUI();
            drawGrid();
        }
    });
}

function setupNextDayButton() {
    const btn = document.getElementById('next-day-btn');
    btn.addEventListener('click', () => {
        if (gameState.gameOver) return;

        gameState = nextDay(gameState);
        updateUI();
        drawGrid();

        if (gameState.gameOver) {
            showGameOver();
        }
    });
}

function setupRestartButton() {
    const btn = document.getElementById('restart-btn');
    btn.addEventListener('click', () => {
        document.getElementById('game-over').style.display = 'none';
        gameState = createInitialState();
        selectedBuilding = null;
        updateUI();
        drawGrid();
    });
}

function updateUI() {
    document.getElementById('money').textContent = `$${gameState.money}`;
    document.getElementById('population').textContent = gameState.population;
    document.getElementById('day').textContent = gameState.day;

    const income = calculateIncome(gameState.grid);
    const incomeEl = document.getElementById('income');
    incomeEl.textContent = `${income >= 0 ? '+' : ''}$${income}/day`;
    incomeEl.className = `value income ${income < 0 ? 'negative' : ''}`;
}

function drawGrid() {
    // Clear canvas
    ctx.fillStyle = '#27ae60';
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // Draw grid lines
    ctx.strokeStyle = '#2ecc71';
    ctx.lineWidth = 1;
    for (let i = 0; i <= GRID_SIZE; i++) {
        ctx.beginPath();
        ctx.moveTo(i * CELL_SIZE, 0);
        ctx.lineTo(i * CELL_SIZE, CANVAS_SIZE);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i * CELL_SIZE);
        ctx.lineTo(CANVAS_SIZE, i * CELL_SIZE);
        ctx.stroke();
    }

    // Draw buildings
    for (let row = 0; row < GRID_SIZE; row++) {
        for (let col = 0; col < GRID_SIZE; col++) {
            const building = gameState.grid[row][col];
            if (building) {
                const x = col * CELL_SIZE;
                const y = row * CELL_SIZE;
                ctx.fillStyle = BUILDING_COLORS[building];
                ctx.fillRect(x + 2, y + 2, CELL_SIZE - 4, CELL_SIZE - 4);

                // Draw building icon/text
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 12px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                const labels = {
                    road: 'R',
                    residential: 'H',
                    commercial: 'C',
                    industrial: 'I',
                    park: 'P',
                    town_hall: 'T',
                };
                ctx.fillText(labels[building], x + CELL_SIZE / 2, y + CELL_SIZE / 2);
            }
        }
    }

    // Draw hover highlight
    // (simplified - just show selected building preview)
    if (selectedBuilding) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(1, 1, CANVAS_SIZE - 2, CANVAS_SIZE - 2);
        ctx.setLineDash([]);
    }
}

function showGameOver() {
    const overlay = document.getElementById('game-over');
    const title = document.getElementById('game-over-title');
    const message = document.getElementById('game-over-message');

    if (gameState.winner === 'win') {
        title.textContent = 'You Win!';
        title.className = 'win';
        message.textContent = `Your city reached ${WIN_POPULATION} population on day ${gameState.day}!`;
    } else {
        title.textContent = 'Game Over';
        title.className = 'lose';
        message.textContent = `Your city went bankrupt for ${LOSE_DAYS} consecutive days.`;
    }

    overlay.style.display = 'flex';
}

// Start the game when the page loads
document.addEventListener('DOMContentLoaded', init);
