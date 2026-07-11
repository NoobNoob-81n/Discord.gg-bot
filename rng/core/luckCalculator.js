// ════════════════════════════════════════════════════════════════
// RNG SYSTEM — Luck Calculator
// Computes a player's BASE luck bonus — config default + equipped
// glove — deliberately EXCLUDING potions.
//
// IMPORTANT: potion effects are intentionally handled SEPARATELY by
// core/potionEngine.js's getActivePotionEffects(), which roll.js
// calls directly so it can pass { consumeOneTime: true } at the
// exact moment of rolling (one-time potions like Heavenly must be
// consumed by the roll that uses them, not by an earlier luck check).
// If this function also read potions, roll.js would double-count
// them — caught and deliberately avoided during v2 development when
// potions/quests were added on top of the original luck system.
// ════════════════════════════════════════════════════════════════
const config = require('../config/config');

/**
 * Returns the BASE luck bonus (%) for a user — config default plus
 * equipped glove bonus. Does NOT include potion effects; callers
 * that need the full picture (like handlers/roll.js) must separately
 * call potionEngine.getActivePotionEffects() and add it themselves.
 * @param {import('../RngUserData').RngUserData} rngData
 * @param {string} userId
 * @returns {number} base luck bonus percentage
 */
function getEffectiveLuck(rngData, userId) {
    let luck = config.defaultLuckBonus;

    // Glove bonus — reserved for when gloves.js exists.
    // const gloveId = rngData.equippedGlove.get(userId);
    // if (gloveId) { luck += getGloveLuckBonus(gloveId); }

    return luck;
}

module.exports = { getEffectiveLuck };
