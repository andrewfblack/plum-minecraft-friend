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

    def test_lifecycle_references_and_baby_breeding(self):
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
            apply('minecraft:on_tame')
            apply('minecraft:ageable_grow_up')
            self.assertEqual(groups[list(filter(lambda k: k.endswith(':adult'), groups))[0]]['minecraft:breedable']['breeds_with']['baby_type'], entity['description']['identifier'])

    def test_apple_tames_and_breeds_with_apples(self):
        entity = json.loads((ROOT / 'packs/Plum_BP/entities/apple.json').read_text())['minecraft:entity']
        groups = entity['component_groups']
        self.assertEqual(groups['apple:adult']['minecraft:breedable']['breed_items'], ['apple:apple'])
        self.assertEqual(groups['apple:baby']['minecraft:ageable']['feed_items'], ['apple:apple'])
        self.assertEqual(entity['components']['minecraft:tameable']['tame_items'], ['apple:apple'])
        self.assertEqual(entity['components']['minecraft:behavior.tempt']['items'], ['apple:apple'])
        self.assertEqual(entity['components']['minecraft:interact']['interactions'][0]['interact_text'], 'action.interact.apple_talk')
        self.assertTrue((ROOT / 'packs/Plum_RP/textures/entity/apple.png').exists())

    def test_model_and_texture_references(self):
        rp = ROOT / 'packs/Plum_RP'
        client_files = {'plum': 'entity/friend.entity.json', 'apple': 'entity/apple.entity.json'}
        for name, client_file in client_files.items():
            client = json.loads((rp / client_file).read_text())['minecraft:client_entity']['description']
            self.assertEqual(client['identifier'], f'{name}:friend')
            self.assertTrue((rp / (client['textures']['default'] + '.png')).exists())
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
            entity = read(bp / 'entities' / entity_file)['minecraft:entity']
            self.assertEqual(entity['component_groups'][f'{fruit}:adult']['minecraft:breedable']['breed_items'], [fruit_item])
            self.assertEqual(entity['component_groups'][f'{fruit}:baby']['minecraft:ageable']['feed_items'], [fruit_item])
            self.assertIn(fruit_item, entity['components']['minecraft:behavior.tempt']['items'])
            tree = read(bp / 'features' / f'{fruit}_tree.json')['minecraft:tree_feature']
            rule = read(bp / 'feature_rules' / f'{fruit}_tree_rule.json')['minecraft:feature_rules']
            self.assertEqual(rule['description']['places_feature'], tree['description']['identifier'])
            self.assertEqual(tree['description']['identifier'], f'{fruit}:{fruit}_tree')
            leaves = read(bp / 'blocks' / f'{fruit}_leaves.json')['minecraft:block']
            self.assertEqual(tree['canopy']['leaf_block'], leaves['description']['identifier'])
            loot = read(bp / leaves['components']['minecraft:loot'])
            drops = {entry['name'] for pool in loot['pools'] for entry in pool['entries']}
            self.assertEqual(drops, {fruit_item, f'{fruit}:{fruit}_sapling'})
            sapling = read(bp / 'blocks' / f'{fruit}_sapling.json')['minecraft:block']
            self.assertIn(f'{fruit}:grow_tree', sapling['components']['minecraft:custom_components'])
            self.assertIn("import './orchard.js'", (bp / 'scripts/main.js').read_text())
            for atlas in ['item_texture.json', 'terrain_texture.json']:
                for entry in read(rp / 'textures' / atlas)['texture_data'].values():
                    self.assertTrue((rp / (entry['textures'] + '.png')).exists())
        self.assertEqual(read(bp / 'manifest.json')['header']['version'], [1, 2, 0])
        with zipfile.ZipFile(ROOT / 'dist/Fruity-Friends-Dedicated-Server.zip') as z:
            self.assertEqual(json.loads(z.read('world-pack-lists/world_behavior_packs.json'))[0]['version'], [1, 2, 0])

if __name__ == '__main__': unittest.main()
