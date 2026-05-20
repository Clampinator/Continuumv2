import { describe, it, expect } from 'vitest';
import { formatDurationCompact } from '/systems/continuum-v2/modules/temporal-translator/duration-converter.js';

describe('formatDurationCompact', () => {
  it('should format zero as "0s"', () => {
    expect(formatDurationCompact(0)).toBe('0s');
  });

  it('should format seconds only', () => {
    expect(formatDurationCompact(45)).toBe('45s');
  });

  it('should format minutes and seconds', () => {
    expect(formatDurationCompact(125)).toBe('2m 5s');
  });

  it('should format hours and minutes', () => {
    // 3600 + 120 = 3720 seconds = 1h 2m
    expect(formatDurationCompact(3720)).toBe('1h 2m');
  });

  it('should format days and hours', () => {
    // 86400 + 7200 = 93600 seconds = 1d 2h
    expect(formatDurationCompact(93600)).toBe('1d 2h');
  });

  it('should format years and days', () => {
    // 1 year + 1 day = 31536000 + 86400 = 31622400 seconds
    expect(formatDurationCompact(31622400)).toBe('1y 1d');
  });

  it('should format full duration with all components', () => {
    // 1y 1d 2h 3m 4s = 31536000 + 86400 + 7200 + 180 + 4 = 31629784
    expect(formatDurationCompact(31629784)).toBe('1y 1d 2h 3m 4s');
  });

  it('should suppress zero-valued components', () => {
    // 1 year alone = 31536000
    expect(formatDurationCompact(31536000)).toBe('1y');
  });

  it('should format 10 years (span rank 2)', () => {
    expect(formatDurationCompact(315360000)).toBe('10y');
  });

  it('should format negative values with minus prefix', () => {
    expect(formatDurationCompact(-86400)).toBe('-1d');
  });

  it('should format large negative values', () => {
    expect(formatDurationCompact(-31536000)).toBe('-1y');
  });

  it('should return "0s" for NaN', () => {
    expect(formatDurationCompact(NaN)).toBe('0s');
  });

  it('should return "0s" for Infinity', () => {
    expect(formatDurationCompact(Infinity)).toBe('0s');
  });

  it('should return "0s" for -Infinity', () => {
    expect(formatDurationCompact(-Infinity)).toBe('0s');
  });

  it('should match the old _formatSecondsToDuration output for small values', () => {
    // 30 minutes = 1800 seconds
    expect(formatDurationCompact(1800)).toBe('30m');
    // 90 minutes = 5400 seconds
    expect(formatDurationCompact(5400)).toBe('1h 30m');
  });

  it('should handle fractional-second truncation (Math.floor)', () => {
    expect(formatDurationCompact(1.9)).toBe('1s');
  });
});