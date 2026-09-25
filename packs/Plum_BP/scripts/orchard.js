import { system, EquipmentSlot, GameMode } from '@minecraft/server';
import { growTree } from './tree_growth.js';

// A fruit planted on tilled farmland becomes a sprout that grows into a baby friend.
const SPROUT_FRIEND = { 'plum:plum_sprout': 'plum:friend', 'apple:apple_sprout': 'apple:friend', 'blueberry:blueberry_sprout': 'blueberry:friend', 'lemon:lemon_sprout': 'lemon:friend', 'banana:banana_sprout': 'banana:friend', 'grapes:grapes_sprout': 'grapes:friend', 'strawberry:strawberry_sprout': 'strawberry:friend', 'coconut:coconut_sprout': 'coconut:friend' };

function growFriend(sprout) {
  const friendType = SPROUT_FRIEND[sprout.typeId];
  if (!friendType) return false;
  const origin = sprout.location;
  const soil = sprout.dimension.getBlock({ ...origin, y: origin.y - 1 });
  if (!soil || soil.typeId !== 'minecraft:farmland') return false;
  const above = sprout.dimension.getBlock({ x: origin.x, y: origin.y + 1, z: origin.z });
  if (!above || !above.isAir) return false;
  try {
    sprout.dimension.spawnEntity(friendType, { x: Math.floor(origin.x) + 0.5, y: origin.y + 1, z: Math.floor(origin.z) + 0.5 }).triggerEvent('minecraft:entity_born');
    sprout.setType('minecraft:air');
    return true;
  } catch {
    return false;
  }
}

function makeComponent(fruit) {
  return {
    /** @param {import('@minecraft/server').BlockComponentRandomTickEvent} event */
    onRandomTick({ block }) {
      if (Math.random() < 0.2) growTree(block);
    },
    /** @param {import('@minecraft/server').BlockComponentPlayerInteractEvent} event */
    onPlayerInteract({ block, player }) {
      if (!player || ![GameMode.Survival, GameMode.Creative].includes(player.getGameMode())) return;
      const equipment = player.getComponent('minecraft:equippable');
      const held = equipment?.getEquipment(EquipmentSlot.Mainhand);
      if (held?.typeId !== 'minecraft:bone_meal') return;
      if (!growTree(block)) {
        const space = fruit === 'Strawberry' ? '3 blocks wide, 2 blocks tall'
          : fruit === 'Grapes' ? '5 blocks wide, 3 blocks tall'
          : fruit === 'Coconut' ? '5 blocks wide, 7 blocks tall'
          : '5 blocks wide, 6 blocks tall';
        player.onScreenDisplay.setActionBar(`${fruit} saplings need soil and clear space: ${space}.`);
        return;
      }
      if (player.getGameMode() !== GameMode.Creative) {
        if (held.amount > 1) {
          held.amount--;
          equipment.setEquipment(EquipmentSlot.Mainhand, held);
        } else equipment.setEquipment(EquipmentSlot.Mainhand, undefined);
      }
    }
  };
}

function makeSproutComponent() {
  return {
    /** @param {import('@minecraft/server').BlockComponentRandomTickEvent} event */
    onRandomTick({ block }) {
      if (Math.random() < 0.5) growFriend(block);
    },
    /** @param {import('@minecraft/server').BlockComponentPlayerInteractEvent} event */
    onPlayerInteract({ block, player }) {
      if (!player || ![GameMode.Survival, GameMode.Creative].includes(player.getGameMode())) return;
      if (growFriend(block)) return;
      player.onScreenDisplay.setActionBar('A fruit sprout needs tilled farmland below and air above.');
    }
  };
}

system.beforeEvents.startup.subscribe(({ blockComponentRegistry }) => {
  blockComponentRegistry.registerCustomComponent('plum:grow_tree', makeComponent('Plum'));
  blockComponentRegistry.registerCustomComponent('apple:grow_tree', makeComponent('Apple'));
  blockComponentRegistry.registerCustomComponent('blueberry:grow_tree', makeComponent('Blueberry'));
  blockComponentRegistry.registerCustomComponent('lemon:grow_tree', makeComponent('Lemon'));
  blockComponentRegistry.registerCustomComponent('banana:grow_tree', makeComponent('Banana'));
  blockComponentRegistry.registerCustomComponent('grapes:grow_tree', makeComponent('Grapes'));
  blockComponentRegistry.registerCustomComponent('strawberry:grow_tree', makeComponent('Strawberry'));
  blockComponentRegistry.registerCustomComponent('coconut:grow_tree', makeComponent('Coconut'));
  blockComponentRegistry.registerCustomComponent('friend:sprout_grow', makeSproutComponent());
});