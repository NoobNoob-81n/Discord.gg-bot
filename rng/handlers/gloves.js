// ════════════════════════════════════════════════════════════════
// RNG SYSTEM — _gloves (Gear Management)
// Handles viewing, equipping, and unequipping gears.
// ════════════════════════════════════════════════════════════════
const { EmbedBuilder } = require("discord.js");
const { safeCommand } = require("../core/errorHandler");
const { GEARS } = require("../data/gears");
const { EMBED_COLORS, EVENTS, GEAR_TYPES } = require("../constants");
const { eventBus } = require("../core/eventBus");

module.exports = safeCommand("gloves", async (message, args, { rngData }) => {
    const userId = message.author.id;
    const subcommand = args[0]?.toLowerCase();

    const ownedGears = rngData.equippedGlove.get(userId) || {}; // Stores equipped gear by type

    if (!subcommand || subcommand === "list") {
        const gearList = Object.values(GEARS).map(gear => {
            const equipped = Object.values(ownedGears).includes(gear.id) ? "✅ Equipped" : "";
            return `${gear.emoji} **${gear.name}** (${gear.type}) - ${gear.description} ${equipped}`;
        }).join("\n");

        const equippedDisplay = Object.entries(ownedGears)
            .map(([type, gearId]) => {
                const gear = GEARS[gearId];
                return gear ? `${gear.emoji} ${gear.name} (${type})` : `Unknown Gear (${type})`;
            })
            .join("\n") || "None";

        const embed = new EmbedBuilder()
            .setTitle("🧤 Your Gears")
            .setDescription(`**Equipped:**\n${equippedDisplay}\n\n**Available Gears:**\n${gearList}`)
            .setColor(EMBED_COLORS.INFO);

        return message.reply({ embeds: [embed] });
    }

    if (subcommand === "equip") {
        const gearId = args[1]?.toLowerCase();
        if (!gearId) {
            return message.reply("Usage: `/gloves equip <gear_id>`");
        }

        const gearToEquip = GEARS[gearId];
        if (!gearToEquip) {
            return message.reply(`❌ Unknown gear: **${gearId}**`);
        }

        // Check if user owns the gear (for now, assume they own it if it exists)
        // In a real system, you'd check rngData.ownedGears.get(userId) or similar

        rngData.equippedGlove.set(userId, { ...ownedGears, [gearToEquip.type]: gearId });
        rngData._markDirty();
        eventBus.emitSafe(EVENTS.ON_GEAR_EQUIP, { userId, gear: gearToEquip });

        return message.reply(`✅ You equipped **${gearToEquip.emoji} ${gearToEquip.name}**!`);
    }

    if (subcommand === "unequip") {
        const gearType = args[1]?.toLowerCase();
        if (!gearType) {
            return message.reply("Usage: `/gloves unequip <gear_type>` (e.g., glove, device, gauntlet)");
        }

        if (!Object.values(GEAR_TYPES).includes(gearType)) {
            return message.reply(`❌ Invalid gear type. Choose from: ${Object.values(GEAR_TYPES).join(", ")}`);
        }

        if (!ownedGears[gearType]) {
            return message.reply(`❌ You don't have any ${gearType} equipped.`);
        }

        const unequippedGearId = ownedGears[gearType];
        delete ownedGears[gearType];
        rngData.equippedGlove.set(userId, ownedGears);
        rngData._markDirty();
        eventBus.emitSafe(EVENTS.ON_GEAR_UNEQUIP, { userId, gearId: unequippedGearId });

        const unequippedGear = GEARS[unequippedGearId];
        return message.reply(`✅ You unequipped **${unequippedGear?.emoji || ''} ${unequippedGear?.name || unequippedGearId}**.`);
    }

    return message.reply("Unknown subcommand. Use `/gloves list`, `/gloves equip <gear_id>`, or `/gloves unequip <gear_type>`.");
});
