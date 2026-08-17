// ════════════════════════════════════════════════════════════════
// RNG SYSTEM — _storage
// Shows aura capacity and lets players buy persistent slot upgrades.
// ════════════════════════════════════════════════════════════════
const { EmbedBuilder } = require('discord.js');
const { safeCommand } = require('../core/errorHandler');
const { EMBED_COLORS } = require('../constants');
const config = require('../config/config');

function buildStorageEmbed(userName, rngData, userId, description = null) {
    const used = rngData.getAuraUsage(userId);
    const capacity = rngData.getAuraCapacity(userId);
    const level = rngData.getStorageUpgradeLevel(userId);
    const nextCost = rngData.getNextStorageUpgradeCost(userId);
    const coins = rngData.rngCoins.get(userId) || 0;

    const nextUpgradeText = nextCost === null
        ? `Maximum storage reached (${config.maxAuraStorageUpgrades} upgrades).`
        : `**Next upgrade:** +${config.auraStorageSlotsPerUpgrade} slots for **${nextCost.toLocaleString()} 🪙 RNG Coins**`;

    return new EmbedBuilder()
        .setColor(used >= capacity ? EMBED_COLORS.WARNING : EMBED_COLORS.INFO)
        .setTitle(`🎒 ${userName}'s Aura Storage`)
        .setDescription(description || 'Your stored auras are protected by this capacity limit.')
        .addFields(
            { name: 'Storage', value: `**${used} / ${capacity}** slots used`, inline: true },
            { name: 'Upgrade Level', value: `**${level} / ${config.maxAuraStorageUpgrades}**`, inline: true },
            { name: 'RNG Coins', value: `**${coins.toLocaleString()}** 🪙`, inline: true },
            { name: 'Upgrade', value: nextUpgradeText, inline: false },
            { name: 'Command', value: '`_storage upgrade`', inline: false },
        );
}

module.exports = safeCommand('storage', async (message, args, { rngData }) => {
    const userId = message.author.id;
    const subcommand = (args[0] || 'status').toLowerCase();

    if (subcommand === 'status' || subcommand === 'info') {
        return message.reply({ embeds: [buildStorageEmbed(message.author.username, rngData, userId)] });
    }

    if (subcommand === 'upgrade') {
        const result = rngData.upgradeAuraStorage(userId);

        if (result.maxed) {
            return message.reply({
                embeds: [buildStorageEmbed(
                    message.author.username,
                    rngData,
                    userId,
                    '✅ Your aura storage is already at the maximum upgrade level.'
                )],
            });
        }

        if (!result.success) {
            const missing = Math.max(0, result.cost - result.balance);
            return message.reply({
                embeds: [buildStorageEmbed(
                    message.author.username,
                    rngData,
                    userId,
                    `❌ You need **${missing.toLocaleString()}** more 🪙 RNG Coins for this upgrade.`
                )],
            });
        }

        return message.reply({
            embeds: [buildStorageEmbed(
                message.author.username,
                rngData,
                userId,
                `✅ Storage upgraded! You spent **${result.cost.toLocaleString()} 🪙 RNG Coins** and now have **${result.capacity}** aura slots.`
            )],
        });
    }

    return message.reply('Usage: `_storage` or `_storage upgrade`');
});
