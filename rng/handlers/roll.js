// ════════════════════════════════════════════════════════════════
// RNG SYSTEM — _roll (v2, integrates potions + quests + RNG Coins)
// This REPLACES your existing handlers/roll.js. Key additions vs the
// original:
//   - Combines base luck with active potion luck bonus
//   - Consumes any pending one-time potion effect on this roll
//   - Reports quest progress via ON_QUEST_PROGRESS
//   - Shows RNG Coins earned in the reply (actual awarding happens
//     in plugins/rngCoins.js, listening to ON_AURA_FOUND — this
//     handler just displays it for user feedback)
// ════════════════════════════════════════════════════════════════
const { safeCommand } = require('../core/errorHandler');
const { rollAura } = require('../rollEngine');
const { getEffectiveLuck } = require('../core/luckCalculator');
const { getActivePotionEffects } = require('../core/potionEngine');
const { isGodlikeNoobAvailable, claimGodlikeNoob } = require('../core/godlikeSingleton');
const { calculateRngCoinReward } = require('../utils/rngCoinRewards');
const { buildAuraEmbed } = require('../utils/embeds');
const { eventBus } = require('../core/eventBus');
const { CURRENCIES, SPECIAL_AURA_IDS, EVENTS } = require('../constants');
const { reportProgress } = require('../core/questEngine');
const config = require('../config/config');

const lastRollAt = new Map();

module.exports = safeCommand('roll', async (message, args, { rngData }) => {
    const userId = message.author.id;

    const usedSlots = rngData.getAuraUsage(userId);
    const capacity = rngData.getAuraCapacity(userId);
    if (usedSlots >= capacity) {
        return message.reply(
            `🎒 Your aura storage is full (**${usedSlots}/${capacity}**). ` +
            `Use \`${rngData.rngPrefix}storage upgrade\` or \`${rngData.rngPrefix}sell <aura>\` before rolling again.`
        );
    }

    const now = Date.now();
    const last = lastRollAt.get(userId) || 0;
    const remaining = config.rollCooldownMs - (now - last);
    if (remaining > 0) {
        return message.reply(`⏳ Please wait ${(remaining / 1000).toFixed(1)}s before rolling again.`);
    }
    lastRollAt.set(userId, now);

    // ── Combine base/glove luck with active potion effects. The
    // potion check with consumeOneTime:true here means if the user
    // has a pending Heavenly/Oblivion/etc., THIS roll consumes it. ──
    const baseLuck = getEffectiveLuck(rngData, userId);
    const potionEffects = getActivePotionEffects(rngData, userId, { consumeOneTime: true });
    const totalLuck = baseLuck + potionEffects.luckBonus;

    const godlikeAvailable = isGodlikeNoobAvailable(rngData);
    const aura = rollAura({ userId, luckBonus: totalLuck, godlikeNoobAvailable: godlikeAvailable });

    const storedResult = rngData.recordAuraRoll(userId, aura.id, { store: true });
    rngData.addToHistory(userId, aura.id);

    if (aura.id === SPECIAL_AURA_IDS.GODLIKE_NOOB) {
        claimGodlikeNoob(rngData, userId);
    }

    // ── Report quest progress. Quests listening for 'aura_rolled'
    // will pick this up via reportProgress — see data/quests.js. ──
    reportProgress(rngData, userId, {
        type: 'aura_rolled',
        rarity: aura.rarity,
        oddsValue: aura.odds,
        count: 1,
    });

    const embed = buildAuraEmbed(aura, { userTag: message.author.tag, rollNumber: storedResult.rollNumber });
    embed.setFooter({ text: `Aura Storage: ${storedResult.usedSlots}/${storedResult.capacity}` });

    const coinReward = calculateRngCoinReward(aura.odds);
    if (coinReward > 0) {
        embed.addFields({ name: '🪙 RNG Coins Earned', value: `+${coinReward.toLocaleString()}`, inline: true });
    }

    await message.reply({ embeds: [embed] });

    if (aura.id === SPECIAL_AURA_IDS.GODLIKE_NOOB && aura.announceOnRoll) {
        await message.channel.send({
            content: `@everyone`,
            embeds: [{
                title: '🌟 THE GODLIKE NOOB HAS BEEN FOUND 🌟',
                description: `${message.author} has rolled **The Godlike Noob** — the rarest aura in existence!`,
                color: 0xFFFFFF,
            }],
        }).catch(() => {});
    }
});
