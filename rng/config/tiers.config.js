// ════════════════════════════════════════════════════════════════
// RNG SYSTEM — Tier Config
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

    // ── NEW: material-aura-only tiers. count:0 since these tiers have
    // NO procedurally-generated auras — every aura in them is
    // hand-authored in data/auras/materials.json (see below). The
    // generator (generate-auras.js) skips any tier with count:0. ──
    Developer:     { odds: 750000,    count: 0, color: 0x2ECC71, emojis: ['🔱'] },
    Transcendent:  { odds: 1000000,   count: 0, color: 0x111111, emojis: ['💀'] },

    // Godlike is intentionally excluded — singleton, hand-authored in
    // data/auras/developer.json, not part of tier generation.
};

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
