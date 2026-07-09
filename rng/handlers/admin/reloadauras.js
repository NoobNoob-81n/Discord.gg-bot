// ════════════════════════════════════════════════════════════════
// RNG SYSTEM — _reloadauras (owner only)
// Hot-reloads all aura JSON files from disk without restarting the
// bot. Useful after adding a new tier file or editing existing data.
// ════════════════════════════════════════════════════════════════
const { safeCommand } = require('../../core/errorHandler');
const auraLoader = require('../../core/auraLoader');
const { logger } = require('../../core/logger');

module.exports = safeCommand('reloadauras', async (message, args) => {
    try {
        const auras = auraLoader.reload();
        logger.admin(message.author.id, 'reloadauras', { count: auras.length });
        await message.reply(`✅ Reloaded aura database — **${auras.length}** total auras now loaded.`);
    } catch (err) {
        await message.reply(`❌ Reload failed: ${err.message}`);
    }
});
