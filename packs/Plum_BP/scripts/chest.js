// Pure slot math for Blueberry's portable chest. Kept free of any
// @minecraft/server import so it can be unit-tested in plain Node.

/**
 * @typedef {{ id: string, count: number }} ChestStack
 * @typedef {ChestStack | null} ChestEntry
 */

export const CHEST_SLOTS = 27;

/** @returns {ChestEntry[]} */
export function emptyChest() {
  return Array(CHEST_SLOTS).fill(null);
}

/**
 * Coerce one stored slot into a valid stack or null.
 * @param {unknown} value
 * @returns {ChestEntry}
 */
function normalizeSlot(value) {
  if (!value || typeof value !== 'object') return null;
  const record = /** @type {{ id?: unknown, count?: unknown }} */ (value);
  if (typeof record.id !== 'string' || !record.id) return null;
  if (typeof record.count !== 'number' || !Number.isFinite(record.count) || record.count <= 0) return null;
  return { id: record.id, count: Math.floor(record.count) };
}

/**
 * Parse a serialized chest, always returning exactly CHEST_SLOTS entries.
 * Corrupt, missing, or short data degrades to an empty chest.
 * @param {unknown} raw
 * @returns {ChestEntry[]}
 */
export function parseChest(raw) {
  if (typeof raw !== 'string' || !raw) return emptyChest();
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return emptyChest();
  }
  if (!Array.isArray(parsed)) return emptyChest();
  return Array.from({ length: CHEST_SLOTS }, (_, i) => normalizeSlot(parsed[i]));
}

/**
 * @param {ChestEntry[]} slots
 * @returns {string}
 */
export function serializeChest(slots) {
  return JSON.stringify(slots);
}

/**
 * @param {ChestEntry[]} slots
 * @returns {boolean}
 */
export function chestIsFull(slots) {
  return slots.every((slot) => slot !== null);
}

/**
 * Fit a stack into the chest. Never mutates the input; merges into matching
 * partial stacks before opening free slots and splits across slots when the
 * stack is larger than one slot's capacity.
 * @param {ChestEntry[]} slots
 * @param {string} typeId
 * @param {number} amount
 * @param {(id: string) => number} maxAmount
 * @returns {{ slots: ChestEntry[], stored: number, leftover: number }}
 */
export function chestStore(slots, typeId, amount, maxAmount) {
  const next = slots.map((slot) => (slot ? { id: slot.id, count: slot.count } : null));
  const cap = Math.max(1, Math.floor(maxAmount(typeId)));
  const wanted = Math.max(0, Math.floor(amount));
  let remaining = wanted;
  for (let i = 0; i < next.length && remaining > 0; i++) {
    const slot = next[i];
    if (!slot || slot.id !== typeId) continue;
    const add = Math.min(remaining, cap - slot.count);
    if (add > 0) { slot.count += add; remaining -= add; }
  }
  for (let i = 0; i < next.length && remaining > 0; i++) {
    if (next[i]) continue;
    const add = Math.min(remaining, cap);
    next[i] = { id: typeId, count: add };
    remaining -= add;
  }
  return { slots: next, stored: wanted - remaining, leftover: remaining };
}

/**
 * Remove one whole slot. Never mutates the input.
 * @param {ChestEntry[]} slots
 * @param {number} index
 * @returns {{ slots: ChestEntry[], taken: ChestStack | null }}
 */
export function chestTake(slots, index) {
  const next = slots.map((slot) => (slot ? { id: slot.id, count: slot.count } : null));
  const taken = index >= 0 && index < next.length ? next[index] : null;
  if (!taken) return { slots: next, taken: null };
  next[index] = null;
  return { slots: next, taken };
}
