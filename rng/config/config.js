// ════════════════════════════════════════════════════════════════
// RNG SYSTEM — Main Config
// Every tunable number/behavior lives here. Logic files should
// import from config, never hardcode a number that might reasonably
// change (cooldowns, intervals, caps, defaults).
// ════════════════════════════════════════════════════════════════
module.exports = {
    // ── Command prefix ──
    defaultPrefix: '_',

    // ── Saving ──
    autosaveIntervalMs: 60_000, // how often rng-data.json is written to disk

    // ── History ──
    maxHistorySize: 100, // per-user roll history cap (oldest entries dropped)

    // ── Luck ──
    defaultLuckBonus: 0, // baseline luck % with no gloves/potions/events active

    // ── Rolling ──
    rollCooldownMs: 1_000, // minimum time between manual /roll-equivalent commands
    autoRollDefaultIntervalMs: 3_000, // default tick rate for auto-roll sessions
    autoRollMinIntervalMs: 1_500, // safety floor — prevents spam/rate-limit issues

    // ── Animation ──
    animationSpeedMs: 800, // delay between animation frames (e.g. Godlike Noob rainbow cycle)

    // ── Godlike Noob ──
    godlikeNoobUniqueGlobally: true, // if true, only one player may hold it at a time

    // ── Pagination ──
    itemsPerPage: 10, // used by /inventory, /collection, /leaderboard pagination

    // ── Logging ──
    logToConsole: true,
    logRolls: true,
    logRareFindsOnly: false, // if true, only log rolls of Rare tier or above (reduces noise)
    rareLogThresholdOdds: 500, // odds threshold (1 in X) considered "rare" for logging purposes
};
