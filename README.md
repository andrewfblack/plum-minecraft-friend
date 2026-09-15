# Fruity Friends

**Fruity Friends** is a family of smiling, animated cube companions for **Minecraft Bedrock**, with half-size baby forms. The first friend is **Plum**, a purple cube with a sweet tooth for plums; version **1.2.0** adds **Apple**, a red cube friend who owns **Applezon**, a blocky parody of a giant online shop, plus edible apple fruit and naturally generated apple trees. Fruit-based friends grow from planting their fruit on tilled farmland, and each will do something different. This project includes an offline add-on and a Dedicated Server edition with typed AI conversation for mobile and Windows players.

## Downloads

- **`dist/Fruity-Friends-Dedicated-Server.zip`** — the AI edition, behavior/resource packs, Python AI service, and server setup instructions. This is the edition for your requested setup.
- **`dist/Fruity-Friends.mcaddon`** — an importable offline edition for a quick local-world tryout. It has built-in Minecraft answers rather than open-ended AI.

![Plum's face](art/plum-face.png)

## Playing with Plum

1. Start by **planting a plum fruit on tilled farmland** — a tiny baby Plum sprouts from the soil. In Creative you can instead spawn two friends directly with the **Plum Spawn Egg**.
2. Give a **plum fruit** to each Plum to tame him. One plum always works.
3. He follows his owner, steps up blocks, and can catch up with normal pet teleporting.
4. Talk to your friend two ways. **In chat**: while a tamed Plum is within 10 blocks, just type his name first — for example `Plum, what is redstone?`, `hey Plum, hi`, or `@plum ping`. A greeting like `hey`/`hi`/`hello` can come before his name. He answers in chat instantly (or with his knowledge base offline). **With a book**: hold an ordinary **book**, point at your Plum, and use **Talk to Plum** / interact. On PC, right-click; on mobile, use the interaction control for your chosen touch layout. Select **Ask a question**, type, and press **Ask**. Answers appear in a private window and your private chat. No chat commands or operator permissions are needed to talk.
5. Give a **plum fruit to each of two nearby tamed adult Plums** to breed them. The cooldown is one minute. Apple breeds with apple fruit; vanilla minecraft apples don't breed either friend.
6. Babies are half-size and follow a parent until tamed. Give a baby a plum fruit to make it yours. Babies grow after approximately **20 minutes while loaded**; plums accelerate growth. Babies cannot breed until grown.
7. Stay within **8 blocks** of your tamed Plum for regeneration. Having several Plums does not multiply the effect.

The **cube friends** do not spawn naturally and have no Survival crafting recipe. Plant a plum fruit on tilled farmland to grow your first baby, tame it, then breed more. Their fruit is obtainable in Survival from trees.

## Plum trees and fruit

- Find green, purple-fruited **plum trees in newly generated plains and temperate forests**. They use oak logs, which you can chop for ordinary oak wood.
- Break **Plum Leaves** in Survival: each block has a **35% chance to drop a plum fruit** and a separate **10% chance to drop a Plum Sapling**. Leaves are harvested by breaking them and do not decay automatically in this version.
- Plant a sapling on grass, dirt, coarse dirt, podzol, or moss. Leave a **5-block-wide area and 6 blocks of height** clear. Trees grow on random ticks while their area is loaded; there is no fixed growth time.
- Use **bone meal** on a sapling to grow it immediately if there is space. Successful growth uses one bone meal in Survival; blocked growth consumes none. Creative uses none.
- Feed plums to two tamed adult friends to breed them, or to babies to speed up growth. Plant a plum on tilled farmland (not in your mouth!) to grow a new baby friend. You can also eat the fruit to restore **4 hunger points (2 drumsticks)**.

Trees will not be added retroactively to old chunks. Explore beyond previously generated terrain, or obtain a Plum Sapling from Creative. For a quick operator test, use `/give @s plum:plum_sapling 1` and `/give @s plum:plum 16`.

![Plum fruit](art/plum-fruit.png)

## Apple and the Applezon shop

Apple is a smiling red cube box with a green leaf and his own Applezon brand. He works just like Plum — plant an **apple fruit** on tilled farmland to grow a baby Apple, tame him with an **apple**, breed two adults with apples, and talk to him with a book. His baby grows in the same 20 loaded minutes.

The differences:

- **Apple does not heal you.** Stay near your tamed Plum (within 8 blocks) for regeneration; Apple brings deliveries instead.
- Find **red-speckled apple trees** in newly generated plains and forests; their leaves drop apples and Apple Saplings, just like plum trees. `/give @s apple:apple_sapling 1` and `/give @s apple:apple 16` work in Creative too.
- Interact with Apple and choose **Shop at Applezon**. Every delivery costs **one apple fruit**. Pick **What does Apple recommend?** for a surprise item, tool, or block, or **Search the catalog** for something specific (try "pickaxe", "torches", "elytra", or "cake").

![Apple's face](art/apple-face.png)

## Updating from version 1.1.0

Reimport the updated offline add-on, or stop BDS and replace the pack folders from the new server archive. On BDS, update both world pack-list entries to **`[1,2,0]`**, preserving entries for other packs. Replace `plum-service/bridge.py` too and restart the bridge so the AI knows about Apple, Applezon, and apple trees. Keep existing pack UUIDs, credentials, and world data.

## Protection and following

Plum rejects normal damage, is fire immune, can breathe underwater, and does not naturally despawn. The script attempts to rescue a loaded, owned Plum from the void and move him between dimensions near his owner when safe ground is available.

This does **not** promise protection from `/kill`, administrative entity deletion, disabled packs, or engine bugs. Unloaded entities cannot be moved by the script; return to the area to load a stranded Plum. Dimension rescue searches common full-block ground near the player, so it can wait if you are flying or standing on unusual terrain. Plum heals and advises; he does not mine or fight.

## Offline installation

Target baseline: Bedrock **1.21.90 or newer**, using stable `@minecraft/server` 2.0.0 and `@minecraft/server-ui` 2.0.0 APIs. Use a current mutually compatible client/server build for the AI edition.

On Windows, open `Fruity-Friends.mcaddon` with Minecraft. On Android/iOS, use the file manager's **Open with / Share to Minecraft** option if available. Create a test world, activate **Fruity Friends** under Behavior Packs, and check that its Resource Pack is active too. This offline edition does not require Beta APIs.

For AI conversation, follow **[the Dedicated Server setup guide](server/SETUP.md)**. Players join the server from mobile or Windows Bedrock and accept its resource download; the service runs on the server computer.

## What is tested

Automated checks cover JavaScript API types, offline answers, input sanitization, local HTTP authentication, malformed requests, per-player history separation, history limits, throttling, AI failures, Responses API output parsing, and pack references/lifecycle definitions.

Tree tests also cover complete sapling growth, blocked/unloaded destinations, rollback after a placement failure, and the world-generation → leaves → fruit/sapling → breeding chain.

**Not yet tested in a running Minecraft client or Bedrock Dedicated Server.** No live OpenAI request has been made. Treat the packages as a first playable build pending the in-game checklist below; static checks cannot prove mob behavior or touch UI behavior.

## In-game acceptance checklist

- Import/load without Content Log errors; spawn an adult and verify purple smiling front and gentle bobbing.
- Tame two Plums, walk away, and confirm the correct player is followed in a two-player session.
- Test melee, arrows, fall, fire, lava, drowning, and explosion damage in a disposable world.
- Feed the pair plums, verify a small baby, tame it, and verify growth and breeding cooldown.
- Find plum trees in new plains/forest terrain; break leaves in Survival to verify plum and sapling drops.
- Plant a sapling, test bone meal and natural growth, and confirm a nearby wall/chest is preserved when growth is blocked.
- Verify fruit icons, edible fruit, and sapling rendering on mobile and PC.
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

The entity intentionally keeps `format_version: 1.21.0` for the older breeding schema. Do not change it to 1.26 without migrating breeding to the newer `offspring_data` component. See [Microsoft's breedable reference](https://learn.microsoft.com/en-us/minecraft/creator/reference/content/entityreference/examples/entitycomponents/minecraftcomponent_breedable?view=minecraft-bedrock-stable).
