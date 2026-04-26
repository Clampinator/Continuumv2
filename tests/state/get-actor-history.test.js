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
                            e1: { age: 10, date: "2000-01-02", time: "12:00:00", sort: 2000 }
                        }
                    }
                }
            }
        };

        const history = getActorHistory(actor);

        expect(history).toHaveLength(2); // e1 and "now" node
        
        const e1 = history.find(n => n.id === 'e1');
        expect(e1.record.age).toBe(10);
        
        // PURIFICATION ASSERTIONS: These should be undefined in the new architecture
        expect(e1.x).toBeUndefined();
        expect(e1.y).toBeUndefined();
        expect(e1.arrivalY).toBeUndefined();

        const now = history.find(n => n.id === 'now');
        expect(now.isNow).toBe(true);
        expect(now.x).toBeUndefined();
        expect(now.y).toBeUndefined();
    });
});
