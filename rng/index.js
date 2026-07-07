/**
 * rng/index.js
 * Plug-and-play entry point.
 *
 * Usage in your existing bot, without touching your existing command handler:
 *
 *   const { initRNGSystem } = require('./rng');
 *   initRNGSystem(client);
 *
 * That's it. The RNG system attaches its own messageCreate listener and
 * manages all of its own data under rng/data/. It never reads or writes
 * anything belonging to your existing bot.
 *
 * On init this module:
 *   1. Warms the aura/rarity cache (engine/cache.js) so the very first
 *      roll is already fast - no lazy-load hitch on a user's first command.
 *   2. Spins up the storage driver singleton (storage/index.js).
 *   3. Leaves the plugin manager ready for future systems to register
 *      against (see plugins/PluginManager.js) - none are registered yet.
 *   4. Attaches the message listener/command dispatcher.
 */
const cache = require('./engine/cache');
const StorageManager = require('./storage');
const pluginManager = require('./plugins/PluginManager');
const eventBus = require('./engine/eventBus');
const config = require('./config');
const constants = require('./constants');
const logger = require('./utils/logger');
const { attachMessageHandler } = require('./handlers/messageHandler');

function initRNGSystem(client) {
  cache.load();
  const storage = StorageManager.getInstance();

  // Future systems register themselves here, e.g.:
  // require('./plugins/gloves'); require('./plugins/quests');
  // (none registered yet - architecture only, per current scope)

  const { commandCount } = attachMessageHandler(client);

  process.on('exit', () => {
    try { storage.flush(); } catch { /* best effort on shutdown */ }
  });

  logger.info(`[rng] Aura RNG system loaded — ${commandCount} commands, prefix "${config.getPrefix()}"`);

  return {
    config,
    constants,
    cache,
    storage,
    eventBus,
    pluginManager,
    getPrefix: config.getPrefix,
    setPrefix: config.setPrefix
  };
}

module.exports = {
  initRNGSystem,
  config,
  constants,
  cache,
  eventBus,
  pluginManager,
  getPrefix: config.getPrefix,
  setPrefix: config.setPrefix
};
