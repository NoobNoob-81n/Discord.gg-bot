// ════════════════════════════════════════════════════════════════
// RNG SYSTEM — _rngprefix (owner only)
// Changes rngData.rngPrefix. Completely independent from the main
// bot's guildPrefixes system.
// ════════════════════════════════════════════════════════════════
const { safeCommand } = require('../../core/errorHandler');
const { logger } = require('../../core/logger');

module.exports = safeCommand('rngprefix', async (message, args, { rngData }) => {
    const newPrefix = args[0];
    if (!newPrefix || newPrefix.length > 5) {
        return message.reply(`Usage: \`${rngData.rngPrefix}rngprefix <new prefix>\` (max 5 characters). Current prefix: \`${rngData.rngPrefix}\``);
    }

    const old = rngData.rngPrefix;
    rngData.rngPrefix = newPrefix;
    rngData._markDirty();
    logger.admin(message.author.id, 'rngprefix', { from: old, to: newPrefix });

    await message.reply(`✅ RNG prefix changed from \`${old}\` to \`${newPrefix}\`. Commands are now \`${newPrefix}roll\`, \`${newPrefix}inventory\`, etc.`);
});
