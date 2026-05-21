import { describe, it, expect } from 'vitest';
import { calculateSpeedModifier, SPEED_PENALTIES } from '/systems/continuum-v2/modules/temporal-kernel/speed-penalties.js';

describe('SPEED_PENALTIES constant', () => {
  it('has 5 entries for speed blocks 1-5 over top speed', () => {
    expect(SPEED_PENALTIES).toHaveLength(5);
  });

  it('starts at 0 and escalates negatively', () => {
    expect(SPEED_PENALTIES[0]).toBe(0);
    expect(SPEED_PENALTIES[1]).toBe(-3);
    expect(SPEED_PENALTIES[2]).toBe(-6);
    expect(SPEED_PENALTIES[3]).toBe(-9);
    expect(SPEED_PENALTIES[4]).toBe(-15);
  });
});

describe('calculateSpeedModifier', () => {
  it('returns 0 when at top speed', () => {
    expect(calculateSpeedModifier(3, 3)).toBe(0);
  });

  it('returns positive bonus when below top speed', () => {
    expect(calculateSpeedModifier(2, 3)).toBe(1);
    expect(calculateSpeedModifier(1, 3)).toBe(2);
  });

  it('returns -3 penalty one block over top speed', () => {
    expect(calculateSpeedModifier(4, 3)).toBe(-3);
  });

  it('returns -6 penalty two blocks over top speed', () => {
    expect(calculateSpeedModifier(5, 3)).toBe(-6);
  });

  it('returns -9 penalty three blocks over top speed', () => {
    expect(calculateSpeedModifier(6, 3)).toBe(-9);
  });

  it('returns -15 for extreme overflow (caps at last entry)', () => {
    expect(calculateSpeedModifier(8, 3)).toBe(-15);
    expect(calculateSpeedModifier(100, 3)).toBe(-15);
  });
});