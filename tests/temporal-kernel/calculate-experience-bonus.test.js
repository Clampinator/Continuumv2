import { describe, it, expect } from 'vitest';
import { calculateExperienceBonus, calculateDistanceBonus } from '../../modules/temporal-kernel/calculate-experience-bonus.js';

const YR = 31536000;

describe('calculateExperienceBonus: Two-Axis Bonus', () => {
  // Ongoing experiences always get distance bonus = +3

  it('gives +3 to ongoing short experience (<6 months)', () => {
    // 3 months ongoing: duration=0, distance=+3 => capped at +3
    expect(calculateExperienceBonus(true, 0.25 * YR, 0, 0.25 * YR)).toBe(3);
  });

  it('gives +3 to ongoing medium experience (2 years)', () => {
    // 2yr ongoing: duration=+1, distance=+3 => capped at +3
    expect(calculateExperienceBonus(true, 2 * YR, 0, 2 * YR)).toBe(3);
  });

  it('gives +3 to ongoing long experience (4+ years)', () => {
    // 5yr ongoing: duration=+3, distance=+3 => capped at +3
    expect(calculateExperienceBonus(true, 5 * YR, 0, 5 * YR)).toBe(3);
  });

  // Closed experiences: distance + duration combined, capped at +3

  it('gives +3 to recently long-closed experience', () => {
    // 4yr experience ended 1yr ago: duration=+2, distance=+3 => 5 capped to +3
    expect(calculateExperienceBonus(false, 5 * YR, 1 * YR, 6 * YR)).toBe(3);
  });

  it('gives +2 to medium-recency medium-duration experience', () => {
    // 2yr experience ended 3yr ago: duration=+1, distance=+2 => +3
    expect(calculateExperienceBonus(false, 3 * YR, 1 * YR, 6 * YR)).toBe(3);
  });

  it('gives +2 for short experience at moderate recency', () => {
    // 6mo experience ended 3yr ago: duration=+1, distance=+2 => +3
    expect(calculateExperienceBonus(false, 3.5 * YR, 3 * YR, 6.5 * YR)).toBe(3);
  });

  it('gives +1 for old short experience (5-10yr ago)', () => {
    // 6mo experience ended 7yr ago: duration=+1, distance=+1 => +2
    expect(calculateExperienceBonus(false, 7.5 * YR, 7 * YR, 14.5 * YR)).toBe(2);
  });

  it('gives 0 for very old short experience (>10yr)', () => {
    // 3mo experience ended 12yr ago: duration=0, distance=0 => 0
    expect(calculateExperienceBonus(false, 12.25 * YR, 12 * YR, 24.25 * YR)).toBe(0);
  });

  it('gives +3 to a very long experience ended recently', () => {
    // 5yr experience ended 1yr ago: duration=+3, distance=+3 => capped +3
    expect(calculateExperienceBonus(false, 6 * YR, 1 * YR, 7 * YR)).toBe(3);
  });

  it('gives +2 for 2yr experience ended 7yr ago', () => {
    // duration=+1, distance=+1 => +2
    expect(calculateExperienceBonus(false, 9 * YR, 7 * YR, 16 * YR)).toBe(2);
  });

  it('gives 0 for a <6mo experience ended >10 years ago', () => {
    // 3mo experience ended 15yr ago: duration=0, distance=0 => 0
    expect(calculateExperienceBonus(false, 15.25 * YR, 15 * YR, 30.25 * YR)).toBe(0);
  });

  // Boundary tests

  it('correctly handles exactly 2yr duration threshold', () => {
    // Exactly 2yr duration: duration=+1
    expect(calculateExperienceBonus(true, 2 * YR, 0, 2 * YR)).toBe(3);
  });

  it('correctly handles exactly 4yr duration threshold', () => {
    // Exactly 4yr duration: duration=+2
    expect(calculateExperienceBonus(true, 4 * YR, 0, 4 * YR)).toBe(3);
  });

  it('correctly handles just over 4yr duration', () => {
    // 4.5yr duration: duration=+3
    expect(calculateExperienceBonus(true, 4.5 * YR, 0, 4.5 * YR)).toBe(3);
  });
});

describe('calculateDistanceBonus: Single-Axis Distance Thresholds', () => {
  it('returns +3 for <2 years', () => {
    expect(calculateDistanceBonus(0)).toBe(3);
    expect(calculateDistanceBonus(1)).toBe(3);
    expect(calculateDistanceBonus(1.999)).toBe(3);
  });

  it('returns +2 for 2-5 years', () => {
    expect(calculateDistanceBonus(2)).toBe(2);
    expect(calculateDistanceBonus(3.5)).toBe(2);
    expect(calculateDistanceBonus(5)).toBe(2);
  });

  it('returns +1 for 5-10 years', () => {
    expect(calculateDistanceBonus(5.001)).toBe(1);
    expect(calculateDistanceBonus(7)).toBe(1);
    expect(calculateDistanceBonus(10)).toBe(1);
  });

  it('returns 0 for >10 years', () => {
    expect(calculateDistanceBonus(10.001)).toBe(0);
    expect(calculateDistanceBonus(15)).toBe(0);
  });
});