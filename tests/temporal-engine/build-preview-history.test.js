import { describe, it, expect } from 'vitest';
import { buildPreviewHistory } from '../../modules/temporal-engine/build-preview-history.js';

describe('Build Preview History', () => {
  it('should inject a virtual span fact at the insertion sort position', () => {
    const history = [
      { id: 'evt-1', sort: 100, isNow: false, record: { eventTitle: 'Event 1', eventIsSpan: false, ts: 1000, eventAge: 10 } },
      { id: 'evt-2', sort: 200, isNow: false, record: { eventTitle: 'Event 2', eventIsSpan: false, ts: 2000, eventAge: 20 } },
      { id: 'now', sort: 999999999, isNow: true, record: { eventTitle: 'NOW', objectiveNow: 3000 } }
    ];

    const insertionContext = {
      departureAge: 15,
      departureTime: 1500,
      insertionSort: 150
    };

    const displacementResult = {
      departureAge: 15,
      departureTime: 1500,
      arrivalTime: 2500,
      displacement: 1000,
      isUpSpan: true,
      isDownSpan: false,
      nextEventFloor: null
    };

    const result = buildPreviewHistory(history, insertionContext, displacementResult);

    // Should contain the virtual span
    const virtualSpan = result.find(n => n.id === 'preview-insert-span');
    expect(virtualSpan).toBeDefined();
    expect(virtualSpan.sort).toBe(150);
    expect(virtualSpan.record.eventIsSpan).toBe(true);
    expect(virtualSpan.record.ts).toBe(1500);
    expect(virtualSpan.record.arrivalTs).toBe(2500);
    expect(virtualSpan.record.eventAge).toBe(15);

    // Should contain original events
    expect(result.find(n => n.id === 'evt-1')).toBeDefined();
    expect(result.find(n => n.id === 'evt-2')).toBeDefined();

    // NOW should remain at the end
    expect(result[result.length - 1].id).toBe('now');
  });

  it('should sort virtual span by insertion sort value', () => {
    const history = [
      { id: 'evt-1', sort: 100, isNow: false, record: { eventIsSpan: false, ts: 1000, eventAge: 10 } },
      { id: 'evt-2', sort: 200, isNow: false, record: { eventIsSpan: false, ts: 2000, eventAge: 20 } },
      { id: 'now', sort: 999999999, isNow: true, record: { objectiveNow: 3000 } }
    ];

    const result = buildPreviewHistory(history, {
      departureAge: 15, departureTime: 1500, insertionSort: 150
    }, {
      arrivalTime: 2500, displacement: 1000, departureAge: 15, departureTime: 1500,
      isUpSpan: true, isDownSpan: false, nextEventFloor: null
    });

    // Virtual span should sort between evt-1 (100) and evt-2 (200)
    const nonNow = result.filter(n => !n.isNow);
    expect(nonNow[0].id).toBe('evt-1');
    expect(nonNow[1].id).toBe('preview-insert-span');
    expect(nonNow[2].id).toBe('evt-2');
  });

  it('should return original history when no insertion context', () => {
    const history = [{ id: 'a', sort: 1, isNow: false, record: {} }];
    const result = buildPreviewHistory(history, null, null);
    expect(result).toBe(history);
  });

  it('should handle displacement result without floor constraint', () => {
    const history = [
      { id: 'evt-1', sort: 100, isNow: false, record: { eventIsSpan: false, ts: 1000, eventAge: 10 } },
      { id: 'now', sort: 999999999, isNow: true, record: { objectiveNow: 2000 } }
    ];

    const result = buildPreviewHistory(history, {
      departureAge: 5, departureTime: 500, insertionSort: 50
    }, {
      arrivalTime: 1500, displacement: 1000, departureAge: 5, departureTime: 500,
      isUpSpan: true, isDownSpan: false, nextEventFloor: null
    });

    const virtualSpan = result.find(n => n.id === 'preview-insert-span');
    expect(virtualSpan).toBeDefined();
    expect(virtualSpan.record.arrivalTs).toBe(1500);
  });
});