import { describe, it, expect } from 'vitest';
import { resolveTimestamps } from '../../modules/temporal-engine/resolve-timestamps.js';

describe('resolveTimestamps', () => {
    const originTime = 946728000000; // 2000-01-01 12:00:00 UTC

    it('should leave nodes with existing y values unchanged', () => {
        const nodes = [
            { id: 'e1', isNow: false, eventIsSpan: false, y: originTime + 10000, arrivalY: 0, record: { eventDate: '2000-01-02' } }
        ];
        resolveTimestamps(nodes, originTime, null);
        expect(nodes[0].y).toBe(originTime + 10000);
    });

    it('should resolve null y from raw date fields for level events', () => {
        const nodes = [
            { id: 'e1', isNow: false, eventIsSpan: false, y: null, arrivalY: null,
              rawDate: '2000-01-02', rawTime: '12:00:00', rawArrivalDate: null, rawArrivalTime: null,
              record: { eventDate: '2000-01-02', eventTime: '12:00:00' } }
        ];
        resolveTimestamps(nodes, originTime, null);
        // y should be resolved to the timestamp of 2000-01-02T12:00:00 UTC
        expect(nodes[0].y).not.toBeNull();
        expect(nodes[0].y).toBeGreaterThan(0);
        // Non-span arrivalY should be 0
        expect(nodes[0].arrivalY).toBe(0);
        // Raw fields should be removed
        expect(nodes[0].rawDate).toBeUndefined();
        expect(nodes[0].rawTime).toBeUndefined();
    });

    it('should resolve null arrivalY from raw arrival fields for span events', () => {
        const nodes = [
            { id: 'span1', isNow: false, eventIsSpan: true, y: originTime + 5000, arrivalY: null,
              rawDate: '2000-01-01', rawTime: '12:00:05', rawArrivalDate: '2000-01-01', rawArrivalTime: '12:00:15',
              record: { eventSpanFromDate: '2000-01-01', eventSpanFromTime: '12:00:05', eventSpanToDate: '2000-01-01', eventSpanToTime: '12:00:15', eventIsSpan: true } }
        ];
        resolveTimestamps(nodes, originTime, null);
        // Both y and arrivalY should be resolved
        expect(nodes[0].arrivalY).not.toBeNull();
        // arrival should be later than departure for an upward span
        expect(nodes[0].arrivalY).toBeGreaterThan(nodes[0].y);
        // Raw fields removed
        expect(nodes[0].rawArrivalDate).toBeUndefined();
        expect(nodes[0].rawArrivalTime).toBeUndefined();
    });

    it('should use span date fields for span events', () => {
        const nodes = [
            { id: 'span1', isNow: false, eventIsSpan: true, y: null, arrivalY: null,
              rawDate: '2000-01-01', rawTime: '12:00:05', rawArrivalDate: '2000-01-01', rawArrivalTime: '12:00:15',
              record: { eventSpanFromDate: '2000-01-01', eventSpanFromTime: '12:00:05', eventSpanToDate: '2000-01-01', eventSpanToTime: '12:00:15', eventIsSpan: true } }
        ];
        resolveTimestamps(nodes, originTime, null);
        // Span events use eventSpanFromDate/eventSpanFromTime for departure
        expect(nodes[0].y).not.toBeNull();
        expect(nodes[0].arrivalY).not.toBeNull();
    });

    it('should skip NOW nodes', () => {
        const nodes = [
            { id: 'now', isNow: true, y: null, arrivalY: null,
              rawDate: null, rawTime: null, rawArrivalDate: null, rawArrivalTime: null,
              record: {} }
        ];
        resolveTimestamps(nodes, originTime, null);
        expect(nodes[0].y).toBeNull();
        expect(nodes[0].arrivalY).toBeNull();
        // Raw fields should NOT be removed for NOW nodes
        expect(nodes[0].rawDate).toBeNull();
    });

    it('should handle empty nodes array', () => {
        const result = resolveTimestamps([], originTime, null);
        expect(result).toEqual([]);
    });

    it('should handle null nodes', () => {
        const result = resolveTimestamps(null, originTime, null);
        expect(result).toBeNull();
    });

    it('should fall back to originTime when no date is available', () => {
        const nodes = [
            { id: 'e1', isNow: false, eventIsSpan: false, y: null, arrivalY: null,
              rawDate: null, rawTime: null, rawArrivalDate: null, rawArrivalTime: null,
              record: {} }
        ];
        resolveTimestamps(nodes, originTime, null);
        expect(nodes[0].y).toBe(originTime);
    });
});