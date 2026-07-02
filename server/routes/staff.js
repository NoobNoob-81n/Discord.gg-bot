const express = require('express');

module.exports = function staffRoutes(ctx) {
    const router = express.Router();

    router.get('/', (req, res) => {
        const { guildId } = req.params;
        const prefix = `${guildId}:`;
        const ids = [...ctx.staffSet].filter(s => s.startsWith(prefix)).map(s => s.slice(prefix.length));
        res.json({ staff: ids });
    });

    router.post('/add', async (req, res) => {
        const { guildId } = req.params;
        const { userId } = req.body || {};
        if (!userId) return res.status(400).json({ error: 'userId required' });
        ctx.staffSet.add(`${guildId}:${userId}`);
        await ctx.saveData();
        res.json({ ok: true });
    });

    router.post('/remove', async (req, res) => {
        const { guildId } = req.params;
        const { userId } = req.body || {};
        if (!userId) return res.status(400).json({ error: 'userId required' });
        ctx.staffSet.delete(`${guildId}:${userId}`);
        await ctx.saveData();
        res.json({ ok: true });
    });

    router.get('/warnings/:userId', (req, res) => {
        const warnings = ctx.userData.warnings.get(req.params.userId) || [];
        res.json({ warnings });
    });

    router.post('/reset-user', async (req, res) => {
        const { userId } = req.body || {};
        if (!userId) return res.status(400).json({ error: 'userId required' });
        ['coins','bank','xp','items','warnings'].forEach(field => {
            if (ctx.userData[field]?.delete) ctx.userData[field].delete(userId);
        });
        await ctx.saveData();
        res.json({ ok: true });
    });

    return router;
};
