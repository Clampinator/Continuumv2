import { describe, it, expect } from 'vitest';
import { projectSubjectiveAge, projectObjectiveTime, computeOffsetFromArrival } from '../../modules/temporal-kernel/project-subjective-age.js';

describe('projectSubjectiveAge', () => {
  it('should calculate age correctly based on timestamp and offset', () => {
    const timestamp = 10000;
    const offset = 5000;
    const expected = 5;
    expect(projectSubjectiveAge(timestamp, offset)).toBe(expected);
  });

  it('should return 0 if the calculated age would be negative', () => {
    const timestamp = 5000;
    const offset = 10000;
    expect(projectSubjectiveAge(timestamp, offset)).toBe(0);
  });

  it('should handle missing or invalid inputs gracefully', () => {
    expect(projectSubjectiveAge(null, null)).toBe(0);
    expect(projectSubjectiveAge('invalid', 5000)).toBe(0);
  });
});

describe('projectObjectiveTime', () => {
  it('should compute objective time from age and offset', () => {
    // Age 5s + offset 5000ms = 10000ms
    expect(projectObjectiveTime(5, 5000)).toBe(10000);
  });

  it('should compute objective time at birth (age 0)', () => {
    expect(projectObjectiveTime(0, 5000)).toBe(5000);
  });

  it('should compute objective time with zero offset', () => {
    expect(projectObjectiveTime(10, 0)).toBe(10000);
  });

  it('should handle invalid inputs gracefully', () => {
    expect(projectObjectiveTime(null, 5000)).toBe(5000);
    expect(projectObjectiveTime(10, null)).toBe(10000);
  });
});

describe('computeOffsetFromArrival', () => {
  it('should compute new offset from arrival time and age', () => {
    // arrivalTime 15000 - (age 5 * 1000) = 10000
    expect(computeOffsetFromArrival(15000, 5)).toBe(10000);
  });

  it('should compute offset at birth (arrival = offset)', () => {
    // arrivalTime 3000 - (age 0 * 1000) = 3000
    expect(computeOffsetFromArrival(3000, 0)).toBe(3000);
  });

  it('should handle invalid age gracefully', () => {
    // Null age defaults to 0: arrival - 0 = arrival
    expect(computeOffsetFromArrival(10000, null)).toBe(10000);
  });

  it('should handle null arrival by defaulting to 0', () => {
    // Null arrival defaults to 0: 0 - (5*1000) = -5000 (negative offset is valid)
    expect(computeOffsetFromArrival(null, 5)).toBe(-5000);
  });
});