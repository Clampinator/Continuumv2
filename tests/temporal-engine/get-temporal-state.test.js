import { describe, it, expect } from 'vitest';
import { getTemporalState } from '../../modules/temporal-engine/get-temporal-state.js';

describe('getTemporalState', () => {
  it('should calculate the full state of a simple lifeline', () => {
    const events = [
      { id: 'birth', age: 0, time: 1000, sort: 1000 },
      { id: 'e1', age: 10, sort: 2000 }
    ];
    
    const state = getTemporalState(events);
    
    expect(state.segments).toHaveLength(1);
    expect(state.events).toHaveLength(2);
    expect(state.events[1].projectedTime).toBe(11000);
    expect(state.spanPool.total).toBe(0);
  });

  it('should calculate span pool consumption', () => {
     const events = [
      { id: 'birth', age: 0, time: 0, sort: 1000 },
      { id: 'span1', age: 10, arrivalTime: 5000, isSpan: true, sort: 2000 }
    ];
    
    const state = getTemporalState(events);
    
    // Displacement = 5000 - (0 + 10*1000) = -5000ms
    // Span cost is often absolute displacement or lore-specific. 
    // For now, let's assume it reports the absolute ms shifted.
    expect(state.spanPool.consumed).toBe(5000);
  });
});
