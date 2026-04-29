import { describe, it, expect } from 'vitest';
import { constrainInsertionMovement } from '../../modules/span-graph/actions/drag-physics.js';

describe('constrainInsertionMovement', () => {
  const originTime = new Date(2000, 0, 1).getTime();

  it('should lock age to departure age (vertical constraint)', () => {
    const currentWorld = { eventAge: 50, eventTime: originTime + 50000 };
    const context = {
      departureAge: 10,
      departureTime: originTime + 10000,
      nextEventTime: originTime + 20000
    };

    const result = constrainInsertionMovement(currentWorld, context);

    expect(result.eventAge).toBe(10);
  });

  it('should allow arrival time to move freely when within bounds', () => {
    const currentWorld = { eventAge: 10, eventTime: originTime + 15000 };
    const context = {
      departureAge: 10,
      departureTime: originTime + 10000,
      nextEventTime: originTime + 20000
    };

    const result = constrainInsertionMovement(currentWorld, context);

    expect(result.eventTime).toBe(originTime + 15000);
  });

  it('should clamp up-span arrival to next event floor', () => {
    const currentWorld = { eventAge: 10, eventTime: originTime + 30000 };
    const context = {
      departureAge: 10,
      departureTime: originTime + 10000,
      nextEventTime: originTime + 20000
    };

    const result = constrainInsertionMovement(currentWorld, context);

    expect(result.eventTime).toBe(originTime + 20000);
  });

  it('should allow down-span arrival past birth (REGRESSION: birth clamp removed)', () => {
    // REGRESSION: Down-spans have no lower bound. Arrival may precede birth.
    // Previously clamped to originTime, now passes through freely.
    const currentWorld = { eventAge: 10, eventTime: originTime - 5000 };
    const context = {
      departureAge: 10,
      departureTime: originTime + 10000,
      nextEventTime: null
    };

    const result = constrainInsertionMovement(currentWorld, context);

    // Arrival MUST NOT be clamped to birth
    expect(result.eventTime).toBe(originTime - 5000);
    expect(result.eventAge).toBe(10);
  });

  it('should not clamp arrival when nextEventTime is null', () => {
    const currentWorld = { eventAge: 10, eventTime: originTime + 50000 };
    const context = {
      departureAge: 10,
      departureTime: originTime + 10000,
      nextEventTime: null
    };

    const result = constrainInsertionMovement(currentWorld, context);

    expect(result.eventTime).toBe(originTime + 50000);
  });

  it('should return current world unchanged when no insertion context', () => {
    const currentWorld = { eventAge: 50, eventTime: originTime + 50000 };

    const result = constrainInsertionMovement(currentWorld, null);

    expect(result).toEqual(currentWorld);
  });

  it('should allow arrival at exactly next event time', () => {
    const currentWorld = { eventAge: 10, eventTime: originTime + 20000 };
    const context = {
      departureAge: 10,
      departureTime: originTime + 10000,
      nextEventTime: originTime + 20000
    };

    const result = constrainInsertionMovement(currentWorld, context);

    expect(result.eventTime).toBe(originTime + 20000);
  });
});