// ════════════════════════════════════════════════════════════════
// RNG SYSTEM — Error Handling
// Wraps every command handler so a bug in ONE command can never
// crash the RNG system, the message handler, or the bot itself.
// Every command file should export its handler wrapped in this.
// ════════════════════════════════════════════════════════════════
const { logger } = require('./logger');
const { EMBED_COLORS } = require('../constants');

/**
 * Wraps a command handler function with centralized try/catch and
 * user-facing error messaging.
 * @param {string} commandName
 * @param {(message, args, ctx) => Promise<void>} handler
 * @returns {(message, args, ctx) => Promise<void>}
 */
function safeCommand(commandName, handler) {
    return async (message, args, ctx) => {
        try {
            await handler(message, args, ctx);
        } catch (err) {
            logger.error(`Command "${commandName}" threw an error:`, err);
            await message.reply({
                embeds: [{
                    color: EMBED_COLORS.ERROR,
                    title: '⚠️ Something went wrong',
                    description: `The \`${commandName}\` command hit an unexpected error. This has been logged.`,
                }],
            }).catch(() => {
                // Even the error-reporting reply can fail (e.g. missing
                // permissions) — swallow that rather than throwing again.
                logger.error(`Additionally failed to send error message for "${commandName}"`);
            });
        }
    };
}

module.exports = { safeCommand };
