// Universal Fruity Friend movement-state system.
//
// Every tamed Fruity Friend (Plum, Apple, Blueberry, and future fruits) lives in
// exactly one movement mode: STAY, FOLLOW, WORK, HOME, or BASKET. The mode and any
// anchor data are persisted as entity dynamic properties so they survive world
// reloads. Movement is enforced from main.js using the small, pure helpers below.
//
// This module is deliberately free of any @minecraft/server import so the math and
// persistence helpers can be unit-tested in plain Node, mirroring chest.js.

/** @type {{ STAY: 'stay', FOLLOW: 'follow', WORK: 'work', HOME: 'home', BASKET: 'basket' }} */
export const MODE = Object.freeze({
  STAY: 'stay',
  FOLLOW: 'follow',
  WORK: 'work',
  HOME: 'home',
  BASKET: 'basket',
});

/** @type {Set<string>} */
const MODE_VALUES = new Set(Object.values(MODE));

// Centralized configurable values shared by every fruit type.
export const MAX_FOLLOWING_FRIENDS = 4;
export const WORK_RADIUS = 20;
export const HOME_RADIUS = 10;

// Dynamic-property keys. BASKET friends are not world entities, so their mode is
// carried by the Fruit Basket item snapshot instead (see main.js).
export const MODE_KEY = 'friend:mode';
export const WORK_KEY = { x: 'friend:workX', y: 'friend:workY', z: 'friend:workZ', dim: 'friend:workDim' };

/**
 * Read a friend's persisted movement mode.
 * @param {any} entity
 * @returns {string | null}
 */
export function readMode(entity) {
  const value = entity?.getDynamicProperty?.(MODE_KEY);
  return typeof value === 'string' && MODE_VALUES.has(value) ? value : null;
}

/**
 * Persist a friend's movement mode.
 * @param {any} entity
 * @param {string} mode
 */
export function setMode(entity, mode) {
  if (MODE_VALUES.has(mode)) entity?.setDynamicProperty?.(MODE_KEY, mode);
}

/**
 * Work Anchor as read from the entity, or null when absent/corrupt.
 * @param {any} entity
 * @returns {{ x: number, y: number, z: number, dim: string } | null}
 */
export function readWorkAnchor(entity) {
  const x = entity?.getDynamicProperty?.(WORK_KEY.x);
  const y = entity?.getDynamicProperty?.(WORK_KEY.y);
  const z = entity?.getDynamicProperty?.(WORK_KEY.z);
  const dim = entity?.getDynamicProperty?.(WORK_KEY.dim);
  if (typeof x !== 'number' || typeof y !== 'number' || typeof z !== 'number' || typeof dim !== 'string') return null;
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z) || !dim) return null;
  return { x, y, z, dim };
}

/**
 * Store (or clear) the friend's Work Anchor.
 * @param {any} entity
 * @param {{ x: number, y: number, z: number, dim: string } | null} anchor
 */
export function setWorkAnchor(entity, anchor) {
  if (!entity?.setDynamicProperty) return;
  if (!anchor) {
    for (const key of Object.values(WORK_KEY)) entity.setDynamicProperty(key, undefined);
    return;
  }
  entity.setDynamicProperty(WORK_KEY.x, anchor.x);
  entity.setDynamicProperty(WORK_KEY.y, anchor.y);
  entity.setDynamicProperty(WORK_KEY.z, anchor.z);
  entity.setDynamicProperty(WORK_KEY.dim, anchor.dim);
}

/**
 * Euclidean 3D distance between two positions.
 * @param {{ x: number, y: number, z: number }} a
 * @param {{ x: number, y: number, z: number }} b
 * @returns {number}
 */
export function distance3d(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

/**
 * Horizontal (XZ) distance between two positions. Radius checks ignore height so a
 * friend on a hill can still legally "work" or "live" near a ground-level anchor.
 * @param {{ x: number, z: number }} a
 * @param {{ x: number, z: number }} b
 * @returns {number}
 */
export function distanceHorizontal(a, b) {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

/**
 * Decide how a friend should behave relative to its anchor and allowed radius.
 *
 * - Inside the radius: stay put (no action).
 * - Outside but not too far: a short "nudge" step back toward a point just inside
 *   the radius (looks like the friend is returning on its own).
 * - Too far away: teleport straight back to the anchor (safe recovery).
 *
 * @param {{ x: number, y: number, z: number }} position
 * @param {{ x: number, y: number, z: number }} anchor
 * @param {number} radius allowed radius around the anchor
 * @param {number} tooFar distance at which we stop nudging and teleport
 * @returns {{ action: 'none' } | { action: 'nudge', target: { x: number, y: number, z: number } } | { action: 'teleport', target: { x: number, y: number, z: number } }}
 */
export function returnPlan(position, anchor, radius, tooFar) {
  const distance = distance3d(position, anchor);
  if (distance <= radius) return { action: 'none' };
  if (distance >= tooFar || distance < 0.001) {
    return { action: 'teleport', target: { x: anchor.x, y: anchor.y, z: anchor.z } };
  }
  const step = Math.max(0.5, distance - radius + 0.5);
  const ratio = Math.min(1, step / distance);
  return {
    action: 'nudge',
    target: {
      x: position.x + (anchor.x - position.x) * ratio,
      y: position.y + (anchor.y - position.y) * ratio,
      z: position.z + (anchor.z - position.z) * ratio,
    },
  };
}

/**
 * Sensible starting mode for a friend that has no mode saved yet. Pre-update
 * friends that were sitting migrate to STAY; everything else keeps the old
 * follow-the-owner behavior by migrating to FOLLOW.
 * @param {boolean} sitting
 * @returns {string}
 */
export function defaultMode(sitting) {
  return sitting ? MODE.STAY : MODE.FOLLOW;
}

/**
 * Human-friendly lowercase label for a mode.
 * @param {string} mode
 * @returns {string}
 */
export function describeMode(mode) {
  switch (mode) {
    case MODE.FOLLOW: return 'following you';
    case MODE.STAY: return 'staying here';
    case MODE.WORK: return 'working around my anchor';
    case MODE.HOME: return 'at home';
    default: return 'idle';
  }
}