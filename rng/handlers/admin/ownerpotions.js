// ════════════════════════════════════════════════════════════════
// RNG SYSTEM — _ownerpotions (owner only)
// Testing/admin tool for potions. Usage:
//   ownerpotions give <@user> <potionId> <count>   — spawn a specific potion
//   ownerpotions giveall <@user>                    — grant 1 of EVERY potion
//   ownerpotions list                               — list all valid potion ids
// ════════════════════════════════════════════════════════════════
const { EmbedBuilder } = require('discord.js');
const { POTIONS, resolvePotionId } = require('../../data/potions');
const { EMBED_COLORS } = require('../../constants');
const { logger } = require('../../core/logger');

module.exports = async function ownerPotionsHandler(message, args, { rngData }) {
    const sub = (args[0] || '').toLowerCase();

    if (sub === 'list') {
        const lines = Object.values(POTIONS).map((p) => `\`${p.id}\` — ${p.emoji} ${p.name}`).join('\n');
        return message.reply({
            embeds: [new EmbedBuilder().setTitle('🧪 All Potion IDs').setDescription(lines).setColor(EMBED_COLORS.INFO)],
        });
    }

    if (sub === 'giveall') {
        const target = message.mentions.users.first() || message.author;
        if (!rngData.potionInventory) rngData.potionInventory = new Map();
        const inv = rngData.potionInventory.get(target.id) || {};

        for (const potionId of Object.keys(POTIONS)) {
            inv[potionId] = (inv[potionId] || 0) + 1;
        }
        rngData.potionInventory.set(target.id, inv);
        rngData._markDirty();

        logger.admin(message.author.id, 'ownerpotions_giveall', { target: target.id });
        return message.reply(`✅ Gave ${target} **1x of every potion** (${Object.keys(POTIONS).length} total).`);
    }

    if (sub === 'give') {
        const target = message.mentions.users.first();
        const rawPotionId = args[2];
        const count = Number(args[3]) || 1;

        if (!target || !rawPotionId) {
            return message.reply('Usage: `ownerpotions give @user <potionId> <count>`');
        }

        const potionId = resolvePotionId(rawPotionId);
        if (!POTIONS[potionId]) {
            return message.reply(`❌ Unknown potion id "${rawPotionId}". Run \`ownerpotions list\` to see valid ids.`);
        }

        if (!rngData.potionInventory) rngData.potionInventory = new Map();
        const inv = rngData.potionInventory.get(target.id) || {};
        inv[potionId] = (inv[potionId] || 0) + count;
        rngData.potionInventory.set(target.id, inv);
        rngData._markDirty();

        logger.admin(message.author.id, 'ownerpotions_give', { target: target.id, potionId, count });
        return message.reply(`✅ Gave ${target} **${count}x ${POTIONS[potionId].name}**.`);
    }

    return message.reply('Usage: `ownerpotions give @user <potionId> <count>` | `ownerpotions giveall @user` | `ownerpotions list`');
};
