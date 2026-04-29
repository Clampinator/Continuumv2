/**
 * TEMPORAL KERNEL: DRAG PHYSICS
 * Authoritative constraint functions for node placement during drag interactions.
 *
 * Three pure functions governing how mouse movement maps to world coordinates:
 * - getDragMode: classifies drag vector as level or span
 * - constrainMovement: locks coordinates to level diagonal or vertical span
 * - constrainInsertionMovement: constrains span insertion with boundary clamping
 *
 * All functions are pure math - no Foundry dependencies, no side effects.
 */
import { MS_PER_SECOND } from '../temporal-engine/constants.js';

/**
 * Determines the interaction mode based on the initial drag vector.
 * Favors Leveling for rightward intent.
 *
 * @param {number} dx - Horizontal pixel delta.
 * @param {number} dy - Vertical pixel delta.
 * @returns {'level'|'span'} The drag mode classification.
 */
export function getDragMode(dx, dy) {
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);

    // AUTHORITY: If vertical movement is greater than horizontal, it is ALWAYS a Span.
    // This prevents right-handed upward arcs (positive dx) from being falsely caught
    // by the leveling cone.
    if (absY > absX) {
        return 'span';
    }

    // If horizontal movement is dominant and rightward, it's a Level.
    if (dx > 0) {
        return 'level';
    }

    // Default to span for backward horizontal (illegal leveling) or perfectly ambiguous.
    return 'span';
}

/**
 * Constrains a world coordinate point based on the active drag mode.
 * LAW: Age is Subjective, Time is Objective.
 *
 * Level mode locks to 30-degree diagonal (1 second of age = 1 second of time).
 * Span mode locks to vertical (age stays at departure age).
 *
 * @param {Object} currentWorld - { eventAge, eventTime } current mouse position.
 * @param {Object|null} startWorld - { eventAge, eventTime } drag start position.
 * @param {'level'|'span'} mode - The drag mode.
 * @returns {Object} Constrained { eventAge, eventTime } world position.
 */
export function constrainMovement(currentWorld, startWorld, mode) {
    if (!startWorld) return currentWorld;

    if (mode === 'level') {
        // LOCK TO 30-DEGREE DIAGONAL (Up and Right)
        // Physics: 1 second of Age = 1000ms of Time.
        const ageDelta = Math.max(0, currentWorld.eventAge - startWorld.eventAge);
        const timeDelta = ageDelta * MS_PER_SECOND;

        return {
            eventAge: startWorld.eventAge + ageDelta,
            eventTime: startWorld.eventTime + timeDelta
        };
    }

    if (mode === 'span') {
        // AUTHORITY: PERFECT VERTICAL LOCK.
        // Subjective Age remains absolutely identical to the departure point.
        return {
            eventAge: startWorld.eventAge,
            eventTime: currentWorld.eventTime
        };
    }

    return currentWorld;
}

/**
 * Constrains movement during an interactive span insertion drag.
 * The departure age is locked (vertical constraint). The arrival time
 * is clamped by physics boundaries:
 * - Up-span: arrival cannot exceed the next event's objective time
 * - Down-span: no lower bound (character may span to any point in the past)
 *
 * @param {Object} currentWorld - { eventAge, eventTime } from mouse.
 * @param {Object|null} insertionContext - Splice point context from computeSplicePoint.
 * @returns {Object} Constrained { eventAge, eventTime } world position.
 */
export function constrainInsertionMovement(currentWorld, insertionContext) {
    if (!insertionContext) return currentWorld;

    const departureAge = insertionContext.departureAge;
    const nextEventTime = insertionContext.nextEventTime;
    const arrivalTime = currentWorld.eventTime;

    // Perfect vertical lock: age never changes from departure.
    let constrainedTime = arrivalTime;

    // Floor constraint for up-span (dragging forward in time).
    // Arrival cannot exceed the next event's objective time.
    if (nextEventTime !== null && arrivalTime > nextEventTime) {
        constrainedTime = nextEventTime;
    }

    // Down-span has no lower bound: character may span to any point
    // in the past, including before their own birth.

    return {
        eventAge: departureAge,
        eventTime: constrainedTime
    };
}