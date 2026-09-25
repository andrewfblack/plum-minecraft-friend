// Pure crop math for Strawberry the Farmer. Kept free of any @minecraft/server
// import so it can be unit-tested in plain Node, mirroring chest.js.

// The vanilla crops Strawberry tends, keyed by block id. Each entry names the
// item he replants after a harvest and the growth-state value at which it is ripe.
export const CROPS = {
  'minecraft:wheat': { seed: 'minecraft:wheat_seeds', maxGrowth: 7 },
  'minecraft:carrots': { seed: 'minecraft:carrot', maxGrowth: 7 },
  'minecraft:potatoes': { seed: 'minecraft:potato', maxGrowth: 7 },
  'minecraft:beetroot': { seed: 'minecraft:beetroot_seeds', maxGrowth: 3 },
};
export const CROP_TYPES = Object.keys(CROPS);

// Grass Strawberry breaks while foraging for seeds.
export const GRASS_TYPES = ['minecraft:short_grass', 'minecraft:tall_grass'];

/**
 * @param {string} typeId
 * @returns {boolean}
 */
export function isCrop(typeId) {
  return Object.hasOwn(CROPS, typeId);
}

/**
 * Growth-state value at which a crop is ripe, or null for non-crops.
 * @param {string} typeId
 * @returns {number | null}
 */
export function cropMaxGrowth(typeId) {
  const crop = CROPS[typeId];
  return crop ? crop.maxGrowth : null;
}

/**
 * The item to replant after harvesting a crop, or null for non-crops.
 * @param {string} typeId
 * @returns {string | null}
 */
export function replantItem(typeId) {
  const crop = CROPS[typeId];
  return crop ? crop.seed : null;
}

/**
 * A crop is mature when it has reached its final growth state.
 * @param {string} typeId
 * @param {number} growth
 * @returns {boolean}
 */
export function isMature(typeId, growth) {
  const max = cropMaxGrowth(typeId);
  return max != null && Number.isFinite(growth) && growth >= max;
}

/**
 * The next growth-state value to set, or null when the crop is already ripe.
 * @param {string} typeId
 * @param {number} growth
 * @returns {number | null}
 */
export function nextGrowth(typeId, growth) {
  const max = cropMaxGrowth(typeId);
  if (max == null || !Number.isFinite(growth) || growth >= max) return null;
  return growth + 1;
}

/**
 * The items a ripe crop sheds, close to vanilla odds. `random()` returns [0, 1).
 * @param {string} typeId
 * @param {() => number} [random]
 * @returns {{ id: string, count: number }[]}
 */
export function harvestDrops(typeId, random = Math.random) {
  const bonus = (chance) => (random() < chance ? 1 : 0);
  switch (typeId) {
    case 'minecraft:wheat':
      return [{ id: 'minecraft:wheat', count: 1 }, { id: 'minecraft:wheat_seeds', count: 1 + bonus(0.75) + bonus(0.25) }];
    case 'minecraft:carrots':
      return [{ id: 'minecraft:carrot', count: 1 + bonus(0.75) + bonus(0.25) }];
    case 'minecraft:potatoes':
      return [{ id: 'minecraft:potato', count: 1 + bonus(0.75) + bonus(0.25) }];
    case 'minecraft:beetroot':
      return [{ id: 'minecraft:beetroot', count: 1 }, { id: 'minecraft:beetroot_seeds', count: bonus(0.5) + bonus(0.25) }];
    default:
      return [];
  }
}

/**
 * What breaking grass while foraging yields: mostly wheat seeds, occasionally a
 * beetroot seed, and often nothing at all.
 * @param {() => number} [random]
 * @returns {{ id: string, count: number }[]}
 */
export function forageDrops(random = Math.random) {
  const roll = random();
  if (roll < 0.5) return [{ id: 'minecraft:wheat_seeds', count: 1 }];
  if (roll < 0.65) return [{ id: 'minecraft:beetroot_seeds', count: 1 }];
  return [];
}

/**
 * Collapse a list of drop entries into one {id, count} stack each, skipping
 * any zero-count leftovers. The Farmer feeds these to chest.js one by one.
 * @param {{ id: string, count: number }[]} drops
 * @returns {{ id: string, count: number }[]}
 */
export function mergeDrops(drops) {
  const total = {};
  for (const { id, count } of drops) {
    if (count <= 0) continue;
    total[id] = (total[id] ?? 0) + count;
  }
  return Object.entries(total).map(([id, count]) => ({ id, count }));
}