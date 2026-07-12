// ════════════════════════════════════════════════════════════════
// RNG SYSTEM — _takecurrency (owner only)
// Usage: takecurrency <@user> <currencyKey> <amount>
// ════════════════════════════════════════════════════════════════
const { safeCommand } = require('../../core/errorHandler');
const { CURRENCIES } = require('../../constants');
const { logger } = require('../../core/logger');

module.exports = safeCommand('takecurrency', async (message, args, { rngData }) => {
    const target = message.mentions.users.first();
    const currencyKey = args[2];
    const amount = Number(args[3]);

    const validKeys = Object.values(CURRENCIES);
    if (!target || !validKeys.includes(currencyKey) || !Number.isFinite(amount)) {
        return message.reply(`Usage: \`takecurrency @user <${validKeys.join('|')}> <amount>\``);
    }

    const newBalance = rngData.addCurrency(target.id, currencyKey, -Math.abs(amount));
    logger.admin(message.author.id, 'takecurrency', { target: target.id, currencyKey, amount });

    await message.reply(`✅ Took **${amount.toLocaleString()} ${currencyKey}** from ${target}. New balance: ${newBalance.toLocaleString()}`);
});
