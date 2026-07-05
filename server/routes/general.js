const express = require('express');

module.exports = function generalRoutes(ctx) {
    const router = express.Router();

    router.get('/', (req, res) => {
        const { guildId } = req.params;
        res.json({
            prefix: ctx.guildPrefixes[guildId] || '!',
        });
    });

    router.put('/prefix', async (req, res) => {
        const { guildId } = req.params;
        const { prefix } = req.body || {};
        if (!prefix || typeof prefix !== 'string' || prefix.length > 5) {
            return res.status(400).json({ error: 'Prefix must be a string, 5 characters or fewer' });
        }
        ctx.guildPrefixes[guildId] = prefix;
        await ctx.saveData();
        res.json({ prefix });
    });

    return router;
};
