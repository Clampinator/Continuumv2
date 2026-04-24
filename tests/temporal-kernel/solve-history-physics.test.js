import { describe, it, expect, vi } from 'vitest';
import { solveHistoryPhysics } from '../../modules/temporal-kernel/solve-history-physics.js';

describe('solveHistoryPhysics (Orchestrator)', () => {
    it('should calculate shifts correctly for a simple progression', () => {
        // Birth at 0, Event 1 at Time 5000 (ms), Age 10 (s)
        // Age should be (5000 - 0) / 1000 = 5.
        // Since saved age is 10, shift should be 5.
        const history = [
            { id: 'ev1', x: 10, y: 5000, sort: 1000, record: { isSpan: false } }
        ];
        const dobTime = 0;

        const shifts = solveHistoryPhysics(history, dobTime);

        expect(shifts['ev1']).toBe(5);
    });

    it('should handle spans and shift the world clock for downstream nodes', () => {
        // Birth at 0.
        // Span 1: Time 5000, Arrival 15000. Age is (5000 - 0) / 1000 = 5.
        // New Offset = 15000 - (5 * 1000) = 10000.
        // Event 2: Time 10000. Age should be (10000 - 10000) / 1000 = 0.
        const history = [
            { id: 'span1', x: 5, y: 5000, arrivalY: 15000, sort: 1000, record: { isSpan: true } },
            { id: 'ev2', x: 10, y: 10000, sort: 2000, record: { isSpan: false } }
        ];
        const dobTime = 0;

        const shifts = solveHistoryPhysics(history, dobTime);

        // ev2 saved age was 10, should now be 0.
        expect(shifts['ev2']).toBe(0);
    });

    it('should ignore virtual and now nodes', () => {
        const history = [
            { id: 'now', isNow: true, x: 10, y: 10000 },
            { id: 'virt', isVirtual: true, x: 5, y: 5000 }
        ];
        const shifts = solveHistoryPhysics(history, 0);
        expect(Object.keys(shifts)).toHaveLength(0);
    });
});
