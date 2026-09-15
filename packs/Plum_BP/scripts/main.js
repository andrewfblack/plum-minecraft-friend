import { world, system, EquipmentSlot, GameMode, ItemStack, Player } from '@minecraft/server';
import { ActionFormData, ModalFormData } from '@minecraft/server-ui';
import { answerQuestion, chatLabelFor } from './provider.js';
import { cleanText } from './knowledge.js';
import './orchard.js';

const openForms = new Set();
const nextQuestion = new Map();
const lastPlant = new Map();
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

const FRIENDS = {
  'plum:friend': {
    name: 'Plum', color: '§d', fruit: 'plum:plum',
    title: (baby) => baby ? 'Little Plum' : 'Plum',
    body: (baby, label) => `Hi, adventure buddy!\n${label}\n\nStay close for healing. Feed two tamed adults plums to make a baby.`,
    askTitle: 'Ask Plum', replyTitle: 'Plum says...',
    care: 'Tame me by giving me a plum. Breed adults with plums. Babies grow in 20 loaded minutes and can be tamed too. Talk to me in chat while I am near you, or hold a book and interact!',
    tamedMsg: 'Give me a plum fruit to tame me first. Only my owner can open my conversation.',
    plantMsg: 'A tiny Plum sprouts from the soil! Give it a plum to tame it.',
  },
  'apple:friend': {
    name: 'Apple', color: '§c', fruit: 'apple:apple', shop: true,
    title: (baby) => baby ? 'Little Apple' : 'Apple',
    body: (baby, label) => `Hi, shopper buddy!\n${label}\n\nApplezon delivers one item for the price of one apple fruit. Apple does not heal; stay near Plum for that.`,
    askTitle: 'Ask Apple', replyTitle: 'Apple says...',
    care: 'Tame me by giving me an apple. Breed adults with apples. Babies grow in 20 loaded minutes and can be tamed too. Grab items from my Applezon menu, or ask me about the shop in chat!',
    tamedMsg: 'Give me an apple fruit to tame me first. Only my owner can open my conversation or Applezon.',
    plantMsg: 'A tiny Apple sprouts from the soil! Give it an apple to tame it.',
  },
};

const TYPES = new Set(Object.keys(FRIENDS));
const PLANT_FRIEND = { 'plum:plum': 'plum:friend', 'apple:apple': 'apple:friend' };
const FRIEND_NAMES = { plum: 'plum:friend', apple: 'apple:friend' };

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
  // Leave food, taming, name tags and leads to the engine. A book also gives touch players a Talk button.
  if (beforeItemStack && beforeItemStack.typeId !== 'minecraft:book') return;
  system.run(() => { void talk(player, target); });
});

world.afterEvents.playerLeave.subscribe(({ playerId }) => {
  openForms.delete(playerId);
  nextQuestion.delete(playerId);
  lastPlant.delete(playerId);
});

world.afterEvents.playerSpawn.subscribe(({ player, initialSpawn }) => {
  if (initialSpawn) system.runTimeout(() => friendSay(player, FRIENDS['plum:friend'], 'Plant a plum or apple fruit on tilled farmland to grow a baby friend. Tame it with another fruit, then interact with me or type my name in chat (for example: "Plum, what is redstone?" or "hey Apple, what do you sell?") to talk. Apple runs the Applezon shop!'), 60);
});

// Talk to a nearby tamed friend straight from chat: "Plum ...", "hey Apple, ...", "@plum hi", etc.
// chatSend is not declared in this build's type surface, so guard at runtime; the book stays as fallback.
const chatEvents = /** @type {any} */ (world.beforeEvents);
try {
  chatEvents.chatSend?.subscribe((event) => {
    // The friend's name must lead the message, optionally after a greeting like hey/hi/hello.
    const match = event.message.match(/^\s*(?:(hey|hi|hello)[,!\s]+@?([a-zA-Z]+)\b|@?([a-zA-Z]+))\s*[:,]?\s*(.*)$/i);
    const name = match && (match[2] || match[3]);
    const friendType = name && FRIEND_NAMES[name.toLowerCase()];
    if (!friendType) return;
    const player = event.sender;
    const friend = nearestTamed(friendType, player);
    if (!friend) return;
    event.cancel = true;
    const cfg = FRIENDS[friendType];
    const baby = friend.hasComponent('minecraft:is_baby');
    const question = cleanText(match[4] || 'hi');
    system.run(() => {
      if (!player.isValid) return;
      world.sendMessage(`<${player.name}> ${event.message}`);
      if (system.currentTick < (nextQuestion.get(player.id) ?? 0)) {
        chatReply(cfg, 'Give me a few seconds to think before another question.');
        return;
      }
      nextQuestion.set(player.id, system.currentTick + 100);
      chatReply(cfg, 'Thinking...');
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
    });
  });
} catch (error) {
  console.warn('[Chat] Chat responses are not available on this engine; use the book to talk instead.');
}

// Grow a baby friend by planting its fruit on tilled farmland instead of eating it.
function plantFruit(player, farmland, fruitId) {
  const friendType = PLANT_FRIEND[fruitId];
  if (!friendType) return false;
  if (system.currentTick < (lastPlant.get(player.id) ?? 0)) return false;
  const cfg = FRIENDS[friendType];
  const destination = { x: Math.floor(farmland.x) + 0.5, y: farmland.y + 1, z: Math.floor(farmland.z) + 0.5 };
  if (!farmland.dimension.getBlock(destination)?.isAir) {
    friendSay(player, cfg, 'The soil is blocked; a sprout needs an empty space above the farmland.');
    return false;
  }
  lastPlant.set(player.id, system.currentTick + 20);
  try {
    if (player.getGameMode() !== GameMode.Creative) {
      const equipment = player.getComponent('minecraft:equippable');
      const held = equipment?.getEquipment(EquipmentSlot.Mainhand);
      if (held?.typeId === fruitId) {
        if (held.amount > 1) {
          held.amount--;
          equipment.setEquipment(EquipmentSlot.Mainhand, held);
        } else equipment.setEquipment(EquipmentSlot.Mainhand, undefined);
      }
    }
    farmland.dimension.spawnEntity(friendType, destination).triggerEvent('minecraft:entity_born');
    friendSay(player, cfg, cfg.plantMsg);
    return true;
  } catch (error) {
    console.warn(`[${cfg.name}] Planting failed: ${error}`);
    return false;
  }
}

// Route 1 (primary): the fruit item's onUseOn component fires when it is used on a block.
system.beforeEvents.startup.subscribe(({ itemComponentRegistry }) => {
  itemComponentRegistry.registerCustomComponent('friend:plant', {
    /** @param {import('@minecraft/server').ItemComponentUseOnEvent} event */
    onUseOn({ block, source, itemStack }) {
      if (block.typeId !== 'minecraft:farmland') return;
      if (!(source instanceof Player)) return;
      const fruitId = itemStack?.typeId;
      if (!PLANT_FRIEND[fruitId]) return;
      plantFruit(source, block, fruitId);
    },
  });
});

// Route 2 (fallback): catch the fruit's item use and plant if aimed at farmland.
world.beforeEvents.itemUse.subscribe((event) => {
  const typeId = event.itemStack?.typeId;
  if (!PLANT_FRIEND[typeId]) return;
  const player = event.source;
  const target = player.getBlockFromViewDirection({ maxDistance: 4 });
  if (!target || target.block.typeId !== 'minecraft:farmland') return;
  plantFruit(player, target.block, typeId);
});

// Friends reject ordinary damage: restore full health the instant a hit lands.
world.afterEvents.entityHurt.subscribe(({ hurtEntity }) => {
  if (!TYPES.has(hurtEntity.typeId)) return;
  try {
    hurtEntity.getComponent('minecraft:health')?.resetToMaxValue();
  } catch { /* The event fires for hits that finish the entity in the same tick. */ }
});

// One healing effect per Plum owner, regardless of how many friends they breed. Apple never heals.
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