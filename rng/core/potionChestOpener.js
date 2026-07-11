// ════════════════════════════════════════════════════════════════
// RNG SYSTEM — Potion Chest Opener
// Opens potion chests, each independently rolling one potion from
// POTION_CHEST_ODDS (the weighted table in data/potions.js).
// ════════════════════════════════════════════════════════════════
const { POTION_CHEST_ODDS, POTIONS } = require('../data/potions');
const { logger } = require('./logger');

function rollOnePotion() {
    const roll = Math.random() * 100;
    let cumulative = 0;
    for (const entry of POTION_CHEST_ODDS) {
        cumulative += entry.chancePercent;
        if (roll <= cumulative) return entry.potionId;
    }
    // Floating point edge case fallback — return the last (rarest) entry
    return POTION_CHEST_ODDS[POTION_CHEST_ODDS.length - 1].potionId;
}

/**
 * Opens `count` potion chests for a user, adding the resulting
 * potions to their potionInventory and returning a summary list of
 * what was obtained (for the "you got X, Y, Z" reply message).
 * @returns {Array<{potionId: string, name: string}>}
 */
function openChests(rngData, userId, count) {
    if (!rngData.potionInventory) rngData.potionInventory = new Map();
    const inventory = rngData.potionInventory.get(userId) || {};

    const results = [];
    for (let i = 0; i < count; i++) {
        const potionId = rollOnePotion();
        inventory[potionId] = (inventory[potionId] || 0) + 1;
        results.push({ potionId, name: POTIONS[potionId].name, emoji: POTIONS[potionId].emoji });
    }

    rngData.potionInventory.set(userId, inventory);
    rngData._markDirty();
    logger.info(`Opened ${count} potion chests for user=${userId}`);

    return results;
}

module.exports = { openChests, rollOnePotion };
