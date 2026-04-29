import { describe, it, expect } from 'vitest';
import { findSpliceNeighbors, computeSpliceSort } from '../../modules/temporal-kernel/compute-splice-sort.js';

describe('findSpliceNeighbors', () => {
  it('should return nulls for empty array', () => {
    const result = findSpliceNeighbors(5, []);
    expect(result.beforeNode).toBeNull();
    expect(result.afterNode).toBeNull();
  });

  it('should return nulls for null input', () => {
    const result = findSpliceNeighbors(5, null);
    expect(result.beforeNode).toBeNull();
    expect(result.afterNode).toBeNull();
  });

  it('should find before node when target age matches', () => {
    const nodes = [
      { x: 3, sort: 1000 },
      { x: 7, sort: 2000 }
    ];
    const result = findSpliceNeighbors(3, nodes);
    expect(result.beforeNode.x).toBe(3);
    expect(result.afterNode.x).toBe(7);
  });

  it('should find before and after nodes', () => {
    const nodes = [
      { x: 1, sort: 1000 },
      { x: 5, sort: 2000 },
      { x: 10, sort: 3000 }
    ];
    const result = findSpliceNeighbors(4, nodes);
    expect(result.beforeNode.x).toBe(1);
    expect(result.afterNode.x).toBe(5);
  });

  it('should find only after when target is before all nodes', () => {
    const nodes = [
      { x: 5, sort: 1000 },
      { x: 10, sort: 2000 }
    ];
    const result = findSpliceNeighbors(2, nodes);
    expect(result.beforeNode).toBeNull();
    expect(result.afterNode.x).toBe(5);
  });

  it('should find only before when target is after all nodes', () => {
    const nodes = [
      { x: 5, sort: 1000 },
      { x: 10, sort: 2000 }
    ];
    const result = findSpliceNeighbors(15, nodes);
    expect(result.beforeNode.x).toBe(10);
    expect(result.afterNode).toBeNull();
  });

  it('should sort nodes by x then sort before scanning', () => {
    const nodes = [
      { x: 10, sort: 3000 },
      { x: 1, sort: 1000 },
      { x: 5, sort: 2000 }
    ];
    const result = findSpliceNeighbors(4, nodes);
    expect(result.beforeNode.x).toBe(1);
    expect(result.afterNode.x).toBe(5);
  });
});

describe('computeSpliceSort', () => {
  it('should compute midpoint between before and after', () => {
    expect(computeSpliceSort(1000, 2000)).toBe(1500);
  });

  it('should halve the after sort when no before', () => {
    expect(computeSpliceSort(null, 2000)).toBe(1000);
  });

  it('should add default step to before when no after', () => {
    expect(computeSpliceSort(5000, null)).toBe(6000);
  });

  it('should return default step when no neighbors', () => {
    expect(computeSpliceSort(null, null)).toBe(1000);
  });

  it('should respect custom default step', () => {
    expect(computeSpliceSort(null, null, 500)).toBe(500);
    expect(computeSpliceSort(2000, null, 500)).toBe(2500);
  });

  it('should handle zero before sort', () => {
    expect(computeSpliceSort(0, 1000)).toBe(500);
  });
});