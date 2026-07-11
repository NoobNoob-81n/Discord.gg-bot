// ════════════════════════════════════════════════════════════════
// RNG SYSTEM — Potion Engine
// Handles consuming potions and computing their combined effect on
// luck/roll-speed at any given moment. Enforces the three behavior
// categories from data/potions.js:
//   - stackable: multiple active at once, effects sum
//   - oneTime: consumed instantly, affects only the next roll
//   - exclusive: only one may be active; blocks starting another
//     until the current one expires
// ════════════════════════════════════════════════════════════════
const { POTIONS, STRANGE_POTION_OUTCOMES } = require('../data/auras/potions');
const { eventBus } = require('./eventBus');
const { EVENTS } = require('../constants');
const { logger } = require('./logger');

function weightedPick(entries, weightKey = 'weight') {
    const total = entries.reduce((s, e) => s + e[weightKey], 0);
    let roll = Math.random() * total;
    for (const e of entries) {
        roll -= e[weightKey];
        if (roll <= 0) return e;
    }
    return entries[entries.length - 1];
}

/**
 * Attempts to consume a potion for a user. Returns { ok: true, ... }
 * or { ok: false, reason: string }.
 */
function consumePotion(rngData, userId, potionId) {
    const potion = POTIONS[potionId];
    if (!potion) return { ok: false, reason: `Unknown potion: ${potionId}` };

    const inventory = rngData.potionInventory?.get(userId) || {};
    if (!inventory[potionId] || inventory[potionId] <= 0) {
        return { ok: false, reason: `You don't have any ${potion.name}.` };
    }

    const now = Date.now();
    const active = rngData.activePotions.get(userId) || [];

    // ── Exclusive category: block if ANY exclusive potion is
    // currently active, regardless of which one. ──
    if (potion.category === 'exclusive') {
        const activeExclusive = active.find((p) => {
            const def = POTIONS[p.potionId];
            return def?.category === 'exclusive' && p.expiresAt > now;
        });
        if (activeExclusive) {
            const remainingMs = activeExclusive.expiresAt - now;
            return {
                ok: false,
                reason: `You must wait ${Math.ceil(remainingMs / 1000)}s for your current Strange Potion to expire before using another.`,
            };
        }
    }

    // ── oneTime "blockedBy" rule (Heavenly vs Oblivion) ──
    // One-time potions are stored with expiresAt=-1 (a sentinel, not
    // a real timestamp) until consumed by an actual roll — so "is it
    // still active" means "oneTimePending is true", NOT "expiresAt >
    // now" (which is always false for -1, a bug caught via testing:
    // this check silently never blocked anything until fixed).
    if (potion.blockedBy) {
        const blocked = active.find((p) => {
            if (!potion.blockedBy.includes(p.potionId)) return false;
            return p.oneTimePending ? true : p.expiresAt > now;
        });
        if (blocked) {
            return { ok: false, reason: `${potion.name} cannot be used while ${POTIONS[blocked.potionId]?.name} is active.` };
        }
    }

    // ── Deduct from inventory ──
    inventory[potionId] -= 1;
    if (!rngData.potionInventory) rngData.potionInventory = new Map();
    rngData.potionInventory.set(userId, inventory);

    let effects = potion.effects;
    let resolvedOutcomeName = null;

    // ── Strange Potion: resolve a random outcome NOW, then apply it
    // as if it were the potion's own effects for its duration. ──
    if (potion.randomOutcomes === 'strange') {
        const outcome = weightedPick(STRANGE_POTION_OUTCOMES);
        effects = outcome.effects;
        resolvedOutcomeName = outcome.name;
    }

    if (potion.category === 'oneTime') {
        // Applied to next roll only — stored with a special marker
        // (expiresAt = -1) that the roll handler checks and consumes
        // immediately, rather than a time-based expiry.
        active.push({ potionId, effects, expiresAt: -1, oneTimePending: true });
    } else {
        active.push({ potionId, effects, expiresAt: now + potion.durationMs });
    }

    rngData.activePotions.set(userId, active);
    rngData._markDirty();

    logger.info(`Potion consumed: user=${userId} potion=${potionId}${resolvedOutcomeName ? ` outcome=${resolvedOutcomeName}` : ''}`);
    eventBus.emitSafe(EVENTS.ON_POTION_CONSUMED, { userId, potionId, effects, resolvedOutcomeName });

    return { ok: true, potion, effects, resolvedOutcomeName };
}

/**
 * Computes the combined active luck/rollSpeed bonus for a user right
 * now, pruning expired timed effects and consuming any pending
 * one-time effect (removing it after this call, since one-time
 * effects apply to exactly one roll).
 * @returns {{ luckBonus: number, rollSpeedBonus: number }}
 */
function getActivePotionEffects(rngData, userId, { consumeOneTime = false } = {}) {
    const now = Date.now();
    const active = rngData.activePotions.get(userId) || [];

    let luckBonus = 0;
    let rollSpeedBonus = 0;
    const stillActive = [];

    for (const entry of active) {
        if (entry.oneTimePending) {
            // One-time effects always apply once when present, then
            // are removed if consumeOneTime is true (i.e. an actual
            // roll is happening, not just a status check).
            luckBonus += entry.effects.luckBonus || 0;
            rollSpeedBonus += entry.effects.rollSpeedBonus || 0;
            if (!consumeOneTime) stillActive.push(entry);
            continue;
        }

        if (entry.expiresAt > now) {
            luckBonus += entry.effects.luckBonus || 0;
            rollSpeedBonus += entry.effects.rollSpeedBonus || 0;
            stillActive.push(entry);
        } else {
            eventBus.emitSafe(EVENTS.ON_POTION_EXPIRED, { userId, potionId: entry.potionId });
        }
    }

    if (stillActive.length !== active.length) {
        rngData.activePotions.set(userId, stillActive);
        rngData._markDirty();
    }

    return { luckBonus, rollSpeedBonus };
}

module.exports = { consumePotion, getActivePotionEffects };
