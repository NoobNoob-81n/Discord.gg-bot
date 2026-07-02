const MANAGE_GUILD = 0x20;
const ADMINISTRATOR = 0x8;

async function requireGuildAccess(req, res, next) {
    const { guildId } = req.params;

    const guild = req.client.guilds.cache.get(guildId);
    if (!guild) {
        return res.status(404).json({ error: 'Bot is not in that server' });
    }

    try {
        const discordRes = await fetch('https://discord.com/api/v10/users/@me/guilds', {
            headers: { Authorization: `Bearer ${req.user.discordAccessToken}` },
        });
        if (!discordRes.ok) {
            return res.status(401).json({ error: 'Discord session expired, please log in again' });
        }
        const userGuilds = await discordRes.json();
        const match = userGuilds.find((g) => g.id === guildId);
        if (!match) {
            return res.status(403).json({ error: 'You are not a member of that server' });
        }
        const perms = BigInt(match.permissions);
        const canManage = (perms & BigInt(MANAGE_GUILD)) !== 0n || (perms & BigInt(ADMINISTRATOR)) !== 0n;
        if (!canManage) {
            return res.status(403).json({ error: 'You need Manage Server permission for this server' });
        }

        req.guild = guild;
        next();
    } catch (err) {
        console.error('[requireGuildAccess]', err);
        res.status(500).json({ error: 'Failed to verify server permissions' });
    }
}

function requireOwner(ctx) {
    return (req, res, next) => {
        if (req.user.userId !== ctx.OWNER_ID) {
            return res.status(403).json({ error: 'Owner only' });
        }
        next();
    };
}

module.exports = { requireGuildAccess, requireOwner };
