// ════════════════════════════════════════════════════════════════
// RNG SYSTEM — Luck Calculator
// Computes a player's total effective luck bonus at roll-time by
// summing: base config default + equipped glove + active potions
// (expired potions are pruned automatically).
//
// Gloves/potions data doesn't exist yet (later stage), so this
// currently only handles expiration pruning and returns the config
// default. Structured so gloves.js/potions.js plug in later without
// changing this file's public signature.
// ════════════════════════════════════════════════════════════════
const config = require('../config/config');

/**
 * Returns the total luck bonus (%) currently active for a user, and
 * prunes any expired potions from their activePotions list as a side
 * effect (so expired entries don't accumulate forever in storage).
 * @param {import('../RngUserData').RngUserData} rngData
 * @param {string} userId
 * @returns {number} total luck bonus percentage
 */
function getEffectiveLuck(rngData, userId) {
    let luck = config.defaultLuckBonus;

    // Prune expired potions and sum active ones' luck bonuses.
    const potions = rngData.activePotions.get(userId) || [];
    const now = Date.now();
    const stillActive = potions.filter((p) => p.expiresAt > now);

    if (stillActive.length !== potions.length) {
        rngData.activePotions.set(userId, stillActive);
        rngData._markDirty();
    }

    for (const p of stillActive) {
        luck += p.luckBonus || 0;
    }

    // Glove bonus — reserved for when gloves.js exists. Currently a
    // no-op since equippedGlove just stores an id with no data behind
    // it yet; this comment marks exactly where that hookup goes.
    // const gloveId = rngData.equippedGlove.get(userId);
    // if (gloveId) { luck += getGloveLuckBonus(gloveId); }

    return luck;
}

module.exports = { getEffectiveLuck };
