// ════════════════════════════════════════════════════════════════
// RNG SYSTEM — RNG Coins Reward Calculator
// RNG Coins are earned automatically whenever a player rolls an
// aura with odds of 1-in-1000 or rarer. Reward scales logarithmically
// with rarity: 10 coins at the 1-in-1000 threshold, up to a 100,000
// coin cap at 1-in-1,000,000,000+ (matching Sol's RNG-style scaling
// where the jump in reward reflects the jump in rarity, not a flat
// per-tier bonus).
// ════════════════════════════════════════════════════════════════
const RNG_COIN_THRESHOLD_ODDS = 1000; // below this, no RNG coins awarded
const RNG_COIN_MIN_REWARD = 10;       // reward at exactly the threshold
const RNG_COIN_MAX_REWARD = 100000;   // hard cap, reached at LOG_MAX_ODDS and beyond
const LOG_MIN_ODDS = Math.log10(RNG_COIN_THRESHOLD_ODDS); // log10(1000) = 3
const LOG_MAX_ODDS = 9; // log10(1,000,000,000) = 9 — cap reached here

/**
 * Computes how many RNG Coins an aura's odds should award.
 * @param {number} odds - the aura's "1 in X" odds value
 * @returns {number} RNG Coins awarded (0 if below threshold)
 */
function calculateRngCoinReward(odds) {
    if (odds < RNG_COIN_THRESHOLD_ODDS) return 0;

    const logOdds = Math.log10(odds);
    const t = Math.min(1, (logOdds - LOG_MIN_ODDS) / (LOG_MAX_ODDS - LOG_MIN_ODDS));
    const reward = Math.round(RNG_COIN_MIN_REWARD + t * (RNG_COIN_MAX_REWARD - RNG_COIN_MIN_REWARD));

    return Math.min(RNG_COIN_MAX_REWARD, reward);
}

module.exports = { calculateRngCoinReward, RNG_COIN_THRESHOLD_ODDS, RNG_COIN_MAX_REWARD };
