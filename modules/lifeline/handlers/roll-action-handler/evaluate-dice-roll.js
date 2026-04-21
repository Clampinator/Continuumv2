/**
 * Instantiates and evaluates a Foundry Roll based on target and situation.
 * @param {number} finalTarget 
 * @param {string} rollType - 'advantage', 'disadvantage', or 'normal'
 * @returns {Promise<object>} { roll, delta }
 */
export async function evaluateDiceRoll(finalTarget, rollType) {
    // Standard Attribute Roll Logic: Low is Good, TN is Good
    const dicePart = (rollType === 'advantage') ? '3d10kl2' : (rollType === 'disadvantage') ? '3d10kh2' : '2d10';
    const formula = `${finalTarget} - floor(${dicePart}/2)`;
    
    const roll = new Roll(formula);
    await roll.evaluate();
    
    return {
        roll,
        delta: Math.floor(roll.total)
    };
}
