import { Battle, SceneStack, createRng } from '@jouster/game/engine';
import { Art } from '../art/art';
import { memoryStorage, newGameState } from '../state/game-state';
import { InputDriver } from '../testing/input-driver';
import { BattleEnd, BattleScene } from './battle-scene';
import { GameContext } from './context';
import { applyRestore, canRestore } from './menu-scenes';
import { memberStats } from '../state/party';

interface BattleInternals {
  phase: string;
  battle: Battle;
  spots: Map<string, { x: number; y: number; size: number }>;
  motions: Map<string, { kind: string }>;
  floaters: Array<{ text: string }>;
  gone: Set<string>;
}

function setup(): { scene: BattleScene; internals: BattleInternals; driver: InputDriver; onEnd: jest.Mock } {
  const ctx: GameContext = {
    stack: new SceneStack(),
    audio: { play: jest.fn(), toggleMute: jest.fn(), muted: false, dispose: jest.fn() } as never,
    art: {} as Art,
    rng: createRng(3),
    storage: memoryStorage(),
    state: newGameState('TEST', 'warrior'),
  };
  const onEnd = jest.fn<void, [BattleEnd]>();
  const scene = new BattleScene(ctx, { monsterIds: ['slime'], backdrop: 'field', onEnd });
  ctx.stack.push(scene);
  const driver = new InputDriver((dt, input) => ctx.stack.update(dt, input));
  return { scene, internals: scene as unknown as BattleInternals, driver, onEnd };
}

describe('BattleScene', () => {
  it('waits for the player to choose an action every round, even with a single enemy', () => {
    const { internals, driver } = setup();
    const enemy = internals.battle.enemies[0];
    const hero = internals.battle.party[0];
    enemy.hp = enemy.maxHp = 999;
    hero.hp = hero.maxHp = 999;

    driver.run(2);
    expect(internals.phase).toBe('command');
    driver.run(10);
    expect(internals.phase).toBe('command');
    expect(enemy.hp).toBe(999);

    driver.tap('confirm');
    expect(internals.phase).toBe('target');
    driver.tap('confirm');
    expect(internals.phase).toBe('events');

    driver.run(5);
    expect(internals.phase).toBe('command');
    const hpAfterRound = enemy.hp;
    expect(hpAfterRound).toBeLessThan(999);
    driver.run(10);
    expect(internals.phase).toBe('command');
    expect(enemy.hp).toBe(hpAfterRound);
  });

  it('ignores a confirm pressed right as the command menu reappears', () => {
    const { internals, driver } = setup();
    const enemy = internals.battle.enemies[0];
    enemy.hp = enemy.maxHp = 999;
    internals.battle.party[0].hp = 999;
    driver.run(2);
    driver.tap('confirm');
    driver.tap('confirm');
    // Mash confirm through the round playback; the extra presses must not choose the next action.
    for (let i = 0; i < 40 && internals.phase !== 'command'; i++) {
      driver.tap('confirm');
    }
    expect(internals.phase).toBe('command');
    driver.run(1);
    expect(internals.phase).toBe('command');
  });

  it('keeps the result screen open until the player presses OK', () => {
    const { internals, driver, onEnd } = setup();
    internals.battle.enemies[0].hp = 1;
    driver.run(2);
    driver.tap('confirm');
    driver.tap('confirm');
    driver.run(30);
    expect(internals.phase).toBe('end');
    expect(onEnd).not.toHaveBeenCalled();

    for (let i = 0; i < 5 && onEnd.mock.calls.length === 0; i++) {
      driver.tap('confirm');
      driver.run(0.3);
    }
    expect(onEnd).toHaveBeenCalledWith('victory');
  });

  it('places the party on the left and enemies on the right', () => {
    const { internals } = setup();
    const hero = internals.spots.get(internals.battle.party[0].id);
    const enemy = internals.spots.get(internals.battle.enemies[0].id);
    expect(hero && enemy && hero.x + hero.size < enemy.x).toBe(true);
  });

  it('animates the attacker, floats damage and dissolves a defeated enemy', () => {
    const { internals, driver } = setup();
    const enemy = internals.battle.enemies[0];
    const hero = internals.battle.party[0];
    enemy.hp = 1;
    driver.run(2);
    driver.tap('confirm');
    driver.tap('confirm');
    expect(internals.motions.get(hero.id)?.kind).toBe('lunge');
    driver.run(0.4);
    expect(internals.floaters.length).toBeGreaterThan(0);
    driver.run(1.5);
    expect(internals.gone.has(enemy.id)).toBe(true);
  });

  it('greys out full-HP allies for heals and will not use a heal on them', () => {
    const { internals, driver } = setup();
    const t = internals as unknown as BattleInternals & {
      targets: unknown[];
      beginTarget(targets: unknown[], restore?: 'hp' | 'mp'): void;
      log: string[];
    };
    const hero = internals.battle.party[0];
    hero.hp = hero.maxHp;
    driver.run(2);
    t.beginTarget([hero], 'hp');
    expect(internals.phase).toBe('command');
    expect(t.log.join(' ')).toMatch(/full HP/);

    hero.hp = hero.maxHp - 1;
    t.beginTarget([hero], 'hp');
    expect(internals.phase).toBe('target');
    hero.hp = hero.maxHp;
    driver.tap('confirm');
    expect(internals.phase).toBe('target');
  });

  it('can close the result screen with cancel (Esc)', () => {
    const { internals, driver, onEnd } = setup();
    internals.battle.enemies[0].hp = 1;
    driver.run(2);
    driver.tap('confirm');
    driver.tap('confirm');
    driver.run(30);
    for (let i = 0; i < 5 && onEnd.mock.calls.length === 0; i++) {
      driver.tap('cancel');
      driver.run(0.3);
    }
    expect(onEnd).toHaveBeenCalledWith('victory');
  });
});

describe('field restores', () => {
  it('never heals above max and greys out members a restore cannot help', () => {
    const state = newGameState('TEST', 'cleric');
    const m = state.party[0];
    const max = memberStats(m);
    m.hp = max.hp;
    expect(canRestore(m, 'healHp')).toBe(false);
    expect(applyRestore(m, 'healHp', 50)).toBeNull();
    m.hp = max.hp - 3;
    expect(canRestore(m, 'healHp')).toBe(true);
    expect(applyRestore(m, 'healHp', 50)).toContain('3 HP');
    expect(m.hp).toBe(max.hp);
    m.mp = 0;
    applyRestore(m, 'healMp', 999);
    expect(m.mp).toBe(max.mp);
    expect(canRestore(m, 'revive')).toBe(false);
    m.hp = 0;
    expect(canRestore(m, 'healHp')).toBe(false);
    expect(canRestore(m, 'revive')).toBe(true);
  });
});