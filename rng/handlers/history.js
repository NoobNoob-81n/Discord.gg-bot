// ════════════════════════════════════════════════════════════════
// RNG SYSTEM — _history
// ════════════════════════════════════════════════════════════════
const { safeCommand } = require('../core/errorHandler');
const { getAuraById } = require('../rollEngine');
const { buildPaginatedEmbed } = require('../utils/embeds');
const config = require('../config/config');

module.exports = safeCommand('history', async (message, args, { rngData }) => {
    const userId = message.author.id;
    const hist = rngData.history.get(userId) || [];
    const page = Number(args[0]) || 1;

    const { embed } = buildPaginatedEmbed({
        title: `📜 ${message.author.username}'s Recent Rolls`,
        items: hist,
        page,
        itemsPerPage: config.itemsPerPage,
        formatItem: (entry) => {
            const aura = getAuraById(entry.auraId);
            const time = `<t:${Math.floor(entry.timestamp / 1000)}:R>`;
            return aura ? `${aura.emoji} **${aura.name}** — ${time}` : `*Unknown aura* — ${time}`;
        },
    });

    await message.reply({ embeds: [embed] });
});
