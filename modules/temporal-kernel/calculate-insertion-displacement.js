/**
 * TEMPORAL KERNEL: CALCULATE INSERTION DISPLACEMENT
 * Pure math: Computes the displacement vector and floor constraint for
 * an interactive span insertion drag.
 *
 * The user clicks on a lifeline rail (departure) and drags vertically
 * to define the span arrival. This function returns how much to shift
 * all events after the insertion point, plus any floor constraint
 * preventing arrival from exceeding the next event.
 *
 * Down-spans have no lower bound - a character may span to any point
 * in the past, including before their own birth.
 *
 * @param {number} departureAge - Subjective age at click point (seconds).
 * @param {number} departureTime - Objective time at click point (ms).
 * @param {number} arrivalTime - Objective time under mouse (ms).
 * @param {Array} history - Flat history array from getTemporalState.
 * @returns {Object} Displacement result with constraint data.
 */
export function calculateInsertionDisplacement(
  departureAge, departureTime, arrivalTime, history
) {
  // 1. The displacement is the difference between arrival and projected time.
  // At the click point, the projected time equals the departure time
  // (because the click is ON the rail). So displacement = arrival - departure.
  const displacement = arrivalTime - departureTime;

  // 2. Find the next event after departure in narrative order.
  // This establishes the floor for up-spans.
  const sortedHistory = [...history]
    .filter(n => !n.isVirtual && !n.isBirth && n.id !== 'now')
    .sort((a, b) => {
      const ax = Number(a.x || 0);
      const bx = Number(b.x || 0);
      if (ax !== bx) return ax - bx;
      return (Number(a.sort) || 0) - (Number(b.sort) || 0);
    });

  let nextEventFloor = null;
  for (const node of sortedHistory) {
    const nodeAge = Number(node.x || 0);
    const nodeTime = Number(node.y || 0);
    // The next event is the first one with age >= departure age
    // that is NOT the insertion point itself (strictly after)
    if (nodeAge > departureAge + 0.001) {
      // When the span displaces subsequent events, the next event's
      // time shifts by the same displacement. The arrival cannot
      // push the next event's time past its own pre-shift position.
      nextEventFloor = nodeTime;
      break;
    }
  }

  // 3. Apply floor constraint for up-spans (arrival > departure).
  // The arrival node cannot exceed the objective time of the next event.
  let constrainedArrivalTime = arrivalTime;
  if (displacement > 0 && nextEventFloor !== null) {
    // For up-spans, arrival is forward in time. The constrained arrival
    // cannot push past where the next event sits.
    constrainedArrivalTime = Math.min(arrivalTime, nextEventFloor);
  }

  // Down-spans have no lower bound: a character may span to any
  // point in the past, including before their own birth.

  return {
    displacement: constrainedArrivalTime - departureTime,
    arrivalTime: constrainedArrivalTime,
    departureAge,
    departureTime,
    nextEventFloor,
    isDownSpan: displacement < 0,
    isUpSpan: displacement > 0
  };
}