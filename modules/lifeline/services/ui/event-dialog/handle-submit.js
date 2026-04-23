import { normalizeDateInput, convertTimestampToDateString, parseDate } from '/systems/continuum-v2/modules/span-graph-utils/provide-span-graph-utils.js';
import { normalizeLifelineAges } from '/systems/continuum-v2/modules/lifeline/services/chronology/normalize-lifeline-ages.js';
import { Sound } from '/systems/continuum-v2/modules/sound-manager.js';
import { createEndOfRestEvent } from '../handle-rest-toggle.js';
import { ContextFinder } from '../../context-finder.js';

// ATOMIZED SERVICES
import { solveIntent } from './handle-submit/solve-intent.js';
import { processReindexing } from './handle-submit/process-reindexing.js';
import { processExperienceLifecycle, handleNewExperience } from './handle-submit/experience-lifecycle.js';

/**
 * ATOMIZED REBUILT: handle-submit.js
 * Delegates logic to specialized services for stability.
 */
export async function handleSubmit(actor, formData, params) {
  const { mode, existingData, graphData } = params;
  const updates = {};

  // 1. SOLVE INTENT (Coordinates & Type)
  const intent = solveIntent(actor, formData, params);
  const { finalAge, finalTime, isSpan } = intent;
  const newId = (mode === 'edit') ? existingData.id : foundry.utils.randomID();

  // 2. PROCESS REINDEXING (Narrative Sequence)
  const reindexResult = processReindexing(actor, newId, mode, intent, { ...params, formData }, updates);
  const { authoritativeAge, authoritativeTime, authoritativeSort, positionChanged } = reindexResult;

  // 3. ASSEMBLE EVENT DATA
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

  // 4. EXPERIENCE LIFECYCLE
  const anchorDate = isSpan ? eventData.spanToDate : eventData.date;
  const anchorTime = isSpan ? (eventData.spanToTime || '12:00:00') : (eventData.time || '12:00:00');
  const anchorFull = `${anchorDate}T${anchorTime}`;

  processExperienceLifecycle(actor, formData, updates, anchorFull);

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

  const newExpId = handleNewExperience(actor, formData, updates, targetEraId, anchorFull);
  if (newExpId) {
      targetExpId = newExpId;
      eventData.startsExpId = newExpId;
  }

  if (!isSpan) {
      eventData.location = formData.location || "";
      eventData.lat = parseFloat(formData.lat) || null;
      eventData.lng = parseFloat(formData.lng) || null;
      eventData.zoom = formData.zoom || null;
  }

  // 5. DATABASE ROUTING
  const hit = ContextFinder.getHitContext(authoritativeAge, graphData);
  let parentPath;
  if (targetExpId) {
      parentPath = `system.eras.${targetEraId}.experiences.${targetExpId}`;
  } else if (hit && hit.path) {
      if (!contextAction || contextAction === 'null') targetEraId = hit.eraId;
      parentPath = `system.eras.${targetEraId}`;
  } else {
      parentPath = `system.eras.${targetEraId}`;
  }

  if (mode === 'edit') {
      const oldEraId = existingData.eraId;
      const oldExpId = existingData.expId;
      if (oldEraId !== targetEraId || oldExpId !== targetExpId) {
          const oldRoot = oldExpId ? `system.eras.${oldEraId}.experiences.${oldExpId}` : `system.eras.${oldEraId}`;
          updates[`${oldRoot}.events.-=${existingData.id}`] = null;
      }
  }

  updates[`${parentPath}.events.${newId}`] = eventData;

  // 6. COMPENSATION WAVE
  if (isSpan && mode === 'insert') {
      const pendingSpan = { ...eventData, id: newId, sort: authoritativeSort };
      const { updates: normUpdates } = normalizeLifelineAges(actor, { pendingSpan });
      Object.assign(updates, normUpdates);
  }

  // 7. CHARACTER STATUS
  if (mode === 'log') {
      updates['system.personal.subjectiveNow'] = eventData.age;
      updates['system.personal.objectiveNow'] = authoritativeTime || finalTime;
  }

  const isRestToggledOn = !existingData?.isRest && eventData.isRest;
  await actor.update(updates);

  if (isRestToggledOn || (isSpan && formData.isRest)) {
      await createEndOfRestEvent(actor, eventData, targetEraId, targetExpId);
  }

  Sound.confirm();
  return { positionChanged };
}
