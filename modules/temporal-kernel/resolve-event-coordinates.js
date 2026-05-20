import { parseDate } from '/systems/continuum-v2/modules/span-graph-utils/provide-span-graph-utils.js';
import {
  projectSubjectiveAge,
  projectObjectiveTime,
  computeOffsetFromArrival
} from '/systems/continuum-v2/modules/temporal-kernel/project-subjective-age.js';

/**
 * KERNEL: RESOLVE LEVEL EVENT COORDINATES
 *
 * Pure physics extraction for a level (non-span) event.
 * Derives the subjective age (x) and objective time (y)
 * of a level event given the current rail offset.
 *
 * The stored eventAge is treated as a stale cache; the
 * authoritative age is always re-derived from the event's
 * objective date string and the rail offset.
 *
 * @param {Object} event - Plain event object with fields:
 *   eventDate, eventTime, eventAge, eventIsSpan, etc.
 * @param {number} objectiveOffset - Current rail offset (ms).
 * @returns {{ age: number, time: number }} World coordinates in
 *   seconds (age) and ms (time).
 */
export function resolveLevelEventCoordinates(event, objectiveOffset) {
  let age;

  // Derive age from the event's objective date and the current
  // rail offset. Stored event.eventAge is a stale cache and is
  // NOT authoritative for positioning.
  if (event.eventDate) {
    const dateObj = parseDate(
      `${event.eventDate}T${event.eventTime || '12:00:00'}`
    );
    if (dateObj) {
      age = projectSubjectiveAge(dateObj.getTime(), objectiveOffset);
    }
  }

  if (!Number.isFinite(age)) {
    age = Math.max(0, Number(event.eventAge) || 0);
  }

  // DIAGONAL AUTHORITY: 1s subjective age = 1000ms objective
  // time on the current rail.
  const time = projectObjectiveTime(age, objectiveOffset);

  return { age, time };
}

/**
 * KERNEL: RESOLVE SPAN EVENT COORDINATES
 *
 * Pure physics extraction for a span (teleportation) event.
 * Derives departure age, departure time, arrival time,
 * and the new rail offset from arrival.
 *
 * Arrival time resolution priority:
 *   1. eventSpanToDate + eventSpanToTime
 *   2. eventDate + eventTime (fallback)
 *
 * Departure time resolution priority:
 *   1. eventSpanFromDate + eventSpanFromTime
 *   2. Stored eventAge projected onto rail
 *
 * @param {Object} event - Plain event object with span fields.
 * @param {number} currentOffset - Current rail offset before
 *   this span (ms).
 * @returns {{ departureAge: number, departureTime: number,
 *   arrivalTime: number, newOffset: number }}
 */
export function resolveSpanEventCoordinates(event, currentOffset) {
  // 1. Resolve departure coordinates
  let departureTime;
  let departureAge;

  if (event.eventSpanFromDate) {
    const fromTimeStr = event.eventSpanFromTime || '12:00:00';
    const fromDateObj = parseDate(
      `${event.eventSpanFromDate}T${fromTimeStr}`
    );
    if (fromDateObj) {
      departureTime = fromDateObj.getTime();
      departureAge = projectSubjectiveAge(departureTime, currentOffset);
    }
  }

  if (!Number.isFinite(departureAge)) {
    departureAge = Math.max(0, Number(event.eventAge) || 0);
    departureTime = projectObjectiveTime(departureAge, currentOffset);
  }

  // 2. Resolve arrival coordinates
  const destDateStr =
    event.eventSpanToDate || event.eventDate;
  const destTimeStr =
    event.eventSpanToTime || event.eventTime || '00:00:00';
  const destDateObj = parseDate(`${destDateStr}T${destTimeStr}`);
  const arrivalTime = destDateObj ? destDateObj.getTime() : departureTime;

  // 3. New rail offset after span arrival
  const newOffset = computeOffsetFromArrival(arrivalTime, departureAge);

  return {
    departureAge,
    departureTime,
    arrivalTime,
    newOffset
  };
}