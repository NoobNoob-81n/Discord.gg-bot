const express = require('express');

module.exports = function welcomeRoutes(ctx) {
    const router = express.Router();

    router.get('/', (req, res) => {
        const { guildId } = req.params;
        res.json({ config: ctx.welcomeConfig[guildId] || null });
    });

    router.put('/', async (req, res) => {
        const { guildId } = req.params;
        const { channelId, message, roleId, imageEnabled } = req.body || {};
        if (!channelId) return res.status(400).json({ error: 'channelId required' });
        ctx.welcomeConfig[guildId] = { channelId, message: message || null, roleId: roleId || null, imageEnabled: !!imageEnabled };
        await ctx.saveData();
        res.json({ config: ctx.welcomeConfig[guildId] });
    });

    router.delete('/', async (req, res) => {
        delete ctx.welcomeConfig[req.params.guildId];
        await ctx.saveData();
        res.json({ ok: true });
    });

    return router;
};
