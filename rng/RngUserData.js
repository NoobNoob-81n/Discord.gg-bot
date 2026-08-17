// ════════════════════════════════════════════════════════════════
// RNG SYSTEM — Save State
// ════════════════════════════════════════════════════════════════
const config = require('./config/config');

class RngUserData {
    constructor(storageAdapter) {
        this._storage = storageAdapter;

        // ── Currencies ──
        this.essence = new Map();
        this.fragments = new Map();
        this.luckTickets = new Map();
        this.divineShards = new Map();
        this.rngCoins = new Map();

        // ── Inventory and collection ──
        this.inventory = new Map(); // userId -> [{ auraId, obtainedAt, rollNumber }]
        this.equipped = new Map();
        this.favorite = new Map();
        this.collection = new Map();

        // ── Storage progression ──
        // New players begin with 10 slots. Every bought upgrade adds the
        // configured number of slots. Existing over-cap inventories are
        // retained but cannot receive more stored auras until space is freed.
        this.auraStorageUpgrades = new Map(); // userId -> number of upgrades bought
        this.autorollUnlocked = new Map(); // userId -> true after the one-time RNG Coin purchase

        // ── Stats ──
        this.rollCount = new Map();
        this.history = new Map();

        // ── Luck modifiers ──
        this.activePotions = new Map();
        this.equippedGlove = new Map();

        // ── Settings ──
        this.rngPrefix = config.defaultPrefix;
        this.godlikeNoobHolder = null;
    }

    _markDirty() {
        if (this._storage) this._storage.markDirty();
    }

    addCurrency(userId, currencyKey, amount) {
        const map = this[currencyKey];
        if (!(map instanceof Map)) throw new Error(`[RngUserData] Unknown currency key: ${currencyKey}`);

        const numericAmount = Number(amount);
        if (!Number.isFinite(numericAmount)) throw new Error('[RngUserData] Currency amount must be a finite number.');

        const current = map.get(userId) || 0;
        map.set(userId, Math.max(0, current + numericAmount));
        this._markDirty();
        return map.get(userId);
    }

    spendCurrency(userId, currencyKey, amount) {
        const map = this[currencyKey];
        if (!(map instanceof Map)) throw new Error(`[RngUserData] Unknown currency key: ${currencyKey}`);

        const numericAmount = Math.floor(Number(amount));
        if (!Number.isSafeInteger(numericAmount) || numericAmount <= 0) {
            throw new Error('[RngUserData] Spend amount must be a positive whole number.');
        }

        const current = map.get(userId) || 0;
        if (current < numericAmount) return false;

        map.set(userId, current - numericAmount);
        this._markDirty();
        return true;
    }

    getStorageUpgradeLevel(userId) {
        return Math.max(0, Math.floor(this.auraStorageUpgrades.get(userId) || 0));
    }

    getAuraCapacity(userId) {
        return config.defaultAuraStorageSlots + (this.getStorageUpgradeLevel(userId) * config.auraStorageSlotsPerUpgrade);
    }

    getAuraUsage(userId) {
        return (this.inventory.get(userId) || []).length;
    }

    getNextStorageUpgradeCost(userId) {
        const level = this.getStorageUpgradeLevel(userId);
        if (level >= config.maxAuraStorageUpgrades) return null;
        return config.auraStorageBaseUpgradeCost * (config.auraStorageUpgradeMultiplier ** level);
    }

    upgradeAuraStorage(userId) {
        const cost = this.getNextStorageUpgradeCost(userId);
        if (cost === null) {
            return { success: false, maxed: true, level: this.getStorageUpgradeLevel(userId) };
        }
        if (!this.spendCurrency(userId, 'rngCoins', cost)) {
            return { success: false, cost, balance: this.rngCoins.get(userId) || 0 };
        }

        const newLevel = this.getStorageUpgradeLevel(userId) + 1;
        this.auraStorageUpgrades.set(userId, newLevel);
        this._markDirty();

        return {
            success: true,
            cost,
            level: newLevel,
            capacity: this.getAuraCapacity(userId),
            balance: this.rngCoins.get(userId) || 0,
        };
    }

    hasAutorollUnlocked(userId) {
        return this.autorollUnlocked.get(userId) === true;
    }

    unlockAutoroll(userId) {
        if (this.hasAutorollUnlocked(userId)) {
            return { success: true, alreadyUnlocked: true, balance: this.rngCoins.get(userId) || 0 };
        }

        if (!this.spendCurrency(userId, 'rngCoins', config.autoRollUnlockCost)) {
            return {
                success: false,
                cost: config.autoRollUnlockCost,
                balance: this.rngCoins.get(userId) || 0,
            };
        }

        this.autorollUnlocked.set(userId, true);
        this._markDirty();
        return { success: true, alreadyUnlocked: false, balance: this.rngCoins.get(userId) || 0 };
    }

    addToCollection(userId, auraId) {
        if (!this.collection.has(userId)) this.collection.set(userId, new Set());
        this.collection.get(userId).add(auraId);
        this._markDirty();
    }

    getCollectionSize(userId) {
        return this.collection.get(userId)?.size || 0;
    }

    /**
     * Records an RNG result. Collection and roll statistics always update,
     * even if the aura was sold or storage was full. The caller can decide
     * whether the result should be stored by passing store: false.
     */
    recordAuraRoll(userId, auraId, { store = true } = {}) {
        const inv = this.inventory.get(userId) || [];
        const rollNumber = (this.rollCount.get(userId) || 0) + 1;
        const capacity = this.getAuraCapacity(userId);
        const canStore = store && inv.length < capacity;

        this.rollCount.set(userId, rollNumber);
        this.addToCollection(userId, auraId);

        if (canStore) {
            inv.push({ auraId, obtainedAt: Date.now(), rollNumber });
            this.inventory.set(userId, inv);
        }

        this._markDirty();
        return { stored: canStore, rollNumber, usedSlots: inv.length, capacity };
    }

    // Backwards-compatible alias for older call sites. New gameplay logic
    // should use recordAuraRoll() so it can deliberately autosell a result.
    addToInventory(userId, auraId) {
        return this.recordAuraRoll(userId, auraId, { store: true });
    }

    removeFromInventory(userId, auraId, amount = 1) {
        const requested = Math.max(1, Math.floor(Number(amount) || 1));
        const inv = this.inventory.get(userId) || [];
        const kept = [];
        let removed = 0;

        for (const entry of inv) {
            if (entry.auraId === auraId && removed < requested) {
                removed += 1;
            } else {
                kept.push(entry);
            }
        }

        if (removed > 0) {
            this.inventory.set(userId, kept);
            if (!kept.some((entry) => entry.auraId === auraId)) {
                if (this.equipped.get(userId) === auraId) this.equipped.set(userId, null);
                if (this.favorite.get(userId) === auraId) this.favorite.set(userId, null);
            }
            this._markDirty();
        }

        return removed;
    }

    addToHistory(userId, auraId) {
        const hist = this.history.get(userId) || [];
        hist.unshift({ auraId, timestamp: Date.now() });
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
            rngCoins: mapToObj(this.rngCoins),
            inventory: mapToObj(this.inventory),
            equipped: mapToObj(this.equipped),
            favorite: mapToObj(this.favorite),
            collection: collectionToObj(),
            auraStorageUpgrades: mapToObj(this.auraStorageUpgrades),
            autorollUnlocked: mapToObj(this.autorollUnlocked),
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
        const loadObjectIntoMap = (map, source, transform) => {
            if (!source) return;
            for (const [key, value] of Object.entries(source)) {
                map.set(String(key), transform ? transform(value) : value);
            }
        };

        loadObjectIntoMap(this.essence, obj.essence, (value) => Number(value) || 0);
        loadObjectIntoMap(this.fragments, obj.fragments, (value) => Number(value) || 0);
        loadObjectIntoMap(this.luckTickets, obj.luckTickets, (value) => Number(value) || 0);
        loadObjectIntoMap(this.divineShards, obj.divineShards, (value) => Number(value) || 0);
        loadObjectIntoMap(this.rngCoins, obj.rngCoins, (value) => Number(value) || 0);
        loadObjectIntoMap(this.inventory, obj.inventory, (value) => (Array.isArray(value) ? value : []));
        loadObjectIntoMap(this.equipped, obj.equipped);
        loadObjectIntoMap(this.favorite, obj.favorite);
        loadObjectIntoMap(this.auraStorageUpgrades, obj.auraStorageUpgrades, (value) => Math.max(0, Math.floor(Number(value) || 0)));
        loadObjectIntoMap(this.autorollUnlocked, obj.autorollUnlocked, (value) => value === true);
        loadObjectIntoMap(this.rollCount, obj.rollCount, (value) => Number(value) || 0);
        loadObjectIntoMap(this.history, obj.history, (value) => (Array.isArray(value) ? value : []));
        loadObjectIntoMap(this.activePotions, obj.activePotions, (value) => (Array.isArray(value) ? value : []));
        loadObjectIntoMap(this.equippedGlove, obj.equippedGlove);

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
