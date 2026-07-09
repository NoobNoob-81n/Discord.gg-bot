// ════════════════════════════════════════════════════════════════
// RNG SYSTEM — Tier Config
// The actual odds/color/emoji-pool DATA for each tier. Tier NAMES
// (identity) live in constants.js; tier DATA (numbers that might
// change during balancing) lives here. This separation means
// balancing the game (e.g. making Epic rarer) never touches
// constants.js, and renaming a tier never touches this file.
// ════════════════════════════════════════════════════════════════
const { TIERS } = require('../constants');

const TIER_CONFIG = {
    Common:    { odds: 2,           count: 200, color: 0xB0B0B0, emojis: ['⚪','🔘','⬜'] },
    Uncommon:  { odds: 5,           count: 180, color: 0x4ADE80, emojis: ['🟢','🍀','🌿'] },
    Rare:      { odds: 13,          count: 150, color: 0x3B82F6, emojis: ['🔵','💠','🔷'] },
    Epic:      { odds: 48,          count: 120, color: 0xA855F7, emojis: ['🟣','🔮','✨'] },
    Exotic:    { odds: 150,         count: 90,  color: 0xEC4899, emojis: ['🌸','💗','🎀'] },
    Legendary: { odds: 500,         count: 70,  color: 0xF59E0B, emojis: ['🟠','🔥','⚡'] },
    Mythic:    { odds: 2000,        count: 50,  color: 0xEF4444, emojis: ['🔴','❤️‍🔥','💢'] },
    Celestial: { odds: 8000,        count: 35,  color: 0x818CF8, emojis: ['🌠','⭐','🌟'] },
    Galaxy:    { odds: 35000,       count: 25,  color: 0x6366F1, emojis: ['🌌','🪐','🌀'] },
    Cosmic:    { odds: 150000,      count: 18,  color: 0x8B5CF6, emojis: ['🌃','☄️','🛸'] },
    Void:      { odds: 650000,      count: 12,  color: 0x1F1F2E, emojis: ['⚫','🕳️','🌑'] },
    Divine:    { odds: 3000000,     count: 8,   color: 0xFFD700, emojis: ['👑','✝️','🕊️'] },
    Ancient:   { odds: 15000000,    count: 5,   color: 0x92400E, emojis: ['🗿','📜','⚱️'] },
    Glitched:  { odds: 75000000,    count: 3,   color: 0x00FF00, emojis: ['🟩','💾','⚠️'] },
    Forgotten: { odds: 350000000,   count: 2,   color: 0x2D2D2D, emojis: ['🕸️','🖤','🌫️'] },
    Creator:   { odds: 1000000000,  count: 1,   color: 0xFFFFFF, emojis: ['👨‍💻'] },
    // Godlike is intentionally excluded here — it's a singleton with
    // unique mechanics, hand-authored in data/auras/developer.json
    // rather than generated, so it has no "count" to generate.
};

// Sanity check at load time: every tier in constants.TIERS (except
// Godlike, which is hand-authored) must have a config entry, and vice
// versa. This catches typos immediately at startup instead of failing
// silently mid-game.
function validateTierConfig() {
    const configuredTiers = Object.keys(TIER_CONFIG);
    const expectedTiers = TIERS.filter((t) => t !== 'Godlike');

    const missing = expectedTiers.filter((t) => !configuredTiers.includes(t));
    const extra = configuredTiers.filter((t) => !expectedTiers.includes(t));

    if (missing.length > 0) {
        throw new Error(`[RNG tier config] Missing config for tiers: ${missing.join(', ')}`);
    }
    if (extra.length > 0) {
        throw new Error(`[RNG tier config] Config has unknown tiers not in constants.TIERS: ${extra.join(', ')}`);
    }
}

validateTierConfig();

module.exports = { TIER_CONFIG };
