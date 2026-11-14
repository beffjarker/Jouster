#!/usr/bin/env python3
"""
Builds Jouster Quest's LPC character and monster sheets (game plan 16.7).

Characters are composited from layers of the Universal LPC Spritesheet Character Generator
(https://github.com/LiberatedPixelCup/Universal-LPC-Spritesheet-Character-Generator), recoloured with its
palette definitions. Slime and bat come from the 2012 "LPC Base Assets" pack on OpenGameArt. Downloads are
cached under tmp/lpc-cache (gitignored).

Outputs:
  apps/jouster-ui/public/game-assets/lpc/characters.png   one row per look, cols = facing x frame
  apps/jouster-ui/public/game-assets/lpc/monsters.png     one cell per small monster look
  apps/jouster-ui/public/game-assets/lpc/CREDITS.md       the generated section between markers
  libs/game/quest/src/lib/art/lpc-sprites.generated.ts    row and cell maps used by Art

Usage (from the repo root; needs Pillow):  python tools/game-assets/build-lpc-sprites.py
"""
from __future__ import annotations

import colorsys
import csv
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
ULPC = 'https://raw.githubusercontent.com/LiberatedPixelCup/Universal-LPC-Spritesheet-Character-Generator/master/'
ULPC_REPO = 'https://github.com/LiberatedPixelCup/Universal-LPC-Spritesheet-Character-Generator'
BASE_ASSETS = 'https://opengameart.org/sites/default/files/lpc_base_assets.zip'
BASE_ASSETS_PAGE = 'https://opengameart.org/content/liberated-pixel-cup-lpc-base-assets-sprites-map-tiles'

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
CANE = 'weapons/polearm/weapon_polearm_cane'
NASAL = 'headwear/helmets/helmets/hat_helmet_nasal'
ARMET = 'headwear/helmets/helmets/hat_helmet_armet'
KETTLE = 'headwear/helmets/helmets/hat_helmet_kettle'
HOOD = 'headwear/coverings/hoods/hat_hood_cloth'
CAP = 'headwear/hats/caps/hat_cap_leather'
WIZARD_HAT = 'headwear/hats/magic/hat_magic_wizard'
CROWN = 'headwear/hats/formal/hat_formal_crown'


def human(body: str, skin: str, head: str, *items) -> dict:
    return {'body': body, 'items': [(BODY, f'body:{skin}'), (head, f'body:light>{skin}'), *items]}


def goblin(skin: str, *items) -> dict:
    return {'body': 'male', 'items': [(BODY, f'body:{skin}'), (HEAD_GOBLIN, f'body:green>{skin}'), *items]}


def skeleton(*items) -> dict:
    return {'body': 'male', 'items': [(SKELETON, None), (HEAD_SKULL, None), *items]}


LOOKS = {
    'warrior': human('male', 'light', HEAD_M, (HAIR_PLAIN, 'hair:chestnut'), (PANTS, 'cloth:brown'), (BOOTS, 'cloth:leather'),
                     (LEATHER, None), (NASAL, 'metal:iron'), (SWORD, 'v:steel')),
    'wizard': human('male', 'light', HEAD_OLD, (BEARD_LONG, 'hair:white'), (SKIRT, 'cloth:navy'), (SHOES, 'cloth:brown'),
                    (LONG, 'cloth:blue'), (WIZARD_HAT, 'v:blue'), (STAFF, 'v:medium')),
    'paladin': human('male', 'light', HEAD_M, (HAIR_PLAIN, 'hair:blonde'), (PANTS, 'cloth:navy'), (BOOTS, 'cloth:gray'),
                     (PLATE, 'metal:silver'), (CAPE, 'cloth:blue'), (ARMET, 'metal:silver'), (SWORD, 'v:silver')),
    'cleric': human('female', 'light', HEAD_F, (HAIR_BOB, 'hair:light_brown'), (SHOES, 'cloth:tan'),
                    ('torso/shirts/torso_clothes_robe', 'v:white'), ('torso/waist/belt_robe', 'v:white'), (MACE, 'v:mace')),
    'rogue': human('male', 'olive', HEAD_M, (HAIR_MESSY, 'hair:black'), (PANTS, 'cloth:charcoal'), (BOOTS, 'cloth:black'),
                   (LONG, 'cloth:charcoal'), ('torso/vest/torso_clothes_vest', 'v:maroon'), (HOOD, 'cloth:charcoal'),
                   (DAGGER, 'v:dagger')),
    'ranger': human('female', 'light', HEAD_F, (HAIR_PONY, 'hair:ginger'), (PANTS, 'cloth:brown'), (BOOTS, 'cloth:brown'),
                    ('torso/shirts/torso_clothes_tunic', 'v:forest'), (CAP, 'v:forest'), (BOW, 'v:medium')),
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

# Small monsters from the LPC Base Assets: (file, hue shifts in degrees, one per variant; 0 = as drawn).
SMALL_MONSTERS = {
    'slime': ('slime.png', [0, 150, -120, -160, -70, 60]),
    'bat': ('bat.png', [0, 140, 100]),
}
SMALL_CELL = 32
SMALL_COL = 0  # standing frame
SMALL_ROW = 1  # facing left (rows: up, left, down, right)


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
        variant = spec[2:].replace(' ', '_') if spec and spec.startswith('v:') else None
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
        if spec and not spec.startswith('v:'):
            material, colours = spec.split(':', 1)
            src_name, dst_name = colours.split('>') if '>' in colours else (None, colours)
            if src_name is None:
                base = (d.get('recolors') or {}).get('base')
                src_name = base.split('.')[-1] if base else material_base(material)
            if src_name != dst_name:
                img = recolor(img, palette(material, src_name), palette(material, dst_name))
        used.add(f'{path}/{"walk_128" if custom else "walk"}.png')
        out.append((int(layer.get('zPos', 0)), img))
    if not out:
        sys.exit(f'{def_path}: no walk layer for body {body!r}')
    return out


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
                     for mid, (file, _) in SMALL_MONSTERS.items()}
    small_keys = [f'{mid}:{v}' for mid, (_, shifts) in SMALL_MONSTERS.items() for v in range(len(shifts))]
    monsters = Image.new('RGBA', (SMALL_CELL * len(small_keys), SMALL_CELL))
    i = 0
    for mid, (_, shifts) in SMALL_MONSTERS.items():
        cell = small_src[mid].crop((SMALL_COL * SMALL_CELL, SMALL_ROW * SMALL_CELL,
                                    (SMALL_COL + 1) * SMALL_CELL, (SMALL_ROW + 1) * SMALL_CELL))
        for shift in shifts:
            monsters.paste(hue_shift(cell, shift), (i * SMALL_CELL, 0))
            i += 1
    monsters.save(os.path.join(OUT_DIR, 'monsters.png'), optimize=True)

    write_ts(names, cw, ch, small_keys)
    write_credits(credits_for(used))
    print(f'characters.png {characters.size} ({len(names)} rows, cell {cw}x{ch}); monsters.png {monsters.size}')


def write_ts(names: list[str], cw: int, ch: int, small_keys: list[str]) -> None:
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
        '/** Monster art by `spriteId:variant`: a `characters.png` row (column 0) or a `monsters.png` column. */',
        "export const LPC_MONSTERS: ReadonlyMap<string, { sheet: 'characters' | 'monsters'; index: number }> = new Map([",
        *[f"  ['{n}', {{ sheet: 'characters' as const, index: {names.index(n)} }}]," for n in humanoid],
        *[f"  ['{k}', {{ sheet: 'monsters' as const, index: {i} }}]," for i, k in enumerate(small_keys)],
        ']);',
        '',
    ]
    with open(TS_OUT, 'w', newline='\n', encoding='utf-8') as f:
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
        'Each layer is available under the licences listed below (CC0, CC-BY, OGA-BY, CC-BY-SA and/or GPL).',
        '',
        f'`monsters.png` crops and hue-shifts `slime.png` and `bat.png` from the [LPC Base Assets]({BASE_ASSETS_PAGE})',
        'by Charles Sanchez (CharlesGabriel), CC-BY-SA 3.0 / GPL 3.0.',
        '',
        '| Layer (walk.png) | Authors | Licenses | Source |',
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
