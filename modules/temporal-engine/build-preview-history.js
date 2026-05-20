/**
 * TEMPORAL ENGINE: BUILD PREVIEW HISTORY
 * Injects a virtual span fact into a copy of the actor's history,
 * producing a "what would happen" state for live drag preview.
 *
 * The virtual span is inserted at the splice point with the correct
 * sort value so the temporal engine pipeline (establishHistoryPhysics,
 * calculateSegments, projectNodes) processes it identically to a
 * committed span. This eliminates the need for a separate displacement
 * overlay in the manifest generator.
 *
 * @param {Array} history - Flat history array from getActorHistory().
 * @param {Object} insertionContext - Splice context from computeSplicePoint.
 * @param {Object} displacementResult - Displacement data from calculateInsertionDisplacement.
 * @returns {Array} New history array with virtual span injected.
 */
export function buildPreviewHistory(history, insertionContext, displacementResult) {
  if (!insertionContext || !displacementResult) return history;

  const nowFact = history.find(n => n.isNow || n.id === 'now');

  // Build a virtual span fact that the temporal engine can process
  // identically to a committed span event.
  const virtualSpan = {
    id: 'preview-insert-span',
    sort: insertionContext.insertionSort,
    eraId: null,
    expId: null,
    path: null,
    record: {
      eventTitle: 'Span (Preview)',
      eventIsSpan: true,
      eventAge: insertionContext.departureAge,
      eventDate: '',
      eventTime: '12:00:00',
      eventLocation: '',
      ts: insertionContext.departureTime,
      arrivalTs: displacementResult.arrivalTime,
      eventSpanFromDate: '',
      eventSpanFromTime: '12:00:00',
      eventSpanToDate: '',
      eventSpanToTime: '12:00:00'
    }
  };

  // Inject the virtual span and re-sort by narrative order.
  // The NOW node must remain at the end (sort 999999999).
  const withoutNow = history.filter(n => !n.isNow && n.id !== 'now');
  const withSpan = [...withoutNow, virtualSpan];
  const sorted = withSpan.sort((a, b) => {
    const sa = Number(a.sort) || 0;
    const sb = Number(b.sort) || 0;
    if (sa !== sb) return sa - sb;
    return (a.id || '').localeCompare(b.id || '');
  });

  // Re-append the NOW fact
  if (nowFact) sorted.push(nowFact);

  return sorted;
}