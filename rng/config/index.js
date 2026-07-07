/**
 * rng/config/index.js
 *
 * Singleton config manager. Loads config/defaults.json (checked into your
 * repo, safe to edit) and merges it with config/overrides.json (runtime
 * changes made via setPrefix/set(), written back to disk so they survive
 * restarts). Nothing else in the RNG system should hardcode a tunable
 * number or string - it should be added here and read via get().
 */
const fs = require('fs');
const path = require('path');

const DEFAULTS_PATH = path.join(__dirname, 'defaults.json');
const OVERRIDES_PATH = path.join(__dirname, 'overrides.json');

function isPlainObject(val) {
  return val && typeof val === 'object' && !Array.isArray(val);
}

function deepMerge(base, override) {
  const result = { ...base };
  for (const [key, value] of Object.entries(override || {})) {
    if (isPlainObject(value) && isPlainObject(result[key])) {
      result[key] = deepMerge(result[key], value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

function readJson(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return fallback;
  }
}

class ConfigManager {
  static #instance;

  constructor() {
    this.defaults = readJson(DEFAULTS_PATH, {});
    this.overrides = readJson(OVERRIDES_PATH, {});
    this.merged = deepMerge(this.defaults, this.overrides);

    this.get = this.get.bind(this);
    this.set = this.set.bind(this);
    this.getPrefix = this.getPrefix.bind(this);
    this.setPrefix = this.setPrefix.bind(this);
  }

  static getInstance() {
    if (!ConfigManager.#instance) {
      ConfigManager.#instance = new ConfigManager();
    }
    return ConfigManager.#instance;
  }

  get(keyPath, fallback = undefined) {
    const parts = keyPath.split('.');
    let node = this.merged;
    for (const part of parts) {
      if (node == null || typeof node !== 'object' || !(part in node)) return fallback;
      node = node[part];
    }
    return node;
  }

  set(keyPath, value) {
    const parts = keyPath.split('.');
    let overrideNode = this.overrides;
    let mergedNode = this.merged;
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!isPlainObject(overrideNode[part])) overrideNode[part] = {};
      overrideNode = overrideNode[part];
      if (!isPlainObject(mergedNode[part])) mergedNode[part] = {};
      mergedNode = mergedNode[part];
    }
    const lastKey = parts[parts.length - 1];
    overrideNode[lastKey] = value;
    mergedNode[lastKey] = value;

    fs.writeFileSync(OVERRIDES_PATH, JSON.stringify(this.overrides, null, 2));
    return value;
  }

  getPrefix() {
    return this.get('prefix', '_');
  }

  setPrefix(newPrefix) {
    return this.set('prefix', newPrefix);
  }
}

module.exports = ConfigManager.getInstance();
module.exports.ConfigManager = ConfigManager;
