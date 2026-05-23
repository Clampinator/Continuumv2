import { resolveRecordPath } from './resolve-record-path.js';

/**
 * STATE: LINK GOAL TO EVENT
 * Adds a goal ID to an event's linkedGoalIds array and nullifies
 * the legacy linkedGoalId field. Handles deduplication and
 * legacy migration internally so the UI only needs to detect
 * the drop and delegate.
 *
 * @param {Actor} actor - The Foundry Actor instance.
 * @param {string} goalId - The goal ID to link.
 * @param {string} eraId - The era ID containing the event.
 * @param {string|null} expId - The experience ID (if experience-level).
 * @param {string} eventId - The event ID to link the goal to.
 * @returns {Promise<boolean>} true if the goal was linked, false if already present.
 */
export async function linkGoalToEvent(actor, goalId, eraId, expId, eventId) {
  if (!actor || !goalId || !eraId || !eventId) return false;

  // Navigate into the nested actor data to find the event
  const era = actor.system.eras?.[eraId];
  if (!era) return false;

  let eventData;
  if (expId) {
    eventData = era.experiences?.[expId]?.events?.[eventId];
  } else {
    eventData = era.events?.[eventId];
  }

  if (!eventData) return false;

  // Collect existing goal IDs, migrating the legacy single-value field
  const existingGoals = eventData.linkedGoalIds
    ? [...eventData.linkedGoalIds]
    : [];
  if (eventData.linkedGoalId && !existingGoals.includes(eventData.linkedGoalId)) {
    existingGoals.push(eventData.linkedGoalId);
  }

  // Skip if already linked
  if (existingGoals.includes(goalId)) return false;

  // Deduplicate and add the new goal ID
  const updatedGoals = [...new Set([...existingGoals, goalId])];

  // Build Foundry update paths
  const basePath = resolveRecordPath(eventId, eraId, expId);
  const goalsPath = `${basePath}.linkedGoalIds`;
  const legacyPath = `${basePath}.linkedGoalId`;

  await actor.update({
    [goalsPath]: updatedGoals,
    [legacyPath]: null
  });

  ui.notifications.info(game.i18n.localize("CONTINUUM.Notifications.GoalLinkedToEvent"));
  return true;
}