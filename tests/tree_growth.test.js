import test from 'node:test';
import assert from 'node:assert/strict';
import { treePlan, growTree } from '../packs/Plum_BP/scripts/tree_growth.js';

function fixture() {
  const origin = { x: 10, y: 64, z: 10 };
  const blocks = new Map();
  const key = p => `${p.x},${p.y},${p.z}`;
  const writes = [];
  let failAt;
  let missing;
  const dimension = {
    getBlock(p) {
      if (key(p) === missing) return undefined;
      if (!blocks.has(key(p))) {
        let type = 'minecraft:air';
        blocks.set(key(p), {
          location: { ...p }, dimension,
          get typeId() { return type; },
          get permutation() { return { type }; },
          setType(value) {
            if (key(p) === failAt) throw Error('simulated engine write failure');
            writes.push([key(p), value]);
            type = value;
          },
          setPermutation(value) { type = value.type; },
        });
      }
      return blocks.get(key(p));
    }
  };
  const sapling = dimension.getBlock(origin);
  sapling.setType('plum:plum_sapling');
  dimension.getBlock({ ...origin, y: 63 }).setType('minecraft:dirt');
  writes.length = 0;
  return { origin, sapling, dimension, blocks, writes, fail(p) { failAt = key(p); }, unload(p) { missing = key(p); } };
}

test('sapling becomes a complete tree with fruit leaves and no duplicate positions', () => {
  const f = fixture();
  const plan = treePlan(f.origin);
  assert.equal(new Set(plan.map(p => JSON.stringify(p.location))).size, plan.length);
  assert.equal(growTree(f.sapling), true);
  assert.equal(f.sapling.typeId, 'minecraft:oak_log');
  assert.equal(f.writes.filter(([, type]) => type === 'minecraft:oak_log').length, 4);
  assert.equal(f.writes.filter(([, type]) => type === 'plum:plum_leaves').length, 66);
  assert.equal(Math.max(...plan.map(p => p.location.y)), 69);
  assert.equal(growTree(f.sapling), false, 'repeated interactions cannot regrow an existing trunk');
});

test('blocked canopy, unsuitable soil, and unloaded destinations leave the sapling intact', () => {
  for (const obstruction of ['canopy', 'soil', 'unloaded']) {
    const f = fixture();
    const last = treePlan(f.origin).at(-1).location;
    if (obstruction === 'canopy') f.dimension.getBlock(last).setType('minecraft:chest');
    if (obstruction === 'soil') f.dimension.getBlock({ ...f.origin, y: 63 }).setType('minecraft:stone');
    if (obstruction === 'unloaded') f.unload(last);
    f.writes.length = 0;
    assert.equal(growTree(f.sapling), false);
    assert.equal(f.sapling.typeId, 'plum:plum_sapling');
    assert.equal(f.writes.length, 0);
  }
});

test('partial placement failure restores the sapling and original blocks', () => {
  const f = fixture();
  f.fail(treePlan(f.origin)[7].location);
  assert.equal(growTree(f.sapling), false);
  assert.equal(f.sapling.typeId, 'plum:plum_sapling');
  for (const step of treePlan(f.origin).slice(1)) assert.equal(f.dimension.getBlock(step.location).typeId, 'minecraft:air');
});
