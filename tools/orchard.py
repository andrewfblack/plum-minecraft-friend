"""Generate Survival fruit/tree assets for both cube friends alongside the companion packs."""

SOIL = ['minecraft:grass_block', 'minecraft:dirt', 'minecraft:coarse_dirt', 'minecraft:podzol', 'minecraft:moss_block']
FRUIT_LABELS = {'plum': 'Plum', 'apple': 'Apple', 'blueberry': 'Blueberry', 'lemon': 'Lemon', 'banana': 'Banana'}
# (dark, mid, light, highlight) per fruit, shared by the fruit sprite and the sprout/leaf art.
FRUIT_COLORS = {
    'plum': [(74, 30, 109, 255), (118, 46, 166, 255), (159, 74, 202, 255), (212, 147, 239, 255)],
    'apple': [(146, 22, 30, 255), (206, 36, 44, 255), (232, 96, 92, 255), (56, 118, 38, 255)],
    'blueberry': [(22, 44, 148, 255), (37, 66, 205, 255), (84, 126, 240, 255), (160, 200, 255, 255)],
    'lemon': [(168, 128, 14, 255), (224, 176, 32, 255), (250, 216, 110, 255), (255, 240, 170, 255)],
    'banana': [(140, 100, 20, 255), (218, 168, 26, 255), (255, 220, 92, 255), (255, 245, 200, 255)],
}

def _pool(item, chance=1):
    result = {'rolls': 1, 'entries': [{'type': 'item', 'name': item, 'weight': 1}]}
    if chance < 1:
        result['conditions'] = [{'condition': 'random_chance', 'chance': chance}]
    return result

def _sprout_pixels(colors, fruit):
    """A freshly planted fruit: the fruit sits in a soil mound, stem and leaf up, on farmland."""
    clear = (0, 0, 0, 0)
    dark, mid, light, leaf = colors
    soil, soil_dark = (92, 65, 43, 255), (63, 44, 31, 255)
    mound, mound_dark = (104, 76, 53, 255), (75, 54, 39, 255)
    if fruit == 'apple':
        stem, green, highlight = (110, 70, 40, 255), (86, 158, 44, 255), leaf
    elif fruit == 'blueberry':
        stem, green, highlight = (46, 96, 40, 255), (56, 118, 38, 255), (160, 200, 255, 255)
    elif fruit == 'lemon':
        stem, green, highlight = (146, 100, 40, 255), (86, 158, 44, 255), (255, 240, 170, 255)
    elif fruit == 'banana':
        stem, green, highlight = (120, 84, 30, 255), (86, 158, 44, 255), (255, 245, 200, 255)
    else:
        stem, green, highlight = (100, 69, 37, 255), (99, 168, 65, 255), (212, 147, 239, 255)
    sprout = [[clear for _ in range(16)] for _ in range(16)]
    for y in range(13, 16):
        for x in range(16):
            sprout[y][x] = soil_dark if (x + y) % 2 else soil
    for y in range(12, 14):
        for x in range(2, 14):
            sprout[y][x] = mound_dark if (x * 3 + y) % 3 else mound
    for y in range(5, 13):
        for x in range(2, 14):
            d = ((x - 7.5) / 5.0) ** 2 + ((y - 9) / 3.8) ** 2
            if d <= 1:
                sprout[y][x] = dark if d > 0.72 else (light if x < 8 else mid)
    for x, y in [(5, 6), (6, 6), (5, 7)]: sprout[y][x] = highlight
    for x, y in [(8, 4), (8, 3), (9, 2)]: sprout[y][x] = stem
    for x, y in [(10, 2), (11, 2), (10, 3), (12, 1)]: sprout[y][x] = green
    if fruit == 'blueberry':
        for x, y in [(9, 4)]: sprout[y][x] = green
    return sprout

def _fruit_textures(bp, rp, png, fruit):
    """Original pixel sprites: one fruit, one leaf/sapling tile and one bark per friend."""
    clear = (0, 0, 0, 0)
    colors = FRUIT_COLORS[fruit]
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
    elif fruit == 'apple':
        for x, y in [(8, 4), (8, 3), (9, 2)]: fruit_pixels[y][x] = (110, 70, 40, 255)
        for x, y in [(10, 2), (11, 2), (10, 3), (12, 1)]: fruit_pixels[y][x] = (86, 158, 44, 255)
    elif fruit == 'lemon':
        for x, y in [(8, 4), (8, 3), (9, 2)]: fruit_pixels[y][x] = (146, 100, 40, 255)
        for x, y in [(10, 2), (11, 2), (10, 3), (12, 1)]: fruit_pixels[y][x] = (86, 158, 44, 255)
    elif fruit == 'banana':
        # Brown tips at each end and a little green crown, like a ripe banana.
        for x, y in [(7, 4), (8, 4), (9, 4), (8, 3)]: fruit_pixels[y][x] = (120, 84, 30, 255)
        for x, y in [(10, 2), (11, 2), (10, 3), (12, 1)]: fruit_pixels[y][x] = (86, 158, 44, 255)
        for x, y in [(6, 13), (7, 13), (8, 13), (9, 13), (7, 12), (9, 12)]: fruit_pixels[y][x] = (140, 100, 20, 255)
    else:
        # Blueberry wears a tiny green calyx crown like a real berry.
        for x, y in [(8, 3), (8, 4), (7, 4), (9, 4), (8, 2)]: fruit_pixels[y][x] = (46, 96, 40, 255)
        fruit_pixels[8][3] = (84, 150, 54, 255)
    png(rp / f'textures/items/{fruit}.png', fruit_pixels)

    greens = [(50, 88, 40, 255), (69, 118, 49, 255), (88, 142, 60, 255), (110, 160, 75, 255)]
    sapling = [[greens[(x * 7 + y * 11 + (x // 3) * (y // 2)) % 4] if (x * 3 + y * 7) % 17 else clear for x in range(16)] for y in range(16)]
    for cx, cy in ([(6, 6), (11, 9)] if fruit in ('plum', 'blueberry') else [(6, 7), (11, 5)]):
        for dx, dy in [(0, 0), (1, 0), (-1, 1), (0, 1), (1, 1)]:
            if 0 <= cx + dx < 16 and 0 <= cy + dy < 16 and sapling[cy + dy][cx + dx] != clear:
                sapling[cy + dy][cx + dx] = colors[1]
        sapling[cy][cx] = colors[3]
    png(rp / f'textures/blocks/{fruit}_sapling_leaf.png', sapling)
    png(rp / f'textures/blocks/{fruit}_sprout.png', _sprout_pixels(colors, fruit))
    leaves = [r[:] for r in sapling]
    for cx, cy in [(3, 5), (11, 11), (12, 3)]:
        for dx, dy in [(0, 0), (1, 0), (-1, 1), (0, 1), (1, 1), (0, 2)]:
            leaves[cy + dy][cx + dx] = colors[2 if dx == -1 else 1]
        leaves[cy][cx] = colors[3]
    if fruit == 'apple':
        for x, y in [(2, 10), (1, 11), (13, 6), (14, 8), (10, 2), (5, 13)]: leaves[y][x] = (206, 36, 44, 255)
    elif fruit == 'blueberry':
        for x, y in [(2, 9), (13, 11), (4, 3), (11, 13)]:
            leaves[y][x] = colors[1]
            leaves[y + 1][x] = colors[0]
    elif fruit == 'lemon':
        for x, y in [(2, 9), (1, 11), (13, 6), (14, 8), (10, 2), (5, 13), (8, 2)]:
            leaves[y][x] = colors[1]
    elif fruit == 'banana':
        for x, y in [(2, 9), (1, 11), (13, 6), (14, 8), (10, 2), (5, 13), (12, 2)]:
            leaves[y][x] = colors[1]
    png(rp / f'textures/blocks/{fruit}_leaves.png', leaves)
    bark = [[(93 + ((x * 3 + y // 5) % 3) * 12, 66 + (x % 3) * 9, 44, 255) for x in range(16)] for y in range(16)]
    png(rp / f'textures/blocks/{fruit}_bark.png', bark)
    return fruit_pixels

def build_fruit(bp, rp, root, write, png, fruit, accumulate, biomes=('plains', 'forest'), excludes=None):
    if excludes is None:
        # Lemon and Banana prefer warm biome tags; the plains/forest friends rule them out.
        excludes = ('jungle', 'taiga', 'cold', 'frozen', 'roofed') if 'plains' in biomes else ('plains', 'forest', 'desert', 'savanna', 'taiga', 'cold', 'frozen', 'roofed')
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
        'format_version': '1.21.90', 'minecraft:block': {
            'description': {'identifier': sprout, 'menu_category': {'category': 'nature'}},
            'components': {
                'minecraft:display_name': f'tile.{sprout}.name',
                'minecraft:geometry': 'minecraft:geometry.cross',
                'minecraft:material_instances': {'*': {'texture': f'{fruit}_sprout', 'render_method': 'alpha_test'}},
                'minecraft:collision_box': False,
                'minecraft:selection_box': {'origin': [-4, 0, -4], 'size': [8, 8, 8]},
                'minecraft:destructible_by_mining': {'seconds_to_destroy': 0},
                'minecraft:destructible_by_explosion': {'explosion_resistance': 0},
                'minecraft:light_dampening': 0, 'minecraft:map_color': '#639940',
                'minecraft:placement_filter': {'conditions': [{'allowed_faces': ['up'], 'block_filter': ['minecraft:farmland']}]},
                'minecraft:loot': f'loot_tables/blocks/{fruit}_sprout.json',
                'friend:sprout_grow': {}
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
        'format_version': '1.21.90', 'minecraft:block': {
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
                **{component: {}}
            }
        }
    })
    write(bp / f'loot_tables/blocks/{fruit}_leaves.json', {'pools': [_pool(item, 0.35), _pool(sapling_block, 0.1)]})
    write(bp / f'loot_tables/blocks/{fruit}_sapling.json', {'pools': [_pool(sapling_block)]})
    write(bp / f'loot_tables/blocks/{fruit}_sprout.json', {'pools': [_pool(item)]})
    write(bp / f'features/{fruit}_tree.json', {
        'format_version': '1.13.0', 'minecraft:tree_feature': {
            'description': {'identifier': tree},
            'trunk': {'trunk_block': 'minecraft:oak_log', 'trunk_height': {'range_min': 4, 'range_max': 4}},
            'canopy': {'leaf_block': leaf, 'canopy_offset': {'min': -2, 'max': -2}, 'min_width': 2, 'canopy_slope': {'rise': 1, 'run': 1}, 'variation_chance': {'numerator': 1, 'denominator': 1}},
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
                    {'any_of': [{'test': 'has_biome_tag', 'operator': '==', 'value': tag} for tag in biomes]},
                    *[{'test': 'has_biome_tag', 'operator': '!=', 'value': tag} for tag in excludes]
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
    accumulate['terrain'][f'{fruit}_sprout'] = {'textures': f'textures/blocks/{fruit}_sprout'}
    accumulate['terrain'][f'{fruit}_bark'] = {'textures': f'textures/blocks/{fruit}_bark'}
    accumulate['sounds'][leaf] = {'sound': 'grass'}
    accumulate['sounds'][sapling_block] = {'sound': 'grass'}
    accumulate['sounds'][sprout] = {'sound': 'grass'}
    accumulate['lines'].append(f'item.{item}.name={FRUIT_LABELS[fruit]} Fruit\ntile.{leaf}.name={FRUIT_LABELS[fruit]} Leaves\ntile.{sapling_block}.name={FRUIT_LABELS[fruit]} Sapling\ntile.{sprout}.name={FRUIT_LABELS[fruit]} Sprout\n')

def peel_pixels():
    """Banana peel icon: a bright yellow skin with brown tips and a white inner."""
    clear = (0, 0, 0, 0)
    yellow, yellow_dark, brown, white = (255, 222, 76, 255), (218, 176, 42, 255), (140, 100, 20, 255), (250, 244, 220, 255)
    grid = [[clear for _ in range(16)] for _ in range(16)]
    # Two open peel strips curving out of a shared base, plus a white inner.
    for x, y in [(6, 3), (7, 3), (8, 3), (9, 3),
                 (5, 4), (6, 4), (7, 4), (8, 4), (9, 4), (10, 4),
                 (4, 5), (11, 5),
                 (3, 6), (12, 6),
                 (2, 7), (13, 7),
                 (2, 8), (13, 8),
                 (3, 9), (12, 9),
                 (4, 10), (11, 10),
                 (5, 11), (10, 11)]:
        grid[y][x] = yellow
    for x, y in [(6, 2), (7, 2), (8, 2), (9, 2)]:
        grid[y][x] = brown
    for x, y in [(6, 4), (7, 4), (8, 4), (9, 4),
                 (5, 5), (6, 5), (7, 5), (8, 5), (9, 5), (10, 5),
                 (5, 6), (10, 6), (5, 7), (10, 7),
                 (4, 8), (9, 8), (4, 9), (9, 9)]:
        grid[y][x] = yellow_dark
    for x, y in [(6, 12), (7, 12), (8, 12), (9, 12),
                 (7, 13), (8, 13)]:
        grid[y][x] = yellow
    for x, y in [(5, 12), (6, 12), (8, 12), (9, 12)]:
        grid[y][x] = white
    return grid

def build_orchard(bp, rp, root, write, png):
    accumulate = {'textures': {}, 'terrain': {}, 'sounds': {}, 'lines': []}
    for fruit in ('plum', 'apple', 'blueberry', 'lemon', 'banana'):
        pixels = _fruit_textures(bp, rp, png, fruit)
        biomes = ('jungle',) if fruit == 'banana' else (('desert', 'savanna', 'jungle') if fruit == 'lemon' else ('plains', 'forest'))
        build_fruit(bp, rp, root, write, png, fruit, accumulate, biomes=biomes)
        png(root / f'art/{fruit}-fruit.png', [[pixels[y // 16][x // 16] for x in range(256)] for y in range(256)])
        sprout = _sprout_pixels(FRUIT_COLORS[fruit], fruit)
        png(root / f'art/{fruit}-sprout.png', [[sprout[y // 16][x // 16] for x in range(256)] for y in range(256)])
    peel = peel_pixels()
    png(rp / 'textures/items/banana_peel.png', peel)
    png(root / 'art/banana-peel.png', [[peel[y // 16][x // 16] for x in range(256)] for y in range(256)])
    write(rp / 'textures/item_texture.json', {'resource_pack_name': 'plum_friend', 'texture_name': 'atlas.items', 'texture_data': accumulate['textures']})
    write(rp / 'textures/terrain_texture.json', {'resource_pack_name': 'plum_friend', 'texture_name': 'atlas.terrain', 'padding': 8, 'num_mip_levels': 4, 'texture_data': accumulate['terrain']})
    write(rp / 'blocks.json', {'format_version': [1, 1, 0], **accumulate['sounds']})
    with (rp / 'texts/en_US.lang').open('a', encoding='utf-8') as stream:
        stream.write(''.join(accumulate['lines']))
