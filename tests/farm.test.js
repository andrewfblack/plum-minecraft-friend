import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CROPS, CROP_TYPES, GRASS_TYPES, isCrop, cropMaxGrowth, replantItem,
  isMature, nextGrowth, harvestDrops, forageDrops, mergeDrops,
} from '../packs/Plum_BP/scripts/farm.js';

test('the crop catalog covers the four vanilla crops Strawberry tends', () => {
  assert.deepEqual(CROP_TYPES.sort(), ['minecraft:beetroot', 'minecraft:carrots', 'minecraft:potatoes', 'minecraft:wheat']);
  assert.equal(CROPS['minecraft:wheat'].seed, 'minecraft:wheat_seeds');
  assert.equal(CROPS['minecraft:carrots'].seed, 'minecraft:carrot');
  assert.equal(CROPS['minecraft:potatoes'].seed, 'minecraft:potato');
  assert.equal(CROPS['minecraft:beetroot'].seed, 'minecraft:beetroot_seeds');
  assert.deepEqual([cropMaxGrowth('minecraft:wheat'), cropMaxGrowth('minecraft:carrots'), cropMaxGrowth('minecraft:potatoes'), cropMaxGrowth('minecraft:beetroot')], [7, 7, 7, 3]);
  assert.deepEqual(GRASS_TYPES, ['minecraft:short_grass', 'minecraft:tall_grass']);
});

test('isCrop, maturity, and growth steps stay consistent', () => {
  assert.equal(isCrop('minecraft:wheat'), true);
  assert.equal(isCrop('minecraft:grass_block'), false);
  assert.equal(cropMaxGrowth('minecraft:dirt'), null);
  assert.equal(replantItem('minecraft:potatoes'), 'minecraft:potato');
  assert.equal(replantItem('minecraft:stone'), null);
  assert.equal(isMature('minecraft:wheat', 6), false);
  assert.equal(isMature('minecraft:wheat', 7), true);
  assert.equal(isMature('minecraft:wheat', 8), true);
  assert.equal(isMature('minecraft:beetroot', 3), true);
  assert.equal(nextGrowth('minecraft:carrots', 0), 1);
  assert.equal(nextGrowth('minecraft:carrots', 6), 7);
  assert.equal(nextGrowth('minecraft:carrots', 7), null);
  assert.equal(nextGrowth('minecraft:stone', 0), null);
  assert.equal(nextGrowth('minecraft:wheat', NaN), null);
});

test('harvest drops follow vanilla-style counts seeded by the random source', () => {
  const none = () => 0.9;
  const all = () => 0.1;
  assert.deepEqual(harvestDrops('minecraft:wheat', none), [{ id: 'minecraft:wheat', count: 1 }, { id: 'minecraft:wheat_seeds', count: 1 }]);
  assert.deepEqual(harvestDrops('minecraft:wheat', all), [{ id: 'minecraft:wheat', count: 1 }, { id: 'minecraft:wheat_seeds', count: 3 }]);
  assert.deepEqual(harvestDrops('minecraft:beetroot', none), [{ id: 'minecraft:beetroot', count: 1 }, { id: 'minecraft:beetroot_seeds', count: 0 }]);
  assert.deepEqual(harvestDrops('minecraft:potatoes', all), [{ id: 'minecraft:potato', count: 3 }]);
  assert.deepEqual(harvestDrops('minecraft:carrots', all), [{ id: 'minecraft:carrot', count: 3 }]);
  assert.deepEqual(harvestDrops('minecraft:shulker_box', none), []);
});

test('mergeDrops collapses repeated ids and drops zero-count leftovers', () => {
  assert.deepEqual(mergeDrops([
    { id: 'minecraft:wheat', count: 1 },
    { id: 'minecraft:wheat_seeds', count: 0 },
    { id: 'minecraft:wheat_seeds', count: 2 },
    { id: 'minecraft:potato', count: 1 },
  ]), [
    { id: 'minecraft:wheat', count: 1 },
    { id: 'minecraft:wheat_seeds', count: 2 },
    { id: 'minecraft:potato', count: 1 },
  ]);
  assert.deepEqual(mergeDrops([]), []);
});

test('foraging grass yields mostly wheat seeds, sometimes nothing', () => {
  const low = () => 0.1;
  const high = () => 0.99;
  assert.deepEqual(forageDrops(low), [{ id: 'minecraft:wheat_seeds', count: 1 }]);
  assert.deepEqual(forageDrops(() => 0.55), [{ id: 'minecraft:beetroot_seeds', count: 1 }]);
  assert.deepEqual(forageDrops(high), []);
});