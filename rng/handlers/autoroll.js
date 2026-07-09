// ════════════════════════════════════════════════════════════════
// RNG SYSTEM — _autoroll
// Starts/stops a repeated rolling loop for the user. IMPORTANT:
// sessions are held in an in-memory Map, NOT persisted to storage —
// per explicit design decision, auto-roll stops if the bot restarts
// and must be manually restarted. This avoids "offline progression"
// entirely, which was a specific requirement.
//
// Usage:
//   _autoroll start [intervalSeconds] [targetRarity]
//   _autoroll stop
// ════════════════════════════════════════════════════════════════
const { safeCommand } = require('../core/errorHandler');
const { rollAura } = require('../rollEngine');
const { getEffectiveLuck } = require('../core/luckCalculator');
const { isGodlikeNoobAvailable, claimGodlikeNoob } = require('../core/godlikeSingleton');
const { buildAuraEmbed } = require('../utils/embeds');
const { SPECIAL_AURA_IDS } = require('../constants');
const { logger } = require('../core/logger');
const config = require('../config/config');

// userId -> { intervalHandle, channelId, targetRarity }
// In-memory ONLY — see file header comment for why this must never
// be persisted to storage.
const activeSessions = new Map();

function stopSession(userId) {
    const session = activeSessions.get(userId);
    if (session) {
        clearInterval(session.intervalHandle);
        activeSessions.delete(userId);
    }
}

const autorollCommand = safeCommand('autoroll', async (message, args, { rngData, client }) => {
    const userId = message.author.id;
    const sub = (args[0] || '').toLowerCase();

    if (sub === 'stop') {
        if (!activeSessions.has(userId)) {
            return message.reply('You don\'t have an active auto-roll session.');
        }
        stopSession(userId);
        return message.reply('🛑 Auto-roll stopped.');
    }

    if (sub !== 'start') {
        return message.reply(`Usage: \`${rngData.rngPrefix}autoroll start [seconds] [targetRarity]\` or \`${rngData.rngPrefix}autoroll stop\``);
    }

    if (activeSessions.has(userId)) {
        return message.reply('You already have an active auto-roll session. Stop it first with `autoroll stop`.');
    }

    const requestedSeconds = Number(args[1]);
    const intervalMs = Math.max(
        config.autoRollMinIntervalMs,
        (Number.isFinite(requestedSeconds) ? requestedSeconds * 1000 : config.autoRollDefaultIntervalMs)
    );
    const targetRarity = args[2] ? args[2].toLowerCase() : null;

    const channelId = message.channel.id;

    const intervalHandle = setInterval(async () => {
        try {
            const luckBonus = getEffectiveLuck(rngData, userId);
            const godlikeAvailable = isGodlikeNoobAvailable(rngData);
            const aura = rollAura({ userId, luckBonus, godlikeNoobAvailable: godlikeAvailable });

            rngData.addToInventory(userId, aura.id);
            rngData.addToHistory(userId, aura.id);

            if (aura.id === SPECIAL_AURA_IDS.GODLIKE_NOOB) {
                claimGodlikeNoob(rngData, userId);
            }

            const channel = await client.channels.fetch(channelId).catch(() => null);
            if (!channel) {
                // Channel no longer accessible — stop the session rather
                // than silently rolling forever with nowhere to post.
                stopSession(userId);
                return;
            }

            const rollNumber = rngData.rollCount.get(userId) || 1;

            // Only post an embed for rare+ finds during auto-roll, to
            // avoid spamming the channel with every single common roll.
            if (aura.odds >= config.rareLogThresholdOdds) {
                const embed = buildAuraEmbed(aura, { userTag: message.author.tag, rollNumber });
                await channel.send({ content: `${message.author}`, embeds: [embed] }).catch(() => {});
            }

            // Auto-stop if the target rarity (or better) was found.
            if (targetRarity && aura.rarity.toLowerCase() === targetRarity) {
                stopSession(userId);
                await channel.send(`🎯 ${message.author} Auto-roll stopped — found target rarity **${aura.rarity}**!`).catch(() => {});
            }
        } catch (err) {
            logger.error(`Auto-roll tick failed for user ${userId}:`, err);
            stopSession(userId);
        }
    }, intervalMs);

    activeSessions.set(userId, { intervalHandle, channelId, targetRarity });

    await message.reply(
        `▶️ Auto-roll started (every ${(intervalMs / 1000).toFixed(1)}s)${targetRarity ? `, stopping when **${targetRarity}** or better is found` : ''}.\n` +
        `⚠️ Auto-roll stops if the bot restarts — you'll need to run this command again.`
    );
});

module.exports = autorollCommand;
module.exports.stopSession = stopSession;
module.exports.activeSessions = activeSessions;
