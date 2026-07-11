// ════════════════════════════════════════════════════════════════
// RNG SYSTEM — State Bootstrap
// The single entry point that wires everything together: storage
// adapter, RngUserData, aura cache, autosave loop, and plugins.
// index.js should require and call init() from this file exactly
// once, at bot startup.
// ════════════════════════════════════════════════════════════════
const { JsonStorageAdapter } = require('./storage/JsonStorageAdapter.js');
const { RngUserData } = require('../RngUserData');
const auraLoader = require('./auraLoader');
const { eventBus } = require('./eventBus');
const { pluginRegistry } = require('./pluginRegistry');
const { logger } = require('./logger');
const config = require('../config/config');
const constants = require('../constants');

let _rngData = null;
let _storage = null;
let _autosaveTimer = null;
let _initialized = false;

/**
 * Initializes the whole RNG system. Safe to call once; calling twice
 * logs a warning and returns the existing instance rather than
 * double-initializing (which would create a second autosave timer).
 * @returns {RngUserData}
 */
async function init() {
    if (_initialized) {
        logger.warn('rngState.init() called more than once — returning existing instance.');
        return _rngData;
    }

    logger.info('Initializing RNG system...');

    // 1. Load aura data into memory (cached — see auraLoader's guarantee)
    auraLoader.reload();

    // 2. Set up storage + load persisted state
    _storage = new JsonStorageAdapter();
    _rngData = new RngUserData(_storage);
    const saved = await _storage.load();
    _rngData.fromJSON(saved);

    // 3. Start the autosave loop — only writes to disk if something
    // actually changed (isDirty), avoiding unnecessary disk I/O.
    _autosaveTimer = setInterval(async () => {
        if (_storage.isDirty()) {
            try {
                await _storage.save(_rngData.toJSON());
                logger.info('RNG autosave complete.');
            } catch (err) {
                logger.error('RNG autosave failed:', err.message);
            }
        }
    }, config.autosaveIntervalMs);

    // 4. Initialize any registered plugins, giving them access to the
    // shared services they'd need (event bus, logger, config, state).
    // Register new plugins
    pluginRegistry.register(require("../plugins/questRewards"));
    pluginRegistry.register(require("../plugins/rngCoins"));

    pluginRegistry.initAll({
        eventBus,
        EVENTS: constants.EVENTS,
        logger,
        config,
        rngData: _rngData,
        auraLoader,
    });

    _initialized = true;
    logger.info('RNG system initialized successfully.');
    return _rngData;
}

/**
 * Returns the shared RngUserData instance. Throws if init() hasn't
 * run yet — fails loudly rather than silently operating on nothing.
 */
function getRngData() {
    if (!_initialized) {
        throw new Error('[rngState] getRngData() called before init() — call init() once at bot startup.');
    }
    return _rngData;
}

/** Forces an immediate save regardless of dirty state. Useful for
 * graceful shutdown handlers. */
async function forceSave() {
    if (!_storage || !_rngData) return;
    await _storage.save(_rngData.toJSON());
    logger.info('RNG force-save complete.');
}

/** Stops the autosave timer — call during graceful shutdown. */
function shutdown() {
    if (_autosaveTimer) clearInterval(_autosaveTimer);
}

module.exports = { init, getRngData, forceSave, shutdown };
