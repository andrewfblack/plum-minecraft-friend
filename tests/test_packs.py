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
        for file in ['friend.json', 'apple.json']:
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
            self.assertEqual(active, {f'{entity["description"]["identifier"].split(":")[0]}:adult', f'{entity["description"]["identifier"].split(":")[0]}:tamed'})
            sit_group = groups[list(filter(lambda k: k.endswith(':sit'), groups))[0]]
            self.assertIn('minecraft:is_sitting', sit_group, 'sit group must contain the is_sitting flag')
            self.assertIn('minecraft:on_sit', entity['events'])
            self.assertIn('minecraft:on_stand', entity['events'])
            self.assertIn(f'{entity["description"]["identifier"].split(":")[0]}:sit',
                          entity['events']['minecraft:on_sit'].get('add', {}).get('component_groups', []))
            self.assertIn(f'{entity["description"]["identifier"].split(":")[0]}:sit',
                          entity['events']['minecraft:on_stand'].get('remove', {}).get('component_groups', []))

    def test_apple_tames_and_grows(self):
        entity = json.loads((ROOT / 'packs/Plum_BP/entities/apple.json').read_text())['minecraft:entity']
        groups = entity['component_groups']
        self.assertNotIn('minecraft:breedable', groups['apple:adult'], 'planting fruit grows a baby, not breeding')
        self.assertEqual(groups['apple:baby']['minecraft:ageable']['feed_items'], ['apple:apple'])
        self.assertEqual(entity['components']['minecraft:tameable']['tame_items'], ['apple:apple'])
        self.assertEqual(entity['components']['minecraft:behavior.tempt']['items'], ['apple:apple'])
        self.assertNotIn('minecraft:interact', entity['components'])
        self.assertIn('playerInteractWithEntity', (ROOT / 'packs/Plum_BP/scripts/main.js').read_text())
        self.assertTrue((ROOT / 'packs/Plum_RP/textures/entity/apple.png').exists())

    def test_model_and_texture_references(self):
        rp = ROOT / 'packs/Plum_RP'
        client_files = {'plum': 'entity/friend.entity.json', 'apple': 'entity/apple.entity.json'}
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
        for fruit, entity_file in [('plum', 'friend.json'), ('apple', 'apple.json')]:
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
            self.assertNotIn('minecraft:interact', entity['components'], 'entity-wide interact competes with tame/feed right-clicks')
            self.assertEqual(entity['components']['minecraft:type_family']['family'][0], f'{fruit}_friend')
            tree = read(bp / 'features' / f'{fruit}_tree.json')['minecraft:tree_feature']
            rule = read(bp / 'feature_rules' / f'{fruit}_tree_rule.json')['minecraft:feature_rules']
            self.assertEqual(rule['description']['places_feature'], tree['description']['identifier'])
            self.assertEqual(tree['description']['identifier'], f'{fruit}:{fruit}_tree')
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
        self.assertEqual(read(bp / 'manifest.json')['header']['version'], [1, 2, 8])
        with zipfile.ZipFile(ROOT / 'dist/Fruity-Friends-Dedicated-Server.zip') as z:
            self.assertEqual(json.loads(z.read('world-pack-lists/world_behavior_packs.json'))[0]['version'], [1, 2, 8])

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
        self.assertIn('item.friend:fruit_basket.name=Fruid Basket', lang)
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
                             'scripts/main.js']:
                    self.assertIn(bp_prefix + name, z.namelist())
                for name in ['textures/items/basket.png', 'textures/item_texture.json']:
                    self.assertIn(rp_prefix + name, z.namelist())

if __name__ == '__main__': unittest.main()
