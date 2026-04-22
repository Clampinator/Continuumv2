import { describe, it, expect } from 'vitest';
import { calculateSegments } from '../../modules/temporal-engine/calculate-segments.js';

describe('calculateSegments', () => {
  it('should create a single segment for history with no spans', () => {
    const events = [
      { id: 'birth', age: 0, date: '2000-01-01', time: 946684800000, isSpan: false },
      { id: 'e1', age: 100, isSpan: false }
    ];
    
    const segments = calculateSegments(events);
    
    expect(segments).toHaveLength(1);
    expect(segments[0].startAge).toBe(0);
    expect(segments[0].startTime).toBe(946684800000);
    expect(segments[0].events).toHaveLength(2);
  });

  it('should create new segments when spans occur', () => {
    const events = [
      { id: 'birth', age: 0, time: 1000, isSpan: false },
      { id: 'e1', age: 10, isSpan: false },
      { id: 'span1', age: 20, arrivalTime: 5000, isSpan: true },
      { id: 'e2', age: 30, isSpan: false }
    ];
    
    const segments = calculateSegments(events);
    
    expect(segments).toHaveLength(2);
    
    // Segment 1 starts at birth
    expect(segments[0].startAge).toBe(0);
    expect(segments[0].startTime).toBe(1000);
    expect(segments[0].events).toHaveLength(2); // birth, e1 (span1 is exitPoint)
    expect(segments[0].exitPoint.id).toBe('span1');
    
    // Segment 2 starts at span1 arrival
    expect(segments[1].startAge).toBe(20);
    expect(segments[1].startTime).toBe(5000);
    expect(segments[1].events).toHaveLength(1); // e2
  });

  it('should handle multiple consecutive spans', () => {
     const events = [
      { id: 'birth', age: 0, time: 1000, isSpan: false },
      { id: 'span1', age: 10, arrivalTime: 5000, isSpan: true },
      { id: 'span2', age: 10, arrivalTime: 10000, isSpan: true },
      { id: 'e1', age: 20, isSpan: false }
    ];
    
    const segments = calculateSegments(events);
    
    expect(segments).toHaveLength(3);
    expect(segments[1].startTime).toBe(5000);
    expect(segments[2].startTime).toBe(10000);
  });
});
