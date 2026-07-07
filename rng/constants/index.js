/**
 * rng/constants/index.js
 * Every value here is referenced by name elsewhere in the RNG system.
 */

const CURRENCY_NAME = 'coins';

const EVENTS = {
  ROLL: 'onRoll',
  AURA_FOUND: 'onAuraFound',
  RARE_AURA: 'onRareAura',
  COLLECTION_COMPLETE: 'onCollectionComplete',
  EQUIP: 'onEquip',
  FAVORITE: 'onFavorite',
  TRADE: 'onTrade'
};

const PERMISSIONS = {
  USER: 'user',
  ADMIN: 'admin',
  DEVELOPER: 'developer'
};

const SPECIAL_AURA_IDS = {
  GALAXY_TEST_AURA: 'galaxy',
  FINAL_AURA: 'genesis-omega'
};

const EMBED_COLORS = {
  DEFAULT: '#5865F2',
  ERROR: '#ED4245',
  SUCCESS: '#57F287',
  WARNING: '#FEE75C'
};

module.exports = {
  CURRENCY_NAME,
  EVENTS,
  PERMISSIONS,
  SPECIAL_AURA_IDS,
  EMBED_COLORS
};
