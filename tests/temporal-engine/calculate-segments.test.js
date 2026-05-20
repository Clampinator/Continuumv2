import { describe, it, expect } from 'vitest';
import { calculateSegments } from '../../modules/temporal-engine/calculate-segments.js';

describe('calculateSegments', () => {
  it('should create a single segment for history with no spans', () => {
    const events = [
      { id: 'birth', x: 0, y: 946684800000, record: { eventIsSpan: false }, sort: 1000 },
      { id: 'e1', x: 100, y: 946684900000, record: { eventIsSpan: false }, sort: 2000 }
    ];
    
    const segments = calculateSegments(events, 946684800000);
    
    expect(segments).toHaveLength(1);
    expect(segments[0].startX).toBe(0);
    expect(segments[0].startY).toBe(946684800000);
    expect(segments[0].nodes).toHaveLength(2); // birth, e1
  });

  it('should create new segments when spans occur', () => {
    const events = [
      { id: 'birth', x: 0, y: 1000, record: { eventIsSpan: false }, sort: 1000 },
      { id: 'e1', x: 10, y: 2000, record: { eventIsSpan: false }, sort: 2000 },
      { id: 'span1', x: 20, y: 3000, arrivalY: 5000, record: { eventIsSpan: true }, sort: 3000 },
      { id: 'e2', x: 30, y: 6000, record: { eventIsSpan: false }, sort: 4000 }
    ];
    
    const segments = calculateSegments(events, 1000);
    
    expect(segments).toHaveLength(2);
    
    // Segment 1 starts at birth
    expect(segments[0].startX).toBe(0);
    expect(segments[0].startY).toBe(1000);
    expect(segments[0].nodes).toHaveLength(2); // birth, e1
    expect(segments[0].exitPoint.id).toBe('span1');
    
    // Segment 2 starts at span1 arrival
    expect(segments[1].startX).toBe(20);
    expect(segments[1].startY).toBe(5000);
    expect(segments[1].nodes).toHaveLength(1); // e2
  });

  it('should handle multiple consecutive spans', () => {
     const events = [
      { id: 'birth', x: 0, y: 1000, record: { eventIsSpan: false }, sort: 1000 },
      { id: 'span1', x: 10, y: 2000, arrivalY: 5000, record: { eventIsSpan: true }, sort: 2000 },
      { id: 'span2', x: 10, y: 5000, arrivalY: 10000, record: { eventIsSpan: true }, sort: 3000 },
      { id: 'e1', x: 20, y: 11000, record: { eventIsSpan: false }, sort: 4000 }
    ];
    
    const segments = calculateSegments(events, 1000);
    
    expect(segments).toHaveLength(3);
    expect(segments[1].startY).toBe(5000);
    expect(segments[2].startY).toBe(10000);
  });
});
