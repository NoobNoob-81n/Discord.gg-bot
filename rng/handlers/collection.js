// ════════════════════════════════════════════════════════════════
// RNG SYSTEM — _collection
// Collection %, owned count, favorite, rarest owned aura.
// ════════════════════════════════════════════════════════════════
const { safeCommand } = require('../core/errorHandler');
const { getAllAurasSortedByRarity, getAuraById, getTotalAuraCount } = require('../rollEngine');
const { progressBar } = require('../utils/embeds');
const { eventBus } = require('../core/eventBus');
const { EVENTS } = require('../constants');
const { EmbedBuilder } = require('discord.js');
const { EMBED_COLORS } = require('../constants');

module.exports = safeCommand('collection', async (message, args, { rngData }) => {
    const userId = message.author.id;
    const owned = rngData.collection.get(userId) || new Set();
    const total = getTotalAuraCount();
    const ownedCount = owned.size;
    const pct = total > 0 ? (ownedCount / total) * 100 : 0;

    const rarest = getAllAurasSortedByRarity().find((a) => owned.has(a.id));
    const favoriteId = rngData.favorite.get(userId);
    const favorite = favoriteId ? getAuraById(favoriteId) : null;

    const embed = new EmbedBuilder()
        .setTitle(`📖 ${message.author.username}'s Collection`)
        .setColor(EMBED_COLORS.INFO)
        .addFields(
            { name: 'Progress', value: `${progressBar(ownedCount, total)}\n${ownedCount} / ${total} auras`, inline: false },
            { name: 'Rarest Owned', value: rarest ? `${rarest.emoji} ${rarest.name} (1 in ${rarest.odds.toLocaleString()})` : 'None yet', inline: true },
            { name: 'Favorite', value: favorite ? `${favorite.emoji} ${favorite.name}` : 'None set', inline: true },
            { name: 'Total Rolls', value: `${rngData.rollCount.get(userId) || 0}`, inline: true },
        );

    if (pct >= 100) {
        eventBus.emitSafe(EVENTS.ON_COLLECTION_COMPLETE, { userId });
    }

    await message.reply({ embeds: [embed] });
});
