import { describe, it, expect } from 'vitest';
import { getDragMode, constrainMovement, constrainInsertionMovement } from '../../modules/temporal-kernel/drag-physics.js';

describe('getDragMode', () => {
    it('should return span when vertical movement exceeds horizontal', () => {
        expect(getDragMode(10, 20)).toBe('span');
    });

    it('should return level when horizontal is dominant and rightward', () => {
        expect(getDragMode(20, 10)).toBe('level');
    });

    it('should return span for leftward horizontal movement', () => {
        expect(getDragMode(-10, 5)).toBe('span');
    });

    it('should return level for rightward movement with equal axes', () => {
        expect(getDragMode(10, 10)).toBe('level');
    });

    it('should return span for purely vertical movement', () => {
        expect(getDragMode(0, 20)).toBe('span');
    });
});

describe('constrainMovement', () => {
    const startWorld = { eventAge: 25, eventTime: 25000 };

    it('should return currentWorld unchanged if startWorld is null', () => {
        const current = { eventAge: 30, eventTime: 30000 };
        expect(constrainMovement(current, null, 'level')).toEqual(current);
    });

    it('should lock to level diagonal in level mode', () => {
        const current = { eventAge: 30, eventTime: 35000 };
        const result = constrainMovement(current, startWorld, 'level');
        // 5 seconds of age -> 5000ms of time
        expect(result.eventAge).toBe(30);
        expect(result.eventTime).toBe(30000);
    });

    it('should not allow negative age delta in level mode', () => {
        const current = { eventAge: 20, eventTime: 20000 };
        const result = constrainMovement(current, startWorld, 'level');
        // ageDelta clamped to 0
        expect(result.eventAge).toBe(25);
        expect(result.eventTime).toBe(25000);
    });

    it('should lock age to start in span mode', () => {
        const current = { eventAge: 35, eventTime: 50000 };
        const result = constrainMovement(current, startWorld, 'span');
        expect(result.eventAge).toBe(25);
        expect(result.eventTime).toBe(50000);
    });

    it('should return currentWorld for unknown mode', () => {
        const current = { eventAge: 30, eventTime: 30000 };
        const result = constrainMovement(current, startWorld, 'unknown');
        expect(result).toEqual(current);
    });
});

describe('constrainInsertionMovement', () => {
    const insertionContext = {
        departureAge: 25,
        departureTime: 25000,
        nextEventTime: 50000
    };

    it('should return currentWorld if insertionContext is null', () => {
        const current = { eventAge: 30, eventTime: 40000 };
        expect(constrainInsertionMovement(current, null)).toEqual(current);
    });

    it('should lock age to departure age', () => {
        const current = { eventAge: 99, eventTime: 40000 };
        const result = constrainInsertionMovement(current, insertionContext);
        expect(result.eventAge).toBe(25);
        expect(result.eventTime).toBe(40000);
    });

    it('should clamp arrival time to nextEventTime when exceeding it', () => {
        const current = { eventAge: 25, eventTime: 60000 };
        const result = constrainInsertionMovement(current, insertionContext);
        expect(result.eventTime).toBe(50000);
    });

    it('should not clamp when arrival is within bounds', () => {
        const current = { eventAge: 25, eventTime: 40000 };
        const result = constrainInsertionMovement(current, insertionContext);
        expect(result.eventTime).toBe(40000);
    });

    it('should allow arrival past birth (REGRESSION: birth clamp removed)', () => {
        // REGRESSION: Down-spans may go to any point in the past,
        // including before the character's birth. No originTime clamp.
        const current = { eventAge: 25, eventTime: 5000 };
        const result = constrainInsertionMovement(current, insertionContext);
        // No clamping - arrival time passes through freely
        expect(result.eventTime).toBe(5000);
        expect(result.eventAge).toBe(25);
    });

    it('should allow arrival exactly at nextEventTime', () => {
        const current = { eventAge: 25, eventTime: 50000 };
        const result = constrainInsertionMovement(current, insertionContext);
        expect(result.eventTime).toBe(50000);
    });

    it('should not clamp by nextEventTime when it is null', () => {
        const ctx = { departureAge: 25, departureTime: 25000, nextEventTime: null };
        const current = { eventAge: 25, eventTime: 999999 };
        const result = constrainInsertionMovement(current, ctx);
        expect(result.eventTime).toBe(999999);
    });
});