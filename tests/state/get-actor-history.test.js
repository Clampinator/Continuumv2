import { describe, it, expect } from 'vitest';
import { getActorHistory } from '../../modules/state/get-actor-history.js';

describe('getActorHistory', () => {
    it('should return raw facts without physical coordinates', () => {
        const actor = {
            system: {
                personal: {
                    dob: "2000-01-01",
                    subjectiveNow: 100,
                    objectiveNow: 123456789
                },
                eras: {
                    era1: {
                        events: {
                            e1: { eventAge: 10, eventDate: "2000-01-02", eventTime: "12:00:00", sort: 2000 }
                        }
                    }
                }
            }
        };

        const history = getActorHistory(actor);

        expect(history).toHaveLength(2); // e1 and "now" node
        
        const e1 = history.find(n => n.id === 'e1');
        expect(e1.record.eventAge).toBe(10);
        expect(e1.record.eventDate).toBe("2000-01-02");
        expect(e1.record.eventTime).toBe("12:00:00");

        // PURIFICATION ASSERTIONS: Physical coordinates (x, y, ts, arrivalTs) should NOT be in the record
        expect(e1.record.x).toBeUndefined();
        expect(e1.record.y).toBeUndefined();
        expect(e1.record.ts).toBeUndefined();
        expect(e1.record.arrivalTs).toBeUndefined();

        const now = history.find(n => n.id === 'now');
        expect(now.isNow).toBe(true);
        expect(now.record.objectiveNow).toBe(123456789);
        expect(now.x).toBeUndefined();
        expect(now.y).toBeUndefined();
    });
});
