import { describe, it, expect } from 'vitest';
import { calculateArmorIpTotals } from '/systems/continuum-v2/modules/temporal-kernel/calculate-armor-ip-totals.js';

describe('calculateArmorIpTotals', () => {
  it('returns all zeros for empty array', () => {
    const result = calculateArmorIpTotals([]);
    expect(result.totalIpA).toBe(0);
    expect(result.totalIpG).toBe(0);
  });

  it('sums IP values from a single armor item', () => {
    const result = calculateArmorIpTotals([{ ipA: 3, ipB: 2, ipC: 1, ipD: 0, ipE: 0, ipF: 0, ipG: 0 }]);
    expect(result.totalIpA).toBe(3);
    expect(result.totalIpB).toBe(2);
    expect(result.totalIpC).toBe(1);
  });

  it('sums IP values across multiple armor items', () => {
    const result = calculateArmorIpTotals([
      { ipA: 2, ipB: 1, ipC: 0, ipD: 0, ipE: 0, ipF: 0, ipG: 0 },
      { ipA: 3, ipB: 2, ipC: 1, ipD: 0, ipE: 0, ipF: 0, ipG: 0 }
    ]);
    expect(result.totalIpA).toBe(5);
    expect(result.totalIpB).toBe(3);
    expect(result.totalIpC).toBe(1);
  });

  it('treats missing/null IP fields as 0', () => {
    const result = calculateArmorIpTotals([{ ipA: null, ipB: undefined }]);
    expect(result.totalIpA).toBe(0);
    expect(result.totalIpB).toBe(0);
  });
});