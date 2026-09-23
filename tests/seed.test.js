import test from 'node:test';
import assert from 'node:assert/strict';
import {
  GRAPE_SEED_ENTITY, GRAPE_SEED_SPEED, GRAPE_GRAVITY, GRAPE_RANGE,
  GRAPE_COOLDOWN, GRAPE_DAMAGE, GRAPE_MOUTH_HEIGHT, GRAPE_MONSTER_FAMILY,
  seedVelocity,
} from '../packs/Plum_BP/scripts/seed.js';

const speed = (v) => Math.hypot(v.x, v.y, v.z);

test('tuning constants exist and are sane', () => {
  assert.equal(GRAPE_SEED_ENTITY, 'grapes:seed');
  assert.equal(GRAPE_SEED_SPEED, 2);
  assert.equal(GRAPE_GRAVITY, 0.05);
  assert.equal(GRAPE_RANGE, 12);
  assert.equal(GRAPE_COOLDOWN, 40);
  assert.equal(GRAPE_DAMAGE, 5);
  assert.equal(GRAPE_MOUTH_HEIGHT, 0.55);
  assert.equal(GRAPE_MONSTER_FAMILY, 'monster');
});

test('any shot travels at exactly the launch speed', () => {
  const from = { x: 0, y: 10, z: 0 };
  const targets = [
    { x: 12, y: 10, z: 0 },
    { x: 3, y: 10, z: 4 },
    { x: -8, y: 13, z: 2 },
    { x: 6, y: 7, z: -6 },
    { x: 0.5, y: 10, z: 0.5 },
  ];
  for (const to of targets) {
    const v = seedVelocity(from, to);
    assert.ok(Math.abs(speed(v) - GRAPE_SEED_SPEED) < 1e-6, `speed ${speed(v)} for ${to}`);
  }
});

test('a flat shot lobs slightly upward, compensating gravity', () => {
  const from = { x: 0, y: 10, z: 0 };
  const to = { x: 12, y: 10, z: 0 };
  const v = seedVelocity(from, to);
  assert.ok(v.y > 0, 'flat shots need an upward component');
  assert.ok(v.y < 0.5, 'flat shots keep the arc low');
});

test('the arc grows with distance', () => {
  const from = { x: 0, y: 10, z: 0 };
  const near = seedVelocity(from, { x: 3, y: 10, z: 0 });
  const far = seedVelocity(from, { x: 12, y: 10, z: 0 });
  assert.ok(far.y > near.y - 1e-6, 'farther shots need a higher arc');
});

test('an uphill target gets a steeper shot than a level one', () => {
  const from = { x: 0, y: 10, z: 0 };
  const level = seedVelocity(from, { x: 12, y: 10, z: 0 });
  const uphill = seedVelocity(from, { x: 12, y: 12.5, z: 0 });
  assert.ok(uphill.y > level.y, 'uphill shots climb');
  const downhill = seedVelocity(from, { x: 12, y: 8.5, z: 0 });
  assert.ok(downhill.y < level.y, 'downhill shots stay flatter');
});

test('correctly aimed flat shots land on target under gravity', () => {
  // Simulate the projectile physics and check closest approach at range 6.
  const from = { x: 0, y: 10, z: 0 };
  const to = { x: 6, y: 10, z: 0 };
  const v = seedVelocity(from, to);
  let px = from.x, py = from.y, pz = from.z, vx = v.x, vy = v.y, vz = v.z;
  let best = Infinity;
  for (let t = 0; t < 300; t++) {
    px += vx; py += vy; pz += vz;
    vy -= GRAPE_GRAVITY;
    best = Math.min(best, Math.hypot(px - to.x, py - to.y, pz - to.z));
    if (py < 0) break;
  }
  assert.ok(best < 1.0, `simulated arc misses the target by ${best}`);
});

test('an unreachable target falls back to a fast direct shot', () => {
  const from = { x: 0, y: 10, z: 0 };
  const to = { x: 12, y: 40, z: 0 }; // way out of reach at this speed/gravity
  const v = seedVelocity(from, to);
  assert.equal(speed(v), GRAPE_SEED_SPEED);
  assert.ok(v.y > 0);
});

test('overlapping targets keep horizontal direction', () => {
  const from = { x: 0, y: 10, z: 0 };
  const to = { x: 5, y: 10, z: 8 };
  const v = seedVelocity(from, to);
  const horizontal = Math.hypot(v.x, v.z);
  assert.ok(horizontal > 0);
  const ratio = v.z / v.x;
  assert.ok(Math.abs(ratio - 8 / 5) < 1e-6, `z/x = ${ratio}`);
});