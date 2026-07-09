// ════════════════════════════════════════════════════════════════
// RNG SYSTEM — _leaderboard
// Usage: leaderboard [collection|rolls]
// ════════════════════════════════════════════════════════════════
const { safeCommand } = require('../core/errorHandler');
const { buildPaginatedEmbed } = require('../utils/embeds');
const config = require('../config/config');

module.exports = safeCommand('leaderboard', async (message, args, { rngData }) => {
    const mode = (args[0] || 'collection').toLowerCase();
    const page = Number(args[1]) || 1;

    let entries;
    let title;

    if (mode === 'rolls') {
        entries = [...rngData.rollCount.entries()].sort((a, b) => b[1] - a[1]);
        title = '🏆 Leaderboard — Most Rolls';
    } else {
        entries = [...rngData.collection.entries()]
            .map(([userId, set]) => [userId, set.size])
            .sort((a, b) => b[1] - a[1]);
        title = '🏆 Leaderboard — Collection Size';
    }

    const itemsPerPage = config.itemsPerPage;
    const startRank = (Math.max(1, page) - 1) * itemsPerPage;

    const { embed } = buildPaginatedEmbed({
        title,
        items: entries,
        page,
        itemsPerPage,
        formatItem: ([userId, value], i) => `**#${startRank + i + 1}** <@${userId}> — ${value}`,
    });

    await message.reply({ embeds: [embed] });
});
