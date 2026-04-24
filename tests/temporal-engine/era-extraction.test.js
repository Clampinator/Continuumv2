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
                    'era1': { name: 'Childhood', duration: 10, sort: 1, color: '#ff0000' },
                    'era2': { name: 'Adulthood', duration: 20, sort: 2, color: '#00ff00' }
                }
            }
        };

        const state = getTemporalState(history, 0, 0, actor);

        expect(state.eras).toBeDefined();
        expect(state.eras).toHaveLength(2);
        
        // Era 1: Start 0, Duration 10
        expect(state.eras[0]).toEqual({
            name: 'Childhood',
            startAge: 0,
            duration: 10,
            color: '#ff0000'
        });

        // Era 2: Start 10, Duration 20
        expect(state.eras[1]).toEqual({
            name: 'Adulthood',
            startAge: 10,
            duration: 20,
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
