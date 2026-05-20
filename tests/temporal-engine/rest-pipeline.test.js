import { describe, it, expect } from 'vitest';
import { getTemporalState } from '../../modules/temporal-engine/get-temporal-state.js';

describe('getTemporalState: Rest Events Through Engine Pipeline', () => {
    const originTime = 946728000000; // 2000-01-01 12:00:00 UTC

    it('should preserve isRest on rest events through the full engine pipeline', () => {
        const historyFacts = [
            { id: 'birth', sort: 1000, isBirth: true, record: { eventAge: 0, eventDate: "2000-01-01", eventTime: "12:00:00" } },
            { id: 'rest1', sort: 2000, record: { eventAge: 86400, eventDate: "2001-01-01", eventTime: "12:00:00", eventIsRest: true, eventIsSpan: false } },
            { id: 'restend1', sort: 3000, record: { eventAge: 172800, eventDate: "2001-01-02", eventTime: "12:00:00", eventIsSpan: false, isRestEnd: true } }
        ];

        const state = getTemporalState(historyFacts, null, originTime);

        // Rest event should have isRest = true
        const restNode = state.nodes.find(n => n.id === 'rest1');
        expect(restNode).toBeDefined();
        expect(restNode.isRest).toBe(true);

        // Rest-end event should have isRestEnd = true
        const restEndNode = state.nodes.find(n => n.id === 'restend1');
        expect(restEndNode).toBeDefined();
        expect(restEndNode.isRestEnd).toBe(true);
    });

    it('should contain rest nodes in the correct segment for manifest generation', () => {
        const historyFacts = [
            { id: 'birth', sort: 1000, isBirth: true, record: { eventAge: 0, eventDate: "2000-01-01", eventTime: "12:00:00" } },
            { id: 'rest1', sort: 2000, record: { eventAge: 86400, eventDate: "2001-01-01", eventTime: "12:00:00", eventIsRest: true, eventIsSpan: false } },
            { id: 'restend1', sort: 3000, record: { eventAge: 172800, eventDate: "2001-01-02", eventTime: "12:00:00", eventIsSpan: false, isRestEnd: true } }
        ];

        const state = getTemporalState(historyFacts, null, originTime);

        // The segment should contain the rest node
        const segment = state.segments[0];
        expect(segment).toBeDefined();

        const restInSeg = segment.nodes.find(n => n.id === 'rest1');
        expect(restInSeg).toBeDefined();
        expect(restInSeg.isRest).toBe(true);
    });
});