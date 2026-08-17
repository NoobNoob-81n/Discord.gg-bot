// ════════════════════════════════════════════════════════════════
// RNG SYSTEM — Embed Utilities
// Shared formatting helpers so every command's embeds look
// consistent, without copy-pasting embed-building code everywhere.
// ════════════════════════════════════════════════════════════════
const { EmbedBuilder } = require('discord.js');
const { EMBED_COLORS, SPECIAL_AURA_IDS } = require('../constants');

/** Builds a simple text progress bar, e.g. "██████░░░░ 60%" */
function progressBar(current, max, length = 10) {
    const pct = max > 0 ? Math.min(1, current / max) : 0;
    const filled = Math.round(pct * length);
    return '█'.repeat(filled) + '░'.repeat(length - filled) + ` ${Math.round(pct * 100)}%`;
}

/** Builds an embed for a single aura roll result. */
function buildAuraEmbed(aura, { userTag, rollNumber } = {}) {
    const isGodlike = aura.id === SPECIAL_AURA_IDS.GODLIKE_NOOB;
    const odds = Number(aura.odds ?? aura.chance);
    const value = Number(aura.value);
    const oddsText = Number.isFinite(odds) && odds > 0
        ? `1 in ${odds.toLocaleString()}`
        : 'Unknown';
    const valueText = Number.isFinite(value) && value >= 0
        ? `${value.toLocaleString()} ✨`
        : 'Unknown';

    const embed = new EmbedBuilder()
        .setTitle(`${aura.emoji || '✨'} ${aura.name || 'Unknown Aura'}`)
        .setDescription(aura.description || 'No description is available for this aura.')
        .addFields(
            { name: 'Rarity', value: aura.rarity || 'Unknown', inline: true },
            { name: 'Odds', value: oddsText, inline: true },
            { name: 'Value', value: valueText, inline: true },
        )
        .setColor(isGodlike ? EMBED_COLORS.GODLIKE_RAINBOW_FRAMES[0] : (aura.color || EMBED_COLORS.INFO))
        .setTimestamp();

    if (userTag) embed.setFooter({ text: rollNumber ? `${userTag} • Roll #${rollNumber}` : userTag });
    if (isGodlike) embed.setAuthor({ name: '🌟 GODLIKE AURA FOUND 🌟' });

    return embed;
}

/** Builds a paginated list embed (used by inventory/collection/leaderboard). */
function buildPaginatedEmbed({ title, items, page, itemsPerPage, formatItem, color = EMBED_COLORS.INFO }) {
    const totalPages = Math.max(1, Math.ceil(items.length / itemsPerPage));
    const clampedPage = Math.min(Math.max(1, page), totalPages);
    const start = (clampedPage - 1) * itemsPerPage;
    const pageItems = items.slice(start, start + itemsPerPage);

    const embed = new EmbedBuilder()
        .setTitle(title)
        .setDescription(pageItems.length > 0 ? pageItems.map(formatItem).join('\n') : '*Nothing here yet.*')
        .setColor(color)
        .setFooter({ text: `Page ${clampedPage} / ${totalPages} — ${items.length} total` });

    return { embed, totalPages, clampedPage };
}

module.exports = { progressBar, buildAuraEmbed, buildPaginatedEmbed };
                    
