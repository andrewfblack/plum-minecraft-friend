const SOIL = new Set(['minecraft:grass_block', 'minecraft:grass', 'minecraft:dirt', 'minecraft:coarse_dirt', 'minecraft:podzol', 'minecraft:moss_block', 'minecraft:sand']);
const REPLACEABLE = new Set(['minecraft:air', 'minecraft:short_grass', 'minecraft:tall_grass']);

const PLANS = {
  'plum:plum_sapling': ['minecraft:oak_log', 'plum:plum_leaves'],
  'apple:apple_sapling': ['minecraft:oak_log', 'apple:apple_leaves'],
  'blueberry:blueberry_sapling': ['minecraft:oak_log', 'blueberry:blueberry_leaves'],
  'lemon:lemon_sapling': ['minecraft:oak_log', 'lemon:lemon_leaves'],
  'banana:banana_sapling': ['minecraft:oak_log', 'banana:banana_leaves'],
  'grapes:grapes_sapling': ['minecraft:oak_log', 'grapes:grapes_leaves'],
  'strawberry:strawberry_sapling': ['minecraft:oak_log', 'strawberry:strawberry_leaves'],
  'coconut:coconut_sapling': ['minecraft:oak_log', 'coconut:coconut_leaves'],
};

// A dense five-block-wide crown, four-block trunk and a six-block total height.
export function treePlan(origin, typeId) {
  if (typeId === 'grapes:grapes_sapling') return grapeVinePlan(origin);
  if (typeId === 'strawberry:strawberry_sapling') return strawberryBushPlan(origin);
  if (typeId === 'coconut:coconut_sapling') return coconutPalmPlan(origin);
  const result = [];
  for (let y = 0; y < 4; y++) result.push({ location: { x: origin.x, y: origin.y + y, z: origin.z }, type: 'minecraft:oak_log' });
  for (let y = 2; y <= 5; y++) {
    const radius = y < 5 ? 2 : 1;
    for (let x = -radius; x <= radius; x++) for (let z = -radius; z <= radius; z++) {
      if ((y < 4 && x === 0 && z === 0) || (Math.abs(x) === radius && Math.abs(z) === radius)) continue;
      result.push({ location: { x: origin.x + x, y: origin.y + y, z: origin.z + z }, type: 'plum:plum_leaves' });
    }
  }
  return result;
}

// Grapes grow like a creeping vine: one log buried under a low mound of leaves
// so no wood peeks out between the leaves and the ground.
function grapeVinePlan(origin) {
  const result = [{ location: { x: origin.x, y: origin.y, z: origin.z }, type: 'minecraft:oak_log' }];
  for (const [dy, radius] of [[0, 2], [1, 1], [2, 0]]) {
    for (let x = -radius; x <= radius; x++) for (let z = -radius; z <= radius; z++) {
      if (dy === 0 && x === 0 && z === 0) continue;
      result.push({ location: { x: origin.x + x, y: origin.y + dy, z: origin.z + z }, type: 'grapes:grapes_leaves' });
    }
  }
  return result;
}

// Strawberries grow as a tiny leafy mound: one log with just five leaf blocks
// hugging it, so an almost-flush green hump hides the wood completely.
function strawberryBushPlan(origin) {
  const result = [{ location: { x: origin.x, y: origin.y, z: origin.z }, type: 'minecraft:oak_log' }];
  for (const [dx, dz] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
    result.push({ location: { x: origin.x + dx, y: origin.y, z: origin.z + dz }, type: 'strawberry:strawberry_leaves' });
  }
  result.push({ location: { x: origin.x, y: origin.y + 1, z: origin.z }, type: 'strawberry:strawberry_leaves' });
  return result;
}

// Coconuts grow as a tall slim palm: a five-log bare trunk capped by a snug
// frond tuft, so it towers over the squat fruit-tree canopy like a real beach palm.
function coconutPalmPlan(origin) {
  const result = [];
  for (let y = 0; y < 5; y++) result.push({ location: { x: origin.x, y: origin.y + y, z: origin.z }, type: 'minecraft:oak_log' });
  for (const [dx, dz] of [[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
    result.push({ location: { x: origin.x + dx, y: origin.y + 5, z: origin.z + dz }, type: 'coconut:coconut_leaves' });
  }
  result.push({ location: { x: origin.x, y: origin.y + 6, z: origin.z }, type: 'coconut:coconut_leaves' });
  return result;
}

export function growTree(sapling) {
  const plan = PLANS[sapling.typeId];
  if (!plan) return false;
  const [trunkType, leafType] = plan;
  const originals = [];
  let written = 0;
  try {
    const origin = sapling.location;
    const soil = sapling.dimension.getBlock({ ...origin, y: origin.y - 1 });
    if (!soil || !SOIL.has(soil.typeId)) return false;
    // Check every destination before writing, including unloaded chunks and ceilings.
    for (const step of treePlan(origin, sapling.typeId)) {
      const block = sapling.dimension.getBlock(step.location);
      if (!block) return false;
      const isRoot = step.location.x === origin.x && step.location.y === origin.y && step.location.z === origin.z;
      if (!(isRoot && block.typeId === sapling.typeId) && !REPLACEABLE.has(block.typeId)) return false;
      originals.push({ block, permutation: block.permutation, type: step.type === 'minecraft:oak_log' ? trunkType : leafType });
    }
    for (const entry of originals) {
      entry.block.setType(entry.type);
      written++;
    }
    return true;
  } catch {
    // Keep a failed placement from deleting the sapling or leaving half a tree.
    for (let i = written - 1; i >= 0; i--) {
      try { originals[i].block.setPermutation(originals[i].permutation); } catch { /* Chunk unloaded. */ }
    }
    return false;
  }
}
