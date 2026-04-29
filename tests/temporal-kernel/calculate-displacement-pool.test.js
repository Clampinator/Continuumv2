import { describe, it, expect } from 'vitest';
import { calculateDisplacementPool } from '../../modules/temporal-kernel/calculate-displacement-pool.js';

describe('calculateDisplacementPool', () => {
  it('should return 0 for empty array', () => {
    expect(calculateDisplacementPool([])).toBe(0);
  });

  it('should return 0 for null input', () => {
    expect(calculateDisplacementPool(null)).toBe(0);
  });

  it('should return 0 for nodes with no spans', () => {
    const nodes = [
      { y: 1000, arrivalY: 1000, isSpanOrigin: false, record: { eventIsSpan: false } },
      { y: 2000, arrivalY: 2000, isSpanOrigin: false, record: { eventIsSpan: false } }
    ];
    expect(calculateDisplacementPool(nodes)).toBe(0);
  });

  it('should sum displacements of span nodes from the end', () => {
    const nodes = [
      { y: 1000, arrivalY: 1000, isSpanOrigin: false, record: { eventIsSpan: false } },
      { y: 2000, arrivalY: 5000, isSpanOrigin: true, record: { eventIsSpan: true } },
      { y: 5000, arrivalY: 5000, isSpanOrigin: false, record: { eventIsSpan: false } }
    ];
    // Walking backward: level(5000) -> span(displacement = |5000 - 2000| = 3000) -> stop
    expect(calculateDisplacementPool(nodes)).toBe(3000);
  });

  it('should stop accumulating at rest events', () => {
    const nodes = [
      { y: 1000, arrivalY: 1000, isSpanOrigin: false, record: { eventIsRest: true } },
      { y: 2000, arrivalY: 5000, isSpanOrigin: true, record: { eventIsSpan: true } },
      { y: 5000, arrivalY: 5000, isSpanOrigin: false, record: { eventIsSpan: false } }
    ];
    // Walking backward: level -> span(3000) -> rest(stop, don't count rest or anything before)
    expect(calculateDisplacementPool(nodes)).toBe(3000);
  });

  it('should accumulate multiple spans until rest', () => {
    const nodes = [
      { y: 1000, arrivalY: 1000, isSpanOrigin: false, record: { eventIsRest: true } },
      { y: 2000, arrivalY: 5000, isSpanOrigin: true, record: { eventIsSpan: true } },
      { y: 5000, arrivalY: 8000, isSpanOrigin: true, record: { eventIsSpan: true } },
      { y: 8000, arrivalY: 8000, isSpanOrigin: false, record: { eventIsSpan: false } }
    ];
    // Walking backward: level -> span(|8000-5000|=3000) -> span(|5000-2000|=3000) -> rest(stop)
    // Pool = 3000 + 3000 = 6000
    expect(calculateDisplacementPool(nodes)).toBe(6000);
  });

  it('should stop at rest via eventIsRest on record', () => {
    const nodes = [
      { y: 1000, arrivalY: 1000, isSpanOrigin: false, record: { eventIsRest: true, eventIsSpan: false } },
      { y: 2000, arrivalY: 5000, isSpanOrigin: true, record: { eventIsSpan: true } }
    ];
    expect(calculateDisplacementPool(nodes)).toBe(3000);
  });

  it('should stop at rest via eventIsRest on node', () => {
    const nodes = [
      { y: 1000, arrivalY: 1000, isSpanOrigin: false, eventIsRest: true, record: { eventIsSpan: false } },
      { y: 2000, arrivalY: 5000, isSpanOrigin: true, record: { eventIsSpan: true } }
    ];
    expect(calculateDisplacementPool(nodes)).toBe(3000);
  });

  it('should handle down-spans (arrival before departure) with Math.abs', () => {
    const nodes = [
      { y: 5000, arrivalY: 2000, isSpanOrigin: true, record: { eventIsSpan: true } },
      { y: 2000, arrivalY: 2000, isSpanOrigin: false, record: { eventIsSpan: false } }
    ];
    // Down-span: |2000 - 5000| = 3000
    expect(calculateDisplacementPool(nodes)).toBe(3000);
  });
});