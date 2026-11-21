#!/usr/bin/env python3
"""
Builds Jouster Quest's LPC character and monster sheets (game plan 16.7).

Characters are composited from layers of the Universal LPC Spritesheet Character Generator
(https://github.com/LiberatedPixelCup/Universal-LPC-Spritesheet-Character-Generator), recoloured with its
palette definitions. Slime and bat come from the 2012 "LPC Base Assets" pack on OpenGameArt; the wolf and Alpha
Wolf are recoloured from "[LPC] Wolf Animation" on OpenGameArt. Downloads are cached under tmp/lpc-cache
(gitignored).

Outputs:
  apps/jouster-ui/public/game-assets/lpc/characters.png   one row per NPC look, cols = facing x frame; then monsters
  apps/jouster-ui/public/game-assets/lpc/monsters.png     one cell per small monster look
  apps/jouster-ui/public/game-assets/lpc/paperdoll.png    party members' layers (plan §39): walk and battle-pose
                                                          strips (attack/cast, facing right), each cropped to its art
  apps/jouster-ui/public/game-assets/lpc/CREDITS.md       the generated section between markers
  libs/game/quest/src/lib/art/lpc-sprites.generated.ts    row and cell maps used by Art
  libs/game/quest/src/lib/art/lpc-paperdoll.generated.ts  each base, weapon and gear part's layers

Usage (from the repo root; needs Pillow):  python tools/game-assets/build-lpc-sprites.py
"""
from __future__ import annotations

import colorsys
import csv
import hashlib
import io
import json
import os
import sys
import urllib.error
import urllib.request
import zipfile

from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
CACHE = os.path.join(ROOT, 'tmp', 'lpc-cache')
OUT_DIR = os.path.join(ROOT, 'apps', 'jouster-ui', 'public', 'game-assets', 'lpc')
TS_OUT = os.path.join(ROOT, 'libs', 'game', 'quest', 'src', 'lib', 'art', 'lpc-sprites.generated.ts')
PAPERDOLL_TS_OUT = os.path.join(ROOT, 'libs', 'game', 'quest', 'src', 'lib', 'art', 'lpc-paperdoll.generated.ts')
ULPC = 'https://raw.githubusercontent.com/LiberatedPixelCup/Universal-LPC-Spritesheet-Character-Generator/master/'
ULPC_REPO = 'https://github.com/LiberatedPixelCup/Universal-LPC-Spritesheet-Character-Generator'
BASE_ASSETS = 'https://opengameart.org/sites/default/files/lpc_base_assets.zip'
BASE_ASSETS_PAGE = 'https://opengameart.org/content/liberated-pixel-cup-lpc-base-assets-sprites-map-tiles'
WOLF_SHEET = 'https://opengameart.org/sites/default/files/wolfsheet1.png'
WOLF_PAGE = 'https://opengameart.org/content/lpc-wolf-animation'

FRAME = 64
# walk.png rows by facing. The sheet keeps every walk column: 0 is the standing pose and 1-8 the walk cycle
# (3 and 7 are the strides, 1 and 5 the passing poses). STEP_POSE is the half-stride used as the "step" frame of
# the game's two-frame idle bob.
ROWS = {'up': 0, 'left': 1, 'down': 2, 'right': 3}
FACINGS = ('down', 'up', 'left', 'right')
STEP_COLS = tuple(range(9))
STEP_POSE = 4
MONSTER_FACING = 'left'  # battle enemies face the party on the left

# ---------------------------------------------------------------------------------------------------------
# Recipes. Item = (definition path under sheet_definitions/, spec)
#   spec None             -> layer as shipped
#   'v:<variant>'         -> pre-coloured variant file
#   '<material>:<to>'     -> recolour from the definition's (or material's) base palette to <to>
#   '<material>:<from>><to>'
# ---------------------------------------------------------------------------------------------------------
HEAD_M = 'head/heads/human/heads_human_male'
HEAD_F = 'head/heads/human/heads_human_female'
HEAD_OLD = 'head/heads/human/heads_human_male_elderly'
HEAD_CHILD = 'head/heads/human/heads_human_child'
HEAD_GOBLIN = 'head/heads/fantasy/heads_goblin'
HEAD_SKULL = 'head/heads/undead/heads_skeleton'
BODY = 'body/body'
SKELETON = 'body/special/body_skeleton'
PANTS = 'legs/pants/legs_pants'
SKIRT = 'legs/skirts/legs_skirts_plain'
BOOTS = 'feet/boots/feet_boots_basic'
SHOES = 'feet/shoes/feet_shoes_basic'
LONG = 'torso/shirts/longsleeve/torso_clothes_longsleeve'
SHORT = 'torso/shirts/shortsleeve/torso_clothes_shortsleeve'
SLEEVELESS = 'torso/shirts/sleeveless/torso_clothes_sleeveless'
LEATHER = 'torso/armour/torso_armour_leather'
PLATE = 'torso/armour/torso_armour_plate'
CHAIN = 'torso/torso_chainmail'
CAPE = 'torso/cape/cape_solid'
HAIR_PLAIN = 'hair/short/hair_plain'
HAIR_MESSY = 'hair/short/hair_messy1'
HAIR_BOB = 'hair/bob/hair_bob'
HAIR_PONY = 'hair/braids/hair_ponytail'
HAIR_BALD = 'hair/bald/hair_balding'
HAIR_BUZZ = 'hair/bald/hair_buzzcut'
BEARD = 'hair/beards/beards_beard'
BEARD_LONG = 'hair/beards/beards_winter'
SWORD = 'weapons/sword/weapon_sword_arming'
DAGGER = 'weapons/sword/weapon_sword_dagger'
MACE = 'weapons/blunt/weapon_blunt_mace'
STAFF = 'weapons/magic/weapon_magic_gnarled'
BOW = 'weapons/ranged/bow/weapon_ranged_bow_normal'
SPEAR = 'weapons/polearm/weapon_polearm_spear'
SCYTHE = 'weapons/polearm/weapon_polearm_scythe'
CANE = 'weapons/polearm/weapon_polearm_cane'
NASAL = 'headwear/helmets/helmets/hat_helmet_nasal'
ARMET = 'headwear/helmets/helmets/hat_helmet_armet'
KETTLE = 'headwear/helmets/helmets/hat_helmet_kettle'
HOOD = 'headwear/coverings/hoods/hat_hood_cloth'
CAP = 'headwear/hats/caps/hat_cap_leather'
WIZARD_HAT = 'headwear/hats/magic/hat_magic_wizard'
CROWN = 'headwear/hats/formal/hat_formal_crown'
# Gear layers for the paperdoll (plan §39).
ROBE = 'torso/shirts/torso_clothes_robe'
BOOTS_FOLD = 'feet/boots/feet_boots_fold'
ARMS_PLATE = 'arms/arms_armour'
LEGS_PLATE = 'legs/legs_armour'
FEET_PLATE = 'feet/feet_armour'
TABARD = 'torso/jacket/torso_jacket_tabard'
BELT_LEATHER = 'torso/waist/belt_leather'
BELT_ROBE = 'torso/waist/belt_robe'
MAIL_HELM = 'headwear/helmets/helmets/hat_helmet_mail'
GREATHELM = 'headwear/helmets/helmets/hat_helmet_greathelm'
HORNED = 'headwear/helmets/helmets/hat_helmet_horned'
CELESTIAL = 'headwear/hats/magic/hat_magic_celestial'
NECKLACE = 'headwear/neck/neck_necklace_simple'
CHARM_OVAL = 'headwear/neck/charms/neck_charm_oval'
AMULET = 'headwear/neck/charms/neck_amulet_dangle'
GEM_ROUND = 'headwear/neck/charms/neck_gem_round'
GEM_TRILLIANT = 'headwear/neck/charms/neck_gem_trilliant'
SHIELD_ROUND = 'weapons/shields/shield_round'
SHIELD_KITE = 'weapons/shields/shield_kite'
SHIELD_SCUTUM = 'weapons/shields/scutum/shield_scutum'
SHIELD_SCUTUM_TRIM = 'weapons/shields/scutum/shield_scutum_trim'
SHIELD_HEATER = 'weapons/shields/heater/shield_heater_wood'
SHIELD_HEATER_TRIM = 'weapons/shields/heater/shield_heater_trim'
SHIELD_SPARTAN = 'weapons/shields/shield_spartan'
GLOWSWORD = 'weapons/sword/weapon_sword_glowsword'
LONGSWORD = 'weapons/sword/weapon_sword_longsword'
FLAIL = 'weapons/blunt/weapon_blunt_flail'
STAFF_LOOP = 'weapons/magic/weapon_magic_loop'
STAFF_DIAMOND = 'weapons/magic/weapon_magic_diamond'
STAFF_S = 'weapons/magic/weapon_magic_s'
BOW_RECURVE = 'weapons/ranged/bow/weapon_ranged_bow_recurve'
BOW_GREAT = 'weapons/ranged/bow/weapon_ranged_bow_great'

# Metal colours ULPC has no palette for, derived from its steel ramp: (hue in degrees, saturation, value scale).
CUSTOM_METALS = {
    'frost': (200, 0.4, 1.05),
    'dragon': (358, 0.75, 0.72),
    'obsidian': (265, 0.3, 0.45),
    'cinder': (18, 0.35, 0.55),
}


def human(body: str, skin: str, head: str, *items) -> dict:
    return {'body': body, 'items': [(BODY, f'body:{skin}'), (head, f'body:light>{skin}'), *items]}


def goblin(skin: str, *items) -> dict:
    return {'body': 'male', 'items': [(BODY, f'body:{skin}'), (HEAD_GOBLIN, f'body:green>{skin}'), *items]}


def skeleton(*items) -> dict:
    return {'body': 'male', 'items': [(SKELETON, None), (HEAD_SKULL, None), *items]}


LOOKS = {
    'king': human('male', 'light', HEAD_OLD, (BEARD_LONG, 'hair:gray'), (SKIRT, 'cloth:purple'), (SHOES, 'cloth:black'),
                  (LONG, 'cloth:purple'), (CAPE, 'cloth:red'), (CROWN, 'v:crown_gold')),
    'guard': human('male', 'light', HEAD_M, (HAIR_BUZZ, 'hair:dark_brown'), (PANTS, 'cloth:navy'), (BOOTS, 'cloth:black'),
                   (CHAIN, 'metal:iron'), ('torso/jacket/torso_jacket_tabard', 'v:blue'), (KETTLE, None), (SPEAR, 'v:medium')),
    'priest': human('male', 'light', HEAD_OLD, (HAIR_BALD, 'hair:gray'), (SKIRT, 'cloth:white'), (SHOES, 'cloth:tan'),
                    (LONG, 'cloth:white'), ('torso/waist/belt_robe', 'v:white')),
    'merchant': human('male', 'light', HEAD_M, (HAIR_PLAIN, 'hair:dark_brown'), (PANTS, 'cloth:charcoal'),
                      (SHOES, 'cloth:brown'), (LONG, 'cloth:teal'), ('torso/vest/torso_clothes_vest', 'v:brown'),
                      (CAP, 'v:maroon')),
    'smith': human('male', 'bronze', HEAD_M, (HAIR_BUZZ, 'hair:black'), (BEARD, 'hair:black'), (PANTS, 'cloth:brown'),
                   (BOOTS, 'cloth:black'), (SLEEVELESS, 'v:charcoal'), ('torso/aprons/torso_aprons_apron', 'v:leather')),
    'innkeeper': human('female', 'light', HEAD_F, (HAIR_BOB, 'hair:ginger'), (SKIRT, 'cloth:brown'), (SHOES, 'cloth:brown'),
                       ('torso/shirts/torso_clothes_blouse', 'v:white'), ('torso/aprons/torso_aprons_apron', 'v:maroon')),
    'recruit': human('male', 'light', HEAD_M, (HAIR_MESSY, 'hair:chestnut'), (PANTS, 'cloth:brown'), (BOOTS, 'cloth:brown'),
                     (SHORT, 'cloth:red'), (SWORD, 'v:iron')),
    'villager': human('male', 'light', HEAD_M, (HAIR_PLAIN, 'hair:light_brown'), (PANTS, 'cloth:brown'),
                      (SHOES, 'cloth:brown'), (SHORT, 'cloth:tan')),
    'elder': human('male', 'light', HEAD_OLD, (HAIR_BALD, 'hair:white'), (BEARD_LONG, 'hair:white'), (SKIRT, 'cloth:purple'),
                   (SHOES, 'cloth:brown'), (LONG, 'cloth:lavender'), (CANE, 'v:cane')),
    'child': human('child', 'light', HEAD_CHILD, ('legs/pants/legs_childpants', 'v:blue'),
                   ('torso/shirts/torso_clothes_child_shirt', 'v:red')),
    'prisoner': human('male', 'light', HEAD_M, (HAIR_MESSY, 'hair:dark_brown'), (PANTS, 'cloth:gray'),
                      (SLEEVELESS, 'v:gray')),
    'goblinKingNpc': goblin('green', (PANTS, 'cloth:purple'), (BOOTS, 'cloth:black'), (LONG, 'cloth:purple'),
                            (CAPE, 'cloth:purple'), (CROWN, 'v:crown_gold')),
}

# ---------------------------------------------------------------------------------------------------------
# Paperdoll (plan §39): party members are layered at run time, so the armour, shield, accessory and weapon they
# wear show on them. Each class has a plain base (body, head, hair and basic clothes, what a new hero wears); every
# weapon and piece of gear adds its layers for each class that can use it. `paperdoll.png` holds every layer once
# (walk and battle-pose strips); `lpc-paperdoll.generated.ts` lists each part's layers.
# ---------------------------------------------------------------------------------------------------------
CLASS_BODIES = {'warrior': 'male', 'wizard': 'male', 'necromancer': 'male', 'cleric': 'female', 'rogue': 'male',
                'ranger': 'female'}
CLASSES = tuple(CLASS_BODIES)
CASTERS = ('wizard', 'necromancer', 'cleric')
SCOUTS = ('rogue', 'ranger')
LEATHER_WEARERS = ('warrior', 'necromancer', 'cleric', 'rogue', 'ranger')
MAIL_WEARERS = ('warrior', 'cleric', 'ranger')


def plain(body: str, skin: str, head: str, shirt: str, *hair) -> dict:
    """An unarmoured party member: an undyed shirt, brown trousers and plain shoes."""
    return human(body, skin, head, *hair, (SHORT, f'cloth:{shirt}'), (PANTS, 'cloth:brown'), (SHOES, 'cloth:brown'))


PARTY_BASES = {
    'warrior': plain('male', 'light', HEAD_M, 'tan', (HAIR_PLAIN, 'hair:chestnut')),
    'wizard': plain('male', 'light', HEAD_OLD, 'white', (HAIR_BALD, 'hair:white'), (BEARD_LONG, 'hair:white')),
    'necromancer': plain('male', 'light', HEAD_M, 'gray', (HAIR_PLAIN, 'hair:black')),
    'cleric': plain('female', 'light', HEAD_F, 'white', (HAIR_BOB, 'hair:light_brown')),
    'rogue': plain('male', 'olive', HEAD_M, 'charcoal', (HAIR_MESSY, 'hair:black')),
    'ranger': plain('female', 'light', HEAD_F, 'tan', (HAIR_PONY, 'hair:ginger')),
}


def worn(classes, *items, **extra):
    """A gear look: the same layers for every class that can use it, plus `extra` layers per class."""
    return tuple(classes), lambda cls: [*items, *extra.get(cls, ())]


def robe(male_cloth: str, female_robe: str, hat: tuple, hood: str = 'black'):
    """A caster's robe (long sleeves and a skirt on male bodies, a robe on female ones), the Wizard's hat and the
    Necromancer's hood."""
    def items(cls: str) -> list:
        out = ([(ROBE, f'v:{female_robe}'), (BELT_ROBE, 'v:white')] if CLASS_BODIES[cls] == 'female'
               else [(LONG, f'cloth:{male_cloth}'), (SKIRT, f'cloth:{male_cloth}')])
        if cls == 'wizard':
            out.append(hat)
        if cls == 'necromancer':
            out.append((HOOD, f'cloth:{hood}'))
        return out
    return CASTERS, items


def leather(classes, colour: str):
    """Leather armour (recoloured from the shipped brown), with the Rogue's hood and the Ranger's cap to match."""
    spec = None if colour == 'leather' else f'cloth:leather>{colour}'
    cap = 'forest' if colour == 'leather' else colour
    hood = 'charcoal' if colour == 'leather' else colour
    return worn(classes, (LEATHER, spec), rogue=[(HOOD, f'cloth:{hood}')], ranger=[(CAP, f'v:{cap}')])


def mail(metal: str, tabard: str | None = None):
    """Mail over the shirt (and a tabard from tier 3), with a mail coif for the Warrior and a cap for the Ranger."""
    items = [(CHAIN, f'metal:{metal}')] + ([(TABARD, f'v:{tabard}')] if tabard else [])
    return worn(MAIL_WEARERS, *items, warrior=[(MAIL_HELM, f'metal:{metal}')], ranger=[(CAP, 'v:forest')])


def plate(metal: str, helm: str):
    """Full plate: cuirass, arms, legs, sabatons and a helm, all of one metal."""
    return worn(('warrior',), *[(p, f'metal:{metal}') for p in (PLATE, ARMS_PLATE, LEGS_PLATE, FEET_PLATE, helm)])


def weapon(cls: str, def_path: str, spec: str):
    return worn((cls,), (def_path, spec))


# Every weapon and gear id in data/equipment.ts and data/gear.ts. An empty look (a ring) draws nothing.
GEAR_LOOKS = {
    # Armour
    'clothRobe': worn(CLASSES, (LONG, 'cloth:walnut'), (BELT_LEATHER, 'v:leather')),
    'leatherArmor': leather(LEATHER_WEARERS, 'leather'),
    'sageRobe': robe('blue', 'blue', (WIZARD_HAT, 'v:blue')),
    'chainMail': mail('steel'),
    'plateArmor': plate('steel', ARMET),
    'mirageRobe': robe('tan', 'brown', (WIZARD_HAT, 'v:tan'), hood='maroon'),
    'shadowLeather': leather(SCOUTS, 'black'),
    'scaleMail': mail('gold'),
    'sunPlate': plate('gold', ARMET),
    'auroraRobe': robe('sky', 'white', (CELESTIAL, 'v:sky'), hood='slate'),
    'snowcatLeather': leather(SCOUTS, 'white'),
    'frostMail': mail('silver', 'sky'),
    'glacierPlate': plate('frost', GREATHELM),
    'emberSilk': robe('red', 'red', (WIZARD_HAT, 'v:red'), hood='maroon'),
    'drakehide': leather(SCOUTS, 'maroon'),
    'cinderMail': mail('cinder', 'maroon'),
    'dragonPlate': plate('dragon', HORNED),
    # Shields (Warrior)
    'buckler': worn(('warrior',), (SHIELD_ROUND, 'v:brown')),
    'kiteShield': worn(('warrior',), (SHIELD_KITE, 'v:kite gray blue')),
    'towerShield': worn(('warrior',), (SHIELD_SCUTUM, 'v:scutum+cloth:white>maroon'), (SHIELD_SCUTUM_TRIM, 'v:scutum_trim')),
    'wyvernShield': worn(('warrior',), (SHIELD_HEATER, 'wood:walnut'), (SHIELD_HEATER_TRIM, 'metal:silver')),
    'basaltShield': worn(('warrior',), (SHIELD_SPARTAN, 'v:spartan')),
    # Accessories (anyone)
    'vigorRing': worn(CLASSES),
    'swiftBoots': worn(CLASSES, (BOOTS_FOLD, 'cloth:walnut')),
    'sageCharm': worn(CLASSES, (CHARM_OVAL, 'v:bronze')),
    'scarabAmulet': worn(CLASSES, (AMULET, 'v:gold_blue')),
    'frostCharm': worn(CLASSES, (NECKLACE, 'v:silver'), (GEM_TRILLIANT, 'v:blue')),
    'emberHeart': worn(CLASSES, (NECKLACE, 'v:gold'), (GEM_ROUND, 'v:red')),
    # Weapons: swords (Warrior)
    'bronzeSword': weapon('warrior', SWORD, 'v:bronze'),
    'ironSword': weapon('warrior', SWORD, 'v:iron'),
    'sunSteelSword': weapon('warrior', SWORD, 'v:gold'),
    'frostbrandSword': weapon('warrior', GLOWSWORD, 'v:blue'),
    'dragonfangSword': weapon('warrior', LONGSWORD, 'v:longsword'),
    # Scythes (Necromancer): one shape, the blade recoloured per tier
    'boneScythe': weapon('necromancer', SCYTHE, 'v:scythe+metal:steel>ceramic'),
    'graveScythe': weapon('necromancer', SCYTHE, 'v:scythe+metal:steel>iron'),
    'duneReaper': weapon('necromancer', SCYTHE, 'v:scythe+metal:steel>gold'),
    'frostreapScythe': weapon('necromancer', SCYTHE, 'v:scythe+metal:steel>frost'),
    'soulfireScythe': weapon('necromancer', SCYTHE, 'v:scythe+metal:steel>obsidian'),
    # Staves (Wizard)
    'oakStaff': weapon('wizard', STAFF, 'v:medium'),
    'runeStaff': weapon('wizard', STAFF_LOOP, 'v:medium'),
    'mirageStaff': weapon('wizard', STAFF_DIAMOND, 'v:gold'),
    'auroraStaff': weapon('wizard', STAFF_DIAMOND, 'v:silver'),
    'cinderStaff': weapon('wizard', STAFF_S, 'v:dark'),
    # Maces (Cleric): the mace's head is repainted per tier
    'woodMace': weapon('cleric', MACE, 'v:mace+tone:wood:oak'),
    'ironMace': weapon('cleric', MACE, 'v:mace+tone:metal:iron'),
    'sunMace': weapon('cleric', FLAIL, 'v:flail+tone:metal:gold'),
    'rimeMace': weapon('cleric', FLAIL, 'v:flail+tone:metal:frost'),
    'obsidianMace': weapon('cleric', MACE, 'v:mace+tone:metal:obsidian'),
    # Daggers (Rogue)
    'twinDaggers': weapon('rogue', DAGGER, 'v:dagger+metal:steel>bronze'),
    'steelDaggers': weapon('rogue', DAGGER, 'v:dagger'),
    'fangDaggers': weapon('rogue', DAGGER, 'v:dagger+metal:steel>gold'),
    'icicleDaggers': weapon('rogue', DAGGER, 'v:dagger+metal:steel>frost'),
    'emberDaggers': weapon('rogue', DAGGER, 'v:dagger+metal:steel>dragon'),
    # Knives (Ranger): the bow on the back is what shows, and it is what she shoots with
    'huntKnife': weapon('ranger', BOW, 'v:medium'),
    'longKnife': weapon('ranger', BOW, 'v:dark'),
    'duneKnife': weapon('ranger', BOW_RECURVE, 'v:light'),
    'wolfsbaneKnife': weapon('ranger', BOW_RECURVE, 'v:silver'),
    'drakeKnife': weapon('ranger', BOW_GREAT, 'v:red'),
}

# Humanoid monsters: one look per variant (index order matches monsterVariantCount; bosses have one).
HUMANOID_MONSTERS = {
    'goblin': [
        goblin('green', (PANTS, 'cloth:brown'), (LEATHER, None), (DAGGER, 'v:dagger')),
        goblin('dark_green', (PANTS, 'cloth:navy'), (SLEEVELESS, 'v:blue'), (SPEAR, 'v:dark')),
        goblin('pale_green', (PANTS, 'cloth:charcoal'), (SLEEVELESS, 'v:maroon'), (MACE, 'v:mace')),
    ],
    'skeleton': [
        skeleton((DAGGER, 'v:dagger')),
        skeleton((LEATHER, None), (SWORD, 'v:iron')),
        skeleton((NASAL, 'metal:iron'), (SPEAR, 'v:dark')),
    ],
    'goblinKing': [goblin('green', (PANTS, 'cloth:purple'), (LONG, 'cloth:purple'), (CAPE, 'cloth:purple'),
                          (CROWN, 'v:crown_gold'), (MACE, 'v:mace'))],
    'goblinChief': [goblin('dark_green', (PANTS, 'cloth:maroon'), (PLATE, 'metal:iron'), (NASAL, 'metal:bronze'),
                           (SPEAR, 'v:medium'))],
    'boneCaptain': [skeleton((PLATE, 'metal:bronze'), (CAPE, 'cloth:red'), (ARMET, 'metal:bronze'), (SWORD, 'v:gold'))],
}

# Small monsters from the LPC Base Assets: (file, hue shifts in degrees, one per variant (0 = as drawn),
# animation as source columns in play order, frames per second). The slime squashes (1) and stretches (2) from
# its resting shape (0); the bat beats its wings. monsters.png has one row per animation frame.
SMALL_MONSTERS = {
    'slime': ('slime.png', [0, 150, -120, -160, -70, 60], [0, 1, 2, 1], 6),
    'bat': ('bat.png', [0, 140, 100], [0, 1, 2, 1], 10),
}
SMALL_CELL = 32
SMALL_ROW = 1  # facing left (rows: up, left, down, right)

# Beasts from "[LPC] Wolf Animation": the left-facing standing frame (64x32 at x 320, y 256 of the sheet),
# stood on the bottom of a 64x64 characters.png cell. Looks: (saturation scale, value curve, eye colour),
# matching the procedural palettes (grey, brown and white wolf; dark, gold-eyed Alpha Wolf).
WOLF_FRAME = (320, 256, 384, 288)
BEASTS = {
    'wolf': [(0.12, (1.1, 0.0), (255, 64, 64)), (1.0, (1.0, 0.0), (255, 64, 64)), (0.08, (1.3, 0.25), (64, 160, 255))],
    'alphaWolf': [(0.15, (0.6, 0.0), (255, 208, 32))],
}

# Battle poses for the playable classes (plan 16.4 item 4c), facing right like the party: the class weapon's
# attack animation and, for spell casters, `spellcast`. Weapons with oversized custom animations (frames
# bigger than 64 px, base frames centred in them) are composited on a POSE_CANVAS square, then every pose frame
# is cropped to one shared box (the pose cell) before its layer strip is cropped to its art for paperdoll.png.
POSE_FACING = 'right'
POSES = {
    'warrior': {'attack': 'slash'},
    'wizard': {'attack': 'thrust', 'cast': 'spellcast'},
    'necromancer': {'attack': 'slash', 'cast': 'spellcast'},
    'cleric': {'attack': 'slash', 'cast': 'spellcast'},
    'rogue': {'attack': 'slash'},
    'ranger': {'attack': 'shoot'},
}
OVERSIZE = {'slash_128': ('slash', 128), 'slash_oversize': ('slash', 192), 'thrust_oversize': ('thrust', 192)}
POSE_CANVAS = 192
# ULPC draws the bow-shoot body 1px left of the walk frames; shift it back so the head does not jump.
POSE_NUDGE = {'shoot': (1, 0)}


# ---------------------------------------------------------------------------------------------------------
def fetch(url: str, rel: str) -> bytes:
    path = os.path.join(CACHE, rel.replace('/', os.sep))
    if not os.path.exists(path):
        os.makedirs(os.path.dirname(path), exist_ok=True)
        try:
            with urllib.request.urlopen(url) as res:
                data = res.read()
        except urllib.error.HTTPError as err:
            raise FileNotFoundError(f'{err.code} fetching {url}') from err
        with open(path, 'wb') as f:
            f.write(data)
    with open(path, 'rb') as f:
        return f.read()


def ulpc(rel: str) -> bytes:
    return fetch(ULPC + rel, 'ulpc/' + rel)


def definition(def_path: str) -> dict:
    return json.loads(ulpc(f'sheet_definitions/{def_path}.json'))


def palette(material: str, name: str) -> list[tuple[int, int, int]]:
    if material == 'metal' and name in CUSTOM_METALS:
        hue, sat, scale = CUSTOM_METALS[name]
        out = []
        for r, g, b in palette('metal', 'steel'):
            v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)[2]
            # Shadows take the full tint and highlights stay paler, like polished metal.
            r2, g2, b2 = colorsys.hsv_to_rgb(hue / 360, min(1.0, sat * (1.25 - v * 0.6)), min(1.0, v * scale))
            out.append((round(r2 * 255), round(g2 * 255), round(b2 * 255)))
        return out
    pal = json.loads(ulpc(f'palette_definitions/{material}/{material}_ulpc.json'))
    if name not in pal:
        sys.exit(f'Unknown {material} palette colour {name!r}; choose from {sorted(pal)}')
    return [tuple(int(h.lstrip('#')[i:i + 2], 16) for i in (0, 2, 4)) for h in pal[name]]


def material_base(material: str) -> str:
    return json.loads(ulpc(f'palette_definitions/{material}/meta_{material}.json'))['base']


def recolor(img: Image.Image, src: list, dst: list) -> Image.Image:
    img = img.convert('RGBA')
    px = img.load()
    for y in range(img.height):
        for x in range(img.width):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            for i, (sr, sg, sb) in enumerate(src):
                if abs(r - sr) <= 1 and abs(g - sg) <= 1 and abs(b - sb) <= 1 and i < len(dst):
                    px[x, y] = (*dst[i], a)
                    break
    return img


def tone(img: Image.Image, pal: list) -> Image.Image:
    """
    Repaints the grey (metal) pixels of a pre-coloured layer along `pal` by brightness, keeping coloured pixels
    (wooden hafts, leather grips) as drawn. For weapons whose ULPC art has one colour and no palette to swap.
    """
    img = img.copy()
    px = img.load()
    ramp = sorted(pal, key=lambda c: c[0] * 0.3 + c[1] * 0.59 + c[2] * 0.11)
    greys = {}
    for y in range(img.height):
        for x in range(img.width):
            r, g, b, a = px[x, y]
            if a and colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)[1] < 0.3:
                greys[(x, y)] = r * 0.3 + g * 0.59 + b * 0.11
    if not greys:
        return img
    lo, hi = min(greys.values()), max(greys.values())
    for (x, y), lum in greys.items():
        t = (lum - lo) / (hi - lo) if hi > lo else 0.5
        px[x, y] = (*ramp[round(t * (len(ramp) - 1))], px[x, y][3])
    return img


def spec_variant(spec: str | None) -> str | None:
    return spec[2:].split('+')[0].replace(' ', '_') if spec and spec.startswith('v:') else None


def apply_spec(img: Image.Image, spec: str | None, d: dict) -> Image.Image:
    """
    Recolours a layer image per a '<material>:[<from>>]<to>' spec (variant specs are pre-coloured files). A variant
    may add '+<material>:<from>><to>' (a palette swap on the variant) or '+tone:<material>:<name>' (see `tone`).
    """
    if spec and '+' in spec:
        spec, extra = spec.split('+', 1)
        img = apply_spec(img, spec, d)
        if extra.startswith('tone:'):
            material, name = extra[len('tone:'):].split(':', 1)
            return tone(img, palette(material, name))
        return apply_spec(img, extra, {})
    if spec and not spec.startswith('v:'):
        material, colours = spec.split(':', 1)
        src_name, dst_name = colours.split('>') if '>' in colours else (None, colours)
        if src_name is None:
            base = (d.get('recolors') or {}).get('base')
            src_name = base.split('.')[-1] if base else material_base(material)
        if src_name != dst_name:
            img = recolor(img, palette(material, src_name), palette(material, dst_name))
    return img


def layer_images(def_path: str, spec: str | None, body: str, used: set[str]) -> list[tuple[int, Image.Image]]:
    d = definition(def_path)
    out = []
    for key, layer in d.items():
        custom = layer.get('custom_animation') if key.startswith('layer_') else None
        if not key.startswith('layer_') or custom not in (None, 'walk_128'):
            continue
        path = layer.get(body) or layer.get('male')
        if not path:
            continue
        path = path.rstrip('/')
        variant = spec_variant(spec)
        if custom:
            rel = f'{path}/{variant}.png'
        elif variant:
            rel = f'{path}/walk/{variant}.png'
        else:
            rel = f'{path}/walk.png'
        try:
            img = Image.open(io.BytesIO(ulpc('spritesheets/' + rel))).convert('RGBA')
        except FileNotFoundError:
            continue  # this layer has no walk art (e.g. a bow's walk lives in its walk_128 layer)
        if custom:
            img = shrink_128(img)
        img = apply_spec(img, spec, d)
        used.add(f'{path}/{"walk_128" if custom else "walk"}.png')
        out.append((int(layer.get('zPos', 0)), img))
    if not out:
        sys.exit(f'{def_path}: no walk layer for body {body!r}')
    return out


def pose_layers(def_path: str, spec: str | None, body: str, anim: str, used: set[str],
                missing: list[str]) -> list[tuple[int, list[Image.Image]]]:
    """
    One definition's layers for `anim`, facing POSE_FACING: (zPos, frames on POSE_CANVAS squares). A weapon with
    an oversized custom animation for `anim` uses only those layers; otherwise each plain layer contributes its
    `<anim>` sheet if it has one (layers without it are listed in `missing`).
    """
    d = definition(def_path)
    layers = [(k, layer) for k, layer in d.items() if k.startswith('layer_')]
    oversize = [(k, layer) for k, layer in layers if OVERSIZE.get(layer.get('custom_animation'), ('',))[0] == anim]
    chosen = oversize or [(k, layer) for k, layer in layers if not layer.get('custom_animation')]
    variant = spec_variant(spec)
    out = []
    for key, layer in chosen:
        path = (layer.get(body) or layer.get('male') or '').rstrip('/')
        if not path:
            continue
        custom = layer.get('custom_animation')
        if custom:
            rel, size, credit = f'{path}/{variant}.png', OVERSIZE[custom][1], f'{path}/{custom}.png'
        else:
            rel = f'{path}/{anim}/{variant}.png' if variant else f'{path}/{anim}.png'
            size, credit = FRAME, f'{path}/{anim}.png'
        try:
            img = Image.open(io.BytesIO(ulpc('spritesheets/' + rel))).convert('RGBA')
        except FileNotFoundError:
            missing.append(f'{anim}: {def_path} {key}')
            continue
        row = ROWS[POSE_FACING]
        if img.height < (row + 1) * size:
            missing.append(f'{anim}: {def_path} {key} (no {POSE_FACING} row)')
            continue
        strip = apply_spec(img.crop((0, row * size, img.width, (row + 1) * size)), spec, d)
        off = (POSE_CANVAS - size) // 2
        frames = []
        for c in range(strip.width // size):
            cell = Image.new('RGBA', (POSE_CANVAS, POSE_CANVAS))
            cell.paste(strip.crop((c * size, 0, (c + 1) * size, size)), (off, off))
            frames.append(cell)
        used.add(credit)
        out.append((int(layer.get('zPos', 0)), frames))
    return out


def paperdoll_parts() -> dict[str, tuple[str, str, list]]:
    """Every part to layer, as `part@class` -> (body, class, items): each class's base, then each gear look for every
    class that can use it."""
    parts = {f'base@{cls}': (look['body'], cls, look['items']) for cls, look in PARTY_BASES.items()}
    for gid, (classes, items) in GEAR_LOOKS.items():
        for cls in classes:
            parts[f'{gid}@{cls}'] = (CLASS_BODIES[cls], cls, items(cls))
    return parts


def digest(frames: list[Image.Image]) -> str:
    h = hashlib.sha1()
    for f in frames:
        h.update(f.tobytes())
    return h.hexdigest()


def nudged(frames: list[Image.Image], by: tuple[int, int]) -> list[Image.Image]:
    if by == (0, 0):
        return frames
    out = []
    for f in frames:
        cell = Image.new('RGBA', f.size)
        cell.alpha_composite(f, by)
        out.append(cell)
    return out


def build_paperdoll(used: set[str], missing: list[str]):
    """
    Walk rows (36 frames: facing x step) and battle-pose strips for every layer of every part, each stored once, and
    the manifest: part -> (walk layers [(z, row)], poses {anim: [(z, strip)]}). Fully transparent layers are dropped.
    """
    walk_rows: list[list[Image.Image]] = []
    walk_index: dict[str, int] = {}
    strips: list[list[Image.Image]] = []
    strip_index: dict[str, int] = {}
    manifest = {}
    for key, (body, cls, items) in paperdoll_parts().items():
        walk, poses = [], {}
        for def_path, spec in items:
            for z, sheet in layer_images(def_path, spec, body, used):
                frames = [frame(sheet, f, c) for f in FACINGS for c in STEP_COLS]
                if not any(f.getbbox() for f in frames):
                    continue
                h = digest(frames)
                if h not in walk_index:
                    walk_index[h] = len(walk_rows)
                    walk_rows.append(frames)
                walk.append((z, walk_index[h]))
            for anim in POSES[cls].values():
                for z, fs in pose_layers(def_path, spec, body, anim, used, missing):
                    fs = nudged(fs, POSE_NUDGE.get(anim, (0, 0)))
                    if not any(f.getbbox() for f in fs):
                        continue
                    h = digest(fs)
                    if h not in strip_index:
                        strip_index[h] = len(strips)
                        strips.append(fs)
                    poses.setdefault(anim, []).append((z, strip_index[h]))
        manifest[key] = (walk, poses)
    return walk_rows, strips, manifest


def pack_shelves(sizes: list[tuple[int, int]], width: int) -> tuple[list[tuple[int, int]], int]:
    """Shelf packing, tallest strips first: (x, y) per strip and the sheet height."""
    at: list[tuple[int, int]] = [(0, 0)] * len(sizes)
    shelves: list[list[int]] = []  # [y, height, used width]
    for i in sorted(range(len(sizes)), key=lambda i: (-sizes[i][1], -sizes[i][0])):
        w, h = sizes[i]
        shelf = next((s for s in shelves if s[2] + w <= width and h <= s[1]), None)
        if shelf is None:
            shelf = [shelves[-1][0] + shelves[-1][1] if shelves else 0, h, 0]
            shelves.append(shelf)
        at[i] = (shelf[2], shelf[0])
        shelf[2] += w
    return at, (shelves[-1][0] + shelves[-1][1] if shelves else 0)


def tight_strip(frames: list[Image.Image], box: tuple[int, int, int, int]) -> tuple[list[Image.Image], int, int]:
    """Frames cropped to the cell `box`, then to their union bounding box: (frames, x and y offset in the cell)."""
    cells = [f.crop(box) for f in frames]
    left, top, right, bottom = cells[0].width, cells[0].height, 0, 0
    for c in cells:
        bb = c.getbbox()
        if bb:
            left, top, right, bottom = min(left, bb[0]), min(top, bb[1]), max(right, bb[2]), max(bottom, bb[3])
    return [c.crop((left, top, right, bottom)) for c in cells], left, top


def pose_box(frames: list[Image.Image]) -> tuple[int, int, int, int]:
    """Union bounding box of pose frames, on even pixels (the art is drawn at density 2)."""
    left, top, right, bottom = POSE_CANVAS, POSE_CANVAS, 0, 0
    for f in frames:
        bb = f.getbbox()
        if bb:
            left, top = min(left, bb[0]), min(top, bb[1])
            right, bottom = max(right, bb[2]), max(bottom, bb[3])
    return left - left % 2, top - top % 2, right + right % 2, bottom + bottom % 2


def shrink_128(img: Image.Image) -> Image.Image:
    """Centre-crops every 128x128 frame of a `walk_128` layer to the standard 64x64 walk grid."""
    cols, rows = img.width // 128, img.height // 128
    out = Image.new('RGBA', (cols * FRAME, rows * FRAME))
    for r in range(rows):
        for c in range(cols):
            out.paste(img.crop((c * 128 + 32, r * 128 + 32, c * 128 + 96, r * 128 + 96)), (c * FRAME, r * FRAME))
    return out


def compose(look: dict, used: set[str]) -> Image.Image:
    layers = []
    for def_path, spec in look['items']:
        layers += layer_images(def_path, spec, look['body'], used)
    layers.sort(key=lambda zl: zl[0])
    sheet = Image.new('RGBA', layers[0][1].size)
    for _, img in layers:
        sheet.alpha_composite(img)
    return sheet


def frame(sheet: Image.Image, facing: str, col: int) -> Image.Image:
    row = ROWS[facing]
    return sheet.crop((col * FRAME, row * FRAME, (col + 1) * FRAME, (row + 1) * FRAME))


def hue_shift(img: Image.Image, degrees: int) -> Image.Image:
    if degrees == 0:
        return img
    img = img.copy()
    px = img.load()
    for y in range(img.height):
        for x in range(img.width):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
            if s < 0.25:
                continue  # keep near-greys (highlights, outlines, shadows) as drawn
            r2, g2, b2 = colorsys.hsv_to_rgb((h + degrees / 360) % 1, s, v)
            px[x, y] = (round(r2 * 255), round(g2 * 255), round(b2 * 255), a)
    return img


def tint(img: Image.Image, sat: float, value: tuple[float, float], eye: tuple[int, int, int]) -> Image.Image:
    """Scales saturation, maps value through `v * a + b`, and repaints the (green) eye pixels `eye`."""
    img = img.copy()
    px = img.load()
    for y in range(img.height):
        for x in range(img.width):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
            if 0.3 <= h <= 0.6 and s > 0.2:
                px[x, y] = (*eye, a)
                continue
            r2, g2, b2 = colorsys.hsv_to_rgb(h, s * sat, min(1.0, v * value[0] + value[1]))
            px[x, y] = (round(r2 * 255), round(g2 * 255), round(b2 * 255), a)
    return img


def beast_frames() -> dict[str, Image.Image]:
    wolf = Image.open(io.BytesIO(fetch(WOLF_SHEET, 'wolf/wolfsheet1.png'))).convert('RGBA').crop(WOLF_FRAME)
    out = {}
    for mid, looks in BEASTS.items():
        for v, (sat, value, eye) in enumerate(looks):
            cell = Image.new('RGBA', (FRAME, FRAME))
            cell.paste(tint(wolf, sat, value, eye), (0, FRAME - wolf.height))
            out[f'{mid}:{v}'] = cell
    return out


def crop_box(frames: list[Image.Image]) -> tuple[int, int, int, int]:
    """Union bounding box, made symmetric around the frame centre and ending at the frame bottom."""
    left, top, right = FRAME, FRAME, 0
    for f in frames:
        bb = f.getbbox()
        if bb:
            left, top, right = min(left, bb[0]), min(top, bb[1]), max(right, bb[2])
    half = max(FRAME // 2 - left, right - FRAME // 2)
    half += half % 2
    top -= top % 2
    return FRAME // 2 - half, top, FRAME // 2 + half, FRAME


def credits_for(used: set[str]) -> list[dict]:
    rows = {}
    with io.TextIOWrapper(io.BytesIO(ulpc('CREDITS.csv')), encoding='utf-8') as f:
        for row in csv.DictReader(f):
            rows[row['filename']] = row
    out = []
    for rel in sorted(used):
        row = rows.get(rel)
        if not row:
            sys.exit(f'No CREDITS.csv entry for {rel}')
        out.append(row)
    return out


def main() -> None:
    used: set[str] = set()
    sheets = {name: compose(look, used) for name, look in LOOKS.items()}
    monster_sheets = {f'{mid}:{v}': compose(look, used)
                      for mid, looks in HUMANOID_MONSTERS.items() for v, look in enumerate(looks)}

    char_frames = {name: [frame(s, f, c) for f in FACINGS for c in STEP_COLS] for name, s in sheets.items()}
    for key, s in monster_sheets.items():
        char_frames[key] = [frame(s, MONSTER_FACING, STEP_COLS[0])]
    for key, img in beast_frames().items():
        char_frames[key] = [img]
    box = crop_box([f for fs in char_frames.values() for f in fs])
    cw, ch = box[2] - box[0], box[3] - box[1]
    cols = len(FACINGS) * len(STEP_COLS)
    names = list(char_frames)
    characters = Image.new('RGBA', (cw * cols, ch * len(names)))
    for row, name in enumerate(names):
        for col, img in enumerate(char_frames[name]):
            characters.paste(img.crop(box), (col * cw, row * ch))
    characters.save(os.path.join(OUT_DIR, 'characters.png'), optimize=True)

    with zipfile.ZipFile(io.BytesIO(fetch(BASE_ASSETS, 'lpc_base_assets.zip'))) as z:
        small_src = {mid: Image.open(io.BytesIO(z.read(f'LPC Base Assets/sprites/monsters/{file}'))).convert('RGBA')
                     for mid, (file, *_) in SMALL_MONSTERS.items()}
    small_keys = [f'{mid}:{v}' for mid, (_, shifts, *_) in SMALL_MONSTERS.items() for v in range(len(shifts))]
    small_anims = {mid: (len(cycle), fps) for mid, (_, _, cycle, fps) in SMALL_MONSTERS.items()}
    max_frames = max(len(cycle) for _, _, cycle, _ in SMALL_MONSTERS.values())
    monsters = Image.new('RGBA', (SMALL_CELL * len(small_keys), SMALL_CELL * max_frames))
    i = 0
    for mid, (_, shifts, cycle, _) in SMALL_MONSTERS.items():
        cells = [small_src[mid].crop((col * SMALL_CELL, SMALL_ROW * SMALL_CELL,
                                      (col + 1) * SMALL_CELL, (SMALL_ROW + 1) * SMALL_CELL)) for col in cycle]
        for shift in shifts:
            for f, cell in enumerate(cells):
                monsters.paste(hue_shift(cell, shift), (i * SMALL_CELL, f * SMALL_CELL))
            i += 1
    monsters.save(os.path.join(OUT_DIR, 'monsters.png'), optimize=True)

    missing: list[str] = []
    walk_rows, pose_strips, manifest = build_paperdoll(used, missing)
    wbox = crop_box([f for fs in walk_rows for f in fs])
    abox = pose_box([f for fs in pose_strips for f in fs])
    # Every layer strip is cropped to its own art (most layers cover a small part of the figure), then all strips
    # share one sheet: walk strips first, then pose strips.
    strips = [tight_strip(fs, wbox) for fs in walk_rows] + [tight_strip(fs, abox) for fs in pose_strips]
    sizes = [(fs[0].width * len(fs), fs[0].height) for fs, _, _ in strips]
    sheet_w = max(2048, max(w for w, _ in sizes))
    at, sheet_h = pack_shelves(sizes, sheet_w)
    doll = Image.new('RGBA', (sheet_w, sheet_h))
    for (fs, _, _), (x, y) in zip(strips, at):
        for k, img in enumerate(fs):
            doll.paste(img, (x + k * img.width, y))
    doll.save(os.path.join(OUT_DIR, 'paperdoll.png'), optimize=True)
    origin = (POSE_CANVAS // 2 - FRAME // 2 + wbox[0] - abox[0], POSE_CANVAS // 2 - FRAME // 2 + wbox[1] - abox[1])
    for line in missing:
        print(f'  pose layer skipped: {line}')

    write_ts(names, cw, ch, small_keys, small_anims)
    strip_rows = [(x, y, fs[0].width, fs[0].height, dx, dy, len(fs)) for (fs, dx, dy), (x, y) in zip(strips, at)]
    write_paperdoll_ts((wbox[2] - wbox[0], wbox[3] - wbox[1]), (abox[2] - abox[0], abox[3] - abox[1]), origin,
                       manifest, len(walk_rows), strip_rows)
    write_credits(credits_for(used))
    print(f'characters.png {characters.size} ({len(names)} rows, cell {cw}x{ch}); monsters.png {monsters.size}; '
          f'paperdoll.png {doll.size} ({len(walk_rows)} walk and {len(pose_strips)} pose strips, walk cell {wbox}, '
          f'pose cell {abox}, origin {origin}); {len(manifest)} parts')


def write_ts(names: list[str], cw: int, ch: int, small_keys: list[str], small_anims: dict[str, tuple[int, int]]) -> None:
    looks = [n for n in names if ':' not in n]
    humanoid = [n for n in names if ':' in n]
    lines = [
        '// Generated by tools/game-assets/build-lpc-sprites.py; do not edit by hand.',
        '',
        '/** Real-pixel size of one `characters.png` cell (an LPC 64x64 walk frame cropped to the art). */',
        f'export const LPC_CHARACTER_CELL = {{ width: {cw}, height: {ch} }} as const;',
        '',
        '/** `characters.png` column order: facing, then step frame (0 = standing, 1-8 = the LPC walk cycle). */',
        f"export const LPC_CHARACTER_FACINGS = [{', '.join(repr(f) for f in FACINGS)}] as const;",
        f'export const LPC_CHARACTER_STEPS = {len(STEP_COLS)};',
        '',
        '/** Step frame used for the two-frame "step" pose (idle bob). */',
        f'export const LPC_CHARACTER_STEP_POSE = {STEP_COLS.index(STEP_POSE)};',
        '',
        '/** `characters.png` row per humanoid look id. */',
        'export const LPC_CHARACTER_ROWS: ReadonlyMap<string, number> = new Map<string, number>([',
        *[f"  ['{n}', {names.index(n)}]," for n in looks],
        ']);',
        '',
        '/** Real-pixel size of one `monsters.png` cell. */',
        f'export const LPC_MONSTER_CELL = {SMALL_CELL};',
        '',
        '/**',
        ' * Monster art by `spriteId:variant`: a `characters.png` row (column 0, one frame) or a `monsters.png` column',
        ' * whose first `frames` rows are a looping animation played at `fps` frames per second.',
        ' */',
        'export const LPC_MONSTERS: ReadonlyMap<',
        '  string,',
        "  { sheet: 'characters' | 'monsters'; index: number; frames: number; fps: number }",
        '> = new Map([',
        *[f"  ['{n}', {{ sheet: 'characters' as const, index: {names.index(n)}, frames: 1, fps: 0 }}],"
          for n in humanoid],
        *[f"  ['{k}', {{ sheet: 'monsters' as const, index: {i}, frames: {small_anims[k.split(':')[0]][0]}, "
          f"fps: {small_anims[k.split(':')[0]][1]} }}],"
          for i, k in enumerate(small_keys)],
        ']);',
        '',
    ]
    with open(TS_OUT, 'w', newline='\n', encoding='utf-8') as f:
        f.write('\n'.join(lines))


def write_paperdoll_ts(cell: tuple[int, int], pose_cell: tuple[int, int], origin: tuple[int, int], manifest: dict,
                       walk_count: int, strips: list[tuple[int, ...]]) -> None:
    def part(key: str) -> list[str]:
        walk, poses = manifest[key]
        out = [f"  ['{key}', {{", f"    walk: [{', '.join(f'[{z}, {i}]' for z, i in walk)}],"]
        if poses:
            out.append('    poses: {')
            for anim, layers in poses.items():
                out.append(f"      {anim}: [{', '.join(f'[{z}, {walk_count + i}]' for z, i in layers)}],")
            out.append('    },')
        else:
            out.append('    poses: {},')
        out.append('  }],')
        return out

    lines = [
        '// Generated by tools/game-assets/build-lpc-sprites.py; do not edit by hand.',
        '',
        '/** Real-pixel size of a composed walk frame: a 64x64 ULPC walk frame cropped to every layer\'s art. */',
        f'export const PAPERDOLL_CELL = {{ width: {cell[0]}, height: {cell[1]} }} as const;',
        '',
        '/** Real-pixel size of a composed battle pose frame (facing right). */',
        f'export const PAPERDOLL_POSE_CELL = {{ width: {pose_cell[0]}, height: {pose_cell[1]} }} as const;',
        '',
        '/** Real-pixel offset of the walk cell inside a pose cell, so the body stays put as the pose starts. */',
        f'export const PAPERDOLL_POSE_ORIGIN = {{ x: {origin[0]}, y: {origin[1]} }} as const;',
        '',
        '/** Each class\'s battle animations (plan §29): its weapon attack and, for spell casters, the cast. */',
        'export const PAPERDOLL_CLASS_POSES: ReadonlyMap<string, { attack: string; cast?: string }> = new Map([',
        *[f"  ['{cls}', {{ {', '.join(f'{a}: {anim!r}' for a, anim in POSES[cls].items())} }}]," for cls in CLASSES],
        ']);',
        '',
        '/**',
        ' * A strip of one layer\'s frames in `paperdoll.png`, side by side: where its first frame is (x, y), the frame',
        ' * size (w, h, cropped to the layer\'s art), where that crop sits in the walk or pose cell (dx, dy) and how many',
        ' * frames it has. Walk strips have 36 (facing, then step frame, as in `characters.png`).',
        ' */',
        'export type PaperdollStrip = readonly [',
        '  x: number,',
        '  y: number,',
        '  w: number,',
        '  h: number,',
        '  dx: number,',
        '  dy: number,',
        '  frames: number,',
        '];',
        '',
        'export const PAPERDOLL_STRIPS: readonly PaperdollStrip[] = [',
        *[f"  [{', '.join(str(v) for v in s)}]," for s in strips],
        '];',
        '',
        '/** A layer: its ULPC z-order (layers draw low to high) and its strip. */',
        'export type PaperdollLayer = readonly [z: number, strip: number];',
        '',
        'export interface PaperdollPart {',
        '  walk: readonly PaperdollLayer[];',
        '  /** By animation (`slash`, `thrust`, `spellcast` or `shoot`); layers without that animation are left out. */',
        '  poses: Readonly<Record<string, readonly PaperdollLayer[]>>;',
        '}',
        '',
        '/**',
        ' * Layers per `<part>@<class>` (plan §39): `base@<class>` is the plain look every member starts in, and each',
        ' * weapon and gear id has an entry for every class that can use it (empty when it is too small to see).',
        ' */',
        'export const PAPERDOLL_PARTS: ReadonlyMap<string, PaperdollPart> = new Map<string, PaperdollPart>([',
        *[line for key in manifest for line in part(key)],
        ']);',
        '',
    ]
    with open(PAPERDOLL_TS_OUT, 'w', newline='\n', encoding='utf-8') as f:
        f.write('\n'.join(lines))


MARK_START = '<!-- lpc-sprites:start (generated by tools/game-assets/build-lpc-sprites.py) -->'
MARK_END = '<!-- lpc-sprites:end -->'


def write_credits(rows: list[dict]) -> None:
    md = [
        MARK_START,
        '## Characters and monsters',
        '',
        '`characters.png` is composited, recoloured and cropped from layers of the',
        f'[Universal LPC Spritesheet Character Generator]({ULPC_REPO}) and is distributed under **CC-BY-SA 3.0**.',
        '`paperdoll.png` (the party members\' layers: plain clothes, armour, shields, accessories and weapons, each',
        'with its slash, thrust, shoot and spellcast battle poses) is cut and recoloured from the same generator\'s',
        'layers, which the game stacks on each party member.',
        'Each layer is available under the licences listed below (CC0, CC-BY, OGA-BY, CC-BY-SA and/or GPL).',
        '',
        f'`monsters.png` crops, reorders and hue-shifts the left-facing frames of `slime.png` and `bat.png` from the',
        f'[LPC Base Assets]({BASE_ASSETS_PAGE})',
        'by Charles Sanchez (CharlesGabriel), CC-BY-SA 3.0 / GPL 3.0.',
        '',
        f'The wolf and Alpha Wolf rows of `characters.png` recolour a frame of [[LPC] Wolf Animation]({WOLF_PAGE})',
        'by Stephen Challener (Redshrike), commissioned by William Thompson (William.Thompsonj),',
        'CC-BY 3.0 / CC-BY 4.0 / OGA-BY 3.0 / GPL 2.0 / GPL 3.0.',
        '',
        '| Layer file | Authors | Licenses | Source |',
        '| --- | --- | --- | --- |',
    ]
    for r in rows:
        urls = ' '.join(f'<{u.strip()}>' for u in r['urls'].split(',') if u.strip())
        md.append(f"| `{r['filename']}` | {r['authors'].replace('|', '/')} | {r['licenses']} | {urls} |")
    md.append(MARK_END)
    path = os.path.join(OUT_DIR, 'CREDITS.md')
    with open(path, encoding='utf-8', newline='') as f:
        text = f.read()
    eol = '\r\n' if '\r\n' in text else '\n'
    text = text.replace('\r\n', '\n')
    block = '\n'.join(md)
    if MARK_START in text:
        text = text[:text.index(MARK_START)] + block + text[text.index(MARK_END) + len(MARK_END):]
    else:
        text = text.rstrip('\n') + '\n\n' + block + '\n'
    with open(path, 'w', newline=eol, encoding='utf-8') as f:
        f.write(text)


if __name__ == '__main__':
    main()
