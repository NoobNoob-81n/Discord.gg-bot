// ════════════════════════════════════════════════════════════════
// RNG SYSTEM — _rngtest (owner only)
// Developer test suite. Usage:
//   rngtest roll <count>        — statistical distribution check
//   rngtest aura <rarityName>   — lists all auras in a given tier
//   rngtest inventory           — dumps your own inventory summary
//   rngtest storage             — round-trips current state through
//                                  toJSON/fromJSON to verify no data loss
//   rngtest singleton           — checks Godlike Noob singleton state
//   rngtest perf <count>        — times N rolls to check performance
// ════════════════════════════════════════════════════════════════
const { safeCommand } = require('../../core/errorHandler');
const { rollAura, getAllAurasSortedByRarity, getTotalAuraCount } = require('../../rollEngine');
const { RngUserData } = require('../../RngUserData');
const { EmbedBuilder } = require('discord.js');
const { EMBED_COLORS } = require('../../constants');

async function testRoll(message, args) {
    const count = Math.min(500000, Math.max(100, Number(args[1]) || 10000));
    const tally = {};
    const start = Date.now();
    for (let i = 0; i < count; i++) {
        const a = rollAura({ userId: 'test', luckBonus: 0, godlikeNoobAvailable: false });
        tally[a.rarity] = (tally[a.rarity] || 0) + 1;
    }
    const elapsedMs = Date.now() - start;

    const lines = Object.entries(tally)
        .sort((a, b) => b[1] - a[1])
        .map(([rarity, c]) => `${rarity.padEnd(11)} ${c.toString().padStart(7)} (${((c / count) * 100).toFixed(3)}%)`);

    await message.reply({
        embeds: [new EmbedBuilder()
            .setTitle(`🧪 Roll Test — ${count.toLocaleString()} rolls`)
            .setDescription('```\n' + lines.join('\n') + '\n```')
            .setFooter({ text: `Completed in ${elapsedMs}ms (${(count / (elapsedMs || 1) * 1000).toFixed(0)} rolls/sec)` })
            .setColor(EMBED_COLORS.INFO)],
    });
}

async function testAura(message, args) {
    const rarity = args[1];
    if (!rarity) return message.reply('Usage: `rngtest aura <rarityName>`');

    const all = getAllAurasSortedByRarity();
    const inTier = all.filter((a) => a.rarity.toLowerCase() === rarity.toLowerCase());

    if (inTier.length === 0) return message.reply(`❌ No auras found in tier "${rarity}".`);

    const preview = inTier.slice(0, 15).map((a) => `${a.emoji} ${a.name}`).join('\n');
    await message.reply({
        embeds: [new EmbedBuilder()
            .setTitle(`🧪 Tier: ${rarity} (${inTier.length} auras)`)
            .setDescription(preview + (inTier.length > 15 ? `\n*...and ${inTier.length - 15} more*` : ''))
            .setColor(EMBED_COLORS.INFO)],
    });
}

async function testInventory(message, args, { rngData }) {
    const userId = message.author.id;
    const inv = rngData.inventory.get(userId) || [];
    const collectionSize = rngData.getCollectionSize(userId);
    const total = getTotalAuraCount();

    await message.reply(
        `🧪 **Inventory Test**\n` +
        `Total rolls in inventory array: ${inv.length}\n` +
        `Unique auras in collection: ${collectionSize} / ${total}\n` +
        `Roll count tracker: ${rngData.rollCount.get(userId) || 0}\n` +
        `Consistency check (rollCount === inventory.length): ${(rngData.rollCount.get(userId) || 0) === inv.length ? '✅ PASS' : '❌ FAIL — these should always match'}`
    );
}

async function testStorage(message, args, { rngData }) {
    const before = JSON.stringify(rngData.toJSON());

    const clone = new RngUserData(null); // no storage adapter needed for this test
    clone.fromJSON(JSON.parse(before));
    const after = JSON.stringify(clone.toJSON());

    const pass = before === after;
    await message.reply(
        `🧪 **Storage Round-Trip Test**\n` +
        `toJSON → fromJSON → toJSON produces identical output: ${pass ? '✅ PASS' : '❌ FAIL'}\n` +
        (pass ? '' : `Before length: ${before.length}, After length: ${after.length}`)
    );
}

async function testSingleton(message, args, { rngData }) {
    const config = require('../../config/config');
    await message.reply(
        `🧪 **Godlike Noob Singleton Test**\n` +
        `Singleton enforcement enabled: ${config.godlikeNoobUniqueGlobally ? '✅ ON' : '⚠️ OFF'}\n` +
        `Current holder: ${rngData.godlikeNoobHolder ? `<@${rngData.godlikeNoobHolder}>` : '*Unclaimed*'}`
    );
}

async function testPerf(message, args) {
    const count = Math.min(1000000, Math.max(1000, Number(args[1]) || 100000));
    const start = process.hrtime.bigint();
    for (let i = 0; i < count; i++) {
        rollAura({ userId: 'perf-test', luckBonus: 0, godlikeNoobAvailable: false });
    }
    const elapsedNs = process.hrtime.bigint() - start;
    const elapsedMs = Number(elapsedNs) / 1e6;

    await message.reply(
        `🧪 **Performance Test**\n` +
        `${count.toLocaleString()} rolls in ${elapsedMs.toFixed(1)}ms\n` +
        `Average: ${(elapsedMs / count * 1000).toFixed(3)}µs per roll\n` +
        `Throughput: ${(count / elapsedMs * 1000).toFixed(0)} rolls/sec`
    );
}

module.exports = safeCommand('rngtest', async (message, args, ctx) => {
    const sub = (args[0] || '').toLowerCase();

    const subcommands = {
        roll: testRoll,
        aura: testAura,
        inventory: testInventory,
        storage: testStorage,
        singleton: testSingleton,
        perf: testPerf,
    };

    const fn = subcommands[sub];
    if (!fn) {
        return message.reply(`Usage: \`rngtest <${Object.keys(subcommands).join('|')}>\``);
    }

    await fn(message, args, ctx);
});
