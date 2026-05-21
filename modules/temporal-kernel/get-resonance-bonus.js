/**
 * Returns the dice bonus for a resonance tier.
 * Game rule: Slight=+1, Firm=+2, Strong=+3.
 * @param {string} tier - 'slight', 'firm', 'strong', or 'none'.
 * @returns {number} The dice bonus.
 */
export function getResonanceBonus(tier) {
    const bonuses = { slight: 1, firm: 2, strong: 3 };
    return bonuses[tier] || 0;
}