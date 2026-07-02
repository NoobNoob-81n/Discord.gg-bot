const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const { authRouter, requireAuth } = require('./auth');
const { requireGuildAccess, requireOwner } = require('./middleware');

function startDashboardServer(client, ctx, port = process.env.DASHBOARD_PORT || 3001) {
    const app = express();

    app.use(cors({
        origin: process.env.DASHBOARD_URL || 'http://localhost:3000',
        credentials: true,
    }));
    app.use(express.json());
    app.use(cookieParser());

    app.use((req, res, next) => {
        req.client = client;
        req.ctx = ctx;
        next();
    });

    app.use('/api/auth', authRouter);
    app.use('/api', requireAuth);
    app.use('/api/guilds', require('./routes/guilds')(ctx));
    app.use('/api/me/theme', require('./routes/theme')(ctx));

    app.use('/api/guild/:guildId', requireGuildAccess);
    app.use('/api/guild/:guildId/home',           require('./routes/home')(ctx));
    app.use('/api/guild/:guildId/staff',          require('./routes/staff')(ctx));
    app.use('/api/guild/:guildId/welcome',        require('./routes/welcome')(ctx));
    app.use('/api/guild/:guildId/logs',           require('./routes/logs')(ctx));
    app.use('/api/guild/:guildId/tickets',        require('./routes/tickets')(ctx));
    app.use('/api/guild/:guildId/autoresponses',  require('./routes/autoresponses')(ctx));
    app.use('/api/guild/:guildId/economy',        require('./routes/economy')(ctx));
    app.use('/api/guild/:guildId/fishing',        require('./routes/fishing')(ctx));
    app.use('/api/guild/:guildId/events',         require('./routes/events')(ctx));

    app.use('/api/owner', requireOwner(ctx), require('./routes/owner')(ctx));

    app.use((err, req, res, next) => {
        console.error('[Dashboard API error]', err);
        res.status(500).json({ error: 'Internal server error' });
    });

    app.listen(port, () => {
        console.log(`🌐 Dashboard API listening on port ${port}`);
    });

    return app;
}

module.exports = { startDashboardServer };
