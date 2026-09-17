const SOIL = new Set(['minecraft:grass_block', 'minecraft:grass', 'minecraft:dirt', 'minecraft:coarse_dirt', 'minecraft:podzol', 'minecraft:moss_block']);
const REPLACEABLE = new Set(['minecraft:air', 'minecraft:short_grass', 'minecraft:tall_grass']);

const PLANS = {
  'plum:plum_sapling': ['minecraft:oak_log', 'plum:plum_leaves'],
  'apple:apple_sapling': ['minecraft:oak_log', 'apple:apple_leaves'],
  'blueberry:blueberry_sapling': ['minecraft:oak_log', 'blueberry:blueberry_leaves'],
};

// A compact five-block-wide crown, four-block trunk and a six-block total height.
export function treePlan(origin) {
  const result = [];
  for (let y = 0; y < 4; y++) result.push({ location: { x: origin.x, y: origin.y + y, z: origin.z }, type: 'minecraft:oak_log' });
  for (let y = 2; y <= 5; y++) {
    const radius = y < 4 ? 2 : 1;
    for (let x = -radius; x <= radius; x++) for (let z = -radius; z <= radius; z++) {
      if ((y < 4 && x === 0 && z === 0) || (Math.abs(x) === radius && Math.abs(z) === radius)) continue;
      result.push({ location: { x: origin.x + x, y: origin.y + y, z: origin.z + z }, type: 'plum:plum_leaves' });
    }
  }
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
    for (const step of treePlan(origin)) {
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