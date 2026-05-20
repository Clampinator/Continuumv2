import { describe, it, expect } from 'vitest';
import { insertEvent } from '../../modules/temporal-engine/commands/insert-event.js';
import { insertSpan } from '../../modules/temporal-engine/commands/insert-span.js';
import { getTemporalState } from '../../modules/temporal-engine/get-temporal-state.js';

describe('Temporal Engine Resilience', () => {
  it('should handle an event inserted into a span-shifted timeline', () => {
    // 1. Initial State
    let history = [
        { id: 'birth', x: 0, y: 0, sort: 1000, isBirth: true, record: { eventTitle: "Birth", eventDate: "1970-01-01", eventTime: "00:00:00" } }
    ];

    // 2. Insert Span (40s jump at age 10)
    // Departure at age 10 = 10000ms (1970-01-01T00:00:10Z)
    // Arrival at 50000ms (1970-01-01T00:00:50Z)
    history = insertSpan(history, { 
        id: 'span1', x: 10, y: 10000, arrivalY: 50000, 
        record: { eventIsSpan: true, eventTitle: "Span 1", eventDate: "1970-01-01", eventTime: "00:00:10", eventSpanFromDate: "1970-01-01", eventSpanFromTime: "00:00:10", eventSpanToDate: "1970-01-01", eventSpanToTime: "00:00:50" }, 
        sort: 2000 
    });

    // 3. Insert Level Event at age 15 (Inside the shifted zone)
    // It should be projected onto the new rail: 50000 + (15-10)*1000 = 55000ms
    history = insertEvent(history, { 
        id: 'e1', x: 15, y: 55000, 
        record: { eventTitle: "E1", eventDate: "1970-01-01", eventTime: "00:00:55" }, 
        sort: 3000 
    });
    
    const state = getTemporalState(history, null, 0);
    const e1 = state.nodes.find(e => e.id === 'e1');
    
    expect(e1.y).toBe(55000);
  });

  it('should handle nested span insertions (Span inside Span)', () => {
    let history = [
        { id: 'birth', x: 0, y: 0, sort: 1000, isBirth: true, record: { eventTitle: "Birth", eventDate: "1970-01-01", eventTime: "00:00:00" } }
    ];

    // Jump 1: 40s jump at age 10. Arrival: 50000.
    history = insertSpan(history, { 
        id: 'span1', x: 10, y: 10000, arrivalY: 50000, 
        record: { eventIsSpan: true, eventTitle: "S1", eventDate: "1970-01-01", eventTime: "00:00:10", eventSpanFromDate: "1970-01-01", eventSpanFromTime: "00:00:10", eventSpanToDate: "1970-01-01", eventSpanToTime: "00:00:50" }, 
        sort: 2000 
    });

    // Jump 2: 45s jump at age 15. 
    // Departure (on Jump 1 rail): 50000 + 5*1000 = 55000.
    // Let's arrive at 100000. 
    history = insertSpan(history, { 
        id: 'span2', x: 15, y: 55000, arrivalY: 100000, 
        record: { eventIsSpan: true, eventTitle: "S2", eventDate: "1970-01-01", eventTime: "00:00:55", eventSpanFromDate: "1970-01-01", eventSpanFromTime: "00:00:55", eventSpanToDate: "1970-01-01", eventSpanToTime: "00:01:40" }, 
        sort: 3000 
    });

    // Level Event at age 20 (on Jump 2 rail)
    // Expected: 100000 + (20-15)*1000 = 105000
    history = insertEvent(history, { 
        id: 'e2', x: 20, y: 105000, 
        record: { eventTitle: "E2", eventDate: "1970-01-01", eventTime: "00:01:45" }, 
        sort: 4000 
    });

    const state = getTemporalState(history, null, 0);
    const e2 = state.nodes.find(e => e.id === 'e2');
    
    expect(e2.y).toBe(105000);
    // Total Consumed: |50000-10000| + |100000-55000| = 40000 + 45000 = 85000
    expect(state.spanPool.consumed).toBe(85000);
  });
});
