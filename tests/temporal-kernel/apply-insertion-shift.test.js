import { describe, it, expect } from 'vitest';
import { applyInsertionShift } from '../../modules/temporal-kernel/apply-insertion-shift.js';

describe('applyInsertionShift', () => {
  // Birth timestamp: Jan 1, 2000
  const originTime = new Date(2000, 0, 1).getTime();

  function makeHistory(ages, originTimeMs) {
    return ages.map((age, i) => ({
      id: `evt-${i}`,
      x: age,
      y: originTimeMs + (age * 1000),
      sort: (i + 1) * 1000,
      record: { eventTitle: `Event ${i}` }
    }));
  }

  it('should shift all events after the insertion age by displacement', () => {
    const history = makeHistory([5, 10, 15, 20], originTime);
    const displacement = 5000000; // 5 million ms forward

    const result = applyInsertionShift(history, 10, displacement);

    // Events at age 5 and 10: unchanged
    expect(result[0].y).toBe(originTime + 5000);
    expect(result[1].y).toBe(originTime + 10000);
    // Events at age 15 and 20: shifted by displacement
    expect(result[2].y).toBe(originTime + 15000 + displacement);
    expect(result[3].y).toBe(originTime + 20000 + displacement);
  });

  it('should shift arrival times for span events after insertion', () => {
    const history = [
      { id: 'e1', x: 5, y: originTime + 5000, sort: 1000, record: {} },
      { id: 'e2', x: 10, y: originTime + 10000, sort: 2000, arrivalY: originTime + 20000, record: { eventIsSpan: true } },
      { id: 'e3', x: 15, y: originTime + 15000, sort: 3000, record: {} }
    ];
    const displacement = 3000000;

    const result = applyInsertionShift(history, 12, displacement);

    // e1 (age 5): unchanged
    expect(result[0].y).toBe(originTime + 5000);
    // e2 (age 10): unchanged (before insertion at age 12)
    expect(result[1].y).toBe(originTime + 10000);
    expect(result[1].arrivalY).toBe(originTime + 20000); // not shifted (before splice)
    // e3 (age 15): shifted
    expect(result[2].y).toBe(originTime + 15000 + displacement);
  });

  it('should not modify any nodes when displacement is zero', () => {
    const history = makeHistory([5, 10, 15], originTime);

    const result = applyInsertionShift(history, 10, 0);

    expect(result).toEqual(history);
  });

  it('should return unchanged history when no events are after insertion age', () => {
    const history = makeHistory([5, 8, 10], originTime);
    const displacement = 5000000;

    const result = applyInsertionShift(history, 15, displacement);

    // All events are before age 15; none shifted
    expect(result[0].y).toBe(originTime + 5000);
    expect(result[1].y).toBe(originTime + 8000);
    expect(result[2].y).toBe(originTime + 10000);
  });

  it('should handle negative displacement (down-span shifting events forward)', () => {
    const history = makeHistory([5, 10, 15, 20], originTime);
    const displacement = -3000000;

    const result = applyInsertionShift(history, 10, displacement);

    // Events at age 5 and 10: unchanged
    expect(result[0].y).toBe(originTime + 5000);
    expect(result[1].y).toBe(originTime + 10000);
    // Events at age 15 and 20: shifted by negative displacement
    expect(result[2].y).toBe(originTime + 15000 + displacement);
    expect(result[3].y).toBe(originTime + 20000 + displacement);
  });

  it('should return same array when history is empty', () => {
    const result = applyInsertionShift([], 10, 5000);
    expect(result).toEqual([]);
  });

  it('should shift arrivalY for span nodes after insertion', () => {
    const history = [
      { id: 'e1', x: 5, y: originTime + 5000, sort: 1000, record: {} },
      { id: 'e2', x: 15, y: originTime + 15000, arrivalY: originTime + 25000, sort: 2000, record: { eventIsSpan: true } },
      { id: 'e3', x: 20, y: originTime + 25000, sort: 3000, record: {} }
    ];
    const displacement = 10000000;

    const result = applyInsertionShift(history, 10, displacement);

    // e2 (age 15, span event after insertion): both y and arrivalY shifted
    expect(result[1].y).toBe(originTime + 15000 + displacement);
    expect(result[1].arrivalY).toBe(originTime + 25000 + displacement);
    // e3 (age 20): also shifted by displacement
    expect(result[2].y).toBe(originTime + 25000 + displacement);
  });
});