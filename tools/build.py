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

def build(net_version='1.0.0-beta', admin_version='1.0.0-beta'):
    version = [1, 1, 0]
    for path, name, uid, modules in [
        (BP, 'Plum • Purple Cube Friend', BP_ID, [
            {'type': 'data', 'uuid': 'fce620e4-42ac-4477-a84b-c8113d47ba2e', 'version': version},
            {'type': 'script', 'language': 'javascript', 'entry': 'scripts/main.js', 'uuid': 'a91c511c-d9d5-48e5-82c9-25cc48706cbb', 'version': version}]),
        (RP, 'Plum • Purple Cube Friend Resources', RP_ID, [
            {'type': 'resources', 'uuid': '6b250c6d-d093-4cb1-b16b-a42cd137d4bb', 'version': version}])]:
        manifest = {'format_version': 2, 'header': {'name': name, 'description': 'A smiling purple companion with babies, healing, and offline typed Minecraft help.', 'uuid': uid, 'version': version, 'min_engine_version': [1, 21, 90]}, 'modules': modules}
        if path == BP:
            manifest['dependencies'] = [{'uuid': RP_ID, 'version': version}, {'module_name': '@minecraft/server', 'version': '2.0.0'}, {'module_name': '@minecraft/server-ui', 'version': '2.0.0'}]
        write(path / 'manifest.json', manifest)

    groups = {
        'plum:adult': {
            'minecraft:scale': {'value': 1},
            'minecraft:breedable': {'require_tame': True, 'require_full_health': False, 'breed_cooldown': 60, 'inherit_tamed': False, 'breed_items': ['plum:plum'], 'breeds_with': {'mate_type': 'plum:friend', 'baby_type': 'plum:friend', 'breed_event': {'event': 'minecraft:entity_born', 'target': 'baby'}}},
            'minecraft:behavior.breed': {'priority': 2, 'speed_multiplier': 1.0}
        },
        'plum:baby': {
            'minecraft:is_baby': {}, 'minecraft:scale': {'value': 0.5},
            'minecraft:ageable': {'duration': 1200, 'feed_items': ['plum:plum'], 'grow_up': {'event': 'minecraft:ageable_grow_up', 'target': 'self'}},
            'minecraft:behavior.follow_parent': {'priority': 5, 'speed_multiplier': 1.15}
        },
        'plum:tamed': {
            'minecraft:is_tamed': {},
            'minecraft:behavior.follow_owner': {'priority': 4, 'speed_multiplier': 1.15, 'start_distance': 4, 'stop_distance': 2, 'can_teleport': True}
        }
    }
    components = {
        'minecraft:type_family': {'family': ['plum_friend', 'mob']},
        'minecraft:health': {'value': 100, 'max': 100},
        'minecraft:damage_sensor': {'triggers': [{'cause': 'all', 'deals_damage': 'no'}]},
        'minecraft:fire_immune': {}, 'minecraft:persistent': {},
        'minecraft:collision_box': {'width': 0.75, 'height': 0.75},
        'minecraft:physics': {}, 'minecraft:pushable': {'is_pushable': True, 'is_pushable_by_piston': True},
        'minecraft:movement': {'value': 0.28}, 'minecraft:movement.basic': {}, 'minecraft:jump.static': {},
        'minecraft:navigation.walk': {'can_path_over_water': False, 'avoid_water': True, 'avoid_damage_blocks': True, 'can_pass_doors': True},
        'minecraft:breathable': {'total_supply': 15, 'suffocate_time': -1, 'breathes_water': True, 'breathes_air': True},
        'minecraft:nameable': {},
        'minecraft:tameable': {'probability': 1, 'tame_items': ['plum:plum'], 'tame_event': {'event': 'minecraft:on_tame', 'target': 'self'}},
        'minecraft:behavior.float': {'priority': 0},
        'minecraft:behavior.tempt': {'priority': 6, 'speed_multiplier': 1.0, 'items': ['plum:plum']},
        'minecraft:behavior.random_stroll': {'priority': 8, 'speed_multiplier': 0.6},
        'minecraft:behavior.look_at_player': {'priority': 7, 'look_distance': 8, 'probability': 0.08},
        'minecraft:interact': {'interactions': [{'on_interact': {'filters': {'all_of': [{'test': 'is_family', 'subject': 'other', 'value': 'player'}, {'test': 'has_equipment', 'subject': 'other', 'domain': 'hand', 'value': 'minecraft:book'}]}, 'event': 'plum:talk', 'target': 'self'}, 'interact_text': 'action.interact.plum_talk'}]}
    }
    events = {
        'minecraft:entity_spawned': {'add': {'component_groups': ['plum:adult']}},
        'minecraft:entity_born': {'remove': {'component_groups': ['plum:adult']}, 'add': {'component_groups': ['plum:baby']}},
        'minecraft:ageable_grow_up': {'remove': {'component_groups': ['plum:baby']}, 'add': {'component_groups': ['plum:adult']}},
        'minecraft:on_tame': {'add': {'component_groups': ['plum:tamed']}},
        'plum:talk': {}
    }
    # Keep the legacy format explicitly: breeding fields changed in the 1.26 format.
    write(BP / 'entities/friend.json', {'format_version': '1.21.0', 'minecraft:entity': {'description': {'identifier': 'plum:friend', 'is_spawnable': True, 'is_summonable': True, 'is_experimental': False}, 'component_groups': groups, 'components': components, 'events': events}})
    write(RP / 'entity/friend.entity.json', {'format_version': '1.10.0', 'minecraft:client_entity': {'description': {
        'identifier': 'plum:friend', 'materials': {'default': 'entity_alphatest'}, 'textures': {'default': 'textures/entity/plum'},
        'geometry': {'default': 'geometry.plum'}, 'render_controllers': ['controller.render.plum'],
        'animations': {'bob': 'animation.plum.bob'}, 'scripts': {'animate': ['bob']},
        'spawn_egg': {'base_color': '#9154DB', 'overlay_color': '#F6C1F4'}
    }}})
    uv = {face: {'uv': [0 if face == 'north' else 16, 0], 'uv_size': [16, 16]} for face in ['north', 'south', 'east', 'west', 'up', 'down']}
    write(RP / 'models/entity/plum.geo.json', {'format_version': '1.12.0', 'minecraft:geometry': [{'description': {'identifier': 'geometry.plum', 'texture_width': 32, 'texture_height': 16, 'visible_bounds_width': 2, 'visible_bounds_height': 2, 'visible_bounds_offset': [0, 0.5, 0]}, 'bones': [{'name': 'body', 'pivot': [0, 6, 0], 'cubes': [{'origin': [-6, 0, -6], 'size': [12, 12, 12], 'uv': uv}]}]}]})
    write(RP / 'render_controllers/plum.render_controllers.json', {'format_version': '1.8.0', 'render_controllers': {'controller.render.plum': {'geometry': 'Geometry.default', 'materials': [{'*': 'Material.default'}], 'textures': ['Texture.default']}}})
    write(RP / 'animations/plum.animation.json', {'format_version': '1.8.0', 'animations': {'animation.plum.bob': {'loop': True, 'bones': {'body': {'position': [0, 'math.abs(math.sin(query.anim_time * 180)) * 0.7', 0], 'rotation': [0, 0, 'math.sin(query.modified_distance_moved * 70) * 3']}}}}})
    (RP / 'texts').mkdir(parents=True, exist_ok=True)
    write(RP / 'texts/languages.json', ['en_US'])
    (RP / 'texts/en_US.lang').write_text('entity.plum:friend.name=Plum\nitem.spawn_egg.entity.plum:friend.name=Plum Spawn Egg\naction.interact.plum_talk=Talk to Plum\n', encoding='utf-8')
    purple, edge, light, dark, white, pink = (149, 81, 221, 255), (110, 53, 182, 255), (183, 119, 247, 255), (47, 24, 77, 255), (255, 248, 255, 255), (244, 147, 214, 255)
    tile = [[edge if x in (0,15) or y in (0,15) else light if y == 1 else purple for x in range(16)] for y in range(16)]
    face = [r[:] for r in tile]
    for x in (4,10):
        for y in range(4,8):
            face[y][x] = face[y][x+1] = dark
        face[4][x] = white
    for x,y in [(4,10),(5,11),(6,12),(7,12),(8,12),(9,12),(10,11),(11,10)]: face[y][x] = dark
    for x in (2,3,12,13): face[9][x] = pink
    png(RP / 'textures/entity/plum.png', [face[y] + tile[y] for y in range(16)])
    icon = [[face[y//8][x//8] for x in range(128)] for y in range(128)]
    for pack in (BP, RP): png(pack / 'pack_icon.png', icon)
    png(ROOT / 'art/plum-face.png', [[face[y//16][x//16] for x in range(256)] for y in range(256)])
    build_orchard(BP, RP, ROOT, write, png)
    out = ROOT / 'dist/Plum-Friend.mcaddon'
    out.parent.mkdir(exist_ok=True)
    with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as archive:
        for pack in (BP, RP):
            for path in sorted(pack.rglob('*')):
                if path.is_file(): archive.write(path, path.relative_to(ROOT / 'packs'))
    print(f'Built {out} ({out.stat().st_size:,} bytes)')
    server_out = ROOT / 'dist/Plum-Dedicated-Server.zip'
    manifest = json.loads((BP / 'manifest.json').read_text())
    manifest['header']['name'] += ' • Server AI'
    manifest['header']['description'] = 'Dedicated Server edition with typed AI chat. Requires Beta APIs and the Plum bridge.'
    manifest['dependencies'] += [{'module_name': '@minecraft/server-net', 'version': net_version}, {'module_name': '@minecraft/server-admin', 'version': admin_version}]
    with zipfile.ZipFile(server_out, 'w', zipfile.ZIP_DEFLATED) as archive:
        archive.writestr('START-HERE.md', '''# Plum — Purple Cube Friend

Read plum-service/SETUP.md to install the AI edition on a Bedrock Dedicated Server.
This zip contains the server packs and a Python service; it is not a mobile import file.

## Play

1. Spawn two friends with Plum Spawn Egg in Creative, or /summon plum:friend ~ ~ ~.
2. Give each a plum fruit to tame them. They follow their owner.
3. Hold a book and interact (Talk to Plum on touch, right-click on PC).
4. Choose Ask a question and type your message. Replies are private.
5. Feed two nearby tamed adults a plum each to breed a half-size baby.
6. Tame the baby with a plum too. Babies grow in 20 loaded minutes; plums help.
7. Stay within 8 blocks of your tamed friend for regeneration.

Find plum trees in newly generated plains and forests. Break their fruit-speckled leaves
in Survival for plums and saplings. Plant a sapling on soil with a clear 5-wide, 6-high
space; wait for growth or use bone meal. Leaves do not decay automatically.
Plums replace apples for breeding and baby growth. You can eat them too.

Updating from 1.0.0: replace both pack folders and the bridge script, update each Plum
world-pack-list entry to [1,1,0], and restart. Keep existing credentials and UUIDs.

Plum resists ordinary damage and does not naturally despawn. Administrative removal,
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
