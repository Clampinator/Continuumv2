import { describe, it, expect } from 'vitest';
import { extractEras } from '../../modules/temporal-engine/extract-eras.js';

describe('extractEras', () => {
    it('should format and sort eras from actor data', () => {
        const actor = {
            system: {
                eras: {
                    'era2': { name: 'Adulthood', age: 315360000, sort: 2, color: '#00ff00' },
                    'era1': { name: 'Childhood', age: 0, sort: 1, color: '#ff0000' }
                }
            }
        };

        const eras = extractEras(actor);

        expect(eras).toHaveLength(2);
        
        // Era 1 (Sorted by startAge)
        expect(eras[0]).toEqual({
            id: 'era1',
            name: 'Childhood',
            startAge: 0,
            endAge: 315360000,
            duration: 315360000,
            color: '#ff0000'
        });

        // Era 2 (Last era, endAge = Infinity, duration = 0)
        expect(eras[1]).toEqual({
            id: 'era2',
            name: 'Adulthood',
            startAge: 315360000,
            endAge: Infinity,
            duration: 0,
            color: '#00ff00'
        });
    });

    it('should return empty array if no actor or eras provided', () => {
        expect(extractEras(null)).toEqual([]);
        expect(extractEras({})).toEqual([]);
        expect(extractEras({ system: {} })).toEqual([]);
    });
});
