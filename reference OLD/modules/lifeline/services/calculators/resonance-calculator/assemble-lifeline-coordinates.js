import { ChronologyAssembler } from '../../chronology-assembler.js';
import { LifelineEngine } from '../../lifeline-engine.js';

/**
 * Processes actor data through the mapping engine to generate coordinate data.
 * @param {Actor} actor 
 * @param {number} dobTs 
 * @param {number} spanLevel 
 * @returns {object} engineResults
 */
export function assembleLifelineCoordinates(actor, dobTs, spanLevel) {
    const { orderedEvents } = ChronologyAssembler.assembleEventStream(actor);
    return LifelineEngine.calculate(orderedEvents, dobTs, spanLevel);
}