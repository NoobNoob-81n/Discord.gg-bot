// ════════════════════════════════════════════════════════════════
// RNG SYSTEM — Quest Pool
// Each quest declares a `matches(progressEvent)` function that
// decides whether a given progress event counts toward it. This is
// what makes quests genuinely system-agnostic — a quest can match
// `type: 'fish_caught'` from your EXISTING fish command just as
// easily as `type: 'aura_rolled'` from this RNG system, with zero
// special-casing in questEngine.js itself.
// ════════════════════════════════════════════════════════════════

const QUEST_POOL = [
    // ── Rolling quests (RNG system) ──
    {
        id: 'roll_10_any',
        name: 'Roll 10 Auras',
        description: 'Roll any 10 auras.',
        goal: 10,
        matches: (e) => e.type === 'aura_rolled',
    },
    {
        id: 'roll_3_rare',
        name: 'Roll 3 Rare+ Auras',
        description: 'Roll 3 auras of Rare rarity or better.',
        goal: 3,
        matches: (e) => e.type === 'aura_rolled' && e.oddsValue >= 13,
    },
    {
        id: 'roll_1_epic',
        name: 'Roll an Epic Aura',
        description: 'Roll 1 aura of Epic rarity or better.',
        goal: 1,
        matches: (e) => e.type === 'aura_rolled' && e.oddsValue >= 48,
    },

    // ── Fishing quests (EXISTING bot system — matches events your
    // fish command emits via ON_FISH_CAUGHT; see WIRING_V2.md for the
    // one-line hook needed in index.js's /fish command to make these
    // actually track). These are just several example quest shapes —
    // add/remove entries freely, the engine doesn't care which
    // system a quest targets. ──
    {
        id: 'fish_5_any',
        name: 'Catch 5 Fish',
        description: 'Catch any 5 fish.',
        goal: 5,
        matches: (e) => e.type === 'fish_caught',
    },
    {
        id: 'fish_15_any',
        name: 'Catch 15 Fish',
        description: 'Catch any 15 fish.',
        goal: 15,
        matches: (e) => e.type === 'fish_caught',
    },
    {
        id: 'fish_3_rare',
        name: 'Catch 3 Rare+ Fish',
        description: 'Catch 3 fish of Rare rarity or better.',
        goal: 3,
        matches: (e) => e.type === 'fish_caught' && ['Rare', 'Epic', 'Legendary', 'Mythical', 'Secret'].includes(e.rarity),
    },
    {
        id: 'fish_3_legendary',
        name: 'Go Fish 3 Legendaries',
        description: 'Catch 3 Legendary-rarity fish.',
        goal: 3,
        matches: (e) => e.type === 'fish_caught' && e.rarity === 'Legendary',
    },
    {
        id: 'fish_1_mythical',
        name: 'Catch a Mythical+ Fish',
        description: 'Catch 1 fish of Mythical rarity or better.',
        goal: 1,
        matches: (e) => e.type === 'fish_caught' && ['Mythical', 'Secret'].includes(e.rarity),
    },
    {
        id: 'fish_1_biome',
        name: 'Fish in Any Biome',
        description: 'Catch a fish while in any non-default biome.',
        goal: 1,
        matches: (e) => e.type === 'fish_caught' && e.biome && e.biome !== 'default',
    },
    {
        id: 'fish_sell_value',
        name: 'Sell 1000 Coins of Fish',
        description: 'Sell fish worth a combined 1,000 coins.',
        goal: 1000,
        matches: (e) => e.type === 'fish_sold',
    },
];

module.exports = { QUEST_POOL };
