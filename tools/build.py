"""Build pack data and original pixel art; bundle both packs into an importable add-on.

Python 3 standard library only. Script sources are maintained in packs/Plum_BP/scripts.
"""
from pathlib import Path
import json
import struct
import zlib
import zipfile
import argparse
from orchard import build_orchard

ROOT = Path(__file__).resolve().parents[1]
BP = ROOT / 'packs/Plum_BP'
RP = ROOT / 'packs/Plum_RP'
BP_ID = '01d84fd1-31dd-4b92-a942-c8e59ce38191'
RP_ID = '834d72cc-8c7f-498f-adfa-269e215f86e8'

def write(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2) + '\n', encoding='utf-8')

def png(path, pixels):
    path.parent.mkdir(parents=True, exist_ok=True)
    h, w = len(pixels), len(pixels[0])
    def chunk(kind, data):
        return struct.pack('!I', len(data)) + kind + data + struct.pack('!I', zlib.crc32(kind + data))
    raw = b''.join(b'\x00' + bytes(v for pixel in row for v in pixel) for row in pixels)
    path.write_bytes(b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('!2I5B', w, h, 8, 6, 0, 0, 0)) + chunk(b'IDAT', zlib.compress(raw)) + chunk(b'IEND', b''))

FRIENDS = {
    'plum': {
        'file': 'friend',
        'title': 'Plum', 'entity': 'plum:friend', 'fruit': 'plum:plum', 'family': 'plum_friend',
        'egg': ('#9154DB', '#F6C1F4'),
        'palette': ((149, 81, 221, 255), (110, 53, 182, 255), (183, 119, 247, 255), (47, 24, 77, 255), (255, 248, 255, 255), (244, 147, 214, 255)),
    },
    'apple': {
        'file': 'apple',
        'title': 'Apple', 'entity': 'apple:friend', 'fruit': 'apple:apple', 'family': 'apple_friend',
        'egg': ('#C62828', '#6AB04A'),
        'palette': ((215, 42, 50, 255), (150, 24, 32, 255), (255, 108, 108, 255), (96, 18, 26, 255), (255, 252, 250, 255), (255, 150, 160, 255)),
    },
    'blueberry': {
        'file': 'blueberry',
        'title': 'Blueberry', 'entity': 'blueberry:friend', 'fruit': 'blueberry:blueberry', 'family': 'blueberry_friend', 'chest': True,
        'egg': ('#1F4FD8', '#A7E0F2'),
        'palette': ((37, 66, 205, 255), (23, 45, 148, 255), (84, 126, 240, 255), (14, 27, 88, 255), (251, 252, 255, 255), (232, 150, 200, 255)),
    },
    'lemon': {
        'file': 'lemon',
        'title': 'Lemon', 'entity': 'lemon:friend', 'fruit': 'lemon:lemon', 'family': 'lemon_friend',
        'material': 'entity_emissive_alpha',
        'egg': ('#F7C51E', '#3E7A24'),
        'palette': ((243, 196, 42, 255), (201, 148, 18, 255), (250, 224, 118, 255), (143, 104, 12, 255), (255, 252, 240, 255), (242, 168, 140, 255)),
    },
    'banana': {
        'file': 'banana',
        'title': 'Banana', 'entity': 'banana:friend', 'fruit': 'banana:banana', 'family': 'banana_friend',
        'egg': ('#FFE135', '#8B5A2B'),
        # Tall (1.5-block) goofy Prankster: bright yellow with brown tips and derpy eyes.
        'tall': True, 'collision_height': 1.4, 'prankster': True,
        'palette': ((255, 214, 40, 255), (196, 140, 16, 255), (255, 235, 120, 255), (150, 100, 30, 255), (255, 255, 255, 255), (250, 150, 170, 255)),
    },
    'grapes': {
        'file': 'grapes',
        'title': 'Grapes', 'entity': 'grapes:friend', 'fruit': 'grapes:grapes', 'family': 'grapes_friend',
        'egg': ('#4B9E45', '#A8E65C'),
        # Squarish bunch of green grapes: a standard cube buddy whose whole surface
        # is covered in little round grapes, capped with a leafy crown.
        # (main, edge, light, dark, white, pink)
        'palette': ((124, 196, 92, 255), (48, 122, 58, 255), (172, 226, 126, 255), (32, 84, 44, 255), (250, 255, 246, 255), (196, 226, 148, 255)),
    },
    'strawberry': {
        'file': 'strawberry',
        'title': 'Strawberry', 'entity': 'strawberry:friend', 'fruit': 'strawberry:strawberry', 'family': 'strawberry_friend',
        # The Farmer: a plump red berry cube wearing a green calyx crown, with pale
        # seed dimples over his sides and a cheerful face.
        'chest': True,
        'egg': ('#D42A3A', '#5AAB48'),
        'palette': ((208, 40, 58, 255), (142, 22, 40, 255), (246, 96, 92, 255), (86, 14, 28, 255), (255, 248, 244, 255), (255, 156, 156, 255)),
    },
    'coconut': {
        'file': 'coconut',
        'title': 'Coconut', 'entity': 'coconut:friend', 'fruit': 'coconut:coconut', 'family': 'coconut_friend',
        # The Bodyguard: a fuzzy brown coconut cube wearing a small palm-frond crown,
        # with three classic dark "eyes" and a cheery open smile.
        'egg': ('#96723C', '#E8D5B0'),
        'palette': ((176, 122, 72, 255), (100, 66, 38, 255), (218, 170, 124, 255), (62, 40, 22, 255), (250, 234, 210, 255), (255, 184, 168, 255)),
    },
}

def friend_geometry(name):
    uv = {face: {'uv': [0 if face == 'north' else 16, 0], 'uv_size': [16, 16]} for face in ['north', 'south', 'east', 'west', 'up', 'down']}
    if name == 'banana':
        # Banana is the tall one: a 12x24x12 box (about 1.5 blocks) so he towers
        # over his little cube friends. Face lives in the top rows of the front.
        height, texture_height, bounds = 24, 40, 3
        uv['north'] = {'uv': [0, 0], 'uv_size': [16, height]}
        uv['south'] = {'uv': [16, 0], 'uv_size': [16, height]}
        uv['east'] = {'uv': [16, 0], 'uv_size': [16, height]}
        uv['west'] = {'uv': [16, 0], 'uv_size': [16, height]}
        uv['up'] = {'uv': [0, 24], 'uv_size': [16, 16]}
        uv['down'] = {'uv': [16, 24], 'uv_size': [16, 16]}
    elif name in ('apple', 'blueberry', 'lemon', 'grapes', 'strawberry', 'coconut'):
        # Topper friends wear a dedicated top sheet and a plain bottom sheet.
        height, texture_height, bounds = 12, 32, 2
        uv['up'] = {'uv': [0, 16], 'uv_size': [16, 16]}
        uv['down'] = {'uv': [16, 16], 'uv_size': [16, 16]}
    else:
        height, texture_height, bounds = 12, 16, 2
    return {'format_version': '1.12.0', 'minecraft:geometry': [{'description': {'identifier': f'geometry.{name}', 'texture_width': 32, 'texture_height': texture_height, 'visible_bounds_width': 2, 'visible_bounds_height': bounds, 'visible_bounds_offset': [0, bounds / 2 - 0.5, 0]}, 'bones': [{'name': 'body', 'pivot': [0, 6, 0] if name != 'banana' else [0, 12, 0], 'cubes': [{'origin': [-6, 0, -6], 'size': [12, height, 12], 'uv': uv}]}]}]}

def grape_cluster(main, edge, light, dark):
    """A 16x16 fill of small overlapping round grapes, so the cube reads as a bunch."""
    highlight, stem = (208, 240, 164, 255), (126, 88, 44, 255)
    tile = [[edge if x in (0, 15) or y in (0, 15) else main for x in range(16)] for y in range(16)]
    centers = []
    for row in range(6):
        y = 1 + row * 3  # grape center rows: 1, 4, 7, 10, 13
        xs = range(1, 16, 4) if row % 2 else range(3, 16, 4)
        for x in xs:
            if y <= 15: centers.append((x, y, row % 2))
    for cx, cy, parity in centers:
        for dy in range(-2, 3):
            for dx in range(-2, 3):
                d2 = dx * dx + dy * dy
                if d2 > 4: continue
                nx, ny = cx + dx, cy + dy
                if not (0 <= nx < 16 and 0 <= ny < 16): continue
                if d2 >= 3: tile[ny][nx] = dark            # grape outline
                elif dy <= -1: tile[ny][nx] = light        # lit upper half
                else: tile[ny][nx] = main
        tile[cy - 1][cx - 1] = highlight                   # catch-light
    for x in range(7, 9):
        tile[0][x] = stem                                  # where the bunch hangs from
    return tile

def friend_texture(name):
    """Purple Plum keeps the classic 32x16 sheet; Apple, Blueberry, and Lemon add
    a 32x32 two-sheet top; Banana is the tall one with a 32x40 sheet; Grapes is a
    32x32 sheet covered in small round grapes with a leafy crown on the top face;
    Strawberry is a 32x32 sheet of a plump red berry dotted with seeds under a
    green calyx crown; Coconut is a 32x32 sheet of a fuzzy brown husk with three
    dark "eyes" and a cheery grin under a small palm-frond crown."""
    main, edge, light, dark, white, pink = FRIENDS[name]['palette']
    if name == 'grapes':
        tile = grape_cluster(main, edge, light, dark)
    else:
        tile = [[edge if x in (0, 15) or y in (0, 15) else light if y == 1 else main for x in range(16)] for y in range(16)]
    if name == 'strawberry':
        # Pale seed dimples sprinkled over the berry's sides, like a real strawberry.
        seed = (250, 212, 142, 255)
        for x, y in [(2, 3), (5, 4), (9, 3), (12, 5), (3, 8), (7, 7), (11, 8), (13, 9),
                     (2, 12), (5, 13), (9, 13), (12, 12), (7, 12), (4, 6), (6, 11), (11, 10)]:
            if not (x in (0, 15) or y in (0, 15)):
                tile[y][x] = seed
    if name == 'coconut':
        # Hairy husk: darker speckles around the outer ring of every face, so the
        # whole cube reads as a fuzzy brown coconut (the face is drawn over these).
        hair = (134, 90, 52, 255)
        for x, y in [(2, 3), (4, 2), (10, 2), (13, 3), (14, 5), (1, 8), (2, 11), (3, 13),
                     (6, 14), (10, 14), (13, 13), (14, 10), (2, 6), (5, 1), (12, 1), (4, 14),
                     (13, 8), (1, 12), (11, 3), (3, 5)]:
            if not (x in (0, 15) or y in (0, 15)):
                tile[y][x] = hair
    if name == 'banana':
        # Tall goofy Prankster. The body is 24 rows tall, face near the top.
        tilerow = lambda y: [edge if x in (0, 15) or y in (0, 23) else light if y == 1 else main for x in range(16)]
        body_tile = [tilerow(y) for y in range(24)]
        for y in range(3, 21): body_tile[y][5] = body_tile[y][6] = light
        face = [r[:] for r in body_tile]
        # Goofy mismatched eyes: a big left eye, a smaller right eye, derpy pupils.
        for y in range(4, 10):
            for x in range(3, 7): face[y][x] = white
        for y in range(5, 9):
            for x in range(9, 13): face[y][x] = white
        for y in range(6, 8):
            for x in range(4, 6): face[y][x] = dark
            for x in range(10, 12): face[y][x] = dark
        # Wide open goofy grin with a pink tongue sticking out.
        for x in range(3, 13): face[10][x] = face[13][x] = dark
        for y in range(10, 14): face[y][3] = face[y][12] = dark
        for y in range(11, 13):
            for x in range(4, 12): face[y][x] = pink
        for x in range(6, 10): face[13][x] = pink
        for x, y in [(2, 9), (3, 9), (12, 9), (13, 9)]: face[y][x] = pink
        # Up face wears a brown tip like the end of the fruit; down stays plain.
        top = [r[:] for r in tile]
        top_brown, top_tip = (160, 105, 42, 255), (120, 74, 28, 255)
        for y in range(4, 12):
            for x in range(4, 12):
                if (x - 7.5) ** 2 + (y - 7.5) ** 2 <= 16:
                    top[y][x] = top_tip if (x - 7.5) ** 2 + (y - 7.5) ** 2 <= 6 else top_brown
        return [face[y] + body_tile[y] for y in range(24)] + [top[y] + tile[y] for y in range(16)]
    face = [r[:] for r in tile]
    for x in (4, 10):
        for y in range(4, 8):
            face[y][x] = face[y][x + 1] = dark
        face[4][x] = white
    if name == 'lemon':
        # Slightly grumpy: inward-drooping brows and a frown instead of a smile.
        for x, y in [(3, 2), (4, 3)]: face[y][x] = dark
        for x, y in [(11, 2), (10, 3)]: face[y][x] = dark
        frown = [(4, 12), (5, 11), (6, 10), (7, 9), (8, 9), (9, 10), (10, 11), (11, 12)]
        for x, y in frown: face[y][x] = dark
    elif name == 'coconut':
        # Cheery bodyguard: a wide open grin with white teeth and a happy pink
        # tongue, plus his third "eye" — the round stem scar under his chin.
        for x in range(4, 12): face[10][x] = dark
        for y in range(11, 14):
            face[y][4] = face[y][11] = dark
        for x in range(5, 11):
            face[11][x] = white
            face[12][x] = dark
            face[13][x] = pink
        for x in (6, 8): face[10][x] = white
        face[14][7] = dark
    else:
        for x, y in [(4, 10), (5, 11), (6, 12), (7, 12), (8, 12), (9, 12), (10, 11), (11, 10)]: face[y][x] = dark
    for x in (2, 3, 12, 13): face[9][x] = pink
    if name == 'plum':
        return [face[y] + tile[y] for y in range(16)]
    # Topper friends: the top face (up = region [0,16]) wears the leaf or calyx; bottom stays plain.
    top = [r[:] for r in tile]
    bottom = [r[:] for r in tile]
    if name == 'apple':
        for x, y in [(8, 2), (8, 3), (9, 2)]: top[y][x] = (108, 70, 40, 255)
        for y in range(4, 9):
            for x in range(5, 11):
                top[y][x] = (86, 158, 44, 255)
        for y in range(4, 8): top[y][7] = top[y][8] = (150, 208, 76, 255)
        top[4][7] = top[4][8] = (56, 118, 38, 255)
    elif name == 'lemon':
        # Lemon wears a broad, pointed citrus leaf across the top, like a fresh lemon leaf.
        leaf_dark, leaf_mid, leaf_light = (56, 118, 38, 255), (86, 158, 44, 255), (150, 208, 76, 255)
        for x, y in [(8, 1), (8, 2), (9, 1)]: top[y][x] = (150, 100, 40, 255)
        for y in range(4, 10):
            for x in range(4, 13):
                d = ((x - 8) / 4.4) ** 2 + ((y - 6.8) / 2.7) ** 2
                if d <= 1:
                    top[y][x] = leaf_dark if d > 0.7 else leaf_mid
        for x in range(5, 12): top[6][x] = leaf_light
        top[6][4] = top[6][11] = leaf_dark
    elif name == 'blueberry':
        # Blueberry: a tiny green calyx crown like a real berry, ringed by pale frost.
        calyx_dark, calyx_mid, calyx_light = (46, 96, 40, 255), (84, 150, 54, 255), (130, 186, 64, 255)
        bloom = (120, 156, 247, 255)
        for x, y in [(8, 2), (8, 3), (8, 4), (7, 3), (9, 3), (7, 4), (9, 4)]: top[y][x] = calyx_mid
        top[8][3] = calyx_light
        for x, y in [(6, 4), (10, 4), (8, 5)]: top[y][x] = calyx_dark
        for x, y in [(3, 7), (12, 9), (4, 12), (11, 6), (2, 10), (13, 12)]: top[y][x] = bloom
    elif name == 'grapes':
        # Grapes: a woody stem at the crown of the bunch, ringed by tiny green leaves.
        stem, leaf_dark, leaf_mid, leaf_light = (126, 88, 44, 255), (54, 118, 44, 255), (96, 176, 70, 255), (156, 214, 110, 255)
        for x, y in [(7, 1), (8, 1), (9, 1), (8, 2), (8, 3), (7, 2), (9, 2)]: top[y][x] = stem
        for x, y in [(4, 4), (5, 3), (6, 2), (10, 2), (11, 3), (12, 4),
                     (4, 6), (5, 7), (6, 7), (10, 7), (11, 7), (12, 6),
                     (6, 10), (7, 11), (8, 11), (9, 11), (10, 10)]: top[y][x] = leaf_mid
        for x, y in [(5, 4), (6, 3), (10, 3), (11, 4), (3, 5), (13, 5),
                     (5, 8), (11, 8), (7, 12), (8, 12), (9, 12)]: top[y][x] = leaf_dark
        for x, y in [(5, 5), (6, 6), (10, 6), (11, 5), (7, 13), (9, 13)]: top[y][x] = leaf_light
    elif name == 'strawberry':
        # Strawberry: a broad starry green calyx crown over the berry, with a short stem.
        leaf_dark, leaf_mid, leaf_light, stem = (52, 112, 42, 255), (88, 164, 58, 255), (156, 214, 100, 255), (124, 92, 50, 255)
        for x, y in [(8, 1), (8, 2), (9, 1)]: top[y][x] = stem
        for x, y in [(4, 2), (5, 3), (4, 4), (5, 5), (11, 2), (12, 3), (11, 4), (12, 5),
                     (2, 6), (3, 7), (2, 8), (3, 9), (13, 6), (12, 7), (13, 8), (12, 9),
                     (4, 11), (5, 10), (6, 12), (7, 13), (9, 13), (10, 12), (11, 11), (12, 10),
                     (6, 4), (7, 4), (8, 4), (9, 4), (10, 4)]: top[y][x] = leaf_mid
        for x, y in [(6, 6), (7, 6), (8, 6), (9, 6), (10, 6), (5, 7), (11, 7)]: top[y][x] = leaf_dark
        for x, y in [(8, 7), (7, 8), (8, 8), (9, 8)]: top[y][x] = leaf_light
        for x, y in [(5, 13), (11, 13)]: top[y][x] = leaf_dark
    elif name == 'coconut':
        # A small palm-frond crown: a brown stub hub with green fronds fanning out.
        palm_dark, palm_mid, palm_light, stub = (52, 116, 44, 255), (98, 178, 72, 255), (164, 220, 122, 255), (124, 88, 46, 255)
        for x, y in [(7, 1), (8, 1), (9, 1), (8, 2), (7, 2), (9, 2), (8, 3)]: top[y][x] = stub
        for x, y in [(4, 2), (5, 2), (6, 2), (3, 3), (4, 3), (5, 3), (2, 4), (2, 5),
                     (10, 2), (11, 2), (12, 2), (11, 3), (12, 3), (13, 3), (14, 4), (14, 5),
                     (3, 6), (4, 6), (5, 6), (6, 6), (9, 6), (10, 6), (11, 6), (12, 6),
                     (4, 9), (5, 9), (6, 9), (9, 9), (10, 9), (11, 9),
                     (5, 11), (6, 11), (7, 11), (8, 11), (9, 11), (6, 12), (7, 12), (8, 12)]: top[y][x] = palm_mid
        for x, y in [(2, 4), (14, 4), (3, 3), (13, 3), (3, 6), (12, 6), (5, 11), (10, 11)]: top[y][x] = palm_dark
        for x, y in [(4, 2), (12, 2), (3, 6), (12, 6), (7, 11)]: top[y][x] = palm_light
    return [face[y] + tile[y] for y in range(16)] + [top[y] + bottom[y] for y in range(16)]

def build_friend(name, data):
    entity, fruit = data['entity'], data['fruit']
    def interaction(item, text):
        held_filter = ({'test': 'all_slots_empty', 'subject': 'other', 'value': 'hand'} if item is None else
                       {'test': 'has_equipment', 'subject': 'other', 'domain': 'hand', 'value': item})
        return {
            'on_interact': {
                'filters': {'all_of': [
                    {'test': 'is_family', 'subject': 'other', 'value': 'player'},
                    {'test': 'is_owner', 'subject': 'other', 'value': True},
                    held_filter,
                ]},
                'event': 'friend:script_interact', 'target': 'self',
            },
            'interact_text': text,
        }
    empty_text = f'action.interact.{name}_chest' if data.get('chest') else f'action.interact.{name}_manage'
    groups = {
        f'{name}:adult': {
            'minecraft:scale': {'value': 1},
        },
        f'{name}:baby': {
            'minecraft:is_baby': {}, 'minecraft:scale': {'value': 0.5},
            'minecraft:ageable': {'duration': 1200, 'feed_items': [fruit], 'grow_up': {'event': 'minecraft:ageable_grow_up', 'target': 'self'}},
            'minecraft:behavior.follow_parent': {'priority': 5, 'speed_multiplier': 1.15}
        },
        f'{name}:tamed': {
            'minecraft:is_tamed': {},
            # Native interactions provide touch/controller prompts for manage and talk.
            # Script catches them before the no-op event and opens the appropriate form.
            # The Fruit Basket deliberately has NO native interaction: when the engine
            # claims the custom-item interaction it swallows the tap before main.js can
            # capture the friend, and the empty friend:script_interact event does nothing.
            # The script-only basket path (1.2.17 behavior) always reaches captureInBasket.
            'minecraft:interact': {'interactions': [
                interaction(None, empty_text),
                interaction('minecraft:book', f'action.interact.{name}_talk'),
            ]},
        },
        f'{name}:sit': {
            'minecraft:is_sitting': {},
            'minecraft:behavior.sit': {'priority': 0},
        },
        # Universal movement groups (shared verbatim by every future fruit):
        # FOLLOW uses the engine's tamed follow_owner; STAY uses sit. WORK and HOME
        # keep only is_tamed and roam via the base random_stroll; the script enforces
        # their radius. Keeping follow_owner out of {name}:tamed means a freshly tamed
        # friend never auto-follows — main.js drives mode transitions through the
        # friend:mode_* events below.
        'friend:follow': {
            'minecraft:is_tamed': {},
            'minecraft:behavior.follow_owner': {'priority': 4, 'speed_multiplier': 1.15, 'start_distance': 4, 'stop_distance': 2, 'can_teleport': True}
        },
    }
    components = {
        'minecraft:type_family': {'family': [data['family'], 'mob']},
        'minecraft:health': {'value': 100, 'max': 100},
        'minecraft:damage_sensor': {'triggers': [{'cause': 'all', 'deals_damage': 'no'}]},
        'minecraft:fire_immune': {}, 'minecraft:persistent': {},
        'minecraft:collision_box': {'width': 0.75, 'height': data.get('collision_height', 0.75)},
        'minecraft:physics': {}, 'minecraft:pushable': {'is_pushable': True, 'is_pushable_by_piston': True},
        'minecraft:movement': {'value': 0.28}, 'minecraft:movement.basic': {}, 'minecraft:jump.static': {},
        'minecraft:navigation.walk': {'can_path_over_water': False, 'avoid_water': True, 'avoid_damage_blocks': True, 'can_pass_doors': True},
        'minecraft:breathable': {'total_supply': 15, 'suffocate_time': -1, 'breathes_water': True, 'breathes_air': True},
        'minecraft:nameable': {},
        'minecraft:tameable': {'probability': 1, 'tame_items': [fruit], 'tame_event': {'event': 'minecraft:on_tame', 'target': 'self'}},
        'minecraft:behavior.float': {'priority': 0},
        'minecraft:behavior.tempt': {'priority': 6, 'speed_multiplier': 1.0, 'items': [fruit]},
        'minecraft:behavior.random_stroll': {'priority': 8, 'speed_multiplier': 0.6},
        'minecraft:behavior.look_at_player': {'priority': 7, 'look_distance': 8, 'probability': 0.08},
    }
    events = {
        'minecraft:entity_spawned': {'add': {'component_groups': [f'{name}:adult']}},
        'minecraft:entity_born': {'remove': {'component_groups': [f'{name}:adult']}, 'add': {'component_groups': [f'{name}:baby']}},
        'minecraft:ageable_grow_up': {'remove': {'component_groups': [f'{name}:baby']}, 'add': {'component_groups': [f'{name}:adult']}},
        # A freshly tamed friend starts in STAY, never following automatically.
        'minecraft:on_tame': {'add': {'component_groups': [f'{name}:tamed', f'{name}:sit']}},
        'friend:script_interact': {},
        'minecraft:on_sit': {'add': {'component_groups': [f'{name}:sit']}},
        'minecraft:on_stand': {'remove': {'component_groups': [f'{name}:sit']}},
        # Universal mode events, shared verbatim by every future fruit. main.js fires
        # these to build a component-group state that matches the persisted mode.
        'friend:mode_follow': {'remove': {'component_groups': [f'{name}:sit']}, 'add': {'component_groups': ['friend:follow']}},
        'friend:mode_stay': {'remove': {'component_groups': ['friend:follow']}, 'add': {'component_groups': [f'{name}:sit']}},
        'friend:mode_work': {'remove': {'component_groups': [f'{name}:sit', 'friend:follow']}},
        'friend:mode_home': {'remove': {'component_groups': [f'{name}:sit', 'friend:follow']}},
    }
    # Babies come only from planting fruit (orchard.js fires minecraft:entity_born).
    file_name = data.get('file', name)
    write(BP / f'entities/{file_name}.json', {'format_version': '1.21.0', 'minecraft:entity': {'description': {'identifier': entity, 'is_spawnable': True, 'is_summonable': True, 'is_experimental': False}, 'component_groups': groups, 'components': components, 'events': events}})
    write(RP / f'entity/{file_name}.entity.json', {'format_version': '1.10.0', 'minecraft:client_entity': {'description': {
        'identifier': entity, 'materials': {'default': data.get('material', 'entity_alphatest')}, 'textures': {'default': f'textures/entity/{name}'},
        'geometry': {'default': f'geometry.{name}'}, 'render_controllers': [f'controller.render.{name}'],
        'animations': {'bob': f'animation.{name}.bob', 'sit': f'animation.{name}.sit'}, 'scripts': {'animate': ['bob', {'sit': 'query.is_sitting'}]},
        'spawn_egg': {'base_color': data['egg'][0], 'overlay_color': data['egg'][1]}
    }}})
    write(RP / f'models/entity/{name}.geo.json', friend_geometry(name))
    write(RP / f'render_controllers/{name}.render_controllers.json', {'format_version': '1.8.0', 'render_controllers': {f'controller.render.{name}': {'geometry': 'Geometry.default', 'materials': [{'*': 'Material.default'}], 'textures': ['Texture.default']}}})
    write(RP / f'animations/{name}.animation.json', {'format_version': '1.8.0', 'animations': {
        f'animation.{name}.bob': {'loop': True, 'bones': {'body': {'position': [0, 'math.abs(math.sin(query.anim_time * 180)) * 0.7', 0], 'rotation': [0, 0, 'math.sin(query.modified_distance_moved * 70) * 3']}}},
        f'animation.{name}.sit': {'loop': True, 'bones': {'body': {'position': [0, -1.8, 0], 'scale': [1.25, 0.7, 1.25]}}}
    }})
    png(RP / f'textures/entity/{name}.png', friend_texture(name))
    face = friend_texture(name)[:16]
    png(ROOT / f'art/{name}-face.png', [[face[y // 16][x // 16] for x in range(256)] for y in range(256)])

def basket_texture():
    """Original 16x16 wicker basket icon for the Fruit Basket item."""
    clear = (0, 0, 0, 0)
    handle = (104, 62, 28, 255)
    rim_a = (184, 120, 58, 255)
    rim_b = (146, 92, 44, 255)
    weave_a = (206, 142, 74, 255)
    weave_b = (120, 70, 32, 255)
    grid = [[clear for _ in range(16)] for _ in range(16)]
    for x, y in [(4, 0), (11, 0), (3, 1), (12, 1)]:
        grid[y][x] = handle
    for x in range(3, 13):
        grid[2][x] = rim_a if x % 3 else rim_b
        grid[3][x] = rim_b if x % 3 else rim_a
    for y in range(4, 14):
        inset = 1 + (y - 4) // 2
        for x in range(inset, 16 - inset):
            grid[y][x] = weave_a if (x + y) % 4 in (0, 1) else weave_b
    for x in range(4, 12):
        grid[14][x] = weave_b
        grid[15][x] = handle
    return grid

BASKET = 'friend:fruit_basket'

def build_basket(bp, rp, write, png):
    """Fruit Basket: craft three sticks in the bucket shape, hold it and interact
    with a tamed friend to tuck them inside; interact with a block to let them out."""
    write(bp / 'items/fruit_basket.json', {
        'format_version': '1.21.90', 'minecraft:item': {
            'description': {'identifier': BASKET, 'menu_category': {'category': 'equipment'}},
            'components': {
                'minecraft:display_name': {'value': 'item.friend:fruit_basket.name'},
                'minecraft:icon': {'textures': {'default': 'fruit_basket'}},
                'minecraft:max_stack_size': 16,
            },
        },
    })
    write(bp / 'recipes/fruit_basket.json', {
        'format_version': '1.20.10', 'minecraft:recipe_shaped': {
            'description': {'identifier': 'friend:fruit_basket'},
            'tags': ['crafting_table'],
            'pattern': ['X X', ' X '],
            'key': {'X': {'item': 'minecraft:stick'}},
            'result': {'item': BASKET, 'count': 1},
        },
    })
    png(rp / 'textures/items/basket.png', basket_texture())
    atlas = json.loads((rp / 'textures/item_texture.json').read_text(encoding='utf-8'))
    atlas['texture_data']['fruit_basket'] = {'textures': 'textures/items/basket'}
    write(rp / 'textures/item_texture.json', atlas)
    with (rp / 'texts/en_US.lang').open('a', encoding='utf-8') as stream:
        stream.write('item.friend:fruit_basket.name=Fruit Basket\n')

def build_peel_trap(bp, rp, write):
    """A visible floor trap entity: unlike a dropped item, players cannot pick it up."""
    write(bp / 'entities/banana_peel.json', {
        'format_version': '1.21.0',
        'minecraft:entity': {
            'description': {'identifier': 'banana:peel_trap', 'is_spawnable': False, 'is_summonable': False, 'is_experimental': False},
            'component_groups': {'banana:despawn': {'minecraft:instant_despawn': {}}},
            'components': {
                'minecraft:type_family': {'family': ['banana_peel_trap']},
                'minecraft:collision_box': {'width': 0.6, 'height': 0.08},
                'minecraft:physics': {'has_gravity': True, 'has_collision': True},
                'minecraft:pushable': {'is_pushable': False, 'is_pushable_by_piston': False},
                'minecraft:damage_sensor': {'triggers': [{'cause': 'all', 'deals_damage': 'no'}]},
                'minecraft:persistent': {},
                'minecraft:timer': {'looping': False, 'time': 120, 'time_down_event': {'event': 'banana:expire', 'target': 'self'}},
            },
            'events': {'banana:expire': {'add': {'component_groups': ['banana:despawn']}}},
        },
    })
    faces = {face: {'uv': [0, 0], 'uv_size': [16, 16]} for face in ('north', 'south', 'east', 'west', 'up', 'down')}
    write(rp / 'entity/banana_peel.entity.json', {'format_version': '1.10.0', 'minecraft:client_entity': {'description': {
        'identifier': 'banana:peel_trap', 'materials': {'default': 'entity_alphatest'},
        'textures': {'default': 'textures/items/banana_peel'}, 'geometry': {'default': 'geometry.banana_peel'},
        'render_controllers': ['controller.render.banana_peel'],
    }}})
    write(rp / 'models/entity/banana_peel.geo.json', {'format_version': '1.12.0', 'minecraft:geometry': [{
        'description': {'identifier': 'geometry.banana_peel', 'texture_width': 16, 'texture_height': 16,
                        'visible_bounds_width': 1, 'visible_bounds_height': 1, 'visible_bounds_offset': [0, 0.25, 0]},
        'bones': [{'name': 'peel', 'pivot': [0, 0, 0], 'cubes': [{'origin': [-5, 0, -5], 'size': [10, 1, 10], 'uv': faces}]}],
    }]})
    write(rp / 'render_controllers/banana_peel.render_controllers.json', {'format_version': '1.8.0', 'render_controllers': {
        'controller.render.banana_peel': {'geometry': 'Geometry.default', 'materials': [{'*': 'Material.default'}], 'textures': ['Texture.default']},
    }})

def grape_seed_pixels():
    """A single green grape seed sprite for the Sharpshooter's spit projectile."""
    clear = (0, 0, 0, 0)
    dark, mid, light = (44, 100, 52, 255), (104, 176, 80, 255), (172, 222, 124, 255)
    grid = [[clear for _ in range(16)] for _ in range(16)]
    # A tear-drop shaped seed filling most of the icon.
    for y in range(3, 14):
        half = max(2, round(6 - (y - 8.5) ** 2 / 12))
        for x in range(8 - half, 8 + half):
            if 0 <= x < 16:
                grid[y][x] = dark if x in (8 - half, 8 + half - 1) or y in (3, 13) else mid
    for x, y in [(7, 5), (6, 6), (7, 6), (8, 7)]: grid[y][x] = light
    grid[2][8] = dark
    return grid

def build_grape_seed(bp, rp, write, png):
    """A spit grape seed: a script-launched projectile that damages hostile mobs."""
    write(bp / 'entities/grapes_seed.json', {
        'format_version': '1.21.0',
        'minecraft:entity': {
            'description': {'identifier': 'grapes:seed', 'is_spawnable': False, 'is_summonable': False, 'is_experimental': False},
            'component_groups': {'grapes:despawn': {'minecraft:instant_despawn': {}}},
            'components': {
                'minecraft:type_family': {'family': ['grapes_seed', 'projectile']},
                'minecraft:projectile': {
                    'gravity': 0.05,
                    'hit_sound': 'item.slime',
                    'on_hit': {'remove_on_hit': {}},
                },
                'minecraft:collision_box': {'width': 0.25, 'height': 0.25},
                'minecraft:physics': {},
                'minecraft:pushable': {'is_pushable': False, 'is_pushable_by_piston': False},
                'minecraft:timer': {'looping': False, 'time': 6.5, 'time_down_event': {'event': 'grapes:expire', 'target': 'self'}},
            },
            'events': {'grapes:expire': {'add': {'component_groups': ['grapes:despawn']}}},
        },
    })
    faces = {face: {'uv': [0, 0], 'uv_size': [16, 16]} for face in ('north', 'south', 'east', 'west', 'up', 'down')}
    write(rp / 'entity/grapes_seed.entity.json', {'format_version': '1.10.0', 'minecraft:client_entity': {'description': {
        'identifier': 'grapes:seed', 'materials': {'default': 'entity_alphatest'},
        'textures': {'default': 'textures/entity/grapes_seed'}, 'geometry': {'default': 'geometry.grapes_seed'},
        'render_controllers': ['controller.render.grapes_seed'],
    }}})
    write(rp / 'models/entity/grapes_seed.geo.json', {'format_version': '1.12.0', 'minecraft:geometry': [{
        'description': {'identifier': 'geometry.grapes_seed', 'texture_width': 16, 'texture_height': 16,
                        'visible_bounds_width': 1, 'visible_bounds_height': 1, 'visible_bounds_offset': [0, 0.2, 0]},
        'bones': [{'name': 'seed', 'pivot': [0, 0, 0], 'cubes': [{'origin': [-2, -2, -2], 'size': [4, 4, 4], 'uv': faces}]}],
    }]})
    write(rp / 'render_controllers/grapes_seed.render_controllers.json', {'format_version': '1.8.0', 'render_controllers': {
        'controller.render.grapes_seed': {'geometry': 'Geometry.default', 'materials': [{'*': 'Material.default'}], 'textures': ['Texture.default']},
    }})
    png(rp / 'textures/entity/grapes_seed.png', grape_seed_pixels())

def build(net_version='1.0.0-beta', admin_version='1.0.0-beta'):
    version = [1, 2, 31]
    for path, name, uid, modules in [
        (BP, 'Fruity Friends', BP_ID, [
            {'type': 'data', 'uuid': 'fce620e4-42ac-4477-a84b-c8113d47ba2e', 'version': version},
            {'type': 'script', 'language': 'javascript', 'entry': 'scripts/main.js', 'uuid': 'a91c511c-d9d5-48e5-82c9-25cc48706cbb', 'version': version}]),
        (RP, 'Fruity Friends Resources', RP_ID, [
            {'type': 'resources', 'uuid': '6b250c6d-d093-4cb1-b16b-a42cd137d4bb', 'version': version}])]:
        manifest = {'format_version': 2, 'header': {'name': name, 'description': 'Smiling cube companions with babies, healing, shopping, collecting, light, pranks, and bodyguarding. Friends use a universal Follow/Stay/Work/Go Home system; Apple runs the Applezon shop; Blueberry collects drops; Lemon casts moving block light; Banana (the Prankster) drops peels that trip up monsters; Grapes (the Sharpshooter) spits seeds at hostile mobs; Strawberry (the Farmer) tends crops; Coconut (the Bodyguard) slams the ground to knock back hostile mobs.', 'uuid': uid, 'version': version, 'min_engine_version': [1, 21, 90]}, 'modules': modules}
        if path == BP:
            manifest['dependencies'] = [{'uuid': RP_ID, 'version': version}, {'module_name': '@minecraft/server', 'version': '2.0.0'}, {'module_name': '@minecraft/server-ui', 'version': '2.0.0'}]
        write(path / 'manifest.json', manifest)

    (RP / 'texts').mkdir(parents=True, exist_ok=True)
    write(RP / 'texts/languages.json', ['en_US'])
    lines = []
    for name, data in FRIENDS.items():
        build_friend(name, data)
        empty_label = f'Open {data["title"]}\'s Farm Chest' if name == 'strawberry' else (f'Open {data["title"]}\'s Chest' if name == 'blueberry' else f'Manage {data["title"]}')
        empty_key = 'chest' if data.get('chest') else 'manage'
        lines.append(f'entity.{data["entity"]}.name={data["title"]}\nitem.spawn_egg.entity.{data["entity"]}.name={data["title"]} Spawn Egg\naction.interact.{name}_{empty_key}={empty_label}\naction.interact.{name}_talk=Talk to {data["title"]}\n')
    (RP / 'texts/en_US.lang').write_text(''.join(lines), encoding='utf-8')
    icon = [[friend_texture('plum')[:16][y // 8][x // 8] for x in range(128)] for y in range(128)]
    for pack in (BP, RP): png(pack / 'pack_icon.png', icon)
    build_orchard(BP, RP, ROOT, write, png)
    build_basket(BP, RP, write, png)
    build_peel_trap(BP, RP, write)
    build_grape_seed(BP, RP, write, png)
    out = ROOT / 'dist/Fruity-Friends.mcaddon'
    out.parent.mkdir(exist_ok=True)
    with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as archive:
        for pack in (BP, RP):
            for path in sorted(pack.rglob('*')):
                if path.is_file(): archive.write(path, path.relative_to(ROOT / 'packs'))
    print(f'Built {out} ({out.stat().st_size:,} bytes)')
    server_out = ROOT / 'dist/Fruity-Friends-Dedicated-Server.zip'
    manifest = json.loads((BP / 'manifest.json').read_text())
    manifest['header']['name'] += ' • Server AI'
    manifest['header']['description'] = 'Dedicated Server edition with typed AI chat. Requires Beta APIs and the Fruity Friends bridge.'
    manifest['dependencies'] += [{'module_name': '@minecraft/server-net', 'version': net_version}, {'module_name': '@minecraft/server-admin', 'version': admin_version}]
    with zipfile.ZipFile(server_out, 'w', zipfile.ZIP_DEFLATED) as archive:
        archive.writestr('START-HERE.md', '''# Fruity Friends

Read plum-service/SETUP.md to install the AI edition on a Bedrock Dedicated Server.
This zip contains the server packs and a Python service; it is not a mobile import file.

## Play

1. To start in Survival, use a plum, apple, blueberry, lemon, banana, grape, strawberry or coconut fruit on tilled farmland: a sprout appears
   and grows into a baby friend on its own (or interact with it to sprout it immediately).
   In Creative, spawn friends with the matching Spawn Egg instead.
2. Give each friend its own fruit to tame them: a plum tames Plum, an apple tames Apple, a
   blueberry tames Blueberry, a lemon tames Lemon, a banana tames Banana, grapes tame Grapes,
   a strawberry tames Strawberry, and a coconut tames Coconut.
   A newly tamed friend stays put where it is. Interact with an empty hand (or, for Blueberry and Strawberry,
   choose Movement in their chest menu) to open the Movement menu: Follow, Stay, Work, or Go Home.
   Up to six friends can follow you at once. Work keeps a friend within 20 blocks of where you
   set it; Go Home sends a friend to your spawn point, where it roams within 10 blocks.
3. Hold a book and interact (Talk to Plum / Talk to Apple / Talk to Blueberry / Talk to Lemon / Talk to Banana / Talk to Grapes / Talk to Strawberry / Talk to Coconut on touch, right-click on PC).
4. Choose Ask a question and type your message. Replies are private.
5. Plant a fruit on tilled farmland to grow a baby friend; it sprouts and grows in 20 loaded minutes.
6. Tame the baby with its fruit; more fruit speeds its growth. Stay within 8 blocks of your tamed Plum for regeneration. Apple does not heal you;
   instead she owns Applezon and delivers a surprise or a search result for one apple fruit.
7. Blueberry is the Collector: dropped items within four blocks go straight into his chest. Interact with
   him with an empty hand to open it, store what you are holding, take something out, or choose Movement.
8. Lemon is the Light Friend: he drops a real light block at his feet as he moves, so he
   lights the way with moving block light instead of Night Vision.
   Lemon does not heal you; stay near your tamed Plum for that.
9. Banana is the Prankster: he is convinced he is your bodyguard. About every 30 seconds he drops a
   non-pickup banana peel trap. The first hostile mob that steps close slips and slows; an unused peel
   removes itself after two minutes. He does not heal you and
   his co-workers are unimpressed.
10. Grapes is the Sharpshooter: this squarish bunch of green grapes spits grape seeds at hostile mobs
    (no bow and arrow - just seeds). A tamed Grapes takes aim at monsters within 12 blocks, dealing
    damage with lovely arcing spits. Grapes does not heal you; stay near your tamed Plum for that.
11. Strawberry is the Farmer: the only cube friend whose job changes with his mode. Set him to Work and he
    tends fields - he quickens immature wheat, carrots, potatoes, and beetroot, harvests ripe crops, and
    replants the seeds so the field keeps producing. Following (or staying at home), he forages instead:
    he still speeds growth and gathers ripe crops, breaks grass looking for seeds, and never replants.
    Everything he gathers goes into his own farm chest: interact with him with an empty hand to open it,
    store what you hold, take the harvest out, or pick Movement. Strawberry does not heal you; stay near
    your tamed Plum for that.
12. Coconut is the Bodyguard: about every three seconds he checks for hostile mobs around him and slams
    the palm-frond ground, knocking every monster nearby away with a bit of damage. Set him to Work and
    he guards that spot with a wider radius (8 blocks); following or staying at home, he escorts you and
    guards up to 6 blocks around wherever he is. He only slams when something hostile is actually close,
    and he does not heal you; stay near your tamed Plum for that.
13. Craft a Fruit Basket from three sticks in the bucket shape, then hold it and interact with a tamed
    friend to tuck them inside (Blueberry keeps his chest contents; Strawberry keeps his farm chest).
    Carry them in your inventory and interact with a block to let them out again — they always come out in Stay mode, waiting for your next order.

Find plum, apple, blueberry and grape trees in newly generated plains and forests, lemon trees in warm
biomes like deserts, savannas and jungles, banana trees in jungles, low strawberry bushes in plains
only, and tall coconut palms on beaches. Break their fruit-speckled leaves in Survival for the matching
fruit and sapling. Plant a sapling
on soil with a clear space (strawberries need just a tiny 3-wide, 2-high pocket; the other fruit trees
need 5-wide, 6-high; coconut palms are taller and need 5-wide, 7-high); wait for growth or use bone meal.
Leaves do not decay automatically.
The fruit works as a seed and snack: plant it on farmland to grow a baby friend.

Updating from 1.1.0: replace both pack folders and the bridge script, update each Fruity Friends
world-pack-list entry to [1,2,31], and restart. Keep existing credentials and UUIDs.

Friends resist ordinary damage and do not naturally despawn. Administrative removal,
/kill, and engine edge cases are outside this protection. Unloaded companions cannot
be moved by scripts; return to their area if needed. Cube friends have no Survival spawn recipe.

Automated tests pass. In-game behavior and live AI calls still need verification.
The AI service needs a privately configured OpenAI API key with API access/billing.
''')
        for pack, folder in [(BP, 'behavior_packs'), (RP, 'resource_packs')]:
            for path in sorted(pack.rglob('*')):
                if not path.is_file(): continue
                relative = path.relative_to(pack).as_posix()
                target = f'{folder}/{pack.name}/{relative}'
                if pack == BP and relative == 'manifest.json':
                    archive.writestr(target, json.dumps(manifest, indent=2) + '\n')
                elif pack == BP and relative == 'scripts/provider.js':
                    archive.write(ROOT / 'server/provider.js', target)
                else:
                    archive.write(path, target)
        for path in (ROOT / 'server').rglob('*'):
            if path.is_file() and '__pycache__' not in path.parts and path.name != 'provider.js':
                archive.write(path, 'plum-service/' + path.relative_to(ROOT / 'server').as_posix())
        archive.writestr('world-pack-lists/world_behavior_packs.json', json.dumps([{'pack_id': BP_ID, 'version': version}], indent=2))
        archive.writestr('world-pack-lists/world_resource_packs.json', json.dumps([{'pack_id': RP_ID, 'version': version}], indent=2))
    print(f'Built {server_out} ({server_out.stat().st_size:,} bytes)')

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--net-version', default='1.0.0-beta', help='Manifest version exposed by your BDS runtime (not npm package version)')
    parser.add_argument('--admin-version', default='1.0.0-beta')
    args = parser.parse_args()
    build(args.net_version, args.admin_version)
