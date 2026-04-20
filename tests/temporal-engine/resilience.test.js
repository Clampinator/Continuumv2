import { describe, it, expect } from 'vitest';
import { insertEvent } from '../../modules/temporal-engine/commands/insert-event.js';
import { insertSpan } from '../../modules/temporal-engine/commands/insert-span.js';
import { getTemporalState } from '../../modules/temporal-engine/get-temporal-state.js';

describe('Temporal Engine Resilience', () => {
  it('should handle an event inserted into a span-shifted timeline', () => {
    // 1. Initial State
    let history = [
        { id: 'birth', age: 0, time: 0, sort: 1000 }
    ];

    // 2. Insert Span (10s jump at age 10)
    // Displacement = 50000 - (0 + 10*1000) = 40000ms
    history = insertSpan(history, { id: 'span1', age: 10, arrivalTime: 50000, isSpan: true });

    // 3. Insert Level Event at age 15 (Inside the shifted zone)
    // It should be projected onto the new rail: 50000 + (15-10)*1000 = 55000ms
    history = insertEvent(history, { id: 'e1', age: 15 });
    
    const state = getTemporalState(history);
    const e1 = state.events.find(e => e.id === 'e1');
    
    expect(e1.projectedTime).toBe(55000);
  });

  it('should handle nested span insertions (Span inside Span)', () => {
    let history = [
        { id: 'birth', age: 0, time: 0, sort: 1000 }
    ];

    // Jump 1: 10s jump at age 10. Arrival: 50000.
    history = insertSpan(history, { id: 'span1', age: 10, arrivalTime: 50000, isSpan: true });

    // Jump 2: 5s jump at age 15. 
    // Departure (on Jump 1 rail): 50000 + 5*1000 = 55000.
    // Let's arrive at 100000. 
    // New displacement = 100000 - 55000 = 45000.
    history = insertSpan(history, { id: 'span2', age: 15, arrivalTime: 100000, isSpan: true });

    // Level Event at age 20 (on Jump 2 rail)
    // Expected: 100000 + (20-15)*1000 = 105000
    history = insertEvent(history, { id: 'e2', age: 20 });

    const state = getTemporalState(history);
    const e2 = state.events.find(e => e.id === 'e2');
    
    expect(e2.projectedTime).toBe(105000);
    // Total Consumed: |50000-10000| + |100000-55000| = 40000 + 45000 = 85000
    expect(state.spanPool.consumed).toBe(85000);
  });
});
