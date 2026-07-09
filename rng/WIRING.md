# RNG System — Wiring Instructions

Follow these steps in order to plug this into your existing bot.

## 1. Copy the folder

Copy the entire `rng-system/` folder into your bot's repo root, so you
have `your-bot-repo/rng-system/...` alongside your existing `index.js`.

## 2. Install no new dependencies

This system only uses `discord.js` (already installed) and Node's
built-in modules. Nothing new to `npm install`.

## 3. Generate the aura database (one-time, before first deploy)

From inside the `rng-system/` folder, run:

```
node generate-auras.js
```

This creates `data/auras/*.json` (one file per rarity tier). You only
need to re-run this if you want to regenerate/rebalance the procedural
auras — the `developer.json` file (Godlike Noob) is hand-authored and
untouched by this script.

## 4. Add to index.js

Near your other `require()` calls at the top of `index.js`, add:

```js
const rngState = require('./rng-system/core/rngState');
const rngCommandRouter = require('./rng-system/core/commandRouter');
```

Inside your `client.once('ready', async () => { ... })` handler,
**before** the dashboard server wiring (or anywhere after the bot is
ready), add:

```js
// ── Initialize the Aura RNG system ──
const rngData = await rngState.init();
console.log('✨ Aura RNG system ready.');
```

## 5. Hook into your existing messageCreate listener

Find your main `client.on('messageCreate', async message => { ... })`
listener (the big one that handles your existing prefix commands).
Near the VERY TOP of that handler — before your existing prefix-parsing
logic — add:

```js
// ── RNG system gets first look at every message ──
const rngHandled = await rngCommandRouter.handleMessage(message, {
    rngData: rngState.getRngData(),
    OWNER_ID,
    client,
});
if (rngHandled) return; // it was an RNG command — don't process further
```

This must come before your existing bot's own prefix check, since the
RNG system has its own independent prefix (default `_`) that has
nothing to do with your main bot's prefix. Putting it first means an
RNG command will never accidentally get swallowed by your existing
command parsing.

## 6. Verify

Restart the bot and try:

```
_roll
_inventory
_help
```

Then, as the owner, try the test suite:

```
_rngtest roll 50000
_rngtest storage
_rngtest singleton
```

## What's NOT built yet (future stages, per the original request)

- Gloves, potions (data files + effects wiring — luckCalculator.js has
  the hookup points already commented in)
- Quests, achievements, titles
- Seasons, season pass, season shop
- Trading, marketplace
- Weather system
- `_market`, `_shop`, `_gloves`, `_potions`, `_quests`, `_weather`,
  `_trade` commands are referenced in the original spec but their
  handler files don't exist yet — only the core roll loop is built.

Each of these should be built as a **plugin** (see
`core/pluginRegistry.js`'s doc comment for the exact pattern) so they
register themselves via `eventBus` listeners rather than requiring
edits to `rollEngine.js` or the command router.
