// ════════════════════════════════════════════════════════════════
// RNG SYSTEM — _roll
// The core command: rolls one aura, adds it to inventory, shows
// the result embed.
// ════════════════════════════════════════════════════════════════
const { safeCommand } = require('../core/errorHandler');
const { rollAura } = require('../rollEngine');
const { getEffectiveLuck } = require('../core/luckCalculator');
const { isGodlikeNoobAvailable, claimGodlikeNoob } = require('../core/godlikeSingleton');
const { buildAuraEmbed } = require('../utils/embeds');
const { CURRENCIES, SPECIAL_AURA_IDS } = require('../constants');
const config = require('../config/config');

// Simple per-user cooldown tracker, in-memory only (resets on
// restart, which is fine — cooldowns are anti-spam, not persistent state).
const lastRollAt = new Map();

module.exports = safeCommand('roll', async (message, args, { rngData }) => {
    const userId = message.author.id;

    const now = Date.now();
    const last = lastRollAt.get(userId) || 0;
    const remaining = config.rollCooldownMs - (now - last);
    if (remaining > 0) {
        return message.reply(`⏳ Please wait ${(remaining / 1000).toFixed(1)}s before rolling again.`);
    }
    lastRollAt.set(userId, now);

    const luckBonus = getEffectiveLuck(rngData, userId);
    const godlikeAvailable = isGodlikeNoobAvailable(rngData);

    const aura = rollAura({ userId, luckBonus, godlikeNoobAvailable: godlikeAvailable });

    rngData.addToInventory(userId, aura.id);
    rngData.addToHistory(userId, aura.id);

    if (aura.id === SPECIAL_AURA_IDS.GODLIKE_NOOB) {
        claimGodlikeNoob(rngData, userId);
    }

    const rollNumber = rngData.rollCount.get(userId) || 1;
    const embed = buildAuraEmbed(aura, { userTag: message.author.tag, rollNumber });

    await message.reply({ embeds: [embed] });

    // Special server-wide announcement for Godlike Noob, per spec.
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
