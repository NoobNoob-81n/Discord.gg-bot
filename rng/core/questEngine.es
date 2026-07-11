// ════════════════════════════════════════════════════════════════
// RNG SYSTEM — Quest Engine
// A GENERIC engine that can track progress toward a quest goal
// regardless of which system produced the progress (rolling auras,
// fishing, anything else). It works entirely off a "quest progress
// event" with a shape like { userId, type, ...details } — it has NO
// idea what "fishing" or "rolling" actually are.
//
// How systems report progress:
//   eventBus.emitSafe(EVENTS.ON_QUEST_PROGRESS, {
//       userId, type: 'fish_caught', rarity: 'Legendary', count: 1
//   });
//   eventBus.emitSafe(EVENTS.ON_QUEST_PROGRESS, {
//       userId, type: 'aura_rolled', rarity: 'Epic', count: 1
//   });
//
// A quest definition declares what `type` and (optionally) `rarity`
// it's listening for — see data/quests.js for real quest defs, and
// WIRING_V2.md for the exact one-line hook needed in your existing
// fish command to make "Go fish 3 Legendaries" work.
// ════════════════════════════════════════════════════════════════
const { eventBus } = require('./eventBus');
const { EVENTS } = require('../constants');
const { logger } = require('./logger');
const config = require('../config/config');
const { QUEST_POOL } = require('../data/auras/quests');

/**
 * Returns today's UTC date string (e.g. "2026-07-10"), used as the
 * key for daily quest assignment/reset.
 */
function todayKey() {
    return new Date().toISOString().slice(0, 10);
}

/**
 * Assigns today's daily quests to a user if they don't have any yet
 * (or if it's a new day since their last assignment). Picks
 * `config.dailyQuestCount` random quests from QUEST_POOL.
 */
function ensureDailyQuests(rngData, userId) {
    if (!rngData.dailyQuests) rngData.dailyQuests = new Map();

    const existing = rngData.dailyQuests.get(userId);
    const today = todayKey();

    if (existing && existing.date === today) return existing;

    // New day (or first time) — assign fresh quests, progress reset.
    const shuffled = [...QUEST_POOL].sort(() => Math.random() - 0.5);
    const chosen = shuffled.slice(0, config.dailyQuestCount).map((def) => ({
        questId: def.id,
        progress: 0,
        goal: def.goal,
        completed: false,
    }));

    const record = { date: today, quests: chosen, allCompleteRewardGiven: false };
    rngData.dailyQuests.set(userId, record);
    rngData._markDirty();
    return record;
}

/**
 * Call this whenever ANY system reports quest-relevant progress.
 * Checks the user's active daily quests and advances any that match
 * the reported event type/rarity.
 */
function reportProgress(rngData, userId, progressEvent) {
    const record = ensureDailyQuests(rngData, userId);
    let anyChanged = false;

    for (const q of record.quests) {
        if (q.completed) continue;

        const def = QUEST_POOL.find((d) => d.id === q.questId);
        if (!def) continue;

        if (def.matches(progressEvent)) {
            q.progress += progressEvent.count || 1;
            anyChanged = true;

            if (q.progress >= q.goal) {
                q.progress = q.goal;
                q.completed = true;
                eventBus.emitSafe(EVENTS.ON_QUEST_COMPLETE, { userId, questId: q.questId });
                logger.info(`Quest completed: user=${userId} quest=${q.questId}`);
            }
        }
    }

    if (anyChanged) rngData._markDirty();

    // Check if ALL of today's quests are now complete, and award the
    // one-time daily bonus (potion chests) if not already given.
    const allComplete = record.quests.every((q) => q.completed);
    if (allComplete && !record.allCompleteRewardGiven) {
        record.allCompleteRewardGiven = true;
        rngData._markDirty();
        eventBus.emitSafe(EVENTS.ON_DAILY_QUESTS_COMPLETE, {
            userId,
            rewardChests: config.dailyQuestRewardChests,
        });
        logger.info(`All daily quests completed: user=${userId} — awarding ${config.dailyQuestRewardChests} potion chests`);
    }
}

function getDailyQuestStatus(rngData, userId) {
    return ensureDailyQuests(rngData, userId);
}

module.exports = { ensureDailyQuests, reportProgress, getDailyQuestStatus, todayKey };
