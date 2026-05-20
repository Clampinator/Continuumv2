import { describe, it, expect } from 'vitest';
import { establishHistoryPhysics } from '../../modules/temporal-kernel/establish-history-physics.js';

describe('establishHistoryPhysics', () => {
    const originTime = 946728000000; // 2000-01-01 12:00:00 UTC

    it('should establish physics for a simple sequence of facts', () => {
        const historyFacts = [
            { id: 'birth', sort: 1000, isBirth: true, record: { eventAge: 0, eventDate: "2000-01-01", eventTime: "12:00:00" } },
            { id: 'e1', sort: 2000, record: { eventAge: 10, eventDate: "2000-01-01", eventTime: "12:00:10" } }
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

    it('should position NOW node at originTime when objectiveNow is null', () => {
        // A brand new character has no objectiveNow set
        const historyFacts = [
            { id: 'birth', sort: 1000, isBirth: true, record: { eventAge: 0, eventDate: "2000-01-01", eventTime: "12:00:00" } },
            { id: 'now', sort: 999999999, isNow: true, record: { eventTitle: "NOW", eventIsSpan: false, objectiveNow: null } }
        ];

        const physicalNodes = establishHistoryPhysics(historyFacts, originTime);

        const birth = physicalNodes.find(n => n.id === 'birth');
        const nowNode = physicalNodes.find(n => n.id === 'now');

        // NOW should sit at the same coordinates as birth when objectiveNow is unset
        expect(nowNode.y).toBe(originTime);
        expect(nowNode.x).toBe(0);
        expect(nowNode.y).toBe(birth.y);
        expect(nowNode.x).toBe(birth.x);
    });

    it('should position NOW node at specified objectiveNow when set', () => {
        const objectiveNow = originTime + 31536000000; // 1 year later in ms
        const historyFacts = [
            { id: 'birth', sort: 1000, isBirth: true, record: { eventAge: 0, eventDate: "2000-01-01", eventTime: "12:00:00" } },
            { id: 'now', sort: 999999999, isNow: true, record: { eventTitle: "NOW", eventIsSpan: false, objectiveNow } }
        ];

        const physicalNodes = establishHistoryPhysics(historyFacts, originTime);
        const nowNode = physicalNodes.find(n => n.id === 'now');

        expect(nowNode.y).toBe(objectiveNow);
        expect(nowNode.x).toBeCloseTo(31536000, 0); // ~1 year in seconds
    });

    it('should correctly apply world-offset shifts from Spans', () => {
        const historyFacts = [
            { id: 'birth', sort: 1000, isBirth: true, record: { eventAge: 0, eventDate: "2000-01-01", eventTime: "12:00:00" } },
            // Span departs at age 10, arrives at noon + 20s (skipping 10s of world time)
            { id: 'span1', sort: 2000, record: { eventAge: 10, eventIsSpan: true, eventSpanFromDate: "2000-01-01", eventSpanFromTime: "12:00:10", eventSpanToDate: "2000-01-01", eventSpanToTime: "12:00:20" } },
            // Event occurs at age 15 (5s after span arrival)
            { id: 'e2', sort: 3000, record: { eventAge: 15, eventDate: "2000-01-01", eventTime: "12:00:25" } }
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

    it('should propagate isRest flag to physics nodes', () => {
        const historyFacts = [
            { id: 'birth', sort: 1000, isBirth: true, record: { eventAge: 0, eventDate: "2000-01-01", eventTime: "12:00:00" } },
            { id: 'e1', sort: 2000, record: { eventAge: 10, eventDate: "2000-01-01", eventTime: "12:00:10", eventIsRest: true } },
            { id: 'e2', sort: 3000, record: { eventAge: 20, eventDate: "2000-01-01", eventTime: "12:00:20" } }
        ];

        const physicalNodes = establishHistoryPhysics(historyFacts, originTime);

        const restNode = physicalNodes.find(n => n.id === 'e1');
        expect(restNode.isRest).toBe(true);
        expect(restNode.isSpanOrigin).toBe(false);

        const levelNode = physicalNodes.find(n => n.id === 'e2');
        expect(levelNode.isRest).toBe(false);
    });

    it('should propagate isRestEnd flag to physics nodes', () => {
        const historyFacts = [
            { id: 'birth', sort: 1000, isBirth: true, record: { eventAge: 0, eventDate: "2000-01-01", eventTime: "12:00:00" } },
            { id: 'rest1', sort: 2000, record: { eventAge: 10, eventIsRest: true, eventDate: "2000-01-01", eventTime: "12:00:10" } },
            { id: 'rest1-end', sort: 2500, record: { eventAge: 86410, isRestEnd: true, eventDate: "2000-01-02", eventTime: "12:00:10" } }
        ];

        const physicalNodes = establishHistoryPhysics(historyFacts, originTime);

        const restNode = physicalNodes.find(n => n.id === 'rest1');
        expect(restNode.isRest).toBe(true);

        const restEndNode = physicalNodes.find(n => n.id === 'rest1-end');
        expect(restEndNode.isRestEnd).toBe(true);
        expect(restEndNode.isRest).toBe(false);
    });

    it('should not set isRest when eventIsSpan is true', () => {
        const historyFacts = [
            { id: 'birth', sort: 1000, isBirth: true, record: { eventAge: 0, eventDate: "2000-01-01", eventTime: "12:00:00" } },
            { id: 'span1', sort: 2000, record: { eventAge: 10, eventIsSpan: true, eventIsRest: true, eventDate: "2000-01-01", eventSpanFromDate: "2000-01-01", eventSpanFromTime: "12:00:10", eventSpanToDate: "2000-01-01", eventSpanToTime: "12:00:20" } }
        ];

        const physicalNodes = establishHistoryPhysics(historyFacts, originTime);

        const spanNode = physicalNodes.find(n => n.id === 'span1');
        // Span events cannot be rest events - isRest must be false
        expect(spanNode.isRest).toBe(false);
        expect(spanNode.isSpanOrigin).toBe(true);
    });
});
