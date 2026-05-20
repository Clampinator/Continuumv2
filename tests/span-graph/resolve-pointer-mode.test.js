import { describe, it, expect } from 'vitest';
import { resolvePointerMode } from '../../modules/span-graph/interaction/resolve-pointer-mode.js';

describe('resolvePointerMode', () => {
  const start = { x: 100, y: 200 };

  it('should return null if drag is under threshold', () => {
    expect(resolvePointerMode(start, { x: 105, y: 205 })).toBeNull();
  });

  it('should return level for horizontal drags', () => {
    const current = { x: 200, y: 210 };
    expect(resolvePointerMode(start, current)).toBe('level');
  });

  it('should return level for slight vertical drift during horizontal drag', () => {
    const current = { x: 150, y: 170 };
    expect(resolvePointerMode(start, current)).toBe('level');
  });

  it('should return span for clearly vertical drag exceeding minimum distance', () => {
    const current = { x: 110, y: 100 };
    expect(resolvePointerMode(start, current)).toBe('span');
  });

  it('should return span for strongly vertical drag', () => {
    const current = { x: 105, y: 50 };
    expect(resolvePointerMode(start, current)).toBe('span');
  });

  it('should return level when vertical movement is below minimum even if ratio is high', () => {
    const current = { x: 102, y: 185 };
    expect(resolvePointerMode(start, current)).toBe('level');
  });

  it('should return insert-span when insertionContext is provided regardless of direction', () => {
    const current = { x: 200, y: 210 };
    expect(resolvePointerMode(start, current, 10, { age: 5, time: 5000 })).toBe('insert-span');
  });

  it('should return insert-span even for vertical movement with insertionContext', () => {
    const current = { x: 105, y: 50 };
    expect(resolvePointerMode(start, current, 10, { age: 5, time: 5000 })).toBe('insert-span');
  });
});