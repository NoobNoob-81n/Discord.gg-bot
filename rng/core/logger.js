// ════════════════════════════════════════════════════════════════
// RNG SYSTEM — Logger
// Centralized logging so every module logs consistently and so
// logging behavior (on/off, verbosity) is controlled from config,
// not scattered console.log calls.
// ════════════════════════════════════════════════════════════════
const config = require('../config/config');

const PREFIX = '[RNG]';

function timestamp() {
    return new Date().toISOString();
}

const logger = {
    info(...args) {
        if (!config.logToConsole) return;
        console.log(`${PREFIX} [INFO] ${timestamp()}`, ...args);
    },

    warn(...args) {
        if (!config.logToConsole) return;
        console.warn(`${PREFIX} [WARN] ${timestamp()}`, ...args);
    },

    error(...args) {
        // Errors always log regardless of config — silencing errors
        // entirely would make production issues invisible.
        console.error(`${PREFIX} [ERROR] ${timestamp()}`, ...args);
    },

    /** Logs a roll result. Respects config.logRolls / logRareFindsOnly. */
    roll(userId, aura) {
        if (!config.logRolls) return;
        if (config.logRareFindsOnly && aura.odds < config.rareLogThresholdOdds) return;
        console.log(`${PREFIX} [ROLL] ${timestamp()} user=${userId} aura=${aura.id} rarity=${aura.rarity} odds=1-in-${aura.odds.toLocaleString()}`);
    },

    /** Logs an admin action for audit purposes (spawn, give, force weather, etc.) */
    admin(actorId, action, details = {}) {
        console.log(`${PREFIX} [ADMIN] ${timestamp()} actor=${actorId} action=${action}`, details);
    },

    /** Logs a completed trade between two users. */
    trade(userIdA, userIdB, details = {}) {
        console.log(`${PREFIX} [TRADE] ${timestamp()} between=${userIdA},${userIdB}`, details);
    },
};

module.exports = { logger };
