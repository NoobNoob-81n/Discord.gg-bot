const express = require('express');

module.exports = function fishingRoutes(ctx) {
    const router = express.Router();

    router.get('/status', (req, res) => {
        res.json({
            weatherOverride: ctx.abuseConfig.weatherOverride || null,
            activeEvents: ctx.abuseConfig.activeEvents || {},
            multipliers: {
                secret: ctx.abuseConfig.secretMult,
                legendary: ctx.abuseConfig.legendaryMult,
                mutation: ctx.abuseConfig.mutationMult,
                xp: ctx.abuseConfig.xpMult,
                coin: ctx.abuseConfig.coinMult,
                sell: ctx.abuseConfig.sellMult,
            },
        });
    });

    router.post('/weather', async (req, res) => {
        const { weather, durationMs } = req.body || {};
        if (!weather) return res.status(400).json({ error: 'weather required' });
        ctx.abuseConfig.weatherOverride = weather;
        ctx.abuseConfig.weatherOverrideEnd = Date.now() + (durationMs || 30 * 60 * 1000);
        await ctx.saveData();
        res.json({ ok: true });
    });

    router.post('/event', async (req, res) => {
        const { eventId, durationMs } = req.body || {};
        if (!eventId) return res.status(400).json({ error: 'eventId required' });
        ctx.abuseConfig.activeEvents[eventId] = Date.now() + (durationMs || 30 * 60 * 1000);
        await ctx.saveData();
        res.json({ ok: true });
    });

    router.post('/multiplier', async (req, res) => {
        const { type, value } = req.body || {};
        const map = { secret: 'secretMult', legendary: 'legendaryMult', mutation: 'mutationMult', xp: 'xpMult', coin: 'coinMult', sell: 'sellMult' };
        const field = map[type];
        if (!field || typeof value !== 'number') return res.status(400).json({ error: 'Invalid type or value' });
        ctx.abuseConfig[field] = value;
        await ctx.saveData();
        res.json({ ok: true });
    });

    return router;
};
