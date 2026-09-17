import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CHEST_SLOTS, emptyChest, parseChest, serializeChest, chestIsFull, chestStore, chestTake,
} from '../packs/Plum_BP/scripts/chest.js';

// Stand-in for new ItemStack(id, 1).maxAmount without needing a live world.
const maxOf = (id) => (id.includes('sword') ? 1 : id === 'minecraft:egg' ? 16 : 64);

test('parseChest always yields a full, safe chest', () => {
  assert.equal(CHEST_SLOTS, 27);
  for (const raw of [undefined, null, '', 'not json', '{}', '42', '"x"']) {
    const slots = parseChest(raw);
    assert.equal(slots.length, CHEST_SLOTS);
    assert.deepEqual(slots, emptyChest());
  }
});

test('parseChest pads short arrays and drops invalid slots', () => {
  const parsed = parseChest(JSON.stringify([
    { id: 'minecraft:stone', count: 3 }, null, { id: 5, count: 2 },
    { id: 'x' }, { id: 'y', count: -1 }, { id: 'z', count: 2.9 },
  ]));
  assert.equal(parsed.length, CHEST_SLOTS);
  assert.deepEqual(parsed[0], { id: 'minecraft:stone', count: 3 });
  assert.equal(parsed[1], null);
  assert.equal(parsed[2], null);
  assert.equal(parsed[3], null);
  assert.equal(parsed[4], null);
  assert.deepEqual(parsed[5], { id: 'z', count: 2 });
  assert.equal(parsed[26], null);
});

test('serializeChest round-trips through parseChest', () => {
  const slots = emptyChest();
  slots[0] = { id: 'minecraft:cobblestone', count: 64 };
  slots[26] = { id: 'minecraft:apple', count: 1 };
  assert.deepEqual(parseChest(serializeChest(slots)), slots);
});

test('store fills an empty chest in one slot', () => {
  const result = chestStore(emptyChest(), 'minecraft:cobblestone', 64, maxOf);
  assert.equal(result.stored, 64);
  assert.equal(result.leftover, 0);
  assert.deepEqual(result.slots[0], { id: 'minecraft:cobblestone', count: 64 });
  assert.ok(result.slots.slice(1).every((slot) => slot === null));
});

test('store splits an oversized stack across slots', () => {
  const result = chestStore(emptyChest(), 'minecraft:cobblestone', 100, maxOf);
  assert.equal(result.stored, 100);
  assert.equal(result.leftover, 0);
  assert.deepEqual(result.slots[0], { id: 'minecraft:cobblestone', count: 64 });
  assert.deepEqual(result.slots[1], { id: 'minecraft:cobblestone', count: 36 });
});

test('store merges into matching partials before opening a free slot', () => {
  const base = emptyChest();
  base[3] = { id: 'minecraft:cobblestone', count: 50 };
  const result = chestStore(base, 'minecraft:cobblestone', 30, maxOf);
  assert.deepEqual(result.slots[3], { id: 'minecraft:cobblestone', count: 64 });
  assert.deepEqual(result.slots[0], { id: 'minecraft:cobblestone', count: 16 });
  assert.equal(result.stored, 30);
  assert.equal(result.leftover, 0);
});

test('store returns everything when the chest is full', () => {
  const full = Array.from({ length: CHEST_SLOTS }, () => ({ id: 'minecraft:cobblestone', count: 64 }));
  const result = chestStore(full, 'minecraft:cobblestone', 10, maxOf);
  assert.equal(result.stored, 0);
  assert.equal(result.leftover, 10);
  assert.equal(chestIsFull(result.slots), true);
});

test('store uses the last slot exactly at the boundary', () => {
  const almost = emptyChest();
  for (let i = 0; i < CHEST_SLOTS - 1; i++) almost[i] = { id: 'minecraft:cobblestone', count: 64 };
  const result = chestStore(almost, 'minecraft:cobblestone', 1, maxOf);
  assert.equal(result.stored, 1);
  assert.equal(result.leftover, 0);
  assert.equal(result.slots[CHEST_SLOTS - 1].count, 1);
  assert.equal(chestIsFull(result.slots), true);
});

test('store still merges into a partial when every slot is occupied', () => {
  const slots = Array.from({ length: CHEST_SLOTS }, (_, i) =>
    i === 5 ? { id: 'minecraft:cobblestone', count: 60 } : { id: 'minecraft:dirt', count: 1 });
  const result = chestStore(slots, 'minecraft:cobblestone', 4, maxOf);
  assert.equal(result.stored, 4);
  assert.equal(result.leftover, 0);
  assert.equal(result.slots[5].count, 64);
  assert.equal(chestIsFull(result.slots), true);
});

test('store respects a smaller max stack size', () => {
  const result = chestStore(emptyChest(), 'minecraft:egg', 20, maxOf);
  assert.deepEqual(result.slots[0], { id: 'minecraft:egg', count: 16 });
  assert.deepEqual(result.slots[1], { id: 'minecraft:egg', count: 4 });
  assert.equal(result.stored, 20);
  assert.equal(result.leftover, 0);
});

test('unstackable items take one slot each and overflow as leftover', () => {
  const spread = chestStore(emptyChest(), 'minecraft:diamond_sword', 3, maxOf);
  assert.equal(spread.stored, 3);
  assert.equal(spread.slots[0].count, 1);
  assert.equal(spread.slots[1].count, 1);
  assert.equal(spread.slots[2].count, 1);
  const full = Array.from({ length: CHEST_SLOTS }, () => ({ id: 'minecraft:diamond_sword', count: 1 }));
  const result = chestStore(full, 'minecraft:diamond_sword', 5, maxOf);
  assert.equal(result.stored, 0);
  assert.equal(result.leftover, 5);
});

test('store and take never mutate their input slots', () => {
  const base = emptyChest();
  base[0] = { id: 'minecraft:cobblestone', count: 10 };
  const snapshot = JSON.stringify(base);
  chestStore(base, 'minecraft:cobblestone', 60, maxOf);
  chestTake(base, 0);
  assert.equal(JSON.stringify(base), snapshot);
});

test('take removes exactly one slot and never mutates the input', () => {
  const base = emptyChest();
  base[2] = { id: 'minecraft:apple', count: 7 };
  const result = chestTake(base, 2);
  assert.deepEqual(result.taken, { id: 'minecraft:apple', count: 7 });
  assert.equal(result.slots[2], null);
  assert.deepEqual(base[2], { id: 'minecraft:apple', count: 7 });
});

test('take returns null for empty, out-of-range, and negative slots', () => {
  const base = emptyChest();
  base[1] = { id: 'minecraft:apple', count: 7 };
  for (const index of [0, 5, -1, CHEST_SLOTS]) {
    const result = chestTake(base, index);
    assert.equal(result.taken, null);
    assert.deepEqual(result.slots, base);
  }
});

test('chestIsFull is true only when every slot is occupied', () => {
  assert.equal(chestIsFull(emptyChest()), false);
  const nearly = emptyChest();
  for (let i = 0; i < CHEST_SLOTS - 1; i++) nearly[i] = { id: 'minecraft:dirt', count: 1 };
  assert.equal(chestIsFull(nearly), false);
  nearly[CHEST_SLOTS - 1] = { id: 'minecraft:dirt', count: 1 };
  assert.equal(chestIsFull(nearly), true);
});

test('stored chests survive a serialize/parse round trip', () => {
  const stored = chestStore(emptyChest(), 'minecraft:cobblestone', 100, maxOf).slots;
  const reloaded = parseChest(serializeChest(stored));
  const result = chestTake(reloaded, 1);
  assert.deepEqual(result.taken, { id: 'minecraft:cobblestone', count: 36 });
  assert.equal(result.slots[0].count, 64);
});
