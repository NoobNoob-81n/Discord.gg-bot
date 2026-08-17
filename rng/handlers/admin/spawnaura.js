// ════════════════════════════════════════════════════════════════
// RNG SYSTEM — _spawnaura (owner only)
// Usage: spawnaura <@user> <aura name>
// ════════════════════════════════════════════════════════════════
const { safeCommand } = require('../../core/errorHandler');
const { getAllAurasSortedByRarity } = require('../../rollEngine');
const { logger } = require('../../core/logger');
const { buildAuraEmbed } = require('../../utils/embeds');

module.exports = safeCommand('spawnaura', async (message, args, { rngData }) => {
    const target = message.mentions.users.first();
    if (!target) return message.reply('Usage: `spawnaura @user <aura name>`');

    const query = args.slice(1).join(' ').toLowerCase().trim();
    if (!query) return message.reply('Usage: `spawnaura @user <aura name>`');

    const all = getAllAurasSortedByRarity();
    const match = all.find((a) => a.name.toLowerCase() === query)
        || all.find((a) => a.name.toLowerCase().includes(query));

    if (!match) return message.reply(`❌ No aura found matching "${args.slice(1).join(' ')}".`);

    const usage = rngData.getAuraUsage(target.id);
    const capacity = rngData.getAuraCapacity(target.id);
    if (usage >= capacity) {
        return message.reply(`❌ ${target}'s aura storage is full (**${usage}/${capacity}**). They must sell an aura or upgrade storage first.`);
    }

    rngData.addToInventory(target.id, match.id);
    rngData.addToHistory(target.id, match.id);
    logger.admin(message.author.id, 'spawnaura', { target: target.id, auraId: match.id });

    await message.reply({
        content: `✅ Gave **${match.name}** to ${target}.`,
        embeds: [buildAuraEmbed(match)],
    });
});
