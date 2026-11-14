import { Facing, TileDef, TileMap } from '@jouster/game/engine';
import { GameState, companionBenched, companionPresent } from '../state/game-state';
import { COMPANION_SLOTS, CompanionSlot, companionRestSpot } from './companions';
import { SOUTH_WEAPON_STOCK } from './equipment';
import { SOUTH_ARMOR_STOCK } from './gear';
import { LANDMARKS, generateOverworld } from './overworld-gen';
import { SOUTH_LANDMARKS, generateSouthlands } from './southlands-gen';

export type NpcRole = 'talk' | 'king' | 'inn' | 'itemShop' | 'weaponShop' | 'armorShop' | 'church' | 'boss' | 'companion';

export interface NpcDef {
  id: string;
  x: number;
  y: number;
  spriteId: string;
  /** Sprite chosen from game state (overrides `spriteId`), e.g. for rolled companions. */
  sprite?(state: GameState): string;
  facing: Facing;
  role: NpcRole;
  /** Dialogue for `talk` NPCs (or intro lines for other roles). */
  lines?(state: GameState): string[];
  visible?(state: GameState): boolean;
  /** Wanders randomly around its start position. */
  wander?: boolean;
  /** For `companion` NPCs. */
  companionId?: string;
  /** For `boss` NPCs: who you fight and the story flag set on victory. */
  boss?: BossDef;
  /** For shop NPCs: what they sell (defaults to Aldmere's stock). */
  stock?: readonly string[];
}

export interface BossDef {
  monsterIds: string[];
  /** Set when the boss is beaten (the NPC disappears). */
  defeatFlag: string;
  /** Taunt before the FIGHT / RETREAT choice. */
  lines: string[];
  /** Shown after winning. */
  victory: string[];
}

/** A boss NPC that stays on the map until its `defeatFlag` is set (plus any extra condition). */
function bossNpc(
  id: string,
  x: number,
  y: number,
  spriteId: string,
  boss: BossDef,
  extra: (s: GameState) => boolean = () => true,
): NpcDef {
  return { id, x, y, spriteId, facing: 'down', role: 'boss', boss, visible: (s) => !s.flags[boss.defeatFlag] && extra(s) };
}

export interface Warp {
  x: number;
  y: number;
  toMap: string;
  toX: number;
  toY: number;
  facing: Facing;
  /** Story flag needed to use the warp; without it the player is stopped with `lockedLines`. */
  requires?: string;
  lockedLines?: readonly string[];
}

/** Service a town sign advertises (plan 15.7). */
export type SignKind = 'inn' | 'tavern' | 'item' | 'weapon' | 'armor' | 'chapel' | 'castle';

/** A pixel-icon sign hanging on a wall tile next to a service building's door. */
export interface TownSign {
  x: number;
  y: number;
  kind: SignKind;
}

/** Name and short blurb shown when the player reads a sign. */
export const SIGN_TEXT: Readonly<Record<SignKind, { name: string; blurb: string }>> = {
  inn: { name: 'Inn', blurb: 'rest and recover' },
  tavern: { name: 'Tavern', blurb: 'ale and hired swords' },
  item: { name: 'Item Shop', blurb: 'herbs, tonics and feathers' },
  weapon: { name: 'Smithy', blurb: 'blades, staves and maces' },
  armor: { name: 'Armorer', blurb: 'armor, shields and charms' },
  chapel: { name: 'Chapel', blurb: 'revival and the book of deeds' },
  castle: { name: 'Castle', blurb: 'hall of King Aldric' },
};

export interface MapEvent {
  x: number;
  y: number;
  id: string;
}

export type Backdrop = 'field' | 'forest' | 'hills' | 'cave' | 'desert' | 'marsh';

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
  /** Hidden under fog of war until explored (wilds and caves; towns are never fogged). */
  fog?: boolean;
  /** Building signs, each on a wall tile (towns only). */
  signs?: readonly TownSign[];
}

// --- Overworld (96x72, generated from a fixed seed) ----------------------------------------

const OVERWORLD_ROWS = generateOverworld();

const OVERWORLD_LEGEND: TileDef[] = [
  { char: '.', id: 'grass', solid: false, encounterTableId: 'greenwood' },
  { char: ':', id: 'road', solid: false, encounterTableId: 'greenwood' },
  { char: 'f', id: 'forest', solid: false, encounterTableId: 'forest' },
  { char: 'h', id: 'hills', solid: false, encounterTableId: 'hills' },
  { char: '^', id: 'mountain', solid: true },
  { char: '~', id: 'water', solid: true },
  { char: '=', id: 'bridge', solid: false },
  { char: 'A', id: 'town', solid: false },
  { char: 'B', id: 'town', solid: false },
  { char: 'O', id: 'caveEntrance', solid: false },
  { char: 'W', id: 'caveEntrance', solid: false },
  { char: 'V', id: 'ruins', solid: false },
  { char: 'P', id: 'pass', solid: false },
  { char: 'n', id: 'tornNet@grass', solid: false, encounterTableId: 'greenwood' },
];

// --- Aldmere (34x30) -----------------------------------------------------------------------
// North: castle (throne), garden, chapel. Middle: item shop, smithy, armorer - keepers stand
// behind their counters. South: tavern (bar) and inn (front desk + bedroom). Exit at the bottom.

const ALDMERE_ROWS = [
  'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT',
  'T##N#N#N#N##TTTTTTTTTT#########ggT',
  'T#C__rYr__C#gggggggggg#BKwrwKB#ggT',
  'T#p__rrr__p#gggggggggg#wwwLwww#ggT',
  'T#___rrr___#gggg__gggg#nnwrwnn#ggT',
  'T#___rrr___#gggg__gggg#nnwrwnn#ggT',
  'T####rrr####gggg__gggg###wrw###ggT',
  'Tu______________________________vT',
  'T________________________________T',
  'T_#########_#########_#########__T',
  'T_#PPxPPbP#_#RR_H_RR#_#AwAXAwA#__T',
  'T_#bwwwwwx#_#a_____v#_#qwwwwwx#__T',
  'T_#ccccccc#_#ccccccc#_#ccccccc#__T',
  'T_#xwwwwwq#_#_______#_#wwwwwww#__T',
  'T_#wwwwwww#_#u_____v#_#Awwwwwq#__T',
  'T_####w####_####_####_####w####__T',
  'Tp______________________________pT',
  'T_______________~~_______________T',
  'T_______________~~_______________T',
  'T________________________________T',
  'T_###############_#############__T',
  'T_#kbkkbkqwwwHwB#_#BwXwq#dwdwd#__T',
  'T_#wwwwwwcwwwwww#_#wwwww#wwwww#__T',
  'T_#ccccccwwhthww#_#ccccc#xwwwq#__T',
  'T_#wwwwwwwwwwwww#_#wwwwwwwwwww#__T',
  'T_#xwhthwwwwhthb#_#qwowq#wwdwd#__T',
  'T_#######w#######_###w#########__T',
  'T________________________________T',
  'TTTTTTTTTTTTTTTTEETTTTTTTTTTTTTTTT',
  'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT',
];

/**
 * Town tiles. Furniture uses composite `object@floor` ids (see `decorParts` in the art): the
 * object is painted over the floor tile. Thrones, stools and rugs can be walked on.
 */
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
  { char: 'N', id: 'banner@wall', solid: true },
  { char: 'Y', id: 'throne@carpet', solid: false },
  { char: 'C', id: 'candles@cobble', solid: true },
  { char: 'K', id: 'candles@wood', solid: true },
  { char: 'p', id: 'plant@cobble', solid: true },
  { char: 'q', id: 'plant@wood', solid: true },
  { char: 'B', id: 'bookshelf@wood', solid: true },
  { char: 'L', id: 'altar@wood', solid: true },
  { char: 'n', id: 'pew@wood', solid: true },
  { char: 'P', id: 'potionShelf@wood', solid: true },
  { char: 'b', id: 'barrel@wood', solid: true },
  { char: 'u', id: 'barrel@cobble', solid: true },
  { char: 'x', id: 'crate@wood', solid: true },
  { char: 'v', id: 'crate@cobble', solid: true },
  { char: 'S', id: 'sacks@wood', solid: true },
  { char: 'k', id: 'keg@wood', solid: true },
  { char: 't', id: 'table@wood', solid: true },
  { char: 'h', id: 'stool@wood', solid: false },
  { char: 'd', id: 'bed@wood', solid: true },
  { char: 'R', id: 'weaponRack@cobble', solid: true },
  { char: 'W', id: 'weaponRack@wood', solid: true },
  { char: 'A', id: 'armorStand@wood', solid: true },
  { char: 'a', id: 'anvil@cobble', solid: true },
  { char: 'H', id: 'hearth@cobble', solid: true },
  { char: 'o', id: 'rug@wood', solid: false },
  { char: 'X', id: 'chest@wood', solid: true },
];

// --- Brookhollow (22x15) -------------------------------------------------------------------

const BROOKHOLLOW_ROWS = [
  'TTTTTTTTTTTTTTTTTTTTTT',
  'TggggggggggggggggggggT',
  'Tg#####gggggggg#####gT',
  'Tg#bwk#gggggggg#PwP#gT',
  'Tg#ccc#gggg_ggg#ccc#gT',
  'Tg__________________gT',
  'Tgggggg___~~___ggggggT',
  'Tggggg__________gggggT',
  'Tg####ggg____ggg####gT',
  'Tg####ggg____ggg####gT',
  'Tggggggggg____gggggggT',
  'TTgggggggg____ggggggTT',
  'TTgggggggg____ggggggTT',
  'TTTTTTTTTTEETTTTTTTTTT',
  'TTTTTTTTTTTTTTTTTTTTTT',
];

// --- Goblin Cave (30x22) -------------------------------------------------------------------
// The tunnel from the entrance (bottom-left) forks: north to the Jailer's den, east to the
// treasure nook and the throne room. The prisoner's cell sits behind the Goblin King's throne.

const CAVE_ROWS = [
  '#####t###############t########',
  '##ss,,,xx#########ss,,,,b#####',
  '##,,,,,,u#########,,,,,,s#####',
  '##s,,,,,,#######t#=======#t###',
  '##,,,,,,,#######g,,,,Y,,,,g###',
  '##b,,,,,b#######,,,,,,,,,,,###',
  '##__############,f,,,,,,,f,###',
  '##__############b,,,,,,,,,u###',
  '##__###############t#,#t######',
  '##__##t#####t#######__########',
  '##____________________#____g##',
  '##__________________________t#',
  '##__####_____##########_____##',
  '##___###_~~~_t#########x__gb##',
  '#t___###__~__#################',
  '##___#########################',
  '##__##########################',
  '##__##########################',
  '##__##########################',
  '##__##########################',
  '##E_##########################',
  '##############################',
];

// --- Wolf Den (20x14) ----------------------------------------------------------------------

const DEN_ROWS = [
  '####################',
  '#######______#######',
  '######____n___######',
  '######___~~___######',
  '#######______#######',
  '##########_#########',
  '####_______#########',
  '####_###############',
  '####_____~~~____####',
  '########_______#####',
  '########_###########',
  '#######___##########',
  '#######_E_##########',
  '####################',
];

const DEN_LEGEND: TileDef[] = [
  { char: '#', id: 'rock', solid: true },
  { char: '_', id: 'caveFloor', solid: false, encounterTableId: 'den' },
  { char: '~', id: 'caveWater', solid: true },
  { char: 'E', id: 'caveExit', solid: false },
  { char: 'n', id: 'boneNest@caveFloor', solid: false, encounterTableId: 'den' },
];

const CAVE_LEGEND: TileDef[] = [
  { char: '#', id: 'rock', solid: true },
  { char: 't', id: 'torch', solid: true },
  { char: '_', id: 'caveFloor', solid: false, encounterTableId: 'cave' },
  { char: '~', id: 'caveWater', solid: true },
  { char: 'E', id: 'caveExit', solid: false },
  // Lit rooms (throne room, cell, jailer's den): no random encounters.
  { char: ',', id: 'caveFloor', solid: false },
  { char: 'Y', id: 'crudeThrone@caveFloor', solid: false },
  { char: '=', id: 'jailBars@caveFloor', solid: true },
  { char: 's', id: 'straw@caveFloor', solid: false },
  { char: 'b', id: 'bones@caveFloor', solid: true },
  { char: 'g', id: 'goldPile@caveFloor', solid: true },
  { char: 'f', id: 'campfire@caveFloor', solid: true },
  { char: 'x', id: 'crate@caveFloor', solid: true },
  { char: 'u', id: 'barrel@caveFloor', solid: true },
];

// --- Southlands (64x48, generated from a fixed seed) - Act II ------------------------------

const SOUTHLANDS_LEGEND: TileDef[] = [
  { char: 's', id: 'sand', solid: false, encounterTableId: 'desert' },
  { char: 'd', id: 'dunes', solid: false, encounterTableId: 'desert' },
  { char: 'c', id: 'cactus', solid: true },
  { char: '^', id: 'mesa', solid: true },
  { char: ':', id: 'sandRoad', solid: false, encounterTableId: 'desert' },
  { char: 'm', id: 'marsh', solid: false, encounterTableId: 'marsh' },
  { char: 'x', id: 'mireTree', solid: false, encounterTableId: 'marsh' },
  { char: 'b', id: 'bog', solid: true },
  { char: '~', id: 'water', solid: true },
  { char: ';', id: 'boardwalk', solid: false, encounterTableId: 'marsh' },
  { char: 'S', id: 'town', solid: false },
  { char: 'U', id: 'shrineEntrance', solid: false },
  { char: 'M', id: 'mireEntrance', solid: false },
  { char: 'r', id: 'mireRock', solid: true },
  { char: 'N', id: 'pass', solid: false },
];

// --- Sandhollow (27x15) --------------------------------------------------------------------

const SANDHOLLOW_ROWS = [
  'TTTTTTTTTTTTTTTTTTTTTTTTTTT',
  'TgggggggggggggggggggggggggT',
  'Tg#####g#####g#####g#####gT',
  'Tg#kwb#g#PwP#g#WwW#g#AwA#gT',
  'Tg#ccc#g#ccc#g#ccc#g#ccc#gT',
  'Tg_______________________gT',
  'Tggggg_______________gggggT',
  'Tggg________~~~________gggT',
  'Tggg________~~~________gggT',
  'Tgggg_________________ggggT',
  'Tg####gggg_______gggg####gT',
  'Tg####gggg_______gggg####gT',
  'TTgggggggg_______ggggggggTT',
  'TTTTTTTTTTTTEETTTTTTTTTTTTT',
  'TTTTTTTTTTTTTTTTTTTTTTTTTTT',
];

/** Desert town: sandstone cliffs instead of trees, sand instead of grass. */
const DESERT_TOWN_LEGEND: TileDef[] = TOWN_LEGEND.map((t) =>
  t.char === 'T' ? { ...t, id: 'mesa' } : t.char === 'g' ? { ...t, id: 'sand' } : t,
);

// --- Shrines (22x16) -----------------------------------------------------------------------

const SUN_SHRINE_ROWS = [
  '######################',
  '########______########',
  '#######t______t#######',
  '########______########',
  '##########__##########',
  '###_______________~~##',
  '###_#########_####__##',
  '###_#t####~~#_####_###',
  '###_#####_____####_###',
  '###______#########_###',
  '########_#######___###',
  '###t####_#######_#####',
  '###______________#####',
  '#########_############',
  '#########E############',
  '######################',
];

const MIRE_SHRINE_ROWS = [
  '######################',
  '#######______#########',
  '######t______t########',
  '#######______#########',
  '#########__###########',
  '##___~~___________~~_#',
  '##_######_#######__#_#',
  '##_#t####_#~~~#t##_#_#',
  '##_######_______##_#_#',
  '##__~~~######_####___#',
  '###___________########',
  '#####_###########__###',
  '#####___________~___##',
  '############_#########',
  '############E#########',
  '######################',
];

function shrineLegend(wall: string, floor: string): TileDef[] {
  return [
    { char: '#', id: wall, solid: true },
    { char: 't', id: 'torch', solid: true },
    { char: '_', id: floor, solid: false, encounterTableId: 'shrine' },
    { char: '~', id: 'caveWater', solid: true },
    { char: 'E', id: 'caveExit', solid: false },
  ];
}

/** Items sold in Sandhollow (Act II). */
export const SANDHOLLOW_ITEM_STOCK: readonly string[] = ['herb', 'potion', 'tonic', 'phoenixFeather'];

const kingLines = (s: GameState): string[] => {
  if (s.flags['actTwoComplete']) {
    return ['KING ALDRIC: The south is at peace. Rest, hero - the dragon Vyrmorth will not sleep forever.'];
  }
  if (s.flags['actOneComplete']) {
    const left = [
      s.flags['sandWyrmDefeated'] ? '' : 'the Sun Shrine in the western desert',
      s.flags['marshWitchDefeated'] ? '' : 'the Mire Shrine in the eastern marsh',
    ].filter(Boolean);
    return left.length
      ? [
          'KING ALDRIC: The southern pass beyond Thornwick is open to you now.',
          `Sandhollow's scouts speak of evil stirring in ${left.join(' and ')}.`,
        ]
      : [];
  }
  if (s.flags['bossDefeated']) {
    return [];
  }
  if (s.flags['metKing']) {
    return [
      'KING ALDRIC: The Goblin Cave lies past the river, in the eastern hills.',
      'Travelers in our tavern, in the ruins of Thornwick and in Brookhollow may aid you - once you have proven yourself.',
      'Go where you will - but beware the cave, and rest at the inn.',
    ];
  }
  return [];
};

const {
  aldmere: ALDMERE_AT,
  goblinCave: CAVE_AT,
  thornwick: RUINS_AT,
  brookhollow: BROOK_AT,
  wolfDen: DEN_AT,
  lakeshore: LAKE_AT,
  southPass: PASS_AT,
} = LANDMARKS;

const { pass: SOUTH_PASS_AT, sandhollow: SANDHOLLOW_AT, sunShrine: SUN_AT, mireShrine: MIRE_AT } = SOUTH_LANDMARKS;

const BASE_MAPS: MapDef[] = [
  {
      id: 'overworld',
      name: 'Greenwood Vale',
      rows: OVERWORLD_ROWS,
      legend: OVERWORLD_LEGEND,
      warps: [
        { x: ALDMERE_AT.x, y: ALDMERE_AT.y, toMap: 'aldmere', toX: 16, toY: 27, facing: 'up' },
        { x: CAVE_AT.x, y: CAVE_AT.y, toMap: 'goblinCave', toX: 2, toY: 19, facing: 'up' },
        { x: BROOK_AT.x, y: BROOK_AT.y, toMap: 'brookhollow', toX: 10, toY: 12, facing: 'up' },
        { x: DEN_AT.x, y: DEN_AT.y, toMap: 'wolfDen', toX: 8, toY: 11, facing: 'up' },
        {
          x: PASS_AT.x,
          y: PASS_AT.y,
          toMap: 'southlands',
          toX: SOUTH_PASS_AT.x,
          toY: SOUTH_PASS_AT.y + 1,
          facing: 'down',
          requires: 'actOneComplete',
          lockedLines: ['The southern pass is barred by order of King Aldric.', 'Only the hero of Aldmere may pass.'],
        },
      ],
      npcs: [
        {
          id: 'passGuard',
          x: PASS_AT.x + 1,
          y: PASS_AT.y - 1,
          spriteId: 'guard',
          facing: 'left',
          role: 'talk',
          lines: (s) =>
            s.flags['actOneComplete']
              ? ['GUARD: The king says you may pass. The Southlands lie beyond - sand to the west, marsh to the east.']
              : ['GUARD: None may cross the southern pass without the king\'s leave.', 'Deal with the goblins first, then speak to King Aldric.'],
        },
        bossNpc(
          'giantToad',
          LAKE_AT.x + 1,
          LAKE_AT.y,
          'giantToad',
          {
            monsterIds: ['giantToad'],
            defeatFlag: 'giantToadDefeated',
            lines: ['A toad the size of a cart blocks the shore. It croaks... hungrily.'],
            victory: ['The Giant Toad flops back into the lake and does not return.'],
          },
          (s) => s.quests['brookhollow'] === 'active',
        ),
        bossNpc(
          'boneCaptain',
          RUINS_AT.x - 2,
          RUINS_AT.y - 1,
          'boneCaptain',
          {
            monsterIds: ['boneCaptain', 'skeleton'],
            defeatFlag: 'boneCaptainDefeated',
            lines: ['BONE CAPTAIN: Who disturbs the watch of Thornwick? Join my company... in death!'],
            victory: ['The Bone Captain crumbles to dust. A cold wind leaves the ruins.'],
          },
          (s) => s.quests['thornwick'] === 'active' && s.flags['thornwickNight'] === true,
        ),
      ],
      events: [
        { x: RUINS_AT.x, y: RUINS_AT.y, id: 'thornwick' },
        { x: LAKE_AT.x, y: LAKE_AT.y, id: 'lakeShore' },
      ],
      outsideTile: '^',
      backdrop: 'field',
      fog: true,
    },
  {
      id: 'aldmere',
      name: 'Aldmere',
      rows: ALDMERE_ROWS,
      legend: TOWN_LEGEND,
      warps: [
        { x: 16, y: 28, toMap: 'overworld', toX: ALDMERE_AT.x, toY: ALDMERE_AT.y + 1, facing: 'down' },
        { x: 17, y: 28, toMap: 'overworld', toX: ALDMERE_AT.x, toY: ALDMERE_AT.y + 1, facing: 'down' },
      ],
      npcs: [
        { id: 'king', x: 6, y: 2, spriteId: 'king', facing: 'down', role: 'king', lines: kingLines },
        {
          id: 'guardL',
          x: 4,
          y: 5,
          spriteId: 'guard',
          facing: 'right',
          role: 'talk',
          lines: () => ['GUARD: Long live King Aldric!'],
        },
        {
          id: 'guardR',
          x: 8,
          y: 5,
          spriteId: 'guard',
          facing: 'left',
          role: 'talk',
          lines: (s) =>
            s.flags['bossDefeated']
              ? ['GUARD: You beat the Goblin King? The king will want to hear of it!']
              : ['GUARD: Goblins burned Thornwick, south-east of here. Terrible business.'],
        },
        // The priest stands behind the altar; keepers stand behind their counters (talk across them).
        { id: 'priest', x: 26, y: 2, spriteId: 'priest', facing: 'down', role: 'church' },
        { id: 'itemShop', x: 6, y: 11, spriteId: 'merchant', facing: 'down', role: 'itemShop' },
        { id: 'weaponShop', x: 16, y: 11, spriteId: 'smith', facing: 'down', role: 'weaponShop' },
        { id: 'armorShop', x: 26, y: 11, spriteId: 'guard', facing: 'down', role: 'armorShop' },
        { id: 'innkeeper', x: 21, y: 22, spriteId: 'innkeeper', facing: 'down', role: 'inn' },
        {
          id: 'barkeep',
          x: 6,
          y: 22,
          spriteId: 'villager',
          facing: 'down',
          role: 'talk',
          lines: () => ['BARKEEP: Adventurers come here looking for work. Talk to anyone who catches your eye.'],
        },
        {
          id: 'oldMan',
          x: 6,
          y: 8,
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
          x: 16,
          y: 4,
          spriteId: 'child',
          facing: 'down',
          role: 'talk',
          wander: true,
          lines: () => ['Slimes are weak to fire! My big sister told me.'],
        },
        {
          id: 'woman',
          x: 24,
          y: 17,
          spriteId: 'villager',
          facing: 'left',
          role: 'talk',
          wander: true,
          lines: () => ['Press X or Esc to open your menu. You can heal with Herbs there, too.'],
        },
      ],
      signs: [
        { x: 4, y: 6, kind: 'castle' },
        { x: 24, y: 6, kind: 'chapel' },
        { x: 5, y: 15, kind: 'item' },
        { x: 15, y: 15, kind: 'weapon' },
        { x: 25, y: 15, kind: 'armor' },
        { x: 8, y: 26, kind: 'tavern' },
        { x: 20, y: 26, kind: 'inn' },
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
      warps: [{ x: 2, y: 20, toMap: 'overworld', toX: CAVE_AT.x, toY: CAVE_AT.y + 1, facing: 'down' }],
      npcs: [
        bossNpc('goblinKing', 21, 4, 'goblinKingNpc', {
          monsterIds: ['goblinKing'],
          defeatFlag: 'bossDefeated',
          lines: ['GOBLIN KING: Hrrah! More soft little heroes from Aldmere!', 'I will grind your bones for my throne!'],
          victory: [
            'The Goblin King falls! The cave trembles as his warband scatters.',
            'Behind the throne, someone rattles the bars of a cell...',
            'Return to King Aldric with the news.',
          ],
        }),
        // The Jailer guards his den off the north tunnel from the start, so the key can be won
        // before or after the king falls.
        bossNpc('goblinChief', 5, 3, 'goblinChief', {
          monsterIds: ['goblinChief', 'goblin'],
          defeatFlag: 'goblinChiefDefeated',
          lines: ["GOBLIN JAILER: Intruder! Nobody touches the king's prisoner!"],
          victory: ['The Goblin Jailer drops a heavy iron key... it must open a cell deeper in the cave.'],
        }),
      ],
      events: [],
      outsideTile: '#',
      backdrop: 'cave',
      fog: true,
    },
  {
      id: 'wolfDen',
      name: 'Wolf Den',
      rows: DEN_ROWS,
      legend: DEN_LEGEND,
      warps: [{ x: 8, y: 12, toMap: 'overworld', toX: DEN_AT.x, toY: DEN_AT.y + 1, facing: 'down' }],
      npcs: [
        bossNpc(
          'alphaWolf',
          10,
          1,
          'alphaWolf',
          {
            monsterIds: ['alphaWolf', 'wolf'],
            defeatFlag: 'alphaWolfDefeated',
            lines: ['A huge black wolf rises from a nest of bones. Its yellow eyes fix on you.'],
            victory: ['The Alpha Wolf falls. Without their leader, the pack scatters into the hills.'],
          },
          (s) => s.quests['tavern'] === 'active',
        ),
      ],
      events: [{ x: 10, y: 2, id: 'denNest' }],
      outsideTile: '#',
      backdrop: 'cave',
      fog: true,
    },
  {
      id: 'brookhollow',
      name: 'Brookhollow',
      rows: BROOKHOLLOW_ROWS,
      legend: TOWN_LEGEND,
      warps: [
        { x: 10, y: 13, toMap: 'overworld', toX: BROOK_AT.x, toY: BROOK_AT.y + 1, facing: 'down' },
        { x: 11, y: 13, toMap: 'overworld', toX: BROOK_AT.x, toY: BROOK_AT.y + 1, facing: 'down' },
      ],
      npcs: [
        { id: 'brookInn', x: 4, y: 3, spriteId: 'innkeeper', facing: 'down', role: 'inn' },
        { id: 'brookShop', x: 17, y: 3, spriteId: 'merchant', facing: 'down', role: 'itemShop' },
        {
          id: 'fisher',
          x: 8,
          y: 7,
          spriteId: 'elder',
          facing: 'down',
          role: 'talk',
          wander: true,
          lines: () => [
            'FISHER: Welcome to Brookhollow. The road north runs to Aldmere.',
            'East of the great river the land rises into hills. Goblins nest there.',
          ],
        },
        {
          id: 'brookChild',
          x: 14,
          y: 10,
          spriteId: 'child',
          facing: 'down',
          role: 'talk',
          wander: true,
          lines: () => ['Wolves hunt in the deep woods. Stay on the roads if you are hurt!'],
        },
        {
          id: 'farmer',
          x: 5,
          y: 10,
          spriteId: 'villager',
          facing: 'right',
          role: 'talk',
          lines: (s) =>
            s.flags['bossDefeated']
              ? ['FARMER: The goblin raids have stopped! Bless you, traveler.']
              : ['FARMER: Goblins took half my harvest. Somebody ought to deal with that king of theirs.'],
        },
      ],
      signs: [
        { x: 2, y: 4, kind: 'inn' },
        { x: 19, y: 4, kind: 'item' },
      ],
      events: [],
      outsideTile: 'T',
      backdrop: 'field',
    },
  {
      id: 'southlands',
      name: 'The Southlands',
      rows: generateSouthlands(),
      legend: SOUTHLANDS_LEGEND,
      warps: [
        { x: SOUTH_PASS_AT.x, y: SOUTH_PASS_AT.y, toMap: 'overworld', toX: PASS_AT.x, toY: PASS_AT.y - 1, facing: 'up' },
        { x: SANDHOLLOW_AT.x, y: SANDHOLLOW_AT.y, toMap: 'sandhollow', toX: 12, toY: 12, facing: 'up' },
        { x: SUN_AT.x, y: SUN_AT.y, toMap: 'sunShrine', toX: 9, toY: 13, facing: 'up' },
        { x: MIRE_AT.x, y: MIRE_AT.y, toMap: 'mireShrine', toX: 12, toY: 13, facing: 'up' },
      ],
      npcs: [],
      events: [],
      outsideTile: '^',
      backdrop: 'desert',
      fog: true,
    },
  {
      id: 'sandhollow',
      name: 'Sandhollow',
      rows: SANDHOLLOW_ROWS,
      legend: DESERT_TOWN_LEGEND,
      warps: [
        { x: 12, y: 13, toMap: 'southlands', toX: SANDHOLLOW_AT.x, toY: SANDHOLLOW_AT.y + 1, facing: 'down' },
        { x: 13, y: 13, toMap: 'southlands', toX: SANDHOLLOW_AT.x, toY: SANDHOLLOW_AT.y + 1, facing: 'down' },
      ],
      npcs: [
        { id: 'sandInn', x: 4, y: 3, spriteId: 'innkeeper', facing: 'down', role: 'inn' },
        { id: 'sandItems', x: 10, y: 3, spriteId: 'merchant', facing: 'down', role: 'itemShop', stock: SANDHOLLOW_ITEM_STOCK },
        { id: 'sandSmith', x: 16, y: 3, spriteId: 'smith', facing: 'down', role: 'weaponShop', stock: SOUTH_WEAPON_STOCK },
        { id: 'sandArmorer', x: 22, y: 3, spriteId: 'guard', facing: 'down', role: 'armorShop', stock: SOUTH_ARMOR_STOCK },
        {
          id: 'nomadElder',
          x: 6,
          y: 8,
          spriteId: 'elder',
          facing: 'down',
          role: 'talk',
          wander: true,
          lines: (s) =>
            s.flags['sandWyrmDefeated'] && s.flags['marshWitchDefeated']
              ? ['ELDER: The wells run sweet again and the marsh lights have gone out. Carry the news north, hero.']
              : [
                  'ELDER: Two shrines guard the old seals of the south. Both have been defiled.',
                  'A great Sand Wyrm coils in the Sun Shrine, south-west across the dunes.',
                  'And a witch has taken the Mire Shrine in the eastern marsh. Follow the boardwalk.',
                ],
        },
        {
          id: 'scout',
          x: 18,
          y: 11,
          spriteId: 'villager',
          facing: 'left',
          role: 'talk',
          lines: () => [
            'SCOUT: Scorpions hide in the dunes and lizardmen lurk in the reeds.',
            'Our smith forges finer steel than anything in Aldmere. Worth every coin out here.',
          ],
        },
        {
          id: 'sandChild',
          x: 20,
          y: 8,
          spriteId: 'child',
          facing: 'down',
          role: 'talk',
          wander: true,
          lines: () => ['Wraiths hate holy light! Grandpa says so.'],
        },
      ],
      signs: [
        { x: 2, y: 4, kind: 'inn' },
        { x: 8, y: 4, kind: 'item' },
        { x: 14, y: 4, kind: 'weapon' },
        { x: 20, y: 4, kind: 'armor' },
      ],
      events: [],
      outsideTile: 'T',
      backdrop: 'desert',
    },
  {
      id: 'sunShrine',
      name: 'Sun Shrine',
      rows: SUN_SHRINE_ROWS,
      legend: shrineLegend('sunWall', 'sunFloor'),
      warps: [{ x: 9, y: 14, toMap: 'southlands', toX: SUN_AT.x, toY: SUN_AT.y + 1, facing: 'down' }],
      npcs: [
        bossNpc('sandWyrm', 11, 2, 'sandWyrm', {
          monsterIds: ['sandWyrm'],
          defeatFlag: 'sandWyrmDefeated',
          lines: ['The floor heaves. A great wyrm of sand and bone bursts from the altar!'],
          victory: ['The Sand Wyrm crumbles into the dunes. Sunlight floods the shrine once more.'],
        }),
      ],
      events: [],
      outsideTile: '#',
      backdrop: 'cave',
      fog: true,
    },
  {
      id: 'mireShrine',
      name: 'Mire Shrine',
      rows: MIRE_SHRINE_ROWS,
      legend: shrineLegend('mireWall', 'mireFloor'),
      warps: [{ x: 12, y: 14, toMap: 'southlands', toX: MIRE_AT.x, toY: MIRE_AT.y + 1, facing: 'down' }],
      npcs: [
        bossNpc('marshWitch', 9, 2, 'marshWitch', {
          monsterIds: ['marshWitch', 'lizardman'],
          defeatFlag: 'marshWitchDefeated',
          lines: ['MARSH WITCH: Another fool from the north? The mire will have your bones, little hero!'],
          victory: ['The Marsh Witch shrieks and dissolves into black water. The shrine falls silent.'],
        }),
      ],
      events: [],
      outsideTile: '#',
      backdrop: 'cave',
      fog: true,
    },
];

/**
 * Companion NPCs appear whenever they are present (unlocked and not in the party): at the slot where they are
 * first found, or at their rest spot once they have joined and left the party again.
 */
function withCompanions(m: MapDef): MapDef {
  const npc = (c: CompanionSlot, id: string, at: { x: number; y: number; facing: Facing }, benched: boolean): NpcDef => ({
    id,
    x: at.x,
    y: at.y,
    spriteId: 'villager',
    sprite: (st: GameState) => st.companions[c.id]?.classId ?? 'villager',
    facing: at.facing,
    role: 'companion',
    companionId: c.id,
    visible: (st: GameState) => companionPresent(st, c.id) && (!c.rest || companionBenched(st, c.id) === benched),
  });
  const companions: NpcDef[] = [
    ...COMPANION_SLOTS.filter((c) => c.mapId === m.id).map((c) => npc(c, c.id, { ...c, facing: 'down' }, false)),
    ...COMPANION_SLOTS.filter((c) => c.rest?.mapId === m.id).map((c) => npc(c, `${c.id}Resting`, companionRestSpot(c.id), true)),
  ];
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

/** True for wilds, caves and dens (any map with a tile that can trigger encounters); false for towns. */
export function mapHasEncounters(def: MapDef): boolean {
  return def.legend.some((t) => t.encounterTableId !== undefined);
}

/** Tiles you can talk across to an NPC standing behind them: shop counters, the chapel altar and cell bars. */
const TALK_ACROSS: ReadonlySet<string> = new Set(['counter', 'altar', 'jailBars']);

/** True when the player can talk to an NPC two tiles away across tile `tileId` (e.g. `counter`, `altar@wood`). */
export function talkAcross(tileId: string | undefined): boolean {
  return tileId !== undefined && TALK_ACROSS.has(tileId.split('@')[0]);
}

const SIDES: ReadonlyArray<readonly [number, number]> = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

/**
 * True when a wandering NPC must not step onto (x, y): the approach to a counter, altar or cell bars, the tile
 * in front of a standing NPC (`standing` = positions of visible non-wandering NPCs), or a doorway / one-tile
 * gap between walls. Keeps merchants, priests, kings and companions reachable.
 */
export function wanderBlocked(
  tiles: Pick<TileMap, 'tileAt' | 'isSolid'>,
  standing: ReadonlyArray<{ x: number; y: number }>,
  x: number,
  y: number,
): boolean {
  if (SIDES.some(([dx, dy]) => talkAcross(tiles.tileAt(x + dx, y + dy)?.id))) {
    return true;
  }
  if (standing.some((n) => Math.abs(n.x - x) + Math.abs(n.y - y) === 1)) {
    return true;
  }
  const solid = (dx: number, dy: number): boolean => tiles.isSolid(x + dx, y + dy);
  return (solid(-1, 0) && solid(1, 0)) || (solid(0, -1) && solid(0, 1));
}

/** Where the party wakes up after a defeat (in front of the inn counter). */
export const INN_RESPAWN = { mapId: 'aldmere', x: 21, y: 24, facing: 'up' as Facing };
