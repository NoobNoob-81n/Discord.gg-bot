// ════════════════════════════════════════════════════════════════
// RNG SYSTEM — Logger
// ════════════════════════════════════════════════════════════════
const config = require('../config/config');
const PREFIX = '[RNG]';
function timestamp() { return new Date().toISOString(); }

const logger = {
    info(...args) { if (config.logToConsole) console.log(`${PREFIX} [INFO] ${timestamp()}`, ...args); },
    warn(...args) { if (config.logToConsole) console.warn(`${PREFIX} [WARN] ${timestamp()}`, ...args); },
    error(...args) { console.error(`${PREFIX} [ERROR] ${timestamp()}`, ...args); },
    roll(userId, aura) {
        if (!config.logRolls) return;
        if (config.logRareFindsOnly && aura.odds < config.rareLogThresholdOdds) return;
        console.log(`${PREFIX} [ROLL] ${timestamp()} user=${userId} aura=${aura.id} rarity=${aura.rarity} odds=1-in-${aura.odds.toLocaleString()}`);
    },
    admin(actorId, action, details = {}) {
        console.log(`${PREFIX} [ADMIN] ${timestamp()} actor=${actorId} action=${action}`, details);
    },
    trade(userIdA, userIdB, details = {}) {
        console.log(`${PREFIX} [TRADE] ${timestamp()} between=${userIdA},${userIdB}`, details);
    },
};

module.exports = { logger };
