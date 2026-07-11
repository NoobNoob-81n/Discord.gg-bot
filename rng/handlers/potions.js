// ════════════════════════════════════════════════════════════════
// RNG SYSTEM — _potions
// Usage:
//   potions                    — list your potion inventory
//   potions use <potionId>     — consume a potion
//   potions info <potionId>    — view a potion's full details
// ════════════════════════════════════════════════════════════════
const { EmbedBuilder } = require('discord.js');
const { POTIONS } = require('../data/auras/potions');
const { consumePotion, getActivePotionEffects } = require('../core/potionEngine');
const { EMBED_COLORS } = require('../constants');

module.exports = async function potionsHandler(message, args, { rngData }) {
    const userId = message.author.id;
    const sub = (args[0] || '').toLowerCase();

    if (sub === 'use') {
        const potionId = args[1];
        if (!potionId || !POTIONS[potionId]) {
            return message.reply(`Usage: \`potions use <potionId>\`. Run \`potions\` to see your inventory and valid ids.`);
        }
        const result = consumePotion(rngData, userId, potionId);
        if (!result.ok) {
            return message.reply(`❌ ${result.reason}`);
        }
        const desc = result.resolvedOutcomeName
            ? `${result.potion.name} resolved to: **${result.resolvedOutcomeName}**`
            : result.potion.description;
        return message.reply({
            embeds: [new EmbedBuilder()
                .setTitle(`${result.potion.emoji} ${result.potion.name} consumed!`)
                .setDescription(desc)
                .setColor(EMBED_COLORS.SUCCESS)],
        });
    }

    if (sub === 'info') {
        const potionId = args[1];
        const potion = POTIONS[potionId];
        if (!potion) return message.reply('Unknown potion id. Run `potions` to see your inventory.');
        return message.reply({
            embeds: [new EmbedBuilder()
                .setTitle(`${potion.emoji} ${potion.name}`)
                .setDescription(potion.description)
                .addFields({ name: 'Category', value: potion.category, inline: true })
                .setColor(EMBED_COLORS.INFO)],
        });
    }

    // Default: show inventory + currently active effects
    const inventory = rngData.potionInventory?.get(userId) || {};
    const owned = Object.entries(inventory).filter(([, count]) => count > 0);

    const invLines = owned.length > 0
        ? owned.map(([id, count]) => `${POTIONS[id]?.emoji || '🧪'} **${POTIONS[id]?.name || id}** x${count}`).join('\n')
        : '*No potions yet — complete daily quests to earn potion chests!*';

    const { luckBonus, rollSpeedBonus } = getActivePotionEffects(rngData, userId);

    const embed = new EmbedBuilder()
        .setTitle(`🧪 ${message.author.username}'s Potions`)
        .setColor(EMBED_COLORS.INFO)
        .addFields(
            { name: 'Inventory', value: invLines },
            { name: 'Active Effects', value: `Luck: +${luckBonus}% | Roll Speed: +${rollSpeedBonus}%` },
        );

    await message.reply({ embeds: [embed] });
};
