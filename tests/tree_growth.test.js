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

test('grapes grow into a one-log vine with the wood completely hidden by a leaf mound', () => {
  const f = fixture();
  f.sapling.setType('grapes:grapes_sapling');
  const plan = treePlan(f.origin, 'grapes:grapes_sapling');
  assert.equal(new Set(plan.map(p => JSON.stringify(p.location))).size, plan.length);
  assert.equal(plan.length, 35);
  assert.equal(Math.max(...plan.map(p => p.location.y)), f.origin.y + 2);
  assert.equal(growTree(f.sapling), true);
  assert.equal(f.sapling.typeId, 'minecraft:oak_log');
  assert.equal(f.writes.filter(([, type]) => type === 'minecraft:oak_log').length, 1);
  assert.equal(f.writes.filter(([, type]) => type === 'grapes:grapes_leaves').length, 34);
  const dirs = [[1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1], [0, 1, 0]];
  for (const [dx, dy, dz] of dirs) {
    assert.equal(f.dimension.getBlock({ x: f.origin.x + dx, y: f.origin.y + dy, z: f.origin.z + dz }).typeId, 'grapes:grapes_leaves');
  }
  assert.equal(growTree(f.sapling), false, 'the hidden trunk is not a sapling, so it cannot regrow');
});

test('strawberries grow into a tiny mound: one log with five hugging leaf blocks', () => {
  const f = fixture();
  f.sapling.setType('strawberry:strawberry_sapling');
  const plan = treePlan(f.origin, 'strawberry:strawberry_sapling');
  assert.equal(new Set(plan.map(p => JSON.stringify(p.location))).size, plan.length);
  assert.equal(plan.length, 6);
  assert.equal(Math.max(...plan.map(p => p.location.y)), f.origin.y + 1);
  assert.equal(growTree(f.sapling), true);
  assert.equal(f.sapling.typeId, 'minecraft:oak_log');
  assert.equal(f.writes.filter(([, type]) => type === 'minecraft:oak_log').length, 1);
  assert.equal(f.writes.filter(([, type]) => type === 'strawberry:strawberry_leaves').length, 5);
  const dirs = [[1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1], [0, 1, 0]];
  for (const [dx, dy, dz] of dirs) {
    assert.equal(f.dimension.getBlock({ x: f.origin.x + dx, y: f.origin.y + dy, z: f.origin.z + dz }).typeId, 'strawberry:strawberry_leaves');
  }
  assert.equal(growTree(f.sapling), false, 'the hidden trunk is not a sapling, so it cannot regrow');
});

test('coconuts grow into a tall slim palm: five logs with a snug frond tuft on top', () => {
  const f = fixture();
  f.sapling.setType('coconut:coconut_sapling');
  const plan = treePlan(f.origin, 'coconut:coconut_sapling');
  assert.equal(new Set(plan.map(p => JSON.stringify(p.location))).size, plan.length);
  assert.equal(plan.length, 14);
  assert.equal(plan.filter(p => p.type === 'minecraft:oak_log').length, 5);
  assert.equal(plan.filter(p => p.type === 'coconut:coconut_leaves').length, 9);
  assert.equal(Math.max(...plan.map(p => p.location.y)), f.origin.y + 6);
  assert.equal(growTree(f.sapling), true);
  assert.equal(f.sapling.typeId, 'minecraft:oak_log');
  assert.equal(f.writes.filter(([, type]) => type === 'minecraft:oak_log').length, 5);
  assert.equal(f.writes.filter(([, type]) => type === 'coconut:coconut_leaves').length, 9);
  for (const dy of [0, 1, 2, 3, 4]) {
    assert.equal(f.dimension.getBlock({ x: f.origin.x, y: f.origin.y + dy, z: f.origin.z }).typeId, 'minecraft:oak_log');
  }
  assert.equal(f.dimension.getBlock({ x: f.origin.x, y: f.origin.y + 6, z: f.origin.z }).typeId, 'coconut:coconut_leaves');
  assert.equal(growTree(f.sapling), false, 'the trunk is not a sapling, so it cannot regrow');
});
