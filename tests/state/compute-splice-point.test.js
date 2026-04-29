import { describe, it, expect } from 'vitest';
import { computeSplicePoint } from '../../modules/state/compute-splice-point.js';

describe('computeSplicePoint', () => {
  const originTime = new Date(2000, 0, 1).getTime();

  function makeNodes(ages, originTimeMs) {
    return ages.map((age, i) => ({
      id: `evt-${i}`,
      x: age,
      y: originTimeMs + (age * 1000),
      sort: (i + 1) * 1000,
      record: { eventTitle: `Event ${i}`, eventIsSpan: false }
    }));
  }

  it('should project departure time onto the level rail', () => {
    const nodes = makeNodes([5, 10, 20, 30], originTime);
    const snapWorld = { eventAge: 12, eventTime: originTime + 12000 };

    const result = computeSplicePoint(snapWorld, nodes, originTime);

    // Departure age should match the snap position
    expect(result.departureAge).toBe(12);
    // Departure time should be rail-projected (on the diagonal from birth)
    expect(result.departureTime).toBe(originTime + 12000);
  });

  it('should find the next event after departure age for floor constraint', () => {
    const nodes = makeNodes([5, 10, 20, 30], originTime);
    const snapWorld = { eventAge: 12, eventTime: originTime + 12000 };

    const result = computeSplicePoint(snapWorld, nodes, originTime);

    // Next event after age 12 is at age 20
    expect(result.nextEventTime).toBe(originTime + 20000);
    expect(result.afterNode.age).toBe(20);
  });

  it('should return null nextEventTime when no events after departure', () => {
    const nodes = makeNodes([5, 10], originTime);
    const snapWorld = { eventAge: 50, eventTime: originTime + 50000 };

    const result = computeSplicePoint(snapWorld, nodes, originTime);

    expect(result.nextEventTime).toBeNull();
    expect(result.afterNode).toBeNull();
  });

  it('should compute insertion sort between before and after events', () => {
    const nodes = makeNodes([5, 10, 20, 30], originTime);
    const snapWorld = { eventAge: 12, eventTime: originTime + 12000 };

    const result = computeSplicePoint(snapWorld, nodes, originTime);

    // Sort should be between before (age 10, sort 2000) and after (age 20, sort 3000)
    expect(result.insertionSort).toBe((2000 + 3000) / 2);
  });

  it('should identify before and after nodes correctly', () => {
    const nodes = makeNodes([5, 10, 20, 30], originTime);
    const snapWorld = { eventAge: 15, eventTime: originTime + 15000 };

    const result = computeSplicePoint(snapWorld, nodes, originTime);

    expect(result.beforeNode.age).toBe(10);
    expect(result.afterNode.age).toBe(20);
  });

  it('should expose isSpanOrigin on beforeNode when predecessor is a span', () => {
    const nodes = [
      { id: 'level1', x: 5, y: originTime + 5000, sort: 1000, record: { eventTitle: 'Level', eventIsSpan: false } },
      { id: 'span1', x: 10, y: originTime + 10000, arrivalY: originTime + 15000, sort: 2000, isSpanOrigin: true, record: { eventTitle: 'Span', eventIsSpan: true } },
      { id: 'level2', x: 20, y: originTime + 20000, sort: 3000, record: { eventTitle: 'Level', eventIsSpan: false } }
    ];
    // Click on the level rail AFTER the span (age 15, between span1 and level2)
    const snapWorld = { eventAge: 15, eventTime: originTime + 17000 };

    const result = computeSplicePoint(snapWorld, nodes, originTime);

    // beforeNode is span1 - must expose isSpanOrigin
    expect(result.beforeNode.id).toBe('span1');
    expect(result.beforeNode.isSpanOrigin).toBe(true);
  });

  it('should expose isSpanOrigin=false on beforeNode when predecessor is a level event', () => {
    const nodes = makeNodes([5, 10, 20, 30], originTime);
    const snapWorld = { eventAge: 15, eventTime: originTime + 15000 };

    const result = computeSplicePoint(snapWorld, nodes, originTime);

    // beforeNode is a level event - isSpanOrigin must be false
    expect(result.beforeNode.isSpanOrigin).toBe(false);
  });
});