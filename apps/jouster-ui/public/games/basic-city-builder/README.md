# Basic City Builder

A turn-based city builder simulation game built with plain HTML, CSS, and JavaScript. No frameworks, no dependencies, no internet connection required.

## How to Play

1. Open `index.html` in a web browser
2. Select a building type from the right panel
3. Click on the grid to place buildings
4. Click the "Next Day" button to advance time and collect income
5. Click existing buildings (or right-click) to remove them

## Win Condition

Reach **100 population** to win.

## Lose Condition

Go **bankrupt for 5 consecutive days** to lose.

## Buildings

| Building | Cost | Population | Income | Requirements |
|---|---|---|---|---|
| Road | $10 | 0 | $0 | None |
| Residential | $100 | +10 | +$5/day | Must be adjacent to a road |
| Commercial | $200 | 0 | +$15/day | None (half income without road) |
| Industrial | $300 | +5 | +$20/day | None |
| Park | $50 | +2 | $0 | None |
| Town Hall | $500 | +20 | $0 | None |

## Tips

- Build roads first to enable Residential construction
- Commercial buildings earn half income if not adjacent to a road
- Mix building types for balanced growth
- Remove buildings to get half the cost back
- Plan your layout efficiently to maximize income

## Files

- `index.html` - Game UI and styling
- `logic.js` - Pure game state functions
- `main.js` - Canvas rendering and interaction
- `test.js` - Unit tests (run with `node test.js`)
- `ROADMAP.md` - Feature roadmap
