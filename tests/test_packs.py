import json
from pathlib import Path
import unittest
import uuid
import zipfile

ROOT = Path(__file__).parents[1]

class PackTests(unittest.TestCase):
    def test_archives_and_script_dependencies(self):
        for name, prefix in [('Fruity-Friends.mcaddon', 'Plum_BP/'), ('Fruity-Friends-Dedicated-Server.zip', 'behavior_packs/Plum_BP/')]:
            with zipfile.ZipFile(ROOT / 'dist' / name) as archive:
                self.assertIsNone(archive.testzip())
                for file in archive.namelist():
                    if file.endswith('.json'): json.loads(archive.read(file))
                manifest = json.loads(archive.read(prefix + 'manifest.json'))
                for module in manifest['modules']:
                    uuid.UUID(module['uuid'])
                    if module['type'] == 'script': self.assertIn(prefix + module['entry'], archive.namelist())
                provider = archive.read(prefix + 'scripts/provider.js').decode()
                if name.endswith('.mcaddon'):
                    self.assertNotIn('server-net', provider)
                else:
                    self.assertIn('server-net', provider)
                    self.assertTrue(any(d.get('module_name') == '@minecraft/server-net' for d in manifest['dependencies']))

    def test_lifecycle_references_and_baby_growth(self):
        for file in ['friend.json', 'apple.json', 'blueberry.json', 'lemon.json', 'banana.json']:
            entity = json.loads((ROOT / 'packs/Plum_BP/entities' / file).read_text())['minecraft:entity']
            groups = entity['component_groups']
            for event in entity['events'].values():
                for action in ('add', 'remove'):
                    for group in event.get(action, {}).get('component_groups', []): self.assertIn(group, groups)
            active = set()
            def apply(name):
                event = entity['events'][name]
                active.difference_update(event.get('remove', {}).get('component_groups', []))
                active.update(event.get('add', {}).get('component_groups', []))
            apply('minecraft:entity_spawned')
            apply('minecraft:entity_born')
            self.assertEqual(active, {f'{entity["description"]["identifier"].split(":")[0]}:baby'})
            self.assertNotIn('minecraft:breedable', groups[list(filter(lambda k: k.endswith(':baby'), groups))[0]])
            adult = groups[list(filter(lambda k: k.endswith(':adult'), groups))[0]]
            self.assertNotIn('minecraft:breedable', adult, 'breeding was removed; babies come only from planting fruit')
            self.assertNotIn('minecraft:behavior.breed', adult)
            apply('minecraft:on_tame')
            apply('minecraft:ageable_grow_up')
            # A freshly tamed friend starts in STAY (sit group), so tame + grow leaves
            # the friend sitting-but-grown: adult, tamed, sit.
            self.assertEqual(active, {f'{entity["description"]["identifier"].split(":")[0]}:adult', f'{entity["description"]["identifier"].split(":")[0]}:tamed', f'{entity["description"]["identifier"].split(":")[0]}:sit'})
            sit_group = groups[list(filter(lambda k: k.endswith(':sit'), groups))[0]]
            self.assertIn('minecraft:is_sitting', sit_group, 'sit group must contain the is_sitting flag')
            self.assertIn('minecraft:on_sit', entity['events'])
            self.assertIn('minecraft:on_stand', entity['events'])
            self.assertIn(f'{entity["description"]["identifier"].split(":")[0]}:sit',
                          entity['events']['minecraft:on_sit'].get('add', {}).get('component_groups', []))
            self.assertIn(f'{entity["description"]["identifier"].split(":")[0]}:sit',
                          entity['events']['minecraft:on_stand'].get('remove', {}).get('component_groups', []))

    def test_universal_movement_modes(self):
        lang = (ROOT / 'packs/Plum_RP/texts/en_US.lang').read_text()
        for file in ['friend.json', 'apple.json', 'blueberry.json', 'lemon.json', 'banana.json']:
            entity = json.loads((ROOT / 'packs/Plum_BP/entities' / file).read_text())['minecraft:entity']
            groups = entity['component_groups']
            prefix = entity['description']['identifier'].split(':')[0]
            # The tamed group must never auto-follow: a freshly tamed friend starts in STAY.
            self.assertNotIn('minecraft:behavior.follow_owner', groups[f'{prefix}:tamed'],
                             f'{file}: the tamed group must not contain follow_owner (new tames start in STAY)')
            interactions = groups[f'{prefix}:tamed']['minecraft:interact']['interactions']
            # Manage and talk get native prompts. The Fruit Basket must NOT be a native
            # interaction: the engine claims custom-item interactions and swallows the tap
            # before main.js can capture the friend (basketing is script-only, 1.2.17 style).
            self.assertEqual(len(interactions), 2)
            for entry in interactions:
                self.assertIn(f'{entry["interact_text"]}=', lang)
                self.assertIn({'test': 'is_owner', 'subject': 'other', 'value': True},
                              entry['on_interact']['filters']['all_of'])
            self.assertEqual(
                {entry['interact_text'] for entry in interactions},
                {f'action.interact.{prefix}_chest' if prefix == 'blueberry' else f'action.interact.{prefix}_manage',
                 f'action.interact.{prefix}_talk'})
            held_filters = [entry['on_interact']['filters']['all_of'][-1] for entry in interactions]
            self.assertEqual(held_filters[0], {'test': 'all_slots_empty', 'subject': 'other', 'value': 'hand'})
            self.assertEqual({entry.get('value') for entry in held_filters[1:]}, {'minecraft:book'})
            self.assertIn('friend:script_interact', entity['events'])
            self.assertIn('minecraft:is_tamed', groups['friend:follow'])
            self.assertIn('minecraft:behavior.follow_owner', groups['friend:follow'],
                          f'{file}: FOLLOW mode is powered by the universal friend:follow group')
            self.assertIn('minecraft:is_sitting', groups[f'{prefix}:sit'])
            # on_tame lands in STAY (tamed + sit), never auto-following.
            tame_groups = entity['events']['minecraft:on_tame'].get('add', {}).get('component_groups', [])
            self.assertIn(f'{prefix}:tamed', tame_groups)
            self.assertIn(f'{prefix}:sit', tame_groups)
            # Universal mode events drive follow/stay/work/home and keep the mode groups legal.
            for event, adds in [('friend:mode_follow', ['friend:follow']), ('friend:mode_stay', [f'{prefix}:sit'])]:
                self.assertIn(event, entity['events'])
                self.assertIn(adds[0], entity['events'][event].get('add', {}).get('component_groups', []))
            for event in ['friend:mode_follow', 'friend:mode_stay', 'friend:mode_work', 'friend:mode_home']:
                self.assertIn(event, entity['events'])
                for action in ('add', 'remove'):
                    for group in entity['events'][event].get(action, {}).get('component_groups', []):
                        self.assertIn(group, groups, f'{file}: {event} {action} references missing group {group}')
            self.assertIn("from './friend_state.js'", (ROOT / 'packs/Plum_BP/scripts/main.js').read_text())
            self.assertIn('friend:mode_stay', (ROOT / 'packs/Plum_BP/scripts/main.js').read_text(),
                          'basket release should always restore a friend to Stay')

    def test_apple_tames_and_grows(self):
        entity = json.loads((ROOT / 'packs/Plum_BP/entities/apple.json').read_text())['minecraft:entity']
        groups = entity['component_groups']
        self.assertNotIn('minecraft:breedable', groups['apple:adult'], 'planting fruit grows a baby, not breeding')
        self.assertEqual(groups['apple:baby']['minecraft:ageable']['feed_items'], ['apple:apple'])
        self.assertEqual(entity['components']['minecraft:tameable']['tame_items'], ['apple:apple'])
        self.assertEqual(entity['components']['minecraft:behavior.tempt']['items'], ['apple:apple'])
        self.assertNotIn('minecraft:interact', entity['components'])
        script = (ROOT / 'packs/Plum_BP/scripts/main.js').read_text()
        self.assertIn('world.beforeEvents.playerInteractWithEntity', script)
        self.assertNotIn('world.afterEvents.playerInteractWithEntity', script,
                         'script-owned interactions must not wait for an engine interaction to succeed')
        self.assertTrue((ROOT / 'packs/Plum_RP/textures/entity/apple.png').exists())

    def test_blueberry_collector_and_chest(self):
        bp, rp = ROOT / 'packs/Plum_BP', ROOT / 'packs/Plum_RP'
        entity = json.loads((bp / 'entities/blueberry.json').read_text())['minecraft:entity']
        groups = entity['component_groups']
        self.assertEqual(entity['components']['minecraft:tameable']['tame_items'], ['blueberry:blueberry'])
        self.assertEqual(groups['blueberry:baby']['minecraft:ageable']['feed_items'], ['blueberry:blueberry'])
        self.assertEqual(entity['components']['minecraft:type_family']['family'][0], 'blueberry_friend')
        self.assertNotIn('minecraft:breedable', groups['blueberry:adult'])
        script = (bp / 'scripts/main.js').read_text()
        for needle in [
            "import { CHEST_SLOTS, parseChest, serializeChest, chestIsFull, chestStore, chestTake } from './chest.js'",
            "const CHEST_KEY = 'blueberry:chest'",
            'function openChest(player, friend)',
            'storeHeldItem(player, friend)', 'takeChestItem(player, friend)',
            "type: 'minecraft:item'", "getComponent('minecraft:item')",
            "FRIENDS[target.typeId]?.collector", 'readChest(friend)',
            "chest: cfg.collector ? readChest(friend) : undefined",
        ]:
            self.assertIn(needle, script, f'blueberry collector/chest feature missing: {needle}')
        chest_module = (bp / 'scripts/chest.js').read_text()
        for needle in ['export const CHEST_SLOTS = 27', 'export function parseChest',
                       'export function chestStore', 'export function chestTake']:
            self.assertIn(needle, chest_module, f'chest module missing: {needle}')
        self.assertTrue((rp / 'textures/entity/blueberry.png').exists())
        self.assertTrue((rp / 'models/entity/blueberry.geo.json').exists())

    def test_lemon_light_friend_illuminates_nearby_players(self):
        bp, rp = ROOT / 'packs/Plum_BP', ROOT / 'packs/Plum_RP'
        entity = json.loads((bp / 'entities/lemon.json').read_text())['minecraft:entity']
        groups = entity['component_groups']
        self.assertEqual(entity['components']['minecraft:tameable']['tame_items'], ['lemon:lemon'])
        self.assertEqual(groups['lemon:baby']['minecraft:ageable']['feed_items'], ['lemon:lemon'])
        self.assertEqual(entity['components']['minecraft:type_family']['family'][0], 'lemon_friend')
        self.assertNotIn('minecraft:breedable', groups['lemon:adult'])
        self.assertIn('friend:mode_follow', entity['events'])
        self.assertIn('friend:mode_stay', entity['events'])
        script = (bp / 'scripts/main.js').read_text()
        for needle in [
            "'lemon:friend':", "name: 'Lemon'", "fruit: 'lemon:lemon'", 'light: true',
            "'lemon:lemon': 'lemon:friend'", "lemon: 'lemon:friend'",
            'const LEMON_LIGHT_RADIUS = 8', "getPlayers({ location: friend.location",
            "addEffect('night_vision'",
        ]:
            self.assertIn(needle, script, f'lemon light-friend feature missing: {needle}')
        self.assertNotIn("addEffect('glowing'", script, 'glowing is a Java-only effect')
        self.assertNotIn('HOSTILE_FAMILY', script)
        self.assertNotIn('hostile.remove()', script)
        self.assertTrue((rp / 'models/entity/lemon.geo.json').exists())
        self.assertTrue((rp / 'textures/entity/lemon.png').exists())
        client = json.loads((rp / 'entity/lemon.entity.json').read_text())['minecraft:client_entity']['description']
        self.assertEqual(client['materials']['default'], 'entity_emissive_alpha')
        lang = (rp / 'texts/en_US.lang').read_text()
        self.assertIn('entity.lemon:friend.name=Lemon', lang)
        self.assertIn('Talk to Lemon', lang)

    def test_banana_prankster_and_tall(self):
        bp, rp = ROOT / 'packs/Plum_BP', ROOT / 'packs/Plum_RP'
        def read(path): return json.loads((bp / path).read_text())
        entity = read('entities/banana.json')['minecraft:entity']
        groups = entity['component_groups']
        self.assertEqual(entity['components']['minecraft:tameable']['tame_items'], ['banana:banana'])
        self.assertEqual(groups['banana:baby']['minecraft:ageable']['feed_items'], ['banana:banana'])
        self.assertEqual(entity['components']['minecraft:type_family']['family'][0], 'banana_friend')
        self.assertEqual(entity['components']['minecraft:collision_box']['height'], 1.4, 'Banana is ~1.5 blocks tall')
        self.assertNotIn('minecraft:breedable', groups['banana:adult'])
        script = (bp / 'scripts/main.js').read_text()
        for needle in [
            "'banana:friend':", "name: 'Banana'", "fruit: 'banana:banana'", 'prankster: true',
            "'banana:banana': 'banana:friend'", "banana: 'banana:friend'",
            "const PEEL_ENTITY = 'banana:peel_trap'", 'PEEL_INTERVAL = 600', 'PEEL_TRIGGER_RADIUS = 0.9',
            'spawnEntity(PEEL_ENTITY', 'peel.remove()', 'applyImpulse',
            "hostile.addEffect('slowness'", "families: ['monster']",
        ]:
            self.assertIn(needle, script, f'banana prankster feature missing: {needle}')
        self.assertFalse((bp / 'items/banana_peel.json').exists(), 'peel traps must not be collectible items')
        peel = read('entities/banana_peel.json')['minecraft:entity']
        self.assertEqual(peel['description']['identifier'], 'banana:peel_trap')
        self.assertFalse(peel['description']['is_summonable'])
        self.assertEqual(peel['components']['minecraft:timer']['time'], 120)
        self.assertIn('minecraft:instant_despawn', peel['component_groups']['banana:despawn'])
        peel_client = json.loads((rp / 'entity/banana_peel.entity.json').read_text())['minecraft:client_entity']['description']
        self.assertEqual(peel_client['identifier'], 'banana:peel_trap')
        self.assertTrue((rp / (peel_client['textures']['default'] + '.png')).exists())
        self.assertTrue((rp / 'models/entity/banana_peel.geo.json').exists())
        geo = json.loads((rp / 'models/entity/banana.geo.json').read_text())['minecraft:geometry'][0]
        cube = geo['bones'][0]['cubes'][0]
        self.assertEqual(cube['size'], [12, 24, 12], 'Banana is a 1.5-block-tall 12x24x12 cuboid')
        self.assertEqual(geo['description']['texture_height'], 40)
        top = cube['uv']['up']
        self.assertEqual(top['uv'], [0, 24], 'tall sheet puts the top face below the 24-row body')
        lang = (rp / 'texts/en_US.lang').read_text()
        self.assertIn('entity.banana:friend.name=Banana', lang)
        self.assertIn('Talk to Banana', lang)
        self.assertTrue((rp / 'textures/entity/banana.png').exists())

    def test_model_and_texture_references(self):
        rp = ROOT / 'packs/Plum_RP'
        client_files = {'plum': 'entity/friend.entity.json', 'apple': 'entity/apple.entity.json', 'blueberry': 'entity/blueberry.entity.json', 'lemon': 'entity/lemon.entity.json', 'banana': 'entity/banana.entity.json'}
        for name, client_file in client_files.items():
            client = json.loads((rp / client_file).read_text())['minecraft:client_entity']['description']
            self.assertEqual(client['identifier'], f'{name}:friend')
            self.assertTrue((rp / (client['textures']['default'] + '.png')).exists())
            ani = json.loads((rp / 'animations' / f'{name}.animation.json').read_text())['animations']
            for ref, path in client['animations'].items():
                self.assertIn(path, ani)
            self.assertIn('query.is_sitting', json.dumps(client['scripts']['animate']), 'client should play the sit pose when sitting')
            geo = json.loads((rp / 'models/entity' / f'{name}.geo.json').read_text())['minecraft:geometry'][0]
            self.assertEqual(geo['description']['identifier'], client['geometry']['default'])
            for cube in geo['bones'][0]['cubes']:
                for face in cube['uv'].values():
                    self.assertLessEqual(face['uv'][0] + face['uv_size'][0], geo['description']['texture_width'])
                    self.assertLessEqual(face['uv'][1] + face['uv_size'][1], geo['description']['texture_height'])

    def test_survival_fruit_chain_and_versioned_update(self):
        bp, rp = ROOT / 'packs/Plum_BP', ROOT / 'packs/Plum_RP'
        def read(path): return json.loads(path.read_text())
        for fruit, entity_file in [('plum', 'friend.json'), ('apple', 'apple.json'), ('blueberry', 'blueberry.json'), ('lemon', 'lemon.json'), ('banana', 'banana.json')]:
            fruit_item = read(bp / 'items' / f'{fruit}.json')['minecraft:item']['description']['identifier']
            self.assertEqual(fruit_item, f'{fruit}:{fruit}')
            icon = read(bp / 'items' / f'{fruit}.json')['minecraft:item']['components']['minecraft:icon']
            icon_key = icon['textures']['default'] if isinstance(icon, dict) else icon
            atlas = read(rp / 'textures/item_texture.json')['texture_data']
            self.assertIn(icon_key, atlas)
            self.assertTrue((rp / (atlas[icon_key]['textures'] + '.png')).exists())
            entity = read(bp / 'entities' / entity_file)['minecraft:entity']
            self.assertNotIn('minecraft:breedable', entity['component_groups'][f'{fruit}:adult'], 'planting fruit grows a baby, not breeding')
            self.assertEqual(entity['component_groups'][f'{fruit}:baby']['minecraft:ageable']['feed_items'], [fruit_item])
            self.assertIn(fruit_item, entity['components']['minecraft:behavior.tempt']['items'])
            self.assertEqual(entity['components']['minecraft:tameable']['tame_items'], [fruit_item])
            self.assertNotIn('minecraft:interact', entity['components'], 'entity-wide interact competes with taming and item actions')
            self.assertEqual(entity['components']['minecraft:type_family']['family'][0], f'{fruit}_friend')
            tree = read(bp / 'features' / f'{fruit}_tree.json')['minecraft:tree_feature']
            rule = read(bp / 'feature_rules' / f'{fruit}_tree_rule.json')['minecraft:feature_rules']
            self.assertEqual(rule['description']['places_feature'], tree['description']['identifier'])
            self.assertEqual(tree['description']['identifier'], f'{fruit}:{fruit}_tree')
            self.assertEqual(tree['trunk']['trunk_height'], {'range_min': 4, 'range_max': 4})
            self.assertEqual(tree['canopy']['min_width'], 2)
            self.assertEqual(tree['canopy']['variation_chance'], {'numerator': 1, 'denominator': 1})
            included = {tag['value'] for tag in rule['conditions']['minecraft:biome_filter']['all_of'][1]['any_of']}
            if fruit == 'lemon':
                self.assertEqual(included, {'desert', 'savanna', 'jungle'})
                self.assertNotIn('plains', included)
                self.assertNotIn('forest', included)
            elif fruit == 'banana':
                self.assertEqual(included, {'jungle'}, 'banana trees grow only in jungles')
                self.assertNotIn('plains', included)
                self.assertNotIn('desert', included)
            else:
                self.assertEqual(included, {'plains', 'forest'})
                self.assertNotIn('jungle', included)
            leaves = read(bp / 'blocks' / f'{fruit}_leaves.json')['minecraft:block']
            self.assertEqual(tree['canopy']['leaf_block'], leaves['description']['identifier'])
            loot = read(bp / leaves['components']['minecraft:loot'])
            drops = {entry['name'] for pool in loot['pools'] for entry in pool['entries']}
            self.assertEqual(drops, {fruit_item, f'{fruit}:{fruit}_sapling'})
            fruit_components = read(bp / 'items' / f'{fruit}.json')['minecraft:item']['components']
            self.assertEqual(fruit_components['minecraft:block_placer']['block'], f'{fruit}:{fruit}_sprout')
            self.assertEqual(fruit_components['minecraft:food']['nutrition'], 4, 'carrot-style: plant it or eat it')
            sprout = read(bp / 'blocks' / f'{fruit}_sprout.json')['minecraft:block']
            self.assertIn('friend:sprout_grow', sprout['components']['minecraft:custom_components'])
            sprout_geometry = sprout['components']['minecraft:geometry']
            self.assertEqual(sprout_geometry.get('identifier') if isinstance(sprout_geometry, dict) else sprout_geometry, 'minecraft:geometry.cross')
            sprout_drops = {entry['name'] for pool in read(bp / sprout['components']['minecraft:loot'])['pools'] for entry in pool['entries']}
            self.assertEqual(sprout_drops, {fruit_item}, 'sprout drops exactly its fruit seed')
            sapling = read(bp / 'blocks' / f'{fruit}_sapling.json')['minecraft:block']
            self.assertIn(f'{fruit}:grow_tree', sapling['components']['minecraft:custom_components'])
            self.assertIn("import './orchard.js'", (bp / 'scripts/main.js').read_text())
            for atlas in ['item_texture.json', 'terrain_texture.json']:
                for entry in read(rp / 'textures' / atlas)['texture_data'].values():
                    self.assertTrue((rp / (entry['textures'] + '.png')).exists())
        self.assertEqual(read(bp / 'manifest.json')['header']['version'], [1, 2, 22])
        with zipfile.ZipFile(ROOT / 'dist/Fruity-Friends-Dedicated-Server.zip') as z:
            self.assertEqual(json.loads(z.read('world-pack-lists/world_behavior_packs.json'))[0]['version'], [1, 2, 22])

    def test_guidebook_item_and_script(self):
        bp, rp = ROOT / 'packs/Plum_BP', ROOT / 'packs/Plum_RP'
        def read(path): return json.loads(path.read_text())
        item = read(bp / 'items/guidebook.json')['minecraft:item']
        self.assertEqual(item['description']['identifier'], 'friend:guidebook')
        components = item['components']
        self.assertEqual(components['minecraft:display_name']['value'], 'item.friend:guidebook.name')
        self.assertEqual(components['minecraft:custom_components'], ['friend:open_guide'])
        atlas = read(rp / 'textures/item_texture.json')['texture_data']
        self.assertEqual(atlas[components['minecraft:icon']['textures']['default']]['textures'], 'textures/items/guidebook')
        self.assertTrue((rp / 'textures/items/guidebook.png').exists())
        self.assertIn('item.friend:guidebook.name=Fruity Friend Guidebook', (rp / 'texts/en_US.lang').read_text())
        script = (bp / 'scripts/main.js').read_text()
        self.assertIn("registerCustomComponent('friend:open_guide'", script)
        self.assertIn('giveGuidebook(player)', script)
        self.assertIn("new ActionFormData().title('Fruity Friend Guidebook')", script)
        self.assertNotIn('Fruity Friends v', script, 'the login monologue was replaced by the guidebook')
        for archive_name in ['Fruity-Friends.mcaddon', 'Fruity-Friends-Dedicated-Server.zip']:
            with zipfile.ZipFile(ROOT / 'dist' / archive_name) as archive:
                bp_prefix = 'Plum_BP/' if archive_name.endswith('.mcaddon') else 'behavior_packs/Plum_BP/'
                rp_prefix = 'Plum_RP/' if archive_name.endswith('.mcaddon') else 'resource_packs/Plum_RP/'
                self.assertIn(bp_prefix + 'items/guidebook.json', archive.namelist())
                self.assertIn(rp_prefix + 'textures/items/guidebook.png', archive.namelist())

    def test_fruit_basket_item_recipe_and_script(self):
        bp, rp = ROOT / 'packs/Plum_BP', ROOT / 'packs/Plum_RP'
        def read(path): return json.loads(path.read_text())
        item = read(bp / 'items/fruit_basket.json')['minecraft:item']
        self.assertEqual(item['description']['identifier'], 'friend:fruit_basket')
        components = item['components']
        icon_key = components['minecraft:icon']['textures']['default']
        self.assertEqual(components['minecraft:display_name']['value'], 'item.friend:fruit_basket.name')
        recipe = read(bp / 'recipes/fruit_basket.json')['minecraft:recipe_shaped']
        self.assertEqual(recipe['description']['identifier'], 'fruit_basket')
        self.assertEqual(recipe['result'], {'item': 'friend:fruit_basket', 'count': 1})
        pattern = recipe['pattern']
        self.assertEqual(pattern, ['X X', ' X '], 'bucket-shaped stick recipe: two on top, one in the middle')
        sticks = pattern[0].count('X') + pattern[1].count('X')
        self.assertEqual(sticks, 3, 'the basket costs exactly three sticks')
        self.assertEqual(recipe['key']['X']['item'], 'minecraft:stick')
        atlas = read(rp / 'textures/item_texture.json')['texture_data']
        self.assertIn(icon_key, atlas)
        self.assertTrue((rp / (atlas[icon_key]['textures'] + '.png')).exists())
        lang = (rp / 'texts/en_US.lang').read_text()
        self.assertIn('item.friend:fruit_basket.name=Fruit Basket', lang)
        script = (bp / 'scripts/main.js').read_text()
        self.assertIn("typeId === BASKET", script, 'entity interact with a basket should capture a friend')
        self.assertIn('playerInteractWithBlock', script, 'interacting with a block should release a friend')
        self.assertIn('spawnEntity(contents.type', script)
        self.assertIn('getComponent(\'minecraft:tameable\')?.tame(player)', script, 'release restores ownership')
        self.assertIn('setDynamicProperty(BASKET_STORE', script, 'the friend travels as an item snapshot')
        for arm in ['Fruity-Friends.mcaddon', 'Fruity-Friends-Dedicated-Server.zip']:
            with zipfile.ZipFile(ROOT / 'dist' / arm) as z:
                bp_prefix = 'Plum_BP/' if arm.endswith('.mcaddon') else 'behavior_packs/Plum_BP/'
                rp_prefix = 'Plum_RP/' if arm.endswith('.mcaddon') else 'resource_packs/Plum_RP/'
                for name in ['items/fruit_basket.json', 'recipes/fruit_basket.json',
                             'scripts/main.js', 'scripts/chest.js']:
                    self.assertIn(bp_prefix + name, z.namelist())
                for name in ['textures/items/basket.png', 'textures/item_texture.json']:
                    self.assertIn(rp_prefix + name, z.namelist())

    def test_block_custom_components_are_registered_by_scripts(self):
        bp = ROOT / 'packs/Plum_BP'
        def read(path): return json.loads(path.read_text())
        declared = set()
        for block in (bp / 'blocks').glob('*.json'):
            block_id = read(block)['minecraft:block']['description']['identifier']
            for component in read(block)['minecraft:block']['components'].get('minecraft:custom_components', []):
                declared.add((block_id, component))
        orchard = (bp / 'scripts/orchard.js').read_text()
        sprouts = [block_id for block_id, component in declared if block_id.endswith('_sprout')]
        saplings = sorted(block_id for block_id, component in declared if block_id.endswith('_sapling'))
        self.assertEqual(saplings, ['apple:apple_sapling', 'banana:banana_sapling', 'blueberry:blueberry_sapling', 'lemon:lemon_sapling', 'plum:plum_sapling'])
        for _, component in declared:
            self.assertIn(f"registerCustomComponent('{component}'", orchard, f'{component} must be registered in orchard.js')
        for sprout_id in sprouts:
            fruit = sprout_id.split(':')[0]
            self.assertIn(f"'{sprout_id}': '{fruit}:friend'", orchard, f'sprout {sprout_id} must grow into {fruit}:friend')
        growth = (bp / 'scripts/tree_growth.js').read_text()
        for sapling_id in saplings:
            fruit = sapling_id.split(':')[0]
            self.assertIn(f"'{sapling_id}': ['minecraft:oak_log', '{fruit}:{fruit}_leaves']", growth, f'sapling {sapling_id} needs a PLANS entry')

if __name__ == '__main__': unittest.main()
