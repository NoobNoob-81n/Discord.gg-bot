// ════════════════════════════════════════════════════════════════
// RNG SYSTEM — _sell
// Lets players manually free aura-storage slots for RNG Coins.
// ════════════════════════════════════════════════════════════════
const { safeCommand } = require('../core/errorHandler');
const { getAuraById, getAllAurasSortedByRarity } = require('../rollEngine');
const { calculateRngCoinReward } = require('../utils/rngCoinRewards');
const config = require('../config/config');

function normalize(value) {
    return String(value || '').trim().toLowerCase();
}

function getSellReward(aura) {
    return Math.max(
        config.autoSellMinimumRngCoins,
        Math.floor(calculateRngCoinReward(aura.odds) * config.autoSellRareRewardRate)
    );
}

function findAura(query) {
    const normalizedQuery = normalize(query);
    if (!normalizedQuery) return null;

    const directMatch = getAuraById(normalizedQuery);
    if (directMatch) return directMatch;

    const compactQuery = normalizedQuery.replace(/\s+/g, ' ');
    return getAllAurasSortedByRarity().find((aura) =>
        normalize(aura.name) === compactQuery || normalize(aura.id) === compactQuery
    ) || null;
}

module.exports = safeCommand('sell', async (message, args, { rngData }) => {
    if (args.length === 0) {
        return message.reply('Usage: `_sell <aura name or ID> [amount|all]`\nExample: `_sell Faint Glow all`');
    }

    let requestedAmount = 1;
    const lastArg = normalize(args[args.length - 1]);
    let auraArgs = args;

    if (lastArg === 'all') {
        requestedAmount = Number.MAX_SAFE_INTEGER;
        auraArgs = args.slice(0, -1);
    } else if (/^\d+$/.test(lastArg)) {
        requestedAmount = Math.max(1, Math.floor(Number(lastArg)));
        auraArgs = args.slice(0, -1);
    }

    const aura = findAura(auraArgs.join(' '));
    if (!aura) {
        return message.reply('❌ I could not find that aura. Use its exact name or ID from `_inventory`.');
    }

    const owned = (rngData.inventory.get(message.author.id) || [])
        .filter((entry) => entry.auraId === aura.id).length;

    if (owned === 0) {
        return message.reply(`❌ You do not have **${aura.name}** in your storage.`);
    }

    const removeCount = Math.min(owned, requestedAmount);
    const removed = rngData.removeFromInventory(message.author.id, aura.id, removeCount);
    const totalReward = getSellReward(aura) * removed;
    rngData.addCurrency(message.author.id, 'rngCoins', totalReward);

    const usage = rngData.getAuraUsage(message.author.id);
    const capacity = rngData.getAuraCapacity(message.author.id);

    return message.reply(
        `💸 Sold **${removed}× ${aura.name}** for **${totalReward.toLocaleString()} 🪙 RNG Coins**. ` +
        `Storage: **${usage}/${capacity}**.`
    );
});
