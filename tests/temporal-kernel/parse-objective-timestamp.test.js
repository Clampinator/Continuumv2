import { describe, it, expect, vi } from 'vitest';
import { parseObjectiveTimestamp } from '../../modules/temporal-kernel/parse-objective-timestamp.js';

describe('parseObjectiveTimestamp', () => {
    it('should convert standard date and time strings into a millisecond timestamp', () => {
        // Standard ISO-like format
        const date = '2024-01-01';
        const time = '10:00:00';
        
        // We use UTC for deterministic testing of the base parser
        const expected = new Date(`${date}T${time}Z`).getTime();
        const result = parseObjectiveTimestamp(date, time, { timezone: 'UTC' });
        
        expect(result).toBe(expected);
    });

    it('should fallback to 12:00:00 if time is missing', () => {
        const date = '2024-01-01';
        const expected = new Date(`${date}T12:00:00Z`).getTime();
        const result = parseObjectiveTimestamp(date, null, { timezone: 'UTC' });
        
        expect(result).toBe(expected);
    });

    it('should return 0 if date is missing or invalid', () => {
        expect(parseObjectiveTimestamp('', '12:00:00')).toBe(0);
        expect(parseObjectiveTimestamp('invalid-date', '12:00:00')).toBe(0);
    });

    it('should use the timezone from the location context', () => {
        // New York is UTC-5 (or UTC-4 in DST)
        // Let's use a fixed offset to avoid DST issues in tests if possible, 
        // but for now let's just ensure it's DIFFERENT from UTC.
        const date = '2024-01-01';
        const time = '12:00:00';
        
        const utcResult = parseObjectiveTimestamp(date, time, { timezone: 'UTC' });
        const nyResult = parseObjectiveTimestamp(date, time, { timezone: 'America/New_York' });
        
        expect(nyResult).not.toBe(utcResult);
    });
});
