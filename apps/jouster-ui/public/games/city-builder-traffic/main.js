// ============================================================================
// City Builder & Traffic - Main Game Controller (canvas rendering, input, UI)
// ============================================================================

(function() {
  'use strict';

  // --- DOM Elements ---
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  const moneyEl = document.getElementById('money');
  const happinessEl = document.getElementById('happiness');
  const turnEl = document.getElementById('turn');
  const populationEl = document.getElementById('population');
  const messageEl = document.getElementById('message');
  const toolbarEl = document.getElementById('toolbar');
  const saveBtn = document.getElementById('saveBtn');
  const loadBtn = document.getElementById('loadBtn');
  const resetBtn = document.getElementById('resetBtn');
  const pauseBtn = document.getElementById('pauseBtn');
  const speedBtn = document.getElementById('speedBtn');
  const statsPanel = document.getElementById('statsPanel');

  // --- Constants ---
  const TILE_SIZE = 48;
  const COLORS = {
    empty: '#1a1a2e',
    road: '#4a4a5a',
    residential: '#2d6a4f',
    commercial: '#e07a5f',
    industrial: '#81b29a',
    power: '#f2cc8f',
    water: '#4895ef',
    building: '#3d405b',
    highlight: 'rgba(255, 255, 255, 0.2)',
    congestion: 'rgba(239, 83, 80, 0.4)',
    powerLine: 'rgba(242, 204, 143, 0.3)',
    grid: 'rgba(255, 255, 255, 0.05)',
    text: '#f0f0f0',
    toolbar: '#2d3047',
    toolbarActive: '#4a4e69',
    toolbarHover: '#3d405b',
  };

  // --- Game State ---
  let state = null;
  let paused = false;
  let gameSpeed = 1; // 0.5, 1, 2
  let selectedTool = 'road';
  let mouseX = -1, mouseY = -1;
  let lastTick = 0;
  let tickInterval = 500; // ms per turn
  let animationId = null;
  let vehicleAnimProgress = 0;

  // --- Initialize ---
  function init() {
    loadGameState();
    if (!state) {
      state = createInitialState();
    }
    resizeCanvas();
    setupToolbar();
    setupEvents();
    setupKeyboard();
    messageEl.textContent = 'Build roads first, then add buildings!';
    updateUI();
    gameLoop(0);
  }

  // --- Canvas Resize ---
  function resizeCanvas() {
    const container = canvas.parentElement;
    const maxWidth = Math.min(container.clientWidth - 20, GRID_W * TILE_SIZE);
    const maxHeight = window.innerHeight - 200;
    const scale = Math.min(maxWidth / (GRID_W * TILE_SIZE), maxHeight / (GRID_H * TILE_SIZE), 1.5);

    canvas.width = GRID_W * TILE_SIZE * scale;
    canvas.height = GRID_H * TILE_SIZE * scale;
    canvas.style.width = canvas.width + 'px';
    canvas.style.height = canvas.height + 'px';
    ctx.scale(scale, scale);
  }

  // --- Toolbar ---
  function setupToolbar() {
    const tools = [
      { id: 'road', label: '🛣️ Road', cost: BUILD_COSTS.road },
      { id: 'residential', label: '🏠 Home', cost: BUILD_COSTS.residential },
      { id: 'commercial', label: '🏪 Shop', cost: BUILD_COSTS.commercial },
      { id: 'industrial', label: '🏭 Factory', cost: BUILD_COSTS.industrial },
      { id: 'power', label: '⚡ Power', cost: BUILD_COSTS.power },
      { id: 'water', label: '💧 Water', cost: BUILD_COSTS.water },
      { id: 'demolish', label: '🔨 Demo', cost: BUILD_COSTS.demolish },
    ];

    toolbarEl.innerHTML = '';
    for (const tool of tools) {
      const btn = document.createElement('button');
      btn.className = 'tool-btn' + (tool.id === selectedTool ? ' active' : '');
      btn.dataset.tool = tool.id;
      btn.title = `${tool.label} - $${tool.cost}`;
      btn.textContent = `${tool.label} ($${tool.cost})`;
      btn.addEventListener('click', () => selectTool(tool.id));
      toolbarEl.appendChild(btn);
    }
  }

  function selectTool(tool) {
    selectedTool = tool;
    document.querySelectorAll('.tool-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tool === tool);
    });
  }

  // --- Events ---
  function setupEvents() {
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('click', onCanvasClick);
    canvas.addEventListener('mouseleave', () => { mouseX = -1; mouseY = -1; });
    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('resize', () => {
      resizeCanvas();
    });

    saveBtn.addEventListener('click', saveGameState);
    loadBtn.addEventListener('click', loadGameState);
    resetBtn.addEventListener('click', resetGame);
    pauseBtn.addEventListener('click', togglePause);
    speedBtn.addEventListener('click', cycleSpeed);
  }

  function getTileFromEvent(e) {
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width * GRID_W;
    const y = (e.clientY - rect.top) / rect.height * GRID_H;
    return { x: Math.floor(x), y: Math.floor(y) };
  }

  function onMouseMove(e) {
    const tile = getTileFromEvent(e);
    mouseX = tile.x;
    mouseY = tile.y;
  }

  function onCanvasClick(e) {
    const tile = getTileFromEvent(e);
    if (tile.x < 0 || tile.x >= GRID_W || tile.y < 0 || tile.y >= GRID_H) return;
    if (state.gameOver) {
      messageEl.textContent = 'Game over! Reset to play again.';
      return;
    }
    const result = placeTile(state, tile.x, tile.y, selectedTool);
    if (result.success) {
      updateUI();
      messageEl.textContent = '';
    } else {
      messageEl.textContent = result.error;
      setTimeout(() => { messageEl.textContent = ''; }, 2000);
    }
  }

  function onTouchStart(e) {
    e.preventDefault();
    if (e.touches.length > 0) {
      const touch = e.touches[0];
      const fakeEvent = { clientX: touch.clientX, clientY: touch.clientY };
      onCanvasClick(fakeEvent);
    }
  }

  function onTouchMove(e) {
    e.preventDefault();
    if (e.touches.length > 0) {
      const touch = e.touches[0];
      const fakeEvent = { clientX: touch.clientX, clientY: touch.clientY };
      const rect = canvas.getBoundingClientRect();
      const x = (fakeEvent.clientX - rect.left) / rect.width * GRID_W;
      const y = (fakeEvent.clientY - rect.top) / rect.height * GRID_H;
      mouseX = Math.floor(x);
      mouseY = Math.floor(y);
    }
  }

  function setupKeyboard() {
    document.addEventListener('keydown', (e) => {
      if (e.key === ' ') {
        e.preventDefault();
        togglePause();
      } else if (e.key === 'r' || e.key === 'R') {
        selectTool('road');
      } else if (e.key === 'h' || e.key === 'H') {
        selectTool('residential');
      } else if (e.key === 's' || e.key === 'S') {
        selectTool('commercial');
      } else if (e.key === 'i' || e.key === 'I') {
        selectTool('industrial');
      } else if (e.key === 'p' || e.key === 'P') {
        selectTool('power');
      } else if (e.key === 'w' || e.key === 'W') {
        selectTool('water');
      } else if (e.key === 'd' || e.key === 'D') {
        selectTool('demolish');
      } else if (e.key === 's' && e.ctrlKey) {
        e.preventDefault();
        saveGameState();
      }
    });
  }

  // --- Game Controls ---
  function togglePause() {
    paused = !paused;
    pauseBtn.textContent = paused ? '▶ Play' : '⏸ Pause';
  }

  function cycleSpeed() {
    const speeds = [0.5, 1, 2];
    const idx = speeds.indexOf(gameSpeed);
    gameSpeed = speeds[(idx + 1) % speeds.length];
    tickInterval = 500 / gameSpeed;
    speedBtn.textContent = `Speed: ${gameSpeed}x`;
  }

  function resetGame() {
    if (confirm('Start a new city? Current progress will be lost.')) {
      state = createInitialState();
      messageEl.textContent = 'New city started! Build roads first.';
      updateUI();
    }
  }

  // --- UI Update ---
  function updateUI() {
    moneyEl.textContent = `$${state.money}`;
    happinessEl.textContent = `${state.happiness}%`;
    turnEl.textContent = `${state.turn}/${MAX_TURNS}`;
    populationEl.textContent = state.totalPopulation;

    // Color happiness
    if (state.happiness >= 70) {
      happinessEl.style.color = '#4caf50';
    } else if (state.happiness >= 40) {
      happinessEl.style.color = '#ff9800';
    } else {
      happinessEl.style.color = '#f44336';
    }

    // Progress bar
    const progress = (state.turn / MAX_TURNS) * 100;
    document.getElementById('progressBar').style.width = progress + '%';

    // Game over overlay
    const overlay = document.getElementById('gameOverOverlay');
    if (state.gameOver) {
      overlay.style.display = 'flex';
      document.getElementById('gameResult').textContent = state.gameWon ? '🎉 Victory!' : '💀 Defeat';
      document.getElementById('finalScore').textContent = `Happiness: ${state.happiness}% | Population: ${state.totalPopulation}`;
      document.getElementById('finalTurns').textContent = `Turns: ${state.turn}`;
    } else {
      overlay.style.display = 'none';
    }

    // Stats panel
    updateStats();
  }

  function updateStats() {
    const statsHtml = `
      <div class="stat-row"><span>Roads:</span><span>${state.totalRoads}</span></div>
      <div class="stat-row"><span>Buildings:</span><span>${state.totalBuildings}</span></div>
      <div class="stat-row"><span>Residential:</span><span>${state.stats.residentialCount}</span></div>
      <div class="stat-row"><span>Commercial:</span><span>${state.stats.commercialCount}</span></div>
      <div class="stat-row"><span>Industrial:</span><span>${state.stats.industrialCount}</span></div>
      <div class="stat-row"><span>Power Plants:</span><span>${state.stats.powerPlants}</span></div>
      <div class="stat-row"><span>Water Towers:</span><span>${state.stats.waterTowers}</span></div>
      <div class="stat-row"><span>Population:</span><span>${state.totalPopulation}</span></div>
      <div class="stat-row"><span>Vehicles:</span><span>${state.vehicles.length}</span></div>
    `;
    statsPanel.innerHTML = statsHtml;
  }

  // --- Save / Load ---
  function saveGameState() {
    const json = saveGame(state);
    localStorage.setItem('cityBuilderSave', json);
    messageEl.textContent = 'Game saved!';
    setTimeout(() => { messageEl.textContent = ''; }, 1500);
  }

  function loadGameState() {
    const json = localStorage.getItem('cityBuilderSave');
    if (json) {
      const loaded = loadGame(json);
      if (loaded) {
        state = loaded;
        return true;
      }
    }
    return false;
  }

  // --- Rendering ---
  function draw() {
    ctx.clearRect(0, 0, GRID_W * TILE_SIZE, GRID_H * TILE_SIZE);

    // Draw grid background
    for (let y = 0; y < GRID_H; y++) {
      for (let x = 0; x < GRID_W; x++) {
        const px = x * TILE_SIZE;
        const py = y * TILE_SIZE;
        ctx.fillStyle = COLORS.empty;
        ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);

        // Grid lines
        ctx.strokeStyle = COLORS.grid;
        ctx.strokeRect(px, py, TILE_SIZE, TILE_SIZE);
      }
    }

    // Draw power lines
    const powered = getPoweredTiles(state);
    ctx.strokeStyle = COLORS.powerLine;
    ctx.lineWidth = 2;
    for (const k of powered) {
      const [x, y] = k.split(',').map(Number);
      const px = x * TILE_SIZE + TILE_SIZE / 2;
      const py = y * TILE_SIZE + TILE_SIZE / 2;
      ctx.fillStyle = COLORS.powerLine;
      ctx.fillRect(px - 1, py - 1, 2, 2);
    }
    ctx.lineWidth = 1;

    // Draw tiles
    for (let y = 0; y < GRID_H; y++) {
      for (let x = 0; x < GRID_W; x++) {
        const tile = state.grid[y][x];
        if (tile === TILE_EMPTY) continue;

        const px = x * TILE_SIZE;
        const py = y * TILE_SIZE;

        // Tile color
        ctx.fillStyle = COLORS[tile] || COLORS.empty;
        ctx.fillRect(px + 1, py + 1, TILE_SIZE - 2, TILE_SIZE - 2);

        // Draw building on top
        const bKey = `${x},${y}`;
        const building = state.buildings[bKey];
        if (building) {
          drawBuilding(ctx, px, py, building);
        }

        // Draw power indicator
        if (building && building.powered) {
          ctx.fillStyle = '#f2cc8f';
          ctx.font = `${TILE_SIZE * 0.35}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('⚡', px + TILE_SIZE / 2, py + TILE_SIZE / 2 - TILE_SIZE * 0.15);
        }
      }
    }

    // Draw congestion overlay
    for (const k in state.congestionMap) {
      const [x, y] = k.split(',').map(Number);
      const congestion = state.congestionMap[k];
      if (congestion > 0.1) {
        const px = x * TILE_SIZE;
        const py = y * TILE_SIZE;
        ctx.fillStyle = COLORS.congestion;
        ctx.globalAlpha = congestion * 0.5;
        ctx.fillRect(px + 1, py + 1, TILE_SIZE - 2, TILE_SIZE - 2);
        ctx.globalAlpha = 1;
      }
    }

    // Draw vehicles
    for (const v of state.vehicles) {
      if (v.pathIndex >= v.path.length) continue;
      const curr = v.path[v.pathIndex];
      const next = v.pathIndex + 1 < v.path.length ? v.path[v.pathIndex + 1] : curr;

      const drawX = curr.x * TILE_SIZE + TILE_SIZE / 2 + (next.x - curr.x) * vehicleAnimProgress * TILE_SIZE;
      const drawY = curr.y * TILE_SIZE + TILE_SIZE / 2 + (next.y - curr.y) * vehicleAnimProgress * TILE_SIZE;

      ctx.fillStyle = v.type === 'truck' ? '#e07a5f' : '#4895ef';
      ctx.beginPath();
      ctx.arc(drawX, drawY, TILE_SIZE * 0.2, 0, Math.PI * 2);
      ctx.fill();

      // Vehicle glow
      ctx.fillStyle = v.type === 'truck' ? 'rgba(224, 122, 95, 0.3)' : 'rgba(72, 149, 239, 0.3)';
      ctx.beginPath();
      ctx.arc(drawX, drawY, TILE_SIZE * 0.3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw hover preview
    if (mouseX >= 0 && mouseX < GRID_W && mouseY >= 0 && mouseY < GRID_H) {
      const px = mouseX * TILE_SIZE;
      const py = mouseY * TILE_SIZE;
      const valid = canPlace(state, mouseX, mouseY, selectedTool);

      ctx.fillStyle = valid ? 'rgba(76, 175, 80, 0.3)' : 'rgba(244, 67, 54, 0.3)';
      ctx.fillRect(px + 1, py + 1, TILE_SIZE - 2, TILE_SIZE - 2);

      ctx.strokeStyle = valid ? '#4caf50' : '#f44336';
      ctx.lineWidth = 2;
      ctx.strokeRect(px + 1, py + 1, TILE_SIZE - 2, TILE_SIZE - 2);
      ctx.lineWidth = 1;

      // Preview icon
      ctx.font = `${TILE_SIZE * 0.5}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const icons = {
        road: '🛣️',
        residential: '🏠',
        commercial: '🏪',
        industrial: '🏭',
        power: '⚡',
        water: '💧',
        demolish: '🔨',
      };
      ctx.globalAlpha = 0.6;
      ctx.fillText(icons[selectedTool] || '?', px + TILE_SIZE / 2, py + TILE_SIZE / 2);
      ctx.globalAlpha = 1;
    }
  }

  function drawBuilding(ctx, px, py, building) {
    const cx = px + TILE_SIZE / 2;
    const cy = py + TILE_SIZE / 2;
    const size = TILE_SIZE * 0.35;

    ctx.font = `${TILE_SIZE * 0.45}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    let icon = '?';
    switch (building.type) {
      case TILE_RESIDENTIAL: icon = '🏠'; break;
      case TILE_COMMERCIAL: icon = '🏪'; break;
      case TILE_INDUSTRIAL: icon = '🏭'; break;
      case 'powerPlant': icon = '⚡'; break;
      case 'waterTower': icon = '💧'; break;
    }

    ctx.fillText(icon, cx, cy);

    // Health bar
    if (building.health < 100) {
      const barW = TILE_SIZE * 0.8;
      const barH = 4;
      const barX = px + (TILE_SIZE - barW) / 2;
      const barY = py + TILE_SIZE - 8;
      ctx.fillStyle = '#333';
      ctx.fillRect(barX, barY, barW, barH);
      ctx.fillStyle = building.health > 50 ? '#4caf50' : '#f44336';
      ctx.fillRect(barX, barY, barW * (building.health / 100), barH);
    }

    // Occupant count for residential
    if (building.type === TILE_RESIDENTIAL && building.occupants > 0) {
      ctx.fillStyle = '#f0f0f0';
      ctx.font = `${TILE_SIZE * 0.2}px sans-serif`;
      ctx.fillText(`👥${building.occupants}`, cx, py + TILE_SIZE * 0.2);
    }
  }

  // --- Game Loop ---
  function gameLoop(timestamp) {
    animationId = requestAnimationFrame(gameLoop);

    // Animate vehicles
    vehicleAnimProgress += 0.05;
    if (vehicleAnimProgress > 1) vehicleAnimProgress = 0;

    draw();

    // Advance game turn
    if (!paused && !state.gameOver) {
      if (timestamp - lastTick > tickInterval) {
        advanceTurn(state);
        updateUI();
        lastTick = timestamp;
      }
    }
  }

  // --- Start ---
  window.addEventListener('load', init);

})();
