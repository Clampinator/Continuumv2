import { describe, it, expect } from 'vitest';
import { parseSubjectiveAge, formatSubjectiveAge } from '../../modules/temporal-translator/age-converter.js';

describe('Age Converter: Parsing (Inbound)', () => {
    it('should parse simple year shorthand', () => {
        expect(parseSubjectiveAge('1y')).toBe(31536000);
    });

    it('should parse compound shorthand (y and d)', () => {
        expect(parseSubjectiveAge('1y 1d')).toBe(31536000 + 86400);
    });

    it('should parse fractional years', () => {
        expect(parseSubjectiveAge('10.5y')).toBe(331128000);
    });

    it('should parse raw seconds with unit', () => {
        expect(parseSubjectiveAge('15768000s')).toBe(15768000);
    });

    it('should handle raw numbers and numeric strings', () => {
        expect(parseSubjectiveAge(1000)).toBe(1000);
        expect(parseSubjectiveAge('2000')).toBe(2000);
    });

    it('should return 0 for garbage strings', () => {
        expect(parseSubjectiveAge('abc')).toBe(0);
        expect(parseSubjectiveAge(null)).toBe(0);
        expect(parseSubjectiveAge(undefined)).toBe(0);
    });

    it('should parse complex durations (y d h m s)', () => {
        // 1y (31536000) + 2d (172800) + 3h (10800) + 4m (240) + 5s (5)
        const expected = 31536000 + 172800 + 10800 + 240 + 5;
        expect(parseSubjectiveAge('1y 2d 03:04:05')).toBe(expected);
        expect(parseSubjectiveAge('1y 2d 3h 4m 5s')).toBe(expected);
    });
});

describe('Age Converter: Formatting (Outbound)', () => {
    it('should format seconds into gold standard UI string', () => {
        const seconds = 31536000 + 86400 + 10800 + 240 + 5;
        expect(formatSubjectiveAge(seconds)).toBe('1y 1d 03:04:05');
    });

    it('should handle exactly zero', () => {
        expect(formatSubjectiveAge(0)).toBe('0y 0d 00:00:00');
    });

    it('should handle negative numbers gracefully (prefix with -)', () => {
        expect(formatSubjectiveAge(-31536000)).toBe('-1y 0d 00:00:00');
    });

    it('should handle small durations', () => {
        expect(formatSubjectiveAge(3661)).toBe('0y 0d 01:01:01');
    });
});
