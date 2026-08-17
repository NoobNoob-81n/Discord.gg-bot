// ════════════════════════════════════════════════════════════════
// RNG SYSTEM — _inventory
// ════════════════════════════════════════════════════════════════
const { safeCommand } = require('../core/errorHandler');
const { getAuraById } = require('../rollEngine');
const { buildPaginatedEmbed } = require('../utils/embeds');
const config = require('../config/config');

module.exports = safeCommand('inventory', async (message, args, { rngData }) => {
    const userId = message.author.id;
    const inv = rngData.inventory.get(userId) || [];
    const page = Number(args[0]) || 1;
    const capacity = rngData.getAuraCapacity(userId);

    // Group by auraId so duplicates show as "3x Faint Glow" instead
    // of 3 separate lines.
    const counts = new Map();
    for (const entry of inv) {
        counts.set(entry.auraId, (counts.get(entry.auraId) || 0) + 1);
    }
    const grouped = [...counts.entries()].sort((a, b) => b[1] - a[1]);

    const { embed } = buildPaginatedEmbed({
        title: `🎒 ${message.author.username}'s Inventory (${inv.length}/${capacity} slots used)`,
        items: grouped,
        page,
        itemsPerPage: config.itemsPerPage,
        formatItem: ([auraId, count]) => {
            const aura = getAuraById(auraId);
            if (!aura) return `*Unknown aura (${auraId})*`;
            return `${aura.emoji} **${aura.name}** — x${count}`;
        },
    });

    embed.setFooter({ text: `Need more space? Use ${rngData.rngPrefix}storage upgrade` });
    await message.reply({ embeds: [embed] });
});
