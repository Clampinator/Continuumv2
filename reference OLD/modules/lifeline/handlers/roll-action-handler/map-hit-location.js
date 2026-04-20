/**
 * Maps d10 results to hit locations per the hit location table.
 * @param {Roll} roll 
 * @returns {object} { code, name }
 */
export function mapHitLocation(roll) {
    const dice = roll.dice.find(d => d.faces === 10);
    const result = dice?.results[0]?.result || 1;

    const map = {
        1: { code: 'A', name: 'Head' },
        2: { code: 'B', name: 'Chest / Upper Torso' },
        3: { code: 'B', name: 'Chest / Upper Torso' },
        4: { code: 'C', name: 'Abdomen / Pelvis / Groin' },
        5: { code: 'D', name: 'Upper Arms / Shoulders' },
        6: { code: 'D', name: 'Upper Arms / Shoulders' },
        7: { code: 'F', name: 'Forearms / Hands' },
        8: { code: 'E', name: 'Thighs / Upper Legs' },
        9: { code: 'G', name: 'Lower Legs / Feet' },
        10: { code: 'G', name: 'Lower Legs / Feet' }
    };

    return map[result];
}