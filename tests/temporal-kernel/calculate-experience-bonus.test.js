import { describe, it, expect } from 'vitest';
import { calculateExperienceBonus, calculateDistanceBonus } from '../../modules/temporal-kernel/calculate-experience-bonus.js';

const YR = 31536000;

describe('calculateExperienceBonus: The Forgetting (min of duration, distance)', () => {
  // THE FORGETTING: Bonus is the LOWER of duration and distance axes.
  // Duration sets a ceiling; distance sets what you actually recall.

  // Ongoing experiences: distance is always +3, so bonus = min(duration, 3) = duration

  it('gives +0 to ongoing very short experience (<6 months)', () => {
    // 3 months ongoing: duration=0, distance=+3 -> min(0, 3) = 0
    expect(calculateExperienceBonus(true, 0.25 * YR, 0, 0.25 * YR)).toBe(0);
  });

  it('gives +1 to ongoing 1-year experience', () => {
    // 1yr ongoing: duration=+1, distance=+3 -> min(1, 3) = +1
    expect(calculateExperienceBonus(true, 1 * YR, 0, 1 * YR)).toBe(1);
  });

  it('gives +2 to ongoing 3-year experience', () => {
    // 3yr ongoing: duration=+2, distance=+3 -> min(2, 3) = +2
    expect(calculateExperienceBonus(true, 3 * YR, 0, 3 * YR)).toBe(2);
  });

  it('gives +3 to ongoing 5-year experience', () => {
    // 5yr ongoing: duration=+3, distance=+3 -> min(3, 3) = +3
    expect(calculateExperienceBonus(true, 5 * YR, 0, 5 * YR)).toBe(3);
  });

  // Closed experiences: The Forgetting reduces old memories

  it('gives +3 to recently closed long experience', () => {
    // 5yr experience ended 1yr ago: duration=+3, distance=+3 -> min(3, 3) = +3
    expect(calculateExperienceBonus(false, 5 * YR, 0, 6 * YR)).toBe(3);
  });

  it('gives +1 to 5yr experience ended 7yr ago (The Forgetting)', () => {
    // 5yr experience ended 7yr ago: duration=+3, distance=+1 -> min(3, 1) = +1
    expect(calculateExperienceBonus(false, 5 * YR, 0, 12 * YR)).toBe(1);
  });

  it('gives +0 to 5yr experience ended 15yr ago (The Forgetting)', () => {
    // 5yr experience ended 15yr ago: duration=+3, distance=+0 -> min(3, 0) = +0
    expect(calculateExperienceBonus(false, 5 * YR, 0, 20 * YR)).toBe(0);
  });

  it('gives +1 to 6mo experience ended 1yr ago', () => {
    // 6mo experience ended 1yr ago: duration=+1, distance=+3 -> min(1, 3) = +1
    expect(calculateExperienceBonus(false, 0.5 * YR, 0, 1.5 * YR)).toBe(1);
  });

  it('gives +1 to 2yr experience ended 7yr ago', () => {
    // 2yr experience ended 7yr ago: duration=+1, distance=+1 -> min(1, 1) = +1
    expect(calculateExperienceBonus(false, 9 * YR, 7 * YR, 16 * YR)).toBe(1);
  });

  it('gives +2 to 3yr experience ended 3yr ago', () => {
    // 3yr experience ended 3yr ago: duration=+2, distance=+2 -> min(2, 2) = +2
    expect(calculateExperienceBonus(false, 6 * YR, 3 * YR, 9 * YR)).toBe(2);
  });

  it('gives +0 to very old short experience (>10yr)', () => {
    // 3mo experience ended 12yr ago: duration=0, distance=0 -> min(0, 0) = 0
    expect(calculateExperienceBonus(false, 12.25 * YR, 12 * YR, 24.25 * YR)).toBe(0);
  });

  it('gives +2 to 4yr experience ended 3yr ago', () => {
    // 4yr experience ended 3yr ago: duration=+3, distance=+2 -> min(3, 2) = +2
    expect(calculateExperienceBonus(false, 4 * YR, 0, 7 * YR)).toBe(2);
  });

  // Boundary tests

  it('correctly handles exactly 2yr duration threshold', () => {
    // Exactly 2yr: duration=+1 (<=2 boundary), ongoing so distance=+3 -> min(1, 3) = +1
    expect(calculateExperienceBonus(true, 2 * YR, 0, 2 * YR)).toBe(1);
  });

  it('correctly handles exactly 4yr duration threshold', () => {
    // Exactly 4yr: duration=+2 (<=4 boundary), ongoing so distance=+3 -> min(2, 3) = +2
    expect(calculateExperienceBonus(true, 4 * YR, 0, 4 * YR)).toBe(2);
  });

  it('correctly handles just over 4yr duration', () => {
    // 4.5yr: duration=+3, ongoing so distance=+3 -> min(3, 3) = +3
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