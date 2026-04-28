import { describe, it, expect } from 'vitest';
import { parseObjectiveTime, formatObjectiveTime } from '../../modules/temporal-translator/coordinate-converter.js';

describe('Coordinate Converter: Parsing (Inbound)', () => {
    it('should parse the same wall-clock time differently based on LocationContext', () => {
        const dateStr = "2026-04-27";
        const timeStr = "12:00:00";

        const londonContext = { timezone: "Europe/London" };
        const nyContext = { timezone: "America/New_York" };

        const londonMs = parseObjectiveTime(dateStr, timeStr, londonContext);
        const nyMs = parseObjectiveTime(dateStr, timeStr, nyContext);

        // April 2026: London is BST (UTC+1), NY is EDT (UTC-4).
        // Difference = 5 hours = 5 * 3600 * 1000 = 18,000,000 ms.
        // Since NY is "behind" London, nyMs should be > londonMs in absolute UTC time?
        // Wait: 12:00 NY is 17:00 London. 
        // So 12:00 NY happens LATER than 12:00 London.
        // Therefore nyMs > londonMs.
        expect(nyMs - londonMs).toBe(5 * 3600 * 1000);
    });

    it('should return 0 for invalid dates', () => {
        expect(parseObjectiveTime("", "12:00:00", { timezone: "UTC" })).toBe(0);
        expect(parseObjectiveTime("invalid", "12:00:00", { timezone: "UTC" })).toBe(0);
    });

    it('should handle missing time by defaulting to High Noon', () => {
        const dateStr = "2026-04-27";
        const ms = parseObjectiveTime(dateStr, null, { timezone: "UTC" });
        const expected = new Date("2026-04-27T12:00:00Z").getTime();
        expect(ms).toBe(expected);
    });
});

describe('Coordinate Converter: Formatting (Outbound)', () => {
    it('should format a timestamp back to the correct local strings', () => {
        // High Noon UTC
        const ms = new Date("2026-04-27T12:00:00Z").getTime();
        
        const londonContext = { timezone: "Europe/London" }; // UTC+1 in April
        const nyContext = { timezone: "America/New_York" }; // UTC-4 in April

        const londonResult = formatObjectiveTime(ms, londonContext);
        const nyResult = formatObjectiveTime(ms, nyContext);

        expect(londonResult.date).toBe("2026-04-27");
        expect(londonResult.time).toBe("13:00:00");

        expect(nyResult.date).toBe("2026-04-27");
        expect(nyResult.time).toBe("08:00:00");
    });

    it('should handle exactly zero (Year 1970)', () => {
        const result = formatObjectiveTime(0, { timezone: "UTC" });
        expect(result.date).toBe("1970-01-01");
        expect(result.time).toBe("00:00:00");
    });
});

describe('Coordinate Converter: Round-Trip Integrity', () => {
    it('should maintain perfect symmetry (parse -> format -> parse)', () => {
        const context = { timezone: "Asia/Tokyo" };
        const originalDate = "2026-12-25";
        const originalTime = "09:00:00";

        const ms = parseObjectiveTime(originalDate, originalTime, context);
        const result = formatObjectiveTime(ms, context);

        expect(result.date).toBe(originalDate);
        expect(result.time).toBe(originalTime);

        const backToMs = parseObjectiveTime(result.date, result.time, context);
        expect(backToMs).toBe(ms);
    });
});
