"""Generate Survival fruit/tree assets for both cube friends alongside the companion packs."""

SOIL = ['minecraft:grass_block', 'minecraft:dirt', 'minecraft:coarse_dirt', 'minecraft:podzol', 'minecraft:moss_block']

def _pool(item, chance=1):
    result = {'rolls': 1, 'entries': [{'type': 'item', 'name': item, 'weight': 1}]}
    if chance < 1:
        result['conditions'] = [{'condition': 'random_chance', 'chance': chance}]
    return result

def _fruit_textures(bp, rp, png, fruit):
    """Original pixel sprites: one fruit, one leaf/sapling tile and one bark per friend."""
    clear = (0, 0, 0, 0)
    if fruit == 'plum':
        colors = [(74, 30, 109, 255), (118, 46, 166, 255), (159, 74, 202, 255), (212, 147, 239, 255)]
    else:
        colors = [(146, 22, 30, 255), (206, 36, 44, 255), (232, 96, 92, 255), (56, 118, 38, 255)]
    fruit_pixels = [[clear for _ in range(16)] for _ in range(16)]
    for y in range(4, 15):
        for x in range(2, 14):
            d = ((x - 7.5) / 5.5) ** 2 + ((y - 9) / 5.5) ** 2
            if d <= 1:
                fruit_pixels[y][x] = colors[0 if d > 0.72 else 2 if x < 8 else 1]
    for x, y in [(5, 6), (6, 6), (5, 7)]: fruit_pixels[y][x] = colors[3]
    if fruit == 'plum':
        for x, y in [(8, 4), (8, 3), (9, 2)]: fruit_pixels[y][x] = (100, 69, 37, 255)
        for x, y in [(10, 2), (11, 2), (10, 3), (12, 1)]: fruit_pixels[y][x] = (99, 168, 65, 255)
    else:
        for x, y in [(8, 4), (8, 3), (9, 2)]: fruit_pixels[y][x] = (110, 70, 40, 255)
        for x, y in [(10, 2), (11, 2), (10, 3), (12, 1)]: fruit_pixels[y][x] = (86, 158, 44, 255)
    png(rp / f'textures/items/{fruit}.png', fruit_pixels)

    greens = [(50, 88, 40, 255), (69, 118, 49, 255), (88, 142, 60, 255), (110, 160, 75, 255)]
    sapling = [[greens[(x * 7 + y * 11 + (x // 3) * (y // 2)) % 4] if (x * 3 + y * 7) % 17 else clear for x in range(16)] for y in range(16)]
    png(rp / f'textures/blocks/{fruit}_sapling_leaf.png', sapling)
    leaves = [r[:] for r in sapling]
    for cx, cy in [(3, 5), (11, 11), (12, 3)]:
        for dx, dy in [(0, 0), (1, 0), (-1, 1), (0, 1), (1, 1), (0, 2)]:
            leaves[cy + dy][cx + dx] = colors[2 if dx == -1 else 1]
        leaves[cy][cx] = colors[3]
    if fruit == 'apple':
        for x, y in [(2, 10), (1, 11), (13, 6), (14, 8), (10, 2), (5, 13)]: leaves[y][x] = (206, 36, 44, 255)
    png(rp / f'textures/blocks/{fruit}_leaves.png', leaves)
    bark = [[(93 + ((x * 3 + y // 5) % 3) * 12, 66 + (x % 3) * 9, 44, 255) for x in range(16)] for y in range(16)]
    png(rp / f'textures/blocks/{fruit}_bark.png', bark)
    return fruit_pixels

def build_fruit(bp, rp, root, write, png, fruit, accumulate):
    item, leaf, sapling_block, sprout, tree, rule, component = (f'{fruit}:{fruit}', f'{fruit}:{fruit}_leaves', f'{fruit}:{fruit}_sapling', f'{fruit}:{fruit}_sprout', f'{fruit}:{fruit}_tree', f'{fruit}:{fruit}_tree_rule', f'{fruit}:grow_tree')
    write(bp / f'items/{fruit}.json', {
        'format_version': '1.21.90',
        'minecraft:item': {
            'description': {'identifier': item, 'menu_category': {'category': 'nature'}},
            'components': {
                'minecraft:display_name': {'value': f'item.{item}.name'},
                'minecraft:icon': {'textures': {'default': f'{fruit}_fruit'}},
                'minecraft:max_stack_size': 64,
                'minecraft:block_placer': {'block': sprout, 'use_on': ['minecraft:farmland'], 'dispense_on': []},
                'minecraft:food': {'nutrition': 4, 'saturation_modifier': 0.3},
                'minecraft:use_animation': 'eat',
                'minecraft:use_modifiers': {'use_duration': 1.6, 'movement_modifier': 0.35}
            }
        }
    })
    write(bp / f'blocks/{fruit}_sprout.json', {
        'format_version': '1.21.80', 'minecraft:block': {
            'description': {'identifier': sprout, 'menu_category': {'category': 'nature'}},
            'components': {
                'minecraft:display_name': f'tile.{sprout}.name',
                'minecraft:geometry': 'minecraft:geometry.cross',
                'minecraft:material_instances': {'*': {'texture': f'{fruit}_sapling_leaf', 'render_method': 'alpha_test'}},
                'minecraft:collision_box': False,
                'minecraft:selection_box': {'origin': [-4, 0, -4], 'size': [8, 8, 8]},
                'minecraft:destructible_by_mining': {'seconds_to_destroy': 0},
                'minecraft:destructible_by_explosion': {'explosion_resistance': 0},
                'minecraft:light_dampening': 0, 'minecraft:map_color': '#639940',
                'minecraft:placement_filter': {'conditions': [{'allowed_faces': ['up'], 'block_filter': ['minecraft:farmland']}]},
                'minecraft:loot': f'loot_tables/blocks/{fruit}_sprout.json',
                'minecraft:custom_components': ['friend:sprout_grow']
            }
        }
    })
    write(bp / f'blocks/{fruit}_leaves.json', {
        'format_version': '1.21.80', 'minecraft:block': {
            'description': {'identifier': leaf, 'menu_category': {'category': 'nature'}},
            'components': {
                'minecraft:display_name': f'tile.{leaf}.name',
                'minecraft:geometry': 'minecraft:geometry.full_block',
                'minecraft:material_instances': {'*': {'texture': f'{fruit}_leaves', 'render_method': 'alpha_test', 'ambient_occlusion': False}},
                'minecraft:destructible_by_mining': {'seconds_to_destroy': 0.25},
                'minecraft:destructible_by_explosion': {'explosion_resistance': 0.2},
                'minecraft:light_dampening': 1, 'minecraft:map_color': '#477738',
                'minecraft:flammable': {'catch_chance_modifier': 30, 'destroy_chance_modifier': 60},
                'minecraft:loot': f'loot_tables/blocks/{fruit}_leaves.json'
            }
        }
    })
    write(bp / f'blocks/{fruit}_sapling.json', {
        'format_version': '1.21.80', 'minecraft:block': {
            'description': {'identifier': sapling_block, 'menu_category': {'category': 'nature'}},
            'components': {
                'minecraft:display_name': f'tile.{sapling_block}.name',
                'minecraft:geometry': f'geometry.{fruit}_sapling',
                'minecraft:material_instances': {
                    '*': {'texture': f'{fruit}_sapling_leaf', 'render_method': 'alpha_test'},
                    'stem': {'texture': f'{fruit}_bark', 'render_method': 'alpha_test'}
                },
                'minecraft:collision_box': False,
                'minecraft:selection_box': {'origin': [-4, 0, -4], 'size': [8, 12, 8]},
                'minecraft:destructible_by_mining': {'seconds_to_destroy': 0},
                'minecraft:destructible_by_explosion': {'explosion_resistance': 0},
                'minecraft:light_dampening': 0, 'minecraft:map_color': '#639940',
                'minecraft:placement_filter': {'conditions': [{'allowed_faces': ['up'], 'block_filter': SOIL}]},
                'minecraft:loot': f'loot_tables/blocks/{fruit}_sapling.json',
                'minecraft:custom_components': [component]
            }
        }
    })
    write(bp / f'loot_tables/blocks/{fruit}_leaves.json', {'pools': [_pool(item, 0.35), _pool(sapling_block, 0.1)]})
    write(bp / f'loot_tables/blocks/{fruit}_sapling.json', {'pools': [_pool(sapling_block)]})
    write(bp / f'loot_tables/blocks/{fruit}_sprout.json', {'pools': [_pool(item)]})
    write(bp / f'features/{fruit}_tree.json', {
        'format_version': '1.13.0', 'minecraft:tree_feature': {
            'description': {'identifier': tree},
            'trunk': {'trunk_block': 'minecraft:oak_log', 'trunk_height': {'range_min': 4, 'range_max': 5}},
            'canopy': {'leaf_block': leaf, 'canopy_offset': {'min': -2, 'max': -2}, 'min_width': 1, 'canopy_slope': {'rise': 1, 'run': 1}, 'variation_chance': {'numerator': 9, 'denominator': 10}},
            'base_block': 'minecraft:dirt', 'may_grow_on': SOIL,
            'may_replace': ['minecraft:air', 'minecraft:short_grass', 'minecraft:tall_grass', leaf],
            'may_grow_through': ['minecraft:air', 'minecraft:short_grass', 'minecraft:tall_grass']
        }
    })
    write(bp / f'feature_rules/{fruit}_tree_rule.json', {
        'format_version': '1.13.0', 'minecraft:feature_rules': {
            'description': {'identifier': rule, 'places_feature': tree},
            'conditions': {
                'placement_pass': 'surface_pass',
                'minecraft:biome_filter': {'all_of': [
                    {'test': 'has_biome_tag', 'operator': '==', 'value': 'overworld'},
                    {'any_of': [{'test': 'has_biome_tag', 'operator': '==', 'value': tag} for tag in ['plains', 'forest']]},
                    *[{'test': 'has_biome_tag', 'operator': '!=', 'value': tag} for tag in ['jungle', 'taiga', 'cold', 'frozen', 'roofed']]
                ]}
            },
            'distribution': {
                'iterations': 1, 'scatter_chance': 25, 'coordinate_eval_order': 'xzy',
                'x': {'distribution': 'uniform', 'extent': [0, 15]},
                'z': {'distribution': 'uniform', 'extent': [0, 15]},
                'y': 'query.heightmap(variable.worldx, variable.worldz)'
            }
        }
    })
    faces = ['north', 'south', 'east', 'west', 'up', 'down']
    def cube(origin, size, material):
        return {'origin': origin, 'size': size, 'uv': {f: {'uv': [0, 0], 'uv_size': [16, 16], 'material_instance': material} for f in faces}}
    write(rp / f'models/blocks/{fruit}_sapling.geo.json', {
        'format_version': '1.12.0', 'minecraft:geometry': [{
            'description': {'identifier': f'geometry.{fruit}_sapling', 'texture_width': 16, 'texture_height': 16},
            'bones': [{'name': 'sapling', 'pivot': [0, 0, 0], 'cubes': [
                cube([-1, 0, -1], [2, 6, 2], 'stem'), cube([-4, 4, -4], [8, 6, 8], '*'), cube([-2, 10, -2], [4, 2, 4], '*')
            ]}]
        }]
    })
    accumulate['textures'][f'{fruit}_fruit'] = {'textures': f'textures/items/{fruit}'}
    accumulate['terrain'][f'{fruit}_leaves'] = {'textures': f'textures/blocks/{fruit}_leaves'}
    accumulate['terrain'][f'{fruit}_sapling_leaf'] = {'textures': f'textures/blocks/{fruit}_sapling_leaf'}
    accumulate['terrain'][f'{fruit}_bark'] = {'textures': f'textures/blocks/{fruit}_bark'}
    accumulate['sounds'][leaf] = {'sound': 'grass'}
    accumulate['sounds'][sapling_block] = {'sound': 'grass'}
    accumulate['sounds'][sprout] = {'sound': 'grass'}
    accumulate['lines'].append(f'item.{item}.name={"Apple Fruit" if fruit == "apple" else "Plum Fruit"}\ntile.{leaf}.name={"Apple Leaves" if fruit == "apple" else "Plum Leaves"}\ntile.{sapling_block}.name={"Apple Sapling" if fruit == "apple" else "Plum Sapling"}\ntile.{sprout}.name={"Apple Sprout" if fruit == "apple" else "Plum Sprout"}\n')

def build_orchard(bp, rp, root, write, png):
    accumulate = {'textures': {}, 'terrain': {}, 'sounds': {}, 'lines': []}
    for fruit in ('plum', 'apple'):
        pixels = _fruit_textures(bp, rp, png, fruit)
        build_fruit(bp, rp, root, write, png, fruit, accumulate)
        png(root / f'art/{fruit}-fruit.png', [[pixels[y // 16][x // 16] for x in range(256)] for y in range(256)])
    write(rp / 'textures/item_texture.json', {'resource_pack_name': 'plum_friend', 'texture_name': 'atlas.items', 'texture_data': accumulate['textures']})
    write(rp / 'textures/terrain_texture.json', {'resource_pack_name': 'plum_friend', 'texture_name': 'atlas.terrain', 'padding': 8, 'num_mip_levels': 4, 'texture_data': accumulate['terrain']})
    write(rp / 'blocks.json', {'format_version': [1, 1, 0], **accumulate['sounds']})
    with (rp / 'texts/en_US.lang').open('a', encoding='utf-8') as stream:
        stream.write(''.join(accumulate['lines']))