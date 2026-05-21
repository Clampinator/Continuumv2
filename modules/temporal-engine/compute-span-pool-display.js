/**
 * TEMPORAL ENGINE: COMPUTE SPAN POOL DISPLAY
 * Orchestrates span pool computation for template rendering.
 * Reads eras from context, flattens events, calls kernel, applies per-event stats.
 *
 * This is the engine-layer orchestration that sits between the raw DB state
 * and the kernel's pure math. The UI (prepare-data, sheet-data-preparation)
 * calls this instead of doing its own flatten-sort-apply dance.
 *
 * @param {object} context - Template context with .eras array, .system.spanning.span, .system.personal.dob.
 * @param {Function} parseDateFn - TTL function to parse DOB string to ms (parseDateToObjectiveMs).
 * @param {Function} calculatePoolFn - Kernel function to compute span pool (calculateSpanPool).
 * @returns {{ spanTimeRemainingFormatted: string, isOverSpan: boolean, eventStats: Map }}
 */
export function computeSpanPoolDisplay(context, parseDateFn, calculatePoolFn) {
  const spanLevel = Number(context.system.spanning?.span) || 0;
  const dobStr = context.system.personal?.dob;
  const genesisTs = dobStr ? parseDateFn(dobStr) : Date.now();

  // Flatten all events from all eras and experiences, sorted by narrative order
  const allEvents = [];
  context.eras.forEach(era => {
    allEvents.push(...(era.events || []));
    era.experiences.forEach(exp => { allEvents.push(...exp.events); });
  });
  allEvents.sort((a, b) => (Number(a.sort) || 0) - (Number(b.sort) || 0));

  const poolResult = calculatePoolFn({ spanLevel, events: allEvents, genesisTs });

  // Build a Map of per-event stats keyed by event ID for template lookup
  const statsById = new Map(poolResult.eventStats.map(s => [s.eventId, s]));

  return {
    spanTimeRemainingFormatted: poolResult.spanTimeRemainingFormatted,
    isOverSpan: poolResult.isOverSpan,
    eventStatsById: statsById,
    allEvents
  };
}

/**
 * Applies computed per-event stats onto event objects for template rendering.
 * Mutates event objects in place by adding calculatedSpentFormatted and
 * calculatedRemainingFormatted properties.
 *
 * @param {object[]} allEvents - Flat array of all events (from computeSpanPoolDisplay).
 * @param {Map} eventStatsById - Map of eventId -> stats (from computeSpanPoolDisplay).
 */
export function applyEventStatsToTemplate(allEvents, eventStatsById) {
  for (const event of allEvents) {
    const eventId = event.id || event._id || '';
    const stats = eventStatsById.get(eventId);
    if (stats) {
      event.calculatedSpentFormatted = stats.spentFormatted;
      event.calculatedRemainingFormatted = stats.remainingFormatted;
    }
  }
}