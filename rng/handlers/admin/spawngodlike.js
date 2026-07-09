// ════════════════════════════════════════════════════════════════
// RNG SYSTEM — _spawngodlike (owner only)
// Manually grants The Godlike Noob to a user for testing, bypassing
// the normal roll odds entirely. Respects singleton tracking (updates
// godlikeNoobHolder) but does NOT enforce the "only one" rule against
// the owner — devs need to be able to test spawning it regardless of
// current holder state, per spec ("Developers should also be able to
// spawn it manually for testing").
// ════════════════════════════════════════════════════════════════
const { safeCommand } = require('../../core/errorHandler');
const { getAuraById } = require('../../rollEngine');
const { claimGodlikeNoob } = require('../../core/godlikeSingleton');
const { SPECIAL_AURA_IDS } = require('../../constants');
const { logger } = require('../../core/logger');
const { buildAuraEmbed } = require('../../utils/embeds');

module.exports = safeCommand('spawngodlike', async (message, args, { rngData }) => {
    const target = message.mentions.users.first() || message.author;
    const godlikeNoob = getAuraById(SPECIAL_AURA_IDS.GODLIKE_NOOB);

    if (!godlikeNoob) {
        return message.reply('❌ Godlike Noob data could not be found — check data/auras/developer.json.');
    }

    rngData.addToInventory(target.id, godlikeNoob.id);
    rngData.addToHistory(target.id, godlikeNoob.id);
    claimGodlikeNoob(rngData, target.id);
    logger.admin(message.author.id, 'spawngodlike', { target: target.id });

    await message.reply({
        content: `🌟 Manually spawned **The Godlike Noob** for ${target}.`,
        embeds: [buildAuraEmbed(godlikeNoob)],
    });
});
