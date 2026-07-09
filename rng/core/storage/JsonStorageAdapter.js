// ════════════════════════════════════════════════════════════════
// RNG SYSTEM — JSON Storage Adapter
// Default storage backend: a single rng-data.json file on disk.
// Implements the StorageAdapter contract — see StorageAdapter.js.
// Swap this for SqliteAdapter/MongoAdapter later without touching
// any command or game-logic file.
// ════════════════════════════════════════════════════════════════
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const { StorageAdapter } = require('./StorageAdapter.js');
const { logger } = require('../core/logger');

class JsonStorageAdapter extends StorageAdapter {
    constructor(filePath = path.join(__dirname, '..', 'rng-data.json')) {
        super();
        this.filePath = filePath;
        this._dirty = false;
    }

    async load() {
        try {
            if (!fs.existsSync(this.filePath)) {
                logger.info(`No existing save file at ${this.filePath} — starting fresh.`);
                return {};
            }
            const raw = await fsp.readFile(this.filePath, 'utf8');
            return JSON.parse(raw);
        } catch (err) {
            logger.error('Failed to load rng-data.json, starting with empty state:', err.message);
            return {};
        }
    }

    async save(data) {
        try {
            const tmpPath = `${this.filePath}.tmp`;
            // Write to a temp file then rename, so a crash mid-write
            // never corrupts the real save file (atomic on most filesystems).
            await fsp.writeFile(tmpPath, JSON.stringify(data, null, 2), 'utf8');
            await fsp.rename(tmpPath, this.filePath);
            this._dirty = false;
        } catch (err) {
            logger.error('Failed to save rng-data.json:', err.message);
            throw err;
        }
    }

    isDirty() {
        return this._dirty;
    }

    markDirty() {
        this._dirty = true;
    }
}

module.exports = { JsonStorageAdapter };
