// ════════════════════════════════════════════════════════════════
// RNG SYSTEM — Aura Loader
// Automatically discovers and merges every .json file in
// data/auras/ — no need to register new files anywhere in code.
// Drop a new file (e.g. "seasonal.json") in that folder and it's
// automatically included on the next reload.
//
// CACHING: aura data is loaded from disk ONCE, at startup (or on
// explicit reload() call), and kept in memory. Rolling never reads
// from disk — see rollEngine.js, which uses this module's cached
// getAllAuras() rather than requiring JSON files directly.
// ════════════════════════════════════════════════════════════════
const fs = require('fs');
const path = require('path');
const { logger } = require('./logger');
const { SPECIAL_AURA_IDS } = require('../constants');

const AURAS_DIR = path.join(__dirname, '..', 'data', 'auras');

let _cache = null; // null until first load() — signals "not loaded yet"
let _byId = null;  // Map for O(1) id lookups, built alongside _cache

function loadFromDisk() {
    const files = fs.readdirSync(AURAS_DIR).filter((f) => f.endsWith('.json'));

    if (files.length === 0) {
        throw new Error(`[AuraLoader] No .json files found in ${AURAS_DIR} — the roll system has nothing to roll.`);
    }

    const merged = [];
    const seenIds = new Set();

    for (const file of files) {
        const fullPath = path.join(AURAS_DIR, file);
        let parsed;
        try {
            parsed = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
        } catch (err) {
            throw new Error(`[AuraLoader] Failed to parse ${file}: ${err.message}`);
        }

        if (!Array.isArray(parsed)) {
            throw new Error(`[AuraLoader] ${file} must contain a JSON array of aura objects.`);
        }

        for (const aura of parsed) {
            if (!aura.id) {
                throw new Error(`[AuraLoader] An aura in ${file} is missing an "id" field: ${JSON.stringify(aura).slice(0, 100)}`);
            }
            if (seenIds.has(aura.id)) {
                throw new Error(`[AuraLoader] Duplicate aura id "${aura.id}" found (at least one occurrence in ${file}). Aura ids must be globally unique across all files.`);
            }
            seenIds.add(aura.id);
            merged.push(aura);
        }

        logger.info(`Loaded ${parsed.length} auras from ${file}`);
    }

    return merged;
}

/**
 * Loads (or reloads) all aura files from disk into memory. Call this
 * once at startup. Safe to call again later (e.g. from an owner
 * "_rngreload" command) to pick up newly-added aura files without
 * restarting the bot.
 */
function reload() {
    const auras = loadFromDisk();
    _cache = auras;
    _byId = new Map(auras.map((a) => [a.id, a]));
    logger.info(`Aura database (re)loaded: ${auras.length} total auras across all files.`);
    return _cache;
}

/**
 * Returns the cached aura list. Throws if reload() hasn't been
 * called yet — this is intentional, so a missing bootstrap call
 * fails loudly at startup rather than silently rolling from an
 * empty pool later.
 */
function getAllAuras() {
    if (_cache === null) {
        throw new Error('[AuraLoader] getAllAuras() called before reload() — call reload() once at bot startup.');
    }
    return _cache;
}

function getAuraById(auraId) {
    if (_byId === null) {
        throw new Error('[AuraLoader] getAuraById() called before reload() — call reload() once at bot startup.');
    }
    return _byId.get(auraId) || null;
}

function getGodlikeNoob() {
    return getAuraById(SPECIAL_AURA_IDS.GODLIKE_NOOB);
}

module.exports = { reload, getAllAuras, getAuraById, getGodlikeNoob };
