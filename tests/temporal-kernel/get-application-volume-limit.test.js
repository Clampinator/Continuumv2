import { describe, it, expect } from 'vitest';
import { getApplicationVolumeLimit } from '/systems/continuum-v2/modules/temporal-kernel/get-application-volume-limit.js';

describe('getApplicationVolumeLimit', () => {
  it('returns 0 for analyze rank 0 (negative clamped by max)', () => {
    expect(getApplicationVolumeLimit(0)).toBe(0);
  });

  it('returns 0 for analyze rank 1 (3-6=-3, clamped)', () => {
    expect(getApplicationVolumeLimit(1)).toBe(0);
  });

  it('returns 0 for analyze rank 2 (6-6=0)', () => {
    expect(getApplicationVolumeLimit(2)).toBe(0);
  });

  it('returns 3 for analyze rank 3', () => {
    expect(getApplicationVolumeLimit(3)).toBe(3);
  });

  it('returns 6 for analyze rank 4', () => {
    expect(getApplicationVolumeLimit(4)).toBe(6);
  });

  it('returns 9 for analyze rank 5', () => {
    expect(getApplicationVolumeLimit(5)).toBe(9);
  });
});