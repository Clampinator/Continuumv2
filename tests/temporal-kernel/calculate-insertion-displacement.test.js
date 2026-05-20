import { describe, it, expect } from 'vitest';
import { calculateInsertionDisplacement } from '../../modules/temporal-kernel/calculate-insertion-displacement.js';

describe('calculateInsertionDisplacement', () => {
  const originTime = new Date(2000, 0, 1).getTime();

  // Helper: Create a simple history with events at given ages.
  function makeHistory(ages, originTimeMs) {
    return ages.map((age, i) => ({
      id: `evt-${i}`,
      x: age,
      y: originTimeMs + (age * 1000),
      sort: (i + 1) * 1000,
      record: { eventTitle: `Event ${i}`, eventIsSpan: false }
    }));
  }

  it('should compute displacement for a down-span (arrival before departure)', () => {
    // Down-span: arrival time < departure time, displacement negative.
    // Events at ages 5, 20, 30 are after the departure at age 10.
    // No birth floor clamping - down-spans may go past birth.
    const history = makeHistory([5, 20, 30], originTime);
    const departureAge = 10;
    const departureTime = originTime + 10000;
    const arrivalTime = originTime - 5000000;

    const result = calculateInsertionDisplacement(
      departureAge, departureTime, arrivalTime, history
    );

    // Arrival NOT clamped - down-spans have no lower bound
    expect(result.arrivalTime).toBe(arrivalTime);
    expect(result.displacement).toBe(arrivalTime - departureTime);
    expect(result.isDownSpan).toBe(true);
    expect(result.isUpSpan).toBe(false);
  });

  it('should compute displacement for an up-span not exceeding next event floor', () => {
    // Up-span: arrival > departure, but clamped to next event floor.
    const history = makeHistory([5, 20, 30], originTime);
    const departureAge = 10;
    const departureTime = originTime + 10000;
    const arrivalTime = originTime + 50000;

    const result = calculateInsertionDisplacement(
      departureAge, departureTime, arrivalTime, history
    );

    expect(result.nextEventFloor).toBe(originTime + 20000);
    expect(result.arrivalTime).toBe(originTime + 20000);
    expect(result.isUpSpan).toBe(true);
  });

  it('should allow free displacement when no next event exists', () => {
    // Only events before departure; no floor constraint.
    const history = makeHistory([3, 5], originTime);
    const departureAge = 10;
    const departureTime = originTime + 10000;
    const arrivalTime = originTime + 50000;

    const result = calculateInsertionDisplacement(
      departureAge, departureTime, arrivalTime, history
    );

    expect(result.nextEventFloor).toBeNull();
    expect(result.arrivalTime).toBe(arrivalTime);
    expect(result.displacement).toBe(arrivalTime - departureTime);
  });

  it('should allow down-span arrival after birth', () => {
    // Down-span arrival is after birth but before departure: no clamping.
    const history = makeHistory([5, 20, 30], originTime);
    const departureAge = 10;
    const departureTime = originTime + 10000;
    const arrivalTime = originTime + 5000;

    const result = calculateInsertionDisplacement(
      departureAge, departureTime, arrivalTime, history
    );

    expect(result.arrivalTime).toBe(arrivalTime);
    expect(result.displacement).toBe(arrivalTime - departureTime);
    expect(result.isDownSpan).toBe(true);
  });

  it('should allow down-span arrival past birth (REGRESSION: birth clamp removed)', () => {
    // REGRESSION: Down-span may arrive before the character's birth.
    // Previously this was clamped to originTime. Now it is unrestricted.
    const history = makeHistory([5, 20], originTime);
    const departureAge = 10;
    const departureTime = originTime + 10000;
    const arrivalTime = originTime - 1000;

    const result = calculateInsertionDisplacement(
      departureAge, departureTime, arrivalTime, history
    );

    // Arrival is past birth - MUST NOT be clamped
    expect(result.arrivalTime).toBe(arrivalTime);
    expect(result.displacement).toBe(arrivalTime - departureTime);
    expect(result.isDownSpan).toBe(true);
  });

  it('should produce large negative displacement for deep past-span', () => {
    // REGRESSION: A span to decades before birth must produce
    // the full negative displacement without clamping.
    const birthYear = new Date(2000, 0, 1).getTime();
    const history = makeHistory([5, 20], birthYear);
    const departureAge = 10;
    const departureTime = birthYear + 10000;
    // Arrive 20 years before birth
    const arrivalTime = birthYear - (20 * 365.25 * 24 * 3600 * 1000);

    const result = calculateInsertionDisplacement(
      departureAge, departureTime, arrivalTime, history
    );

    expect(result.arrivalTime).toBe(arrivalTime);
    // Displacement should be deeply negative
    expect(result.displacement).toBeLessThan(0);
    expect(result.isDownSpan).toBe(true);
  });

  it('should return zero displacement when arrival equals departure', () => {
    const history = makeHistory([5, 20], originTime);
    const departureAge = 10;
    const departureTime = originTime + 10000;

    const result = calculateInsertionDisplacement(
      departureAge, departureTime, departureTime, history
    );

    expect(result.displacement).toBe(0);
    expect(result.isUpSpan).toBe(false);
    expect(result.isDownSpan).toBe(false);
  });

  it('should handle empty history gracefully', () => {
    const result = calculateInsertionDisplacement(
      10, originTime + 10000, originTime + 50000, []
    );

    expect(result.nextEventFloor).toBeNull();
    expect(result.arrivalTime).toBe(originTime + 50000);
  });

  it('should find next event floor from events after departure age only', () => {
    const history = makeHistory([5, 8, 12], originTime);
    const departureAge = 10;
    const departureTime = originTime + 10000;
    const nextEventTime = originTime + 12000;

    const result = calculateInsertionDisplacement(
      departureAge, departureTime, originTime + 50000, history
    );

    expect(result.nextEventFloor).toBe(nextEventTime);
  });

  it('should allow arrival exactly at next event floor', () => {
    const history = makeHistory([5, 20, 30], originTime);
    const departureAge = 10;
    const departureTime = originTime + 10000;
    const nextEventTime = originTime + 20000;

    const result = calculateInsertionDisplacement(
      departureAge, departureTime, nextEventTime, history
    );

    expect(result.arrivalTime).toBe(nextEventTime);
  });
});