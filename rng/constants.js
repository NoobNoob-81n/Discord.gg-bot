// ════════════════════════════════════════════════════════════════
// RNG SYSTEM — Constants
// ════════════════════════════════════════════════════════════════

// ── Rarity tier names, in ascending rarity order. ──
// NEW: 'Developer' and 'Transcendent' added below/above 'Godlike' to
// support the new material auras (Poseidon, Hades) without reusing
// 'Godlike', which stays EXCLUSIVE to The Godlike Noob singleton —
// its singleton-enforcement and rainbow-embed logic assumes only one
// aura ever holds that tier.
const TIERS = [
    'Common', 'Uncommon', 'Rare', 'Epic', 'Exotic', 'Legendary',
    'Mythic', 'Celestial', 'Galaxy', 'Cosmic', 'Void', 'Divine',
    'Ancient', 'Glitched', 'Forgotten', 'Creator',
    'Developer',     // NEW — sits between Creator and Godlike
    'Godlike',       // RESERVED — The Godlike Noob singleton ONLY
    'Transcendent',  // NEW — sits above Godlike, for material auras rarer than 1-in-1M
];

// ── Currency keys ──
const CURRENCIES = {
    ESSENCE: 'essence',
    FRAGMENTS: 'fragments',
    LUCK_TICKETS: 'luckTickets',
    DIVINE_SHARDS: 'divineShards',
    RNG_COINS: 'rngCoins',
};

const CURRENCY_DISPLAY = {
    [CURRENCIES.ESSENCE]: { emoji: '✨', name: 'Essence' },
    [CURRENCIES.FRAGMENTS]: { emoji: '🌌', name: 'Fragments' },
    [CURRENCIES.LUCK_TICKETS]: { emoji: '🎟', name: 'Luck Tickets' },
    [CURRENCIES.DIVINE_SHARDS]: { emoji: '👑', name: 'Divine Shards' },
    [CURRENCIES.RNG_COINS]: { emoji: '🪙', name: 'RNG Coins' },
};

// ── Special aura IDs — tiers/IDs with unique code-level treatment. ──
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
    ON_POTION_CONSUMED: 'onPotionConsumed',
    ON_POTION_EXPIRED: 'onPotionExpired',
    ON_QUEST_PROGRESS: 'onQuestProgress',
    ON_QUEST_COMPLETE: 'onQuestComplete',
    ON_DAILY_QUESTS_COMPLETE: 'onDailyQuestsComplete',
    ON_FISH_CAUGHT: 'onFishCaught',

    // NEW — crafting
    ON_POTION_CRAFTED: 'onPotionCrafted',
    ON_CRAFT_FAILED: 'onCraftFailed',
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
