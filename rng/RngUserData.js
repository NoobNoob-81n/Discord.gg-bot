// ════════════════════════════════════════════════════════════════
// RNG SYSTEM — Save State
// Completely independent from the main bot's UserData/economy.
// Own currencies, own inventory, own save file (rng-data.json).
// Persistence goes through a StorageAdapter (see storage/), so
// swapping JSON for SQLite/MongoDB later means changing one require
// in core/rngState.js — nothing here needs to change.
// ════════════════════════════════════════════════════════════════
const config = require('./config/config');

class RngUserData {
    constructor(storageAdapter) {
        this._storage = storageAdapter; // used for markDirty() on every mutation

        // ── Currencies (all per-user Maps, userId -> number) ──
        this.essence      = new Map(); // ✨ main rolling currency
        this.fragments    = new Map(); // 🌌 secondary currency (crafting/upgrades later)
        this.luckTickets  = new Map(); // 🎟 consumable, guarantees a luck boost roll
        this.divineShards = new Map(); // 👑 premium/rare currency

        // ── Inventory & collection ──
        this.inventory    = new Map(); // userId -> [{auraId, obtainedAt, rollNumber}, ...]
        this.equipped     = new Map(); // userId -> auraId | null
        this.favorite     = new Map(); // userId -> auraId | null
        this.collection   = new Map(); // userId -> Set of unique auraIds ever obtained

        // ── Stats ──
        this.rollCount    = new Map(); // userId -> total rolls ever made
        this.history      = new Map(); // userId -> [{auraId, timestamp}, ...] capped list, most recent first

        // ── Luck modifiers (from gloves/potions/events) ──
        this.activePotions = new Map(); // userId -> [{potionId, expiresAt, luckBonus}, ...]
        this.equippedGlove = new Map(); // userId -> gloveId | null

        // ── Owner-configurable settings ──
        this.rngPrefix = config.defaultPrefix;
        this.godlikeNoobHolder = null; // userId currently holding it, or null if unclaimed
    }

    _markDirty() {
        if (this._storage) this._storage.markDirty();
    }

    // ── Mutation helpers — all route through _markDirty() so the
    // autosave loop knows there's something new to persist. ──

    addCurrency(userId, currencyKey, amount) {
        const map = this[currencyKey];
        if (!(map instanceof Map)) throw new Error(`[RngUserData] Unknown currency key: ${currencyKey}`);
        const current = map.get(userId) || 0;
        map.set(userId, current + amount);
        this._markDirty();
        return map.get(userId);
    }

    addToCollection(userId, auraId) {
        if (!this.collection.has(userId)) this.collection.set(userId, new Set());
        this.collection.get(userId).add(auraId);
        this._markDirty();
    }

    getCollectionSize(userId) {
        return this.collection.get(userId)?.size || 0;
    }

    addToInventory(userId, auraId) {
        const inv = this.inventory.get(userId) || [];
        const rollNumber = (this.rollCount.get(userId) || 0) + 1;
        inv.push({ auraId, obtainedAt: Date.now(), rollNumber });
        this.inventory.set(userId, inv);
        this.rollCount.set(userId, rollNumber);
        this.addToCollection(userId, auraId);
        this._markDirty();
    }

    addToHistory(userId, auraId) {
        const hist = this.history.get(userId) || [];
        hist.unshift({ auraId, timestamp: Date.now() });
        // Cap history length per config — oldest entries dropped.
        if (hist.length > config.maxHistorySize) hist.length = config.maxHistorySize;
        this.history.set(userId, hist);
        this._markDirty();
    }

    toJSON() {
        const mapToObj = (map) => Object.fromEntries(map);
        const collectionToObj = () => {
            const out = {};
            for (const [userId, set] of this.collection) out[userId] = [...set];
            return out;
        };

        return {
            essence: mapToObj(this.essence),
            fragments: mapToObj(this.fragments),
            luckTickets: mapToObj(this.luckTickets),
            divineShards: mapToObj(this.divineShards),
            inventory: mapToObj(this.inventory),
            equipped: mapToObj(this.equipped),
            favorite: mapToObj(this.favorite),
            collection: collectionToObj(),
            rollCount: mapToObj(this.rollCount),
            history: mapToObj(this.history),
            activePotions: mapToObj(this.activePotions),
            equippedGlove: mapToObj(this.equippedGlove),
            rngPrefix: this.rngPrefix,
            godlikeNoobHolder: this.godlikeNoobHolder,
        };
    }

    fromJSON(obj) {
        if (!obj) return;
        const lo = (map, src, fn) => {
            if (!src) return;
            for (const [k, v] of Object.entries(src)) map.set(String(k), fn ? fn(v) : v);
        };

        lo(this.essence, obj.essence, (v) => Number(v) || 0);
        lo(this.fragments, obj.fragments, (v) => Number(v) || 0);
        lo(this.luckTickets, obj.luckTickets, (v) => Number(v) || 0);
        lo(this.divineShards, obj.divineShards, (v) => Number(v) || 0);
        lo(this.inventory, obj.inventory, (v) => (Array.isArray(v) ? v : []));
        lo(this.equipped, obj.equipped, (v) => v);
        lo(this.favorite, obj.favorite, (v) => v);
        lo(this.rollCount, obj.rollCount, (v) => Number(v) || 0);
        lo(this.history, obj.history, (v) => (Array.isArray(v) ? v : []));
        lo(this.activePotions, obj.activePotions, (v) => (Array.isArray(v) ? v : []));
        lo(this.equippedGlove, obj.equippedGlove, (v) => v);

        if (obj.collection) {
            for (const [userId, arr] of Object.entries(obj.collection)) {
                this.collection.set(String(userId), new Set(Array.isArray(arr) ? arr : []));
            }
        }

        if (typeof obj.rngPrefix === 'string' && obj.rngPrefix.length > 0) {
            this.rngPrefix = obj.rngPrefix;
        }
        this.godlikeNoobHolder = obj.godlikeNoobHolder || null;
    }
}

module.exports = { RngUserData };
