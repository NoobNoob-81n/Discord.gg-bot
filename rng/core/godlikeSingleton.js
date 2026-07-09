// ════════════════════════════════════════════════════════════════
// RNG SYSTEM — Godlike Noob Singleton Guard
// Enforces "only ONE naturally-rolled Godlike Noob may exist at a
// time" (configurable via config.godlikeNoobUniqueGlobally).
// ════════════════════════════════════════════════════════════════
const config = require('../config/config');

/**
 * Whether Godlike Noob is currently allowed to drop from a natural
 * roll. False if singleton enforcement is on AND someone already
 * holds it.
 * @param {import('../RngUserData').RngUserData} rngData
 */
function isGodlikeNoobAvailable(rngData) {
    if (!config.godlikeNoobUniqueGlobally) return true;
    return rngData.godlikeNoobHolder === null;
}

/**
 * Records that a user now holds the Godlike Noob (natural roll or
 * admin spawn). Overwrites any previous holder — if an admin spawns
 * a second one with singleton enforcement OFF, both can coexist and
 * this just tracks the most recent holder for display purposes.
 * @param {import('../RngUserData').RngUserData} rngData
 * @param {string} userId
 */
function claimGodlikeNoob(rngData, userId) {
    rngData.godlikeNoobHolder = userId;
    rngData._markDirty();
}

/**
 * Releases the Godlike Noob (e.g. if it's traded away or an admin
 * resets it), making it available to roll again.
 * @param {import('../RngUserData').RngUserData} rngData
 */
function releaseGodlikeNoob(rngData) {
    rngData.godlikeNoobHolder = null;
    rngData._markDirty();
}

module.exports = { isGodlikeNoobAvailable, claimGodlikeNoob, releaseGodlikeNoob };
