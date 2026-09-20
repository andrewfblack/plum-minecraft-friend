import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MODE, MAX_FOLLOWING_FRIENDS, WORK_RADIUS, HOME_RADIUS,
  MODE_KEY, WORK_KEY,
  readMode, setMode, readWorkAnchor, setWorkAnchor,
  distance3d, distanceHorizontal, returnPlan, defaultMode, describeMode,
} from '../packs/Plum_BP/scripts/friend_state.js';

/** Fake entity backing its dynamic properties with a plain map. */
function fakeEntity(dynamic = new Map()) {
  return {
    getDynamicProperty(key) { return dynamic.get(key); },
    setDynamicProperty(key, value) { if (value === undefined) dynamic.delete(key); else dynamic.set(key, value); },
    _dynamic: dynamic,
  };
}

test('shared config values are centralized', () => {
  assert.equal(MAX_FOLLOWING_FRIENDS, 6);
  assert.equal(WORK_RADIUS, 20);
  assert.equal(HOME_RADIUS, 10);
  assert.equal(MODE.STAY, 'stay');
  assert.equal(MODE.FOLLOW, 'follow');
  assert.equal(MODE.WORK, 'work');
  assert.equal(MODE.HOME, 'home');
  assert.equal(MODE.BASKET, 'basket');
});

test('readMode returns null for missing or corrupt data', () => {
  assert.equal(readMode(fakeEntity()), null);
  assert.equal(readMode(fakeEntity(new Map([[MODE_KEY, '']]))), null);
  assert.equal(readMode(fakeEntity(new Map([[MODE_KEY, 'floating']]))), null);
  assert.equal(readMode(fakeEntity(new Map([[MODE_KEY, 5]]))), null);
});

test('setMode persists a valid mode and ignores bad ones', () => {
  for (const mode of ['stay', 'follow', 'work', 'home', 'basket']) {
    const entity = fakeEntity();
    setMode(entity, mode);
    assert.equal(readMode(entity), mode);
  }
  const entity = fakeEntity();
  setMode(entity, 'teleport');
  assert.equal(entity._dynamic.has(MODE_KEY), false);
});

test('work anchor round-trips and clearing removes it', () => {
  const entity = fakeEntity();
  assert.equal(readWorkAnchor(entity), null);
  const anchor = { x: 12.5, y: 64, z: -7.5, dim: 'overworld' };
  setWorkAnchor(entity, anchor);
  assert.deepEqual(readWorkAnchor(entity), anchor);
  setWorkAnchor(entity, null);
  assert.equal(readWorkAnchor(entity), null);
  for (const key of Object.values(WORK_KEY)) assert.equal(entity._dynamic.has(key), false, `${key} should be cleared`);
});

test('work anchor rejects partial or corrupt data', () => {
  const entity = fakeEntity(new Map([
    [WORK_KEY.x, 1], [WORK_KEY.y, 'nan'], [WORK_KEY.z, 1], [WORK_KEY.dim, 'overworld'],
  ]));
  assert.equal(readWorkAnchor(entity), null);
});

test('distance helpers', () => {
  assert.equal(distance3d({ x: 0, y: 0, z: 0 }, { x: 3, y: 0, z: 4 }), 5);
  assert.equal(distanceHorizontal({ x: 3, y: 99, z: 4 }, { x: 0, y: -5, z: 0 }), 5);
});

test('returnPlan leaves an in-radius friend alone', () => {
  const plan = returnPlan({ x: 10, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }, WORK_RADIUS, WORK_RADIUS * 1.5);
  assert.equal(plan.action, 'none');
});

test('returnPlan nudges a slightly-outside friend back inside the radius', () => {
  // Anchor at origin, friend 21 out (just beyond radius 20).
  const plan = returnPlan({ x: 21, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }, 20, 30);
  assert.equal(plan.action, 'nudge');
  assert.ok(plan.action === 'nudge' && distance3d(plan.target, { x: 0, y: 0, z: 0 }) < 20,
    'nudge target should land inside the allowed radius');
  assert.ok(plan.action === 'nudge' && Math.abs(plan.target.x - 21) < 21, 'nudge should be a small step, not a full teleport');
});

test('returnPlan teleports straight back when too far out', () => {
  const plan = returnPlan({ x: 100, y: 5, z: 0 }, { x: 0, y: 0, z: 0 }, 20, 30);
  assert.equal(plan.action, 'teleport');
  assert.deepEqual(plan.action === 'teleport' ? plan.target : null, { x: 0, y: 0, z: 0 });
});

test('returnPlan degenerates safely when the friend is already on top of the anchor', () => {
  const plan = returnPlan({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }, 20, 30);
  assert.equal(plan.action, 'none');
});

test('defaultMode keeps pre-update behavior: sitting stays, the rest follow', () => {
  assert.equal(defaultMode(true), 'stay');
  assert.equal(defaultMode(false), 'follow');
});

test('describeMode covers every mode', () => {
  for (const mode of ['stay', 'follow', 'work', 'home', 'basket', 'nonsense']) {
    assert.equal(typeof describeMode(mode), 'string');
  }
});
