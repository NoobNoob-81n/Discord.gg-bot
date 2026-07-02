const express = require('express');

const MANAGE_GUILD = 0x20;
const ADMINISTRATOR = 0x8;

module.exports = function guildRoutes(ctx) {
    const router = express.Router();

    router.get('/', async (req, res) => {
        try {
            const discordRes = await fetch('https://discord.com/api/v10/users/@me/guilds', {
                headers: { Authorization: `Bearer ${req.user.discordAccessToken}` },
            });

            if (!discordRes.ok) {
                return res.status(401).json({ error: 'Discord session expired, please log in again' });
            }

            const userGuilds = await discordRes.json();
            const botGuildIds = new Set(req.client.guilds.cache.keys());

            const manageable = userGuilds
                .filter((g) => {
                    const perms = BigInt(g.permissions);
                    const canManage = (perms & BigInt(MANAGE_GUILD)) !== 0n || (perms & BigInt(ADMINISTRATOR)) !== 0n;
                    return canManage && botGuildIds.has(g.id);
                })
                .map((g) => {
                    const botGuild = req.client.guilds.cache.get(g.id);
                    return {
                        id: g.id,
                        name: g.name,
                        icon: g.icon ? `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png` : null,
                        memberCount: botGuild?.memberCount ?? null,
                    };
                });

            res.json({ guilds: manageable });
        } catch (err) {
            console.error('[GET /api/guilds]', err);
            res.status(500).json({ error: 'Failed to fetch guild list' });
        }
    });

    return router;
};
