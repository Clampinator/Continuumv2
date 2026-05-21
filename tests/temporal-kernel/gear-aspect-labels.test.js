import { describe, it, expect } from 'vitest';
import { GEAR_ASPECT_LABELS } from '/systems/continuum-v2/modules/temporal-kernel/gear-aspect-labels.js';

describe('GEAR_ASPECT_LABELS', () => {
  const expectedTypes = ['firearm', 'technology', 'tool', 'vehicle'];

  it('should contain all 4 gear types', () => {
    expectedTypes.forEach(type => {
      expect(GEAR_ASPECT_LABELS[type]).toBeDefined();
    });
  });

  it('should have aspect1, aspect2, aspect3 strings for each gear type', () => {
    expectedTypes.forEach(type => {
      const labels = GEAR_ASPECT_LABELS[type];
      expect(typeof labels.aspect1).toBe('string');
      expect(typeof labels.aspect2).toBe('string');
      expect(typeof labels.aspect3).toBe('string');
      expect(labels.aspect1.length).toBeGreaterThan(0);
      expect(labels.aspect2.length).toBeGreaterThan(0);
      expect(labels.aspect3.length).toBeGreaterThan(0);
    });
  });

  it('should have exactly 4 keys', () => {
    expect(Object.keys(GEAR_ASPECT_LABELS)).toHaveLength(4);
  });
});