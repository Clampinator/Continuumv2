import { describe, it, expect } from 'vitest';
import { establishHistoryPhysics } from '../../modules/temporal-kernel/establish-history-physics.js';

describe('establishHistoryPhysics', () => {
    const originTime = 946728000000; // 2000-01-01 12:00:00 UTC

    it('should establish physics for a simple sequence of facts', () => {
        const historyFacts = [
            { id: 'birth', sort: 1000, isBirth: true, record: { age: 0, date: "2000-01-01", time: "12:00:00" } },
            { id: 'e1', sort: 2000, record: { age: 10, date: "2000-01-01", time: "12:00:10" } }
        ];

        const physicalNodes = establishHistoryPhysics(historyFacts, originTime);

        expect(physicalNodes).toHaveLength(2);
        
        const birth = physicalNodes.find(n => n.id === 'birth');
        expect(birth.x).toBe(0);
        expect(birth.y).toBe(originTime);

        const e1 = physicalNodes.find(n => n.id === 'e1');
        expect(e1.x).toBe(10);
        expect(e1.y).toBe(originTime + 10000); // 10 seconds later
    });

    it('should correctly apply world-offset shifts from Spans', () => {
        const historyFacts = [
            { id: 'birth', sort: 1000, isBirth: true, record: { age: 0, date: "2000-01-01", time: "12:00:00" } },
            // Span departs at age 10, arrives at noon + 20s (skipping 10s of world time)
            { id: 'span1', sort: 2000, record: { age: 10, isSpan: true, spanFromDate: "2000-01-01", spanFromTime: "12:00:10", spanToDate: "2000-01-01", spanToTime: "12:00:20" } },
            // Event occurs at age 15 (5s after span arrival)
            { id: 'e2', sort: 3000, record: { age: 15, date: "2000-01-01", time: "12:00:25" } }
        ];

        const physicalNodes = establishHistoryPhysics(historyFacts, originTime);

        const span = physicalNodes.find(n => n.id === 'span1');
        expect(span.x).toBe(10);
        expect(span.y).toBe(originTime + 10000);
        expect(span.arrivalY).toBe(originTime + 20000);

        const e2 = physicalNodes.find(n => n.id === 'e2');
        expect(e2.x).toBe(15);
        // e2 time should be SpanArrival + (AgeDelta): (noon+20s) + (15-10)s = noon+25s
        expect(e2.y).toBe(originTime + 25000);
    });
});
