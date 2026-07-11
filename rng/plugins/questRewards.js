// ════════════════════════════════════════════════════════════════
// RNG SYSTEM — Quest Rewards Plugin
// Listens for onDailyQuestsComplete and actually grants the potion
// chests, opening them immediately and DMing/announcing results.
// Kept as a plugin so questEngine.js itself never needs to know
// what the reward for "all quests done" actually is — that's a
// game-balance decision that lives here, separately.
// ════════════════════════════════════════════════════════════════
const { openChests } = require('../core/potionChestOpener');

module.exports = {
    name: 'questRewards',
    init({ eventBus, EVENTS, logger, rngData }) {
        eventBus.on(EVENTS.ON_DAILY_QUESTS_COMPLETE, ({ userId, rewardChests }) => {
            const results = openChests(rngData, userId, rewardChests);
            logger.info(`Quest reward granted: user=${userId} chests=${rewardChests} results=${results.map(r => r.potionId).join(',')}`);
            // Note: actually notifying the user (DM or channel message)
            // needs a Discord client reference, which this plugin
            // doesn't have — see handlers/quests.js or the message
            // handler for where to surface "you got potions!" to chat.
            // Storing the results isn't done here; the event payload
            // itself is the notification hook point for whoever wires
            // up the Discord-facing announcement.
        });

        logger.info('Quest rewards plugin initialized — grants potion chests on daily quest completion.');
    },
};
