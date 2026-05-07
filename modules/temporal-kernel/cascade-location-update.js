/**
 * TEMPORAL KERNEL: CASCADE LOCATION UPDATE
 * Pure function. When an event's location is manually changed, this walks
 * forward through narrative-sorted history and updates all downstream events
 * that inherited their location from the edited event or its predecessors.
 *
 * Each of the three location fields (level, spanFrom, spanTo) cascades
 * independently and stops independently when it encounters an event with
 * `locationInherited === false`, `spanFromLocationInherited === false`, or
 * `spanToLocationInherited === false` respectively.
 *
 * Events created before this feature was added will not have the flags,
 * so the default is `true` (treated as inherited). This ensures backward
 * compatibility: editing a location on an old dataset will cascade to all
 * downstream events until a manually-set one is found.
 *
 * @param {Array} history - Sorted fact array from getActorHistory().
 * @param {string} editedEventId - The ID of the event whose location was edited.
 * @param {Object} levelValues - New values for the level location cascade.
 *   { eventLocation: string, lat: number|null, lng: number|null, zoom: number|null }
 *   Pass null to skip this cascade entirely.
 * @param {Object} spanFromValues - New values for the span departure cascade.
 *   Same shape as levelValues. Pass null to skip.
 * @param {Object} spanToValues - New values for the span arrival cascade.
 *   Same shape as levelValues. Pass null to skip.
 * @returns {Array<{ id: string, path: string, fields: Object }>}
 *   Each entry has the event id, its db path, and a fields object containing
 *   only the properties that should be updated on that event.
 */
export function cascadeLocationUpdate(history, editedEventId, levelValues, spanFromValues, spanToValues) {
  if (!history || history.length === 0) return [];
  if (!editedEventId) return [];

  // Sort history by narrative order (sort, then id)
  const sorted = [...history].sort((a, b) => {
    if (a.sort !== b.sort) return a.sort - b.sort;
    return a.id.localeCompare(b.id);
  });

  // Find the edited event's position in the sorted array
  const editedIndex = sorted.findIndex(e => e.id === editedEventId);
  if (editedIndex === -1) return [];

  // Track whether each cascade is still active (hasn't hit a manual event)
  let levelCascading = levelValues !== null && levelValues !== undefined;
  let spanFromCascading = spanFromValues !== null && spanFromValues !== undefined;
  let spanToCascading = spanToValues !== null && spanToValues !== undefined;

  const updates = [];

  // Walk forward past the edited event
  for (let i = editedIndex + 1; i < sorted.length; i++) {
    const event = sorted[i];
    // Skip the synthetic NOW node
    if (event.id === 'now') continue;

    const rec = event.record || {};
    const isSpan = Boolean(rec.eventIsSpan);

    // Level location cascade (applies to all events)
    if (levelCascading) {
      const inherited = rec.locationInherited !== false;
      if (!inherited) {
        // Manual event stops the cascade
        levelCascading = false;
      } else {
        const fields = {};
        fields.eventLocation = levelValues.eventLocation;
        if (levelValues.lat !== undefined) fields.lat = levelValues.lat;
        if (levelValues.lng !== undefined) fields.lng = levelValues.lng;
        if (levelValues.zoom !== undefined) fields.zoom = levelValues.zoom;
        // Mark as inherited so future cascades also update it
        fields.locationInherited = true;
        updates.push({ id: event.id, path: event.path, fields });
      }
    }

    // Span departure cascade (only applies to span events)
    if (isSpan && spanFromCascading) {
      const inherited = rec.spanFromLocationInherited !== false;
      if (!inherited) {
        spanFromCascading = false;
      } else {
        // Only add a new entry if we haven't already queued one for this event
        // from the level cascade. Otherwise merge into the existing entry.
        const existing = updates.find(u => u.id === event.id);
        const fields = existing ? existing.fields : {};
        fields.eventSpanFromLocation = spanFromValues.eventLocation;
        if (spanFromValues.lat !== undefined) fields.eventSpanFromLat = spanFromValues.lat;
        if (spanFromValues.lng !== undefined) fields.eventSpanFromLng = spanFromValues.lng;
        if (spanFromValues.zoom !== undefined) fields.eventSpanFromZoom = spanFromValues.zoom;
        fields.spanFromLocationInherited = true;
        if (!existing) {
          updates.push({ id: event.id, path: event.path, fields });
        }
      }
    }

    // Span arrival cascade (only applies to span events)
    if (isSpan && spanToCascading) {
      const inherited = rec.spanToLocationInherited !== false;
      if (!inherited) {
        spanToCascading = false;
      } else {
        const existing = updates.find(u => u.id === event.id);
        const fields = existing ? existing.fields : {};
        fields.eventSpanToLocation = spanToValues.eventLocation;
        if (spanToValues.lat !== undefined) fields.eventSpanToLat = spanToValues.lat;
        if (spanToValues.lng !== undefined) fields.eventSpanToLng = spanToValues.lng;
        if (spanToValues.zoom !== undefined) fields.eventSpanToZoom = spanToValues.zoom;
        fields.spanToLocationInherited = true;
        if (!existing) {
          updates.push({ id: event.id, path: event.path, fields });
        }
      }
    }

    // Early exit if all three cascades have stopped
    if (!levelCascading && !spanFromCascading && !spanToCascading) break;
  }

  return updates;
}