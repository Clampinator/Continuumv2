import { describe, it, expect, vi } from 'vitest';
import { getTemporalState } from '../../modules/temporal-engine/get-temporal-state.js';

describe('getTemporalState: Era Extraction', () => {
    it('should include a pre-calculated eras array in the state', () => {
        const history = [
            { id: 'birth', x: 0, y: 0, record: { title: 'Birth' }, isBirth: true }
        ];
        const actor = {
            system: {
                eras: {
                    'era1': { name: 'Childhood', age: 0, sort: 1, color: '#ff0000' },
                    'era2': { name: 'Adulthood', age: 315360000, sort: 2, color: '#00ff00' }
                }
            }
        };

        const state = getTemporalState(history, 0, 0, actor);

        expect(state.eras).toBeDefined();
        expect(state.eras).toHaveLength(2);
        
        // Era 1: Start 0, bounded by era2 start
        expect(state.eras[0]).toEqual({
            id: 'era1',
            name: 'Childhood',
            startAge: 0,
            endAge: 315360000,
            duration: 315360000,
            color: '#ff0000'
        });

        // Era 2: Last era, endAge = Infinity
        expect(state.eras[1]).toEqual({
            id: 'era2',
            name: 'Adulthood',
            startAge: 315360000,
            endAge: Infinity,
            duration: 0,
            color: '#00ff00'
        });
    });

    it('should handle missing eras gracefully', () => {
        const history = [{ id: 'birth', x: 0, y: 0, record: { title: 'Birth' }, isBirth: true }];
        const actor = { system: { eras: {} } };
        const state = getTemporalState(history, 0, 0, actor);
        expect(state.eras).toEqual([]);
    });
});
