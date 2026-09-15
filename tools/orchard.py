"""Generate Plum's Survival fruit/tree assets alongside the companion pack."""

def build_orchard(bp, rp, root, write, png):
    write(bp / 'items/plum.json', {
        'format_version': '1.21.90',
        'minecraft:item': {
            'description': {'identifier': 'plum:plum', 'menu_category': {'category': 'nature'}},
            'components': {
                'minecraft:display_name': {'value': 'item.plum:plum.name'},
                'minecraft:icon': 'plum_fruit', 'minecraft:max_stack_size': 64,
                'minecraft:food': {'nutrition': 4, 'saturation_modifier': 0.3},
                'minecraft:use_animation': 'eat',
                'minecraft:use_modifiers': {'use_duration': 1.6, 'movement_modifier': 0.35}
            }
        }
    })
    soil = ['minecraft:grass_block', 'minecraft:dirt', 'minecraft:coarse_dirt', 'minecraft:podzol', 'minecraft:moss_block']
    write(bp / 'blocks/plum_leaves.json', {
        'format_version': '1.21.80', 'minecraft:block': {
            'description': {'identifier': 'plum:plum_leaves', 'menu_category': {'category': 'nature'}},
            'components': {
                'minecraft:display_name': 'tile.plum:plum_leaves.name',
                'minecraft:geometry': 'minecraft:geometry.full_block',
                'minecraft:material_instances': {'*': {'texture': 'plum_leaves', 'render_method': 'alpha_test', 'ambient_occlusion': False}},
                'minecraft:destructible_by_mining': {'seconds_to_destroy': 0.25},
                'minecraft:destructible_by_explosion': {'explosion_resistance': 0.2},
                'minecraft:light_dampening': 1, 'minecraft:map_color': '#477738',
                'minecraft:flammable': {'catch_chance_modifier': 30, 'destroy_chance_modifier': 60},
                'minecraft:loot': 'loot_tables/blocks/plum_leaves.json'
            }
        }
    })
    write(bp / 'blocks/plum_sapling.json', {
        'format_version': '1.21.80', 'minecraft:block': {
            'description': {'identifier': 'plum:plum_sapling', 'menu_category': {'category': 'nature'}},
            'components': {
                'minecraft:display_name': 'tile.plum:plum_sapling.name',
                'minecraft:geometry': 'geometry.plum_sapling',
                'minecraft:material_instances': {
                    '*': {'texture': 'plum_sapling_leaf', 'render_method': 'alpha_test'},
                    'stem': {'texture': 'plum_bark', 'render_method': 'alpha_test'}
                },
                'minecraft:collision_box': False,
                'minecraft:selection_box': {'origin': [-4, 0, -4], 'size': [8, 12, 8]},
                'minecraft:destructible_by_mining': {'seconds_to_destroy': 0},
                'minecraft:destructible_by_explosion': {'explosion_resistance': 0},
                'minecraft:light_dampening': 0, 'minecraft:map_color': '#639940',
                'minecraft:placement_filter': {'conditions': [{'allowed_faces': ['up'], 'block_filter': soil}]},
                'minecraft:loot': 'loot_tables/blocks/plum_sapling.json',
                'minecraft:custom_components': ['plum:grow_tree']
            }
        }
    })
    def pool(item, chance=1):
        result = {'rolls': 1, 'entries': [{'type': 'item', 'name': item, 'weight': 1}]}
        if chance < 1:
            result['conditions'] = [{'condition': 'random_chance', 'chance': chance}]
        return result
    write(bp / 'loot_tables/blocks/plum_leaves.json', {'pools': [pool('plum:plum', 0.35), pool('plum:plum_sapling', 0.1)]})
    write(bp / 'loot_tables/blocks/plum_sapling.json', {'pools': [pool('plum:plum_sapling')]})
    write(bp / 'features/plum_tree.json', {
        'format_version': '1.13.0', 'minecraft:tree_feature': {
            'description': {'identifier': 'plum:plum_tree'},
            'trunk': {'trunk_block': 'minecraft:oak_log', 'trunk_height': {'range_min': 4, 'range_max': 5}},
            'canopy': {'leaf_block': 'plum:plum_leaves', 'canopy_offset': {'min': -2, 'max': -2}, 'min_width': 1, 'canopy_slope': {'rise': 1, 'run': 1}, 'variation_chance': {'numerator': 9, 'denominator': 10}},
            'base_block': 'minecraft:dirt', 'may_grow_on': soil,
            'may_replace': ['minecraft:air', 'minecraft:short_grass', 'minecraft:tall_grass', 'plum:plum_leaves'],
            'may_grow_through': ['minecraft:air', 'minecraft:short_grass', 'minecraft:tall_grass']
        }
    })
    write(bp / 'feature_rules/plum_tree_rule.json', {
        'format_version': '1.13.0', 'minecraft:feature_rules': {
            'description': {'identifier': 'plum:plum_tree_rule', 'places_feature': 'plum:plum_tree'},
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
    write(rp / 'models/blocks/plum_sapling.geo.json', {
        'format_version': '1.12.0', 'minecraft:geometry': [{
            'description': {'identifier': 'geometry.plum_sapling', 'texture_width': 16, 'texture_height': 16},
            'bones': [{'name': 'sapling', 'pivot': [0, 0, 0], 'cubes': [
                cube([-1, 0, -1], [2, 6, 2], 'stem'), cube([-4, 4, -4], [8, 6, 8], '*'), cube([-2, 10, -2], [4, 2, 4], '*')
            ]}]
        }]
    })
    write(rp / 'textures/item_texture.json', {'resource_pack_name': 'plum_friend', 'texture_name': 'atlas.items', 'texture_data': {'plum_fruit': {'textures': 'textures/items/plum'}}})
    write(rp / 'textures/terrain_texture.json', {'resource_pack_name': 'plum_friend', 'texture_name': 'atlas.terrain', 'padding': 8, 'num_mip_levels': 4,
        'texture_data': {name: {'textures': 'textures/blocks/' + name} for name in ['plum_leaves', 'plum_sapling_leaf', 'plum_bark']}})
    write(rp / 'blocks.json', {'format_version': [1, 1, 0], 'plum:plum_leaves': {'sound': 'grass'}, 'plum:plum_sapling': {'sound': 'grass'}})
    with (rp / 'texts/en_US.lang').open('a', encoding='utf-8') as stream:
        stream.write('item.plum:plum.name=Plum Fruit\ntile.plum:plum_leaves.name=Plum Leaves\ntile.plum:plum_sapling.name=Plum Sapling\n')

    # Original pixel sprites share the companion's purple palette.
    clear = (0, 0, 0, 0)
    fruit = [[clear for _ in range(16)] for _ in range(16)]
    colors = [(74, 30, 109, 255), (118, 46, 166, 255), (159, 74, 202, 255), (212, 147, 239, 255)]
    for y in range(4, 15):
        for x in range(2, 14):
            d = ((x - 7.5) / 5.5) ** 2 + ((y - 9) / 5.5) ** 2
            if d <= 1:
                fruit[y][x] = colors[0 if d > 0.72 else 2 if x < 8 else 1]
    for x, y in [(5, 6), (6, 6), (5, 7)]: fruit[y][x] = colors[3]
    for x, y in [(8, 4), (8, 3), (9, 2)]: fruit[y][x] = (100, 69, 37, 255)
    for x, y in [(10, 2), (11, 2), (10, 3), (12, 1)]: fruit[y][x] = (99, 168, 65, 255)
    png(rp / 'textures/items/plum.png', fruit)
    greens = [(50, 88, 40, 255), (69, 118, 49, 255), (88, 142, 60, 255), (110, 160, 75, 255)]
    leaves = [[greens[(x * 7 + y * 11 + (x // 3) * (y // 2)) % 4] if (x * 3 + y * 7) % 17 else clear for x in range(16)] for y in range(16)]
    png(rp / 'textures/blocks/plum_sapling_leaf.png', leaves)
    for cx, cy in [(3, 5), (11, 11), (12, 3)]:
        for dx, dy in [(0,0), (1,0), (-1,1), (0,1), (1,1), (0,2)]:
            leaves[cy + dy][cx + dx] = colors[2 if dx == -1 else 1]
        leaves[cy][cx] = colors[3]
    png(rp / 'textures/blocks/plum_leaves.png', leaves)
    bark = [[(93 + ((x * 3 + y // 5) % 3) * 12, 66 + (x % 3) * 9, 44, 255) for x in range(16)] for y in range(16)]
    png(rp / 'textures/blocks/plum_bark.png', bark)
    png(root / 'art/plum-fruit.png', [[fruit[y // 16][x // 16] for x in range(256)] for y in range(256)])
