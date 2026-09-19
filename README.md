# Fruity Friends

**Fruity Friends** is a family of smiling, animated cube companions for **Minecraft Bedrock**, with half-size baby forms. The first friend is **Plum**, a purple cube with a sweet tooth for plums; version **1.2.0** added **Apple**, a red cube friend who owns **Applezon**, a blocky parody of a giant online shop, plus apple fruit to plant and naturally generated apple trees. Version **1.2.1** renamed the add-on to **Fruity Friends** and lets you greet a friend in chat (`hey Apple, ...`). Version **1.2.2** fixes the Applezon shop, chat replies, and fruit icons. Version **1.2.3** keeps taming reliable for both friends. Version **1.2.4** turns fruit planting into a real sprout block that grows into each friend. Version **1.2.5** makes the fruit carrot-style: plant it on tilled farmland to grow a sprout, or eat it to restore 4 hunger points. Version **1.2.6** removes breeding entirely: the only way to get a baby is to plant a fruit on tilled farmland. Version **1.2.7** adds dog-style sit: interact with an empty hand to make a tamed friend stay put or follow. Version **1.2.8** adds the **Fruit Basket**: craft three sticks in a bucket shape, then hold it and interact with a tamed friend to tuck them inside your inventory; interact with a block to let them out again. Version **1.2.9** corrects the name — v1.2.8 briefly shipped it as "Fruid Basket" (a typo), now fixed everywhere to **Fruit Basket**. Version **1.2.10** fixes the setup guides that still pinned servers to outdated pack versions (which silently stopped the basket, recipe, and other content from loading after an update) and adds the active pack version to the startup message. Version **1.2.11** adds **Blueberry**, a deep-blue berry friend and the **Collector**, who scoops up nearby dropped items into a portable chest his owner opens with an empty hand. Version **1.2.12** replaces dog-style sit with a universal movement system: every Fruity Friend is always in one of **Follow, Stay, Work, or Go Home** (or carried in a Fruit Basket), a newly tamed friend stays put instead of auto-following, up to **four friends may follow you at once**, Work keeps a friend within 20 blocks of a spot you choose, and Go Home sends a friend to your spawn point. Version **1.2.13** adds **Lemon**, a sunny-yellow but slightly grumpy cube and the **Light Friend**: he glows warmly so you can always find him, and lemon trees grow in warm biomes like deserts, savannas, and jungles. Version **1.2.14** adds **Banana**, the tall goofy cube and the **Prankster**: he is convinced he is your bodyguard, drops a banana peel about every 30 seconds that makes monsters slip and slow for a moment, and answers every question with a terrible banana pun. Banana trees grow only in jungles. Version **1.2.15** fixes load-time and growth bugs from 1.2.14: the Banana sapling's custom component is now registered (so it and every friend's blocks load cleanly), and Lemon and Banana saplings actually grow into their trees. This project includes an offline add-on and a Dedicated Server edition with typed AI conversation for mobile and Windows players.

Version **1.2.16** restores empty-hand, book, and Fruit Basket interactions by handling script-owned actions before Minecraft requires a native entity interaction to succeed. Fruit taming, leads, and name tags remain engine-controlled.

Version **1.2.17** fixes Lemon's Light Friend ability on Bedrock: Lemon now renders full-bright in darkness and grants particle-free Night Vision to every player within 8 blocks while he is tamed and loaded.

Version **1.2.18** restores native interaction prompts for tamed friends, removes baby-growth feeding, and gives every four-log fruit tree a fuller canopy.

Version **1.2.19** restores fruit-based baby growth and replaces Plum's long login message with a reusable **Fruity Friend Guidebook**.

Version **1.2.20** tried to fix a 1.2.19 pack-load error by declaring the Guidebook's custom component with `minecraft:custom_components`, but Minecraft removed that array form in the 1.21.90 JSON format, so it kept failing. Version **1.2.23** fixes the load error for real: the Guidebook and every sapling/sprout block now use **Custom Components V2** (format 1.21.90+) — the custom component is a plain key inside the item's/block's `components` object, registered from `system.beforeEvents.startup` — so the behavior pack imports cleanly and its scripts actually run.

Version **1.2.22** fixes two regressions: friends now answer in chat (the add-on hooks Minecraft's `chatSend` event where the release exposes it — some stable releases only surface that event behind the world's **Beta APIs** experiment; if chat replies never appear, enable it and reload the world), and the Fruit Basket pick-up works again — the basket's native interact entry was swallowing the tap before the script could capture the friend, so basketing is script-only again, exactly like the book. The book keeps working everywhere and carries every fruit in one basket.

## Downloads

- **`dist/Fruity-Friends-Dedicated-Server.zip`** — the AI edition, behavior/resource packs, Python AI service, and server setup instructions. This is the edition for your requested setup.
- **`dist/Fruity-Friends.mcaddon`** — an importable offline edition for a quick local-world tryout. It has built-in Minecraft answers rather than open-ended AI.

![Plum's face](art/plum-face.png)

## Playing with Plum

When you join, the add-on places a **Fruity Friend Guidebook** in your inventory if you do not already carry one. Use it to open the in-game guide; it replaces the old multi-line login message.

1. Start by **planting a plum fruit on tilled farmland** — it becomes a sprout that grows into a tiny baby Plum. Interact with the sprout to sprout it instantly, or let it grow on its own in a minute or two. In Creative you can instead spawn two friends directly with the **Plum Spawn Egg**.
2. Give a **plum fruit** to each Plum to tame him. One plum always works.
3. He follows his owner, steps up blocks, and can catch up with normal pet teleporting.
4. **Tell him what to do:** interact with an **empty hand** to open the **Movement** menu — **Follow**, **Stay**, **Work**, or **Go Home**. A freshly tamed friend starts out staying put, and up to **four friends may follow you at once**. **Stay** keeps a friend where you leave it (and does not use a follower slot); **Work** pins a friend to its current spot and lets it roam freely within a 20-block radius, returning it if it strays; **Go Home** sends a friend back to the spot you slept in — your bed, where it roams within 10 blocks of home instead of staying. (**Blueberry is the exception:** his empty-hand interact opens his Collector chest, and Movement lives inside that menu.)
5. **Carry him in a basket:** craft a **Fruit Basket** from three sticks in the bucket shape (two on top, one below in the middle). Hold it and interact with a tamed friend to tuck him inside. Carry the basket in your inventory, then interact with **any block** to let him out again — name, baby/sit state, his owner, and (for Blueberry) his chest contents all come back. Whatever he was doing before (Follow, Work, or roaming Home), a friend released from a basket **always comes out staying put** until you give him a new order.
6. Talk to your friend two ways. **In chat**: while a tamed Plum is within 10 blocks, just type his name first — for example `Plum, what is redstone?`, `hey Plum, hi`, or `@plum ping`. A greeting like `hey`/`hi`/`hello` can come before his name. He answers in chat instantly (or with his knowledge base offline). Chat replies listen for Minecraft's chat event; if nothing appears, some releases only expose that event under the world's **Beta APIs** experiment — open the world settings, Experiments → enable **Beta APIs** and reload. The **book** below always works. **With a book**: hold an ordinary **book**, point at your Plum, and use **Talk to Plum** / interact. On PC, right-click; on mobile, use the interaction control for your chosen touch layout. Select **Ask a question**, type, and press **Ask**. Answers appear in a private window and your private chat. No chat commands or operator permissions are needed to talk.
7. Plant a **fruit on tilled farmland** to grow a baby friend. Only planting makes babies — breeding was removed. A sprout appears, then the baby sprouts from it.
8. Babies are half-size and follow a parent until they grow. Give a baby a plum fruit to make it yours. Babies grow after approximately **20 minutes while loaded**; matching fruit speeds growth.
9. Stay within **8 blocks** of your tamed Plum for regeneration. Having several Plums does not multiply the effect.

The **cube friends** do not spawn naturally and have no Survival crafting recipe. Plant a plum fruit on tilled farmland to grow your first baby, then tame it. Their fruit is obtainable in Survival from trees.

## Plum trees and fruit

- Find green, purple-fruited **plum trees in newly generated plains and temperate forests**. They use oak logs, which you can chop for ordinary oak wood.
- Break **Plum Leaves** in Survival: each block has a **35% chance to drop a plum fruit** and a separate **10% chance to drop a Plum Sapling**. Leaves are harvested by breaking them and do not decay automatically in this version.
- Plant a sapling on grass, dirt, coarse dirt, podzol, or moss. Leave a **5-block-wide area and 6 blocks of height** clear. Trees grow on random ticks while their area is loaded; there is no fixed growth time.
- Use **bone meal** on a sapling to grow it immediately if there is space. Successful growth uses one bone meal in Survival; blocked growth consumes none. Creative uses none.
- Plant a plum on tilled farmland to grow a new baby friend, or feed matching fruit to a baby to speed up growth.

Trees will not be added retroactively to old chunks. Explore beyond previously generated terrain, or obtain a Plum Sapling from Creative. For a quick operator test, use `/give @s plum:plum_sapling 1` and `/give @s plum:plum 16`.

![Plum fruit](art/plum-fruit.png)

## Apple and the Applezon shop

Apple is a smiling red cube box with a green leaf and his own Applezon brand. He works just like Plum — plant an **apple fruit** on tilled farmland to grow a baby Apple, tame him with an **apple** (planting made the baby, not breeding), and talk to him with a book. His baby grows in the same 20 loaded minutes.

The differences:

- **Apple does not heal you.** Stay near your tamed Plum (within 8 blocks) for regeneration; Apple brings deliveries instead.
- Find **red-speckled apple trees** in newly generated plains and forests; their leaves drop apples and Apple Saplings, just like plum trees. `/give @s apple:apple_sapling 1` and `/give @s apple:apple 16` work in Creative too.
- Interact with Apple and choose **Shop at Applezon**. Every delivery costs **one apple fruit**. Pick **What does Apple recommend?** for a surprise item, tool, or block, or **Search the catalog** for something specific (try "pickaxe", "torches", "elytra", or "cake").

![Apple's face](art/apple-face.png)

## Blueberry the Collector

Blueberry is a deep-blue cube friend who works like the others — plant a **blueberry fruit** on tilled farmland to grow a baby Blueberry, tame him with a **blueberry**, and talk to him with a book or in chat — but his job is collecting.

- **He is a Collector.** Any dropped item within **four blocks** of a tamed Blueberry is scooped straight into his chest. This is great for cleaning up after mining, chopping, or a fight.
- **He is a portable chest.** Interact with him using an **empty hand** (not the book) to open his chest. From there you can **store the stack in your hand**, **take a stack out**, **view the contents**, or tell him to **sit or stand** (his dog-style stay lives in this menu, since the empty hand opens the chest). Blueberry carries up to **27 stacks**.
- **He tells you when he is full.** If a pickup does not fit, or you try to store into a full chest, Blueberry warns his owner so you can empty it.
- **His chest travels with him.** Tuck a tamed Blueberry into a **Fruit Basket** and everything in his chest is carried along; interact with a block to let him out with his cargo intact.
- Blueberry does **not** heal you; stay near your tamed Plum for that.
- Find **deep-blue-speckled blueberry trees** in newly generated plains and forests; their leaves drop blueberries and Blueberry Saplings. `/give @s blueberry:blueberry_sapling 1` and `/give @s blueberry:blueberry 16` work in Creative too.

![Blueberry's face](art/blueberry-face.png)

## Lemon the Light Friend

Lemon is a sunny-yellow cube friend with a slightly grumpy face and a broad green leaf on top. He works like the others — plant a **lemon fruit** on tilled farmland to grow a baby Lemon, tame him with a **lemon**, and talk to him with a book or in chat — but his job is light.

- **He lights the way.** A tamed Lemon renders full-bright so he remains visible in darkness and grants particle-free **Night Vision** to every player within **8 blocks**. The effect is active in every movement mode while Lemon is loaded; it fades shortly after walking away. Bedrock does not support true moving block light from an entity, so nearby Night Vision is the reliable equivalent.
- **He does not heal you.** Stay near your tamed Plum for that.
- **He is a little grumpy.** His care messages are unfailingly dry and slightly deadpan, but he always means well.
- Find **yellow-fruited lemon trees in warm biomes** — deserts, savannas, and jungles — in newly generated terrain. Break their lemon-speckled leaves in Survival for lemons and Lemon Saplings; their fruit drops, sapling chances, planting, and bone-meal growth work exactly like the other trees. `/give @s lemon:lemon_sapling 1` and `/give @s lemon:lemon 16` work in Creative too.
- Interact with Lemon with an **empty hand** for the standard **Movement** menu — **Follow, Stay, Work, Go Home** — just like Plum and Apple. His empty hand always opens Movement (there is no special chest or shop).

![Lemon's face](art/lemon-face.png)

## Banana the Prankster

Banana is a tall — about **1.5 blocks** — sunny-yellow cube friend with a goofy face (mismatched derpy eyes, a wide grin, and a tongue) that makes him easy to spot among the smaller cubes. He works like the others — plant a **banana fruit** on tilled farmland to grow a baby Banana, tame him with a **banana**, and talk with a book or in chat — but his real job, according to him and him alone, is bodyguard.

- **He drops banana peels.** About every **30 seconds**, a tamed Banana cheerfully drops a **banana peel trap** on the floor. It cannot be picked up. The first hostile mob (zombie, creeper, skeleton, and friends) that comes within about one block **slips and slows**, consuming the peel. An unused peel removes itself after **two minutes**. He will insist this is a sophisticated tactical maneuver.
- **He does not heal you.** Stay near your tamed Plum for that.
- **He is comedy.** Banana answers questions *correctly* — the facts are right — but he wraps every answer in terrible banana puns and is utterly convinced he is the most useful friend in existence. He is never mean, just very, very confident.
- Find **banana trees in jungles** in newly generated terrain. Break their yellow-speckled leaves in Survival for bananas and Banana Saplings; drops, planting, and bone-meal growth match the other trees. `/give @s banana:banana_sapling 1` and `/give @s banana:banana 16` work in Creative too.
- Interact with Banana with an **empty hand** for the standard **Movement** menu — **Follow, Stay, Work, Go Home** — just like Plum, Apple, and Lemon.

![Banana's face](art/banana-face.png)

## Updating from version 1.1.0

Reimport the updated offline add-on, or stop BDS and replace the pack folders from the new server archive. On BDS, update both world pack-list entries to **`[1,2,23]`**, preserving entries for other packs. Replace `plum-service/bridge.py` too and restart the bridge so the AI knows about Apple, Applezon, Blueberry, the Collector chest, Lemon the Light Friend, Banana the Prankster, and the five kinds of fruit trees. Keep existing pack UUIDs, credentials, and world data. Existing tamed friends carried over from older worlds keep working: friends that were sitting migrate to **Stay**, and others keep their old follow-the-owner behavior as **Follow**.

## Protection and following

Plum rejects normal damage, is fire immune, can breathe underwater, and does not naturally despawn. The script attempts to rescue a loaded, owned Plum from the void and move him between dimensions near his owner when safe ground is available.

This does **not** promise protection from `/kill`, administrative entity deletion, disabled packs, or engine bugs. Unloaded entities cannot be moved by the script; return to the area to load a stranded Plum. Dimension rescue searches common full-block ground near the player, so it can wait if you are flying or standing on unusual terrain. Plum heals and advises; he does not mine or fight.

## Offline installation

Target baseline: Bedrock **1.21.90 or newer**, using stable `@minecraft/server` 2.0.0 and `@minecraft/server-ui` 2.0.0 APIs. Use a current mutually compatible client/server build for the AI edition.

On Windows, open `Fruity-Friends.mcaddon` with Minecraft. On Android/iOS, use the file manager's **Open with / Share to Minecraft** option if available. Create a test world, activate **Fruity Friends** under Behavior Packs, and check that its Resource Pack is active too. This offline edition does not require Beta APIs.

For AI conversation, follow **[the Dedicated Server setup guide](server/SETUP.md)**. Players join the server from mobile or Windows Bedrock and accept its resource download; the service runs on the server computer.

## What is tested

Automated checks cover JavaScript API types, offline answers, input sanitization, local HTTP authentication, malformed requests, per-player history separation, history limits, throttling, AI failures, Responses API output parsing, and pack references/lifecycle definitions.

Tree tests also cover complete sapling growth, blocked/unloaded destinations, rollback after a placement failure, and the world-generation → leaves → fruit/sapling → planting/feeding chain.

**Not yet tested in a running Minecraft client or Bedrock Dedicated Server.** No live OpenAI request has been made. Treat the packages as a first playable build pending the in-game checklist below; static checks cannot prove mob behavior or touch UI behavior.

## In-game acceptance checklist

- Import/load without Content Log errors; spawn an adult and verify purple smiling front and gentle bobbing.
- Tame two Plums, walk away, and confirm the correct player is followed in a two-player session.
- Test melee, arrows, fall, fire, lava, drowning, and explosion damage in a disposable world.
- Plant a fruit, verify a sprout and a baby, tame it, and verify growth to adult.
- Tame a new friend and confirm it starts out staying put (never auto-following).
- Tame five friends, set four to Follow, and confirm the fifth cannot Follow until one follower is set to Stay or Work, sent Home, or tucked into a Fruit Basket.
- Set a friend to Work and walk away; confirm it roams within 20 blocks of the spot you chose and returns after being pushed outside.
- Send a friend Home; confirm it arrives at your bed and roams within 10 blocks of it instead of staying put, and that it stays put if you have not slept in a bed yet.
- Interact with an empty hand on a tamed Plum, Apple, Lemon, or Banana and confirm the Follow/Stay/Work/Go Home menu appears; on Blueberry confirm the empty hand opens his chest and Movement lives inside it.
- Craft a Fruit Basket from three sticks, hold it and interact with a tamed friend, then interact with a block to release it; confirm the name, baby/sit state, owner, and (for Blueberry) chest items return, and that the friend comes out staying put no matter what mode it was in before.
- Reload the world and confirm modes and Work Anchors persist.
- In a two-player session confirm each player independently gets four Follow slots.
- Find plum, apple and blueberry trees in new plains/forest terrain, lemon trees in warm biomes (desert, savanna, jungle), and banana trees in jungles; break leaves in Survival to verify each fruit and sapling drop.
- Plant a sapling, test bone meal and natural growth, and confirm a nearby wall/chest is preserved when growth is blocked.
- Verify fruit icons, fruit planting, sprout growth, and sapling rendering on mobile and PC.
- Tame a Banana, wait about 30 seconds, and confirm he drops a peel trap that cannot be picked up; lead a zombie or creeper within one block and confirm it slips, slows, and consumes the peel. Confirm an unused peel removes itself after two minutes, no new peels appear while Banana is untamed or in a basket, and Banana renders about 1.5 blocks tall with his goofy face in adult and baby forms.
- Tame a Blueberry, drop items nearby, and confirm he collects them; open his chest and store/take stacks; fill all 27 slots and confirm he warns you when full.
- Carry a Blueberry with items in his chest in a Fruit Basket and confirm the items return when he is released.
- Tame a Lemon and confirm he remains visible in darkness and grants particle-free Night Vision to every player within 8 blocks; confirm the effect fades after moving away and untamed Lemons grant nothing.
- Confirm Lemon's grumpy face (angled brows and a frown) renders on the front of both adult and baby forms.
- Hold a book and open the conversation on both mobile and PC. Verify cancel/reopen and private answers.
- Ask a follow-up AI question; confirm a second player's history is separate.
- Stop the bridge and confirm an offline answer appears instead of a stuck conversation.
- Lose health near an owned Plum and confirm regeneration; move away and verify it expires.
- Leave/rejoin and restart the server; check that adults, babies, and ownership persist.
- Test dimension travel and return to an unloaded companion's area if he does not come along.

## Development

The entity JSON, geometry, original pixel texture, manifests, and archives are generated by `tools/build.py`. Edit that generator for data/art changes. Edit scripts directly in `packs/Plum_BP/scripts`; the server archive replaces only `provider.js` with `server/provider.js`.

```sh
python3 tools/build.py
npm install
npm run check
npm test
python3 -m unittest discover -s tests -p 'test_*.py' -v
```

On Windows, use `py` instead of `python3` if appropriate. Keep pack UUIDs stable when updating an existing world. Both editions share UUIDs: use **one edition at a time**, not both together.

The entity intentionally keeps `format_version: 1.21.0`. Babies come only from planting a fruit on tilled farmland (see [orchard.js](packs/Plum_BP/scripts/orchard.js) and the `minecraft:entity_born` event); the `breedable` component is intentionally absent. Movement is universal: every tamed friend is in exactly one of **Follow, Stay, Work, Home, or Basket**, driven by [friend_state.js](packs/Plum_BP/scripts/friend_state.js) with configurable `MAX_FOLLOWING_FRIENDS` (4), `WORK_RADIUS` (20) and `HOME_RADIUS` (10), and enforced once per second by [main.js](packs/Plum_BP/scripts/main.js) (safe returns and teleports, no per-tick world searches). A freshly tamed friend starts in **Stay** (`minecraft:on_tame` adds the tamed and sit groups; `friend:follow` is only applied when an owner picks Follow). Empty-hand interact opens the **Movement** menu (Follow/Stay/Work/Go Home) on Plum, Apple, Lemon, and Banana. **Blueberry's** empty-hand interact opens his Collector chest instead, with Movement offered inside that menu. The **Fruit Basket** is script-driven: interacting with a tamed friend while holding one stores a snapshot (name, baby, mode-independent, owner) as an item dynamic property and removes the friend; interacting with a block while holding the filled basket spawns and re-tames the friend with `EntityTameableComponent.tame(player)`, restoring his name and sitting state, and ALWAYS placing him in **Stay** when released. **Blueberry's Collector chest** is carried as serialized JSON on the entity's `blueberry:chest` dynamic property (27 slots); a scheduled job vacuum-seals dropped items within four blocks into it, the basket snapshot copies the chest so cargo survives a trip, and the owner is warned when it is full. **Lemon is the Light Friend**: a `system.runInterval` pass (in `main.js`) keeps every tamed `lemon:friend` under the `glowing` effect (no particles), so he is easy to spot in the dark and glows for whoever is beside him. Lemon trees use the same tree feature as the other fruits but pin their `feature_rules` biome filter to warm tags (`desert`, `savanna`, `jungle`). **Banana is the Prankster**: he is the only tall friend (`tall` in `tools/build.py` builds a `12x24x12` geometry on a `32x40` sheet with a `1.4` collision height), and a second `system.runInterval` pass drops a `banana:banana_peel` item roughly every 30 seconds (`PEEL_INTERVAL`) near each tamed `banana:friend`, making `monster`-family mobs within `PEEL_RADIUS` (4) blocks slip (slowness plus a gentle impulse) with a throttled goofy action-bar line. Banana trees pin their `feature_rules` biome filter to `jungle` only.
