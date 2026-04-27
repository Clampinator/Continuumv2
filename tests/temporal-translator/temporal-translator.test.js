import { describe, it, expect, vi } from 'vitest';
import { Translator } from '../../modules/temporal-translator/temporal-translator.js';

describe('Temporal Translator: Facade', () => {
    const mockActor = {
        system: {
            personal: { birthLocation: 'London' }
        }
    };
    const mockHistory = [];

    describe('toHuman (Outbound)', () => {
        it('should bundle atomic integers into localized UI strings', () => {
            const ms = new Date("2026-04-27T12:00:00Z").getTime();
            const rawFacts = {
                eventAge: 31536000, // 1y
                ts: ms
            };

            const result = Translator.toHuman(rawFacts, mockHistory, mockActor);

            expect(result.ageFormatted).toBe('1y 0d 00:00:00');
            expect(result.date).toBe('2026-04-27');
            expect(result.time).toBe('13:00:00'); // Europe/London local time (BST)
            expect(result.locationContext.location).toBe('London');
        });

        it('should handle spans with departure and arrival', () => {
            const rawFacts = {
                eventAge: 100,
                ts: 1000,
                arrivalTs: 5000,
                eventIsSpan: true
            };

            const result = Translator.toHuman(rawFacts, mockHistory, mockActor);

            expect(result.eventSpanFromDate).toBeDefined();
            expect(result.eventSpanToDate).toBeDefined();
        });
    });

    describe('toAtomic (Inbound)', () => {
        it('should translate UI strings into pure integers', () => {
            const ms = new Date("2026-04-27T12:00:00Z").getTime();
            const bagOfStrings = {
                eventAge: '1y 1d',
                eventDate: '2026-04-27',
                eventTime: '13:00:00' // 13:00 local is 12:00 UTC
            };

            const result = Translator.toAtomic(bagOfStrings, mockHistory, mockActor);

            expect(result.eventAge).toBe(31536000 + 86400);
            expect(result.ts).toBe(ms);
        });
    });
});
