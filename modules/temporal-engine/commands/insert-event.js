/**
 * Inserts a new event into a history stream while maintaining stable sorting.
 * 
 * @param {Array} history - The current array of events.
 * @param {Object} newEvent - The event to insert.
 * @returns {Array} The updated and sorted history.
 */
export function insertEvent(history, newEvent) {
  const updatedHistory = [...history, newEvent];

  // 1. Canonical Stable Sort
  updatedHistory.sort((a, b) => {
    if (a.age !== b.age) return a.age - b.age;
    if (a.sort !== undefined && b.sort !== undefined) return a.sort - b.sort;
    return (a.id || '').localeCompare(b.id || '');
  });

  // 2. Assign sort if missing
  const index = updatedHistory.findIndex(e => e === newEvent);
  if (newEvent.sort === undefined) {
    const prev = updatedHistory[index - 1];
    const next = updatedHistory[index + 1];

    if (!prev && !next) {
      newEvent.sort = 1000;
    } else if (!prev) {
      newEvent.sort = next.sort / 2;
    } else if (!next) {
      newEvent.sort = prev.sort + 1000;
    } else {
      newEvent.sort = (prev.sort + next.sort) / 2;
    }
  }

  // 3. Ensure Sort Gaps (Regap if collisions occur)
  return ensureSortGaps(updatedHistory);
}

/**
 * Ensures that all events have stable sort values with enough room for future insertions.
 * If sort values are too close (delta < 1), a full re-gap is performed.
 * 
 * @param {Array} history - Sorted history array.
 * @returns {Array} History with updated sort values.
 */
function ensureSortGaps(history) {
  const GAP = 1000;
  let needsRegap = false;

  // Check if we need to regap (missing sort or collision)
  for (let i = 0; i < history.length; i++) {
    const current = history[i];
    const prev = history[i - 1];

    if (current.sort === undefined) {
      needsRegap = true;
      break;
    }

    if (prev && current.sort <= prev.sort) {
      needsRegap = true;
      break;
    }

    // Check for bisection room
    if (prev && (current.sort - prev.sort) < 1) {
      needsRegap = true;
      break;
    }
  }

  if (needsRegap) {
    return history.map((event, index) => ({
      ...event,
      sort: (index + 1) * GAP
    }));
  }

  // Handle bisection for the specific new event if only one was added
  // For simplicity in this atomic command, we've already handled the logic above
  // but let's ensure even a newly inserted event without a sort gets placed.
  // Actually, the logic above is robust enough. If it's undefined, it regaps everything.
  
  return history;
}
