import { describe, it, expect } from 'vitest';
import {
  resolveLevelEventCoordinates,
  resolveSpanEventCoordinates
} from '../../modules/temporal-kernel/resolve-event-coordinates.js';

describe('resolveLevelEventCoordinates', () => {
  // DOB: 2000-01-01 12:00:00 UTC = 946728000000ms
  const dobTs = 946728000000;

  it('should project age correctly from eventDate', () => {
    const event = {
      eventDate: '2000-01-01',
      eventTime: '12:00:10',
      eventAge: 999 // stale cache - should be overridden
    };

    const { age, time } = resolveLevelEventCoordinates(event, dobTs);

    // Age = (timestamp - offset) / 1000
    // timestamp of "2000-01-01T12:00:10Z" = dobTs + 10000
    // age = (dobTs + 10000 - dobTs) / 1000 = 10
    expect(age).toBe(10);
    expect(time).toBe(dobTs + 10000);
  });

  it('should fall back to eventAge when eventDate parsing fails', () => {
    const event = {
      eventDate: null,
      eventTime: null,
      eventAge: 20
    };

    const { age, time } = resolveLevelEventCoordinates(event, dobTs);

    expect(age).toBe(20);
    // time = offset + age * 1000 = dobTs + 20000
    expect(time).toBe(dobTs + 20000);
  });

  it('should fall back to 0 when eventDate is absent and eventAge is 0', () => {
    const event = {
      eventDate: null,
      eventTime: null,
      eventAge: 0
    };

    const { age, time } = resolveLevelEventCoordinates(event, dobTs);

    expect(age).toBe(0);
    expect(time).toBe(dobTs);
  });

  it('should fall back to 0 when both eventDate and eventAge are missing', () => {
    const event = {};

    const { age, time } = resolveLevelEventCoordinates(event, dobTs);

    expect(age).toBe(0);
    expect(time).toBe(dobTs);
  });

  it('should use default time "12:00:00" when eventTime is absent', () => {
    const event = {
      eventDate: '2000-01-01',
      // eventTime absent - parseDate defaults to 12:00:00
      eventAge: 0
    };

    const { age, time } = resolveLevelEventCoordinates(event, dobTs);

    // Without eventTime, the date parses as 2000-01-01T12:00:00Z = dobTs
    // age = (dobTs - dobTs) / 1000 = 0
    expect(age).toBe(0);
    expect(time).toBe(dobTs);
  });

  it('should produce correct age on a rail offset after a span', () => {
    // After a span that jumps the objective timeline forward by 1 hour,
    // the offset shifts. A level event at age 10 on the new rail should
    // have time = newOffset + 10 * 1000.
    const newOffset = dobTs + 3600000; // 1 hour ahead

    const event = {
      eventDate: '2000-01-01',
      eventTime: '13:00:10',
      eventAge: 5 // stale
    };

    const { age, time } = resolveLevelEventCoordinates(event, newOffset);

    // timestamp = 2000-01-01T13:00:10Z = dobTs + 3600000 + 10000
    const expectedTimestamp = dobTs + 3600000 + 10000;
    const expectedAge = (expectedTimestamp - newOffset) / 1000;
    expect(age).toBe(expectedAge);
    expect(time).toBe(newOffset + expectedAge * 1000);
  });
});

describe('resolveSpanEventCoordinates', () => {
  const dobTs = 946728000000;

  it('should resolve departure from eventSpanFromDate', () => {
    const event = {
      eventSpanFromDate: '2000-01-01',
      eventSpanFromTime: '12:00:10',
      eventAge: 5, // stale - overridden by date projection
      eventSpanToDate: '2000-01-01',
      eventSpanToTime: '12:00:30'
    };

    const result = resolveSpanEventCoordinates(event, dobTs);

    // Departure: 2000-01-01T12:00:10Z = dobTs + 10000
    // departureAge = (dobTs + 10000 - dobTs) / 1000 = 10
    expect(result.departureAge).toBe(10);
    expect(result.departureTime).toBe(dobTs + 10000);

    // Arrival: 2000-01-01T12:00:30Z = dobTs + 30000
    expect(result.arrivalTime).toBe(dobTs + 30000);

    // newOffset = arrivalTime - departureAge * 1000 = (dobTs + 30000) - 10000
    expect(result.newOffset).toBe(dobTs + 30000 - 10000);
  });

  it('should fall back to eventAge when eventSpanFromDate is absent', () => {
    const event = {
      // No eventSpanFromDate
      eventAge: 15,
      eventSpanToDate: '2000-01-01',
      eventSpanToTime: '12:00:30'
    };

    const result = resolveSpanEventCoordinates(event, dobTs);

    expect(result.departureAge).toBe(15);
    // departureTime = offset + age * 1000 = dobTs + 15000
    expect(result.departureTime).toBe(dobTs + 15000);

    // Arrival still resolves from date
    expect(result.arrivalTime).toBe(dobTs + 30000);

    // newOffset = arrivalTime - departureAge * 1000
    expect(result.newOffset).toBe(dobTs + 30000 - 15000);
  });

  it('should fall back to eventDate when eventSpanToDate is absent', () => {
    const event = {
      eventSpanFromDate: '2000-01-01',
      eventSpanFromTime: '12:00:10',
      // No eventSpanToDate - use eventDate
      eventDate: '2000-01-01',
      eventTime: '12:00:25'
    };

    const result = resolveSpanEventCoordinates(event, dobTs);

    expect(result.departureAge).toBe(10);
    // Arrival from eventDate + eventTime
    expect(result.arrivalTime).toBe(dobTs + 25000);
  });

  it('should fall back to default time for departure when eventSpanFromTime is absent', () => {
    const event = {
      eventSpanFromDate: '2000-01-01',
      // eventSpanFromTime absent - defaults to 12:00:00
      eventSpanToDate: '2000-01-01',
      eventSpanToTime: '12:00:20'
    };

    const result = resolveSpanEventCoordinates(event, dobTs);

    // Departure: 2000-01-01T12:00:00Z = dobTs (age 0)
    expect(result.departureAge).toBe(0);
    expect(result.departureTime).toBe(dobTs);
  });

  it('should fall back to departureTime when arrival date parsing fails', () => {
    const event = {
      eventSpanFromDate: '2000-01-01',
      eventSpanFromTime: '12:00:10',
      eventSpanToDate: null,
      eventSpanToTime: null,
      eventDate: null,
      eventTime: null
    };

    const result = resolveSpanEventCoordinates(event, dobTs);

    // departure is valid (age 10)
    expect(result.departureAge).toBe(10);
    // arrival falls back to departureTime
    expect(result.arrivalTime).toBe(result.departureTime);
  });

  it('should compute correct newOffset after span arrival', () => {
    const event = {
      eventSpanFromDate: '2000-01-01',
      eventSpanFromTime: '12:00:10',
      eventSpanToDate: '2000-01-01',
      eventSpanToTime: '12:01:00' // 50 seconds later
    };

    const result = resolveSpanEventCoordinates(event, dobTs);

    // Departure age = 10s
    expect(result.departureAge).toBe(10);
    // Arrival time = dobTs + 60000
    expect(result.arrivalTime).toBe(dobTs + 60000);
    // newOffset = arrivalTime - departureAge * 1000
    expect(result.newOffset).toBe(dobTs + 60000 - 10000);
  });

  it('should handle eventAge fallback with zero offset', () => {
    const event = {
      // No span from date, no age - falls back to age 0
      eventSpanToDate: '2000-01-01',
      eventSpanToTime: '12:00:05'
    };

    const result = resolveSpanEventCoordinates(event, 0);

    expect(result.departureAge).toBe(0);
    expect(result.departureTime).toBe(0);
    // Arrival = 2000-01-01T12:00:05Z = dobTs + 5000
    expect(result.arrivalTime).toBe(946728000000 + 5000);
  });
});