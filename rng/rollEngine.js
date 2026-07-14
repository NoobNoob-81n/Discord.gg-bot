// ════════════════════════════════════════════════════════════════
// RNG SYSTEM — Roll Engine
// Pure probability logic. Uses the CACHED aura list from
// core/auraLoader.js (never reads disk per-roll — see that module's
// caching guarantee). Emits events via the event bus so future
// plugins (quests, achievements, weather) can react to rolls without
// this file ever needing to know they exist.
// ════════════════════════════════════════════════════════════════
const auraLoader = require('./core/auraLoader');
const { eventBus } = require('./core/eventBus');
const { EVENTS, SPECIAL_AURA_IDS } = require('./constants');
const { logger } = require('./core/logger');

/**
 * Performs a single weighted roll across all cached auras.
 * @param {object} opts
 * @param {string} opts.userId - who is rolling (for event payloads/logging)
 * @param {number} opts.luckBonus - percentage luck boost (0 = none, 25 = +25%)
 * @param {boolean} opts.godlikeNoobAvailable - whether Godlike Noob can drop
 *   this roll (false if singleton enforcement means someone already holds it)
 * @returns {object} the full aura object that was rolled
 */
function rollAura({ userId = null, luckBonus = 0, godlikeNoobAvailable = true } = {}) {
    const allAuras = auraLoader.getAllAuras();
    const godlikeNoob = auraLoader.getGodlikeNoob();

    // Luck reduces EFFECTIVE odds proportionally to how rare an aura
    // is — see the comment below for why a flat multiplier doesn't
    // work (caught via testing during initial development: a uniform
    // scale cancels out after normalization and does nothing).
    //
    // effectiveOdds = 1 + (odds - 1) / (1 + luckBonus/100)
    // At luckBonus=0: unchanged. As luckBonus grows, effectiveOdds
    // shrinks toward 1 asymptotically but never reaches it, so nothing
    // is ever literally guaranteed — luck improves odds, never
    // guarantees an impossible aura, matching the spec.
    const luckDivisor = 1 + luckBonus / 100;
    const effectiveOdds = (odds) => 1 + (odds - 1) / luckDivisor;

    const pool = [];

    // Determine rarity floor based on luckBonus
    let minOdds = 1; // Default: no floor
    if (luckBonus >= 50) minOdds = 2; // e.g., filter out 1 in 1
    if (luckBonus >= 150) minOdds = 5; // e.g., filter out 1 in 2, 1 in 3, 1 in 4
    if (luckBonus >= 300) minOdds = 10;
    if (luckBonus >= 600) minOdds = 20;
    if (luckBonus >= 1000) minOdds = 50;
    if (luckBonus >= 2000) minOdds = 100;
    if (luckBonus >= 5000) minOdds = 200;
    if (luckBonus >= 7500) minOdds = 500; // Transcendent Potion level

    const filteredAuras = allAuras.filter(aura => aura.odds >= minOdds);

    for (const aura of filteredAuras) {
        // Skip Godlike Noob here if present in allAuras — handled
        // separately below via godlikeNoobAvailable, since its
        // availability depends on singleton-holder state that this
        // pure function doesn't track itself.
        if (aura.id === SPECIAL_AURA_IDS.GODLIKE_NOOB) continue;
        pool.push({ aura, weight: 1 / effectiveOdds(aura.odds) });
    }

    // If Godlike Noob is available and its odds meet the rarity floor, add it to the pool
    if (godlikeNoobAvailable && godlikeNoob && godlikeNoob.odds >= minOdds) {
        pool.push({ aura: godlikeNoob, weight: 1 / effectiveOdds(godlikeNoob.odds) });
    }

    const totalWeight = pool.reduce((sum, p) => sum + p.weight, 0);
    let roll = Math.random() * totalWeight;

    let result = pool[pool.length - 1].aura; // fallback for float edge case
    for (const entry of pool) {
        roll -= entry.weight;
        if (roll <= 0) {
            result = entry.aura;
            break;
        }
    }

    logger.roll(userId, result);

    eventBus.emitSafe(EVENTS.ON_ROLL, { userId, aura: result });
    eventBus.emitSafe(EVENTS.ON_AURA_FOUND, { userId, aura: result });
    if (result.odds >= 500) {
        eventBus.emitSafe(EVENTS.ON_RARE_AURA, { userId, aura: result });
    }
    if (result.id === SPECIAL_AURA_IDS.GODLIKE_NOOB) {
        eventBus.emitSafe(EVENTS.ON_GODLIKE_NOOB_FOUND, { userId, aura: result });
    }

    return result;
}

function getAuraById(auraId) {
    return auraLoader.getAuraById(auraId);
}

function getAllAurasSortedByRarity() {
    return [...auraLoader.getAllAuras()].sort((a, b) => b.odds - a.odds);
}

function getTotalAuraCount() {
    return auraLoader.getAllAuras().length;
}

module.exports = {
    rollAura,
    getAuraById,
    getAllAurasSortedByRarity,
    getTotalAuraCount,
};
