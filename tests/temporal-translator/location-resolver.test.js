import { describe, it, expect } from 'vitest';
import { resolveLocationContext } from '../../modules/temporal-translator/location-resolver.js';

describe('Location Resolver: Context Resolution', () => {
    const mockHistory = [
        { id: 'ev1', age: 100, sort: 1000, eventLocation: 'London' },
        { id: 'ev2', age: 500, sort: 2000, eventLocation: 'Paris' },
        { 
            id: 'span1', age: 1000, sort: 3000, eventIsSpan: true, 
            eventSpanFromLocation: 'Paris', 
            eventSpanToLocation: 'New York' 
        },
        { id: 'ev3', age: 2000, sort: 4000, eventLocation: 'New York' }
    ];

    it('should find the correct location during a standard interval', () => {
        const ctx = resolveLocationContext(mockHistory, 200);
        expect(ctx.location).toBe('London');
        expect(ctx.timezone).toBe('Europe/London');
    });

    it('should find the latest location before the target age', () => {
        const ctx = resolveLocationContext(mockHistory, 800);
        expect(ctx.location).toBe('Paris');
    });

    it('should correctly handle Spans (Arrival location should be preferred after the jump)', () => {
        // At age 1000, the span event happens. Narrative order implies we have landed.
        const ctx = resolveLocationContext(mockHistory, 1500);
        expect(ctx.location).toBe('New York');
        expect(ctx.timezone).toBe('America/New_York');
    });

    it('should fall back to birth location if no history matches', () => {
        const mockActor = {
            system: {
                personal: { birthLocation: 'Tokyo' }
            }
        };
        const ctx = resolveLocationContext(mockHistory, 50, mockActor);
        expect(ctx.location).toBe('Tokyo');
        expect(ctx.timezone).toBe('Asia/Tokyo');
    });

    it('should default to UTC if absolutely no location info exists', () => {
        const ctx = resolveLocationContext([], 1000, {});
        expect(ctx.timezone).toBe('UTC');
    });
});

describe('Location Resolver: Timezone Mapping', () => {
    it('should resolve common location names to IANA timezones', () => {
        const locations = {
            'London': 'Europe/London',
            'Paris': 'Europe/Paris',
            'New York': 'America/New_York',
            'Los Angeles': 'America/Los_Angeles',
            'Tokyo': 'Asia/Tokyo',
            'Berlin': 'Europe/Berlin'
        };

        for (const [name, expected] of Object.entries(locations)) {
            const ctx = resolveLocationContext([{ age: 0, sort: 1, eventLocation: name }], 100);
            expect(ctx.timezone).toBe(expected);
        }
    });

    it('should handle case-insensitivity and trimming', () => {
        const ctx = resolveLocationContext([{ age: 0, sort: 1, eventLocation: '  london  ' }], 100);
        expect(ctx.timezone).toBe('Europe/London');
    });
});
