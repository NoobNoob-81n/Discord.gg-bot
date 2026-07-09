// ════════════════════════════════════════════════════════════════
// RNG SYSTEM — Storage Interface
// This is a CONTRACT, not an implementation. Any storage backend
// (JSON file, SQLite, MongoDB) must implement these three methods.
// Commands and game logic should only ever talk to a StorageAdapter,
// never to `fs` or a database driver directly — that's what makes
// swapping backends later a one-file change instead of a rewrite.
//
// To add a new backend:
//   1. Create storage/xyzAdapter.js implementing load/save/isDirty
//   2. Change the one require() in core/rngState.js to point at it
//   3. Nothing else in the codebase needs to change.
// ════════════════════════════════════════════════════════════════
class StorageAdapter {
    /**
     * Loads persisted state and returns a plain object suitable for
     * RngUserData.fromJSON(). Must resolve to {} (not throw) if no
     * saved data exists yet (first run).
     * @returns {Promise<object>}
     */
    async load() {
        throw new Error('StorageAdapter.load() must be implemented by a subclass');
    }

    /**
     * Persists the given plain object (from RngUserData.toJSON()).
     * @param {object} data
     * @returns {Promise<void>}
     */
    async save(data) {
        throw new Error('StorageAdapter.save() must be implemented by a subclass');
    }

    /**
     * Whether there are unsaved changes pending. Used by the
     * autosave loop to skip writes when nothing changed, avoiding
     * unnecessary disk I/O on quiet periods.
     * @returns {boolean}
     */
    isDirty() {
        throw new Error('StorageAdapter.isDirty() must be implemented by a subclass');
    }

    /**
     * Marks state as having unsaved changes. Called by RngUserData
     * mutation methods so the autosave loop knows a save is needed.
     */
    markDirty() {
        throw new Error('StorageAdapter.markDirty() must be implemented by a subclass');
    }
}

module.exports = { StorageAdapter };
