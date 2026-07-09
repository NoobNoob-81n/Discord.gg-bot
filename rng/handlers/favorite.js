// ════════════════════════════════════════════════════════════════
// RNG SYSTEM — _favorite
// ════════════════════════════════════════════════════════════════
const { safeCommand } = require('../core/errorHandler');
const { getAllAurasSortedByRarity } = require('../rollEngine');

module.exports = safeCommand('favorite', async (message, args, { rngData }) => {
    const userId = message.author.id;
    const query = args.join(' ').toLowerCase().trim();
    if (!query) return message.reply('Usage: `favorite <aura name>`');

    const owned = rngData.collection.get(userId) || new Set();
    const all = getAllAurasSortedByRarity();
    const match = all.find((a) => owned.has(a.id) && a.name.toLowerCase() === query)
        || all.find((a) => owned.has(a.id) && a.name.toLowerCase().includes(query));

    if (!match) {
        return message.reply(`❌ You don't own an aura matching "${args.join(' ')}".`);
    }

    rngData.favorite.set(userId, match.id);
    rngData._markDirty();
    await message.reply(`⭐ Set **${match.emoji} ${match.name}** as your favorite.`);
});
