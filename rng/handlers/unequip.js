// ════════════════════════════════════════════════════════════════
// RNG SYSTEM — _unequip
// ════════════════════════════════════════════════════════════════
const { safeCommand } = require('../core/errorHandler');
const { eventBus } = require('../core/eventBus');
const { EVENTS } = require('../constants');

module.exports = safeCommand('unequip', async (message, args, { rngData }) => {
    const userId = message.author.id;
    if (!rngData.equipped.get(userId)) {
        return message.reply('You don\'t have anything equipped.');
    }
    rngData.equipped.set(userId, null);
    rngData._markDirty();
    eventBus.emitSafe(EVENTS.ON_UNEQUIP, { userId });
    await message.reply('✅ Unequipped.');
});
