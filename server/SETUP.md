# Fruity Friends AI — Dedicated Server setup

Run the official Bedrock Dedicated Server and this Python service **on the same Windows or Linux computer**. Mobile and PC players connect to that server normally. You need Python 3.10+, an OpenAI API key with API billing/access, and a Bedrock server version compatible with your mobile/PC clients. A ChatGPT subscription is not used by this service.

The included model setting is `gpt-4.1-mini`; override it with `OPENAI_MODEL` if desired. The integration uses the [OpenAI Responses API](https://developers.openai.com/api/docs/guides/text). API calls consume usage on the key's account. See [model information](https://developers.openai.com/api/docs/models/gpt-4.1-mini).

## 1. Prepare a test world

Use a copy of a world while testing. In Minecraft's world settings enable the **Beta APIs** experiment, save, and transfer that world to your Dedicated Server's `worlds` folder. Set `level-name` in `server.properties` to that world's folder name. Keep server and clients on matching supported releases.

The networking and admin modules are [Dedicated Server experimental APIs](https://learn.microsoft.com/en-us/minecraft/creator/documents/bedrockserver/scripting?view=minecraft-bedrock-stable). They do not run in ordinary local worlds or Realms.

## 2. Install the server edition

Stop BDS. Extract `Fruity-Friends-Dedicated-Server.zip` into its server directory. The archive contains:

```text
behavior_packs/Plum_BP/
resource_packs/Plum_RP/
plum-service/bridge.py
plum-service/config/
world-pack-lists/
```

Copy the two JSON files from `world-pack-lists` into `worlds/YOUR_WORLD/`. **If your world already uses packs, merge the Fruity Friends entry into each existing array instead of replacing it.** The entries are:

Behavior pack:

```json
[{"pack_id":"01d84fd1-31dd-4b92-a942-c8e59ce38191","version":[1,1,0]}]
```

Resource pack:

```json
[{"pack_id":"834d72cc-8c7f-498f-adfa-269e215f86e8","version":[1,1,0]}]
```

Set `texturepack-required=true` in `server.properties` so players receive Plum's appearance. Do not enable the offline pack alongside the AI pack; they are two editions of the same add-on.

**Updating an existing Fruity Friends installation:** replace the pack folders and `plum-service/bridge.py`, change both existing world-pack entries to `[1,2,0]`, and restart both processes. Preserve your current credentials/configuration. New plum and apple trees appear only in newly generated terrain; explore new plains/forests or plant a Creative sapling in an old area.

## 3. Allow the scripts to reach their local service

Inside the BDS directory create:

```text
config/a91c511c-d9d5-48e5-82c9-25cc48706cbb/
```

This is the **script module UUID**, not the pack UUID. Copy `plum-service/config/permissions.json` and `variables.json` there. The permission file enables the four required modules and restricts outbound HTTP to the loopback service. `module_permissions` HTTP limits are supported in recent BDS releases; see [Bedrock 26.10 server changes](https://feedback.minecraft.net/hc/en-us/articles/44418129038733-Minecraft-Bedrock-Edition-26-10-Tiny-Takeover).

The add-on manifest uses `1.0.0-beta` for server-net/server-admin. These are experimental: if your BDS Content Log lists a different accepted manifest version, use **that exact version** for the corresponding dependency in `behavior_packs/Plum_BP/manifest.json`. npm's versioned type-package suffix is not automatically the runtime manifest version. From source you can rebuild with:

```sh
python3 tools/build.py --net-version ACCEPTED_VERSION --admin-version ACCEPTED_VERSION
```

## 4. Set the private credentials and start the service

Generate a bridge token locally:

```sh
python3 -c "import secrets; print(secrets.token_hex(32))"
```

On Windows use `py` if needed. Copy that token into a new `secrets.json` inside the script UUID folder:

```json
{"plum_bridge_token":"YOUR_GENERATED_TOKEN"}
```

The same token goes in `PLUM_BRIDGE_TOKEN` for the Python process. The **OpenAI key goes only in `OPENAI_API_KEY`**, never in the add-on, JavaScript, or BDS resource packs. Keep both credentials private.

Linux / bash — these commands prompt without echoing credentials or putting them in shell history:

```sh
read -rsp 'OpenAI API key: ' OPENAI_API_KEY
echo
export OPENAI_API_KEY
read -rsp 'Plum bridge token: ' PLUM_BRIDGE_TOKEN
echo
export PLUM_BRIDGE_TOKEN
python3 plum-service/bridge.py
```

Windows / PowerShell 7:

```powershell
$env:OPENAI_API_KEY = Read-Host 'OpenAI API key' -MaskInput
$env:PLUM_BRIDGE_TOKEN = Read-Host 'Plum bridge token' -MaskInput
py plum-service/bridge.py
```

Keep this process running, then start BDS in another terminal. The bridge listens on **127.0.0.1:8787**. Do not forward port 8787 on your router; only the normal Minecraft server port needs player access. If using containers, BDS and the service need the same loopback/network namespace for these defaults; a separate-container deployment needs adjusted networking and access controls.

The service prints a listening message. `http://127.0.0.1:8787/health` reports process readiness; it does not check your OpenAI key. Open the address locally in a browser if troubleshooting.

## 5. Join and talk

On mobile or Windows Bedrock, add the server address and configured Bedrock port, join, and accept the resources. Spawn and tame Plum as described in the main README, hold a **book**, and interact. Choose **Ask a question**.

Try “How do I make a bed?” followed by “What materials do I need?” The conversation title identifies AI chat. If the AI connection fails, Plum explicitly switches to a built-in offline answer. Turning off the bridge does not disable following, breeding, or healing.

For breeding food, find plum trees in new plains/forest terrain and break their fruit-speckled leaves in Survival. Each leaf has a 35% fruit-drop chance and a separate 10% sapling-drop chance. Plant saplings on soil with a clear 5-wide, 6-high space; wait for random growth or use bone meal. Feed two tamed adult friends a plum each. Apples no longer breed them. Leaves do not automatically decay.

## Data and limits

Only submitted questions go to OpenAI, together with up to four recent exchanges and a little game context (dimension and whether Plum is a baby). The bridge uses a hashed player identifier locally to separate histories; player IDs, names, coordinates, and inventory are not sent to OpenAI by this integration. Players can still type personal information themselves.

History is memory-only and expires after 30 minutes of inactivity, cleaned on the next request. Restarting the bridge clears it. `store:false` disables Responses application-state storage; it is not a guarantee of zero provider retention. The bridge does not log question text. Answers are text only and never execute game or server commands.

There is a 5-second per-player cooldown, a shared limit of 30 requests per minute, at most four simultaneous AI calls, and a 400-character question limit. These controls bound traffic, not a dollar budget. Configure account/project usage controls separately if needed.

## Troubleshooting

- **Pack dependency error / no conversation or healing:** inspect BDS's Content Log, check Beta APIs, module permissions, and API versions. A missing networking module prevents the server script from loading; offline fallback only handles failures after scripts load.
- **Offline replies in the AI edition:** confirm the bridge is running on the BDS computer, the two tokens match, and the API key has access/billing. The bridge hides provider error details from players.
- **Wrong texture / invisible cube:** ensure both packs are active and accept the resource download.
- **No mobile Talk button:** hold a normal book, aim directly at Plum, and use your touch layout's interact action.
- **Plum will not breed:** tame both adults, feed each a plum, keep them close, and wait for any cooldown. Babies must grow first.
- **Player's AI question is rate limited:** wait a few seconds; local help is still available.

The packages have passed automated checks but still require a real in-game test. No server has been deployed or live API call verified as part of this build.
