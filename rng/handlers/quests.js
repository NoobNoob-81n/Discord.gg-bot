// ════════════════════════════════════════════════════════════════
// RNG SYSTEM — _quests
// Shows the user's current daily quests and progress.
// ════════════════════════════════════════════════════════════════
const { EmbedBuilder } = require('discord.js');
const { getDailyQuestStatus } = require('../core/questEngine');
const { QUEST_POOL } = require('../data/auras/quests');
const { EMBED_COLORS } = require('../constants');
const { progressBar } = require('../utils/embeds');

module.exports = async function questsHandler(message, args, { rngData }) {
    const userId = message.author.id;
    const status = getDailyQuestStatus(rngData, userId);

    const lines = status.quests.map((q) => {
        const def = QUEST_POOL.find((d) => d.id === q.questId);
        const name = def?.name || q.questId;
        const check = q.completed ? '✅' : '⬜';
        return `${check} **${name}**\n${progressBar(q.progress, q.goal, 12)} (${q.progress}/${q.goal})`;
    }).join('\n\n');

    const allDone = status.quests.every((q) => q.completed);

    const embed = new EmbedBuilder()
        .setTitle(`📋 ${message.author.username}'s Daily Quests`)
        .setDescription(lines)
        .setColor(allDone ? EMBED_COLORS.SUCCESS : EMBED_COLORS.INFO)
        .setFooter({ text: allDone ? '🎉 All quests complete!' : 'Resets daily at 00:00 UTC' });

    await message.reply({ embeds: [embed] });
};
