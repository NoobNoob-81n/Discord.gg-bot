// ════════════════════════════════════════════════════════════════
// RNG SYSTEM — Constants
// Every magic string/number used across the RNG system should live
// here. If you're tempted to hardcode a tier name, currency key, or
// color somewhere else, it belongs in this file instead.
// ════════════════════════════════════════════════════════════════

// ── Rarity tier names, in ascending rarity order. ──
const TIERS = [
    'Common', 'Uncommon', 'Rare', 'Epic', 'Exotic', 'Legendary',
    'Mythic', 'Celestial', 'Galaxy', 'Cosmic', 'Void', 'Divine',
    'Ancient', 'Glitched', 'Forgotten', 'Creator', 'Godlike',
];

// ── Currency keys ──
const CURRENCIES = {
    ESSENCE: 'essence',
    FRAGMENTS: 'fragments',
    LUCK_TICKETS: 'luckTickets',
    DIVINE_SHARDS: 'divineShards',
    RNG_COINS: 'rngCoins', // NEW — earned by rolling rare (1-in-1000+) auras
};

const CURRENCY_DISPLAY = {
    [CURRENCIES.ESSENCE]: { emoji: '✨', name: 'Essence' },
    [CURRENCIES.FRAGMENTS]: { emoji: '🌌', name: 'Fragments' },
    [CURRENCIES.LUCK_TICKETS]: { emoji: '🎟', name: 'Luck Tickets' },
    [CURRENCIES.DIVINE_SHARDS]: { emoji: '👑', name: 'Divine Shards' },
    [CURRENCIES.RNG_COINS]: { emoji: '🪙', name: 'RNG Coins' },
};

// ── Special aura IDs ──
const SPECIAL_AURA_IDS = {
    GODLIKE_NOOB: 'aura_godlike_noob',
};

// ── Embed colors ──
const EMBED_COLORS = {
    SUCCESS: 0x57F287,
    ERROR: 0xED4245,
    WARNING: 0xFEE75C,
    INFO: 0x5865F2,
    GODLIKE_RAINBOW_FRAMES: [0xFF0000, 0xFF7F00, 0xFFFF00, 0x00FF00, 0x0000FF, 0x4B0082, 0x8B00FF],
};

// ── Permission levels ──
const PERMISSIONS = {
    EVERYONE: 'everyone',
    OWNER_ONLY: 'owner_only',
};

// ── Event names for the internal event bus ──
const EVENTS = {
    ON_ROLL: 'onRoll',
    ON_AURA_FOUND: 'onAuraFound',
    ON_RARE_AURA: 'onRareAura',
    ON_COLLECTION_COMPLETE: 'onCollectionComplete',
    ON_EQUIP: 'onEquip',
    ON_UNEQUIP: 'onUnequip',
    ON_TRADE: 'onTrade',
    ON_GODLIKE_NOOB_FOUND: 'onGodlikeNoobFound',
    ON_ERROR: 'onError',

    // NEW — potions & quests
    ON_POTION_CONSUMED: 'onPotionConsumed',
    ON_POTION_EXPIRED: 'onPotionExpired',
    ON_QUEST_PROGRESS: 'onQuestProgress',   // emitted by ANY system (fish, roll, etc.) to report progress
    ON_QUEST_COMPLETE: 'onQuestComplete',
    ON_DAILY_QUESTS_COMPLETE: 'onDailyQuestsComplete',
    ON_FISH_CAUGHT: 'onFishCaught', // emitted from index.js's existing fish command — see WIRING_V2.md
};

module.exports = {
    TIERS,
    CURRENCIES,
    CURRENCY_DISPLAY,
    SPECIAL_AURA_IDS,
    EMBED_COLORS,
    PERMISSIONS,
    EVENTS,
};
