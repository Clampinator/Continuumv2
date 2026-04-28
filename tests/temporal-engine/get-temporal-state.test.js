import { describe, it, expect } from 'vitest';
import { getTemporalState } from '../../modules/temporal-engine/get-temporal-state.js';

describe('getTemporalState: The Umbilical Cord', () => {
    const originTime = 946728000000; // 2000-01-01 12:00:00 UTC

    it('should calculate the full state of a simple lifeline from raw facts', () => {
        const historyFacts = [
            { id: 'birth', sort: 1000, isBirth: true, record: { eventAge: 0, eventDate: "2000-01-01", eventTime: "12:00:00" } },
            { id: 'e1', sort: 2000, record: { eventAge: 10, eventDate: "2000-01-01", eventTime: "12:00:10" } }
        ];
        
        const state = getTemporalState(historyFacts, null, originTime);
        
        expect(state.segments).toHaveLength(1);
        expect(state.nodes).toHaveLength(2);
        
        const e1 = state.nodes.find(n => n.id === 'e1');
        expect(e1.x).toBe(10);
        expect(e1.y).toBe(originTime + 10000);
    });

    it('should correctly shift rails and calculate displacement from Span facts', () => {
        const historyFacts = [
            { id: 'birth', sort: 1000, isBirth: true, record: { eventAge: 0, eventDate: "2000-01-01", eventTime: "12:00:00" } },
            { id: 'span1', sort: 2000, record: { eventAge: 10, eventIsSpan: true, eventSpanFromDate: "2000-01-01", eventSpanFromTime: "12:00:10", eventSpanToDate: "2000-01-01", eventSpanToTime: "12:00:20" } },
            { id: 'e2', sort: 3000, record: { eventAge: 20, eventDate: "2000-01-01", eventTime: "12:00:30" } }
        ];
        
        const state = getTemporalState(historyFacts, null, originTime);
        
        const e2 = state.nodes.find(n => n.id === 'e2');
        // Age 20: 10s after span arrival (noon+20s). Time = noon+30s.
        expect(e2.x).toBe(20);
        expect(e2.y).toBe(originTime + 30000);
        
        // Displacement: abs(20000 - 10000) = 10000ms
        expect(state.spanPool.consumed).toBe(10000);
    });
});
