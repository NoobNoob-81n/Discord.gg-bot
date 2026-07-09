// ════════════════════════════════════════════════════════════════
// AURA GENERATOR — run once with `node generate-auras.js` to produce
// data/auras.json. Not part of the runtime bot; this is a build-time
// tool so we don't hand-write ~1000 JSON entries by hand.
//
// Re-run this any time you want to regenerate the full aura list
// (e.g. after tweaking tier counts or name pools below). Existing
// player inventories reference auras by `id`, and ids are stable
// across regeneration as long as you don't change the tier order or
// per-tier counts — changing those will shift ids and break existing
// inventories, so treat this file as append-only in production.
// ════════════════════════════════════════════════════════════════
const fs = require('fs');
const path = require('path');

const { TIER_CONFIG } = require('./config/tiers.config');

// Convert TIER_CONFIG (an object keyed by tier name) into the ordered
// array shape this generator works with, preserving insertion order.
const TIERS = Object.entries(TIER_CONFIG).map(([name, cfg]) => ({ name, ...cfg }));

// ── Name pools per tier — thematically appropriate adjectives/nouns
// combined to produce varied, non-repetitive names at scale ──
const NAME_PARTS = {
    Common:    { adj: ['Dusty','Faint','Plain','Simple','Basic','Dull','Quiet','Small'], noun: ['Spark','Glow','Shard','Wisp','Ember','Breeze','Flicker','Ripple'] },
    Uncommon:  { adj: ['Verdant','Mossy','Budding','Fresh','Vivid','Woven','Blooming'], noun: ['Leaf','Vine','Petal','Sprout','Grove','Bramble','Root'] },
    Rare:      { adj: ['Azure','Crystal','Frosted','Polished','Sapphire','Gleaming'], noun: ['Wave','Tide','Frost','Prism','Current','Depth','Mirror'] },
    Epic:      { adj: ['Arcane','Mystic','Enchanted','Runic','Spectral','Warped'], noun: ['Sigil','Rune','Hex','Veil','Echo','Conjure','Wraith'] },
    Exotic:    { adj: ['Blush','Radiant','Silken','Opal','Rosy','Gilded'], noun: ['Bloom','Charm','Glimmer','Aura','Whisper','Grace'] },
    Legendary: { adj: ['Blazing','Molten','Infernal','Scorching','Burning','Feral'], noun: ['Inferno','Ember','Wildfire','Phoenix','Cinder','Flare'] },
    Mythic:    { adj: ['Crimson','Furious','Vengeful','Raging','Bloodmoon','Berserk'], noun: ['Wrath','Fury','Rampage','Havoc','Reckoning','Bloodlust'] },
    Celestial: { adj: ['Starforged','Astral','Luminous','Skyborn','Radiant','Shining'], noun: ['Starlight','Comet','Nova','Aurora','Constellation','Meteor'] },
    Galaxy:    { adj: ['Nebular','Interstellar','Cosmic','Orbital','Stellar','Warped'], noun: ['Nebula','Galaxy','Quasar','Singularity','Vortex','Expanse'] },
    Cosmic:    { adj: ['Infinite','Boundless','Eternal','Timeless','Endless','Vast'], noun: ['Cosmos','Infinity','Eternity','Continuum','Horizon','Abyss'] },
    Void:      { adj: ['Hollow','Empty','Endless','Silent','Black','Consuming'], noun: ['Void','Abyss','Nullity','Oblivion','Emptiness','Darkness'] },
    Divine:    { adj: ['Holy','Sacred','Blessed','Radiant','Heavenly','Pure'], noun: ['Divinity','Grace','Ascension','Providence','Sanctity','Halo'] },
    Ancient:   { adj: ['Primordial','Forgotten','Elder','Timeworn','Archaic','Lost'], noun: ['Relic','Ruin','Legacy','Origin','Vestige','Monument'] },
    Glitched:  { adj: ['Corrupted','Fragmented','Broken','Unstable','Erroneous','Malformed'], noun: ['Glitch','Error','Overflow','Anomaly','Fragment','Static'] },
    Forgotten: { adj: ['Erased','Nameless','Unknown','Vanished','Lost','Silent'], noun: ['Memory','Echo','Remnant','Ghost','Shadow','Trace'] },
    Creator:   { adj: [], noun: [] }, // handled specially below (single unique name)
};

function pick(arr, rng) { return arr[Math.floor(rng() * arr.length)]; }

// Simple seeded PRNG so regeneration is deterministic (same seed = same
// output), which matters since ids/names should stay stable on re-runs
// unless you intentionally change a tier's count.
function mulberry32(seed) {
    return function () {
        seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function generateAuras() {
    const rng = mulberry32(1337); // fixed seed for reproducibility
    const auras = [];
    let globalId = 1;

    for (const tier of TIERS) {
        const usedNames = new Set();

        for (let i = 0; i < tier.count; i++) {
            let name;

            if (tier.name === 'Creator') {
                name = 'Creator'; // the single top-tier aura below Godlike Noob
            } else {
                const parts = NAME_PARTS[tier.name];
                // Retry a few times to avoid duplicate names within a tier
                let attempts = 0;
                do {
                    name = `${pick(parts.adj, rng)} ${pick(parts.noun, rng)}`;
                    attempts++;
                } while (usedNames.has(name) && attempts < 20);
                usedNames.add(name);
            }

            const emoji = pick(tier.emojis, rng);

            auras.push({
                id: `aura_${String(globalId).padStart(4, '0')}`,
                name,
                rarity: tier.name,
                odds: tier.odds,
                color: tier.color,
                emoji,
                description: `A ${tier.name.toLowerCase()}-tier aura radiating with ${tier.name === 'Creator' ? 'unmistakable creator energy' : 'faint ' + tier.name.toLowerCase() + ' power'}.`,
                effects: {
                    // Baseline passive scaling — stronger tiers grant bigger
                    // passive bonuses. Kept simple/generic for now; specific
                    // auras can be hand-tuned later without regenerating.
                    luckBonus: 0,
                    essenceMultiplier: 1 + (TIERS.indexOf(tier) * 0.05),
                },
                value: Math.max(10, Math.round(tier.odds * 2)), // rough currency value baseline
                collectionValue: Math.max(1, Math.round(tier.odds / 10)),
                rollAnimation: tier.odds >= 150000 ? 'epic_flash' : (tier.odds >= 500 ? 'glow_pulse' : 'simple_fade'),
                title: `the ${tier.name}`,
                passiveAbility: null, // reserved for hand-authored special auras later
            });

            globalId++;
        }
    }

    return auras;
}

const auras = generateAuras();

// Write one file per tier into data/auras/, matching the folder-based
// architecture the aura loader expects. Each tier's auras go into
// their own lowercase-named file (e.g. common.json, legendary.json).
const byTier = {};
for (const a of auras) {
    if (!byTier[a.rarity]) byTier[a.rarity] = [];
    byTier[a.rarity].push(a);
}

const outDir = path.join(__dirname, 'data', 'auras');
fs.mkdirSync(outDir, { recursive: true });

for (const [tier, list] of Object.entries(byTier)) {
    const filename = `${tier.toLowerCase()}.json`;
    fs.writeFileSync(path.join(outDir, filename), JSON.stringify(list, null, 2));
    console.log(`Wrote ${filename} — ${list.length} auras`);
}

console.log(`\nGenerated ${auras.length} auras total across ${Object.keys(byTier).length} tier files.`);
console.log('Note: data/auras/developer.json (Godlike Noob) is hand-authored and NOT touched by this script.');
