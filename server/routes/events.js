const express = require('express');

module.exports = function eventsRoutes(ctx) {
    const router = express.Router();

    // ── Owner-only: starting/stopping events is a live control action ──
    router.use((req, res, next) => {
        if (req.user.userId !== ctx.OWNER_ID) {
            return res.status(403).json({ error: 'Only the bot owner can control events' });
        }
        next();
    });

    router.post('/wordle/start', async (req, res) => {
        const { channelId, word, reward, coins } = req.body || {};
        if (!channelId || !word) return res.status(400).json({ error: 'channelId and word required' });
        if (ctx.wordleGames.has(channelId)) return res.status(400).json({ error: 'A wordle is already active in that channel' });
        ctx.wordleGames.set(channelId, {
            word: word.toLowerCase(),
            reward: Math.min(10000, Math.max(0, reward || 0)),
            coinReward: Math.min(10000, Math.max(0, coins || 0)),
            hostId: req.user.userId,
            guildId: req.params.guildId,
            startedAt: Date.now(),
        });
        res.json({ ok: true });
    });

    router.post('/wordle/end', async (req, res) => {
        const { channelId } = req.body || {};
        ctx.wordleGames.delete(channelId);
        res.json({ ok: true });
    });

    router.post('/chaos-mode', async (req, res) => {
        const { enabled } = req.body || {};
        ctx.abuseConfig.chaosMode = !!enabled;
        await ctx.saveData();
        res.json({ ok: true, chaosMode: ctx.abuseConfig.chaosMode });
    });

    router.post('/double-xp', async (req, res) => {
        ctx.abuseConfig.xpMult = 2;
        await ctx.saveData();
        res.json({ ok: true });
    });

    router.post('/double-coins', async (req, res) => {
        ctx.abuseConfig.coinMult = 2;
        ctx.abuseConfig.sellMult = 2;
        await ctx.saveData();
        res.json({ ok: true });
    });

    return router;
};
