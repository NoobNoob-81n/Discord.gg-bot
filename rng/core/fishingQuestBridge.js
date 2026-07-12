// ════════════════════════════════════════════════════════════════
// RNG SYSTEM — Fishing Quest Bridge
// Fixes "fishing quests don't update progress." Root cause: the
// RNG quest engine has ALWAYS worked correctly (see questEngine.js
// tests) — but nothing in index.js was actually calling
// reportProgress() when a fish was caught. This file provides ONE
// clean function to call from your fish command, plus loud
// diagnostic logging so a missing/broken wire-up is immediately
// visible in your logs instead of silently doing nothing.
// ════════════════════════════════════════════════════════════════
const { reportProgress } = require('./questEngine');
const { logger } = require('./logger');

let _callCount = 0;
let _lastCallAt = null;

/**
 * Call this EXACTLY ONCE per successful fish catch, from your
 * existing fish command in index.js. See WIRING_V3.md for the exact
 * one-line integration.
 *
 * @param {import('../RngUserData').RngUserData} rngData
 * @param {string} userId
 * @param {object} fishDetails
 * @param {string} fishDetails.rarity - the caught fish's rarity string
 *   (must match what your quest definitions expect — see
 *   data/quests.js's fish_* entries for the exact rarity strings
 *   they check against: 'Legendary', 'Mythical', 'Secret', etc.)
 * @param {string} [fishDetails.biome] - optional, for biome-based quests
 */
function onFishCaught(rngData, userId, fishDetails) {
    _callCount++;
    _lastCallAt = Date.now();

    if (!rngData) {
        logger.error('[fishingQuestBridge] onFishCaught called with no rngData — RNG system may not be initialized yet.');
        return;
    }
    if (!userId) {
        logger.error('[fishingQuestBridge] onFishCaught called with no userId — cannot track quest progress.');
        return;
    }
    if (!fishDetails || !fishDetails.rarity) {
        logger.warn('[fishingQuestBridge] onFishCaught called without a rarity — fish rarity quests will not trigger for this catch.');
    }

    reportProgress(rngData, userId, {
        type: 'fish_caught',
        rarity: fishDetails?.rarity || 'Unknown',
        biome: fishDetails?.biome || null,
        count: 1,
    });

    logger.info(`[fishingQuestBridge] Reported fish catch: user=${userId} rarity=${fishDetails?.rarity}`);
}

/**
 * Call this from your fish-SELLING code if you want the
 * 'fish_sell_value' quest to work.
 */
function onFishSold(rngData, userId, saleAmount) {
    if (!rngData || !userId || !Number.isFinite(saleAmount)) {
        logger.warn('[fishingQuestBridge] onFishSold called with invalid arguments — skipping quest progress.');
        return;
    }
    reportProgress(rngData, userId, { type: 'fish_sold', count: saleAmount });
    logger.info(`[fishingQuestBridge] Reported fish sale: user=${userId} amount=${saleAmount}`);
}

/**
 * Diagnostic helper — run `_rngtest fishbridge` (see
 * handlers/admin/rngtest.js) to check whether this bridge has EVER
 * been called since the bot started. If callCount stays 0 after you
 * go fish in Discord, the hook in index.js is still missing/broken.
 */
function getDiagnostics() {
    return { callCount: _callCount, lastCallAt: _lastCallAt };
}

module.exports = { onFishCaught, onFishSold, getDiagnostics };
