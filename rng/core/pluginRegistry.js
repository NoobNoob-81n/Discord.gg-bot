// ════════════════════════════════════════════════════════════════
// RNG SYSTEM — Plugin Registry
// Future systems (quests, weather, gloves, potions, seasons,
// achievements, trading) should be built as PLUGINS that register
// themselves here, rather than editing rollEngine.js, commands, or
// RngUserData directly.
//
// A plugin is just an object with a name and an init(context)
// function. `context` gives the plugin access to the shared eventBus,
// logger, config, and rngState — everything it needs, without ever
// importing/mutating other plugins' internals.
//
// Example future plugin (not implemented yet, illustrative only):
//
//   // plugins/quests/index.js
//   module.exports = {
//       name: 'quests',
//       init({ eventBus, EVENTS, logger }) {
//           eventBus.on(EVENTS.ON_ROLL, ({ userId }) => {
//               // increment a daily quest counter, etc.
//           });
//           logger.info('Quests plugin initialized.');
//       },
//   };
//
// Then in core/bootstrap.js (or wherever plugins are loaded):
//   pluginRegistry.register(require('../plugins/quests'));
// ════════════════════════════════════════════════════════════════
const { logger } = require('./logger');

class PluginRegistry {
    constructor() {
        this._plugins = new Map(); // name -> plugin object
    }

    /**
     * Registers a plugin. Does NOT call init() yet — that happens in
     * initAll(), so plugins are registered in any order but always
     * initialized in registration order.
     * @param {{name: string, init: Function}} plugin
     */
    register(plugin) {
        if (!plugin || typeof plugin.init !== 'function' || !plugin.name) {
            throw new Error('[PluginRegistry] A plugin must have a `name` string and an `init` function.');
        }
        if (this._plugins.has(plugin.name)) {
            logger.warn(`Plugin "${plugin.name}" is already registered — skipping duplicate registration.`);
            return;
        }
        this._plugins.set(plugin.name, plugin);
        logger.info(`Plugin registered: ${plugin.name}`);
    }

    /**
     * Calls init(context) on every registered plugin. Each plugin's
     * init is wrapped in try/catch so one broken plugin can't prevent
     * the rest of the RNG system (or other plugins) from starting.
     * @param {object} context - shared services passed to every plugin
     */
    initAll(context) {
        for (const [name, plugin] of this._plugins) {
            try {
                plugin.init(context);
            } catch (err) {
                logger.error(`Plugin "${name}" failed to initialize (isolated, other plugins still loaded):`, err);
            }
        }
    }

    list() {
        return [...this._plugins.keys()];
    }
}

// Singleton — one registry shared across the RNG system.
const pluginRegistry = new PluginRegistry();

module.exports = { pluginRegistry, PluginRegistry };
