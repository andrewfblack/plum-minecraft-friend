// Pure ballistic math for Grapes the Sharpshooter. Kept free of any
// @minecraft/server import so it can be unit-tested in plain Node.

// The projectile entity Grapes fires, and the tune of its shots.
export const GRAPE_SEED_ENTITY = 'grapes:seed';
export const GRAPE_SEED_SPEED = 2.0;
export const GRAPE_GRAVITY = 0.05;
export const GRAPE_RANGE = 12; // blocks; Grapes only aims at monsters this close
export const GRAPE_COOLDOWN = 40; // ticks between shots (~2s)
export const GRAPE_DAMAGE = 5; // hearts of melee-hp damage per seed
export const GRAPE_MOUTH_HEIGHT = 0.55; // how high above the feet the seed spawns
export const GRAPE_MONSTER_FAMILY = 'monster';

/**
 * Ballistic launch velocity that carries a projectile from `from` to `to`
 * under `gravity`, at total speed `speed`. Chooses the low (flat) arc so a seed
 * never lobs over the target. When the target cannot be reached at this speed
 * it falls back to a direct shot.
 * @param {{ x: number, y: number, z: number }} from
 * @param {{ x: number, y: number, z: number }} to
 * @param {number} [speed]
 * @param {number} [gravity]
 * @returns {{ x: number, y: number, z: number }}
 */
export function seedVelocity(from, to, speed = GRAPE_SEED_SPEED, gravity = GRAPE_GRAVITY) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dz = to.z - from.z;
  const horizontal = Math.hypot(dx, dz);
  if (horizontal < 1e-6) {
    // Straight up/down at the target: no horizontal arc to work with.
    const h = Math.hypot(dx, dy, dz);
    const k = (h < 1e-6 ? speed : 0) || (speed * (h < 0 ? -1 : 1) / (h || 1));
    return { x: h < 1e-6 ? 0 : dx / h * speed, y: h < 1e-6 ? speed : dy / h * speed, z: h < 1e-6 ? 0 : dz / h * speed };
  }
  const speedSq = speed * speed;
  const disc = speedSq ** 2 - gravity * (gravity * horizontal * horizontal + 2 * dy * speedSq);
  let up = dy / horizontal; // fallback: aim straight at the target
  if (disc >= 0) {
    up = (speedSq - Math.sqrt(disc)) / (gravity * horizontal);
  }
  const planar = speedSq / (1 + up * up);
  const vh = planar >= 0 ? Math.sqrt(planar) : speed;
  const vy = vh * up;
  const scale = vh / (horizontal || 1);
  return { x: dx * scale, y: vy, z: dz * scale };
}