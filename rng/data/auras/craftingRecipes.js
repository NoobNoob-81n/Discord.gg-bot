// ════════════════════════════════════════════════════════════════
// RNG SYSTEM — Crafting Recipes
// Each recipe declares what it produces and what it consumes.
// Ingredients can reference either:
//   { type: 'potion', id: 'luck_potion_1', count: 10 }
//   { type: 'aura',   id: 'aura_zeus',     count: 1 }
//
// The crafting engine (core/craftingEngine.js) checks the player
// owns >= count of every ingredient before allowing a craft, and
// deducts exactly those amounts on success — see that file for the
// actual transaction logic.
// ════════════════════════════════════════════════════════════════
const CRAFTING_RECIPES = {
    // ── Luck Potion tier chain — the standard upgrade pattern that
    // every future potion line should follow unless a recipe
    // overrides it (as most of the ones below do). ──
    luck_potion_2: {
        resultPotionId: 'luck_potion_2',
        resultCount: 1,
        ingredients: [
            { type: 'potion', id: 'luck_potion_1', count: 10 },
        ],
    },
    luck_potion_3: {
        resultPotionId: 'luck_potion_3',
        resultCount: 1,
        ingredients: [
            { type: 'potion', id: 'luck_potion_2', count: 100 },
        ],
    },

    // ── Named recipes from the spec ──
    heavenly_potion: {
        resultPotionId: 'heavenly_potion',
        resultCount: 1,
        ingredients: [
            { type: 'potion', id: 'luck_potion_1', count: 250 },
            { type: 'aura', id: 'aura_celestial_material', count: 2 },
            { type: 'aura', id: 'aura_exotic_material', count: 1 },
            { type: 'aura', id: 'aura_powered', count: 2 },
            { type: 'aura', id: 'aura_quartz', count: 5 },
        ],
    },
    potion_of_bound: {
        resultPotionId: 'potion_of_bound',
        resultCount: 1,
        ingredients: [
            { type: 'potion', id: 'luck_potion_1', count: 100 },
            { type: 'aura', id: 'aura_bounded', count: 1 },
            { type: 'aura', id: 'aura_permafrost', count: 1 },
            { type: 'aura', id: 'aura_lost_souls', count: 5 },
        ],
    },
    godlike_potion: {
        resultPotionId: 'godlike_potion',
        resultCount: 1,
        ingredients: [
            { type: 'potion', id: 'luck_potion_1', count: 600 },
            { type: 'aura', id: 'aura_zeus', count: 1 },
            { type: 'aura', id: 'aura_poseidon', count: 1 },
            { type: 'aura', id: 'aura_hades', count: 1 },
        ],
    },
    zombie_potion: {
        resultPotionId: 'zombie_potion',
        resultCount: 1,
        ingredients: [
            { type: 'potion', id: 'luck_potion_1', count: 1 },
            { type: 'aura', id: 'aura_undead', count: 1 },
            { type: 'aura', id: 'aura_bleeding', count: 1 },
        ],
    },
    diver_potion: {
        resultPotionId: 'diver_potion',
        resultCount: 1,
        ingredients: [
            { type: 'aura', id: 'aura_nautilus', count: 1 },
        ],
    },
};

module.exports = { CRAFTING_RECIPES };
