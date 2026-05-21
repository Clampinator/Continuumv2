import { describe, it, expect } from 'vitest';
import { cssClassFromFraternity } from '/systems/continuum-v2/modules/character/css-class-from-fraternity.js';

describe('cssClassFromFraternity', () => {
  it('should convert single-word fraternity to lowercase', () => {
    expect(cssClassFromFraternity('Foxhorn')).toBe('foxhorn');
  });

  it('should replace spaces with hyphens and lowercase', () => {
    expect(cssClassFromFraternity('Money Changers')).toBe('money-changers');
  });

  it('should return default-fraternity for empty string', () => {
    expect(cssClassFromFraternity('')).toBe('default-fraternity');
  });

  it('should return default-fraternity for null', () => {
    expect(cssClassFromFraternity(null)).toBe('default-fraternity');
  });

  it('should return default-fraternity for undefined', () => {
    expect(cssClassFromFraternity(undefined)).toBe('default-fraternity');
  });

  it('should return default-fraternity for whitespace-only string', () => {
    expect(cssClassFromFraternity('   ')).toBe('default-fraternity');
  });

  it('should handle multiple spaces between words', () => {
    expect(cssClassFromFraternity('Money  Changers')).toBe('money-changers');
  });
});