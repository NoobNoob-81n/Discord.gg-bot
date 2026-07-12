// ════════════════════════════════════════════════════════════════
// RNG SYSTEM — _rngtest fishbridge (owner only)
// Add this as a new subcommand inside your existing rngtest.js
// (see handlers/admin/rngtest.js) — this file is a standalone
// snippet to merge in, not a separate command.
// ════════════════════════════════════════════════════════════════
const { getDiagnostics } = require('../../core/fishingQuestBridge');

async function testFishBridge(message) {
    const diag = getDiagnostics();

    if (diag.callCount === 0) {
        return message.reply(
            `🧪 **Fishing Quest Bridge Diagnostic**\n` +
            `❌ **Never called since bot startup.**\n\n` +
            `This means your fish command in index.js is NOT calling ` +
            `\`fishingQuestBridge.onFishCaught()\` yet. Fishing quests ` +
            `cannot progress until this is wired up — see WIRING_V3.md ` +
            `for the exact one-line hook to add to your fish command.`
        );
    }

    const lastCallAgo = Math.round((Date.now() - diag.lastCallAt) / 1000);
    return message.reply(
        `🧪 **Fishing Quest Bridge Diagnostic**\n` +
        `✅ Called **${diag.callCount}** time(s) since bot startup.\n` +
        `Last call: ${lastCallAgo}s ago.\n` +
        `The bridge is correctly wired up.`
    );
}

module.exports = { testFishBridge };

/*
─────────────────────────────────────────────────────────────────
TO MERGE INTO handlers/admin/rngtest.js:

1. Add near the top:
   const { testFishBridge } = require('./rngtest.fishbridge');

2. In the `subcommands` object, add:
   fishbridge: (message) => testFishBridge(message),
─────────────────────────────────────────────────────────────────
*/
