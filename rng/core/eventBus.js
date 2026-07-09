// ════════════════════════════════════════════════════════════════
// RNG SYSTEM — Event Bus
// A tiny internal pub/sub system. Core game logic EMITS events
// (onRoll, onAuraFound, etc.) and future systems (quests,
// achievements, weather, seasons) SUBSCRIBE to them instead of
// editing rollEngine.js / commands directly.
//
// This is what makes the plugin architecture (see core/pluginRegistry.js)
// possible: a quest plugin can do `eventBus.on(EVENTS.ON_ROLL, ...)`
// without ever touching roll.js.
//
// Built on Node's built-in EventEmitter — no external dependency
// needed for something this simple.
// ════════════════════════════════════════════════════════════════
const { EventEmitter } = require('events');
const { logger } = require('./logger');

class RngEventBus extends EventEmitter {
    constructor() {
        super();
        // Raise the default max-listeners cap — with many future
        // plugins all listening to onRoll, the default of 10 would
        // trigger Node's "possible memory leak" warning unnecessarily.
        this.setMaxListeners(50);
    }

    /**
     * Emits an event, catching and logging any listener errors so a
     * broken plugin listener can NEVER crash the roll that triggered
     * it, or the rest of the bot. This is a key resilience guarantee:
     * game logic must never depend on plugin listeners succeeding.
     */
    emitSafe(eventName, payload) {
        const listeners = this.listeners(eventName);
        for (const listener of listeners) {
            try {
                listener(payload);
            } catch (err) {
                logger.error(`Event listener for "${eventName}" threw an error (isolated, did not crash caller):`, err);
            }
        }
    }
}

// Singleton — the whole RNG system shares one event bus instance.
const eventBus = new RngEventBus();

module.exports = { eventBus };
