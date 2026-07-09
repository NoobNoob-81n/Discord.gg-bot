// ════════════════════════════════════════════════════════════════
// RNG SYSTEM — Command Config
// Per-command settings (permission level, cooldown overrides).
// Kept separate from config/config.js (system-wide tunables) so
// command-specific rules are easy to scan in one place.
// ════════════════════════════════════════════════════════════════
const { PERMISSIONS } = require('../constants');

module.exports = {
    // Command name -> { permission, cooldownMs (optional override) }
    roll:        { permission: PERMISSIONS.EVERYONE },
    autoroll:    { permission: PERMISSIONS.EVERYONE },
    inventory:   { permission: PERMISSIONS.EVERYONE },
    aura:        { permission: PERMISSIONS.EVERYONE },
    equip:       { permission: PERMISSIONS.EVERYONE },
    unequip:     { permission: PERMISSIONS.EVERYONE },
    favorite:    { permission: PERMISSIONS.EVERYONE },
    collection:  { permission: PERMISSIONS.EVERYONE },
    leaderboard: { permission: PERMISSIONS.EVERYONE },
    stats:       { permission: PERMISSIONS.EVERYONE },
    history:     { permission: PERMISSIONS.EVERYONE },
    trade:       { permission: PERMISSIONS.EVERYONE },
    market:      { permission: PERMISSIONS.EVERYONE },
    shop:        { permission: PERMISSIONS.EVERYONE },
    gloves:      { permission: PERMISSIONS.EVERYONE },
    potions:     { permission: PERMISSIONS.EVERYONE },
    quests:      { permission: PERMISSIONS.EVERYONE },
    weather:     { permission: PERMISSIONS.EVERYONE },
    help:        { permission: PERMISSIONS.EVERYONE },

    // Owner-only admin commands
    rngprefix:        { permission: PERMISSIONS.OWNER_ONLY },
    spawnaura:        { permission: PERMISSIONS.OWNER_ONLY },
    removeaura:       { permission: PERMISSIONS.OWNER_ONLY },
    givecurrency:     { permission: PERMISSIONS.OWNER_ONLY },
    takecurrency:     { permission: PERMISSIONS.OWNER_ONLY },
    forceweather:     { permission: PERMISSIONS.OWNER_ONLY },
    boostluck:        { permission: PERMISSIONS.OWNER_ONLY },
    spawnevent:       { permission: PERMISSIONS.OWNER_ONLY },
    resetcollection:  { permission: PERMISSIONS.OWNER_ONLY },
    viewrolls:        { permission: PERMISSIONS.OWNER_ONLY },
    spawngodlike:     { permission: PERMISSIONS.OWNER_ONLY },
    deleteaura:       { permission: PERMISSIONS.OWNER_ONLY },
    reloadauras:      { permission: PERMISSIONS.OWNER_ONLY },
    rngtest:          { permission: PERMISSIONS.OWNER_ONLY },
};
