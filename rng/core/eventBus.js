// ════════════════════════════════════════════════════════════════
// RNG SYSTEM — Event Bus
// ════════════════════════════════════════════════════════════════
const { EventEmitter } = require('events');
const { logger } = require('./logger');

class RngEventBus extends EventEmitter {
    constructor() {
        super();
        this.setMaxListeners(50);
    }

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

const eventBus = new RngEventBus();

module.exports = { eventBus };
