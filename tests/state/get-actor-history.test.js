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

    it('should preserve null when eventAge is missing from DB', () => {
        const actor = {
            system: {
                personal: {
                    dob: "2000-01-01",
                    subjectiveNow: 100
                },
                eras: {
                    era1: {
                        events: {
                            e1: { eventDate: "2000-01-02", eventTime: "12:00:00", sort: 2000 }
                        }
                    }
                }
            }
        };

        const history = getActorHistory(actor);
        const e1 = history.find(n => n.id === 'e1');
        // eventAge not in DB -> record.eventAge should be null (not 0)
        // so the Engine pipeline's recoverMissingAges can handle it
        expect(e1.record.eventAge).toBeNull();
    });

    it('should preserve explicit zero eventAge', () => {
        const actor = {
            system: {
                personal: { dob: "2000-01-01" },
                eras: {
                    era1: {
                        events: {
                            birth: { eventAge: 0, eventDate: "2000-01-01", eventTime: "12:00:00", sort: 1000 }
                        }
                    }
                }
            }
        };

        const history = getActorHistory(actor);
        const birth = history.find(n => n.id === 'birth');
        // eventAge explicitly 0 should remain 0
        expect(birth.record.eventAge).toBe(0);
    });

    it('should preserve explicit null eventAge', () => {
        const actor = {
            system: {
                personal: { dob: "2000-01-01" },
                eras: {
                    era1: {
                        events: {
                            e1: { eventAge: null, eventDate: "2000-01-02", eventTime: "12:00:00", sort: 2000 }
                        }
                    }
                }
            }
        };

        const history = getActorHistory(actor);
        const e1 = history.find(n => n.id === 'e1');
        // eventAge explicitly null should remain null
        expect(e1.record.eventAge).toBeNull();
    });
});
