import { system, EquipmentSlot, GameMode } from '@minecraft/server';
import { growTree } from './tree_growth.js';

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
        player.onScreenDisplay.setActionBar(`${fruit} saplings need soil and clear space: 5 blocks wide, 6 blocks tall.`);
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

system.beforeEvents.startup.subscribe(({ blockComponentRegistry }) => {
  blockComponentRegistry.registerCustomComponent('plum:grow_tree', makeComponent('Plum'));
  blockComponentRegistry.registerCustomComponent('apple:grow_tree', makeComponent('Apple'));
});