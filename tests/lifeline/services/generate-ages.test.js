import { describe, it, expect } from 'vitest';
import { generateEras } from '../../../modules/lifeline/services/segment-generator/generate-ages.js';

describe('generateEras (TTL timezone-safe)', () => {
  it('computes duration from dateFrom and dateTo', () => {
    const eras = [
      { id: 'e1', name: 'Childhood', age: 0, dateFrom: '2000-01-01', dateTo: '2010-01-01', path: 'system.eras.e1' }
    ];
    const result = generateEras(eras);
    expect(result).toHaveLength(1);
    expect(result[0].startAgeSeconds).toBe(0);
    // 10 years in seconds (approximately, accounting for leap days via UTC)
    const tenYearsSeconds = 10 * 365.25 * 86400;
    expect(result[0].endAgeSeconds).toBeGreaterThan(tenYearsSeconds - 86400);
    expect(result[0].endAgeSeconds).toBeLessThan(tenYearsSeconds + 86400);
  });

  it('falls back to 1 year when dateTo is empty', () => {
    const eras = [
      { id: 'e2', name: 'Ongoing', age: 10, dateFrom: '2010-06-15', dateTo: '', path: 'system.eras.e2' }
    ];
    const result = generateEras(eras);
    expect(result[0].startAgeSeconds).toBe(10);
    expect(result[0].endAgeSeconds).toBe(10 + 31536000);
  });

  it('handles missing dateFrom gracefully', () => {
    const eras = [
      { id: 'e3', name: 'No Dates', age: 5, dateFrom: '', dateTo: '', path: 'system.eras.e3' }
    ];
    const result = generateEras(eras);
    expect(result[0].startAgeSeconds).toBe(5);
    // Falls back to 1 year since parseDateToObjectiveMs returns 0 for empty
    expect(result[0].endAgeSeconds).toBe(5 + 31536000);
  });

  it('sorts eras by startAgeSeconds', () => {
    const eras = [
      { id: 'e5', name: 'Adulthood', age: 18, dateFrom: '2018-01-01', dateTo: '', path: 'system.eras.e5' },
      { id: 'e4', name: 'Childhood', age: 0, dateFrom: '2000-01-01', dateTo: '2018-01-01', path: 'system.eras.e4' }
    ];
    const result = generateEras(eras);
    expect(result[0].id).toBe('e4');
    expect(result[1].id).toBe('e5');
  });
});