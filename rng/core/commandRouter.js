// ════════════════════════════════════════════════════════════════
// RNG SYSTEM — Command Router
// Called once per incoming message from index.js's existing
// messageCreate listener (see WIRING.md for the exact snippet).
// Completely independent prefix system from the main bot — reads
// rngData.rngPrefix, NOT the main bot's guildPrefixes.
// ════════════════════════════════════════════════════════════════
const { PERMISSIONS } = require('../constants');
const commandsConfig = require('../config/commands.config');
const { logger } = require('./logger');
const { EMBED_COLORS } = require('../constants');

const commandHandlers = {
    roll: require('../handlers/roll'),
    autoroll: require('../handlers/autoroll'),
    inventory: require('../handlers/inventory'),
    aura: require('../handlers/aura'),
    equip: require('../handlers/equip'),
    unequip: require('../handlers/unequip'),
    favorite: require('../handlers/favorite'),
    collection: require('../handlers/collection'),
    leaderboard: require('../handlers/leaderboard'),
    stats: require('../handlers/stats'),
    history: require('../handlers/history'),
    help: require('../handlers/help'),

    // Owner-only admin commands
    rngprefix: require('../handlers/admin/rngprefix'),
    spawnaura: require('../handlers/admin/spawnaura'),
    givecurrency: require('../handlers/admin/givecurrency'),
    takecurrency: require('../handlers/admin/takecurrency'),
    spawngodlike: require('../handlers/admin/spawngodlike'),
    reloadauras: require('../handlers/admin/reloadauras'),
    rngtest: require('../handlers/admin/rngtest'),
};

/**
 * Handles one incoming Discord message for the RNG system. Returns
 * true if the message was recognized as an RNG command (so index.js
 * knows not to also try processing it as a main-bot prefix command),
 * false otherwise.
 *
 * @param {import('discord.js').Message} message
 * @param {object} rngCtx - shared context: { rngData, OWNER_ID, client }
 * @returns {Promise<boolean>}
 */
async function handleMessage(message, rngCtx) {
    const { rngData, OWNER_ID } = rngCtx;
    if (message.author?.bot) return false;

    const prefix = rngData.rngPrefix;
    if (!message.content.startsWith(prefix)) return false;

    const withoutPrefix = message.content.slice(prefix.length).trim();
    if (!withoutPrefix) return false;

    const args = withoutPrefix.split(/\s+/);
    const commandName = args.shift().toLowerCase();

    const handler = commandHandlers[commandName];
    if (!handler) return false; // not a recognized RNG command — let other handlers try

    const cmdConfig = commandsConfig[commandName];
    if (cmdConfig?.permission === PERMISSIONS.OWNER_ONLY && message.author.id !== OWNER_ID) {
        await message.reply({
            embeds: [{ color: EMBED_COLORS.ERROR, description: '❌ This command is owner-only.' }],
        }).catch(() => {});
        return true; // recognized as an RNG command, just blocked — still consumed
    }

    logger.info(`Command dispatched: ${commandName} by ${message.author.id}`);
    await handler(message, args, rngCtx);
    return true;
}

module.exports = { handleMessage };
