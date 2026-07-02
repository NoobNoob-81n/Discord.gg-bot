const express = require('express');

const VALID_THEMES = new Set(['monochrome', 'discord', 'light', 'neon']);
const DEFAULT_THEME = 'monochrome';

module.exports = function themeRoutes(ctx) {
    const router = express.Router();

    router.get('/', (req, res) => {
        const saved = ctx.userData.dashboardTheme?.get(req.user.userId);
        res.json({ theme: VALID_THEMES.has(saved) ? saved : DEFAULT_THEME });
    });

    router.patch('/', async (req, res) => {
        const { theme } = req.body || {};
        if (!VALID_THEMES.has(theme)) {
            return res.status(400).json({ error: `theme must be one of: ${[...VALID_THEMES].join(', ')}` });
        }
        if (!ctx.userData.dashboardTheme) {
            return res.status(500).json({ error: 'dashboardTheme store not initialized' });
        }
        ctx.userData.dashboardTheme.set(req.user.userId, theme);
        await ctx.saveData();
        res.json({ theme });
    });

    return router;
};
