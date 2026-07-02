const express = require('express');

module.exports = function ticketsRoutes(ctx) {
    const router = express.Router();

    router.get('/', (req, res) => {
        res.json({ config: ctx.ticketConfig[req.params.guildId] || null });
    });

    router.put('/', async (req, res) => {
        const { guildId } = req.params;
        const { channelId, categoryId, message } = req.body || {};
        if (!channelId) return res.status(400).json({ error: 'channelId required' });
        ctx.ticketConfig[guildId] = { channelId, categoryId: categoryId || null, message: message || null };
        await ctx.saveData();
        res.json({ config: ctx.ticketConfig[guildId] });
    });

    router.delete('/', async (req, res) => {
        delete ctx.ticketConfig[req.params.guildId];
        await ctx.saveData();
        res.json({ ok: true });
    });

    return router;
};
