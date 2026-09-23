import { world, system, EquipmentSlot, ItemStack, Player, BlockPermutation, EntityDamageCause } from '@minecraft/server';
import { ActionFormData, ModalFormData } from '@minecraft/server-ui';
import { answerQuestion, chatLabelFor } from './provider.js';
import { cleanText } from './knowledge.js';
import { CHEST_SLOTS, parseChest, serializeChest, chestIsFull, chestStore, chestTake } from './chest.js';
import {
  MAX_FOLLOWING_FRIENDS, WORK_RADIUS, HOME_RADIUS, MODE,
  readMode, setMode, readWorkAnchor, setWorkAnchor, defaultMode, describeMode, returnPlan,
} from './friend_state.js';
import {
  GRAPE_SEED_ENTITY, GRAPE_RANGE, GRAPE_COOLDOWN,
  GRAPE_DAMAGE, GRAPE_MOUTH_HEIGHT, GRAPE_MONSTER_FAMILY, seedVelocity,
} from './seed.js';
import './orchard.js';

const openForms = new Set();
const nextQuestion = new Map();
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
const DIMENSIONS = ['overworld', 'nether', 'the_end'];

const FRIENDS = {
  'plum:friend': {
    name: 'Plum', color: '§d', fruit: 'plum:plum',
    title: (baby) => baby ? 'Little Plum' : 'Plum',
    body: (baby, label) => `Hi, adventure buddy!\n${label}\n\nStay close for healing. Plant a plum on tilled farmland to grow a baby.`,
    askTitle: 'Ask Plum', replyTitle: 'Plum says...',
    care: 'Tame me by giving me a plum. Plant a plum on tilled farmland to grow a baby. Babies grow in 20 loaded minutes and can be tamed too. Once tamed I stay put; interact with me with an empty hand and choose Follow, Stay, Work, or Go Home (up to six friends may follow you at once). Work keeps me near where you tell me; Go Home sends me to your spawn point. Craft a Fruit Basket from three sticks in the bucket shape and interact with me while holding it to carry me along — I always come out of a basket staying put. Talk to me in chat while I am near you, or hold a book and interact!',
    tamedMsg: 'Give me a plum fruit to tame me first. Only my owner can open my conversation.',
    plantMsg: 'A tiny fruiting sprout pokes through the soil! It will grow into a baby Plum — one plum tames it.',
  },
  'apple:friend': {
    name: 'Apple', color: '§c', fruit: 'apple:apple', shop: true,
    title: (baby) => baby ? 'Little Apple' : 'Apple',
    body: (baby, label) => `Hi, shopper buddy!\n${label}\n\nApplezon delivers one item for the price of one apple fruit. Apple does not heal; stay near Plum for that.`,
    askTitle: 'Ask Apple', replyTitle: 'Apple says...',
    care: 'Tame me by giving me an apple. Plant an apple on tilled farmland to grow a baby. Babies grow in 20 loaded minutes and can be tamed too. Once tamed I stay put; interact with me with an empty hand and choose Follow, Stay, Work, or Go Home. Craft a Fruit Basket from three sticks in the bucket shape and interact with me while holding it to carry me along. Grab items from my Applezon menu, or ask me about the shop in chat!',
    tamedMsg: 'Give me an apple fruit to tame me first. Only my owner can open my conversation or Applezon.',
    plantMsg: 'A tiny fruiting sprout pokes through the soil! It will grow into a baby Apple — one apple tames it.',
  },
  'blueberry:friend': {
    name: 'Blueberry', color: '§9', fruit: 'blueberry:blueberry', collector: true,
    title: (baby) => baby ? 'Little Blueberry' : 'Blueberry',
    body: (baby, label) => `Hi, hauling buddy!\n${label}\n\nI am a Collector: dropped items near me go straight into my chest. Interact with me with an empty hand to open it.`,
    askTitle: 'Ask Blueberry', replyTitle: 'Blueberry says...',
    care: 'Tame me by giving me a blueberry. Plant a blueberry on tilled farmland to grow a baby. Babies grow in 20 loaded minutes and can be tamed too. I scoop up dropped items within four blocks and keep them in my chest. Interact with me with an empty hand to open my chest: store the item you are holding, take something out, just look, or pick Movement to set Follow, Stay, Work, or Go Home. I will tell you when my chest is full. Craft a Fruit Basket from three sticks in the bucket shape and interact with me while holding it to carry me along - my chest comes too. Talk to me in chat while I am near you, or hold a book and interact!',
    tamedMsg: 'Give me a blueberry fruit to tame me first. Only my owner can open my chest or conversation.',
    plantMsg: 'A tiny fruiting sprout pokes through the soil! It will grow into a baby Blueberry — one blueberry tames it.',
  },
  'lemon:friend': {
    name: 'Lemon', color: '§e', fruit: 'lemon:lemon', light: true,
    title: (baby) => baby ? 'Little Lemon' : 'Lemon',
    body: (baby, label) => `Hi, bright buddy... I mean, hi.\n${label}\n\nI stay bright in the dark and cast moving block light at my feet. Plant a lemon on tilled farmland to grow a baby.`,
    askTitle: 'Ask Lemon', replyTitle: 'Lemon says...',
    care: 'Tame me by giving me a lemon. Plant a lemon on tilled farmland to grow a baby. Babies grow in 20 loaded minutes and can be tamed too. I am a Light Friend: I stay bright in the dark and cast moving block light at my feet. Once tamed I stay put; interact with me with an empty hand and choose Follow, Stay, Work, or Go Home. Craft a Fruit Basket from three sticks in the bucket shape and interact with me while holding it to carry me along. Talk to me in chat while I am near you, or hold a book and interact!',
    tamedMsg: 'Give me a lemon fruit to tame me first. Only my owner can open my conversation.',
    plantMsg: 'A tiny fruiting sprout pokes through the soil! It will grow into a baby Lemon — one lemon tames it.',
  },
  'banana:friend': {
    name: 'Banana', color: '§6', fruit: 'banana:banana', prankster: true,
    title: (baby) => baby ? 'Little Banana' : 'Banana',
    body: (baby, label) => `Hey, it's me, your certified Bodyguard!\n${label}\n\nDon't worry. I've got your back. Plant a banana on tilled farmland to grow a minion... I mean, a baby.`,
    askTitle: 'Ask Banana', replyTitle: 'Banana says...',
    care: 'Tame me by giving me a banana. Plant a banana on tilled farmland to grow a baby. Babies grow in 20 loaded minutes and can be tamed too. I am the Prank... the Bodyguard: every so often I drop a banana peel, and monsters that step on it slip and slow for a moment. Totally on purpose. Once tamed I stay put; interact with me with an empty hand and choose Follow, Stay, Work, or Go Home. Craft a Fruit Basket from three sticks in the bucket shape and interact with me while holding it to carry me along. Talk to me in chat while I am near you, or hold a book and interact!',
    tamedMsg: 'Give me a banana fruit to tame me first. Only my owner can open my conversation.',
    plantMsg: 'A tiny fruiting sprout pokes through the soil! It will grow into a baby Banana — one banana tames it.',
  },
  'grapes:friend': {
    name: 'Grapes', color: '§a', fruit: 'grapes:grapes', sharpshooter: true,
    title: (baby) => baby ? 'Little Grapes' : 'Grapes',
    body: (baby, label) => `Hi, ready to get rowdy!\n${label}\n\nI am the Sharpshooter: I spit grape seeds at monsters. No bow, no arrow - just seeds.`,
    askTitle: 'Ask Grapes', replyTitle: 'Grapes says...',
    care: 'Tame me by giving me grapes fruit. Plant grapes fruit on tilled farmland to grow a baby. Babies grow in 20 loaded minutes and can be tamed too. I am the Sharpshooter: when I am tamed I take aim at hostile mobs within 12 blocks and spit grape seeds at them every couple of seconds. Each seed hurts, and my spits arc nicely over blocks, so stand back and enjoy the show. Monsters never hurt me - I am a friend. Once tamed I stay put; interact with me with an empty hand and choose Follow, Stay, Work, or Go Home. Craft a Fruit Basket from three sticks in the bucket shape and interact with me while holding it to carry me along. Talk to me in chat while I am near you, or hold a book and interact!',
    tamedMsg: 'Give me some grapes fruit to tame me first. Only my owner can open my conversation.',
    plantMsg: 'A tiny fruiting sprout pokes through the soil! It will grow into a baby Grapes — grapes fruit tames it.',
  },
};

const TYPES = new Set(Object.keys(FRIENDS));
const FRUIT_FRIEND = { 'plum:plum': 'plum:friend', 'apple:apple': 'apple:friend', 'blueberry:blueberry': 'blueberry:friend', 'lemon:lemon': 'lemon:friend', 'banana:banana': 'banana:friend', 'grapes:grapes': 'grapes:friend' };
const FRIEND_NAMES = { plum: 'plum:friend', apple: 'apple:friend', blueberry: 'blueberry:friend', lemon: 'lemon:friend', banana: 'banana:friend', grapes: 'grapes:friend' };

const BASKET = 'friend:fruit_basket';
const BASKET_STORE = 'basket:friend';

// A Fruit Basket carries one tamed friend as a snapshot stored on the item stack.
function basketContents(stack) {
  const raw = stack.getDynamicProperty(BASKET_STORE);
  if (!raw) return null;
  try { return JSON.parse(/** @type {string} */ (raw)); } catch { return null; }
}

// Blueberry is a Collector: his own portable chest rides on the entity as a
// serialized dynamic property (kept through the Fruit Basket snapshot too).
// The slot math lives in chest.js so it can be tested without a live world.
const CHEST_KEY = 'blueberry:chest';
const chestMax = (id) => new ItemStack(id, 1).maxAmount;

function readChest(friend) {
  return parseChest(friend.getDynamicProperty(CHEST_KEY));
}

function writeChest(friend, slots) {
  friend.setDynamicProperty(CHEST_KEY, serializeChest(slots));
}

// Spawn a raw count safely, splitting it across stacks that respect the cap.
function spawnStacks(dimension, typeId, count, where) {
  const cap = Math.max(1, chestMax(typeId));
  for (let left = count; left > 0; left -= cap) {
    try { dimension.spawnItem(new ItemStack(typeId, Math.min(left, cap)), where); } catch { return; }
  }
}

const chestNotices = new Map();

function notifyOwnerPrefixed(ownerId, prefix, text, interval = 60) {
  const now = system.currentTick;
  if (now < (chestNotices.get(ownerId) ?? 0)) return;
  chestNotices.set(ownerId, now + interval);
  const owner = world.getAllPlayers().find((player) => player.id === ownerId);
  if (!owner?.isValid) return;
  owner.onScreenDisplay.setActionBar(`${prefix}§r: ${text}`);
}

function notifyOwner(ownerId, text) {
  notifyOwnerPrefixed(ownerId, '§9Blueberry', text);
}

async function openChest(player, friend) {
  if (openForms.has(player.id)) return;
  const cfg = FRIENDS[friend.typeId];
  if (!cfg?.collector || !player.isValid || !friend.isValid) return;
  const tamed = friend.getComponent('minecraft:tameable');
  if (!tamed?.tamedToPlayerId || tamed.tamedToPlayerId !== player.id) {
    friendSay(player, cfg, 'Give me a blueberry fruit to tame me first; only my owner can open my chest.');
    return;
  }
  if (!nearOwner(player, friend)) {
    friendSay(player, cfg, cfg.tamedMsg);
    return;
  }
  openForms.add(player.id);
  try {
    while (nearOwner(player, friend)) {
      const slots = readChest(friend);
      const used = slots.filter(Boolean).length;
      const boxed = new ActionFormData().title('Blueberry\u2019s chest')
        .body(`I scoop up dropped items for you!\n\n${used} of ${CHEST_SLOTS} slots used. Store the stack in your hand, take one out, or just peek inside.`)
        .button('Store item from hand')
        .button('Take an item')
        .button('View contents')
        .button('Movement')
        .button('Back');
      const menu = await boxed.show(player);
      if (menu.canceled || menu.selection === 4 || !nearOwner(player, friend)) return;
      if (menu.selection === 0) await storeHeldItem(player, friend);
      else if (menu.selection === 1) await takeChestItem(player, friend);
      else if (menu.selection === 2) await viewChest(player, friend);
      else {
        // Release the chest lock so the Movement menu can re-acquire it.
        openForms.delete(player.id);
        await modeMenu(player, friend);
        return;
      }
    }
  } catch (error) {
    console.warn(`[Blueberry] Chest unavailable: ${error}`);
  } finally {
    openForms.delete(player.id);
  }
}

async function storeHeldItem(player, friend) {
  if (!player.isValid || !friend.isValid) return;
  const cfg = FRIENDS[friend.typeId];
  const inv = player.getComponent('minecraft:inventory')?.container;
  if (!inv) return;
  const slotIndex = player.selectedSlotIndex;
  const held = inv.getItem(slotIndex);
  if (!held) {
    friendSay(player, cfg, 'Hold an item in your hand and interact with me to store it, or tick Take an item.');
    return;
  }
  const typeId = held.typeId;
  const amount = held.amount;
  const result = chestStore(readChest(friend), typeId, amount, chestMax);
  if (result.stored <= 0) {
    friendSay(player, cfg, chestIsFull(result.slots)
      ? 'My chest is full - take something out to make room.'
      : `I could not fit ${typeId.replace(/^minecraft:/, '')}.`);
    return;
  }
  // Hand back whatever did not fit, then commit the chest. Roll the hand back
  // if the chest cannot be saved so nothing is duplicated or lost.
  const leftover = result.leftover > 0 ? new ItemStack(typeId, result.leftover) : undefined;
  try {
    inv.setItem(slotIndex, leftover);
  } catch {
    friendSay(player, cfg, 'I could not take that from your hand - try again.');
    return;
  }
  try {
    writeChest(friend, result.slots);
  } catch {
    try { inv.setItem(slotIndex, new ItemStack(typeId, amount)); } catch { /* Hand refreshes next tick. */ }
    friendSay(player, cfg, 'My chest would not open - nothing was stored.');
    return;
  }
  if (result.leftover > 0) {
    if (chestIsFull(result.slots)) friendSay(player, cfg, `Stored ${result.stored}, but my chest is now full.`);
    else friendSay(player, cfg, `Stored ${result.stored}; the rest did not fit. My chest is nearly full!`);
  } else {
    friendSay(player, cfg, `Stored ${result.stored} in my chest.`);
  }
}

async function takeChestItem(player, friend) {
  if (!player.isValid || !friend.isValid) return;
  const cfg = FRIENDS[friend.typeId];
  const items = readChest(friend).map((slot, i) => ({ slot, i })).filter((entry) => entry.slot);
  if (!items.length) {
    friendSay(player, cfg, 'My chest is empty - nothing to take.');
    return;
  }
  const list = new ActionFormData().title('Blueberry\u2019s chest')
    .body('Pick a stack to take out.');
  for (const { slot } of items) list.button(`${slot.count} \u00d7 ${slot.id.replace(/^minecraft:/, '')}`);
  list.button('Back');
  const pick = await list.show(player);
  if (pick.canceled || pick.selection === items.length || !nearOwner(player, friend)) return;
  const { i } = items[pick.selection];
  const before = readChest(friend);
  const result = chestTake(before, i);
  if (!result.taken) return;
  const stack = new ItemStack(result.taken.id, result.taken.count);
  try {
    writeChest(friend, result.slots);
  } catch {
    friendSay(player, cfg, 'My chest would not open - nothing was taken.');
    return;
  }
  const inv = player.getComponent('minecraft:inventory')?.container;
  let leftover;
  try {
    leftover = inv ? inv.addItem(stack) : stack;
  } catch {
    leftover = stack;
  }
  if (leftover && leftover.amount === result.taken.count) {
    // No room: put the stack straight back so it is never dropped or lost.
    try { writeChest(friend, before); } catch { player.dimension.spawnItem(stack, player.location); }
    friendSay(player, cfg, 'Your inventory is full - clear room first.');
    return;
  }
  if (leftover && leftover.amount > 0) player.dimension.spawnItem(leftover, player.location);
  friendSay(player, cfg, `Here you go - took ${result.taken.count} ${result.taken.id.replace(/^minecraft:/, '')} from my chest.`);
}

async function viewChest(player, friend) {
  if (!player.isValid || !friend.isValid) return;
  const slots = readChest(friend);
  const used = slots.filter(Boolean).length;
  const lines = slots.map((slot, i) => slot ? `${i + 1}. ${slot.count} \u00d7 ${slot.id.replace(/^minecraft:/, '')}` : null).filter(Boolean);
  const view = new ActionFormData().title('Blueberry\u2019s chest')
    .body(lines.length ? `${used} of ${CHEST_SLOTS} slots used:\n${lines.join('\n')}` : 'Empty! I will scoop up dropped items as we adventure.')
    .button('Back');
  await view.show(player);
}

// Collector: a tamed Blueberry vacuums nearby dropped items into his chest.
system.runInterval(() => {
  for (const name of ['overworld', 'nether', 'the_end']) {
    const dimension = world.getDimension(name);
    for (const friend of dimension.getEntities({ type: 'blueberry:friend' })) {
      try {
        if (!friend.isValid) continue;
        const tamed = friend.getComponent('minecraft:tameable');
        if (!tamed?.tamedToPlayerId) continue;
        const drops = dimension.getEntities({ type: 'minecraft:item', location: friend.location, maxDistance: 4 });
        for (const drop of drops) {
          if (!drop.isValid) continue;
          const stack = drop.getComponent('minecraft:item')?.itemStack;
          if (!stack) continue;
          const typeId = stack.typeId;
          const amount = stack.amount;
          const where = drop.location;
          // Remove the drop before storing so a failed save can never duplicate it.
          try { drop.remove(); } catch { continue; }
          let result;
          try {
            result = chestStore(readChest(friend), typeId, amount, chestMax);
            writeChest(friend, result.slots);
          } catch (error) {
            console.warn(`[Blueberry] Collector skipped: ${error}`);
            spawnStacks(dimension, typeId, amount, where);
            continue;
          }
          spawnStacks(dimension, typeId, result.leftover, where);
          if (result.stored <= 0) {
            if (chestIsFull(result.slots)) notifyOwner(tamed.tamedToPlayerId, 'My chest is full! Interact with me to empty it.');
          } else if (result.leftover > 0) {
            notifyOwner(tamed.tamedToPlayerId, `Picked up ${result.stored}, but my chest is nearly full!`);
          }
        }
      } catch (error) { console.warn(`[Blueberry] Collector skipped: ${error}`); }
    }
  }
}, 10);

const CATALOG = [
  { item: 'minecraft:diamond_pickaxe', label: 'Diamond Pickaxe', tags: ['pickaxe', 'tool', 'diamond', 'mine', 'ore'] },
  { item: 'minecraft:diamond_sword', label: 'Diamond Sword', tags: ['sword', 'weapon', 'diamond', 'fight', 'monster'] },
  { item: 'minecraft:diamond_axe', label: 'Diamond Axe', tags: ['axe', 'tool', 'wood', 'chop'] },
  { item: 'minecraft:diamond_shovel', label: 'Diamond Shovel', tags: ['shovel', 'tool', 'dig', 'dirt'] },
  { item: 'minecraft:diamond_hoe', label: 'Diamond Hoe', tags: ['hoe', 'farm', 'tool'] },
  { item: 'minecraft:iron_pickaxe', label: 'Iron Pickaxe', tags: ['pickaxe', 'tool', 'mine', 'stone', 'iron'] },
  { item: 'minecraft:flint_and_steel', label: 'Flint and Steel', tags: ['flint', 'steel', 'fire', 'portal', 'light'] },
  { item: 'minecraft:shears', label: 'Shears', tags: ['shears', 'sheep', 'wool', 'tool'] },
  { item: 'minecraft:fishing_rod', label: 'Fishing Rod', tags: ['fish', 'fishing', 'rod', 'food'] },
  { item: 'minecraft:shield', label: 'Shield', tags: ['shield', 'defense', 'protect'] },
  { item: 'minecraft:bow', label: 'Bow', tags: ['bow', 'archery', 'weapon', 'arrow'] },
  { item: 'minecraft:arrow', label: 'Arrow', tags: ['arrow', 'archery'] },
  { item: 'minecraft:torch', label: 'Torch', tags: ['torch', 'torches', 'light', 'cave'] },
  { item: 'minecraft:lantern', label: 'Lantern', tags: ['lantern', 'light'] },
  { item: 'minecraft:golden_apple', label: 'Golden Apple', tags: ['apple', 'food', 'gold', 'heal'] },
  { item: 'minecraft:cooked_beef', label: 'Cooked Beef', tags: ['food', 'beef', 'steak', 'eat'] },
  { item: 'minecraft:bread', label: 'Bread', tags: ['bread', 'food', 'wheat', 'eat'] },
  { item: 'minecraft:cake', label: 'Cake', tags: ['cake', 'food', 'dessert'] },
  { item: 'minecraft:emerald', label: 'Emerald', tags: ['emerald', 'trade', 'villager', 'gem'] },
  { item: 'minecraft:diamond', label: 'Diamond', tags: ['diamond', 'gem', 'ore'] },
  { item: 'minecraft:iron_ingot', label: 'Iron Ingot', tags: ['iron', 'ingot', 'metal'] },
  { item: 'minecraft:gold_ingot', label: 'Gold Ingot', tags: ['gold', 'ingot', 'metal'] },
  { item: 'minecraft:netherite_ingot', label: 'Netherite Ingot', tags: ['netherite', 'ingot', 'metal', 'rare'] },
  { item: 'minecraft:campfire', label: 'Campfire', tags: ['campfire', 'fire', 'cook', 'light'] },
  { item: 'minecraft:oak_planks', label: 'Oak Planks', tags: ['planks', 'wood', 'build', 'block'] },
  { item: 'minecraft:cobblestone', label: 'Cobblestone', tags: ['cobblestone', 'stone', 'build', 'block'] },
  { item: 'minecraft:glass', label: 'Glass', tags: ['glass', 'window', 'build', 'block'] },
  { item: 'minecraft:oak_door', label: 'Oak Door', tags: ['door', 'house', 'build'] },
  { item: 'minecraft:book', label: 'Book', tags: ['book', 'talk', 'chat', 'read'] },
  { item: 'minecraft:name_tag', label: 'Name Tag', tags: ['name', 'tag', 'pet'] },
  { item: 'minecraft:experience_bottle', label: 'XP Bottle', tags: ['experience', 'xp', 'level', 'bottle'] },
  { item: 'minecraft:ender_pearl', label: 'Ender Pearl', tags: ['ender', 'pearl', 'teleport'] },
  { item: 'minecraft:firework_rocket', label: 'Firework Rocket', tags: ['firework', 'rocket', 'fly', 'elytra'] },
  { item: 'minecraft:elytra', label: 'Elytra', tags: ['elytra', 'fly', 'wings', 'rare'] },
  { item: 'minecraft:water_bucket', label: 'Water Bucket', tags: ['water', 'bucket', 'liquid'] },
  { item: 'minecraft:lava_bucket', label: 'Lava Bucket', tags: ['lava', 'bucket', 'fire'] },
  { item: 'minecraft:compass', label: 'Compass', tags: ['compass', 'find', 'way', 'home'] },
  { item: 'minecraft:clock', label: 'Clock', tags: ['clock', 'time'] },
  { item: 'minecraft:spyglass', label: 'Spyglass', tags: ['spyglass', 'look', 'see'] },
  { item: 'minecraft:crossbow', label: 'Crossbow', tags: ['crossbow', 'weapon'] },
  { item: 'minecraft:trident', label: 'Trident', tags: ['trident', 'weapon', 'water'] },
  { item: 'minecraft:shulker_box', label: 'Shulker Box', tags: ['shulker', 'box', 'storage', 'carry'] },
];

const GACHA = [
  { item: 'minecraft:cobblestone', label: 'Cobblestone', weight: 5 },
  { item: 'minecraft:oak_planks', label: 'Oak Planks', weight: 5 },
  { item: 'minecraft:torch', label: 'Torch', weight: 5 },
  { item: 'minecraft:bread', label: 'Bread', weight: 5 },
  { item: 'minecraft:arrow', label: 'Arrow', weight: 5 },
  { item: 'minecraft:shears', label: 'Shears', weight: 4 },
  { item: 'minecraft:fishing_rod', label: 'Fishing Rod', weight: 4 },
  { item: 'minecraft:water_bucket', label: 'Water Bucket', weight: 4 },
  { item: 'minecraft:book', label: 'Book', weight: 4 },
  { item: 'minecraft:compass', label: 'Compass', weight: 4 },
  { item: 'minecraft:iron_pickaxe', label: 'Iron Pickaxe', weight: 3 },
  { item: 'minecraft:diamond_pickaxe', label: 'Diamond Pickaxe', weight: 2 },
  { item: 'minecraft:diamond_sword', label: 'Diamond Sword', weight: 2 },
  { item: 'minecraft:shield', label: 'Shield', weight: 3 },
  { item: 'minecraft:bow', label: 'Bow', weight: 3 },
  { item: 'minecraft:golden_apple', label: 'Golden Apple', weight: 2 },
  { item: 'minecraft:cooked_beef', label: 'Cooked Beef', weight: 3 },
  { item: 'minecraft:emerald', label: 'Emerald', weight: 3 },
  { item: 'minecraft:name_tag', label: 'Name Tag', weight: 3 },
  { item: 'minecraft:spyglass', label: 'Spyglass', weight: 3 },
  { item: 'minecraft:campfire', label: 'Campfire', weight: 3 },
  { item: 'minecraft:ender_pearl', label: 'Ender Pearl', weight: 1 },
  { item: 'minecraft:experience_bottle', label: 'XP Bottle', weight: 1 },
  { item: 'minecraft:firework_rocket', label: 'Firework Rocket', weight: 1 },
  { item: 'minecraft:netherite_ingot', label: 'Netherite Ingot', weight: 1 },
  { item: 'minecraft:trident', label: 'Trident', weight: 1 },
  { item: 'minecraft:shulker_box', label: 'Shulker Box', weight: 1 },
  { item: 'minecraft:elytra', label: 'Elytra', weight: 1 },
];

const DELIVERY_LINES = [
  'Sparks its way to you!',
  'Fresh from the Applezon warehouse!',
  'Ships in a jiffy, straight from my box-mate!',
  'Tucked into a cupcake box with extra care!',
  'Now arriving at your doorstep (well, your feet)!',
];

function friendSay(player, cfg, text) {
  if (player.isValid) player.sendMessage(`${cfg.color}${cfg.name}§r: ${text}`);
}

function chatReply(cfg, text) {
  world.sendMessage(`${cfg.color}${cfg.name}§r: ${text}`);
}

// The tamed friend of the given type nearest to the player (only those count for chat).
function nearestTamed(friendType, player) {
  return player.dimension.getEntities({ type: friendType, location: player.location, maxDistance: 10 })
    .find((friend) => friend.getComponent('minecraft:tameable')?.tamedToPlayerId === player.id);
}

function nearOwner(player, friend) {
  return player.isValid && friend.isValid && friend.dimension.id === player.dimension.id
    && distance(player.location, friend.location) <= 10
    && friend.getComponent('minecraft:tameable')?.tamedToPlayerId === player.id;
}

// ---- Universal movement states: FOLLOW / STAY / WORK / HOME ----
// Every tamed friend lives in exactly one movement mode, persisted as the
// `friend:mode` dynamic property (friend_state.js). Component-group state on the
// entity is driven from that mode through the universal friend:mode_* events.
// A friend in BASKET mode is not a world entity at all (it lives in a Fruit Basket
// item snapshot), so it never reaches this code.

function friendDisplayName(friend, cfg) {
  return friend.nameTag || cfg.name;
}

// Count how many of this owner's friends are actually in FOLLOW mode right now,
// scanning all dimensions and fruit types. No fragile counter is maintained: the
// real per-friend state is authoritative, so changing one friend away from FOLLOW
// frees its slot immediately.
function countFollowing(ownerId) {
  let count = 0;
  for (const dimName of DIMENSIONS) {
    const dimension = world.getDimension(dimName);
    for (const type of TYPES) {
      for (const friend of dimension.getEntities({ type })) {
        try {
          if (friend.getComponent('minecraft:tameable')?.tamedToPlayerId !== ownerId) continue;
          if (readMode(friend) === MODE.FOLLOW) count += 1;
        } catch { /* a stale or unloaded entity is skipped */ }
      }
    }
  }
  return count;
}

// HOME is the owner's bed. Player.getSpawnPoint() is the personal respawn point
// (a slept-in bed / respawn anchor). There is no world-default reader we want to
// fall back to: an owner who has not slept in a bed yet has no home, so the
// friend stays where it is until one is set.
function resolveHomeAnchor(owner) {
  try {
    const spawn = owner?.isValid ? owner.getSpawnPoint?.() : undefined;
    if (spawn?.dimension && spawn?.location) {
      const where = spawn.location;
      if (Number.isFinite(where.x) && Number.isFinite(where.y) && Number.isFinite(where.z)) {
        return { x: where.x, y: where.y, z: where.z, dim: spawn.dimension.id };
      }
    }
  } catch { /* no personal respawn point recorded */ }
  return null;
}

const WALKABLE_FLOORS = /^(minecraft:)(stone|dirt|grass_block|grass|cobblestone|deepslate|netherrack|end_stone|sand|gravel|.*_planks)$/;

function isWalkableSpot(dimension, spot) {
  try {
    const floor = dimension.getBlock({ ...spot, y: spot.y - 1 });
    const feet = dimension.getBlock(spot);
    const head = dimension.getBlock({ ...spot, y: spot.y + 1 });
    return !!floor && !!feet?.isAir && !!head?.isAir && WALKABLE_FLOORS.test(floor.typeId);
  } catch { return false; }
}

// A safe place to stand near `base`. base.y === null (the 32767 default-spawn
// sentinel) means "near the surface at this X/Z", so scan downward for ground.
function findSafeSpot(dimension, base) {
  const x = Math.floor(base.x) + 0.5;
  const z = Math.floor(base.z) + 0.5;
  const knownY = base.y != null && Number.isFinite(base.y);
  const startY = knownY ? Math.floor(base.y) : 200;
  const candidates = [];
  if (knownY) {
    for (const dy of [0, -1, 1]) candidates.push({ x, y: startY + dy, z });
  } else {
    for (let scanY = 200; scanY >= 0; scanY--) candidates.push({ x, y: scanY, z });
  }
  for (const [dx, dz] of [[0, 0], [2, 0], [-2, 0], [0, 2], [0, -2], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
    candidates.push({ x: x + dx, y: (knownY ? startY : 64) + 1, z: z + dz });
  }
  for (const spot of candidates) {
    if (isWalkableSpot(dimension, spot)) return spot;
  }
  return { x, y: (knownY ? startY : 64) + 1, z };
}

function teleportFriendTo(friend, anchor) {
  try {
    const dimension = world.getDimension(anchor.dim) ?? friend.dimension;
    const spot = findSafeSpot(dimension, anchor);
    friend.tryTeleport(spot, { dimension, checkForBlocks: false });
  } catch { /* a boundary/chunk edge can reject the move; retried on the next upkeep tick */ }
}

// Re-apply the component groups that match a mode. Triggered on state changes and
// once per entity per script run (seenMode), so modes survive world reloads even if
// dynamically-added component groups did not.
const seenMode = new Map();
function syncModeGroups(friend, mode) {
  if (seenMode.get(friend.id) === mode) return;
  seenMode.set(friend.id, mode);
  if (mode === MODE.STAY) { try { friend.triggerEvent('friend:mode_stay'); } catch { /* reconciled later */ } }
  else if (mode === MODE.FOLLOW) { try { friend.triggerEvent('friend:mode_follow'); } catch { /* reconciled later */ } }
}

// Bring an anchored friend back inside its allowed radius. "Return" uses small
// safe hops toward a point just inside the radius; badly stuck or too-far friends
// are teleported straight back to the anchor. Never searches the wider world.
const returnStuck = new Map();
function enforceRadius(friend, anchor, radius, tooFar) {
  if (friend.dimension.id !== anchor.dim) {
    teleportFriendTo(friend, anchor);
    return;
  }
  const plan = returnPlan(friend.location, { x: anchor.x, y: anchor.y ?? friend.location.y, z: anchor.z }, radius, tooFar);
  if (plan.action === 'none') { returnStuck.delete(friend.id); return; }
  const info = returnStuck.get(friend.id) ?? { fails: 0, last: JSON.stringify(friend.location) };
  if (plan.action === 'nudge') info.fails = JSON.stringify(friend.location) === info.last ? info.fails + 1 : 0;
  info.last = JSON.stringify(friend.location);
  if (plan.action === 'teleport' || info.fails >= 2) {
    returnStuck.delete(friend.id);
    teleportFriendTo(friend, anchor);
  } else {
    returnStuck.set(friend.id, info);
    teleportFriendTo(friend, { ...plan.target, dim: anchor.dim });
  }
}

// The single entry point for every mode change. Enforces the per-owner FOLLOW cap
// using the friends' real state, frees FOLLOW slots by replacing the mode, and
// answers the owner with short feedback that prefers the custom name.
function setFriendMode(player, friend, mode) {
  if (!player.isValid || !friend.isValid) return false;
  const cfg = FRIENDS[friend.typeId];
  if (!cfg) return false;
  if (!nearOwner(player, friend)) {
    friendSay(player, cfg, cfg.tamedMsg);
    return false;
  }
  const tamed = friend.getComponent('minecraft:tameable');
  const ownerId = tamed?.tamedToPlayerId;
  if (!ownerId || ownerId !== player.id) {
    friendSay(player, cfg, 'Only my owner can tell me what to do.');
    return false;
  }
  const name = friendDisplayName(friend, cfg);
  if (mode === MODE.FOLLOW && readMode(friend) !== MODE.FOLLOW && countFollowing(ownerId) >= MAX_FOLLOWING_FRIENDS) {
    friendSay(player, cfg, `Your Fruity Friend party is full! You can have up to ${MAX_FOLLOWING_FRIENDS} friends following you. Set one to Stay or Work, send one Home, or put one in a Fruit Basket first.`);
    return false;
  }
  try {
    if (mode === MODE.STAY) {
      friend.triggerEvent('friend:mode_stay');
    } else if (mode === MODE.FOLLOW) {
      friend.triggerEvent('friend:mode_follow');
    } else if (mode === MODE.WORK) {
      setWorkAnchor(friend, { x: friend.location.x, y: friend.location.y, z: friend.location.z, dim: friend.dimension.id });
      friend.triggerEvent('friend:mode_work');
    } else if (mode === MODE.HOME) {
      const home = resolveHomeAnchor(player);
      if (!home) {
        friendSay(player, cfg, 'I could not find a home to go to. Sleep in a bed (or set a respawn point) and try again.');
        return false;
      }
      friend.triggerEvent('friend:mode_home');
      teleportFriendTo(friend, home);
    }
    setMode(friend, mode);
  } catch { /* a just-spawned friend can briefly reject state changes; the upkeep tick reconciles it */ }
  const feedback = {
    [MODE.FOLLOW]: `${name} is following you.`,
    [MODE.STAY]: `${name} will stay here.`,
    [MODE.WORK]: `${name} is working around this area.`,
    [MODE.HOME]: `${name} is going home.`,
  }[mode];
  if (feedback) friendSay(player, cfg, feedback);
  return true;
}

// Interaction menu: Follow, Stay, Work, Go Home. The only way an owner changes a
// friend's movement state (Blueberry reaches it from inside his chest menu too).
async function modeMenu(player, friend) {
  if (openForms.has(player.id)) return;
  const cfg = FRIENDS[friend.typeId];
  if (!cfg) return;
  if (!nearOwner(player, friend)) {
    friendSay(player, cfg, cfg.tamedMsg);
    return;
  }
  const tamed = friend.getComponent('minecraft:tameable');
  if (!tamed?.tamedToPlayerId || tamed.tamedToPlayerId !== player.id) {
    friendSay(player, cfg, 'Give me my fruit to tame me first; only my owner can change what I do.');
    return;
  }
  openForms.add(player.id);
  try {
    const name = friendDisplayName(friend, cfg);
    const mode = readMode(friend) ?? defaultMode(friend.hasComponent('minecraft:is_sitting'));
    const party = countFollowing(tamed.tamedToPlayerId);
    const menu = await new ActionFormData()
      .title(`${name} \u00b7 Movement`)
      .body(`I am currently ${describeMode(mode)}.\n\nChoose what you want me to do. Up to ${MAX_FOLLOWING_FRIENDS} friends may follow you (${party} following now). Hold a Fruit Basket and interact with me to carry me around instead.`)
      .button('Follow')
      .button('Stay')
      .button('Work')
      .button('Go Home')
      .button('Goodbye')
      .show(player);
    if (menu.canceled || menu.selection === 4 || !nearOwner(player, friend)) return;
    setFriendMode(player, friend, [MODE.FOLLOW, MODE.STAY, MODE.WORK, MODE.HOME][menu.selection]);
  } finally {
    openForms.delete(player.id);
  }
}

// Tuck a tamed friend into the Fruit Basket held in the main hand.
function captureInBasket(player, friend) {
  if (!player.isValid || !friend.isValid) return;
  const cfg = FRIENDS[friend.typeId];
  if (!cfg) return;
  const tamed = friend.getComponent('minecraft:tameable');
  if (!tamed?.tamedToPlayerId || tamed.tamedToPlayerId !== player.id) {
    friendSay(player, cfg, 'Give me my fruit to tame me first; only my owner can put me in a basket.');
    return;
  }
  const inv = player.getComponent('minecraft:inventory')?.container;
  if (!inv) return;
  const slot = player.selectedSlotIndex;
  const held = inv.getItem(slot);
  if (!held || held.typeId !== BASKET || basketContents(held)) return;
  const snapshot = JSON.stringify({
    type: friend.typeId,
    name: friend.nameTag || '',
    baby: friend.hasComponent('minecraft:is_baby'),
    sitting: friend.hasComponent('minecraft:is_sitting'),
    owner: player.id,
    chest: cfg.collector ? readChest(friend) : undefined,
  });
  const filled = new ItemStack(BASKET, 1);
  filled.setDynamicProperty(BASKET_STORE, snapshot);
  filled.setLore([`Holding a tamed ${cfg.name}${friend.nameTag ? ` named ${friend.nameTag}` : ''}. Interact with a block to let them out.`]);
  try {
    if (held.amount > 1) {
      held.amount--;
      inv.setItem(slot, held);
      const leftover = inv.addItem(filled);
      if (leftover && leftover.amount > 0) player.dimension.spawnItem(leftover, player.location);
    } else {
      inv.setItem(slot, filled);
    }
  } catch {
    friendSay(player, cfg, 'I could not climb in - free up a hand slot first.');
    return;
  }
  try { friend.remove(); } catch { /* The friend is already gone; the snapshot is stored anyway. */ }
  friendSay(player, cfg, 'Off we go! I am tucked into your basket now. Interact with a block to let me out.');
}

// Let a carried friend out onto the block the player is pointing at.
function releaseFromBasket(player, block, blockFace) {
  if (!player.isValid) return;
  const inv = player.getComponent('minecraft:inventory')?.container;
  if (!inv) return;
  const slot = player.selectedSlotIndex;
  const held = inv.getItem(slot);
  if (!held || held.typeId !== BASKET) return;
  const contents = basketContents(held);
  const cfg = contents && FRIENDS[contents.type];
  if (!cfg) return; // an empty basket does nothing on a block
  if (contents.owner && contents.owner !== player.id) {
    friendSay(player, cfg, 'Only my owner can let me out of this basket.');
    return;
  }
  const offsets = { up: [0, 1, 0], down: [0, -1, 0], north: [0, 0, -1], south: [0, 0, 1], east: [1, 0, 0], west: [-1, 0, 0] };
  const [dx, dy, dz] = offsets[blockFace] ?? [0, 1, 0];
  let friend;
  try {
    friend = block.dimension.spawnEntity(contents.type, { x: block.x + 0.5 + dx, y: block.y + 0.5 + dy, z: block.z + 0.5 + dz });
  } catch {
    friendSay(player, cfg, 'There is no room for me there. Try pointing at open ground.');
    return;
  }
  try {
    if (contents.name) friend.nameTag = contents.name;
    friend.triggerEvent(contents.baby ? 'minecraft:entity_born' : 'minecraft:entity_spawned');
    if (contents.chest) writeChest(friend, parseChest(JSON.stringify(contents.chest)));
    try { friend.getComponent('minecraft:tameable')?.tame(player); } catch { /* Already owned by the snapshot's owner. */ }
    // Out of the basket ALWAYS means STAY — never an old Follow/Work/Home mode that
    // would make the friend run off. The owner explicitly picks a mode next.
    friend.triggerEvent('friend:mode_stay');
    setMode(friend, MODE.STAY);
  } catch { /* A just-spawned friend can briefly reject state changes; it still lands fine. */ }
  try {
    inv.setItem(slot, new ItemStack(BASKET, 1));
  } catch { /* The basket returns to the player's hand slot on the next successful release. */ }
  const name = friendDisplayName(friend, cfg);
  friendSay(player, cfg, `${name} is staying right here until you tell me what to do. Interact with me to Follow, Work, or Go Home.`);
}

function hasFruit(player, fruit) {
  const inv = player.getComponent('minecraft:inventory')?.container;
  if (!inv) return false;
  for (let slot = 0; slot < inv.size; slot++) {
    if (inv.getItem(slot)?.typeId === fruit) return true;
  }
  return false;
}

function payFruit(player, fruit) {
  const inv = player.getComponent('minecraft:inventory')?.container;
  if (!inv) return false;
  for (let slot = 0; slot < inv.size; slot++) {
    const stack = inv.getItem(slot);
    if (stack?.typeId !== fruit) continue;
    if (stack.amount > 1) {
      stack.amount--;
      inv.setItem(slot, stack);
    } else inv.setItem(slot, undefined);
    return true;
  }
  return false;
}

function deliver(player, item, label) {
  const inv = player.getComponent('minecraft:inventory')?.container;
  let leftover = undefined;
  try {
    leftover = inv ? inv.addItem(new ItemStack(item)) : new ItemStack(item);
  } catch {
    leftover = new ItemStack(item);
  }
  if (leftover && leftover.amount > 0) player.dimension.spawnItem(leftover, player.location);
  return label;
}

function randomRecommendation() {
  const total = GACHA.reduce((sum, entry) => sum + entry.weight, 0);
  let roll = Math.floor(Math.random() * total);
  for (const entry of GACHA) {
    roll -= entry.weight;
    if (roll < 0) return entry;
  }
  return GACHA[0];
}

function searchCatalog(query) {
  const tokens = cleanText(query).toLowerCase().split(/[^a-z0-9]+/).filter(Boolean).slice(0, 4);
  if (!tokens.length) return [];
  return CATALOG.filter(({ label, tags }) => tokens.every(token =>
    label.toLowerCase().split(/[^a-z0-9]+/).some(word => word.includes(token))
    || tags.some(tag => tag.includes(token) || token.includes(tag))));
}

async function shop(player, friend) {
  const cfg = FRIENDS[friend.typeId];
  if (openForms.has(player.id)) return;
  openForms.add(player.id);
  try {
    while (nearOwner(player, friend)) {
      if (!hasFruit(player, cfg.fruit)) {
        friendSay(player, cfg, 'One Applezon delivery costs one apple fruit. Grab an apple from a tree or my inventory.');
        return;
      }
      const menu = await new ActionFormData().title('Applezon')
        .body('Welcome to Applezon, the one-cube shop!\n\nOne apple fruit pays for one delivery.')
        .button('What does Apple recommend?').button('Search the catalog').button('Back').show(player);
      if (menu.canceled || menu.selection === 2 || !nearOwner(player, friend)) return;
      if (menu.selection === 0) {
        if (!payFruit(player, cfg.fruit)) return;
        const entry = randomRecommendation();
        deliver(player, entry.item, entry.label);
        friendSay(player, cfg, `Apple recommends ${entry.label}! ${DELIVERY_LINES[Math.floor(Math.random() * DELIVERY_LINES.length)]}`);
        return;
      }
      const form = await new ModalFormData().title('Search Applezon')
        .textField('What are you looking for? (for example: pickaxe, torches, cake)', 'pickaxe').submitButton('Search').show(player);
      if (form.canceled || !nearOwner(player, friend)) continue;
      const query = cleanText(form.formValues?.[0]);
      if (!query) continue;
      const matches = searchCatalog(query);
      if (!matches.length) {
        friendSay(player, cfg, `No results for "${query}". Try things like pickaxe, torches, bed, diamond, sword, or cake.`);
        continue;
      }
      if (matches.length > 6) {
        friendSay(player, cfg, `${matches.length} results in Applezon - make your search more specific.`);
        continue;
      }
      let pick;
      if (matches.length === 1) {
        pick = 0;
      } else {
        const list = new ActionFormData().title('Applezon results').body('One apple pays for one delivery. Pick your item.');
        for (const entry of matches) list.button(entry.label);
        list.button('Cancel');
        const chosen = await list.show(player);
        if (chosen.canceled || chosen.selection === matches.length || !nearOwner(player, friend)) continue;
        pick = chosen.selection;
      }
      if (!payFruit(player, cfg.fruit)) return;
      const entry = matches[pick];
      deliver(player, entry.item, entry.label);
      friendSay(player, cfg, `${entry.label} is on its way! ${DELIVERY_LINES[Math.floor(Math.random() * DELIVERY_LINES.length)]}`);
      return;
    }
  } catch (error) {
    console.warn(`[Apple] Applezon unavailable: ${error}`);
  } finally {
    openForms.delete(player.id);
  }
}

async function talk(player, friend) {
  if (openForms.has(player.id)) return;
  const cfg = FRIENDS[friend.typeId];
  if (!cfg) return;
  if (!nearOwner(player, friend)) {
    friendSay(player, cfg, cfg.tamedMsg);
    return;
  }
  openForms.add(player.id);
  try {
    const baby = friend.hasComponent('minecraft:is_baby');
    const action = new ActionFormData().title(cfg.title(baby)).body(cfg.body(baby, chatLabelFor(cfg.name.toLowerCase())));
    const jobButton = cfg.shop ? 'Shop at Applezon' : cfg.collector ? 'Open my chest' : undefined;
    action.button('Ask a question');
    if (jobButton) action.button(jobButton);
    action.button('How do I care for you?');
    action.button('Goodbye');
    const menu = await action.show(player);
    const goodbye = jobButton ? 3 : 2;
    if (menu.canceled || menu.selection === goodbye || !nearOwner(player, friend)) return;
    if (jobButton && menu.selection === 1) {
      // Release the talk lock before entering the job's own loop so it can re-acquire the lock.
      openForms.delete(player.id);
      if (cfg.shop) await shop(player, friend);
      else await openChest(player, friend);
      return;
    }
    if (menu.selection === (jobButton ? 2 : 1)) {
      friendSay(player, cfg, cfg.care);
      return;
    }
    let again = true;
    while (again && nearOwner(player, friend)) {
      const form = await new ModalFormData().title(cfg.askTitle)
        .textField('Your question (up to 400 characters)', 'How do I make a bed?').submitButton('Ask').show(player);
      if (form.canceled || !nearOwner(player, friend)) return;
      const question = cleanText(form.formValues?.[0]);
      if (!question) return;
      if (system.currentTick < (nextQuestion.get(player.id) ?? 0)) {
        friendSay(player, cfg, 'Give me a few seconds to think before another question.');
        return;
      }
      nextQuestion.set(player.id, system.currentTick + 100);
      friendSay(player, cfg, 'Thinking...');
      const answer = cleanText(await answerQuestion(question, {
        playerId: player.id,
        dimension: player.dimension.id,
        baby,
        friend: cfg.name.toLowerCase(),
      }), 1400);
      if (!player.isValid) return;
      friendSay(player, cfg, answer);
      const response = await new ActionFormData().title(cfg.replyTitle).body(answer)
        .button('Ask another question').button('Back to adventuring').show(player);
      again = !response.canceled && response.selection === 0;
    }
  } catch (error) {
    console.warn(`[${cfg.name}] Conversation unavailable: ${error}`);
    friendSay(player, cfg, 'I could not open that conversation. Close other menus and interact with me again.');
  } finally {
    openForms.delete(player.id);
  }
}

// Persist Stay as part of the tame transaction. Without this, the upkeep pass can
// see the new owner before the entity's sit group is visible, migrate the friend as
// a legacy follower, and bypass the follower limit.
world.afterEvents.dataDrivenEntityTrigger.subscribe(({ entity, eventId }) => {
  if (eventId !== 'minecraft:on_tame' || !TYPES.has(entity.typeId)) return;
  try {
    setMode(entity, MODE.STAY);
    seenMode.delete(entity.id);
    entity.triggerEvent('friend:mode_stay');
  } catch (error) {
    console.warn(`[Movement] Could not initialize a newly tamed friend in Stay: ${error}`);
  }
}, { entityTypes: [...TYPES], eventTypes: ['minecraft:on_tame'] });

world.beforeEvents.playerInteractWithEntity.subscribe((event) => {
  const { player, target, itemStack } = event;
  if (!TYPES.has(target.typeId)) return;
  // A Fruit Basket tucks a tamed friend away for carrying.
  if (itemStack && itemStack.typeId === BASKET) {
    event.cancel = true;
    system.run(() => { void captureInBasket(player, target); });
    return;
  }
  // Empty hand: Blueberry opens his portable chest; everyone else gets the Movement menu
  // (Follow, Stay, Work, Go Home).
  if (!itemStack || itemStack.typeId === 'minecraft:air') {
    event.cancel = true;
    if (FRIENDS[target.typeId]?.collector) system.run(() => { void openChest(player, target); });
    else system.run(() => { void modeMenu(player, target); });
    return;
  }
  // Leave food, taming, name tags and leads to the engine. A book also gives touch players a Talk button.
  if (itemStack.typeId !== 'minecraft:book') return;
  event.cancel = true;
  system.run(() => { void talk(player, target); });
});

// Pointing a basket full of a friend at any block lets them out again.
world.afterEvents.playerInteractWithBlock.subscribe(({ player, block, blockFace, beforeItemStack }) => {
  if (!beforeItemStack || beforeItemStack.typeId !== BASKET) return;
  system.run(() => { void releaseFromBasket(player, block, blockFace); });
});

world.afterEvents.playerLeave.subscribe(({ playerId }) => {
  openForms.delete(playerId);
  nextQuestion.delete(playerId);
});

// Talk to a nearby tamed friend straight from chat: "Plum ...", "hey Apple, ...", "@plum hi", etc.
// chatSend is a pre-release API: an engine exposes it only when the world's "Beta APIs"
// experiment is on (it is never part of the plain stable surface). Listen on whichever
// signal exists; the book stays as an always-available fallback.
function onFriendChat(event) {
  // The friend's name must lead the message, optionally after a greeting like hey/hi/hello.
  const match = event.message.match(/^\s*(?:(hey|hi|hello)[,!\s]+@?([a-zA-Z]+)\b|@?([a-zA-Z]+))\s*[:,]?\s*(.*)$/i);
  const name = match && (match[2] || match[3]);
  const friendType = name && FRIEND_NAMES[name.toLowerCase()];
  if (!friendType) return;
  const player = event.sender;
  if (!player?.isValid) return;
  const question = cleanText(match[4] || 'hi');
  // Defer to the next tick: lookups and replies run in read-write mode, never the read-only before scope.
  // The player's message is not cancelled, so it broadcasts normally and the friend answers after it.
  system.run(() => {
    try {
      if (!player.isValid) return;
      const friend = nearestTamed(friendType, player);
      if (!friend) return; // no tamed friend within range; message already went out as normal chat
      const cfg = FRIENDS[friendType];
      if (system.currentTick < (nextQuestion.get(player.id) ?? 0)) {
        chatReply(cfg, 'Give me a few seconds to think before another question.');
        return;
      }
      nextQuestion.set(player.id, system.currentTick + 100);
      chatReply(cfg, 'Thinking...');
      const baby = friend.hasComponent('minecraft:is_baby');
      answerQuestion(question, {
        playerId: player.id,
        dimension: player.dimension.id,
        baby,
        friend: cfg.name.toLowerCase(),
      }).then((answer) => {
        if (player.isValid) chatReply(cfg, cleanText(answer, 1400));
      }).catch((error) => {
        console.warn(`[${cfg.name}] Chat answer failed: ${error}`);
        if (player.isValid) chatReply(cfg, 'I had trouble answering that - try again!');
      });
    } catch (error) {
      console.warn(`[Friend chat] Reply failed: ${error}`);
    }
  });
}

const beforeWorld = /** @type {any} */ (world.beforeEvents);
const afterWorld = /** @type {any} */ (world.afterEvents);
const chatSources = [
  beforeWorld?.chatSend?.subscribe && { name: 'beforeEvents.chatSend', subscribe: () => beforeWorld.chatSend.subscribe(onFriendChat) },
  afterWorld?.chatSend?.subscribe && { name: 'afterEvents.chatSend', subscribe: () => afterWorld.chatSend.subscribe(onFriendChat) },
].filter(Boolean);
if (chatSources.length === 0) {
  console.warn('[Chat] No chatSend signal is exposed. Enable the "Beta APIs" experiment on the world to let friends answer in chat; holding a Book and interacting with a friend always works.');
} else {
  for (const source of chatSources) {
    try {
      source.subscribe();
      console.info(`[Chat] Listening for friends on ${source.name}.`);
    } catch (error) {
      console.warn(`[Chat] Could not subscribe to ${source.name}: ${error}`);
    }
  }
}

// Planting a fruit is vanilla block placement now (minecraft:block_placer places
// the friend sprout on farmland). Just add a friendly confirmation when it lands.
world.afterEvents.playerInteractWithBlock.subscribe(({ player, block, beforeItemStack }) => {
  const friendType = FRUIT_FRIEND[beforeItemStack?.typeId];
  if (!friendType) return;
  if (block.typeId !== 'minecraft:farmland') return;
  if (!(player instanceof Player)) return;
  friendSay(player, FRIENDS[friendType], FRIENDS[friendType].plantMsg);
});

// Friends reject ordinary damage: restore full health the instant a hit lands.
world.afterEvents.entityHurt.subscribe(({ hurtEntity }) => {
  if (!TYPES.has(hurtEntity.typeId)) return;
  try {
    hurtEntity.getComponent('minecraft:health')?.resetToMaxValue();
  } catch { /* The event fires for hits that finish the entity in the same tick. */ }
});

// One healing effect per Plum owner, regardless of how many friends they tame. Apple never heals.
system.runInterval(() => {
  for (const player of world.getAllPlayers()) {
    try {
      const friends = player.dimension.getEntities({ type: 'plum:friend', location: player.location, maxDistance: 8 });
      if (friends.some(friend => friend.getComponent('minecraft:tameable')?.tamedToPlayerId === player.id)) {
        player.addEffect('regeneration', 120, { amplifier: 0, showParticles: false });
      }
    } catch (error) { console.warn(`[Plum] Healing update skipped: ${error}`); }
  }
}, 100);

// Lemon is the Light Friend: he drops a real block light at his feet and swaps
// the previous one away, the closest Bedrock gets to moving light from an entity.
// Every placed block is tracked per friend so removal only ever touches our own
// block (never one a player placed), and entityRemove cleans up the moment a
// Lemon despawns or is tucked into a Fruit Basket. The light updates each pass
// the Lemon actually moves to a new block; a stationary Lemon does not flicker.
const LEMON_LIGHT_LEVEL = 15;
const LEMON_LIGHT_INTERVAL = 10; // ticks between light moves (~0.5s)
const lemonLights = new Map(); // friend.id -> { dimension, x, y, z } cell the light lives in
const LEMON_AIR_PERMUTATION = BlockPermutation.resolve('minecraft:air');

// Removes Lemon's tracked light cell. Returns true once the cell is confirmed
// clear (or was never tracked), and false when the cell could not be verified
// yet (unloaded chunk or the block refused to change). The caller keeps the
// record and retries next pass so a light never gets ghosted permanently.
function clearLemonLight(friendId) {
  const light = lemonLights.get(friendId);
  if (!light) return true;
  let block;
  try {
    block = world.getDimension(light.dimension).getBlock({ x: light.x, y: light.y, z: light.z });
  } catch (error) {
    console.warn(`[Lemon] Could not reach a light block: ${error}`);
    return false;
  }
  if (!block) return false; // chunk not loaded yet - retry next pass
  if (block.typeId !== 'minecraft:light_block') {
    lemonLights.delete(friendId);
    return true; // already clear
  }
  try {
    block.setPermutation(LEMON_AIR_PERMUTATION);
  } catch (error) {
    console.warn(`[Lemon] Could not remove a light block: ${error}`);
    return false;
  }
  const now = world.getDimension(light.dimension).getBlock({ x: light.x, y: light.y, z: light.z });
  if (!now || now.typeId !== 'minecraft:light_block') {
    lemonLights.delete(friendId);
    return true;
  }
  console.warn('[Lemon] A light block refused to clear; will retry');
  return false;
}

system.runInterval(() => {
  for (const name of ['overworld', 'nether', 'the_end']) {
    const dimension = world.getDimension(name);
    for (const friend of dimension.getEntities({ type: 'lemon:friend' })) {
      try {
        if (!friend.isValid) continue;
        if (!friend.getComponent('minecraft:tameable')?.tamedToPlayerId) continue;
        const where = { x: Math.floor(friend.location.x), y: Math.floor(friend.location.y), z: Math.floor(friend.location.z) };
        const previous = lemonLights.get(friend.id);
        if (previous && previous.dimension === name
            && previous.x === where.x && previous.y === where.y && previous.z === where.z) continue;
        if (!clearLemonLight(friend.id)) continue;
        const block = dimension.getBlock(where);
        if (!block || (block.typeId !== 'minecraft:air' && block.typeId !== 'minecraft:light_block')) continue;
        block.setPermutation(BlockPermutation.resolve('minecraft:light_block', { block_light_level: LEMON_LIGHT_LEVEL }));
        lemonLights.set(friend.id, { dimension: name, ...where });
      } catch (error) { console.warn(`[Lemon] Light core skipped: ${error}`); }
    }
  }
}, LEMON_LIGHT_INTERVAL);

world.afterEvents.entityRemove.subscribe(({ removedEntityId }) => {
  if (removedEntityId && lemonLights.has(removedEntityId)) clearLemonLight(removedEntityId);
});

// Banana is the Prankster: a tamed Banana is convinced he is your bodyguard.
// About every 30 seconds he cheerfully drops a banana peel trap. It cannot be
// picked up, trips the first hostile mob that steps close, and expires after two minutes.
const PEEL_ENTITY = 'banana:peel_trap';
const PEEL_INTERVAL = 600; // 30 seconds, plus small jitter per drop
const PEEL_TRIGGER_RADIUS = 0.9;
const PEEL_LINES = [
  'Don\'t worry. I\'ve got your back.',
  'I a-peel to the monsters: stay off the floor.',
  'Every hero has a plan. Mine is banana-related.',
  'You can thank me later. Everyone slips up sometimes.',
];
const peelSchedule = new Map();

system.runInterval(() => {
  for (const name of ['overworld', 'nether', 'the_end']) {
    const dimension = world.getDimension(name);
    for (const friend of dimension.getEntities({ type: 'banana:friend' })) {
      try {
        if (!friend.isValid) continue;
        const tamed = friend.getComponent('minecraft:tameable');
        const ownerId = tamed?.tamedToPlayerId;
        if (!ownerId) continue;
        const now = system.currentTick;
        const next = peelSchedule.get(friend.id) ?? 0;
        if (now < next) continue;
        peelSchedule.set(friend.id, now + PEEL_INTERVAL + Math.floor(Math.random() * 80));
        dimension.spawnEntity(PEEL_ENTITY, { x: friend.location.x, y: friend.location.y + 0.1, z: friend.location.z });
        notifyOwnerPrefixed(ownerId, '§6Banana', PEEL_LINES[Math.floor(Math.random() * PEEL_LINES.length)], 280);
      } catch (error) { console.warn(`[Banana] Prank upkeep skipped: ${error}`); }
    }
  }
}, 20);

system.runInterval(() => {
  for (const name of ['overworld', 'nether', 'the_end']) {
    const dimension = world.getDimension(name);
    for (const peel of dimension.getEntities({ type: PEEL_ENTITY })) {
      try {
        if (!peel.isValid) continue;
        const hostile = dimension.getEntities({ families: ['monster'], location: peel.location, maxDistance: PEEL_TRIGGER_RADIUS })[0];
        if (!hostile?.isValid) continue;
        hostile.addEffect('slowness', 100, { amplifier: 2, showParticles: false });
        hostile.applyImpulse({
          x: (hostile.location.x - peel.location.x) * 0.35,
          y: 0.12,
          z: (hostile.location.z - peel.location.z) * 0.35,
        });
        peel.remove();
      } catch (error) { console.warn(`[Banana] Peel trap skipped: ${error}`); }
    }
  }
}, 2);

// Grapes is the Sharpshooter: a tamed Grapes stands his ground (any movement
// mode) and spits a grape seed at the nearest hostile mob within GRAPE_RANGE
// every couple of seconds. The seed is a real physics projectile launched along
// the ballistic arc computed in seed.js, so every visible spit actually flies
// and lands where you see it land. Damage is applied when the seed connects.
const grapesSchedule = new Map(); // friend.id -> tick it may shoot again

system.runInterval(() => {
  for (const name of ['overworld', 'nether', 'the_end']) {
    const dimension = world.getDimension(name);
    for (const friend of dimension.getEntities({ type: 'grapes:friend' })) {
      try {
        if (!friend.isValid) continue;
        if (!friend.getComponent('minecraft:tameable')?.tamedToPlayerId) continue;
        const now = system.currentTick;
        if (now < (grapesSchedule.get(friend.id) ?? 0)) continue;
        const hostiles = dimension.getEntities({ families: [GRAPE_MONSTER_FAMILY], location: friend.location, maxDistance: GRAPE_RANGE });
        if (!hostiles.length) continue;
        const hostile = hostiles
          .filter(target => target.isValid)
          .sort((a, b) => distance(a.location, friend.location) - distance(b.location, friend.location))[0];
        if (!hostile) continue;
        const from = { x: friend.location.x, y: friend.location.y + GRAPE_MOUTH_HEIGHT, z: friend.location.z };
        const to = { x: hostile.location.x, y: hostile.location.y + 0.95, z: hostile.location.z };
        const seed = dimension.spawnEntity(GRAPE_SEED_ENTITY, from);
        const projectile = seed.getComponent('minecraft:projectile');
        if (projectile) projectile.shoot(seedVelocity(from, to), { uncertainty: 0.05 });
        grapesSchedule.set(friend.id, now + GRAPE_COOLDOWN);
      } catch (error) { console.warn(`[Grapes] Sharpshooter skipped: ${error}`); }
    }
  }
}, 10);

// Seeds that land on a hostile mob deal Grapes' damage to it; seeds that hit a
// block or expire just vanish (remove_on_hit + the entity timer handle it). A
// grazing seed that clips a friend does nothing - friends are damage-immune.
world.afterEvents.projectileHitEntity.subscribe((event) => {
  try {
    if (event.projectile?.typeId !== GRAPE_SEED_ENTITY) return;
    const victim = event.getEntityHit()?.entity;
    if (!victim?.isValid) return;
    const family = victim.getComponent('minecraft:type_family');
    if (!family?.hasTypeFamily(GRAPE_MONSTER_FAMILY)) return;
    victim.applyDamage(GRAPE_DAMAGE, { damagingProjectile: event.projectile, cause: EntityDamageCause.projectile });
  } catch (error) { console.warn(`[Grapes] Seed hit skipped: ${error}`); }
});

world.afterEvents.projectileHitBlock.subscribe((event) => {
  try {
    if (event.projectile?.typeId !== GRAPE_SEED_ENTITY) return;
    if (event.projectile.isValid) event.projectile.remove();
  } catch { /* it may already be gone */ }
});

// Universal upkeep, once per second: keeps every loaded Fruity Friend in its
// persisted movement state (reapplying groups after a reload), enforces the shared
// WORK/HOME radius system, and rescues unanchored companions from below the world
// or across dimensions. Anchored friends (WORK/HOME) are governed by their own
// anchor rather than the owner's position, so the owner-catch-up rescue skips them.
// This intentionally does not create duplicates when an entity unloads.
system.runInterval(() => {
  const players = new Map(world.getAllPlayers().map(player => [player.id, player]));
  for (const dimName of DIMENSIONS) {
    const dimension = world.getDimension(dimName);
    for (const type of TYPES) {
      for (const friend of dimension.getEntities({ type })) {
        try {
          if (!friend.isValid) continue;
          const ownerId = friend.getComponent('minecraft:tameable')?.tamedToPlayerId;
          if (!ownerId) continue;
          const owner = players.get(ownerId);
          let mode = readMode(friend);
          if (!mode) {
            // Pre-update friends: sitting ones stay put, everyone else keeps the
            // old follow-the-owner default. Newly tamed friends already set STAY.
            mode = defaultMode(friend.hasComponent('minecraft:is_sitting'));
            try { setMode(friend, mode); } catch { /* retried on the next interval */ }
          }
          syncModeGroups(friend, mode);

          if (mode === MODE.WORK) {
            const anchor = readWorkAnchor(friend);
            if (anchor) enforceRadius(friend, anchor, WORK_RADIUS, WORK_RADIUS * 1.5);
            continue; // anchored friends are not owner-rescued
          }
          if (mode === MODE.HOME) {
            const anchor = resolveHomeAnchor(owner);
            if (anchor) enforceRadius(friend, anchor, HOME_RADIUS, HOME_RADIUS * 1.8);
            continue; // anchored friends are not owner-rescued
          }

          // FOLLOW / STAY / migrating: rescue loaded companions from the void and
          // catch them up across dimensions near their owner when safe ground exists.
          const inVoid = friend.location.y < dimension.heightRange.min;
          if (!inVoid && friend.dimension.id === owner?.dimension?.id) continue;
          const base = owner?.location;
          if (!base) continue;
          let moved = false;
          for (const [dx, dz] of [[2,0],[-2,0],[0,2],[0,-2],[1,1]]) {
            if (moved) break;
            for (const dy of [0,1,-1]) {
              const spot = { x: Math.floor(base.x) + dx + 0.5, y: Math.floor(base.y) + dy, z: Math.floor(base.z) + dz + 0.5 };
              if (!isWalkableSpot(owner.dimension, spot)) continue;
              moved = friend.tryTeleport(spot, { dimension: owner.dimension, checkForBlocks: true });
              if (moved) break;
            }
          }
        } catch { /* An unloaded entity or chunk can be retried on the next interval. */ }
      }
    }
  }
  if (seenMode.size > 512) seenMode.clear();
  if (returnStuck.size > 512) returnStuck.clear();
}, 20);
