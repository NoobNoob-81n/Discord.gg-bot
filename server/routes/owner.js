const express = require('express');

module.exports = function ownerRoutes(ctx) {
    const router = express.Router();

    router.get('/abuse', (req, res) => {
        res.json({ abuseConfig: ctx.abuseConfig });
    });

    router.post('/abuse/multiplier', async (req, res) => {
        const { field, value } = req.body || {};
        const allowed = ['secretMult','legendaryMult','mutationMult','xpMult','coinMult','sellMult'];
        if (!allowed.includes(field) || typeof value !== 'number') {
            return res.status(400).json({ error: `field must be one of: ${allowed.join(', ')}` });
        }
        ctx.abuseConfig[field] = value;
        await ctx.saveData();
        res.json({ ok: true });
    });

    router.post('/abuse/reset', async (req, res) => {
        ctx.abuseConfig.activeEvents = {};
        ctx.abuseConfig.secretMult = 1;
        ctx.abuseConfig.legendaryMult = 1;
        ctx.abuseConfig.mutationMult = 1;
        ctx.abuseConfig.xpMult = 1;
        ctx.abuseConfig.coinMult = 1;
        ctx.abuseConfig.sellMult = 1;
        ctx.abuseConfig.weatherOverride = null;
        ctx.abuseConfig.weatherOverrideEnd = 0;
        ctx.abuseConfig.chaosMode = false;
        await ctx.saveData();
        res.json({ ok: true });
    });

    // ── Database view (read-only preview, not raw file editing) ──
    router.get('/database/summary', (req, res) => {
        res.json({
            userCount: ctx.userData.coins.size,
            staffCount: ctx.staffSet.size,
            wordleGamesActive: ctx.wordleGames.size,
            guildsWithLogs: Object.keys(ctx.logsConfig).length,
            guildsWithWelcome: Object.keys(ctx.welcomeConfig).length,
            guildsWithTickets: Object.keys(ctx.ticketConfig).length,
        });
    });

    // ── Backup: returns a JSON snapshot the browser can download ──
    router.get('/backup', (req, res) => {
        const snapshot = ctx.userData.toJSON ? ctx.userData.toJSON() : {};
        res.setHeader('Content-Disposition', `attachment; filename="backup-${Date.now()}.json"`);
        res.json(snapshot);
    });

    // ── Restore: accepts a previously-downloaded backup JSON and
    // reloads it into the live UserData instance. Destructive — this
    // fully replaces current data, so the frontend must confirm first. ──
    router.post('/restore', async (req, res) => {
        const backup = req.body;
        if (!backup || typeof backup !== 'object') {
            return res.status(400).json({ error: 'Request body must be a valid backup JSON object' });
        }
        try {
            if (!ctx.userData.fromJSON) {
                return res.status(500).json({ error: 'UserData has no fromJSON method — cannot restore' });
            }
            ctx.userData.fromJSON(backup);
            await ctx.saveData();
            res.json({ ok: true });
        } catch (err) {
            console.error('[Restore backup error]', err);
            res.status(500).json({ error: 'Failed to restore backup — the file may be malformed' });
        }
    });

    return router;
};
