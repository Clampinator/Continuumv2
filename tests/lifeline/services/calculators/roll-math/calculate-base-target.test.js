import { describe, it, expect, beforeEach } from 'vitest';
import { calculateBaseTarget } from '/systems/continuum-v2/modules/lifeline/services/calculators/roll-math/calculate-base-target.js';

describe('calculateBaseTarget', () => {
  let mockActor;

  beforeEach(() => {
    global.foundry = {
      utils: {
        getProperty: (obj, path) => {
          const keys = path.split('.');
          let current = obj;
          for (const key of keys) {
            if (current == null) return undefined;
            current = current[key];
          }
          return current;
        }
      }
    };

    mockActor = {
      type: 'character',
      system: {
        attributes: {
          react: { value: 3 },
          analyze: { value: 4 },
          force: { value: 3 },
          willpower: { temp: 2, perm: 5 }
        },
        spanning: { span: 2, naturalSpan: 1 },
        metabilities: {
          coercion: { value: 3 },
          creativity: { value: 2 },
          farsense: { value: 1 },
          pk: { value: 0 },
          redaction: { value: 4 }
        },
        combat: { wounds: {} },
        metabilities_applications: {}
      }
    };
  });

  describe('meta key', () => {
    it('returns highestMetaRank + activeRank for meta keys', () => {
      const result = calculateBaseTarget(mockActor, 'meta-coercion', { activeRank: 3 });
      expect(result).toBe(7);
    });

    it('computes highestRank from all metabilities', () => {
      const result = calculateBaseTarget(mockActor, 'meta-coercion', { activeRank: 2 });
      expect(result).toBe(6);
    });

    it('defaults activeRank to 0 when not provided', () => {
      const result = calculateBaseTarget(mockActor, 'meta-coercion');
      expect(result).toBe(4);
    });

    it('defaults activeRank to 0 when provided as NaN', () => {
      const result = calculateBaseTarget(mockActor, 'meta-coercion', { activeRank: NaN });
      expect(result).toBe(4);
    });
  });

  describe('non-meta keys', () => {
    it('returns 0 for null key', () => {
      expect(calculateBaseTarget(mockActor, null)).toBe(0);
    });

    it('returns 0 for empty key', () => {
      expect(calculateBaseTarget(mockActor, '')).toBe(0);
    });

    it('returns willpower temp for willpowerTemp', () => {
      expect(calculateBaseTarget(mockActor, 'willpowerTemp')).toBe(2);
    });

    it('returns willpower perm for willpowerPerm', () => {
      expect(calculateBaseTarget(mockActor, 'willpowerPerm')).toBe(5);
    });
  });
});