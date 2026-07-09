// ════════════════════════════════════════════════════════════════
// RNG SYSTEM — _equip
// ════════════════════════════════════════════════════════════════
const { safeCommand } = require('../core/errorHandler');
const { getAllAurasSortedByRarity } = require('../rollEngine');
const { eventBus } = require('../core/eventBus');
const { EVENTS } = require('../constants');

module.exports = safeCommand('equip', async (message, args, { rngData }) => {
    const userId = message.author.id;
    const query = args.join(' ').toLowerCase().trim();
    if (!query) return message.reply('Usage: `equip <aura name>`');

    const owned = rngData.collection.get(userId) || new Set();
    const all = getAllAurasSortedByRarity();
    const match = all.find((a) => owned.has(a.id) && a.name.toLowerCase() === query)
        || all.find((a) => owned.has(a.id) && a.name.toLowerCase().includes(query));

    if (!match) {
        return message.reply(`❌ You don't own an aura matching "${args.join(' ')}".`);
    }

    rngData.equipped.set(userId, match.id);
    rngData._markDirty();
    eventBus.emitSafe(EVENTS.ON_EQUIP, { userId, aura: match });

    await message.reply(`✅ Equipped **${match.emoji} ${match.name}**.`);
});
