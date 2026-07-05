// ════════════════════════════════════════════════════════════════
// 🌐 DASHBOARD API SERVER
// Runs in the SAME process as the Discord bot. Import and call
// startDashboardServer(client, ctx) from your index.js after the
// bot logs in — see the bottom of this file for the exact snippet.
//
// `ctx` is a plain object exposing the bot's internal state
// (userData, config maps, helper functions) so the API routes can
// read/write the exact same in-memory data your bot already uses.
// No duplication, no second source of truth.
// ════════════════════════════════════════════════════════════════
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

    // Make client + ctx reachable from every route handler
    app.use((req, res, next) => {
        req.client = client;
        req.ctx = ctx;
        next();
    });

    // ── Auth (no guard — this IS the login flow) ──
    app.use('/api/auth', authRouter);

    // ── Everything below requires a valid session ──
    app.use('/api', requireAuth);

    // ── Guild list for the server picker (needs auth, not guild-scoped) ──
    app.use('/api/guilds', require('./routes/guilds')(ctx));

    // ── Per-user preferences (theme, etc.) — not guild-scoped ──
    app.use('/api/me/theme', require('./routes/theme')(ctx));

    // ── Everything below is scoped to one guild + requires Manage Server ──
    app.use('/api/guild/:guildId', requireGuildAccess);
    app.use('/api/guild/:guildId/home',           require('./routes/home')(ctx));
    app.use('/api/guild/:guildId/general',        require('./routes/general')(ctx));
    app.use('/api/guild/:guildId/staff',          require('./routes/staff')(ctx));
    app.use('/api/guild/:guildId/welcome',        require('./routes/welcome')(ctx));
    app.use('/api/guild/:guildId/logs',           require('./routes/logs')(ctx));
    app.use('/api/guild/:guildId/tickets',        require('./routes/tickets')(ctx));
    app.use('/api/guild/:guildId/autoresponses',  require('./routes/autoresponses')(ctx));
    app.use('/api/guild/:guildId/economy',        require('./routes/economy')(ctx));
    app.use('/api/guild/:guildId/fishing',        require('./routes/fishing')(ctx));
    app.use('/api/guild/:guildId/rpg',            require('./routes/rpg')(ctx));
    app.use('/api/guild/:guildId/events',         require('./routes/events')(ctx));

    // ── Owner-only, not guild-scoped ──
    app.use('/api/owner', requireOwner(ctx), require('./routes/owner')(ctx));

    // Fallback error handler — never leak stack traces to the client
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

/*
═══════════════════════════════════════════════════════════════════
HOW TO WIRE THIS INTO YOUR EXISTING index.js
═══════════════════════════════════════════════════════════════════

Add near the top of index.js:

    const { startDashboardServer } = require('./server/api');

Add AFTER client.login(TOKEN) and after client is ready — the safest
spot is inside your existing `client.once('ready', ...)` handler, at
the end of it:

    client.once('ready', async () => {
        // ...all your existing ready-handler code stays exactly as is...

        // ── Start the dashboard API, sharing direct references ──
        startDashboardServer(client, {
            userData,
            logsConfig, welcomeConfig, ticketConfig, suggestionConfig,
            autoResponses, staffSet,
            wordleGames, abuseConfig,
            OWNER_ID,
            saveData,
            addCoins, addXP,
            fmtN, getLevelInfo,
            BIOMES, RARITY_WEIGHTS,
        });
    });

NOTE: the theme system (server/routes/theme.js) needs one more Map
on your UserData class — see the comment at the bottom of that file
for the exact 3 lines to add (same pattern as wordleTokens).

That's it — no second bot instance, no duplicated logic. The API
routes read and write the exact same Maps/objects your slash and
prefix commands already use, so a change made on the website shows
up in Discord instantly and vice versa.
═══════════════════════════════════════════════════════════════════
*/
