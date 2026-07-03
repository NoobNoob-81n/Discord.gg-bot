// ════════════════════════════════════════════════════════════════
// 🔐 DISCORD OAUTH2 + SESSION AUTH
//
// Flow:
//   1. Browser hits  GET /api/auth/login       → redirect to Discord
//   2. Discord redirects back to /api/auth/callback with a `code`
//   3. We exchange the code for an access token, fetch the user's
//      Discord profile + guild list, sign a JWT, set it as an
//      httpOnly cookie, redirect back to the dashboard.
//   4. Every other /api/* route reads that cookie via requireAuth.
//
// Required env vars (put these in Railway, not in code):
//   DISCORD_CLIENT_ID
//   DISCORD_CLIENT_SECRET
//   DISCORD_REDIRECT_URI     e.g. https://yourbot.up.railway.app/api/auth/callback
//   DASHBOARD_URL            e.g. https://yourdashboard.up.railway.app
//   JWT_SECRET               any long random string
// ════════════════════════════════════════════════════════════════
const express = require('express');
const jwt = require('jsonwebtoken');

const router = express.Router();

const {
    DISCORD_CLIENT_ID,
    DISCORD_CLIENT_SECRET,
    DISCORD_REDIRECT_URI,
    DASHBOARD_URL,
    JWT_SECRET,
} = process.env;

const DISCORD_API = 'https://discord.com/api/v10';
const SCOPES = ['identify', 'guilds'].join(' ');

router.get('/login', (req, res) => {
    const params = new URLSearchParams({
        client_id: DISCORD_CLIENT_ID,
        redirect_uri: DISCORD_REDIRECT_URI,
        response_type: 'code',
        scope: SCOPES,
        prompt: 'consent',
    });
    res.redirect(`https://discord.com/oauth2/authorize?${params}`);
});

router.get('/callback', async (req, res) => {
    const { code } = req.query;
    if (!code) return res.redirect(`${DASHBOARD_URL}/login?error=missing_code`);

    try {
        const tokenRes = await fetch(`${DISCORD_API}/oauth2/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: DISCORD_CLIENT_ID,
                client_secret: DISCORD_CLIENT_SECRET,
                grant_type: 'authorization_code',
                code,
                redirect_uri: DISCORD_REDIRECT_URI,
            }),
        });
        if (!tokenRes.ok) throw new Error('Token exchange failed');
        const tokenData = await tokenRes.json();

        const userRes = await fetch(`${DISCORD_API}/users/@me`, {
            headers: { Authorization: `Bearer ${tokenData.access_token}` },
        });
        const user = await userRes.json();

        const guildsRes = await fetch(`${DISCORD_API}/users/@me/guilds`, {
            headers: { Authorization: `Bearer ${tokenData.access_token}` },
        });
        const guilds = await guildsRes.json();

        const session = jwt.sign(
            {
                userId: user.id,
                username: user.username,
                avatar: user.avatar,
                discordAccessToken: tokenData.access_token,
            },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.cookie('dashboard_session', session, {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    maxAge: 7 * 24 * 60 * 60 * 1000,
});

        res.redirect(`${DASHBOARD_URL}/servers`);
    } catch (err) {
        console.error('[OAuth callback error]', err);
        res.redirect(`${DASHBOARD_URL}/login?error=auth_failed`);
    }
});

router.post('/logout', (req, res) => {
    res.clearCookie('dashboard_session');
    res.json({ ok: true });
});

router.get('/me', requireAuth, (req, res) => {
    res.json({
        userId: req.user.userId,
        username: req.user.username,
        avatar: req.user.avatar,
        isOwner: req.user.userId === process.env.OWNER_ID,
    });
});

function requireAuth(req, res, next) {
    const token = req.cookies?.dashboard_session;
    if (!token) return res.status(401).json({ error: 'Not logged in' });

    try {
        req.user = jwt.verify(token, JWT_SECRET);
        next();
    } catch (err) {
        res.clearCookie('dashboard_session');
        return res.status(401).json({ error: 'Session expired, please log in again' });
    }
}

module.exports = { authRouter: router, requireAuth };
