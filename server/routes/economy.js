const express = require('express');

module.exports = function economyRoutes(ctx) {
    const router = express.Router();

    router.post('/give', async (req, res) => {
        const { userId, amount } = req.body || {};
        if (!userId || typeof amount !== 'number') return res.status(400).json({ error: 'userId and amount required' });
        ctx.addCoins(userId, amount);
        await ctx.saveData();
        res.json({ ok: true, newBalance: ctx.userData.coins.get(userId) || 0 });
    });

    router.post('/remove', async (req, res) => {
        const { userId, amount } = req.body || {};
        if (!userId || typeof amount !== 'number') return res.status(400).json({ error: 'userId and amount required' });
        ctx.addCoins(userId, -Math.abs(amount));
        await ctx.saveData();
        res.json({ ok: true, newBalance: ctx.userData.coins.get(userId) || 0 });
    });

    router.get('/richest', (req, res) => {
        const entries = [...ctx.userData.coins.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 20)
            .map(([userId, coins]) => ({ userId, coins }));
        res.json({ richest: entries });
    });

    router.post('/reset', async (req, res) => {
        const { userId } = req.body || {};
        if (!userId) return res.status(400).json({ error: 'userId required' });
        ctx.userData.coins.set(userId, 0);
        ctx.userData.bank.set(userId, 0);
        await ctx.saveData();
        res.json({ ok: true });
    });

    return router;
};
