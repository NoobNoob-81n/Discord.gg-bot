// ════════════════════════════════════════════════════════════════
// RNG SYSTEM — _aura
// Looks up an aura by (partial, case-insensitive) name and shows
// its full details.
// ════════════════════════════════════════════════════════════════
const { safeCommand } = require('../core/errorHandler');
const { getAllAurasSortedByRarity } = require('../rollEngine');
const { buildAuraEmbed } = require('../utils/embeds');

module.exports = safeCommand('aura', async (message, args) => {
    const query = args.join(' ').toLowerCase().trim();
    if (!query) return message.reply('Usage: `aura <name>` — e.g. `aura Faint Glow`');

    const all = getAllAurasSortedByRarity();
    const match = all.find((a) => a.name.toLowerCase() === query)
        || all.find((a) => a.name.toLowerCase().includes(query));

    if (!match) {
        return message.reply(`❌ No aura found matching "${args.join(' ')}".`);
    }

    await message.reply({ embeds: [buildAuraEmbed(match)] });
});
      
