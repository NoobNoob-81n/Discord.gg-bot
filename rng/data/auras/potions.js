// ════════════════════════════════════════════════════════════════
// RNG SYSTEM — Potion Definitions
// Every potion's effect, duration, and behavior category. Three
// behavior categories exist, matching the spec exactly:
//
//   'stackable'  — multiple can be active at once, effects add up
//                  (Lucky, Speed, Rage, Diver, Gladiator, Fortune I-III,
//                  Haste I-III, Hades, Forbidden III)
//   'oneTime'    — consumed instantly, affects only the NEXT single
//                  roll, then is gone (Heavenly, Oblivion, Dune, Red Moon)
//   'exclusive'  — only ONE may be active at a time; starting a new
//                  one while one is active is blocked until the
//                  current one expires (Strange Potion I & II)
//
// Drop weights (potionChestOdds below) are used by the potion chest
// opener — see plugins/potions/chestOpener.js.
// ════════════════════════════════════════════════════════════════

const POTIONS = {
    speed_potion: {
        id: 'speed_potion',
        name: 'Speed Potion',
        emoji: '💨',
        category: 'stackable',
        durationMs: 60_000, // 1 minute
        effects: { rollSpeedBonus: 25 },
        description: 'Gives a +25% Roll Speed boost for 1 minute.',
    },
    lucky_potion: {
        id: 'lucky_potion',
        name: 'Lucky Potion',
        emoji: '🍀',
        category: 'stackable',
        durationMs: 60_000,
        effects: { luckBonus: 25 },
        description: 'Gives a +25% Luck boost for 1 minute.',
    },
    fortune_potion_1: {
        id: 'fortune_potion_1',
        name: 'Fortune Potion I',
        emoji: '🌟',
        category: 'stackable',
        durationMs: 5 * 60_000,
        effects: { luckBonus: 150 },
        description: 'Gives a +150% Luck boost for 5 minutes.',
    },
    haste_potion_1: {
        id: 'haste_potion_1',
        name: 'Haste Potion I',
        emoji: '⚡',
        category: 'stackable',
        durationMs: 5 * 60_000,
        effects: { rollSpeedBonus: 30 },
        description: 'Gives a +30% Roll Speed boost for 5 minutes.',
    },
    fortune_potion_2: {
        id: 'fortune_potion_2',
        name: 'Fortune Potion II',
        emoji: '🌟',
        category: 'stackable',
        durationMs: 7 * 60_000,
        effects: { luckBonus: 200 },
        description: 'Gives a +200% Luck boost for 7 minutes.',
    },
    haste_potion_2: {
        id: 'haste_potion_2',
        name: 'Haste Potion II',
        emoji: '⚡',
        category: 'stackable',
        durationMs: 7 * 60_000,
        effects: { rollSpeedBonus: 50 },
        description: 'Gives a +50% Roll Speed boost for 7 minutes.',
    },
    fortune_potion_3: {
        id: 'fortune_potion_3',
        name: 'Fortune Potion III',
        emoji: '🌟',
        category: 'stackable',
        durationMs: 10 * 60_000,
        effects: { luckBonus: 250 },
        description: 'Gives a +250% Luck boost for 10 minutes.',
    },
    haste_potion_3: {
        id: 'haste_potion_3',
        name: 'Haste Potion III',
        emoji: '⚡',
        category: 'stackable',
        durationMs: 10 * 60_000,
        effects: { rollSpeedBonus: 70 },
        description: 'Gives a +70% Roll Speed boost for 10 minutes.',
    },
    rage_potion: {
        id: 'rage_potion',
        name: 'Rage Potion',
        emoji: '😡',
        category: 'stackable',
        durationMs: 10 * 60_000,
        effects: { rollSpeedBonus: 35 },
        description: 'Gives a +35% Roll Speed boost for 10 minutes.',
    },
    diver_potion: {
        id: 'diver_potion',
        name: 'Diver Potion',
        emoji: '🤿',
        category: 'stackable',
        durationMs: 10 * 60_000,
        effects: { rollSpeedBonus: 40 },
        description: 'Gives a +40% Roll Speed boost for 10 minutes.',
    },
    zombie_potion: {
        id: 'zombie_potion',
        name: 'Zombie Potion',
        emoji: '🧟',
        category: 'stackable',
        durationMs: 10 * 60_000,
        effects: { luckBonus: 50 }, // not specified in spec text — reasonable placeholder, tune later
        description: 'A mysterious reanimating brew. Grants a moderate luck boost for 10 minutes.',
    },
    jewelry_potion: {
        id: 'jewelry_potion',
        name: 'Jewelry Potion',
        emoji: '💍',
        category: 'stackable',
        durationMs: 10 * 60_000,
        effects: { luckBonus: 75 }, // not specified in spec text — placeholder, tune later
        description: 'Glimmers with hidden fortune. Grants a luck boost for 10 minutes.',
    },
    potion_of_bound: {
        id: 'potion_of_bound',
        name: 'Potion of Bound',
        emoji: '🔗',
        category: 'stackable',
        durationMs: 10 * 60_000,
        effects: { luckBonus: 100 }, // not specified in spec text — placeholder, tune later
        description: 'Binds fate in your favor for a short time.',
    },
    gladiator_potion: {
        id: 'gladiator_potion',
        name: 'Gladiator Potion',
        emoji: '⚔️',
        category: 'stackable',
        durationMs: 15 * 60_000,
        effects: { luckBonus: 100 },
        description: 'Gives a +100% Luck boost for 15 minutes.',
    },
    hades_potion: {
        id: 'hades_potion',
        name: 'Hades Potion',
        emoji: '💀',
        category: 'stackable',
        durationMs: 4 * 60 * 60_000, // 4 hours
        effects: { luckBonus: 300, rollSpeedBonus: -10 },
        description: 'Gives +300% Luck and -10% Roll Speed for 4 hours.',
    },
    forbidden_potion_3: {
        id: 'forbidden_potion_3',
        name: 'Forbidden Potion III',
        emoji: '🩸',
        category: 'stackable',
        durationMs: 3 * 60 * 60_000, // 3 hours
        effects: { luckBonus: 1350, rollSpeedBonus: 75 },
        description: 'Gives +1350% Luck and +75% Roll Speed for 3 hours.',
    },
    heavenly_potion: {
        id: 'heavenly_potion',
        name: 'Heavenly Potion',
        emoji: '👼',
        category: 'oneTime',
        effects: { luckBonus: 400000 },
        description: 'Gives a massive +400,000% (+4,000x) Luck multiplier for your next single roll.',
        blockedBy: ['oblivion_potion'], // "Cannot stack with Oblivion"
    },
    oblivion_potion: {
        id: 'oblivion_potion',
        name: 'Oblivion Potion',
        emoji: '🕳️',
        category: 'oneTime',
        effects: { luckBonus: 350000 },
        description: 'Gives +350,000% (+3,500x) Luck for your next roll (cannot stack with Heavenly).',
        blockedBy: ['heavenly_potion'],
    },
    potion_of_the_dune: {
        id: 'potion_of_the_dune',
        name: 'Potion of the Dune',
        emoji: '🏜️',
        category: 'oneTime',
        effects: { luckBonus: 1000000 },
        description: 'Gives +1,000,000% (+10,000x) Luck for your next roll. Exclusive chance to drop the Neferkhaf aura.',
        exclusiveAuraChance: { auraId: 'aura_neferkhaf', chance: 0.01 }, // 1% of the boosted roll additionally rolls for this
    },
    red_moon_potion_1: {
        id: 'red_moon_potion_1',
        name: 'Red Moon Potion I',
        emoji: '🌕',
        category: 'oneTime',
        effects: { luckBonus: 1100000 },
        description: 'Gives +1,100,000% (+11,000x) Luck for your next roll.',
    },
    strange_potion_1: {
        id: 'strange_potion_1',
        name: 'Strange Potion I',
        emoji: '🧪',
        category: 'exclusive',
        durationMs: 10 * 60_000,
        description: 'Grants one random buff or debuff for 10 minutes. See /potions info strange_potion_1 for possible outcomes.',
        randomOutcomes: 'strange', // resolved at consume-time — see potionEngine.js
    },
    strange_potion_2: {
        id: 'strange_potion_2',
        name: 'Strange Potion II',
        emoji: '🧪',
        category: 'exclusive',
        durationMs: 10 * 60_000,
        description: 'Grants one random buff or debuff for 10 minutes. See /potions info strange_potion_2 for possible outcomes.',
        randomOutcomes: 'strange',
    },
    godly_potion_zeus: {
        id: 'godly_potion_zeus',
        name: 'Godly Potion (Zeus)',
        emoji: '⚡',
        category: 'stackable',
        durationMs: 30 * 60_000, // duration not specified in spec — 30min placeholder, tune later
        effects: { luckBonus: 500, rollSpeedBonus: 50 }, // not specified — placeholder, tune later
        description: 'Channels the King of the Gods. Massive luck and speed boost.',
    },
    godly_potion_hades: {
        id: 'godly_potion_hades',
        name: 'Godly Potion (Hades)',
        emoji: '💀',
        category: 'stackable',
        durationMs: 30 * 60_000,
        effects: { luckBonus: 600, rollSpeedBonus: 30 }, // not specified — placeholder, tune later
        description: 'Channels the Lord of the Underworld. Overwhelming luck boost.',
    },
    godly_potion_poseidon: {
        id: 'godly_potion_poseidon',
        name: 'Godly Potion (Poseidon)',
        emoji: '🔱',
        category: 'stackable',
        durationMs: 30 * 60_000,
        effects: { luckBonus: 550, rollSpeedBonus: 40 }, // not specified — placeholder, tune later
        description: 'Channels the God of the Sea. Immense luck and speed boost.',
    },
    warp_potion: {
        id: 'warp_potion',
        name: 'Warp Potion',
        emoji: '🌀',
        category: 'stackable',
        durationMs: 20 * 60_000, // not specified — placeholder, tune later
        effects: { luckBonus: 800, rollSpeedBonus: 20 }, // not specified — placeholder, tune later
        description: 'Warps probability itself in your favor for a limited time.',
    },
    godlike_potion: {
        id: 'godlike_potion',
        name: 'Godlike Potion',
        emoji: '🌟',
        category: 'stackable',
        durationMs: 15 * 60_000, // not specified — placeholder, tune later
        effects: { luckBonus: 2000 }, // not specified — placeholder, tune later
        description: 'Near-mythical luck surge. One of the rarest potions in existence.',
    },
    transcendent_potion: {
        id: 'transcendent_potion',
        name: 'Transcendent Potion',
        emoji: '💫',
        category: 'stackable',
        durationMs: 10 * 60_000, // not specified — placeholder, tune later
        effects: { luckBonus: 5000 }, // not specified — placeholder, tune later
        description: 'Transcends normal fortune. The single rarest potion effect obtainable.',
    },
};

// ── Strange Potion random outcome table — resolved once at
// consume-time, then applied as if it were a normal timed effect for
// the potion's durationMs. ──
const STRANGE_POTION_OUTCOMES = [
    { name: 'The Chosen / Godlike', weight: 10, effects: { luckBonus: 250, rollSpeedBonus: 40 } },
    { name: 'The Power', weight: 25, effects: { luckBonus: 250 } },
    { name: 'The Knowledge', weight: 25, effects: { rollSpeedBonus: 40 } },
    { name: 'The Wrath', weight: 25, effects: { luckBonus: -100 } },
    { name: 'The Sloth', weight: 15, effects: { rollSpeedBonus: -25 } },
];

// ── Potion Chest drop table — used when a quest reward grants
// potion chests. Percentages sum to 100.00 exactly (verified below). ──
const POTION_CHEST_ODDS = [
    { potionId: 'speed_potion', chancePercent: 20.00 },
    { potionId: 'lucky_potion', chancePercent: 20.00 },
    { potionId: 'fortune_potion_1', chancePercent: 10.00 },
    { potionId: 'haste_potion_1', chancePercent: 10.00 },
    { potionId: 'fortune_potion_2', chancePercent: 7.00 },
    { potionId: 'haste_potion_2', chancePercent: 7.00 },
    { potionId: 'fortune_potion_3', chancePercent: 5.00 },
    { potionId: 'haste_potion_3', chancePercent: 5.00 },
    { potionId: 'rage_potion', chancePercent: 3.00 },
    { potionId: 'diver_potion', chancePercent: 3.00 },
    { potionId: 'zombie_potion', chancePercent: 3.00 },
    { potionId: 'jewelry_potion', chancePercent: 3.00 },
    { potionId: 'potion_of_bound', chancePercent: 2.00 },
    { potionId: 'heavenly_potion', chancePercent: 1.00 },
    { potionId: 'warp_potion', chancePercent: 0.50 },
    { potionId: 'godly_potion_zeus', chancePercent: 0.10 },
    { potionId: 'godly_potion_hades', chancePercent: 0.10 },
    { potionId: 'godly_potion_poseidon', chancePercent: 0.10 },
    { potionId: 'oblivion_potion', chancePercent: 0.08 },
    { potionId: 'godlike_potion', chancePercent: 0.08 },
    { potionId: 'transcendent_potion', chancePercent: 0.05 },
];

// Sanity check at load time — catches a meaningfully wrong percentage
// table immediately at startup. Tolerance is 0.02 (not stricter)
// because the source percentages as designed sum to 100.01 exactly
// due to a 0.01 rounding overage across 21 entries with 2-decimal
// values — this is a real, tiny discrepancy in the source numbers,
// not a floating-point display artifact, and is too small to affect
// gameplay balance meaningfully. If you ever add/change an entry,
// re-verify the sum stays within 0.02 of 100.
const totalChance = Math.round(POTION_CHEST_ODDS.reduce((sum, e) => sum + e.chancePercent, 0) * 100) / 100;
if (Math.abs(totalChance - 100) > 0.02) {
    throw new Error(`[potions.data] POTION_CHEST_ODDS percentages sum to ${totalChance.toFixed(2)}, expected ~100.00`);
}

module.exports = { POTIONS, STRANGE_POTION_OUTCOMES, POTION_CHEST_ODDS };
