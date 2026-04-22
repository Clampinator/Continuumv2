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

      const expectedAgeStr = formatSubjectiveAge(baseAge);
      ageChanged = (formData.eventAge || "").trim() !== expectedAgeStr;
      timeChanged = Math.abs(inputTs - baseTime) > 1000;

      const currentRailOffset = _calculateRailOffset(actor, baseAge, baseTime);

      if (ageChanged && !timeChanged) {
          finalAge = inputAge;
          finalTime = currentRailOffset + (finalAge * 1000);
      } else if (timeChanged) {
          finalTime = inputTs;
          finalAge = (finalTime - currentRailOffset) / 1000;
      } else if (mode === 'insert') {
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

  // ---- 3. Reindexing & Sequencing ----
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
      authoritativeAge = existingData?.age ?? finalAge;
      authoritativeTime = finalTime;
      authoritativeSort = existingData?.sort ?? 0;
  }

  const eventData = {
    id: newId,
    title: formData.title,
    notes: formData.notes,
    isRest: Boolean(formData.isRest && !isSpan),
    isSpan: isSpan,
    age: authoritativeAge,
    sort: authoritativeSort,
    createdAt: existingData?.createdAt || Date.now(),
    startsExpId: existingData?.startsExpId || null,
    
    // Mechanics
    spanRank: parseInt(formData.spanRank) || null,
    downTime: parseInt(formData.downTime) || 0,
    frag: parseInt(formData.frag) || 0
  };

  const resolvedDT = convertTimestampToDateString(authoritativeTime || finalTime);
  if (isSpan) {
      eventData.spanFromDate = normalizeDateInput(formData.spanFromDate);
      eventData.spanFromTime = formData.spanFromTime || "12:00:00";
      eventData.spanFromLocation = formData.spanFromLocation || "";
      eventData.spanFromLat = parseFloat(formData.spanFromLat) || null;
      eventData.spanFromLng = parseFloat(formData.spanFromLng) || null;
      eventData.spanFromZoom = parseInt(formData.spanFromZoom) || null;

      eventData.spanToDate = normalizeDateInput(formData.spanToDate || resolvedDT.date);
      eventData.spanToTime = formData.spanToTime || resolvedDT.time;
      eventData.spanToLocation = formData.location || "";
      eventData.spanToLat = parseFloat(formData.lat) || null;
      eventData.spanToLng = parseFloat(formData.lng) || null;
      eventData.spanToZoom = parseInt(formData.zoom) || null;
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

  const anchorDate = isSpan ? eventData.spanToDate : eventData.date;
  const anchorTime = isSpan ? (eventData.spanToTime || '12:00:00') : (eventData.time || '12:00:00');
  const anchorFull = `${anchorDate}T${anchorTime}`;

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
      eventData.startsExpId = newExpId;
  }

  // Location and Zoom (Standard Event fields)
  if (!isSpan) {
      eventData.location = formData.location || "";
      eventData.lat = parseFloat(formData.lat) || null;
      eventData.lng = parseFloat(formData.lng) || null;
      eventData.zoom = formData.zoom || null;
  }

  const hit = ContextFinder.getHitContext(authoritativeAge, graphData);
  let parentPath;
  
  if (targetExpId) {
      parentPath = `system.eras.${targetEraId}.experiences.${targetExpId}`;
  } else if (hit && hit.path) {
      if (!contextAction || contextAction === 'null') {
          targetEraId = hit.eraId;
      }
      parentPath = `system.eras.${targetEraId}`;
  } else {
      parentPath = `system.eras.${targetEraId}`;
  }

  // CLEANUP: If context changed, delete old
  if (mode === 'edit') {
      const oldEraId = existingData.eraId;
      const oldExpId = existingData.expId;
      if (oldEraId !== targetEraId || oldExpId !== targetExpId) {
          const oldRoot = oldExpId ? `system.eras.${oldEraId}.experiences.${oldExpId}` : `system.eras.${oldEraId}`;
          updates[`${oldRoot}.events.-=${existingData.id}`] = null;
      }
  }

  updates[`${parentPath}.events.${newId}`] = eventData;

  if (isSpan && mode === 'insert') {
      const pendingSpan = { ...eventData, id: newId, sort: authoritativeSort };
      const { updates: normUpdates } = normalizeLifelineAges(actor, { pendingSpan });
      Object.assign(updates, normUpdates);
  }

  if (mode === 'log') {
      updates['system.personal.subjectiveNow'] = eventData.age;
      updates['system.personal.objectiveNow'] = finalTime;
      if (params.graphData?.nowNode) {
          params.graphData.nowNode.age = eventData.age;
          params.graphData.nowNode.time = finalTime;
      }
  }

  const isRestToggledOn = !existingData?.isRest && eventData.isRest;
  await actor.update(updates);

  if (isRestToggledOn || (isSpan && formData.isRest)) {
      await createEndOfRestEvent(actor, eventData, targetEraId, targetExpId);
  }

  Sound.confirm();
  return { positionChanged };
}
