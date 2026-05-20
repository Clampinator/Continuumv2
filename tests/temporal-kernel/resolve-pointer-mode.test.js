import { describe, it, expect } from 'vitest';
import { resolvePointerMode } from '../../modules/temporal-kernel/resolve-pointer-mode.js';

describe('resolvePointerMode (kernel)', () => {
  const start = { x: 100, y: 200 };

  it('should return null if drag is under threshold', () => {
    expect(resolvePointerMode(start, { x: 105, y: 205 })).toBeNull();
  });

  it('should return level for horizontal drags', () => {
    expect(resolvePointerMode(start, { x: 200, y: 210 })).toBe('level');
  });

  it('should return level for slight vertical drift during horizontal drag', () => {
    expect(resolvePointerMode(start, { x: 150, y: 170 })).toBe('level');
  });

  it('should return span for clearly vertical drag exceeding minimum distance', () => {
    expect(resolvePointerMode(start, { x: 110, y: 100 })).toBe('span');
  });

  it('should return span for strongly vertical drag', () => {
    expect(resolvePointerMode(start, { x: 105, y: 50 })).toBe('span');
  });

  it('should return level when vertical movement is below minimum even if ratio is high', () => {
    expect(resolvePointerMode(start, { x: 102, y: 185 })).toBe('level');
  });

  it('should return insert-span when insertionContext is provided regardless of direction', () => {
    expect(resolvePointerMode(start, { x: 200, y: 210 }, 10, { age: 5, time: 5000 })).toBe('insert-span');
  });

  it('should return insert-span even for vertical movement with insertionContext', () => {
    expect(resolvePointerMode(start, { x: 105, y: 50 }, 10, { age: 5, time: 5000 })).toBe('insert-span');
  });
});