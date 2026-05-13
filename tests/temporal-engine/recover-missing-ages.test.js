import { describe, it, expect } from 'vitest';
import { recoverMissingAges } from '../../modules/temporal-engine/recover-missing-ages.js';

describe('recoverMissingAges', () => {
    // DOB: 2000-01-01 12:00:00 UTC = 946728000000 ms
    const dobTs = 946728000000;

    it('should return facts unchanged when no null ages', () => {
        const facts = [
            { id: 'e1', sort: 1000, isNow: false, record: { eventAge: 10, ts: dobTs + 10000, eventIsSpan: false } },
            { id: 'e2', sort: 2000, isNow: false, record: { eventAge: 20, ts: dobTs + 20000, eventIsSpan: false } }
        ];
        const result = recoverMissingAges(facts, dobTs);
        expect(result).toBe(facts);
        expect(result[0].record.eventAge).toBe(10);
        expect(result[1].record.eventAge).toBe(20);
    });

    it('should recover null age via two-pass rail-offset for a level event with ts', () => {
        // Level event at 10 seconds after DOB, age missing from DB
        const facts = [
            { id: 'e1', sort: 1000, isNow: false, record: { eventAge: null, ts: dobTs + 10000, arrivalTs: null, eventIsSpan: false } }
        ];
        recoverMissingAges(facts, dobTs);
        // With no spans, rail offset = DOB, so age = (ts - dobTs) / 1000 = 10
        expect(facts[0].record.eventAge).toBe(10);
    });

    it('should use span displacements when recovering ages', () => {
        // A span that jumps 10 seconds forward at age 5
        // Without rail offset, event at ts=dobTs+25000 would project to age 25
        // With the span, the rail offset at age >5 includes the 10s displacement,
        // so the event at objective time +20000 has subjective age 15 (not 20)
        const facts = [
            { id: 'e1', sort: 1000, isNow: false, record: { eventAge: 5, ts: dobTs + 5000, arrivalTs: null, eventIsSpan: false } },
            { id: 'span1', sort: 2000, isNow: false, record: { eventAge: 5, ts: dobTs + 5000, arrivalTs: dobTs + 15000, eventIsSpan: true } },
            // Event with null age - arrives after the span, at objective timestamp dobTs+25000
            { id: 'e2', sort: 3000, isNow: false, record: { eventAge: null, ts: dobTs + 25000, arrivalTs: null, eventIsSpan: false } }
        ];
        recoverMissingAges(facts, dobTs);

        // First pass (rough): roughAge = (25000 - dobTs) / 1000 = 25, but wait...
        // projectSubjectiveAge(ts, dobTs) = (ts - dobTs) / 1000 = 25
        // Then rail offset at age 25 includes span displacement of 10000ms
        // railBase = dobTs + 10000 = dobTs + 10000
        // Final age = projectSubjectiveAge(dobTs + 25000, dobTs + 10000) = (25000 - 10000) / 1000 = 15
        expect(facts[2].record.eventAge).toBe(15);
    });

    it('should set eventAge to 0 when ts is also missing', () => {
        const facts = [
            { id: 'e1', sort: 1000, isNow: false, record: { eventAge: null, ts: null, eventIsSpan: false } }
        ];
        recoverMissingAges(facts, dobTs);
        expect(facts[0].record.eventAge).toBe(0);
    });

    it('should set eventAge to 0 when ts is 0', () => {
        const facts = [
            { id: 'e1', sort: 1000, isNow: false, record: { eventAge: null, ts: 0, eventIsSpan: false } }
        ];
        recoverMissingAges(facts, dobTs);
        expect(facts[0].record.eventAge).toBe(0);
    });

    it('should skip NOW node', () => {
        const facts = [
            { id: 'now', sort: 999999999, isNow: true, record: { eventAge: null, ts: dobTs + 50000, eventIsSpan: false } }
        ];
        recoverMissingAges(facts, dobTs);
        // NOW node should not be modified
        expect(facts[0].record.eventAge).toBe(null);
    });

    it('should skip undefined eventAge (treat as already set)', () => {
        const facts = [
            { id: 'e1', sort: 1000, isNow: false, record: { eventAge: 15, ts: dobTs + 15000, eventIsSpan: false } }
        ];
        recoverMissingAges(facts, dobTs);
        expect(facts[0].record.eventAge).toBe(15);
    });

    it('should preserve explicit age 0', () => {
        const facts = [
            { id: 'birth', sort: 1000, isNow: false, record: { eventAge: 0, ts: dobTs, eventIsSpan: false } }
        ];
        recoverMissingAges(facts, dobTs);
        expect(facts[0].record.eventAge).toBe(0);
    });

    it('should handle empty facts array', () => {
        const result = recoverMissingAges([], dobTs);
        expect(result).toEqual([]);
    });

    it('should return facts unchanged when dobTs is 0', () => {
        const facts = [
            { id: 'e1', sort: 1000, isNow: false, record: { eventAge: null, ts: dobTs + 10000, eventIsSpan: false } }
        ];
        recoverMissingAges(facts, 0);
        expect(facts[0].record.eventAge).toBe(null);
    });

    it('should recover ages for multiple events in sequence', () => {
        const facts = [
            { id: 'e1', sort: 1000, isNow: false, record: { eventAge: null, ts: dobTs + 10000, arrivalTs: null, eventIsSpan: false } },
            { id: 'e2', sort: 2000, isNow: false, record: { eventAge: null, ts: dobTs + 30000, arrivalTs: null, eventIsSpan: false } }
        ];
        recoverMissingAges(facts, dobTs);
        expect(facts[0].record.eventAge).toBe(10);
        expect(facts[1].record.eventAge).toBe(30);
    });

    it('should exclude spans with null ages from rail offset collection', () => {
        // Span with null age should not break span collection
        const facts = [
            { id: 'span1', sort: 1000, isNow: false, record: { eventAge: null, ts: dobTs + 5000, arrivalTs: dobTs + 15000, eventIsSpan: true } },
            { id: 'e1', sort: 2000, isNow: false, record: { eventAge: null, ts: dobTs + 25000, arrivalTs: null, eventIsSpan: false } }
        ];
        recoverMissingAges(facts, dobTs);

        // Span with null age is excluded from rail offset calculation
        // So rail offset = dobTs (no span displacement)
        // e1 age = (25000) / 1000 = 25 (rough, same as first pass)
        expect(facts[1].record.eventAge).toBe(25);
    });

    it('should use resolved span for accurate rail offset in second pass', () => {
        // Character born at dobTs. Span at age 5 departs at dobTs+5000,
        // arrives at dobTs+15000 (10 seconds of displacement).
        // Then a level event with null age at objective time dobTs+25000.
        const facts = [
            { id: 'level1', sort: 1000, isNow: false, record: { eventAge: 5, ts: dobTs + 5000, arrivalTs: null, eventIsSpan: false } },
            { id: 'span1', sort: 2000, isNow: false, record: { eventAge: 5, ts: dobTs + 5000, arrivalTs: dobTs + 15000, eventIsSpan: true } },
            { id: 'level2', sort: 3000, isNow: false, record: { eventAge: null, ts: dobTs + 25000, arrivalTs: null, eventIsSpan: false } }
        ];
        recoverMissingAges(facts, dobTs);

        // Rough age of level2 = (25000 - dobTs) / 1000 = 25
        // Rail offset at age 25 includes span displacement: dobTs + 10000
        // Final age = (dobTs + 25000 - (dobTs + 10000)) / 1000 = 15
        expect(facts[2].record.eventAge).toBe(15);
    });
});