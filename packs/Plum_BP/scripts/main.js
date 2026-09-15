import { world, system } from '@minecraft/server';
import { ActionFormData, ModalFormData } from '@minecraft/server-ui';
import { answerQuestion, chatLabel } from './provider.js';
import { cleanText } from './knowledge.js';
import './orchard.js';

const TYPE = 'plum:friend';
const openForms = new Set();
const nextQuestion = new Map();
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

function tell(player, text) {
  if (player.isValid) player.sendMessage(`§dPlum§r: ${text}`);
}

function nearOwner(player, friend) {
  return player.isValid && friend.isValid && friend.dimension.id === player.dimension.id
    && distance(player.location, friend.location) <= 10
    && friend.getComponent('minecraft:tameable')?.tamedToPlayerId === player.id;
}

async function talk(player, friend) {
  if (openForms.has(player.id)) return;
  if (!nearOwner(player, friend)) {
    tell(player, 'Give me a plum fruit to tame me first. Only my owner can open my conversation.');
    return;
  }
  openForms.add(player.id);
  try {
    const baby = friend.hasComponent('minecraft:is_baby');
    const menu = await new ActionFormData().title(baby ? 'Little Plum' : 'Plum')
      .body(`Hi, adventure buddy!\n${chatLabel}\n\nStay close for healing. Feed two tamed adults plums to make a baby.`)
      .button('Ask a question').button('How do I care for you?').button('Goodbye').show(player);
    if (menu.canceled || menu.selection === 2 || !nearOwner(player, friend)) return;
    if (menu.selection === 1) {
      tell(player, 'Tame me by giving me a plum. Breed adults with plums. Babies grow in 20 loaded minutes and can be tamed too. Hold a book and interact to talk!');
      return;
    }
    let again = true;
    while (again && nearOwner(player, friend)) {
      const form = await new ModalFormData().title('Ask Plum')
        .textField('Your question (up to 400 characters)', 'How do I make a bed?').submitButton('Ask').show(player);
      if (form.canceled || !nearOwner(player, friend)) return;
      const question = cleanText(form.formValues?.[0]);
      if (!question) return;
      if (system.currentTick < (nextQuestion.get(player.id) ?? 0)) {
        tell(player, 'Give me a few seconds to think before another question.');
        return;
      }
      nextQuestion.set(player.id, system.currentTick + 100);
      tell(player, 'Thinking...');
      const answer = cleanText(await answerQuestion(question, {
        playerId: player.id,
        dimension: player.dimension.id,
        baby,
      }), 1400);
      if (!player.isValid) return;
      tell(player, answer);
      const response = await new ActionFormData().title('Plum says...').body(answer)
        .button('Ask another question').button('Back to adventuring').show(player);
      again = !response.canceled && response.selection === 0;
    }
  } catch (error) {
    console.warn(`[Plum] Conversation unavailable: ${error}`);
    tell(player, 'I could not open that conversation. Close other menus and interact with me again.');
  } finally {
    openForms.delete(player.id);
  }
}

world.afterEvents.playerInteractWithEntity.subscribe(({ player, target, beforeItemStack }) => {
  if (target.typeId !== TYPE) return;
  // Leave food, taming, name tags and leads to the engine. A book also gives touch players a Talk button.
  if (beforeItemStack && beforeItemStack.typeId !== 'minecraft:book') return;
  system.run(() => { void talk(player, target); });
});

world.afterEvents.playerLeave.subscribe(({ playerId }) => {
  openForms.delete(playerId);
  nextQuestion.delete(playerId);
});

world.afterEvents.playerSpawn.subscribe(({ player, initialSpawn }) => {
  if (initialSpawn) system.runTimeout(() => tell(player, 'Find a Plum Spawn Egg in Creative. Tame me with a plum fruit, then hold a book and interact to chat.'), 60);
});

// Plum rejects ordinary damage: restore full health the instant a hit lands.
world.afterEvents.entityHurt.subscribe(({ hurtEntity }) => {
  if (hurtEntity.typeId !== TYPE) return;
  const health = hurtEntity.getComponent('minecraft:health');
  try {
    hurtEntity.setHealth(health ? health.effectiveMax : 100);
  } catch { /* The event fires for hits that finish the entity in the same tick. */ }
});

// One healing effect per owner, regardless of how many friends they breed.
system.runInterval(() => {
  for (const player of world.getAllPlayers()) {
    try {
      const friends = player.dimension.getEntities({ type: TYPE, location: player.location, maxDistance: 8 });
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
    for (const friend of dimension.getEntities({ type: TYPE })) {
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
}, 20);
