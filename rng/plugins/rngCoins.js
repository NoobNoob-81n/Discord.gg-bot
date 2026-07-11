// ════════════════════════════════════════════════════════════════
// RNG SYSTEM — RNG Coins Plugin
// Registers with the plugin registry (see core/pluginRegistry.js).
// Listens for onAuraFound events and automatically awards RNG Coins
// when the found aura's odds are 1-in-1000 or rarer, using the
// scaling formula in utils/rngCoinRewards.js.
//
// Built as a plugin (not baked into rollEngine.js) per the
// architecture requirement: future currency/reward systems should
// subscribe to events rather than editing core roll logic.
// ════════════════════════════════════════════════════════════════
const { calculateRngCoinReward } = require('../utils/rngCoinRewards');
const { CURRENCIES } = require('../constants');

module.exports = {
    name: 'rngCoins',
    init({ eventBus, EVENTS, logger, rngData }) {
        eventBus.on(EVENTS.ON_AURA_FOUND, ({ userId, aura }) => {
            const reward = calculateRngCoinReward(aura.odds);
            if (reward <= 0) return;

            rngData.addCurrency(userId, CURRENCIES.RNG_COINS, reward);
            logger.info(`RNG Coins awarded: user=${userId} aura=${aura.id} odds=1-in-${aura.odds} reward=${reward}`);
        });

        logger.info('RNG Coins plugin initialized — auto-awards on 1-in-1000+ aura finds.');
    },
};
