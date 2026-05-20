import { describe, it, expect } from 'vitest';
import { mapYearsToBonus } from '../../modules/lifeline/services/calculators/resonance-calculator/map-years-to-bonus.js';

/**
 * Verify that the distance bonus thresholds match the authoritative spec:
 *   <2yr = +3, 2-5yr = +2, 5-10yr = +1, >10yr = 0
 * Previous code had <=7yr for +2 which was wrong.
 */
describe('mapYearsToBonus: Distance Bonus Thresholds', () => {
    it('should return +3 for less than 2 years (strong resonance)', () => {
        expect(mapYearsToBonus(0)).toBe(3);
        expect(mapYearsToBonus(0.5)).toBe(3);
        expect(mapYearsToBonus(1)).toBe(3);
        expect(mapYearsToBonus(1.999)).toBe(3);
    });

    it('should return +2 for 2-5 years (firm resonance)', () => {
        // Boundary: exactly 2 years is in the +2 tier
        expect(mapYearsToBonus(2)).toBe(2);
        expect(mapYearsToBonus(3)).toBe(2);
        expect(mapYearsToBonus(5)).toBe(2);
    });

    it('should return +1 for 5-10 years (slight resonance)', () => {
        // Boundary: just above 5 years drops to +1
        expect(mapYearsToBonus(5.001)).toBe(1);
        expect(mapYearsToBonus(7)).toBe(1);
        expect(mapYearsToBonus(10)).toBe(1);
    });

    it('should return 0 for >10 years (beyond recall)', () => {
        expect(mapYearsToBonus(10.001)).toBe(0);
        expect(mapYearsToBonus(15)).toBe(0);
        expect(mapYearsToBonus(50)).toBe(0);
    });

    it('should return +2 at boundary of exactly 2 years', () => {
        // Exactly 2yr falls in the 2-5yr range: +2
        expect(mapYearsToBonus(2)).toBe(2);
    });

    it('should return +1 at exactly 7 years (was incorrectly +2)', () => {
        // The old threshold of <=7 made this +2. The spec says 5-10 = +1.
        expect(mapYearsToBonus(7)).toBe(1);
    });
});