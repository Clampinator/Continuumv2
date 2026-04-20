import { calculateSegments } from '../calculate-segments.js';
import { resolveCoordinates } from '../resolve-coordinates.js';
import { insertEvent } from './insert-event.js';

/**
 * Inserts a span event and propagates the resulting displacement 
 * to all subsequent events in history.
 * 
 * @param {Array} history - The current array of events.
 * @param {Object} newSpan - The span event to insert.
 * @returns {Array} The updated and shifted history.
 */
export function insertSpan(history, newSpan) {
  if (!newSpan.isSpan) {
    throw new Error('insertSpan requires an event with isSpan: true');
  }

  // 1. Determine displacement
  // We need to calculate what the Objective Time WOULD have been at this age.
  const segments = calculateSegments(history);
  const activeSegment = segments.reverse().find(s => s.startAge <= newSpan.age) 
                     || segments[0]; // Fallback to birth segment

  const projectedTime = resolveCoordinates(newSpan.age, activeSegment);
  const displacement = newSpan.arrivalTime - projectedTime;

  // 2. Insert the span (stable sort)
  let updatedHistory = insertEvent(history, newSpan);

  // 3. Propagate displacement to all subsequent events (by age)
  return updatedHistory.map(event => {
    // Only shift events that occur AFTER the span's departure in Subjective Age
    // If multiple events at same age, shift those that are sorted after the span
    const isAfter = event.age > newSpan.age || 
                   (event.age === newSpan.age && event.sort > newSpan.sort);
    
    if (isAfter) {
      return {
        ...event,
        time: (event.time || 0) + displacement
      };
    }
    return event;
  });
}
