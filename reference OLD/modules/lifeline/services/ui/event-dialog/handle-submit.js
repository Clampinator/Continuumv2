import { normalizeDateInput, parseAgeString, convertTimestampToDateString, parseDate, formatSubjectiveAge } from '../../../../span-graph-utils/provide-span-graph-utils.js';
import { normalizeLifelineAges } from '../../chronology/normalize-lifeline-ages.js';
import { Sound } from '../../../../sound-manager.js';
import { reindexLifelineNodes } from '../../chronology/reindex-lifeline-nodes.js';
import { createEndOfRestEvent } from '../handle-rest-toggle.js';
import { ReferenceResolver } from '../../reference-resolver.js';
import { createManualSpan } from '../../spans/create-manual-span.js';
import { createInsertedSpan } from '../../spans/create-inserted-span.js';
import { ContextFinder } from '../../context-finder.js';

/*
Calculates the current objectiveOffset for the rail an event sits on.
Required for solving the Age/Time diagonal.
*/
function _calculateRailOffset(actor, targetAge, targetTime) {
    // Offset = Time - (Age * 1000)
    return targetTime - (targetAge * 1000);
}


export async function handleSubmit(actor, formData, params) {
  const { mode, existingData, viewState, graphData } = params;
  const updates = {};

  // ---- 1. Detect Interaction Type ----
  const isSpan = Boolean(formData.isSpan);
  
  let finalAge = Number(params.ageRaw);
  let finalTime = Number(params.timeRaw);
  let ageChanged = false;
  let timeChanged = false;
  let newId = (mode === 'edit') ? existingData.id : foundry.utils.randomID();
  let spanResult = null;

  // ---- 2. Solve Coordinates (Dispatcher) ----
  if (!isSpan) {
      const inputAge = (formData.eventAge && formData.eventAge.trim() !== "") ? parseAgeString(formData.eventAge) : Number(params.ageRaw);
      const inputDate = normalizeDateInput(formData.eventDate);
      const inputTime = formData.eventTime || "12:00:00";
      const inputDateObj = parseDate(`${inputDate}T${inputTime}`);
      const inputTs = inputDateObj ? inputDateObj.getTime() : finalTime;
      
      const baseAge = (mode === 'edit') ? (existingData.age || 0) : Number(params.ageRaw);
      const baseTime = (mode === 'edit') ? finalTime : Number(params.timeRaw);

      // Compare strings to detect user edits, avoiding the format/parse roundtrip mismatch
      // (formatDuration outputs 'm' for minutes, but parseAgeString treats 'm' as months)
      const expectedAgeStr = formatSubjectiveAge(baseAge);
      ageChanged = (formData.eventAge || "").trim() !== expectedAgeStr;
      timeChanged = Math.abs(inputTs - baseTime) > 1000; // 1 second threshold

      // THE AUTHORITY: Solve relative to the node's CURRENT rail offset to prevent jumps.
      // For insertions, the click point (params.ageRaw/timeRaw) defines the rail.
      const currentRailOffset = _calculateRailOffset(actor, baseAge, baseTime);

      if (ageChanged && !timeChanged) {
          // Age was edited: Solve for Time
          finalAge = inputAge;
          finalTime = currentRailOffset + (finalAge * 1000);
      } else if (timeChanged) {
          // Date/Time was edited: Solve for Age
          finalTime = inputTs;
          finalAge = (finalTime - currentRailOffset) / 1000;
      } else if (mode === 'insert') {
          // AUTHORITY: For fresh insertions with no edits, the raw click coordinates are absolute.
          finalAge = Number(params.ageRaw);
          finalTime = Number(params.timeRaw);
      }
  } else {
      // BRANCHING: Identify the specific span creation method
      if (mode === 'log' || mode === 'edit') {
          spanResult = createManualSpan(actor, formData, params);
      } else if (mode === 'insert') {
          spanResult = createInsertedSpan(actor, formData, params);
      }

      if (spanResult) {
          finalAge = spanResult.finalAge;
          finalTime = spanResult.finalTime;
          newId = spanResult.newId;
      }
  }

  // ---- 3. Reindexing & Sequencing (The Authority) ----

  // Determine whether this edit changes the node's temporal position.
  // Non-positional edits (title, notes, location) must not trigger reindexing,
  // which would otherwise alter sort values and cause nodes to visually move.
  let positionChanged = true;
  if (mode === 'edit') {
      if (!isSpan) {
          positionChanged = ageChanged || timeChanged;
      } else {
          const oldFrom = `${existingData?.spanFromDate || ''}|${existingData?.spanFromTime || '12:00:00'}`;
          const oldTo = `${existingData?.spanToDate || ''}|${existingData?.spanToTime || '12:00:00'}`;
          const newFrom = `${normalizeDateInput(formData.spanFromDate || '')}|${formData.spanFromTime || '12:00:00'}`;
          const newTo = `${normalizeDateInput(formData.spanToDate || '')}|${formData.spanToTime || '12:00:00'}`;
          positionChanged = (oldFrom !== newFrom || oldTo !== newTo);
      }
  }

  let authoritativeAge, authoritativeTime, authoritativeSort;

  if (positionChanged) {
      // Reindex calculates the physical address (Age) and sequence (Sort)
      const reindexUpdates = reindexLifelineNodes(actor, newId, -1, { age: finalAge, time: finalTime }, {
          graphData,
          isLog: mode === 'log'
      });

      authoritativeAge = reindexUpdates.targetAge;
      authoritativeTime = reindexUpdates.targetTime;
      authoritativeSort = reindexUpdates.targetSortValue;

      delete reindexUpdates.targetAge;
      delete reindexUpdates.targetTime;
      delete reindexUpdates.targetSortValue;
      Object.assign(updates, reindexUpdates);
  } else {
      // Position unchanged - preserve stored values to prevent any node movement.
      authoritativeAge = existingData?.age ?? finalAge;
      authoritativeTime = finalTime;
      authoritativeSort = existingData?.sort ?? 0;
  }

  // ---- 4. POST-REINDEX SYNC: Removed to prevent angle distortion ----
  // We no longer force level events to the global rail here. 
  // The Reconciliation Loop handles returning to the global rail.

  const eventData = {
    id: newId,
    title: formData.title,
    notes: formData.notes,
    isRest: Boolean(formData.isRest && !isSpan),
    isSpan: isSpan,
    age: authoritativeAge,
    sort: authoritativeSort,
    createdAt: existingData?.createdAt || Date.now(),
    startsExpId: existingData?.startsExpId || null // Preserve link if editing
  };
  const departureTime = params.timeRaw; // Capture the rail position before any solving
  const departureDT = convertTimestampToDateString(departureTime);
  const resolvedDT = convertTimestampToDateString(authoritativeTime || finalTime);
  if (isSpan) {
      eventData.spanFromDate = normalizeDateInput(formData.spanFromDate || departureDT.date);
      eventData.spanFromTime = formData.spanFromTime || departureDT.time;
      eventData.spanFromLocation = formData.spanFromLocation || "";
      eventData.spanFromLat = parseFloat(formData.spanFromLat) || null;
      eventData.spanFromLng = parseFloat(formData.spanFromLng) || null;
      eventData.spanFromZoom = parseInt(formData.spanFromZoom) || null;

      eventData.spanToDate = normalizeDateInput(formData.spanToDate || resolvedDT.date);
      eventData.spanToTime = formData.spanToTime || resolvedDT.time;
      eventData.spanToLocation = formData.spanToLocation || "";
      eventData.spanToLat = parseFloat(formData.spanToLat) || null;
      eventData.spanToLng = parseFloat(formData.spanToLng) || null;
      eventData.spanToZoom = parseInt(formData.spanToZoom) || null;
  } else {
      eventData.date = resolvedDT.date;
      eventData.time = resolvedDT.time;
  }

  // Context Selection Logic
  const contextAction = formData.experienceAction;
  let targetEraId = params.eraId || existingData?.eraId || Object.keys(actor.system.eras || {})[0];
  let targetExpId = params.expId || existingData?.expId || null;

  if (contextAction) {
    const parts = String(contextAction).split(':');
    if (parts[0] === 'move') {
      targetEraId = parts[1];
      targetExpId = (parts[2] === "null" || !parts[2]) ? null : parts[2];
    }
  }

  // ---- 5. HANDOVER LOGIC: Synchronized Transitions ----
  // If we are starting a new experience, we use the event's date as the starting anchor.
  // We use the exact resolved date/time strings to ensure the experience block starts exactly at the node.
  const anchorDate = isSpan ? eventData.spanToDate : eventData.date;
  const anchorTime = isSpan ? (eventData.spanToTime || '12:00:00') : (eventData.time || '12:00:00');
  const anchorFull = `${anchorDate}T${anchorTime}`;

  // HANDLE GENESIS: Start a new experience container
  if (formData.startNewExp) {
      const newExpId = foundry.utils.randomID();
      const expName = formData.newExpName || "New Experience";
      const era = actor.system.eras[targetEraId];
      const exps = era?.experiences || {};
      let maxSort = 0;
      for (const e of Object.values(exps)) {
          const s = Number(e.sort) || 0;
          if (s > maxSort) maxSort = s;
      }

      updates[`system.eras.${targetEraId}.experiences.${newExpId}`] = {
          id: newExpId,
          name: expName,
          dateFrom: anchorFull,
          dateTo: "",
          isOngoing: true,
          color: "#2a2a2a",
          sort: maxSort + 1000
      };

      targetExpId = newExpId;
      eventData.startsExpId = newExpId; // Mark this node as the "Genesis" of the experience
  }

  // HANDLE LIFECYCLE: Close existing loops (Transition points)
  if (formData.closeExperiences) {
      const targets = Array.isArray(formData.closeExperiences) ? formData.closeExperiences : [formData.closeExperiences];
      targets.forEach(t => {
          if (!t || typeof t !== 'string') return;
          const parts = t.split(':');
          if (parts.length < 2) return;
          const [aId, eId] = parts;
          // Enforce handover precision: old loop ends exactly when the event/new loop begins
          updates[`system.eras.${aId}.experiences.${eId}.dateTo`] = anchorFull;
          updates[`system.eras.${aId}.experiences.${eId}.isOngoing`] = false;
      });
  }

  // HANDLE LIFECYCLE: Re-open closed loops
  if (formData.reopenExperiences) {
      const targets = Array.isArray(formData.reopenExperiences) ? formData.reopenExperiences : [formData.reopenExperiences];
      targets.forEach(t => {
          if (!t || typeof t !== 'string') return;
          const parts = t.split(':');
          if (parts.length < 2) return;
          const [aId, eId] = parts;
          updates[`system.eras.${aId}.experiences.${eId}.dateTo`] = "";
          updates[`system.eras.${aId}.experiences.${eId}.isOngoing`] = true;
      });
  }

  // Location and Zoom
  eventData.location = formData.eventLocation || "";
  eventData.lat = parseFloat(formData.eventLat) || null;
  eventData.lng = parseFloat(formData.eventLng) || null;
  eventData.zoom = formData.eventZoom || null;

  // Final Pathing
  // AUTHORITY: Re-solve hit context using the authoritative age to ensure the node 
  // lands in the correct visual column.
  const hit = ContextFinder.getHitContext(authoritativeAge, graphData);
  let parentPath;
  
  if (targetExpId) {
      parentPath = `system.eras.${targetEraId}.experiences.${targetExpId}`;
  } else if (hit && hit.path) {
      // If we found a valid era column, we prefer it unless the user explicitly moved it.
      if (!contextAction || contextAction === 'null') {
          targetEraId = hit.eraId;
      }
      parentPath = `system.eras.${targetEraId}`;
  } else if (targetEraId && (actor.system.eras || {})[String(targetEraId)]) {
      // ContextFinder found no hit (era has no date range, or event is out of bounds)
      // but we already have a valid target era - use it rather than creating a new one.
      parentPath = `system.eras.${targetEraId}`;
  } else {
      // No context found and no valid era - auto-create one anchored to birth.
      const rawEras = actor.system.eras || {};
      let maxEraSort = 0;
      for (const a of Object.values(rawEras)) {
          const s = Number(a.sort) || 0;
          if (s > maxEraSort) maxEraSort = s;
      }

      const dobStr = actor.system.personal?.dob || actor.system.structure?.inceptionDate || '';
      const newEraId = foundry.utils.randomID();
      parentPath = `system.eras.${newEraId}`;
      updates[`${parentPath}.id`] = newEraId;
      updates[`${parentPath}.name`] = "New Era";
      updates[`${parentPath}.dateFrom`] = dobStr;
      updates[`${parentPath}.dateTo`] = '';
      updates[`${parentPath}.age`] = 0;
      updates[`${parentPath}.sort`] = maxEraSort + 1000;
      updates[`${parentPath}.experiences`] = {};
  }

  // CLEANUP: If we moved the event to a new context (Age or Experience), delete the old one
  if (mode === 'edit') {
      const oldEraId = existingData.eraId;
      const oldExpId = existingData.expId;
      if (oldEraId !== targetEraId || oldExpId !== targetExpId) {
          const oldRoot = oldExpId ? `system.eras.${oldEraId}.experiences.${oldExpId}` : `system.eras.${oldEraId}`;
          const oldPath = `${oldRoot}.events.${existingData.id}`;
          
          // Remove any reindex updates that target the old path to prevent "Ghosting"
          // Reindex logic might have tried to update the sort of the node at its old location.
          for (const key of Object.keys(updates)) {
              if (key.startsWith(oldPath)) delete updates[key];
          }

          updates[`${oldRoot}.events.-=${existingData.id}`] = null;
      }
  }

  updates[`${parentPath}.events.${newId}`] = eventData;

  // ---- 6. NORMALIZE DOWNSTREAM AGES (Insert mode only) ----
  // When a span is inserted mid-timeline, the rail offset shifts for every event
  // that follows. Run a full normalization pass including the new span so all
  // downstream ages are recomputed from their objective dates against the new rail.
  // This replaces the old _reanchorSubsequentEvents which was blind to age=0 events.
  if (isSpan && mode === 'insert') {
      const pendingSpan = { ...eventData, id: newId, sort: authoritativeSort };
      const { updates: normUpdates } = normalizeLifelineAges(actor, { pendingSpan });
      Object.assign(updates, normUpdates);
  }

  // ---- 7. NOW SYNCHRONIZATION: Snap head to dialog input ----
  if (mode === 'log') {
      updates['system.personal.subjectiveNow'] = eventData.age;
      updates['system.personal.objectiveNow'] = finalTime;
      
      // Force the local graphData to match immediately to prevent any flicker 
      // during the brief window before the server update returns.
      if (params.graphData?.nowNode) {
          params.graphData.nowNode.age = eventData.age;
          params.graphData.nowNode.time = finalTime;
      }
  }

  const isRestToggledOn = !existingData?.isRest && eventData.isRest;

  await actor.update(updates);

  if (isRestToggledOn) {
      await createEndOfRestEvent(actor, eventData, targetEraId, targetExpId);
  }

  Sound.confirm();
  return { positionChanged };
}
