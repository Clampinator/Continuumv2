import { describe, it, expect, vi } from 'vitest';
import { finalizeState } from '../../modules/temporal-engine/finalize-state.js';
import { generateExperiences } from '../../modules/lifeline/services/segment-generator/generate-experiences.js';

vi.mock('../../modules/lifeline/services/segment-generator/generate-experiences.js', () => ({
    generateExperiences: vi.fn(() => [{ id: 'exp1' }])
}));

describe('finalizeState', () => {
    it('should assemble the final temporal state', () => {
        const segments = [{ id: 'seg1' }];
        const nodes = [{ id: 'birth' }, { id: 'now', y: 5000 }];
        const subjectiveNow = 10;
        const totalDisplacement = 3000;
        const eras = [{ name: 'Childhood' }];
        const actor = {
            system: {
                eras: {
                    'era1': { name: 'Childhood', sort: 1 }
                }
            }
        };

        const state = finalizeState(segments, nodes, subjectiveNow, totalDisplacement, eras, actor);

        expect(state.segments).toBe(segments);
        expect(state.nodes).toBe(nodes);
        expect(state.nowNode.id).toBe('now');
        expect(state.experiences).toHaveLength(1);
        expect(state.eras).toBe(eras);
        expect(state.spanPool.consumed).toBe(3000);
        
        expect(generateExperiences).toHaveBeenCalled();
    });
});
