// ════════════════════════════════════════════════════════════════
// RNG SYSTEM — Biome Definitions (Sol's RNG Inspired)
// These biomes affect aura odds and can enable Breakthroughs.
// ════════════════════════════════════════════════════════════════
const RNG_BIOMES = {
    default: {
        id: 'default',
        name: 'Default Zone',
        emoji: '🌳',
        description: 'The standard rolling area. No special bonuses.',
        auraOddsMultiplier: 1.0,
        breakthroughChance: 0, // No breakthrough in default biome
    },
    starfall: {
        id: 'starfall',
        name: 'Starfall Zone',
        emoji: '🌠',
        description: 'Stars fall from the sky, increasing chances for celestial auras.',
        auraOddsMultiplier: 0.8, // 20% better odds for all auras
        breakthroughChance: 0.05, // 5% chance for breakthrough
        affectedAuraTiers: ['Celestial', 'Galaxy'],
    },
    hell: {
        id: 'hell',
        name: 'Hell Zone',
        emoji: '🔥',
        description: 'A fiery realm where demonic auras are more common.',
        auraOddsMultiplier: 0.7, // 30% better odds for specific auras
        breakthroughChance: 0.1,
        affectedAuraTiers: ['Mythic', 'Divine'],
    },
    corruption: {
        id: 'corruption',
        name: 'Corruption Zone',
        emoji: '🦠',
        description: 'A place of decay, where glitched and void auras thrive.',
        auraOddsMultiplier: 0.6,
        breakthroughChance: 0.15,
        affectedAuraTiers: ['Glitched', 'Void'],
    },
    dreamspace: {
        id: 'dreamspace',
        name: 'Dreamspace',
        emoji: '💭',
        description: 'A surreal dimension where rare auras are slightly more common.',
        auraOddsMultiplier: 0.9,
        breakthroughChance: 0.02,
        affectedAuraTiers: ['Exotic', 'Legendary'],
    },
};

module.exports = { RNG_BIOMES };
