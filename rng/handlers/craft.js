// ════════════════════════════════════════════════════════════════
// RNG SYSTEM — _craft
// Usage:
//   craft                — list all available recipes
//   craft <recipeKey>     — attempt to craft, showing missing items if any
// ════════════════════════════════════════════════════════════════
const { EmbedBuilder } = require('discord.js');
const { checkRecipe, craft: doCraft, listRecipes } = require('../core/craftingEngine');
const { CRAFTING_RECIPES } = require('../data/craftingRecipes');
const { POTIONS } = require('../data/potions');
const { EMBED_COLORS } = require('../constants');

function ingredientLabel(ing) {
    if (ing.type === 'potion') {
        const name = POTIONS[ing.id]?.name || ing.id;
        return `${ing.count}x ${name}`;
    }
    // Aura ingredient — strip the aura_ prefix and title-case for display
    const displayName = ing.id.replace(/^aura_/, '').replace(/_/g, ' ');
    return `${ing.count}x ${displayName.charAt(0).toUpperCase() + displayName.slice(1)} Aura`;
}

module.exports = async function craftHandler(message, args, { rngData, OWNER_ID }) {
    const userId = message.author.id;
    const recipeKey = args[0];
    const isOwner = userId === OWNER_ID;

    if (!recipeKey) {
        // Show the full crafting menu
        const lines = listRecipes().map((key) => {
            const recipe = CRAFTING_RECIPES[key];
            const resultName = POTIONS[recipe.resultPotionId]?.name || recipe.resultPotionId;
            const ingredients = recipe.ingredients.map(ingredientLabel).join(', ');
            return `**${resultName}** (\`${key}\`)\n└ Requires: ${ingredients}`;
        });

        return message.reply({
            embeds: [new EmbedBuilder()
                .setTitle('🔨 Crafting Menu')
                .setDescription(lines.join('\n\n'))
                .setColor(EMBED_COLORS.INFO)
                .setFooter({ text: 'Use "craft <recipe key>" to craft, e.g. craft luck_potion_2' })],
        });
    }

    if (!CRAFTING_RECIPES[recipeKey]) {
        return message.reply(`❌ Unknown recipe "${recipeKey}". Run \`craft\` with no arguments to see the full menu.`);
    }

    const { canCraft, missing } = checkRecipe(rngData, userId, recipeKey);

    if (!canCraft && !isOwner) {
        const missingLines = missing.map((m) => {
            const label = m.type === 'potion'
                ? POTIONS[m.id]?.name || m.id
                : m.id.replace(/^aura_/, '').replace(/_/g, ' ');
            return `❌ **${label}** — have ${m.have}, need ${m.need}`;
        }).join('\n');

        return message.reply({
            embeds: [new EmbedBuilder()
                .setTitle('⚠️ Missing Ingredients')
                .setDescription(missingLines)
                .setColor(EMBED_COLORS.WARNING)],
        });
    }

    const result = doCraft(rngData, userId, recipeKey, { bypassRequirements: isOwner && !canCraft });
    const resultName = POTIONS[result.resultPotionId]?.name || result.resultPotionId;

    await message.reply({
        embeds: [new EmbedBuilder()
            .setTitle('✅ Craft Successful!')
            .setDescription(`You crafted **${result.resultCount}x ${resultName}**!${isOwner && !canCraft ? ' *(owner bypass — ingredients not consumed)*' : ''}`)
            .setColor(EMBED_COLORS.SUCCESS)],
    });
};
