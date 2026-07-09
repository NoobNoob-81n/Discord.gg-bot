// ════════════════════════════════════════════════════════════════
// RNG SYSTEM — _help
// ════════════════════════════════════════════════════════════════
const { safeCommand } = require('../core/errorHandler');
const { EmbedBuilder } = require('discord.js');
const { EMBED_COLORS, PERMISSIONS } = require('../constants');
const commandsConfig = require('../config/commands.config');

module.exports = safeCommand('help', async (message, args, { rngData }) => {
    const p = rngData.rngPrefix;

    const publicCommands = Object.entries(commandsConfig)
        .filter(([, cfg]) => cfg.permission === PERMISSIONS.EVERYONE)
        .map(([name]) => `\`${p}${name}\``)
        .join(', ');

    const embed = new EmbedBuilder()
        .setTitle('✨ Aura RNG — Commands')
        .setColor(EMBED_COLORS.INFO)
        .setDescription(`Current prefix: \`${p}\``)
        .addFields({ name: 'Commands', value: publicCommands });

    await message.reply({ embeds: [embed] });
});
