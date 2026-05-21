import { describe, it, expect } from 'vitest';
import { isDateField, DATE_FIELD_SUFFIXES } from '/systems/continuum-v2/modules/temporal-translator/date-field-registry.js';

describe('isDateField', () => {
  it('should match "dob" suffix', () => {
    expect(isDateField('system.personal.dob')).toBe(true);
  });

  it('should match "when" suffix', () => {
    expect(isDateField('system.events.abc.when')).toBe(true);
  });

  it('should match "inceptionDate" suffix (case-insensitive)', () => {
    expect(isDateField('system.org.inceptionDate')).toBe(true);
  });

  it('should match "dateofbirth" suffix', () => {
    expect(isDateField('system.personal.dateofbirth')).toBe(true);
  });

  it('should match "date" suffix', () => {
    expect(isDateField('system.eras.era1.date')).toBe(true);
  });

  it('should NOT match fields that merely contain a date suffix mid-string', () => {
    expect(isDateField('system.eras.abc.dateFrom')).toBe(false);
  });

  it('should NOT match non-date fields', () => {
    expect(isDateField('system.personal.name')).toBe(false);
  });

  it('should NOT match empty string', () => {
    expect(isDateField('')).toBe(false);
  });

  it('should be case-insensitive', () => {
    expect(isDateField('system.personal.DOB')).toBe(true);
  });
});

describe('DATE_FIELD_SUFFIXES', () => {
  it('should contain exactly 5 suffixes', () => {
    expect(DATE_FIELD_SUFFIXES).toHaveLength(5);
  });
});