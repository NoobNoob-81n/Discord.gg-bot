const express = require('express');

module.exports = function homeRoutes(ctx) {
    const router = express.Router();

    router.get('/', (req, res) => {
        const guild = req.guild;

        res.json({
            server: {
                id: guild.id,
                name: guild.name,
                icon: guild.iconURL ? guild.iconURL({ size: 128 }) : null,
                memberCount: guild.memberCount,
            },
            bot: {
                uptimeSeconds: Math.floor(req.client.uptime / 1000),
                pingMs: Math.round(req.client.ws.ping),
                guildCount: req.client.guilds.cache.size,
            },
        });
    });

    return router;
};
