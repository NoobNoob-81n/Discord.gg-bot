// ════════════════════════════════════════════════════════════════
// RNG SYSTEM — Constants
// Every magic string/number used across the RNG system should live
// here. If you're tempted to hardcode a tier name, currency key, or
// color somewhere else, it belongs in this file instead.
// ════════════════════════════════════════════════════════════════

// ── Rarity tier names, in ascending rarity order. Used for sorting,
// validation, and display. The actual odds/counts/colors per tier
// live in config/tiers.config.js (data, not identity). ──
const TIERS = [
    'Common', 'Uncommon', 'Rare', 'Epic', 'Exotic', 'Legendary',
    'Mythic', 'Celestial', 'Galaxy', 'Cosmic', 'Void', 'Divine',
    'Ancient', 'Glitched', 'Forgotten', 'Creator', 'Godlike',
];

// ── Currency keys — these are the property names used on
// RngUserData and the keys used in inventory/shop data. Changing
// these strings would require a data migration, so treat as stable. ──
const CURRENCIES = {
    ESSENCE: 'essence',
    FRAGMENTS: 'fragments',
    LUCK_TICKETS: 'luckTickets',
    DIVINE_SHARDS: 'divineShards',
};

const CURRENCY_DISPLAY = {
    [CURRENCIES.ESSENCE]: { emoji: '✨', name: 'Essence' },
    [CURRENCIES.FRAGMENTS]: { emoji: '🌌', name: 'Fragments' },
    [CURRENCIES.LUCK_TICKETS]: { emoji: '🎟', name: 'Luck Tickets' },
    [CURRENCIES.DIVINE_SHARDS]: { emoji: '👑', name: 'Divine Shards' },
};

// ── Special aura IDs that get unique treatment in code (singleton
// enforcement, special embeds, etc.) — anything NOT in this list is
// treated as a normal generated aura. ──
const SPECIAL_AURA_IDS = {
    GODLIKE_NOOB: 'aura_godlike_noob',
};

// ── Embed colors, centralized so theme changes happen in one place. ──
const EMBED_COLORS = {
    SUCCESS: 0x57F287,
    ERROR: 0xED4245,
    WARNING: 0xFEE75C,
    INFO: 0x5865F2,
    GODLIKE_RAINBOW_FRAMES: [0xFF0000, 0xFF7F00, 0xFFFF00, 0x00FF00, 0x0000FF, 0x4B0082, 0x8B00FF],
};

// ── Permission levels used by the RNG command handler's guard
// checks. Kept separate from the main bot's staff/owner system per
// the spec (fully independent system). ──
const PERMISSIONS = {
    EVERYONE: 'everyone',
    OWNER_ONLY: 'owner_only',
};

// ── Event names for the internal event bus (core/eventBus.js).
// Centralizing these avoids typos silently breaking a listener
// (e.g. 'onRol' instead of 'onRoll' would otherwise fail silently). ──
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
