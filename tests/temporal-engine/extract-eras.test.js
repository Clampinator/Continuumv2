import { describe, it, expect } from 'vitest';
import { extractEras } from '../../modules/temporal-engine/extract-eras.js';

describe('extractEras', () => {
    it('should format and sort eras from actor data', () => {
        const actor = {
            system: {
                eras: {
                    'era2': { name: 'Adulthood', duration: 20, sort: 2, color: '#00ff00' },
                    'era1': { name: 'Childhood', duration: 10, sort: 1, color: '#ff0000' }
                }
            }
        };

        const eras = extractEras(actor);

        expect(eras).toHaveLength(2);
        
        // Era 1 (Sorted by sort value)
        expect(eras[0]).toEqual({
            name: 'Childhood',
            startAge: 0,
            duration: 10,
            color: '#ff0000'
        });

        // Era 2
        expect(eras[1]).toEqual({
            name: 'Adulthood',
            startAge: 10,
            duration: 20,
            color: '#00ff00'
        });
    });

    it('should return empty array if no actor or eras provided', () => {
        expect(extractEras(null)).toEqual([]);
        expect(extractEras({})).toEqual([]);
        expect(extractEras({ system: {} })).toEqual([]);
    });
});
