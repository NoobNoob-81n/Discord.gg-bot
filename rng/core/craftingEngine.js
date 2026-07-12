// ════════════════════════════════════════════════════════════════
// RNG SYSTEM — Crafting Engine
// Validates a player owns every required ingredient BEFORE deducting
// anything (atomic — either the whole craft succeeds or nothing is
// touched), then deducts materials and grants the result.
// ════════════════════════════════════════════════════════════════
const { CRAFTING_RECIPES } = require('../data/craftingRecipes');
const { resolvePotionId } = require('../data/potions');
const { logger } = require('./logger');
const { eventBus } = require('./eventBus');
const { EVENTS } = require('../constants');

function getOwnedCount(rngData, userId, ingredient) {
    if (ingredient.type === 'potion') {
        const inv = rngData.potionInventory?.get(userId) || {};
        const resolvedId = resolvePotionId(ingredient.id);
        return inv[resolvedId] || 0;
    }
    if (ingredient.type === 'aura') {
        // Auras are tracked as individual inventory entries (one per
        // roll), so "owned count" means how many entries with this
        // auraId exist in the player's inventory array.
        const inv = rngData.inventory?.get(userId) || [];
        return inv.filter((entry) => entry.auraId === ingredient.id).length;
    }
    return 0;
}

/**
 * Checks whether a player has everything needed for a recipe.
 * @returns {{ canCraft: boolean, missing: Array<{type, id, have, need}> }}
 */
function checkRecipe(rngData, userId, recipeKey) {
    const recipe = CRAFTING_RECIPES[recipeKey];
    if (!recipe) return { canCraft: false, missing: [], error: `Unknown recipe: ${recipeKey}` };

    const missing = [];
    for (const ing of recipe.ingredients) {
        const have = getOwnedCount(rngData, userId, ing);
        if (have < ing.count) {
            missing.push({ type: ing.type, id: ing.id, have, need: ing.count });
        }
    }

    return { canCraft: missing.length === 0, missing };
}

/**
 * Attempts to craft a recipe. Returns { ok: true, resultPotionId,
 * resultCount } on success, or { ok: false, missing } on failure.
 * Deduction only happens if EVERY ingredient check passes — never a
 * partial deduction.
 * @param {boolean} bypassRequirements - if true (owner-only callers),
 *   skips the ingredient check entirely and does NOT deduct anything,
 *   just grants the result. Per spec: "Owner can do everything."
 */
function craft(rngData, userId, recipeKey, { bypassRequirements = false } = {}) {
    const recipe = CRAFTING_RECIPES[recipeKey];
    if (!recipe) {
        return { ok: false, error: `Unknown recipe: ${recipeKey}` };
    }

    if (!bypassRequirements) {
        const { canCraft, missing } = checkRecipe(rngData, userId, recipeKey);
        if (!canCraft) {
            eventBus.emitSafe(EVENTS.ON_CRAFT_FAILED, { userId, recipeKey, missing });
            return { ok: false, missing };
        }

        // ── Deduct every ingredient. Since checkRecipe already confirmed
        // sufficient quantities of everything, these deductions cannot
        // fail partway through in a way that leaves inconsistent state —
        // but we still deduct all potions first, then auras, in a single
        // synchronous pass with no `await` in between, so nothing else
        // can interleave and change inventory counts mid-craft. ──
        for (const ing of recipe.ingredients) {
            if (ing.type === 'potion') {
                const inv = rngData.potionInventory.get(userId) || {};
                const resolvedId = resolvePotionId(ing.id);
                inv[resolvedId] -= ing.count;
                rngData.potionInventory.set(userId, inv);
            } else if (ing.type === 'aura') {
                const inv = rngData.inventory.get(userId) || [];
                let toRemove = ing.count;
                const kept = [];
                for (const entry of inv) {
                    if (toRemove > 0 && entry.auraId === ing.id) {
                        toRemove--;
                        continue;
                    }
                    kept.push(entry);
                }
                rngData.inventory.set(userId, kept);
            }
        }
    }

    // ── Grant the result ──
    if (!rngData.potionInventory) rngData.potionInventory = new Map();
    const resultInv = rngData.potionInventory.get(userId) || {};
    resultInv[recipe.resultPotionId] = (resultInv[recipe.resultPotionId] || 0) + recipe.resultCount;
    rngData.potionInventory.set(userId, resultInv);

    rngData._markDirty();
    logger.info(`Craft success: user=${userId} recipe=${recipeKey} result=${recipe.resultPotionId}x${recipe.resultCount}${bypassRequirements ? ' (OWNER BYPASS)' : ''}`);
    eventBus.emitSafe(EVENTS.ON_POTION_CRAFTED, { userId, recipeKey, resultPotionId: recipe.resultPotionId, resultCount: recipe.resultCount });

    return { ok: true, resultPotionId: recipe.resultPotionId, resultCount: recipe.resultCount };
}

function listRecipes() {
    return Object.keys(CRAFTING_RECIPES);
}

module.exports = { checkRecipe, craft, listRecipes, getOwnedCount };
