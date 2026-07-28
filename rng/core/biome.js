// ════════════════════════════════════════════════════════════════
// RNG SYSTEM — _biome (Biome Management)
// Handles viewing and changing the active RNG biome.
// ════════════════════════════════════════════════════════════════
const { EmbedBuilder } = require("discord.js");
const { safeCommand } = require("../core/errorHandler");
const { RNG_BIOMES } = require("../data/biomes");
const { EMBED_COLORS, EVENTS } = require("../constants");
const { eventBus } = require("../core/eventBus");

module.exports = safeCommand("biome", async (message, args, { rngData }) => {
    const userId = message.author.id;
    const subcommand = args[0]?.toLowerCase();

    const currentBiomeId = rngData.rngBiome.get(userId) || "default";
    const currentBiome = RNG_BIOMES[currentBiomeId];

    if (!subcommand || subcommand === "info") {
        const biomeList = Object.values(RNG_BIOMES).map(biome => {
            const active = biome.id === currentBiomeId ? "✅ Active" : "";
            return `${biome.emoji} **${biome.name}** - ${biome.description} ${active}`;
        }).join("\n");

        const embed = new EmbedBuilder()
            .setTitle("🌍 RNG Biomes")
            .setDescription(`**Current Biome:** ${currentBiome.emoji} ${currentBiome.name}\n\n**Available Biomes:**\n${biomeList}`)
            .setColor(EMBED_COLORS.INFO);

        return message.reply({ embeds: [embed] });
    }

    if (subcommand === "set") {
        const newBiomeId = args[1]?.toLowerCase();
        if (!newBiomeId) {
            return message.reply("Usage: `/biome set <biome_id>`");
        }

        const biomeToSet = RNG_BIOMES[newBiomeId];
        if (!biomeToSet) {
            return message.reply(`❌ Unknown biome: **${newBiomeId}**`);
        }

        // TODO: Add logic for unlocking biomes based on player progression/level

        rngData.rngBiome.set(userId, newBiomeId);
        rngData._markDirty();
        eventBus.emitSafe(EVENTS.ON_BIOME_CHANGE, { userId, newBiome: biomeToSet });

        return message.reply(`✅ You changed your RNG biome to **${biomeToSet.emoji} ${biomeToSet.name}**!`);
    }

    return message.reply("Unknown subcommand. Use `/biome info` or `/biome set <biome_id>`.");
});
