import { describe, it, expect } from 'vitest';
import { resolveCoordinates } from '../../modules/temporal-engine/resolve-coordinates.js';

describe('resolveCoordinates', () => {
  const segment = {
    startAge: 100,
    startTime: 1000000
  };

  it('should project time correctly within a segment', () => {
    // 100 seconds later in age should be 100,000ms later in time
    const age = 200;
    const time = resolveCoordinates(age, segment);
    
    expect(time).toBe(1000000 + 100 * 1000);
  });

  it('should project time correctly for the start age', () => {
    const age = 100;
    const time = resolveCoordinates(age, segment);
    
    expect(time).toBe(1000000);
  });

  it('should project time correctly for ages before the start age (retrospective)', () => {
    // 50 seconds earlier in age should be 50,000ms earlier in time
    const age = 50;
    const time = resolveCoordinates(age, segment);
    
    expect(time).toBe(1000000 - 50 * 1000);
  });
});
