import { clientToLogical } from './game';

describe('clientToLogical', () => {
  const rect = { left: 100, top: 50, width: 960, height: 540 };

  it('maps page coordinates on the canvas to the 480x270 logical screen', () => {
    expect(clientToLogical(100, 50, rect)).toEqual({ x: 0, y: 0 });
    expect(clientToLogical(580, 320, rect)).toEqual({ x: 240, y: 135 });
  });

  it('follows the displayed size when the canvas is scaled down', () => {
    expect(clientToLogical(240, 135, { left: 0, top: 0, width: 480, height: 270 })).toEqual({ x: 240, y: 135 });
    expect(clientToLogical(120, 67.5, { left: 0, top: 0, width: 240, height: 135 })).toEqual({ x: 240, y: 135 });
  });

  it('clamps points outside the canvas (e.g. a drag that leaves it) to the screen', () => {
    expect(clientToLogical(0, 0, rect)).toEqual({ x: 0, y: 0 });
    expect(clientToLogical(5000, 5000, rect)).toEqual({ x: 479, y: 269 });
  });
});
