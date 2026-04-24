import { describe, it, expect } from 'vitest';
import { projectSubjectiveAge } from '../../modules/temporal-kernel/project-subjective-age.js';

describe('projectSubjectiveAge', () => {
  it('should calculate age correctly based on timestamp and offset', () => {
    // 1s Age = 1000ms Time
    const timestamp = 10000;
    const offset = 5000;
    const expected = 5; // (10000 - 5000) / 1000
    
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
