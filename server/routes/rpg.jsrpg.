const express = require('express');

module.exports = function rpgRoutes(ctx) {
    const router = express.Router();

    // ── Staff-visible: read-only leaderboards ──
    router.get('/leaderboard', (req, res) => {
        const dungeonClears = [...ctx.userData.dungeonClears.entries()]
            .map(([userId, clears]) => ({ userId, clears }))
            .sort((a, b) => b.clears - a.clears)
            .slice(0, 20);

        const pvpWins = [...ctx.userData.pvpWins.entries()]
            .map(([userId, wins]) => ({ userId, wins }))
            .sort((a, b) => b.wins - a.wins)
            .slice(0, 20);

        const guilds = [...ctx.userData.guilds.entries()]
            .map(([guildId, g]) => ({
                guildId,
                name: g.name,
                level: g.level || 1,
                xp: g.xp || 0,
                memberCount: (g.members || []).length,
                warScore: g.warScore || 0,
            }))
            .sort((a, b) => b.xp - a.xp)
            .slice(0, 20);

        res.json({ dungeonClears, pvpWins, guilds });
    });

    return router;
};
