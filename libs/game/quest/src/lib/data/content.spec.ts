import { FACING_DELTA, TileMap } from '@jouster/game/engine';
import { ABILITIES } from '../data/abilities';
import { CLASSES } from '../data/classes';
import { ITEMS, WEAPONS, WEAPON_SHOP_STOCK } from '../data/equipment';
import { INN_RESPAWN, MAPS, MapDef, SIGN_TEXT, SignKind, mapHasEncounters, talkAcross, wanderBlocked } from '../data/maps';
import { COMPANION_SLOTS, companionRestSpot } from '../data/companions';
import { ENCOUNTER_TABLES, MONSTERS } from '../data/monsters';
import { OVERWORLD_H, OVERWORLD_W, generateOverworld } from '../data/overworld-gen';
import { newGameState } from '../state/game-state';
import { monsterVariantCount } from '../art/art';

function tileMap(def: MapDef): TileMap {
  return new TileMap(def.rows, def.legend);
}

/** Flood fill of walkable tiles from a start point (NPC tiles are treated as walls). */
function reachable(def: MapDef, sx: number, sy: number): Set<string> {
  const map = tileMap(def);
  const blocked = new Set(def.npcs.map((n) => `${n.x},${n.y}`));
  const seen = new Set<string>([`${sx},${sy}`]);
  const queue = [{ x: sx, y: sy }];
  while (queue.length) {
    const p = queue.shift() as { x: number; y: number };
    for (const d of Object.values(FACING_DELTA)) {
      const x = p.x + d.x;
      const y = p.y + d.y;
      const key = `${x},${y}`;
      if (!seen.has(key) && !map.isSolid(x, y) && !blocked.has(key)) {
        seen.add(key);
        queue.push({ x, y });
      }
    }
  }
  return seen;
}

describe('Jouster Quest content', () => {
  it.each([...MAPS.values()].map((m) => [m.id, m] as const))('map %s is rectangular and uses known tiles', (_, def) => {
    expect(() => tileMap(def)).not.toThrow();
  });

  it('the overworld is the large generated map and is identical on every load', () => {
    const world = MAPS.get('overworld') as MapDef;
    expect(world.rows).toHaveLength(OVERWORLD_H);
    expect(world.rows.every((r) => r.length === OVERWORLD_W)).toBe(true);
    expect(generateOverworld()).toEqual(world.rows);
  });

  it('every warp starts and lands on a walkable tile', () => {
    MAPS.forEach((def) => {
      const map = tileMap(def);
      def.warps.forEach((w) => {
        expect(map.isSolid(w.x, w.y)).toBe(false);
        const target = MAPS.get(w.toMap);
        expect(target).toBeDefined();
        expect(tileMap(target as MapDef).isSolid(w.toX, w.toY)).toBe(false);
      });
    });
  });

  it('every NPC stands on a walkable tile and can be talked to', () => {
    MAPS.forEach((def) => {
      const map = tileMap(def);
      const start = def.warps[0];
      const reach = reachable(def, start.x, start.y);
      def.npcs.forEach((npc) => {
        expect(map.isSolid(npc.x, npc.y)).toBe(false);
        const talkable = Object.values(FACING_DELTA).some((d) => {
          const adj = `${npc.x + d.x},${npc.y + d.y}`;
          const across = `${npc.x + d.x * 2},${npc.y + d.y * 2}`;
          const counter = talkAcross(map.tileAt(npc.x + d.x, npc.y + d.y)?.id);
          return reach.has(adj) || (counter && reach.has(across));
        });
        expect({ npc: npc.id, talkable }).toEqual({ npc: npc.id, talkable: true });
      });
    });
  });

  it('all warps, events and the new-game start are reachable from each map entrance', () => {
    MAPS.forEach((def) => {
      const start = def.warps[0];
      const reach = reachable(def, start.x, start.y);
      [...def.warps, ...def.events].forEach((p) => {
        expect({ map: def.id, p, ok: reach.has(`${p.x},${p.y}`) }).toEqual({ map: def.id, p, ok: true });
      });
    });
    const s = newGameState('Hero', 'cleric');
    const town = MAPS.get(s.mapId) as MapDef;
    expect(reachable(town, s.x, s.y).has(`${town.warps[0].x},${town.warps[0].y}`)).toBe(true);
    expect(reachable(town, INN_RESPAWN.x, INN_RESPAWN.y).size).toBeGreaterThan(10);
  });

  it('wandering NPCs never block a counter, a standing NPC or a doorway', () => {
    const aldmere = MAPS.get('aldmere') as MapDef;
    const map = tileMap(aldmere);
    // In front of the item shop counter, beside the king, and in the gap between two buildings.
    expect(wanderBlocked(map, [], 4, 13)).toBe(true);
    expect(wanderBlocked(map, [{ x: 6, y: 2 }], 6, 3)).toBe(true);
    expect(wanderBlocked(map, [], 11, 12)).toBe(true);
    expect(wanderBlocked(map, [], 8, 8)).toBe(false);
    MAPS.forEach((def) => {
      const tiles = tileMap(def);
      const standing = def.npcs.filter((n) => !n.wander);
      def.npcs
        .filter((n) => n.wander)
        .forEach((n) => {
          const blocked = wanderBlocked(tiles, standing, n.x, n.y);
          expect({ map: def.id, npc: n.id, blocked }).toEqual({ map: def.id, npc: n.id, blocked: false });
        });
    });
  });

  it('companions wait where they were found, then in a town once they have left the party', () => {
    const s = newGameState('Hero', 'rogue');
    s.flags['bossDefeated'] = true;
    const visibleAt = (mapId: string, id: string): boolean => {
      const npc = (MAPS.get(mapId) as MapDef).npcs.find((n) => n.id === id);
      return !!npc && (npc.visible ? npc.visible(s) : true);
    };
    expect(visibleAt('goblinCave', 'cave')).toBe(true);
    expect(visibleAt('aldmere', 'caveResting')).toBe(false);
    s.companionProgress['cave'] = { level: 2, xp: 40 };
    s.companionProgress['thornwick'] = { level: 2, xp: 40 };
    s.companionProgress['tavern'] = { level: 2, xp: 40 };
    expect(visibleAt('goblinCave', 'cave')).toBe(false);
    expect(visibleAt('aldmere', 'caveResting')).toBe(true);
    expect(visibleAt('overworld', 'thornwick')).toBe(false);
    expect(visibleAt('aldmere', 'thornwickResting')).toBe(true);
    // A companion found in town simply waits at the same spot.
    expect(visibleAt('aldmere', 'tavern')).toBe(true);
    COMPANION_SLOTS.forEach((slot) => {
      const rest = companionRestSpot(slot.id);
      const town = MAPS.get(rest.mapId) as MapDef;
      expect({ id: slot.id, town: mapHasEncounters(town) }).toEqual({ id: slot.id, town: false });
      expect(tileMap(town).isSolid(rest.x, rest.y)).toBe(false);
    });
  });

  it('marks clue spots with their own walkable tile', () => {
    const clue = (mapId: string, eventId: string): string | undefined => {
      const def = MAPS.get(mapId) as MapDef;
      const e = def.events.find((ev) => ev.id === eventId);
      expect(e).toBeDefined();
      const map = tileMap(def);
      expect(map.isSolid(e?.x ?? 0, e?.y ?? 0)).toBe(false);
      return map.tileAt(e?.x ?? 0, e?.y ?? 0)?.id;
    };
    expect(clue('overworld', 'lakeShore')).toBe('tornNet@grass');
    expect(clue('wolfDen', 'denNest')).toBe('boneNest@caveFloor');
    expect(clue('overworld', 'thornwick')).toBe('ruins');
  });

  it('boss fights and companion quest pins reference real monsters, flags and tiles', () => {
    const bosses = [...MAPS.values()].flatMap((m) => m.npcs.flatMap((n) => (n.boss ? [n.boss] : [])));
    expect(bosses.length).toBeGreaterThanOrEqual(5);
    bosses.forEach((b) => {
      b.monsterIds.forEach((id) => expect(MONSTERS.has(id)).toBe(true));
      expect(b.defeatFlag).toMatch(/Defeated$/);
    });
    const flags = new Set(bosses.map((b) => b.defeatFlag));
    COMPANION_SLOTS.forEach((slot) => {
      expect(flags.has(slot.quest.doneFlag)).toBe(true);
      const map = MAPS.get(slot.quest.pin.mapId) as MapDef;
      expect(map).toBeDefined();
      expect(tileMap(map).inBounds(slot.quest.pin.x, slot.quest.pin.y)).toBe(true);
    });
  });

  it('references between data tables resolve', () => {
    CLASSES.forEach((c) => {
      expect(WEAPONS.has(c.startingWeaponId)).toBe(true);
      c.abilities.forEach((a) => expect(ABILITIES.has(a.abilityId)).toBe(true));
      expect(WEAPON_SHOP_STOCK.some((id) => WEAPONS.get(id)?.family === c.weaponFamily)).toBe(true);
    });
    MONSTERS.forEach((m) => {
      m.actions.filter((a) => a.action !== 'attack').forEach((a) => expect(ABILITIES.has(a.action)).toBe(true));
      m.drops.forEach((d) => expect(ITEMS.has(d.itemId)).toBe(true));
    });
    ENCOUNTER_TABLES.forEach((t) => t.groups.forEach((g) => g.monsterIds.forEach((id) => expect(MONSTERS.has(id)).toBe(true))));
    MAPS.forEach((m) =>
      m.legend.forEach((t) => {
        if (t.encounterTableId) {
          expect(ENCOUNTER_TABLES.has(t.encounterTableId)).toBe(true);
        }
      }),
    );
  });
});

describe('monster names', () => {
  const COLOUR_WORDS = /\b(grey|gray|red|blue|green|black|white|brown|gold|golden|purple|teal)\b/i;

  it('monsters with more than one look have names without colour words', () => {
    const varied = [...MONSTERS.values()].filter((m) => monsterVariantCount(m.spriteId) > 1);
    expect(varied.length).toBeGreaterThan(0);
    varied.forEach((m) => expect({ id: m.id, name: m.name, colour: COLOUR_WORDS.test(m.name) }).toEqual({ id: m.id, name: m.name, colour: false }));
  });
});

describe('town signs', () => {
  const ROLE_SIGN: Readonly<Record<string, SignKind>> = {
    inn: 'inn',
    itemShop: 'item',
    weaponShop: 'weapon',
    armorShop: 'armor',
    church: 'chapel',
    king: 'castle',
  };
  const near = (a: { x: number; y: number }, b: { x: number; y: number }): boolean =>
    Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y)) <= 4;

  it('hangs every sign on a wall with a walkable tile beside it to read from', () => {
    [...MAPS.values()].filter((m) => m.signs).forEach((m) => {
      const map = tileMap(m);
      (m.signs ?? []).forEach((s) => {
        expect({ map: m.id, s, tile: map.tileAt(s.x, s.y)?.id }).toEqual({ map: m.id, s, tile: 'wall' });
        const readable = Object.values(FACING_DELTA).some((d) => !map.isSolid(s.x + d.x, s.y + d.y));
        expect({ map: m.id, s, readable }).toEqual({ map: m.id, s, readable: true });
        expect(SIGN_TEXT[s.kind].name.length).toBeGreaterThan(0);
      });
    });
  });

  it('marks every service NPC and the tavern with a matching nearby sign', () => {
    MAPS.forEach((m) => {
      m.npcs
        .filter((n) => n.role && ROLE_SIGN[n.role])
        .forEach((n) => {
          const kind = ROLE_SIGN[n.role as string];
          const ok = (m.signs ?? []).some((s) => s.kind === kind && near(s, n));
          expect({ map: m.id, npc: n.id, kind, ok }).toEqual({ map: m.id, npc: n.id, kind, ok: true });
        });
    });
    const tavern = COMPANION_SLOTS.find((s) => s.id === 'tavern');
    const aldmere = MAPS.get(tavern?.mapId ?? '');
    expect(tavern && (aldmere?.signs ?? []).some((s) => s.kind === 'tavern' && near(s, tavern))).toBe(true);
  });
});
