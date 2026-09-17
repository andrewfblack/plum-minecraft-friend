import { world, system, EquipmentSlot, ItemStack, Player } from '@minecraft/server';
import { ActionFormData, ModalFormData } from '@minecraft/server-ui';
import { answerQuestion, chatLabelFor } from './provider.js';
import { cleanText } from './knowledge.js';
import './orchard.js';

const openForms = new Set();
const nextQuestion = new Map();
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

const FRIENDS = {
  'plum:friend': {
    name: 'Plum', color: '§d', fruit: 'plum:plum',
    title: (baby) => baby ? 'Little Plum' : 'Plum',
    body: (baby, label) => `Hi, adventure buddy!\n${label}\n\nStay close for healing. Plant a plum on tilled farmland to grow a baby.`,
    askTitle: 'Ask Plum', replyTitle: 'Plum says...',
    care: 'Tame me by giving me a plum. Plant a plum on tilled farmland to grow a baby. Babies grow in 20 loaded minutes and can be tamed too. Interact with an empty hand to make me sit or follow you. Craft a Fruit Basket from three sticks in the bucket shape and interact with me while holding it to carry me along. Talk to me in chat while I am near you, or hold a book and interact!',
    tamedMsg: 'Give me a plum fruit to tame me first. Only my owner can open my conversation.',
    plantMsg: 'A tiny fruiting sprout pokes through the soil! It will grow into a baby Plum — one plum tames it.',
  },
  'apple:friend': {
    name: 'Apple', color: '§c', fruit: 'apple:apple', shop: true,
    title: (baby) => baby ? 'Little Apple' : 'Apple',
    body: (baby, label) => `Hi, shopper buddy!\n${label}\n\nApplezon delivers one item for the price of one apple fruit. Apple does not heal; stay near Plum for that.`,
    askTitle: 'Ask Apple', replyTitle: 'Apple says...',
    care: 'Tame me by giving me an apple. Plant an apple on tilled farmland to grow a baby. Babies grow in 20 loaded minutes and can be tamed too. Interact with an empty hand to make me sit or follow you. Craft a Fruit Basket from three sticks in the bucket shape and interact with me while holding it to carry me along. Grab items from my Applezon menu, or ask me about the shop in chat!',
    tamedMsg: 'Give me an apple fruit to tame me first. Only my owner can open my conversation or Applezon.',
    plantMsg: 'A tiny fruiting sprout pokes through the soil! It will grow into a baby Apple — one apple tames it.',
  },
};

const TYPES = new Set(Object.keys(FRIENDS));
const FRUIT_FRIEND = { 'plum:plum': 'plum:friend', 'apple:apple': 'apple:friend' };
const FRIEND_NAMES = { plum: 'plum:friend', apple: 'apple:friend' };

const BASKET = 'friend:fruit_basket';
const BASKET_STORE = 'basket:friend';

// A Fruit Basket carries one tamed friend as a snapshot stored on the item stack.
function basketContents(stack) {
  const raw = stack.getDynamicProperty(BASKET_STORE);
  if (!raw) return null;
  try { return JSON.parse(/** @type {string} */ (raw)); } catch { return null; }
}

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

// Dog-style sit/stay: a tamed owner's empty-hand right-click toggles staying put.
function toggleSit(player, friend) {
  if (!player.isValid || !friend.isValid) return;
  const cfg = FRIENDS[friend.typeId];
  if (!cfg) return;
  const tamed = friend.getComponent('minecraft:tameable');
  if (!tamed?.tamedToPlayerId || tamed.tamedToPlayerId !== player.id) {
    friendSay(player, cfg, 'Give me my fruit to tame me first, then I will sit when you ask.');
    return;
  }
  const sitting = friend.hasComponent('minecraft:is_sitting');
  friend.triggerEvent(sitting ? 'minecraft:on_stand' : 'minecraft:on_sit');
  friendSay(player, cfg, sitting ? 'Up I get! I will follow you again.' : 'Right! I will sit here and stay put.');
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
    try { friend.getComponent('minecraft:tameable')?.tame(player); } catch { /* Already owned by the snapshot's owner. */ }
    if (contents.sitting) friend.triggerEvent('minecraft:on_sit');
  } catch { /* A just-spawned friend can briefly reject state changes; it still lands fine. */ }
  try {
    inv.setItem(slot, new ItemStack(BASKET, 1));
  } catch { /* The basket returns to the player's hand slot on the next successful release. */ }
  friendSay(player, cfg, `Fresh air! I am ${contents.sitting ? 'staying right here' : 'right here'} with you again.`);
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
    action.button('Ask a question');
    if (cfg.shop) action.button('Shop at Applezon');
    action.button('How do I care for you?');
    action.button('Goodbye');
    const menu = await action.show(player);
    const goodbye = cfg.shop ? 3 : 2;
    if (menu.canceled || menu.selection === goodbye || !nearOwner(player, friend)) return;
    if (cfg.shop && menu.selection === 1) {
      // Release the talk lock before entering the shop so shop() can re-acquire it.
      openForms.delete(player.id);
      await shop(player, friend);
      return;
    }
    if (menu.selection === (cfg.shop ? 2 : 1)) {
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

world.afterEvents.playerInteractWithEntity.subscribe(({ player, target, beforeItemStack }) => {
  if (!TYPES.has(target.typeId)) return;
  // A Fruit Basket tucks a tamed friend away for carrying.
  if (beforeItemStack && beforeItemStack.typeId === BASKET) {
    system.run(() => { void captureInBasket(player, target); });
    return;
  }
  // Empty hand: sit/stay like a tamed dog (toggle on/off).
  if (!beforeItemStack || beforeItemStack.typeId === 'minecraft:air') {
    system.run(() => { void toggleSit(player, target); });
    return;
  }
  // Leave food, taming, name tags and leads to the engine. A book also gives touch players a Talk button.
  if (beforeItemStack.typeId !== 'minecraft:book') return;
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

world.afterEvents.playerSpawn.subscribe(({ player, initialSpawn }) => {
  if (initialSpawn) system.runTimeout(() => friendSay(player, FRIENDS['plum:friend'], 'Fruity Friends v1.2.10 is loaded. Use a plum or apple fruit on tilled farmland to plant a sprout; it grows into a baby friend, and one more fruit tames it. Interact with an empty hand to make me sit or follow. Craft a Fruit Basket from three sticks and interact with me while holding it to carry me around. Interact with me or type my name in chat (for example: "Plum, what is redstone?" or "hey Apple, what do you sell?") to talk. Apple runs the Applezon shop!'), 60);
});

// Talk to a nearby tamed friend straight from chat: "Plum ...", "hey Apple, ...", "@plum hi", etc.
// chatSend is not declared in this build's type surface, so guard at runtime; the book stays as fallback.
const chatEvents = /** @type {any} */ (world.beforeEvents);
if (!chatEvents?.chatSend) {
  console.warn('[Chat] beforeEvents.chatSend is unavailable on this engine; use the book to talk instead.');
} else {
  try {
    chatEvents.chatSend.subscribe((event) => {
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
    });
  } catch (error) {
    console.warn('[Chat] Chat responses are not available on this engine; use the book to talk instead.');
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

// Rescue loaded companions from below the world and catch up across dimensions.
// This intentionally does not create duplicates when an entity unloads.
system.runInterval(() => {
  const players = new Map(world.getAllPlayers().map(player => [player.id, player]));
  for (const name of ['overworld', 'nether', 'the_end']) {
    const dimension = world.getDimension(name);
    for (const type of TYPES) {
      for (const friend of dimension.getEntities({ type })) {
        try {
          const owner = players.get(friend.getComponent('minecraft:tameable')?.tamedToPlayerId);
          if (!owner) continue;
          const inVoid = friend.location.y < dimension.heightRange.min;
          if (!inVoid && friend.dimension.id === owner.dimension.id) continue;
          const base = owner.location;
          let moved = false;
          for (const [dx, dz] of [[2,0],[-2,0],[0,2],[0,-2],[1,1]]) {
            if (moved) break;
            for (const dy of [0,1,-1]) {
              const spot = { x: Math.floor(base.x) + dx + 0.5, y: Math.floor(base.y) + dy, z: Math.floor(base.z) + dz + 0.5 };
              const floor = owner.dimension.getBlock({ ...spot, y: spot.y - 1 });
              const feet = owner.dimension.getBlock(spot);
              const head = owner.dimension.getBlock({ ...spot, y: spot.y + 1 });
              if (!floor || !/^(minecraft:)(stone|dirt|grass_block|grass|cobblestone|deepslate|netherrack|end_stone|sand|gravel|.*_planks)$/.test(floor.typeId) || !feet?.isAir || !head?.isAir) continue;
              moved = friend.tryTeleport(spot, { dimension: owner.dimension, checkForBlocks: true });
              if (moved) break;
            }
          }
        } catch { /* An unloaded entity or chunk can be retried on the next interval. */ }
      }
    }
  }
}, 20);