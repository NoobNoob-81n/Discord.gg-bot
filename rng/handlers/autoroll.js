// ════════════════════════════════════════════════════════════════
// RNG SYSTEM — _autoroll
// Secure, prefix-only autoroll. A player buys permanent access once,
// then each session makes exactly one server-timed roll every 5 seconds.
// User input never controls the interval or number of rolls.
// ════════════════════════════════════════════════════════════════
const { safeCommand } = require('../core/errorHandler');
const { rollAura, getAuraById } = require('../rollEngine');
const { getEffectiveLuck } = require('../core/luckCalculator');
const { isGodlikeNoobAvailable, claimGodlikeNoob } = require('../core/godlikeSingleton');
const { buildAuraEmbed } = require('../utils/embeds');
const { calculateRngCoinReward } = require('../utils/rngCoinRewards');
const { reportProgress } = require('../core/questEngine');
const { SPECIAL_AURA_IDS, TIERS } = require('../constants');
const { logger } = require('../core/logger');
const config = require('../config/config');

// userId -> session. Sessions intentionally remain in memory only, so
// they stop after a bot restart and can never generate offline progress.
const activeSessions = new Map();

const normalizeRarity = (value) => String(value || '').trim().toLowerCase();
const validRarities = new Set(TIERS.map(normalizeRarity));

function stopSession(userId) {
    const session = activeSessions.get(userId);
    if (!session) return null;
    if (session.timeoutHandle) clearTimeout(session.timeoutHandle);
    activeSessions.delete(userId);
    return session;
}

function formatSessionSummary(session) {
    if (!session || session.autoSoldCount === 0) return '';
    return ` Autosold **${session.autoSoldCount}** aura${session.autoSoldCount === 1 ? '' : 's'} for **${session.autoSoldCoins.toLocaleString()} 🪙 RNG Coins**.`;
}

function isTargetOrBetter(aura, targetRarity) {
    if (!targetRarity) return false;
    const rolledTierIndex = TIERS.findIndex((tier) => normalizeRarity(tier) === normalizeRarity(aura.rarity));
    const targetTierIndex = TIERS.findIndex((tier) => normalizeRarity(tier) === targetRarity);
    return rolledTierIndex !== -1 && targetTierIndex !== -1 && rolledTierIndex >= targetTierIndex;
}

function canAutoSell(aura, session) {
    // The global singleton must never be automatically removed.
    return aura.id !== SPECIAL_AURA_IDS.GODLIKE_NOOB
        && session.autoSellRarities.has(normalizeRarity(aura.rarity));
}

function getAutoSellReward(aura) {
    const rareReward = calculateRngCoinReward(aura.odds);
    return Math.max(
        config.autoSellMinimumRngCoins,
        Math.floor(rareReward * config.autoSellRareRewardRate)
    );
}

function findStoredAutoSellCandidate(rngData, userId, session) {
    const equippedAuraId = rngData.equipped.get(userId);
    const favoriteAuraId = rngData.favorite.get(userId);
    const inventory = rngData.inventory.get(userId) || [];

    return inventory
        .map((entry) => ({ entry, aura: getAuraById(entry.auraId) }))
        .filter(({ aura }) => aura && canAutoSell(aura, session))
        .filter(({ aura }) => aura.id !== equippedAuraId && aura.id !== favoriteAuraId)
        // Sell the least rare eligible result first, protecting the better ones.
        .sort((left, right) => left.aura.odds - right.aura.odds)[0] || null;
}

function sellStoredAura(rngData, userId, candidate, session) {
    const removed = rngData.removeFromInventory(userId, candidate.aura.id, 1);
    if (removed !== 1) return false;

    const reward = getAutoSellReward(candidate.aura);
    rngData.addCurrency(userId, 'rngCoins', reward);
    session.autoSoldCount += 1;
    session.autoSoldCoins += reward;
    return true;
}

function parseStartOptions(args) {
    const selectorIndex = args.findIndex((arg) => /^autosell\s*:/i.test(arg));
    // Accept an optional filler word so this natural command works:
    // _autoroll start glitched aura autosell: common, epic, legendary
    const beforeSelector = (selectorIndex === -1 ? args : args.slice(0, selectorIndex))
        .filter((arg) => normalizeRarity(arg) !== 'aura');

    if (beforeSelector.length > 1) {
        return { error: 'Use only one target rarity before `autosell:`.' };
    }

    const targetRarity = beforeSelector[0] ? normalizeRarity(beforeSelector[0]) : null;
    if (targetRarity && !validRarities.has(targetRarity)) {
        return { error: `Unknown target rarity **${beforeSelector[0]}**. Use a valid aura tier, such as \`glitched\`.` };
    }

    const autoSellRarities = new Set();
    if (selectorIndex !== -1) {
        const rawList = args.slice(selectorIndex).join(' ').replace(/^autosell\s*:\s*/i, '').trim();
        if (!rawList) return { error: 'Add at least one rarity after `autosell:`.' };

        for (const rawRarity of rawList.split(',')) {
            const rarity = normalizeRarity(rawRarity);
            if (!rarity) continue;
            if (!validRarities.has(rarity)) {
                return { error: `Unknown autosell rarity **${rawRarity.trim()}**.` };
            }
            autoSellRarities.add(rarity);
        }

        if (autoSellRarities.size === 0) {
            return { error: 'Add at least one valid rarity after `autosell:`.' };
        }
    }

    return { targetRarity, autoSellRarities };
}

async function runAutoRollTick(session, rngData, client) {
    const currentSession = activeSessions.get(session.userId);
    if (currentSession !== session || session.running) return;
    session.running = true;

    try {
        const channel = await client.channels.fetch(session.channelId).catch(() => null);
        if (!channel) {
            stopSession(session.userId);
            return;
        }

        // Never silently delete a stored aura. If storage is full, only make
        // room by selling one of the explicit autosell tiers, never equipped
        // or favourited auras. Otherwise stop safely.
        if (rngData.getAuraUsage(session.userId) >= rngData.getAuraCapacity(session.userId)) {
            const candidate = findStoredAutoSellCandidate(rngData, session.userId, session);
            if (!candidate || !sellStoredAura(rngData, session.userId, candidate, session)) {
                stopSession(session.userId);
                await channel.send(
                    `🛑 <@${session.userId}> Auto-roll stopped because your aura storage is full. ` +
                    `Use \`${rngData.rngPrefix}storage upgrade\`, \`${rngData.rngPrefix}sell <aura>\`, ` +
                    `or add autosell tiers when starting auto-roll.${formatSessionSummary(session)}`
                ).catch(() => {});
                return;
            }
        }

        const luckBonus = getEffectiveLuck(rngData, session.userId);
        const aura = rollAura({
            userId: session.userId,
            luckBonus,
            godlikeNoobAvailable: isGodlikeNoobAvailable(rngData),
        });

        const reachedTarget = isTargetOrBetter(aura, session.targetRarity);
        const shouldSellResult = canAutoSell(aura, session) && !reachedTarget;
        const result = rngData.recordAuraRoll(session.userId, aura.id, { store: !shouldSellResult });
        rngData.addToHistory(session.userId, aura.id);

        if (shouldSellResult) {
            const reward = getAutoSellReward(aura);
            rngData.addCurrency(session.userId, 'rngCoins', reward);
            session.autoSoldCount += 1;
            session.autoSoldCoins += reward;
        }

        if (aura.id === SPECIAL_AURA_IDS.GODLIKE_NOOB) {
            claimGodlikeNoob(rngData, session.userId);
        }

        reportProgress(rngData, session.userId, {
            type: 'aura_rolled',
            rarity: aura.rarity,
            oddsValue: aura.odds,
            count: 1,
        });

        // Only announce stored rare finds. Common autosold results remain
        // quiet so one autoroller cannot spam a channel every five seconds.
        if (result.stored && aura.odds >= config.rareLogThresholdOdds) {
            const embed = buildAuraEmbed(aura, { userTag: session.userTag, rollNumber: result.rollNumber });
            await channel.send({ content: `<@${session.userId}>`, embeds: [embed] }).catch(() => {});
        }

        if (reachedTarget) {
            stopSession(session.userId);
            await channel.send(
                `🎯 <@${session.userId}> Auto-roll stopped — found **${aura.name}** (${aura.rarity}) ` +
                `on roll #${result.rollNumber}!${formatSessionSummary(session)}`
            ).catch(() => {});
        }
    } catch (error) {
        logger.error(`Auto-roll tick failed for user ${session.userId}:`, error);
        stopSession(session.userId);
    } finally {
        session.running = false;
        // A recursive timeout avoids overlapping async setInterval ticks. The
        // fixed config value guarantees no player can make rapid-roll loops.
        if (activeSessions.get(session.userId) === session) {
            session.timeoutHandle = setTimeout(
                () => runAutoRollTick(session, rngData, client),
                config.autoRollIntervalMs
            );
        }
    }
}

const autorollCommand = safeCommand('autoroll', async (message, args, { rngData, client }) => {
    const userId = message.author.id;
    const subcommand = (args[0] || '').toLowerCase();

    if (subcommand === 'stop') {
        const session = stopSession(userId);
        return message.reply(session
            ? `🛑 Auto-roll stopped.${formatSessionSummary(session)}`
            : 'You do not have an active auto-roll session.');
    }

    if (subcommand === 'unlock' || subcommand === 'buy') {
        const unlock = rngData.unlockAutoroll(userId);
        if (!unlock.success) {
            const missing = unlock.cost - unlock.balance;
            return message.reply(
                `❌ Auto-roll costs **${unlock.cost.toLocaleString()} 🪙 RNG Coins**. ` +
                `You have **${unlock.balance.toLocaleString()}**, so you need **${missing.toLocaleString()}** more.`
            );
        }
        return message.reply(unlock.alreadyUnlocked
            ? '✅ You already own permanent auto-roll access.'
            : `✅ Auto-roll unlocked permanently for **${config.autoRollUnlockCost.toLocaleString()} 🪙 RNG Coins**! Use \`${rngData.rngPrefix}autoroll start\`.`
        );
    }

    if (subcommand !== 'start') {
        return message.reply(
            `Usage:\n` +
            `\`${rngData.rngPrefix}autoroll unlock\` — one-time ${config.autoRollUnlockCost.toLocaleString()} 🪙 unlock\n` +
            `\`${rngData.rngPrefix}autoroll start [target] [autosell: tier, tier]\`\n` +
            `\`${rngData.rngPrefix}autoroll stop\``
        );
    }

    if (!rngData.hasAutorollUnlocked(userId)) {
        return message.reply(
            `🔒 Auto-roll requires a one-time **${config.autoRollUnlockCost.toLocaleString()} 🪙 RNG Coin** unlock. ` +
            `Use \`${rngData.rngPrefix}autoroll unlock\`.`
        );
    }

    if (activeSessions.has(userId)) {
        return message.reply(`You already have an active auto-roll session. Stop it first with \`${rngData.rngPrefix}autoroll stop\`.`);
    }

    const options = parseStartOptions(args.slice(1));
    if (options.error) return message.reply(`❌ ${options.error}`);

    const session = {
        userId,
        userTag: message.author.tag,
        channelId: message.channel.id,
        targetRarity: options.targetRarity,
        autoSellRarities: options.autoSellRarities,
        autoSoldCount: 0,
        autoSoldCoins: 0,
        timeoutHandle: null,
        running: false,
    };

    activeSessions.set(userId, session);
    session.timeoutHandle = setTimeout(
        () => runAutoRollTick(session, rngData, client),
        config.autoRollIntervalMs
    );

    const targetText = session.targetRarity ? ` Target: **${session.targetRarity}** or better.` : '';
    const autosellText = session.autoSellRarities.size > 0
        ? ` Autosell: **${[...session.autoSellRarities].join(', ')}**.`
        : '';

    return message.reply(
        `▶️ Auto-roll started. It will roll exactly once every **${config.autoRollIntervalMs / 1000} seconds**.${targetText}${autosellText}\n` +
        `⚠️ Auto-roll stops if the bot restarts, your storage fills, or you run \`${rngData.rngPrefix}autoroll stop\`.`
    );
});

module.exports = autorollCommand;
module.exports.stopSession = stopSession;
module.exports.activeSessions = activeSessions;
