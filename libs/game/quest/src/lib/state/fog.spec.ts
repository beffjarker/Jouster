import { FOG_RADIUS, exploredRatio, inSight, isExplored, revealAround } from './fog';
import { newGameState } from './game-state';

describe('fog of war', () => {
  it('uses a rounded circle for sight', () => {
    expect(inSight(0, 0, FOG_RADIUS)).toBe(true);
    expect(inSight(FOG_RADIUS, 0, FOG_RADIUS)).toBe(true);
    expect(inSight(FOG_RADIUS + 1, 0, FOG_RADIUS)).toBe(false);
    expect(inSight(FOG_RADIUS, FOG_RADIUS, FOG_RADIUS)).toBe(false);
  });

  it('reveals tiles around a point and reports when something new was seen', () => {
    const state = newGameState('TEST', 'warrior');
    expect(isExplored(state.explored['m'], 40, 10, 10)).toBe(false);
    expect(revealAround(state, 'm', 40, 30, 10, 10, 3)).toBe(true);
    expect(isExplored(state.explored['m'], 40, 10, 10)).toBe(true);
    expect(isExplored(state.explored['m'], 40, 13, 10)).toBe(true);
    expect(isExplored(state.explored['m'], 40, 14, 10)).toBe(false);
    expect(revealAround(state, 'm', 40, 30, 10, 10, 3)).toBe(false);
  });

  it('clips at map edges and stays JSON friendly', () => {
    const state = newGameState('TEST', 'warrior');
    revealAround(state, 'm', 33, 5, 0, 0, 4);
    revealAround(state, 'm', 33, 5, 32, 4, 4);
    expect(isExplored(state.explored['m'], 33, 0, 0)).toBe(true);
    expect(isExplored(state.explored['m'], 33, 32, 4)).toBe(true);
    expect(isExplored(state.explored['m'], 33, -1, 0)).toBe(false);
    expect(isExplored(state.explored['m'], 33, 33, 0)).toBe(false);
    const copy = JSON.parse(JSON.stringify(state.explored)) as Record<string, number[]>;
    expect(isExplored(copy['m'], 33, 32, 4)).toBe(true);
  });

  it('measures the explored ratio', () => {
    const state = newGameState('TEST', 'warrior');
    expect(exploredRatio(state.explored['m'], 10, 10)).toBe(0);
    revealAround(state, 'm', 10, 10, 5, 5, 20);
    expect(exploredRatio(state.explored['m'], 10, 10)).toBe(1);
  });
});
