// ════════════════════════════════════════════════════════════════
// RNG SYSTEM — _stats
// ════════════════════════════════════════════════════════════════
const { safeCommand } = require('../core/errorHandler');
const { getTotalAuraCount } = require('../rollEngine');
const { EmbedBuilder } = require('discord.js');
const { EMBED_COLORS, CURRENCY_DISPLAY, CURRENCIES } = require('../constants');

module.exports = safeCommand('stats', async (message, args, { rngData }) => {
    const userId = message.author.id;
    const totalAuras = getTotalAuraCount();
    const owned = rngData.collection.get(userId)?.size || 0;

    const currencyLines = Object.values(CURRENCIES).map((key) => {
        const display = CURRENCY_DISPLAY[key];
        const amount = rngData[key].get(userId) || 0;
        return `${display.emoji} **${display.name}:** ${amount.toLocaleString()}`;
    }).join('\n');

    const embed = new EmbedBuilder()
        .setTitle(`📊 ${message.author.username}'s Stats`)
        .setColor(EMBED_COLORS.INFO)
        .addFields(
            { name: 'Total Rolls', value: `${rngData.rollCount.get(userId) || 0}`, inline: true },
            { name: 'Unique Auras', value: `${owned} / ${totalAuras}`, inline: true },
            { name: 'Currencies', value: currencyLines, inline: false },
        );

    await message.reply({ embeds: [embed] });
});
