const express = require('express');

module.exports = function autoResponsesRoutes(ctx) {
    const router = express.Router();

    router.get('/', (req, res) => {
        const list = ctx.autoResponses.get(req.params.guildId) || [];
        res.json({ responses: list });
    });

    router.post('/', async (req, res) => {
        const { guildId } = req.params;
        const { trigger, reply } = req.body || {};
        if (!trigger || !reply) return res.status(400).json({ error: 'trigger and reply required' });
        const list = ctx.autoResponses.get(guildId) || [];
        list.push({ id: Date.now().toString(36), trigger, reply });
        ctx.autoResponses.set(guildId, list);
        await ctx.saveData();
        res.json({ responses: list });
    });

    router.put('/:id', async (req, res) => {
        const { guildId, id } = req.params;
        const { trigger, reply } = req.body || {};
        const list = ctx.autoResponses.get(guildId) || [];
        const entry = list.find(r => r.id === id);
        if (!entry) return res.status(404).json({ error: 'Not found' });
        if (trigger) entry.trigger = trigger;
        if (reply) entry.reply = reply;
        ctx.autoResponses.set(guildId, list);
        await ctx.saveData();
        res.json({ responses: list });
    });

    router.delete('/:id', async (req, res) => {
        const { guildId, id } = req.params;
        const list = (ctx.autoResponses.get(guildId) || []).filter(r => r.id !== id);
        ctx.autoResponses.set(guildId, list);
        await ctx.saveData();
        res.json({ responses: list });
    });

    return router;
};
