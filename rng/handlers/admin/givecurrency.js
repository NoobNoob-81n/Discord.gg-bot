// ════════════════════════════════════════════════════════════════
// RNG SYSTEM — _givecurrency (owner only)
// Usage: givecurrency <@user> <currencyKey> <amount>
// ════════════════════════════════════════════════════════════════
const { safeCommand } = require('../../core/errorHandler');
const { CURRENCIES } = require('../../constants');
const { logger } = require('../../core/logger');

module.exports = safeCommand('givecurrency', async (message, args, { rngData }) => {
    const target = message.mentions.users.first();
    const currencyKey = args[2];
    const amount = Number(args[3]);

    const validKeys = Object.values(CURRENCIES);
    if (!target || !validKeys.includes(currencyKey) || !Number.isFinite(amount)) {
        return message.reply(`Usage: \`givecurrency @user <${validKeys.join('|')}> <amount>\``);
    }

    const newBalance = rngData.addCurrency(target.id, currencyKey, amount);
    logger.admin(message.author.id, 'givecurrency', { target: target.id, currencyKey, amount });

    await message.reply(`✅ Gave **${amount.toLocaleString()} ${currencyKey}** to ${target}. New balance: ${newBalance.toLocaleString()}`);
});
