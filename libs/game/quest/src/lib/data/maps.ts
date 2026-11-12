import { Facing, TileDef } from '@jouster/game/engine';
import { GameState, companionAvailable } from '../state/game-state';
import { COMPANION_LIST } from './companions';

export type NpcRole = 'talk' | 'king' | 'inn' | 'itemShop' | 'weaponShop' | 'church' | 'boss' | 'companion';

export interface NpcDef {
  id: string;
  x: number;
  y: number;
  spriteId: string;
  facing: Facing;
  role: NpcRole;
  /** Dialogue for `talk` NPCs (or intro lines for other roles). */
  lines?(state: GameState): string[];
  visible?(state: GameState): boolean;
  /** Wanders randomly around its start position. */
  wander?: boolean;
  /** For `companion` NPCs. */
  companionId?: string;
}

export interface Warp {
  x: number;
  y: number;
  toMap: string;
  toX: number;
  toY: number;
  facing: Facing;
}

export interface MapEvent {
  x: number;
  y: number;
  id: string;
}

export type Backdrop = 'field' | 'forest' | 'hills' | 'cave';

export interface MapDef {
  id: string;
  name: string;
  rows: readonly string[];
  legend: readonly TileDef[];
  warps: readonly Warp[];
  npcs: readonly NpcDef[];
  events: readonly MapEvent[];
  /** Tile drawn outside the map edges. */
  outsideTile: string;
  backdrop: Backdrop;
}

// --- Overworld (40x30) ---------------------------------------------------------------------

const OVERWORLD_ROWS = [
  '^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^',
  '^fffff........^^^^^^~.^^^^^^^^^^^^^^^^^^',
  '^ffffff........^^^^^~.^^^^^^^^^^^^^^^^^^',
  '^ffffff.............~.....hhh^^^O^^^^^^^',
  '^fffffff............~.....hhhhhh:hhhhhh^',
  '^ffffff.............~....hhhhhhh:hhhhhh^',
  '^ffffff........f....~....hhhhfhh:hhhhhh^',
  '^^ffff.......fffff..~...hhhfffff:hhhhhh^',
  '^^.f........fffffff.~..hhhffffff:hhhhhh^',
  '^^^..........fffff..~..hhhffffff:hhhhhh^',
  '^^.............f....~..hhfffffff:fhhhhh^',
  '^^..................~..hhhffffff:hhhhhh^',
  '^...................~..hhhffffff:hhhhhh^',
  '^...................~..hhhhfffff:hhhhhh^',
  '^.........A:::::::::=::::::::::::hhhhhh^',
  '^...................~...hhhhhhhhhhhhhhh^',
  '^^..............f...~....hhhhhhhhhhh^^^^',
  '^^^...........fffff.~....hhhhhhhhhhh^^^^',
  '^^^^.........fffffff~.....hhhhhhhhhh^^^^',
  '^^^...........fffff.~.....hhhhhhhhhh^^^^',
  '^^..............f...~.......hhhhhhhh^^^^',
  '^..f................~......V.hhhhhfh^^^^',
  '^ffffff.............~........f...fff^^^^',
  '^ffffffff...........~....fffffffffff^^^^',
  '^ffffffff...........~...ffffffffffff^^^^',
  '^fffffffff..........~..fffffffffffff^^^^',
  '^ffffffff...........~...fffffffffff^^^^^',
  '^ffffffff.......~~~~~~~..fffffffff^^^^^^',
  '^ffffff.......~~~~~~~~~~~....f...^^^^^^^',
  '^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^',
];

const OVERWORLD_LEGEND: TileDef[] = [
  { char: '.', id: 'grass', solid: false, encounterTableId: 'greenwood' },
  { char: ':', id: 'road', solid: false, encounterTableId: 'greenwood' },
  { char: 'f', id: 'forest', solid: false, encounterTableId: 'forest' },
  { char: 'h', id: 'hills', solid: false, encounterTableId: 'hills' },
  { char: '^', id: 'mountain', solid: true },
  { char: '~', id: 'water', solid: true },
  { char: '=', id: 'bridge', solid: false },
  { char: 'A', id: 'town', solid: false },
  { char: 'O', id: 'caveEntrance', solid: false },
  { char: 'V', id: 'ruins', solid: false },
];

// --- Aldmere (24x18) -----------------------------------------------------------------------

const ALDMERE_ROWS = [
  'TTTTTTTTTTTTTTTTTTTTTTTT',
  'T########gggg########TTT',
  'T#rrrrrr#gggg#wwwwww#gTT',
  'T#rrrrrr#g__g#wwwwww#gTT',
  'T#rrrrrr#g__g#wwwwww#ggT',
  'T#rrrrrr#g__g#wwwwww#ggT',
  'T###rr###g__g###ww###ggT',
  'Tgg_rr__________ww__gggT',
  'Tg_________~~_________gT',
  'Tg_________~~_________gT',
  'Tgg____________________T',
  'T##########_###########T',
  'T#www##www#_#wwww##www#T',
  'T#ccc##ccc#_#wwww##ccc#T',
  'T__________g##ww##_____T',
  'Tg____________________gT',
  'TTTTTTTTTTEETTTTTTTTTTTT',
  'TTTTTTTTTTTTTTTTTTTTTTTT',
];

const TOWN_LEGEND: TileDef[] = [
  { char: 'T', id: 'tree', solid: true },
  { char: '#', id: 'wall', solid: true },
  { char: 'g', id: 'townGrass', solid: false },
  { char: '_', id: 'cobble', solid: false },
  { char: 'r', id: 'carpet', solid: false },
  { char: 'w', id: 'wood', solid: false },
  { char: 'c', id: 'counter', solid: true },
  { char: '~', id: 'fountain', solid: true },
  { char: 'E', id: 'cobble', solid: false },
];

// --- Goblin Cave (28x20) -------------------------------------------------------------------

const CAVE_ROWS = [
  '############################',
  '#____################______#',
  '#____###~~~##########______#',
  '#__#_______________________#',
  '#__###~~~~###########______#',
  '#__###~~~~############____##',
  '#__#########################',
  '#__#########################',
  '#___________########_______#',
  '#__########_########_#####_#',
  '#__########_________######_#',
  '#__##########_######~~~~##_#',
  '#__##########______________#',
  '#__#########################',
  '#____#######################',
  '#____#######################',
  '##__########################',
  '##__########################',
  '##E_########################',
  '############################',
];

const CAVE_LEGEND: TileDef[] = [
  { char: '#', id: 'rock', solid: true },
  { char: '_', id: 'caveFloor', solid: false, encounterTableId: 'cave' },
  { char: '~', id: 'caveWater', solid: true },
  { char: 'E', id: 'caveExit', solid: false },
];

const kingLines = (s: GameState): string[] => {
  if (s.flags['actOneComplete']) {
    return ['KING ALDRIC: Rest well, hero. When the dragon stirs again, Aldmere will call on you.'];
  }
  if (s.flags['bossDefeated']) {
    return [];
  }
  if (s.flags['metKing']) {
    return [
      'KING ALDRIC: The Goblin Cave lies past the river, in the eastern hills.',
      'Allies may aid you: a sellsword drinks in our tavern, and Thornwick has survivors.',
      'Go where you will - but beware the cave, and rest at the inn.',
    ];
  }
  return [];
};

const BASE_MAPS: MapDef[] = [
  {
      id: 'overworld',
      name: 'Greenwood Vale',
      rows: OVERWORLD_ROWS,
      legend: OVERWORLD_LEGEND,
      warps: [
        { x: 10, y: 14, toMap: 'aldmere', toX: 10, toY: 15, facing: 'up' },
        { x: 32, y: 3, toMap: 'goblinCave', toX: 2, toY: 17, facing: 'up' },
      ],
      npcs: [],
      events: [{ x: 27, y: 21, id: 'thornwick' }],
      outsideTile: '^',
      backdrop: 'field',
    },
  {
      id: 'aldmere',
      name: 'Aldmere',
      rows: ALDMERE_ROWS,
      legend: TOWN_LEGEND,
      warps: [
        { x: 10, y: 16, toMap: 'overworld', toX: 10, toY: 15, facing: 'down' },
        { x: 11, y: 16, toMap: 'overworld', toX: 10, toY: 15, facing: 'down' },
      ],
      npcs: [
        { id: 'king', x: 4, y: 2, spriteId: 'king', facing: 'down', role: 'king', lines: kingLines },
        {
          id: 'guardL',
          x: 2,
          y: 5,
          spriteId: 'guard',
          facing: 'right',
          role: 'talk',
          lines: () => ['GUARD: Long live King Aldric!'],
        },
        {
          id: 'guardR',
          x: 7,
          y: 5,
          spriteId: 'guard',
          facing: 'left',
          role: 'talk',
          lines: (s) =>
            s.flags['bossDefeated']
              ? ['GUARD: You beat the Goblin King? The king will want to hear of it!']
              : ['GUARD: Goblins burned Thornwick, south-east of here. Terrible business.'],
        },
        { id: 'priest', x: 16, y: 3, spriteId: 'priest', facing: 'down', role: 'church' },
        { id: 'itemShop', x: 3, y: 12, spriteId: 'merchant', facing: 'down', role: 'itemShop' },
        { id: 'weaponShop', x: 8, y: 12, spriteId: 'smith', facing: 'down', role: 'weaponShop' },
        { id: 'innkeeper', x: 20, y: 12, spriteId: 'innkeeper', facing: 'down', role: 'inn' },
        {
          id: 'barkeep',
          x: 13,
          y: 12,
          spriteId: 'villager',
          facing: 'down',
          role: 'talk',
          lines: () => ['BARKEEP: Adventurers come here looking for work. Talk to anyone who catches your eye.'],
        },
        {
          id: 'oldMan',
          x: 6,
          y: 9,
          spriteId: 'elder',
          facing: 'down',
          role: 'talk',
          wander: true,
          lines: () => [
            'Long ago the dragon Vyrmorth was sealed beneath the northern peaks.',
            'Now goblins raid again... I fear the seal is weakening.',
          ],
        },
        {
          id: 'child',
          x: 17,
          y: 9,
          spriteId: 'child',
          facing: 'down',
          role: 'talk',
          wander: true,
          lines: () => ['Slimes are weak to fire! My big sister told me.'],
        },
        {
          id: 'woman',
          x: 21,
          y: 15,
          spriteId: 'villager',
          facing: 'left',
          role: 'talk',
          wander: true,
          lines: () => ['Press X or Esc to open your menu. You can heal with Herbs there, too.'],
        },
      ],
      events: [],
      outsideTile: 'T',
      backdrop: 'field',
    },
  {
      id: 'goblinCave',
      name: 'Goblin Cave',
      rows: CAVE_ROWS,
      legend: CAVE_LEGEND,
      warps: [{ x: 2, y: 18, toMap: 'overworld', toX: 32, toY: 4, facing: 'down' }],
      npcs: [
        {
          id: 'goblinKing',
          x: 23,
          y: 2,
          spriteId: 'goblinKingNpc',
          facing: 'down',
          role: 'boss',
          visible: (s) => !s.flags['bossDefeated'],
        },
      ],
      events: [],
      outsideTile: '#',
      backdrop: 'cave',
    },
];

/** Companion NPCs wait at their home spot whenever they are unlocked and not in the party. */
function withCompanions(m: MapDef): MapDef {
  const companions: NpcDef[] = COMPANION_LIST.filter((c) => c.mapId === m.id).map((c) => ({
    id: c.id,
    x: c.x,
    y: c.y,
    spriteId: c.classId,
    facing: 'down',
    role: 'companion',
    companionId: c.id,
    visible: (st: GameState) => companionAvailable(st, c.id),
  }));
  return { ...m, npcs: [...m.npcs, ...companions] };
}

export const MAPS: ReadonlyMap<string, MapDef> = new Map(BASE_MAPS.map((m) => [m.id, withCompanions(m)]));

export function mapDef(id: string): MapDef {
  const m = MAPS.get(id);
  if (!m) {
    throw new Error(`Unknown map: ${id}`);
  }
  return m;
}

/** Where the party wakes up after a defeat (in front of the inn counter). */
export const INN_RESPAWN = { mapId: 'aldmere', x: 20, y: 14, facing: 'up' as Facing };
