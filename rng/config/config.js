// ════════════════════════════════════════════════════════════════
// RNG SYSTEM — Main Config
// ════════════════════════════════════════════════════════════════
module.exports = {
    defaultPrefix: '_',
    autosaveIntervalMs: 60_000,
    maxHistorySize: 100,
    defaultLuckBonus: 0,
    rollCooldownMs: 1_000,
    autoRollDefaultIntervalMs: 3_000,
    autoRollMinIntervalMs: 1_500,
    animationSpeedMs: 800,
    godlikeNoobUniqueGlobally: true,
    itemsPerPage: 10,
    logToConsole: true,
    logRolls: true,
    logRareFindsOnly: false,
    rareLogThresholdOdds: 500,

    // ── NEW: Quests ──
    dailyQuestCount: 3,          // how many daily quests are assigned at once
    dailyQuestRewardChests: 10,  // potion chests awarded for completing ALL daily quests
    dailyQuestResetHourUTC: 0,   // quests reset at 00:00 UTC

    // ── NEW: Potion chests ──
    potionChestOpenAnimationMs: 1500,
};
