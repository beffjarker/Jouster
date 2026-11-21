# City Builder & Traffic

A complete offline city-building and traffic simulation game built with plain HTML, CSS, and JavaScript.

## Features

- **12×10 grid** city builder with placement of roads, residential, commercial, and industrial zones
- **Power & water utilities** - place power plants and water towers that affect city happiness
- **BFS traffic simulation** - vehicles spawn from buildings, find paths via BFS, and navigate roads with congestion
- **Happiness system** - affected by power coverage, building balance, congestion, water access, and overcrowding
- **Win/lose states** - win by reaching 80% happiness by turn 200; lose if happiness drops to 0
- **Turn-based economy** - earn income from buildings, spend on construction, demolish for partial refund
- **Save/load** via localStorage
- **Phone-responsive** canvas with touch support
- **Zero dependencies** - runs completely offline, no frameworks or CDNs

## How to Play

1. **Build roads first** - all other structures need adjacent road access
2. **Add buildings** - residential (homes), commercial (shops), industrial (factories)
3. **Provide utilities** - power plants and water towers boost happiness
4. **Balance your city** - too many of one type reduces happiness
5. **Watch traffic** - congestion reduces happiness; plan road networks wisely

### Controls

| Action | Key |
|--------|-----|
| Select tool | Click toolbar or press R/H/S/I/P/W/D |
| Pause/Play | Space |
| Save | Ctrl+S |

### Tools

| Tool | Cost | Description |
|------|------|-------------|
| 🛣️ Road | $10 | Connect buildings (required for placement) |
| 🏠 Home | $50 | Residential zone - generates population |
| 🏪 Shop | $75 | Commercial zone - high income |
| 🏭 Factory | $100 | Industrial zone - moderate income |
| ⚡ Power | $200 | Power plant - extends power along roads |
| 💧 Water | $150 | Water tower - boosts nearby happiness |
| 🔨 Demolish | -$5 | Remove a tile (partial refund) |

## Technical Details

- **Pure vanilla JS** - no frameworks, no build step, no network requests
- **BFS pathfinding** for vehicle routing on road networks
- **Canvas rendering** with smooth vehicle animation
- **localStorage** persistence for save/load
- **Responsive design** adapts to phone screens

## Files

- `index.html` - Game shell and layout
- `logic.js` - Pure game state, simulation, and test suite
- `main.js` - Canvas rendering, input handling, game loop
- `style.css` - All styling
- `test.js` - Test runner (2000-step simulation)
- `README.md` - This file
- `ROADMAP.md` - Future development plans

## Running Tests

**Node.js:**
```bash
node test.js
```

**Browser:** Open `index.html` and run `runAllTests()` in the console.

## Offline

Copy the entire `city-builder-traffic/` folder to any device. Open `index.html` in a browser. Works 100% offline.
