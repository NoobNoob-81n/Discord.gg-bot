const express = require('express');

module.exports = function logsRoutes(ctx) {
    const router = express.Router();

    router.get('/', (req, res) => {
        const { guildId } = req.params;
        res.json({ config: ctx.logsConfig[guildId] || null });
    });

    router.get('/channels', (req, res) => {
        const channels = req.guild.channels.cache
            .filter(c => c.isTextBased?.() && !c.isThread?.())
            .map(c => ({ id: c.id, name: c.name }));
        res.json({ channels });
    });

    router.put('/', async (req, res) => {
        const { guildId } = req.params;
        const { channelId } = req.body || {};
        if (!channelId) return res.status(400).json({ error: 'channelId required' });
        ctx.logsConfig[guildId] = { channelId };
        await ctx.saveData();
        res.json({ config: ctx.logsConfig[guildId] });
    });

    router.delete('/', async (req, res) => {
        delete ctx.logsConfig[req.params.guildId];
        await ctx.saveData();
        res.json({ ok: true });
    });

    return router;
};
