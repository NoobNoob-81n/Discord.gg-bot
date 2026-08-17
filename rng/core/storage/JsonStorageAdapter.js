// ════════════════════════════════════════════════════════════════
// RNG SYSTEM — JSON Storage Adapter
// Default storage backend: a single rng-data.json file on disk.
// Implements the StorageAdapter contract — see StorageAdapter.js.
// Swap this for SqliteAdapter/MongoAdapter later without touching
// any command or game-logic file.
//
// IMPORTANT: defaults to /app/data (the Railway Volume mount path),
// NOT a path inside the code folder. Railway containers are
// ephemeral outside the mounted Volume — anything written to the
// code folder gets wiped on every redeploy. This was the cause of
// a real data-loss bug (RNG progress resetting on every deploy)
// until fixed to point here, matching where the main bot's
// data.json already safely lives.
// ════════════════════════════════════════════════════════════════
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const { StorageAdapter } = require('./StorageAdapter.js');
const { logger } = require('../logger');

class JsonStorageAdapter extends StorageAdapter {
    constructor(filePath = path.join('/app/data', 'rng-data.json')) {
        super();
        this.filePath = filePath;
        this.directoryPath = path.dirname(filePath);
        this._dirty = false;
    }

    async _ensureDirectory() {
        await fsp.mkdir(this.directoryPath, { recursive: true });
    }

    async load() {
        try {
            // Some hosts do not create /app/data automatically. Create the
            // parent path before checking for a save file so first startup
            // and the first autosave both work reliably.
            await this._ensureDirectory();
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
            // Required before writing the temporary file used for atomic save.
            await this._ensureDirectory();
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
